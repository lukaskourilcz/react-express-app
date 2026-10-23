// The wallet, the shop and the orders, as the browser sees them. Product copy
// calls the wallet's unit coins; the API and these types keep `token`.
//
// Every number here is read from the server and none of it is computed locally.
// That is the whole point of the change: a balance that the browser could add
// to was fine when it bought a coloured ring and is not fine when it can buy a
// T-shirt. The client asks; the server decides and records.

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { CoinSettings, MerchAvailability, MerchSku, ShippingAddress } from '../../../shared/rewards';

const USER = '/api/user/[op]';

export interface WalletEntry {
  eventId: string;
  amount: number;
  reason: string;
  reference: string | null;
  createdAt: string;
}

/** "How to earn": the rules as the owner configured them, and the learner's
 * progress toward each milestone (null until migration 041 is installed). */
export interface EarnSummary {
  rules: CoinSettings;
  progress: {
    premium: boolean;
    /** Coins from XP so far today, against `rules.dailyXpCap`. */
    todayXpCoins: number;
    streak: number;
    topics: { id: string; passed: number; total: number }[];
    projects: { id: string; passed: number; total: number }[];
    /** Milestone references already paid: `streak:7`, `topic:html`, … */
    earned: string[];
  } | null;
}

export interface WalletResponse {
  subject: string;
  /** Coins. The API keeps the `token` names of migration 028. */
  balance: number;
  /** The most recent movements, so the balance can be accounted for. */
  entries: WalletEntry[];
  cosmetics: { id: string; equipped: boolean }[];
  /** `granted` is true only on the read that paid the welcome coins. Absent
   * from a server that predates #227. */
  welcome?: { granted: boolean; coins: number };
  earn?: EarnSummary;
}

export interface ShopItem {
  sku: MerchSku;
  variants: readonly string[];
  availability: MerchAvailability;
  /** Null until a real supplier quote has been entered. */
  price: {
    minor: number;
    currency: string;
    taxIncluded: boolean;
    tokenPrice: number | null;
    regions: string[];
  } | null;
  variantStock: { variant: string; free: number }[];
}

export interface ShopResponse {
  enabled: boolean;
  cashCheckoutEnabled: boolean;
  testMode: boolean;
  policyUrl: string;
  items: ShopItem[];
  crown: { available: boolean; tokenPrice: number };
  /** Consumable, capped, and bought with tokens earned by learning. Absent from
   * a deployment whose server predates it. */
  protection?: { available: boolean; tokenPrice: number; cap: number };
}

export interface OrderSummary {
  orderId: string;
  paymentKind: string;
  state: string;
  totalMinor: number | null;
  currency: string | null;
  tokenTotal: number | null;
  country: string;
  carrier: string | null;
  trackingRef: string | null;
  testMode: boolean;
  createdAt: string;
  /** A claimed learning-path package rather than a redemption (#229). Absent
   * from a server that predates it. */
  package?: boolean;
  items: { sku: string; variant: string; quantity: number }[];
}

export const rewardKeys = {
  wallet: () => ['rewards', 'wallet'] as const,
  shop: () => ['rewards', 'shop'] as const,
  orders: () => ['rewards', 'orders'] as const,
};

export const fetchWallet = (signal?: AbortSignal): Promise<WalletResponse> =>
  apiFetch<WalletResponse>(`${USER}?op=wallet`, { signal });

export const fetchShop = (signal?: AbortSignal): Promise<ShopResponse> =>
  apiFetch<ShopResponse>(`${USER}?op=shop`, { signal });

export const fetchOrders = (signal?: AbortSignal): Promise<{ orders: OrderSummary[] }> =>
  apiFetch<{ orders: OrderSummary[] }>(`${USER}?op=orders`, { signal });

export interface PlaceOrderInput {
  items: { sku: MerchSku; variant: string; quantity: number }[];
  address: ShippingAddress;
  paymentKind: 'tokens' | 'cash';
}

