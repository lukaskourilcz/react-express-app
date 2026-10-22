import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { FdeHub } from '../src/components/paths/FdeHub';
import type { LearningPathManifest } from '../../shared/learning-paths';
import type { PathProgressResponse } from '../../shared/learning-path-api';

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
