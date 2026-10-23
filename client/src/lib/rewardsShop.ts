// The Rewards page's reads and purchases. Only the lazy Rewards page uses
// them, so they live apart from lib/rewards.ts, which the main chunk loads for
// the wallet in the header; there they cost every first visit.

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import { rewardKeys, type OrderSummary, type PlaceOrderInput, type ShopResponse } from './rewards';

const USER = '/api/user/[op]';

const fetchShop = (signal?: AbortSignal): Promise<ShopResponse> =>
  apiFetch<ShopResponse>(`${USER}?op=shop`, { signal });

const fetchOrders = (signal?: AbortSignal): Promise<{ orders: OrderSummary[] }> =>
  apiFetch<{ orders: OrderSummary[] }>(`${USER}?op=orders`, { signal });

const placeOrder = (input: PlaceOrderInput): Promise<{
  orderId: string;
  state: string;
  totalMinor: number;
  currency: string | null;
  tokenTotal: number | null;
  testMode: boolean;
}> => apiFetch(`${USER}?op=orders`, { method: 'POST', body: JSON.stringify(input) });

const buyCrown = (): Promise<{ owned: boolean; alreadyOwned: boolean }> =>
  apiFetch(`${USER}?op=cosmetic`, { method: 'POST', body: JSON.stringify({ id: 'crown' }) });

/** Buy one streak protection. At the cap this charges nothing and reports
 * `bought: false` rather than failing — the cap is not an error. */
const buyStreakProtection = (): Promise<{
  bought: boolean; remaining: number; period: string;
}> => apiFetch('/api/user/protection', { method: 'POST' });

const wearCrown = (equipped: boolean): Promise<{ equipped: boolean }> =>
  apiFetch(`${USER}?op=cosmetic`, {
    method: 'POST',
    body: JSON.stringify({ id: 'crown', op: equipped ? 'equip' : 'unequip' }),
  });

// Shared by the hooks and the page's first-data prefetch (lib/routeData.ts).
export const shopQuery = queryOptions({ queryKey: rewardKeys.shop(), queryFn: ({ signal }) => fetchShop(signal), staleTime: 5 * 60_000 });
export const ordersQuery = queryOptions({ queryKey: rewardKeys.orders(), queryFn: ({ signal }) => fetchOrders(signal), staleTime: 30_000 });

// `held`: the Rewards page's first-data hold read it (lib/routeData.ts
// HELD_READ), so a failure the hold met draws as the page's error at once.
type Held = { held?: boolean };

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