export const placeOrder = (input: PlaceOrderInput): Promise<{
  orderId: string;
  state: string;
  totalMinor: number;
  currency: string | null;
  tokenTotal: number | null;
  testMode: boolean;
}> => apiFetch(`${USER}?op=orders`, { method: 'POST', body: JSON.stringify(input) });

export const cancelOrder = (orderId: string): Promise<{ outcome: string }> =>
  apiFetch(`${USER}?op=orders&id=${encodeURIComponent(orderId)}`, { method: 'DELETE' });

export const buyCrown = (): Promise<{ owned: boolean; alreadyOwned: boolean }> =>
  apiFetch(`${USER}?op=cosmetic`, { method: 'POST', body: JSON.stringify({ id: 'crown' }) });

/** Buy one streak protection. At the cap this charges nothing and reports
 * `bought: false` rather than failing — the cap is not an error. */
export const buyStreakProtection = (): Promise<{
  bought: boolean; remaining: number; period: string;
}> => apiFetch('/api/user/protection', { method: 'POST' });

export const wearCrown = (equipped: boolean): Promise<{ equipped: boolean }> =>
  apiFetch(`${USER}?op=cosmetic`, {
    method: 'POST',
    body: JSON.stringify({ id: 'crown', op: equipped ? 'equip' : 'unequip' }),
  });

// One set of options per read, shared by the hooks and a page's first-data
// prefetch (lib/routeData.ts).
export const walletQuery = queryOptions({ queryKey: rewardKeys.wallet(), queryFn: ({ signal }) => fetchWallet(signal), staleTime: 30_000 });
export const shopQuery = queryOptions({ queryKey: rewardKeys.shop(), queryFn: ({ signal }) => fetchShop(signal), staleTime: 5 * 60_000 });
export const ordersQuery = queryOptions({ queryKey: rewardKeys.orders(), queryFn: ({ signal }) => fetchOrders(signal), staleTime: 30_000 });

// `held`: the Rewards page's first-data hold read it (lib/routeData.ts
// HELD_READ), so a failure the hold met draws as the page's error at once
// instead of a loading line that the same error replaces after a retry.
type Held = { held?: boolean };

export function useWallet(enabled: boolean, { held = false }: Held = {}) {
  return useQuery({ ...walletQuery, enabled, retryOnMount: !held });
}

export function useShop(enabled = true, { held = false }: Held = {}) {
  return useQuery({ ...shopQuery, enabled, retryOnMount: !held });
}

export function useOrders(enabled: boolean, { held = false }: Held = {}) {
  return useQuery({ ...ordersQuery, enabled, retryOnMount: !held });
}

/** Buying or wearing the crown; both invalidate the wallet, because both change
 * what it holds or what it says the learner owns. */
export function useCosmeticMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ owned?: boolean; alreadyOwned?: boolean; equipped?: boolean }, Error, { op: 'buy' | 'equip' | 'unequip' }>({
    mutationFn: async (input) =>
      input.op === 'buy' ? await buyCrown() : await wearCrown(input.op === 'equip'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rewardKeys.wallet() }),
  });
}

/** Buying a protection changes the wallet and the streak budget, so both are
 * refetched — the profile's shield reads the second one. The purchase stays
 * pending until the re-reads land, as the crown's does: settled earlier, Buy
 * came back beside the balance from before the purchase. */
export function useProtectionMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ bought: boolean; remaining: number; period: string }, Error, void>({
    mutationFn: () => buyStreakProtection(),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: rewardKeys.wallet() }),
      queryClient.invalidateQueries({ queryKey: ['streak-protection'] }),
    ]),
  });
}

/** A redemption changes the orders, the wallet and the stock; it stays
 * pending until all three are read again. */
export function useOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: rewardKeys.orders() }),
      queryClient.invalidateQueries({ queryKey: rewardKeys.wallet() }),
      queryClient.invalidateQueries({ queryKey: rewardKeys.shop() }),
    ]),
  });
}

/** Money, in the currency the server priced it in. Never rounded into a
 * different currency, and never shown at all when nothing was configured. */
export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
