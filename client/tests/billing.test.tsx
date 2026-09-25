import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
  it('takes two steps and never says whether the address has a subscription', async () => {
    serve();
    const bodies: Array<Record<string, unknown>> = [];
    server.use(http.post('*/api/user/billing-cancel', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      bodies.push(body);
      return body.step === 'request'
        ? HttpResponse.json({ step: 'confirm', action: body.action, email: body.email })
        : HttpResponse.json({ received: true, action: body.action, email: body.email, receivedAt: '2026-09-25T14:32:00.000Z', emailed: false });
    }));
    renderAt('/premium/cancel', <PremiumCancelPage />);
    const email = await screen.findByLabelText(/Email address of your subscription/);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter the email address your subscription uses.')).toBeInTheDocument();
    fireEvent.change(email, { target: { value: 'payer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const confirm = await screen.findByRole('button', { name: 'Cancel my subscription now' });
    expect(screen.getByRole('heading', { level: 2, name: 'Confirm your cancellation' })).toHaveFocus();
    expect(screen.getByText(/subscription of payer@example\.com/)).toBeInTheDocument();
    fireEvent.click(confirm);
    expect(await screen.findByRole('heading', { level: 2, name: 'We received your cancellation' })).toBeInTheDocument();
    expect(screen.getByText(/Received on 25 September 2026 at .* for payer@example\.com\./)).toBeInTheDocument();
    expect(screen.getByText(/If a devShark Premium subscription uses this address, it will not renew/)).toBeInTheDocument();
    expect(bodies.map((body) => body.step)).toEqual(['request', 'confirm']);
    expect(bodies.every((body) => body.action === 'cancel')).toBe(true);
  });

  it('offers the withdrawal variant and shows an owner exactly what happened', async () => {
    serve();
    server.use(http.post('*/api/user/billing-cancel', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      return body.step === 'request'
        ? HttpResponse.json({ step: 'confirm' })
        : HttpResponse.json({
          received: true, action: body.action, email: body.email, receivedAt: '2026-09-25T14:32:00.000Z', emailed: true,
          details: [{ withdrawn: true, refunded: true, endsAt: '2026-09-25T14:32:00.000Z' }],
        });
    }));
    renderAt('/premium/cancel?action=withdraw', <PremiumCancelPage />);
    fireEvent.change(await screen.findByLabelText(/Email address of your subscription/), { target: { value: 'payer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw from the contract' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'We received your withdrawal' })).toBeInTheDocument();
    expect(screen.getByText(/refunded your payment in full/)).toBeInTheDocument();
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

  it('keeps Manage billing away from a complimentary grant', async () => {
    signIn();
    serve({ plan: { ...PREMIUM, source: 'manual', currentPeriodEnd: null } });
    renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium, complimentary')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage billing' })).toBeNull();
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
});
