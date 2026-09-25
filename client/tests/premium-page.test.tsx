// /premium, the plan table, the Terms and the privacy policy (#222).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const signInWithGoogle = vi.fn(async (_returnTo?: string) => undefined);
const auth = vi.hoisted(() => ({
  value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ ...auth.value, signInWithGoogle }) }));
const signIn = () => { auth.value = { ...auth.value, user: { id: 'user-1' }, isAuthenticated: true }; };
afterEach(() => { auth.value = { ...auth.value, user: null, isAuthenticated: false }; signInWithGoogle.mockClear(); });

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PAYING = { ...FREE, tier: 'premium', source: 'provider', currentPeriodEnd: '2026-11-12T10:00:00.000Z' };

function serve({ plan = FREE, billing = { enabled: true, cancellable: true, seller: 'link' } }: { plan?: unknown; billing?: unknown } = {}) {
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({ billing })),
    http.get('*/api/user/*', () => HttpResponse.json(plan as never)),
  );
}

function renderAt(path: string, node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>{node}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('/premium', () => {
  it('states the price with VAT, the renewal and the waiver before anyone pays', async () => {
    serve();
    renderAt('/premium', <PremiumPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Everything in devShark for €3.99 a month' })).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: 'Choose a plan' });
    expect(within(plans).getByRole('heading', { level: 3, name: 'Monthly' })).toBeInTheDocument();
    expect(within(plans).getByText('€3.99')).toBeInTheDocument();
    expect(within(plans).getByText('€39.99')).toBeInTheDocument();
    expect(within(plans).getByText('Two months free')).toBeInTheDocument();
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
    expect(screen.getByText('Sign in with Google first. You come back here to choose a plan.')).toBeInTheDocument();
    // The button waits for the billing settings before it acts.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Sign in to continue' })[0]).toBeEnabled());
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in to continue' })[0]);
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith('/premium'));
  });

  it('offers both checkouts to a free account', async () => {
    signIn();
    serve();
    renderAt('/premium', <PremiumPage />);
    expect(await screen.findByRole('button', { name: 'Continue with monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with yearly' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your plan' })).toBeNull();
  });

  it('shows a subscriber the plan line and Manage billing, and no second checkout', async () => {
    signIn();
    serve({ plan: PAYING });
    renderAt('/premium', <PremiumPage />);
    const current = await screen.findByRole('region', { name: 'Your plan' });
    expect(await within(current).findByText('Premium, renews 12 Nov')).toBeInTheDocument();
    expect(within(current).getByRole('button', { name: 'Manage billing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with/ })).toBeNull();
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
  });
});

describe('the plan table', () => {
  it('compares Free and Premium and drops the AI and bilingual rows', () => {
    renderAt('/', <ComparisonTable />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['What you get', 'FreeEvery account', 'Premium€3.99 a month, VAT included']);
    const rows = within(table).getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(rows).toContain('React');
    expect(rows).toContain('FDE and DSA learning paths');
    expect(rows.join(' ')).not.toMatch(/AI|Czech/);
    expect(within(table).getByText('Levels 1 to 12')).toBeInTheDocument();
    expect(within(table).getByText('All 16')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/learn');
  });
});

describe('the Terms and the privacy policy', () => {
  it('says the trader details are missing rather than guessing them', () => {
    serve();
    renderAt('/terms', <TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getByText(/The trader’s name, company ID, registered address and email appear here/)).toBeInTheDocument();
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

  it('lists Stripe, Link, Spreadshop and the merchandise address in the privacy policy', async () => {
    serve();
    renderAt('/privacy', <PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByText(/sprd\.net AG, Gießerstraße 27, 04229 Leipzig, Germany/)).toBeInTheDocument();
    expect(screen.getByText(/passes them to sprd\.net AG/)).toBeInTheDocument();
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
