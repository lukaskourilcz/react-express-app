// Merchandise is paused until next quarter (owner decision 10, 1 October 2026):
// with MERCH_ENABLED off nothing shows or sells merchandise, whatever a
// settings or shop answer says. The screens as they come back with the switch
// on are covered in merch.test.tsx and rewards.test.tsx.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { en } from '../src/i18n/translations';
import Shop from '../src/components/Shop';
import PremiumPage from '../src/components/PremiumPage';
import { TermsPage } from '../src/components/LegalPages';
import { premiumIncludes } from '../src/components/PremiumFacts';
import { DEFAULT_COIN_SETTINGS, MERCH_ENABLED, SHIRT_SIZES } from '../../shared/rewards';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ ...auth.value, signInWithGoogle: async () => {} }) }));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter></QueryClientProvider>;
}

const PREMIUM = { tier: 'premium', source: 'manual', currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };

// An answer from a server that still sells merchandise: the shop open, a
// hoodie priced in coins, an open promotion, and a claimed path package.
const OPEN_SHOP = {
  enabled: true, cashCheckoutEnabled: true, testMode: false, policyUrl: 'https://example.com/returns',
  items: [{
    sku: 'hoodie', variants: SHIRT_SIZES, availability: 'available',
    price: { minor: 3999, currency: 'EUR', taxIncluded: true, tokenPrice: 1000, regions: ['CZ'] },
    variantStock: SHIRT_SIZES.map((variant) => ({ variant, free: 2 })),
  }],
  crown: { available: true, tokenPrice: 1200 },
  protection: { available: true, tokenPrice: 250, cap: 2 },
};
const ORDERS = [{
  orderId: 'reward-0123456789abcdef01234567', paymentKind: 'tokens', state: 'awaiting_payment', totalMinor: 0,
  currency: 'EUR', tokenTotal: 0, country: 'CZ', carrier: null, trackingRef: null, testMode: false,
  createdAt: '2026-09-24T10:00:00Z', package: true, items: [{ sku: 't-shirt', variant: 'M', quantity: 1 }],
}];

const asked: string[] = [];
function serveOpenMerch() {
  asked.length = 0;
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({
      coins: DEFAULT_COIN_SETTINGS,
      merch: { redemptionOpen: true },
      merchPromo: { description: '15% off everything', code: 'SHARK15', validUntil: '2026-12-30T23:59:59.000Z' },
      billing: { enabled: true, cancellable: true, seller: 'link' },
    })),
    http.get('*/api/user/*', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/referral')) return HttpResponse.json({ enabled: false });
      const op = url.searchParams.get('op') ?? '';
      asked.push(op);
      if (op === 'entitlement') return HttpResponse.json(PREMIUM);
      if (op === 'wallet') {
        return HttpResponse.json({
          subject: 'webdev', balance: 12000, entries: [], cosmetics: [],
          earn: { rules: DEFAULT_COIN_SETTINGS, progress: null },
        });
      }
      if (op === 'shop') return HttpResponse.json(OPEN_SHOP);
      if (op === 'orders') return HttpResponse.json({ orders: ORDERS });
      return undefined;
    }),
  );
}

describe('while merchandise is paused (owner decision 10)', () => {
  it('ships switched off', () => {
    expect(MERCH_ENABLED).toBe(false);
  });

  it('shows the crown and streak protection and no merchandise, redemption or orders, and never asks for the orders', async () => {
    auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false };
    serveOpenMerch();
    await act(async () => render(<Shop />, { wrapper }));
    await screen.findByText('12,000');
    expect(await screen.findByRole('heading', { name: 'Crown and streak protection' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Merchandise' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Hoodie' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Redeem' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Orders and claims' })).toBeNull();
    expect(screen.queryByText('Claimed, waiting to be sent')).toBeNull();
    expect(screen.queryByText(/Spreadshop/)).toBeNull();
    expect(screen.queryByText(en['shop.subtitleMerch'])).toBeNull();
    expect(document.body.textContent).not.toMatch(/merchandise|t-shirt|hoodie|mug|sticker/i);
    await waitFor(() => expect(asked).toContain('shop'));
    expect(asked).not.toContain('orders');
  });

  it('leaves the merchandise line out of what Premium includes, even when redemption reports open', async () => {
    expect(premiumIncludes(true)).not.toContain('premium.sheet.include6');
    serveOpenMerch();
    render(<PremiumPage />, { wrapper });
    expect(await screen.findByRole('heading', { name: 'Premium includes' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    expect(screen.queryByText(/devShark merchandise/)).toBeNull();
    expect(screen.queryByRole('rowheader', { name: 'Coins for merchandise' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/merchandise/i);
  });

  it('promises no merchandise in the Terms', () => {
    serveOpenMerch();
    render(<TermsPage />, { wrapper });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/merchandise|redeem coins/i);
  });

  it('tells the owner in /dev that merchandise is off', async () => {
    server.use(
      http.get('*/api/admin/settings', () => HttpResponse.json({ settings: { merch: { enabled: false, cashCheckoutEnabled: false, testMode: true, pricing: {}, crownTokenPrice: 1200, streakProtectionTokenPrice: 250, policyUrl: '' } } })),
      http.get('*/api/user/*', () => HttpResponse.json({ orders: [], items: [], stock: [] })),
    );
    const { default: DevMerch } = await import('../src/components/dev/DevMerch');
    render(<DevMerch />, { wrapper });
    const banner = await screen.findByText('Merchandise is off until next quarter');
    expect(banner.closest('[role="alert"], [role="status"]') ?? banner).toBeInTheDocument();
    expect(screen.getByText(/the server refuses orders and package claims with merch_unavailable/)).toBeInTheDocument();
  });
});
