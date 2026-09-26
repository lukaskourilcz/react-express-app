// Premium vouchers (migration 045): "Have a voucher?" on /premium and the plan
// line of a promo grant.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import PremiumPage from '../src/components/PremiumPage';
import PlanLine from '../src/components/PlanLine';
import UpgradeSheet from '../src/components/UpgradeSheet';
import { closeUpgradeSheet } from '../src/lib/upgradeSheet';
import { server } from './mocks/server';

const signInWithGoogle = vi.fn(async (_returnTo?: string) => undefined);
const auth = vi.hoisted(() => ({
  value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ ...auth.value, signInWithGoogle }) }));
const signIn = () => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; };
afterEach(() => {
  auth.value = { user: null, isAuthenticated: false, isLoading: false };
  signInWithGoogle.mockClear();
  closeUpgradeSheet();
});

// Dates in this year and the next, at noon UTC, so the plan line's "no year
// within the same year" rule and any time zone give the same text every year.
const YEAR = new Date().getFullYear();
const THIS_YEAR_END = `${YEAR}-12-26T12:00:00.000Z`;
const NEXT_YEAR_END = `${YEAR + 1}-10-26T12:00:00.000Z`;
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const VOUCHER_PLAN = { ...FREE, tier: 'premium', source: 'promo', validUntil: THIS_YEAR_END };
const OFF = { enabled: false, cancellable: false, seller: null };
const ON = { enabled: true, cancellable: true, seller: 'link' };

/** The settings and the plan; the plan can change after a redemption. */
function serve({ billing = OFF as unknown, plans = [FREE] as unknown[] }: { billing?: unknown; plans?: unknown[] } = {}) {
  let reads = 0;
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({ billing })),
    http.get('*/api/user/*', () => HttpResponse.json(plans[Math.min(reads++, plans.length - 1)] as never)),
  );
  return { reads: () => reads };
}

/** The redemption endpoint, answering with `answer`; records what was sent. */
function redeemAnswers(answer: () => Response) {
  const bodies: unknown[] = [];
  server.use(http.post('*/api/user/voucher', async ({ request }) => {
    bodies.push(await request.json());
    return answer();
  }));
  return bodies;
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.hash}</p>;
}

