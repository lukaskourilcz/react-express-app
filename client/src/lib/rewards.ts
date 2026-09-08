// The wallet, the shop and the orders, as the browser sees them.
//
// Every number here is read from the server and none of it is computed locally.
// That is the whole point of the change: a balance that the browser could add
// to was fine when it bought a coloured ring and is not fine when it can buy a
// T-shirt. The client asks; the server decides and records.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { MerchAvailability, MerchSku, ShippingAddress } from '../../../shared/rewards';

const USER = '/api/user/[op]';

export interface WalletEntry {
  eventId: string;
  amount: number;
  reason: string;
  reference: string | null;
  createdAt: string;
}

export interface WalletResponse {
  subject: string;
  balance: number;
  /** The most recent movements, so the balance can be accounted for. */
  entries: WalletEntry[];
  cosmetics: { id: string; equipped: boolean }[];
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
  items: { sku: string; variant: string; quantity: number }[];
}

export const rewardKeys = {
  wallet: () => ['rewards', 'wallet'] as const,
  shop: () => ['rewards', 'shop'] as const,
  orders: () => ['rewards', 'orders'] as const,
};

export const fetchWallet = (signal?: AbortSignal): Promise<WalletResponse> =>
  apiFetch<WalletResponse>(`${USER}?op=wallet`, { signal });

export const claimSignupTokens = (): Promise<{ granted: boolean; balance: number }> =>
  apiFetch<{ granted: boolean; balance: number }>(`${USER}?op=wallet`, { method: 'POST', body: JSON.stringify({}) });

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

export const wearCrown = (equipped: boolean): Promise<{ equipped: boolean }> =>
  apiFetch(`${USER}?op=cosmetic`, {
    method: 'POST',
    body: JSON.stringify({ id: 'crown', op: equipped ? 'equip' : 'unequip' }),
  });

export function useWallet(enabled: boolean) {
  return useQuery({
    queryKey: rewardKeys.wallet(),
    enabled,
    queryFn: ({ signal }) => fetchWallet(signal),
    staleTime: 30_000,
  });
}

export function useShop(enabled = true) {
  return useQuery({
    queryKey: rewardKeys.shop(),
    enabled,
    queryFn: ({ signal }) => fetchShop(signal),
    staleTime: 5 * 60_000,
  });
}

export function useOrders(enabled: boolean) {
  return useQuery({
    queryKey: rewardKeys.orders(),
    enabled,
    queryFn: ({ signal }) => fetchOrders(signal),
    staleTime: 30_000,
  });
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

export function useOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.orders() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.wallet() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.shop() });
    },
  });
}

/** Money, in the currency the server priced it in. Never rounded into a
 * different currency, and never shown at all when nothing was configured. */
export function formatMoney(minor: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
      style: 'currency',
      currency,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
