// The shared Page layout (UX audit U1, #573): one column, a kicker line that
// is always there so the h1 sits at one y, and task cards at the task width.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ClassroomPage, NotFoundPage, Page } from '../src/components/PublicInfoPages';

const css = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

function renderIn(node: React.ReactNode) {
  return render(<MemoryRouter><LanguageProvider>{node}</LanguageProvider></MemoryRouter>);
}

describe('the Page layout', () => {
  it('reserves the kicker line when a Page passes no kicker, hidden from assistive tech', () => {
    const { container } = renderIn(<Page title="Title" lead="Lead">{null}</Page>);
    const kicker = container.querySelector('.ss-info-page__kicker');
    expect(kicker).not.toBeNull();
    expect(kicker).toHaveAttribute('aria-hidden', 'true');
    expect(kicker?.textContent).toBe('');
    // The kicker comes before the h1 in both cases, so the h1 starts at one y.
    expect(kicker?.nextElementSibling?.tagName).toBe('H1');
  });

  it('shows a kicker that is passed, readable', () => {
    const { container } = renderIn(<Page kicker="Legal" title="Terms" lead="Lead">{null}</Page>);
    const kicker = container.querySelector('.ss-info-page__kicker');
    expect(kicker).not.toHaveAttribute('aria-hidden');
    expect(kicker?.textContent).toBe('Legal');
  });

  it('gives the not-found page its kicker', () => {
    renderIn(<NotFoundPage />);
    expect(screen.getByText('Page not found')).toHaveClass('ss-info-page__kicker');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('gives the empty kicker line a height, so it holds its place', () => {
    expect(css('../src/styles/app-shell.css')).toMatch(/\.ss-info-page__kicker \{ min-height: 1lh;/);
  });

  it('sets no page max-width on the Page column: the route shell owns it', () => {
    expect(css('../src/styles/app-shell.css')).toMatch(/\.ss-info-page \{ width: 100%; margin: 0 auto;/);
    expect(css('../src/styles/app-shell.css')).not.toMatch(/\.ss-info-page \{[^}]*max-width/);
  });

  it('puts the auth, billing and checkout cards at the one task width', () => {
    expect(css('../src/components/auth/Auth.css')).toMatch(/\.ss-auth-page \{ max-width: var\(--ss-width-task\); \}/);
    const billing = css('../src/components/PremiumBillingPages.css');
    expect(billing).toMatch(/\.ss-billing-card \{[^}]*max-width: var\(--ss-width-task\);/);
    expect(billing).not.toMatch(/\.ss-checkout-card \{[^}]*max-width/);
    // Only a banner and its button (no plan chosen, billing unreachable): no
    // card around them. Astryx draws the banner class one level down.
    expect(billing).toContain('.ss-checkout-card:has(.astryx-banner) { padding: 0; border: 0; background: none; box-shadow: none; }');
  });
});

describe('the classroom page', () => {
  it('puts its two actions straight under the lead, with no card around them', () => {
    const { container } = renderIn(<ClassroomPage />);
    expect(container.querySelector('.ss-info-card')).toBeNull();
    const actions = container.querySelector('.ss-info-page > .ss-info-actions');
    expect(actions?.querySelectorAll('button')).toHaveLength(2);
    expect(screen.getByText(/the host controls question progress/)).toBe(container.querySelector('.ss-info-page__header p'));
  });
});

describe('page actions', () => {
  it('draws the header sign-in button as a page action', async () => {
    const { default: SignInButton } = await import('../src/components/SignInButton');
    renderIn(<SignInButton />);
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveClass('astryx-button', 'ss-action');
  });

  it('puts the Page actions in the shared action row, which carries the page-action type', () => {
    const { container } = renderIn(<NotFoundPage />);
    const buttons = container.querySelectorAll('.ss-info-actions .astryx-button');
    expect(buttons).toHaveLength(2);
  });
});
