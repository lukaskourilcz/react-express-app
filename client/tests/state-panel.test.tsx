// The shared StatePanel (UX audit social-account-16, money-05): one component
// for every sign-in gate, empty shelf and callback state, in the 640px task
// column, and, inline, for the money screens' signed-out parts.
import { readFileSync, existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@astryxdesign/core/Button';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { StatePanel } from '../src/components/ui/StatePanel';

const openSignIn = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({ ...(await importOriginal<object>()), openSignIn }));
afterEach(() => openSignIn.mockClear());

const css = readFileSync(new URL('../src/components/ui/StatePanel.css', import.meta.url), 'utf8');
const draw = (node: React.ReactNode) => render(<LanguageProvider>{node}</LanguageProvider>);
const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

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

  it('draws the one Sign in first, opening the dialog and coming back here', () => {
    const { container } = draw(
      <StatePanel level={1} title="Sign in to play live" body="Body" signIn>
        <Button variant="secondary" label="Back" />
      </StatePanel>,
    );
    const signIn = screen.getByRole('button', { name: 'Sign in' });
    expect(container.querySelector('.ss-state-panel__actions')?.firstElementChild).toBe(signIn);
    expect(signIn).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(signIn);
    expect(openSignIn).toHaveBeenCalledWith({});
  });
});

describe('StatePanel inline (the money screens\' signed-out state, money-05)', () => {
  it('says one sentence and offers one primary Sign in that opens the dialog, with no heading', () => {
    const { container } = draw(<StatePanel inline body="Your coins show here once you are signed in." signIn />);
    expect(screen.getByText('Your coins show here once you are signed in.')).toHaveClass('ss-state-panel__body');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.firstElementChild).toHaveClass('ss-state-panel', 'ss-state-panel--inline');
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    // The action row gives it the 44px page-action type, as in the panel.
    expect(button.parentElement).toHaveClass('ss-state-panel__actions');
    expect(button).not.toHaveClass('ss-action');
    fireEvent.click(button);
    // Without a return path the visitor comes back to this page.
    expect(openSignIn).toHaveBeenCalledWith({});
  });

  it('takes a return path, its own verb and a secondary emphasis for a second block', () => {
    draw(<StatePanel inline body="Checkout opens once you are signed in." signIn={{ label: 'Sign in to continue', returnTo: '/premium/checkout?plan=annual', emphasis: 'secondary' }} />);
    const primary = draw(<StatePanel inline body="x" signIn />).getAllByRole('button', { name: 'Sign in' })[0];
    const secondary = screen.getByRole('button', { name: 'Sign in to continue' });
    expect(secondary.className).not.toBe(primary.className);
    fireEvent.click(secondary);
    expect(openSignIn).toHaveBeenCalledWith({ returnTo: '/premium/checkout?plan=annual' });
  });

  it('adds no card: no raised stock, border, background or padding of its own', () => {
    const { container } = draw(<StatePanel inline body="x" signIn />);
    expect(container.firstElementChild).not.toHaveClass('ss-raised');
    const inline = css.match(/\.ss-state-panel--inline \{([^}]*)\}/)?.[1] ?? '';
    expect(inline).toContain('padding: 0');
    expect(inline).toContain('background: none');
    expect(inline).toContain('max-width: none');
    expect(inline).not.toMatch(/border|box-shadow/);
  });

  it('is the one signed-out state: the money screens use it and SignedOutBlock is gone', () => {
    expect(existsSync(new URL('../src/components/SignedOutBlock.tsx', import.meta.url))).toBe(false);
    for (const page of ['components/Shop.tsx', 'components/PremiumBillingPages.tsx', 'components/ReferralInvite.tsx']) {
      expect(source(page)).toMatch(/<StatePanel inline /);
      expect(source(page)).not.toContain('SignedOutBlock');
    }
  });
});
