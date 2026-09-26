import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { isStripeHostedUrl, looksLikeEmail } from '../src/lib/billing';
import { PremiumCancelPage, PremiumSuccessPage } from '../src/components/PremiumBillingPages';
import PlanLine from '../src/components/PlanLine';
import BrandFooter from '../src/components/BrandFooter';
import PremiumCheckoutButton from '../src/components/PremiumCheckoutButton';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({
  value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false, signInWithGoogle: async () => undefined },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
const signIn = () => { auth.value = { ...auth.value, user: { id: 'user-1' }, isAuthenticated: true }; };
afterEach(() => { auth.value = { ...auth.value, user: null, isAuthenticated: false }; });

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PREMIUM = { ...FREE, tier: 'premium', source: 'provider', currentPeriodEnd: '2026-11-12T10:00:00.000Z' };
const SESSION = 'cs_test_a1ContractSession0001';

/** /api/settings with the billing switches, and the plan. */
function serve({ plan = FREE, billing = { enabled: true, cancellable: true } }: { plan?: unknown; billing?: unknown } = {}) {
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({ billing })),
    http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement' || request.url.includes('/entitlement')
      ? HttpResponse.json(plan as never)
      : undefined),
  );
}

/** Shows the router's current hash, so a test can see the link's token leave it. */
function HashProbe() {
  return <output data-testid="hash">{useLocation().hash}</output>;
}

function renderAt(path: string, node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>{node}<HashProbe /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('the browser only ever leaves for Stripe', () => {
  it('accepts Stripe-hosted https addresses and nothing else', () => {
    expect(isStripeHostedUrl('https://checkout.stripe.com/c/pay/cs_test_1')).toBe(true);
    expect(isStripeHostedUrl('https://billing.stripe.com/p/session/test')).toBe(true);
    expect(isStripeHostedUrl('http://checkout.stripe.com/c/pay/x')).toBe(false);
    expect(isStripeHostedUrl('https://checkout.stripe.com.evil.example/c')).toBe(false);
    expect(isStripeHostedUrl('javascript:alert(1)')).toBe(false);
    expect(looksLikeEmail(' learner@example.com ')).toBe(true);
    expect(looksLikeEmail('learner@')).toBe(false);
  });
});

describe('/premium/success', () => {
  it('asks the server to apply the session when the plan is still free', async () => {
    signIn();
    serve();
    let looked = 0;
    server.use(http.get('*/api/user/billing-checkout', ({ request }) => {
      looked += 1;
      expect(new URL(request.url).searchParams.get('session_id')).toBe(SESSION);
      return HttpResponse.json({ status: 'complete', entitlement: PREMIUM });
    }));
    renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Everything is open now.' })).toBeInTheDocument();
    expect(screen.getByText('Your plan: Premium, renews 12 Nov')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the map' })).toBeInTheDocument();
    expect(looked).toBe(1);
  });

  it('needs no lookup when the webhook came first', async () => {
    signIn();
    serve({ plan: PREMIUM });
    server.use(http.get('*/api/user/billing-checkout', () => { throw new Error('no lookup expected'); }));
    renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Everything is open now.' })).toBeInTheDocument();
  });

  it('says a payment is still processing and offers to check again', async () => {
    signIn();
    serve();
    server.use(http.get('*/api/user/billing-checkout', () => HttpResponse.json({ status: 'pending', entitlement: FREE })));
    renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Your payment is still processing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('stops promising another check after the last automatic one', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      signIn();
      serve();
      let looked = 0;
      server.use(http.get('*/api/user/billing-checkout', () => {
        looked += 1;
        return HttpResponse.json({ status: 'pending', entitlement: FREE });
      }));
      renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
      expect(await screen.findByText('Not confirmed yet. We check again every few seconds.')).toBeInTheDocument();
      for (let check = 2; check <= 6; check++) {
        await vi.advanceTimersByTimeAsync(4000);
        await waitFor(() => expect(looked).toBe(check));
      }
      expect(await screen.findByText('Still not confirmed. Press Check again, or open your profile in a few minutes.')).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(looked).toBe(6);
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers to start again after an expired checkout, with the price', async () => {
    signIn();
    serve();
    server.use(http.get('*/api/user/billing-checkout', () => HttpResponse.json({ status: 'expired', entitlement: FREE })));
    renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'This checkout expired' })).toBeInTheDocument();
    expect(screen.getByText('No payment was taken. €3.99 a month or €39.99 a year, VAT included. Cancel any time.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Continue with monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with yearly' })).toBeInTheDocument();
  });

  it('treats another account’s or a missing checkout the same way', async () => {
    signIn();
    serve();
    server.use(http.get('*/api/user/billing-checkout', () => HttpResponse.json({ error: { code: 'not_found', message: 'No such checkout' } }, { status: 404 })));
    renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'We could not find this checkout' })).toBeInTheDocument();
    renderAt('/premium/success', <PremiumSuccessPage />);
    expect(screen.getAllByRole('heading', { level: 1, name: 'We could not find this checkout' }).length).toBeGreaterThan(0);
  });

  it('asks a signed-out visitor to sign in with the paying account', async () => {
    serve();
    renderAt(`/premium/success?session_id=${SESSION}`, <PremiumSuccessPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in to finish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });
});

