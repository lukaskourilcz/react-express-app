// The shared StatePanel (UX audit social-account-16): one panel for every
// sign-in gate, empty shelf and callback state, in the 640px task column.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@astryxdesign/core/Button';
import { StatePanel } from '../src/components/ui/StatePanel';

const css = readFileSync(new URL('../src/components/ui/StatePanel.css', import.meta.url), 'utf8');

describe('StatePanel', () => {
  it('is the page heading when it is the page, and a section heading under a page header', () => {
    const { unmount } = render(<StatePanel level={1} title="Sign in to save questions" body="Body" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to save questions' })).toBeInTheDocument();
    unmount();
    render(<StatePanel level={2} title="Sign in to save questions" body="Body" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in to save questions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('shows one body line and its actions, the primary first', () => {
    const { container } = render(
      <StatePanel level={2} title="Title" body="Your cards stay with your account on every device.">
        <Button variant="primary" label="Sign in" />
        <Button variant="secondary" label="Back" />
      </StatePanel>,
    );
    expect(container.querySelectorAll('.ss-state-panel__body')).toHaveLength(1);
    expect(screen.getByText('Your cards stay with your account on every device.')).toBeInTheDocument();
    const actions = container.querySelector('.ss-state-panel__actions');
    expect(actions?.firstElementChild).toHaveTextContent('Sign in');
  });

  it('draws no icon, kicker or action row unless it is given one', () => {
    const { container } = render(<StatePanel level={1} title="Title" body="Body" />);
    expect(container.querySelector('.ss-kicker')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('.ss-state-panel__actions')).toBeNull();
  });

  it('draws the kicker with the shared Kicker, above the heading', () => {
    const { container } = render(<StatePanel level={1} kicker="GitHub garden" title="Title" body="Body" />);
    const kicker = container.querySelector('.ss-kicker');
    expect(kicker).toHaveTextContent('GitHub garden');
    expect(kicker?.nextElementSibling?.tagName).toBe('H1');
  });

  it('announces a body that changes in place only when asked to', () => {
    const { rerender } = render(<StatePanel level={1} title="Title" body="Working" />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<StatePanel level={1} title="Title" body="Working" live />);
    expect(screen.getByRole('status')).toHaveTextContent('Working');
  });

  it('sits centred in the task column, not at a width of its own', () => {
    const panel = css.match(/\.ss-state-panel \{([^}]*)\}/)?.[1] ?? '';
    expect(panel).toContain('max-width: var(--ss-width-task)');
    expect(panel).toContain('margin: 0 auto');
    expect(panel).not.toMatch(/max-width: \d+px/);
  });

  it('spaces the heading with the panel gap, not a browser h1 margin', () => {
    expect(css).toContain('.ss-state-panel > h1, .ss-state-panel > h2 { margin: 0; }');
  });
});
