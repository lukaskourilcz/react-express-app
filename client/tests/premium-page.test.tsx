// /premium, the plan table, the Terms and the privacy policy (#222).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { en } from '../src/i18n/translations';
import PremiumPage from '../src/components/PremiumPage';
import ComparisonTable from '../src/components/landing/ComparisonTable';
import { PrivacyPage, TermsPage, traderRows } from '../src/components/LegalPages';
import { isSafeReturnPath, rememberAuthReturn, takeAuthReturn } from '../src/lib/authReturn';
import { server } from './mocks/server';
import { settingsHandler } from './mocks/handlers';
import { firstDraw, headings } from './firstDraw';

const auth = vi.hoisted(() => ({
  value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
// Signing in opens the sign-in dialog (Google, or an email and password).
const openSignIn = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({ ...(await importOriginal<object>()), openSignIn }));
const signIn = () => { auth.value = { ...auth.value, user: { id: 'user-1' }, isAuthenticated: true }; };
afterEach(() => { auth.value = { ...auth.value, user: null, isAuthenticated: false }; openSignIn.mockClear(); });

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PAYING = { ...FREE, tier: 'premium', source: 'provider', currentPeriodEnd: '2026-11-12T10:00:00.000Z' };

function serve({ plan = FREE, billing = { enabled: true, cancellable: true, seller: 'link' } }: { plan?: unknown; billing?: unknown } = {}) {
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({ billing })),
    http.get('*/api/user/*', () => HttpResponse.json(plan as never)),
  );
}

// Every render is a visit of its own, with a key that stays put while a held
// first render is retried (lib/routeData.ts keys its wait by the visit).
let visits = 0;
function visit(path: string) {
  const url = new URL(path, 'http://localhost');
  return { pathname: url.pathname, search: url.search, hash: url.hash, key: `visit-${++visits}` };
}

function renderAt(path: string, node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[visit(path)]}>
        <LanguageProvider>{node}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
// Signed in, the page holds its first render for the plan (lib/routeData.ts);
// a render that suspends has to start inside an awaited act. Signed out it
// draws at once, which the tests that render without act rely on.
const mountAt = (path: string, node: ReactNode) => act(async () => renderAt(path, node));