describe('/premium/cancel', () => {
  const TOKEN = 'T'.repeat(43);
  const cancelApi = (answer: (body: Record<string, unknown>) => Response | Promise<Response>) => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(http.post('*/api/user/billing-cancel', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      bodies.push(body);
      return answer(body);
    }));
    return bodies;
  };

  it('takes two steps, then asks the address to confirm, and says nothing about a subscription', async () => {
    serve({ billing: { enabled: true, cancellable: true, cancelByEmail: true } });
    const bodies = cancelApi((body) => body.step === 'request'
      ? HttpResponse.json({ step: 'confirm', action: body.action, email: body.email })
      : HttpResponse.json({ received: true, confirmBy: 'email', action: body.action, email: body.email, receivedAt: '2026-09-25T14:32:00.000Z', expiresInMinutes: 60 }));
    renderAt('/premium/cancel', <PremiumCancelPage />);
    const email = await screen.findByLabelText(/Email address of your subscription/);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter the email address your subscription uses.')).toBeInTheDocument();
    fireEvent.change(email, { target: { value: 'payer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const confirm = await screen.findByRole('button', { name: 'Cancel my subscription now' });
    // The step's effect moves focus after the render that shows it, so wait
    // for it rather than read it at the first frame the heading appears.
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Confirm your cancellation' })).toHaveFocus());
    expect(screen.getByText(/subscription of payer@example\.com\?/)).toBeInTheDocument();
    expect(screen.getByText('We will email a link to payer@example.com. Nothing changes until you open it.')).toBeInTheDocument();
    fireEvent.click(confirm);
    await screen.findByRole('heading', { level: 2, name: 'Check your email' });
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Check your email' })).toHaveFocus());
    expect(screen.getByText('We sent a confirmation link to payer@example.com. Open it within 60 minutes to finish. Until you do, nothing changes.')).toBeInTheDocument();
    expect(screen.getByText(/Received on 25 September 2026 at .* for payer@example\.com\./)).toBeInTheDocument();
    expect(screen.queryByText(/will not renew|refunded/)).toBeNull();
    expect(bodies.map((body) => body.step)).toEqual(['request', 'confirm']);
    expect(bodies.every((body) => body.action === 'cancel')).toBe(true);
  });

  it('takes focus back to the email field when the address changes', async () => {
    serve();
    cancelApi((body) => HttpResponse.json({ step: 'confirm', action: body.action, email: body.email }));
    renderAt('/premium/cancel', <PremiumCancelPage />);
    fireEvent.change(await screen.findByLabelText(/Email address of your subscription/), { target: { value: 'payer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Change the email' }));
    await waitFor(() => expect(screen.getByLabelText(/Email address of your subscription/)).toHaveFocus());
  });

  it('asks for the sign-in when the site cannot email a link', async () => {
    serve({ billing: { enabled: true, cancellable: true, cancelByEmail: false } });
    cancelApi((body) => body.step === 'request'
      ? HttpResponse.json({ step: 'confirm' })
      : HttpResponse.json({ received: false, confirmBy: 'sign-in', action: body.action, email: body.email }));
    renderAt('/premium/cancel', <PremiumCancelPage />);
    fireEvent.change(await screen.findByLabelText(/Email address of your subscription/), { target: { value: 'payer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/This site cannot send the confirmation email yet\. To act on this address, sign in/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel my subscription now' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Sign in to finish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows a signed-in owner exactly what happened, withdrawal included', async () => {
    serve();
    cancelApi((body) => body.step === 'request'
      ? HttpResponse.json({ step: 'confirm' })
      : HttpResponse.json({
        received: true, confirmed: true, action: body.action, email: body.email, receivedAt: '2026-09-25T14:32:00.000Z', emailed: true,
        details: [{ withdrawn: true, refunded: true, endsAt: '2026-09-25T14:32:00.000Z' }],
      }));
    renderAt('/premium/cancel?action=withdraw', <PremiumCancelPage />);
    fireEvent.change(await screen.findByLabelText(/Email address of your subscription/), { target: { value: 'payer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/If your first payment was less than 14 days ago, the subscription ends now and we refund it in full, once per account\. Otherwise it stops renewing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw from the contract' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'We received your withdrawal' })).toBeInTheDocument();
    expect(screen.getByText(/refunded your payment in full/)).toBeInTheDocument();
    expect(screen.getByText('We also sent these details to the address on the subscription.')).toBeInTheDocument();
  });

  it('opens the emailed link, takes the token out of the address and confirms once', async () => {
    serve();
    const bodies = cancelApi((body) => body.step === 'review'
      ? HttpResponse.json({ action: 'withdraw', email: 'payer@example.com', requestedAt: '2026-09-25T14:32:00.000Z', expiresAt: '2026-09-25T15:32:00.000Z' })
      : HttpResponse.json({
        received: true, confirmed: true, action: 'withdraw', email: 'payer@example.com', receivedAt: '2026-09-25T14:32:00.000Z', emailed: false,
        details: [{ withdrawn: false, refunded: false, endsAt: '2026-10-25T10:00:00.000Z' }],
      }));
    renderAt(`/premium/cancel#confirm=${TOKEN}`, <PremiumCancelPage />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Confirm your withdrawal' })).toBeInTheDocument();
    expect(screen.getByTestId('hash')).toHaveTextContent('');
    expect(screen.getByText(/Requested on 25 September 2026 at .* for payer@example\.com\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw from the contract' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'We received your withdrawal' })).toBeInTheDocument();
    expect(screen.getByText('Premium stays open until 25 October 2026. You will not be charged again.')).toBeInTheDocument();
    expect(bodies).toEqual([{ step: 'review', token: TOKEN }, { step: 'execute', token: TOKEN }]);
  });

  it('says so when a link has expired, and starts again', async () => {
    serve();
    cancelApi(() => HttpResponse.json({ error: { code: 'link_expired', message: 'This link has expired or was used already.' } }, { status: 410 }));
    renderAt(`/premium/cancel#confirm=${TOKEN}`, <PremiumCancelPage />);
    expect(await screen.findByRole('heading', { level: 2, name: 'This link no longer works' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    await waitFor(() => expect(screen.getByLabelText(/Email address of your subscription/)).toHaveFocus());
  });

  it('says so when billing is not set up', async () => {
    serve({ billing: { enabled: false, cancellable: false } });
    renderAt('/premium/cancel', <PremiumCancelPage />);
    expect(await screen.findByText(/Billing is not set up on this site yet/)).toBeInTheDocument();
  });
});

describe('the plan line and the footer', () => {
  it('offers Manage billing for a paid subscription only, and leaves for the portal', async () => {
    signIn();
    serve({ plan: PREMIUM });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, origin: original.origin, assign } });
    server.use(http.post('*/api/user/billing-portal', () => HttpResponse.json({ url: 'https://billing.stripe.com/p/session/test' })));
    try {
      renderAt('/profile', <PlanLine />);
      fireEvent.click(await screen.findByRole('button', { name: 'Manage billing' }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://billing.stripe.com/p/session/test'));
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('keeps Manage billing away from a complimentary grant without billing', async () => {
    signIn();
    serve({ plan: { ...PREMIUM, source: 'manual', currentPeriodEnd: null } });
    renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium, complimentary')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage billing' })).toBeNull();
  });

  it('keeps Manage billing for a subscription under a longer grant, and after it ended', async () => {
    signIn();
    serve({ plan: { ...PREMIUM, source: 'manual', currentPeriodEnd: null, billingAccount: true, subscriptionLive: true } });
    renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium, complimentary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage billing' })).toBeInTheDocument();
    serve({ plan: { ...FREE, billingAccount: true, subscriptionLive: false } });
    renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Free')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Manage billing' }).length).toBeGreaterThan(0);
  });

  it('links the cancellation page from the footer when billing exists', async () => {
    serve();
    renderAt('/', <BrandFooter />);
    expect(await screen.findByRole('link', { name: 'Cancel Premium' })).toHaveAttribute('href', '/premium/cancel');
  });
});

describe('the checkout button', () => {
  const withLocation = async (run: (assign: ReturnType<typeof vi.fn>) => Promise<void>) => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, origin: original.origin, assign } });
    try { await run(assign); } finally { Object.defineProperty(window, 'location', { configurable: true, value: original }); }
  };

  it('is not there while billing is switched off', async () => {
    signIn();
    serve({ billing: { enabled: false, cancellable: false } });
    renderAt('/premium', <PremiumCheckoutButton plan="monthly" />);
    expect(await screen.findByText('Premium opens soon')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends a free account to Stripe for the plan it chose', async () => {
    signIn();
    serve();
    let plan: unknown;
    server.use(http.post('*/api/user/billing-checkout', async ({ request }) => {
      plan = ((await request.json()) as { plan: string }).plan;
      return HttpResponse.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_x' });
    }));
    await withLocation(async (assign) => {
      renderAt('/premium', <PremiumCheckoutButton plan="annual" />);
      const button = await screen.findByRole('button', { name: 'Continue with yearly' });
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_x'));
      expect(plan).toBe('annual');
    });
  });

  it('shows the server’s refusal instead of leaving', async () => {
    signIn();
    serve();
    server.use(http.post('*/api/user/billing-checkout', () =>
      HttpResponse.json({ error: { code: 'already_premium', message: 'active' } }, { status: 409 })));
    renderAt('/premium', <PremiumCheckoutButton plan="monthly" />);
    const button = await screen.findByRole('button', { name: 'Continue with monthly' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your Premium subscription is active. Manage it from your profile.');
  });

  it('asks a visitor to sign in and a subscriber to manage billing', async () => {
    serve();
    renderAt('/premium', <PremiumCheckoutButton plan="monthly" />);
    expect(await screen.findByRole('button', { name: 'Sign in to continue' })).toBeInTheDocument();
    signIn();
    serve({ plan: PREMIUM });
    renderAt('/premium', <PremiumCheckoutButton plan="monthly" />);
    expect(await screen.findByRole('button', { name: 'Manage billing' })).toBeInTheDocument();
  });

  it('sends a subscriber under a complimentary grant to the portal, not to a second checkout', async () => {
    signIn();
    serve({ plan: { ...PREMIUM, source: 'promo', currentPeriodEnd: null, billingAccount: true, subscriptionLive: true } });
    renderAt('/premium', <PremiumCheckoutButton plan="monthly" />);
    expect(await screen.findByRole('button', { name: 'Manage billing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue with monthly' })).toBeNull();
  });
});
