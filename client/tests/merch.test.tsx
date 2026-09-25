import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Shop, { MerchCard, MerchPromoNote } from '../src/components/Shop';
import type { ShopItem } from '../src/lib/rewards';
import { MERCH_SHOP } from '../product-catalog';
import { DEFAULT_COIN_SETTINGS, MERCH_CATALOGUE, SHIRT_SIZES } from '../../shared/rewards';
import { server } from './mocks/server';

// Merchandise through Spreadshop (#229). Invented fixtures only; the shapes are
// the real op=shop and op=orders ones.
const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter></QueryClientProvider>;
}

const unconfigured = (sku: ShopItem['sku'], variants: readonly string[] = []): ShopItem => ({
  sku, variants, availability: 'unconfigured', price: null, variantStock: [],
});
const hoodie: ShopItem = {
  sku: 'hoodie', variants: SHIRT_SIZES, availability: 'available',
  price: { minor: 3999, currency: 'EUR', taxIncluded: true, tokenPrice: 10000, regions: ['CZ'] },
  variantStock: SHIRT_SIZES.map((variant) => ({ variant, free: variant === 'XXL' ? 0 : 2 })),
};
const card = (item: ShopItem, extra: Partial<Parameters<typeof MerchCard>[0]> = {}) => (
  <MerchCard item={item} busy={false} premiumLocked={false} balance={null} onOrder={() => {}} {...extra} />
);

describe('the catalogue and the shop links', () => {
  it('sells a hoodie in the t-shirt sizes and keeps every link empty until the owner sets it', () => {
    expect(MERCH_CATALOGUE.find((item) => item.sku === 'hoodie')?.variants).toEqual(SHIRT_SIZES);
    expect(MERCH_SHOP.shopUrl).toBeNull();
    expect(Object.keys(MERCH_SHOP.products).sort()).toEqual(MERCH_CATALOGUE.map((item) => item.sku).sort());
    expect(Object.values(MERCH_SHOP.products).every((url) => url === null)).toBe(true);
  });
});