function renderAt(path: string, node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes>
            <Route path="*" element={<>{node}<Where /></>} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const voucherSection = () => screen.getByRole('region', { name: 'Have a voucher?' });
const typeAndRedeem = async (code: string) => {
  const field = await screen.findByRole('textbox', { name: /Voucher code/ });
  fireEvent.change(field, { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Redeem voucher' }));
  return field;
};

describe('/premium while checkout is off', () => {
  it('leads with "Have a voucher?" and asks a visitor to sign in first', async () => {
    serve();
    renderAt('/premium', <PremiumPage />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings.slice(0, 2)).toEqual(['Have a voucher?', 'Choose a plan']);
    expect(await within(voucherSection()).findByText(/Premium is not on sale yet\. If someone gave you a voucher/)).toBeInTheDocument();
    expect(within(voucherSection()).getByText('Sign in first. The voucher opens Premium on the account you sign in with.')).toBeInTheDocument();
    expect(within(voucherSection()).queryByRole('textbox')).toBeNull();
    fireEvent.click(within(voucherSection()).getByRole('button', { name: 'Sign in to redeem' }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith('/premium#voucher'));
  });

  it('says so when sign-in cannot start', async () => {
    serve();
    signInWithGoogle.mockRejectedValueOnce(new Error('Sign-in is not available in this deployment.'));
    renderAt('/premium', <PremiumPage />);
    fireEvent.click(within(voucherSection()).getByRole('button', { name: 'Sign in to redeem' }));
    expect(await within(voucherSection()).findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('waits for the sign-in state instead of flashing a prompt', () => {
    serve();
    auth.value = { user: null, isAuthenticated: false, isLoading: true };
    renderAt('/premium', <PremiumPage />);
    expect(within(voucherSection()).getByRole('status')).toHaveTextContent('Checking whether you are signed in');
    expect(within(voucherSection()).queryByRole('button')).toBeNull();
  });

  it('opens Premium, names its end, and refreshes the plan without a reload', async () => {
    signIn();
    const plans = serve({ plans: [FREE, VOUCHER_PLAN] });
    const sent = redeemAnswers(() => HttpResponse.json({ status: 'redeemed', validUntil: THIS_YEAR_END }));
    renderAt('/premium', <PremiumPage />);
    expect(screen.queryByRole('region', { name: 'Your plan' })).toBeNull();
    await typeAndRedeem(' k7q2-abcd 1234 ');
    const heading = await within(voucherSection()).findByRole('heading', { level: 3, name: 'Premium is open' });
    expect(heading).toHaveFocus();
    const done = heading.closest('[role="status"]') as HTMLElement;
    expect(done).toHaveTextContent(`Your voucher opened Premium until 26 December ${YEAR}.`);
    expect(sent).toEqual([{ code: ' k7q2-abcd 1234 ' }]);
    // The plan refetched in place: "Your plan" appears above, from the server.
    const current = await screen.findByRole('region', { name: 'Your plan' });
    expect(within(current).getByText('Premium from a voucher, until 26 Dec')).toBeInTheDocument();
    expect(plans.reads()).toBeGreaterThanOrEqual(2);
    fireEvent.click(within(done).getByRole('button', { name: 'See your plan' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/profile');
  });

  it('says when the Premium it opened has no end', async () => {
    signIn();
    serve({ plans: [FREE, { ...VOUCHER_PLAN, validUntil: null }] });
    redeemAnswers(() => HttpResponse.json({ status: 'redeemed', validUntil: null }));
    renderAt('/premium', <PremiumPage />);
    await typeAndRedeem('OPENOPEN0001');
    expect(await within(voucherSection()).findByText('Your voucher opened Premium, with no end date.')).toBeInTheDocument();
    expect(await screen.findByText('Premium from a voucher, with no end date')).toBeInTheDocument();
  });

  it('refuses an unknown, used-up, expired or revoked code under the field, in one sentence', async () => {
    signIn();
    serve();
    redeemAnswers(() => HttpResponse.json({ error: { code: 'voucher_invalid', message: 'This code does not open Premium. Check it and try again.' } }, { status: 400 }));
    renderAt('/premium', <PremiumPage />);
    const field = await typeAndRedeem('NOSUCHCODE01');
    expect(await within(voucherSection()).findByRole('alert')).toHaveTextContent('This code does not open Premium. Check it and try again.');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();
    // Typing again clears the refusal.
    fireEvent.change(field, { target: { value: 'NOSUCHCODE0' } });
    expect(within(voucherSection()).queryByRole('alert')).toBeNull();
  });

  it('tells an account that it redeemed this voucher before', async () => {
    signIn();
    serve();
    redeemAnswers(() => HttpResponse.json({ error: { code: 'voucher_already_redeemed', message: 'You already redeemed this voucher.' } }, { status: 409 }));
    renderAt('/premium', <PremiumPage />);
    await typeAndRedeem('K7Q2-ABCD-1234');
    expect(await within(voucherSection()).findByRole('alert')).toHaveTextContent('You already redeemed this voucher on this account.');
  });

  it.each([
    ['too many attempts', () => HttpResponse.json({ error: { code: 'rate_limited', message: 'Too many requests.' } }, { status: 429, headers: { 'Retry-After': '720' } }), 'Too many attempts. Wait up to an hour, then try again.'],
    ['offline', () => HttpResponse.error(), 'devShark could not be reached. Check your connection and try again.'],
    ['vouchers unavailable (before migration 045)', () => HttpResponse.json({ error: { code: 'voucher_unavailable', message: 'Vouchers are not available yet.' } }, { status: 503 }), 'Vouchers cannot be redeemed right now. Try again later.'],
    ['a server error', () => HttpResponse.json({ error: { code: 'db_error', message: 'Could not check' } }, { status: 500 }), 'The voucher could not be checked. Try again in a moment.'],
    ['an expired session', () => HttpResponse.json({ error: { code: 'invalid_token', message: 'Token verification failed' } }, { status: 401 }), 'You need to sign in to do that.'],
  ])('keeps the code and explains %s in a banner', async (_label, answer, message) => {
    signIn();
    serve();
    redeemAnswers(answer);
    renderAt('/premium', <PremiumPage />);
    const field = await typeAndRedeem('K7Q2-ABCD-1234');
    expect(await within(voucherSection()).findByRole('alert')).toHaveTextContent(message);
    expect(field).toHaveValue('K7Q2-ABCD-1234');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(within(voucherSection()).getByRole('button', { name: 'Redeem voucher' })).toBeEnabled();
  });

  it('refuses an empty or impossible code without spending an attempt', async () => {
    signIn();
    serve();
    const sent = redeemAnswers(() => HttpResponse.json({ status: 'redeemed', validUntil: null }));
    renderAt('/premium', <PremiumPage />);
    await typeAndRedeem('');
    expect(await within(voucherSection()).findByRole('alert')).toHaveTextContent('Enter your voucher code.');
    await typeAndRedeem('K7Q!');
    expect(await within(voucherSection()).findByRole('alert')).toHaveTextContent('This code does not open Premium. Check it and try again.');
    expect(sent).toEqual([]);
  });

  it('lands on the field when it comes from the upgrade sheet', async () => {
    signIn();
    serve();
    renderAt('/premium#voucher', <PremiumPage />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Voucher code/ })).toHaveFocus());
  });
});

describe('/premium with checkout on', () => {
  it('puts the voucher after the plans', async () => {
    serve({ billing: ON });
    renderAt('/premium', <PremiumPage />);
    // Until the settings say checkout is on, the voucher leads; then it moves.
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
      expect(headings.indexOf('Choose a plan')).toBeLessThan(headings.indexOf('Have a voucher?'));
    });
    expect(within(voucherSection()).getByText('Enter the code you were given, and Premium opens on your account.')).toBeInTheDocument();
  });
});

describe('the plan line', () => {
  it('names a voucher grant and its end, and keeps a manual grant complimentary', async () => {
    signIn();
    serve({ billing: ON, plans: [VOUCHER_PLAN] });
    const first = renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium from a voucher, until 26 Dec')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage billing' })).toBeNull();
    first.unmount();
    serve({ billing: ON, plans: [{ ...VOUCHER_PLAN, validUntil: NEXT_YEAR_END }] });
    const second = renderAt('/profile', <PlanLine />);
    expect(await screen.findByText(`Premium from a voucher, until 26 Oct ${YEAR + 1}`)).toBeInTheDocument();
    second.unmount();
    serve({ billing: ON, plans: [{ ...VOUCHER_PLAN, validUntil: null }] });
    const third = renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium from a voucher, with no end date')).toBeInTheDocument();
    third.unmount();
    serve({ billing: ON, plans: [{ ...VOUCHER_PLAN, source: 'manual', validUntil: null }] });
    renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium, complimentary')).toBeInTheDocument();
  });
});