describe('/premium', () => {
  it('states the price with VAT, the renewal and the waiver before anyone pays', async () => {
    serve();
    renderAt('/premium', <PremiumPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Everything in devShark for €3.99 a month' })).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: 'Choose a plan' });
    expect(within(plans).getByRole('heading', { level: 3, name: 'Monthly' })).toBeInTheDocument();
    expect(within(plans).getByText('€3.99')).toBeInTheDocument();
    expect(within(plans).getByText('€39.99')).toBeInTheDocument();
    // Owner decision 11: the exact saving at the prices shown, 3.99 × 12 − 39.99.
    expect(within(plans).getByText('Save 7.89 EUR a year')).toBeInTheDocument();
    expect(screen.queryByText(/months? free/i)).toBeNull();
    // The refund promise says what the Terms and the code say: once per account.
    expect(within(plans).getByText(/withdraw within 14 days of your first payment and get that payment back in full, once per account\./)).toBeInTheDocument();
    expect(within(plans).getAllByText(/VAT included\. Renews every (month|year) until you cancel\./)).toHaveLength(2);
    expect(within(plans).getByText(/renews automatically at the end of each month or year/)).toBeInTheDocument();
    expect(within(plans).getByText(en['premium.page.waiver'])).toBeInTheDocument();
    expect(within(plans).getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms');
    expect(within(plans).getByRole('link', { name: 'Cancel or withdraw' })).toHaveAttribute('href', '/premium/cancel');
  });

  it('signs a visitor in and comes back to /premium', async () => {
    serve();
    renderAt('/premium', <PremiumPage />);
    const buttons = await screen.findAllByRole('button', { name: 'Sign in to continue' });
    expect(buttons).toHaveLength(2);
    expect(screen.getByText('Sign in first. You come back here to choose a plan.')).toBeInTheDocument();
    // The button waits for the billing settings before it acts.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Sign in to continue' })[0]).toBeEnabled());
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in to continue' })[0]);
    await waitFor(() => expect(openSignIn).toHaveBeenCalledWith({ returnTo: '/premium' }));
  });

  it('offers both checkouts to a free account', async () => {
    signIn();
    serve();
    await mountAt('/premium', <PremiumPage />);
    expect(await screen.findByRole('button', { name: 'Continue with monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with yearly' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your plan' })).toBeNull();
  });

  it('shows a subscriber the plan line and Manage billing, and no second checkout', async () => {
    signIn();
    serve({ plan: PAYING });
    await mountAt('/premium', <PremiumPage />);
    const current = await screen.findByRole('region', { name: 'Your plan' });
    expect(await within(current).findByText('Premium, renews 12 Nov')).toBeInTheDocument();
    expect(within(current).getByRole('button', { name: 'Manage billing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with/ })).toBeNull();
  });

  it('draws a signed-in plan with the page instead of adding it above the plans', async () => {
    signIn();
    serve({ plan: PAYING });
    const drawn = firstDraw('h1', headings);
    await mountAt('/premium', <PremiumPage />);
    expect(drawn()).toEqual(expect.arrayContaining(['Your plan', 'Choose a plan']));
    expect(drawn()!.indexOf('Your plan')).toBeLessThan(drawn()!.indexOf('Choose a plan'));
  });

  it('never holds a signed-out visitor for a plan', () => {
    const planReads = vi.fn();
    serve();
    server.use(http.get('*/api/user/*', () => { planReads(); return HttpResponse.json(FREE); }));
    renderAt('/premium', <PremiumPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your plan' })).toBeNull();
    expect(planReads).not.toHaveBeenCalled();
  });

  it('says Premium opens soon, once, when billing is off', async () => {
    serve({ billing: { enabled: false, cancellable: false, seller: null } });
    renderAt('/premium', <PremiumPage />);
    expect(await screen.findByText('Premium opens soon')).toBeInTheDocument();
    expect(screen.getAllByText('Premium opens soon')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Continue with|Sign in to continue/ })).toBeNull();
  });

  it('says so when the settings cannot be read, and tries again', async () => {
    let calls = 0;
    server.use(http.get('*/api/settings', () => {
      calls += 1;
      return calls === 1
        ? HttpResponse.json({ error: { code: 'server_error', message: 'Down' } }, { status: 500 })
        : HttpResponse.json({ billing: { enabled: true, cancellable: true, seller: 'link' } });
    }));
    renderAt('/premium', <PremiumPage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not reach devShark to check whether checkout is open.');
    expect(screen.queryByRole('button', { name: 'Sign in to continue' })).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByRole('button', { name: 'Sign in to continue' })).toHaveLength(2);
  });

  it('answers six questions in native disclosures', () => {
    serve();
    const { container } = renderAt('/premium', <PremiumPage />);
    expect(container.querySelectorAll('details.ss-premium-faq__item')).toHaveLength(6);
    expect(screen.getByText('Can I switch between monthly and yearly?')).toBeInTheDocument();
    expect(screen.getByText('Do you sell my data?')).toBeInTheDocument();
    // The refund answer says once per account, as the Terms and claimRefund do.
    const refund = screen.getByText('Can I withdraw and get my money back?').closest('details')!;
    expect(refund).toHaveTextContent('Yes, within 14 days of your first payment, once per account.');
    expect(refund).toHaveTextContent('After 14 days, or once the refund has been used, the same page cancels at the end of the paid period.');
  });
});

describe('the plan table', () => {
  it('compares Free and Premium and drops the AI and bilingual rows', () => {
    server.use(settingsHandler);
    renderAt('/', <ComparisonTable />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['What you get', 'FreeEvery account', 'Premium€3.99 a month, VAT included']);
    const rows = within(table).getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(rows).toContain('React');
    // Nothing that has not opened yet (design audit P0.1), and no ads row:
    // the footnote says it once.
    expect(rows).not.toContain('FDE and DSA learning paths');
    expect(rows).not.toContain('Coins for merchandise');
    expect(rows).not.toContain('Ads');
    expect(rows.join(' ')).not.toMatch(/AI|Czech/);
    expect(screen.getByText(/No ads on either plan\./)).toBeInTheDocument();
    expect(within(table).getByText('Levels 1 to 12')).toBeInTheDocument();
    expect(within(table).getByText('All 16')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/learn');
  });

  // Merchandise is paused until next quarter (owner decision 10): the coin row
  // stays out even when a settings answer says redemption is open. It used to
  // appear here; merch-paused.test.tsx covers the paused page in full.
  it('adds the path row once its switch is on, and no coin row while merchandise is paused', async () => {
    server.use(http.get('*/api/settings', () => HttpResponse.json({
      merch: { redemptionOpen: true },
      learningPaths: { paths: { fde: { enabled: false }, 'dsa-foundations': { enabled: true } } },
    })));
    renderAt('/', <ComparisonTable />);
    const table = screen.getByRole('table');
    expect(await within(table).findByRole('rowheader', { name: 'FDE and DSA learning paths' })).toBeInTheDocument();
    expect(within(table).queryByRole('rowheader', { name: 'Coins for merchandise' })).toBeNull();
  });
});

describe('the launch price (4 Oct to 2 Nov 2026, Prague)', () => {
  const ON = { enabled: true, cancellable: true, seller: 'link', launchOffer: true };
  const at = (iso: string) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(iso)); };
  afterEach(() => { vi.useRealTimers(); });

  const expectRegularPage = async () => {
    expect(await screen.findAllByRole('button', { name: 'Sign in to continue' })).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: 'Everything in devShark for €3.99 a month' })).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: 'Choose a plan' });
    expect(within(plans).getByText('€3.99')).toBeInTheDocument();
    expect(within(plans).getByText('€39.99')).toBeInTheDocument();
    expect(within(plans).getByText('Save 7.89 EUR a year')).toBeInTheDocument();
    expect(document.querySelector('s, [data-offer]')).toBeNull();
    expect(screen.queryByText(/launch price/i)).toBeNull();
    expect(screen.queryByText(/1\.80|18\.00/)).toBeNull();
  };

  it('shows the launch price, the regular price from 3 Nov, the lifetime and the end date', async () => {
    at('2026-10-10T10:00:00Z');
    serve({ billing: ON });
    renderAt('/premium', <PremiumPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Everything in devShark at the launch price of €1.80 a month' })).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: 'Choose a plan' });
    // Each plan: the regular price struck through beside the launch price,
    // announced as one sentence.
    const monthly = plans.querySelector('[data-plan="monthly"] .ss-offer-amount')!;
    expect(monthly.querySelector('s')).toHaveTextContent('€3.99');
    expect(monthly.querySelector('strong')).toHaveTextContent('€1.80');
    expect(monthly.querySelector('[aria-hidden="true"]')).toContainElement(monthly.querySelector('s'));
    expect(within(monthly as HTMLElement).getByText('€1.80 launch price; the regular price from 3 Nov 2026 is €3.99')).toHaveClass('ss-sr-only');
    const annual = plans.querySelector('[data-plan="annual"] .ss-offer-amount')!;
    expect(annual.querySelector('s')).toHaveTextContent('€39.99');
    expect(annual.querySelector('strong')).toHaveTextContent('€18.00');
    // The saving is true for the price shown: 1.80 × 12 − 18.00, not the
    // regular 7.89 (owner decision 11).
    expect(within(plans.querySelector('[data-plan="annual"]') as HTMLElement).getByText('Save 3.60 EUR a year')).toBeInTheDocument();
    expect(within(plans).queryByText('Save 7.89 EUR a year')).toBeNull();
    const note = within(plans).getByRole('group', { name: 'Launch price €1.80 a month · €18.00 a year' });
    expect(note).toHaveTextContent('55% below the regular price of €3.99 a month · €39.99 a year, which applies from 3 Nov 2026');
    expect(note).toHaveTextContent('Kept for the lifetime of your subscription · cancel anytime');
    expect(note).toHaveTextContent('Offer ends 2 Nov 2026');
    // Launch-price framing: no earlier price is cited, nothing counts down.
    expect(document.body.textContent).not.toMatch(/lowest price|last 30 days|hurry|left\b/i);
    expect(screen.getByText('How long does the launch price last?')).toBeInTheDocument();
    expect(screen.getByText(/a subscription started from 3 November 2026 pays the regular price of €3\.99 a month or €39\.99 a year/)).toBeInTheDocument();
    // The plan table on /premium leaves the note to the plans above it.
    expect(screen.getAllByRole('group', { name: /^Launch price/ })).toHaveLength(1);
    expect(within(screen.getByRole('table')).getByText('€1.80 launch price; the regular price from 3 Nov 2026 is €3.99')).toBeInTheDocument();
  });

  it('shows the regular page before 4 Oct 00:00 Prague, even when the server says on', async () => {
    at('2026-10-03T21:59:59.999Z');
    serve({ billing: ON });
    renderAt('/premium', <PremiumPage />);
    await expectRegularPage();
  });

  it('starts at 4 Oct 00:00 Prague and ends after 2 Nov 23:59:59 Prague', async () => {
    at('2026-10-03T22:00:00Z');
    serve({ billing: ON });
    const first = renderAt('/premium', <PremiumPage />);
    expect(await screen.findByRole('group', { name: /^Launch price/ })).toBeInTheDocument();
    first.unmount();
    at('2026-11-02T22:59:59.999Z');
    const last = renderAt('/premium', <PremiumPage />);
    expect(await screen.findByRole('group', { name: /^Launch price/ })).toBeInTheDocument();
    last.unmount();
    at('2026-11-02T23:00:00Z');
    renderAt('/premium', <PremiumPage />);
    await expectRegularPage();
  });

  it('shows the regular page inside the window when the coupon or billing is off', async () => {
    at('2026-10-10T10:00:00Z');
    serve({ billing: { ...ON, launchOffer: false } });
    const noCoupon = renderAt('/premium', <PremiumPage />);
    await expectRegularPage();
    noCoupon.unmount();
    serve({ billing: { enabled: false, cancellable: false, seller: null, launchOffer: true } });
    renderAt('/premium', <PremiumPage />);
    expect(await screen.findByText('Premium opens soon')).toBeInTheDocument();
    expect(screen.queryByText(/launch price/i)).toBeNull();
  });

  it('puts the launch price and its note under the landing plan table', async () => {
    at('2026-10-10T10:00:00Z');
    serve({ billing: ON });
    renderAt('/', <ComparisonTable />);
    const table = screen.getByRole('table');
    await waitFor(() => expect(within(table).getByText('€1.80')).toBeInTheDocument());
    expect(within(table).getByText('€3.99').tagName).toBe('S');
    expect(screen.getByRole('group', { name: 'Launch price €1.80 a month · €18.00 a year' })).toHaveTextContent('which applies from 3 Nov 2026');
  });

  it('adds the launch price to the Terms only while it is on', async () => {
    at('2026-10-10T10:00:00Z');
    serve({ billing: ON });
    const on = renderAt('/terms', <TermsPage />);
    expect(await screen.findByText(/Launch price: a subscription started between 4 October 2026 and 2 November 2026, Prague time, costs €1\.80 a month or €18\.00 a year, VAT included, for as long as it runs\./)).toBeInTheDocument();
    expect(screen.getByText(/which applies to subscriptions started from 3 November 2026/)).toBeInTheDocument();
    expect(screen.getByText(/lasts for the lifetime of that subscription/)).toBeInTheDocument();
    on.unmount();
    // After the window closes, as the real clock will be from 3 Nov.
    at('2026-11-03T10:00:00Z');
    renderAt('/terms', <TermsPage />);
    expect(await screen.findByText(/Stripe sells Premium to you as the seller of record/)).toBeInTheDocument();
    expect(screen.queryByText(/Launch price:/)).toBeNull();
    // The general rule on discounts stays: it describes no offer.
    expect(screen.getByText(/lasts for the lifetime of that subscription/)).toBeInTheDocument();
  });
});

describe('the Terms and the privacy policy', () => {
  it('shows the verified trader identity and working support contact', () => {
    serve();
    renderAt('/terms', <TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getAllByText('Lukáš Kouřil').length).toBeGreaterThan(0);
    expect(screen.getByText('04713397')).toBeInTheDocument();
    expect(screen.getAllByText('Družstevní čtvrť 3145/19, 695 01 Hodonín, Czech Republic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('support@devshark.app').length).toBeGreaterThan(0);
    expect(screen.queryByText(/The remaining trader details appear here/)).toBeNull();
    expect(traderRows({ name: 'Jane Doe', companyId: null, registeredAddress: '  ', email: 'jane@example.com' }).map((row) => row.field)).toEqual(['name', 'email']);
  });

  it('covers the plans, the price with VAT, cancellation, the waiver, the refund and disputes', async () => {
    serve();
    renderAt('/terms', <TermsPage />);
    for (const heading of ['The free plan and Premium', 'Price and payment', 'Renewal and cancellation', 'Your right of withdrawal', '14-day refund on your first payment', 'How to withdraw', 'Premium without payment', 'Law and disputes', 'Complaints']) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/Premium costs €3\.99 a month or €39\.99 a year\. Both prices include VAT\./)).toBeInTheDocument();
    expect(screen.getByText(/React levels 1 to 12/)).toBeInTheDocument();
    expect(screen.getByText(en['premium.page.waiver'])).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Model withdrawal form' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /out-of-court dispute resolution/ })).toHaveAttribute('href', 'https://coi.gov.cz/en/information-about-adr/');
    // The seller follows the server's settings once they arrive.
    expect(await screen.findByText(/Stripe sells Premium to you as the seller of record, under the name Link/)).toBeInTheDocument();
  });

  it('names the trader as the seller under plain Stripe', async () => {
    serve({ billing: { enabled: true, cancellable: true, seller: 'trader' } });
    renderAt('/terms', <TermsPage />);
    expect(await screen.findByText(/The trader named under Who runs devShark sells Premium to you/)).toBeInTheDocument();
  });

  // Round 4: merchandise is hidden until next quarter, so the policy no longer
  // names Spreadshop as a recipient (it receives nothing) or a postal address.
  it('lists Stripe and Link in the privacy policy, and no merchandise address', async () => {
    serve();
    renderAt('/privacy', <PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.queryByText(/sprd\.net AG/)).toBeNull();
    expect(screen.getByText(/does not offer merchandise yet\. It collects no order and no postal address/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Link privacy policy' })).toHaveAttribute('href', 'https://link.com/privacy');
    expect(screen.getByRole('link', { name: 'Stripe privacy policy' })).toHaveAttribute('href', 'https://stripe.com/privacy');
    expect(screen.getByText(/devShark has no AI feature/)).toBeInTheDocument();
  });
});

describe('the sign-in return path', () => {
  it('accepts same-origin paths only, once, while fresh', () => {
    expect(isSafeReturnPath('/premium')).toBe(true);
    expect(isSafeReturnPath('/premium/success?session_id=cs_test_1')).toBe(true);
    for (const bad of ['//evil.example', 'https://evil.example', '/\\evil', 'premium', '/a b', 42]) expect(isSafeReturnPath(bad)).toBe(false);
    rememberAuthReturn('/premium', 1_000);
    expect(takeAuthReturn(2_000)).toBe('/premium');
    expect(takeAuthReturn(3_000)).toBeNull();
    rememberAuthReturn('/premium', 1_000);
    expect(takeAuthReturn(1_000 + 16 * 60_000)).toBeNull();
    rememberAuthReturn('//evil.example', 1_000);
    expect(takeAuthReturn(2_000)).toBeNull();
  });
});