describe('a merchandise tile', () => {
  it('renders without an image or a shop link when neither exists', () => {
    render(card(unconfigured('mug'), { image: undefined, productUrl: null }), { wrapper });
    expect(screen.getByRole('heading', { level: 3, name: 'Mug' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the mockup with alt text and links to the item in a new tab', () => {
    render(card(unconfigured('mug'), { image: '/merch/mug.webp', productUrl: 'https://devshark.myspreadshop.net/mug' }), { wrapper });
    const image = screen.getByRole('img', { name: 'Mockup of the devShark mug' });
    expect(image).toHaveAttribute('src', '/merch/mug.webp');
    expect(image).toHaveAttribute('loading', 'lazy');
    const link = screen.getByRole('link', { name: /Buy at the devShark shop/ });
    expect(link).toHaveAttribute('href', 'https://devshark.myspreadshop.net/mug');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('(opens in a new tab)');
  });

  it('says "Not on sale yet" for coins while an item is unconfigured, and cannot be redeemed', () => {
    render(card(unconfigured('t-shirt', SHIRT_SIZES)), { wrapper });
    const coins = screen.getByRole('group', { name: 'With coins' });
    expect(within(coins).getByText('Not on sale yet')).toBeInTheDocument();
    expect(within(coins).queryByText(/^[\d,]+ coins$/)).toBeNull();
    expect(within(coins).queryByLabelText('Size')).toBeNull();
    expect(within(coins).getByRole('button', { name: 'Redeem' })).toBeDisabled();
  });

  it('prices a hoodie in coins, offers the sizes and marks a size with nothing left', () => {
    const onOrder = vi.fn();
    render(card(hoodie, { balance: 12000, onOrder }), { wrapper });
    expect(screen.getByText('10,000 coins')).toBeInTheDocument();
    const size = screen.getByLabelText('Size') as HTMLSelectElement;
    expect(Array.from(size.options).map((one) => one.value)).toEqual([...SHIRT_SIZES]);
    expect(size.value).toBe('S');
    expect(Array.from(size.options).find((one) => one.value === 'XXL')?.disabled).toBe(true);
    fireEvent.change(size, { target: { value: 'L' } });
    fireEvent.click(screen.getByRole('button', { name: 'Redeem' }));
    expect(onOrder).toHaveBeenCalledWith('hoodie', 'L');
  });

  it('starts on a size that is left this month and cannot redeem a size with none', () => {
    const scarce: ShopItem = { ...hoodie, variantStock: SHIRT_SIZES.map((variant) => ({ variant, free: variant === 'L' ? 1 : 0 })) };
    render(card(scarce, { balance: 12000 }), { wrapper });
    const size = screen.getByLabelText('Size') as HTMLSelectElement;
    expect(size.value).toBe('L');
    expect(screen.getByRole('button', { name: 'Redeem' })).toBeEnabled();
    const none: ShopItem = { ...hoodie, variantStock: SHIRT_SIZES.map((variant) => ({ variant, free: 0 })) };
    render(card(none, { balance: 12000 }), { wrapper });
    expect(screen.getAllByRole('button', { name: 'Redeem' })[1]).toBeDisabled();
  });

  it('keeps the shop link open to a free account while Redeem opens the upgrade sheet', () => {
    render(card(hoodie, { premiumLocked: true, productUrl: 'https://devshark.myspreadshop.net/hoodie' }), { wrapper });
    expect(screen.getByRole('link', { name: /Buy at the devShark shop/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redeem' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });
});

describe("Spreadshop's promotion", () => {
  it('names the code and the last day, and says coins never buy a discount', () => {
    render(<MerchPromoNote promo={{ description: '15% off everything', code: 'SHARK15', validUntil: '2026-09-30T23:59:59.000Z' }} />, { wrapper });
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Spreadshop’s offer this month: 15% off everything. Use the code SHARK15 in the devShark shop until 30 September.');
    expect(note).toHaveTextContent('Coins redeem a whole item, never a discount.');
  });

  it('reads without a code when Spreadshop names none', () => {
    render(<MerchPromoNote promo={{ description: 'Free shipping', code: null, validUntil: '2026-10-03T12:00:00.000Z' }} />, { wrapper });
    expect(screen.getByRole('note')).toHaveTextContent('Free shipping. It runs in the devShark shop until 3 October.');
  });
});

describe('the Rewards merchandise section', () => {
  const PREMIUM = { tier: 'premium', source: 'manual', currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
  const shop = {
    enabled: true, cashCheckoutEnabled: false, testMode: false, policyUrl: '',
    items: [hoodie, unconfigured('cap')],
    crown: { available: false, tokenPrice: 1200 },
    protection: { available: false, tokenPrice: 250, cap: 2 },
  };
  const orders = [
    {
      orderId: 'reward-0123456789abcdef01234567', paymentKind: 'tokens', state: 'awaiting_payment', totalMinor: 0,
      currency: 'EUR', tokenTotal: 0, country: 'CZ', carrier: null, trackingRef: null, testMode: false,
      createdAt: '2026-09-24T10:00:00Z', package: true, items: [{ sku: 't-shirt', variant: 'M', quantity: 1 }],
    },
  ];
  const routes = () => server.use(
    http.get('*/api/settings', () => HttpResponse.json({
      coins: DEFAULT_COIN_SETTINGS,
      merchPromo: { description: '15% off everything', code: 'SHARK15', validUntil: '2026-09-30T23:59:59.000Z' },
    })),
    http.get('*/api/user/*', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/referral')) return HttpResponse.json({ enabled: false });
      const op = new URL(request.url).searchParams.get('op');
      if (op === 'entitlement') return HttpResponse.json(PREMIUM);
      if (op === 'wallet') {
        return HttpResponse.json({
          subject: 'webdev', balance: 12000, entries: [], cosmetics: [],
          earn: { rules: DEFAULT_COIN_SETTINGS, progress: null },
        });
      }
      if (op === 'shop') return HttpResponse.json(shop);
      if (op === 'orders') return HttpResponse.json({ orders });
      return undefined;
    }),
  );

  it('shows no shop link or promotion while client/product-catalog.ts has no URL', async () => {
    auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false };
    routes();
    render(<Shop />, { wrapper });
    await screen.findByRole('heading', { level: 3, name: 'Hoodie' });
    expect(screen.queryByRole('link', { name: /devShark shop/ })).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('takes the learner to the address form, says where the address goes, and comes back on cancel', async () => {
    auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false };
    routes();
    render(<Shop />, { wrapper });
    await screen.findByText('12,000');
    const redeem = screen.getAllByRole('button', { name: 'Redeem' }).find((one) => !(one as HTMLButtonElement).disabled)!;
    await waitFor(() => expect(redeem).toBeEnabled());
    fireEvent.click(redeem);
    const title = await screen.findByRole('heading', { name: 'Redeem: Hoodie (S)' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText(/sprd\.net AG, which prints and ships devShark merchandise, receives them/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('autocomplete', 'shipping name');
    expect(screen.getByLabelText('Postcode')).toHaveAttribute('autocomplete', 'shipping postal-code');
    expect(screen.getByLabelText('Address, second line (optional)')).not.toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Redeem' }).find((one) => !(one as HTMLButtonElement).disabled)).toHaveFocus());
  });

  it('calls a claimed learning-path package claimed, not awaiting payment', async () => {
    auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false };
    routes();
    render(<Shop />, { wrapper });
    expect(await screen.findByText('Claimed, waiting to be sent')).toBeInTheDocument();
    expect(screen.queryByText('Awaiting payment')).toBeNull();
  });
});

describe('/dev → Merchandise', () => {
  it('turns a Spreadshop quote into minor units and names the first missing field', async () => {
    const { draftToPricing } = await import('../src/components/dev/DevMerch');
    const draft = {
      priced: true, base: '29.99', print: '0', shipping: '4,90', packaging: '0', retail: '39.99', currency: 'eur',
      taxIncluded: true, coins: '10000', regions: 'cz, sk', vendor: 'sprd.net AG', effectiveFrom: '2026-10-01',
    };
    expect(draftToPricing(draft)).toEqual({
      pricing: {
        unitCostMinor: 2999, printCostMinor: 0, shippingCostMinor: 490, packagingCostMinor: 0, priceMinor: 3999,
        currency: 'EUR', taxIncluded: true, tokenPrice: 10000, regions: ['CZ', 'SK'], vendor: 'sprd.net AG', effectiveFrom: '2026-10-01',
      },
    });
    expect(draftToPricing({ ...draft, shipping: '' })).toEqual({ missing: 'shipping' });
    expect(draftToPricing({ ...draft, regions: 'Czechia' })).toEqual({ missing: 'countries' });
    expect(draftToPricing({ ...draft, coins: '0' })).toEqual({ missing: 'coin price' });
  });

  it('lists a claimed package in the picking list and records the carrier and tracking', async () => {
    const posted: unknown[] = [];
    const order = {
      order_id: 'reward-0123456789abcdef01234567', payment_kind: 'tokens', state: 'awaiting_payment', total_minor: 0,
      currency: 'EUR', token_total: 0, ship_name: 'A Learner', ship_line1: '1 Street', ship_line2: null, ship_city: 'Brno',
      ship_postal: '60200', ship_country: 'CZ', carrier: null, tracking_ref: null, test_mode: false,
      created_at: '2026-09-24T10:00:00Z', package: true,
    };
    server.use(
      http.get('*/api/admin/settings', () => HttpResponse.json({ settings: { merch: { enabled: false, cashCheckoutEnabled: false, testMode: true, pricing: {}, crownTokenPrice: 1200, streakProtectionTokenPrice: 250, policyUrl: '' } } })),
      http.get('*/api/user/*', () => HttpResponse.json({
        orders: [order],
        items: [{ order_id: order.order_id, sku: 't-shirt', variant: 'M', quantity: 1 }, { order_id: order.order_id, sku: 'mug', variant: '', quantity: 1 }],
        stock: [{ sku: 'mug', variant: '', onHand: 5, reserved: 1 }],
      })),
      http.post('*/api/user/*', async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json({ applied: true });
      }),
    );
    const { default: DevMerch } = await import('../src/components/dev/DevMerch');
    render(<DevMerch />, { wrapper });
    const card = await screen.findByRole('article', { name: /Order reward-/ });
    expect(within(card).getByText('Learning-path package')).toBeInTheDocument();
    expect(within(card).getByText('T-shirt · M × 1')).toBeInTheDocument();
    expect(card.querySelector('address')).toHaveTextContent('A Learner1 Street60200 BrnoCZ');
    const ship = within(card).getByRole('button', { name: 'Mark shipped' });
    expect(ship).toBeDisabled();
    fireEvent.change(within(card).getByLabelText('Carrier'), { target: { value: 'DHL' } });
    fireEvent.change(within(card).getByLabelText('Tracking number'), { target: { value: 'JJD000123' } });
    await waitFor(() => expect(ship).toBeEnabled());
    fireEvent.click(ship);
    await waitFor(() => expect(posted).toContainEqual({ orderId: order.order_id, op: 'ship', carrier: 'DHL', trackingRef: 'JJD000123' }));
    // The month's cap for the mug: 5 left to post, 1 held, 4 free.
    const mugRow = (await screen.findByLabelText('Mug')).closest('tr')!;
    expect(within(mugRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(expect.arrayContaining(['1', '4']));
  });
});
