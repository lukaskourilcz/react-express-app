import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { FdeHub } from '../src/components/paths/FdeHub';
import type { LearningPathManifest } from '../../shared/learning-paths';
import type { PathProgressResponse } from '../../shared/learning-path-api';

const upgrade = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/upgradeSheet', () => ({ openUpgradeSheet: upgrade }));
const share = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock('../src/components/ResultShareActions', () => ({ default: (props: unknown) => { share.render(props); return <button>Download card</button>; } }));
const manifest = {
  id: 'fde', competencies: [{ id: 'integration', title: 'Integration', summary: 'Work across a boundary.' }],
  modules: [{ id: 'm01', title: 'First module', deliveryPhase: 'discover-scope', activities: [
    { id: 'code', title: 'Verify the receiver', competencies: ['integration'] },
    { id: 'write', title: 'Review the handoff', competencies: ['integration'] },
  ] }],
} as unknown as LearningPathManifest;
const progress = (states: string[], guidedComplete = false): PathProgressResponse => ({
  modules: [{ moduleId: 'm01', completed: false, completedAt: null, activities: states.map((state, index) => ({ activityId: index === 0 ? 'code' : 'write', state })) }],
  nextActivityId: 'code', guidedComplete,
  // A strong diagnostic never becomes verified activity evidence.
  competencies: [{ competencyId: 'integration', state: 'demonstrated', score: 1, assessedItems: 3 }],
} as PathProgressResponse);
const mount = (props: Partial<React.ComponentProps<typeof FdeHub>> = {}) => render(<MemoryRouter><LanguageProvider><FdeHub manifest={manifest} pending={false} error={false} retry={() => {}} reachable {...props} /></LanguageProvider></MemoryRouter>);

describe('the FDE competency hub', () => {
  it('marks a locked board activity and opens its activity-specific upgrade without navigating', () => {
    mount({ progress: progress([]), activityLock: id => id === 'write' });
    const row = screen.getByRole('link', { name: 'Review the handoff' }).closest('li')!;
    expect(within(row).getByText('Premium')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('link'));
    expect(upgrade).toHaveBeenCalledWith({ kind: 'learning-path-activity', ref: 'fde:write' });
  });

  it('shows fresh recorded work as not started and marks the server next activity’s phase', () => {
    mount({ progress: progress([]) });
    const board = screen.getByRole('region', { name: 'Competency evidence' });
    expect(within(within(board).getByRole('list', { name: 'Recorded activity states' })).getByText('Not started').parentElement).toHaveTextContent('2');
    expect(within(board).queryByText('Verified pass')).toBeNull();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Discover and scope');
    expect(screen.getByText('Your next activity is in').parentElement).toHaveTextContent('First module');
    expect(screen.queryByRole('button', { name: 'Download card' })).toBeNull();
  });
  it('keeps verified and self-reviewed counts distinct without inferring path completion', () => {
    mount({ progress: progress(['verified_pass', 'self_reviewed']) });
    const states = screen.getByRole('list', { name: 'Recorded activity states' });
    expect(within(states).getByText('Verified pass').parentElement).toHaveTextContent('1');
    expect(within(states).getByText('Self-reviewed').parentElement).toHaveTextContent('1');
    expect(screen.queryByRole('button', { name: 'Download card' })).toBeNull();
  });
  // UX audit learn-23: 'completed' is said once, as the bar's label; each
  // phase shows a bare '0 / 1' count, with the sentence kept for a screen reader.
  it('labels the bar once and counts each phase as done / total', () => {
    mount({ progress: progress([]) });
    expect(screen.getByRole('progressbar', { name: 'Required modules completed' })).toBeInTheDocument();
    const phase = document.querySelector('[aria-current="step"]') as HTMLElement;
    const count = phase.querySelector('.lp-loop__count') as HTMLElement;
    expect(count.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^0 \/ 1$/);
    expect(within(count).getByText('0 of 1 modules completed')).toHaveClass('ss-sr-only');
    const visible = [...document.querySelectorAll('.lp-loop [aria-hidden="true"]')].map(one => one.textContent);
    expect(visible.join(' ')).not.toMatch(/completed/);
  });
  it('keeps an optional shelf completion out of required-module progress', () => {
    const data = progress([]);
    data.modules.push({ moduleId: 'optional-interview', completed: true, completedAt: null, activities: [] });
    mount({ progress: data });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
  it('does not replace an evidence read failure with a fresh board', () => {
    const retry = vi.fn(); mount({ error: true, retry });
    expect(screen.queryByText('Not started')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('offers a completion card only for the server completion flag, with labels and counts only', () => {
    mount({ progress: progress(['verified_pass', 'self_reviewed'], true) });
    expect(screen.getByRole('button', { name: 'Download card' })).toBeInTheDocument();
    expect(share.render).toHaveBeenLastCalledWith(expect.objectContaining({
      headline: 'FDE guided path completed',
      evidence: [{ label: 'Integration', verified: 1, selfReviewed: 1, total: 2 }],
    }));
  });
});
