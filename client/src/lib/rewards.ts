// The server-owned wallet, shop catalogue, orders and cosmetics
// (issues #168, #169, #170, #173).
//
// Everything valuable is read from the server, never asserted by the browser:
// the balance comes from the ledger, prices and availability come from the
// server's own configuration, and totals are computed there. The old local
// wallet is reported alongside as unverified so a learner is not left
// wondering where it went, and it is never converted into anything spendable.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import { getTokens } from './tokens';
import { CURRENT_PRODUCT } from './products';
import type { ShopCatalogResponse } from '../../../shared/merchandise';
import type { CreateOrderRequest, OrdersResponse, WalletResponse } from '../../../shared/rewards';

const USER = '/api/user/[op]';

export const rewardKeys = {
  wallet: () => ['rewards', 'wallet'] as const,
  catalog: () => ['rewards', 'catalog'] as const,
  orders: () => ['rewards', 'orders'] as const,
  cosmetics: () => ['rewards', 'cosmetics'] as const,
};

export interface CosmeticsResponse {
  owned: { sku: string; equipped: boolean; acquiredAt: string }[];
  equipped: string | null;
}

export function useWallet(enabled: boolean) {
  return useQuery({
    queryKey: rewardKeys.wallet(),
    enabled,
    // The legacy local number rides along so the server can report it back
    // unchanged; it is never treated as evidence of a balance.
    queryFn: ({ signal }) => apiFetch<WalletResponse>(`${USER}?op=wallet&legacy=${getTokens()}`, { signal }),
    staleTime: 30_000,
  });
}

export function useShopCatalog(enabled: boolean) {
  return useQuery({
    queryKey: rewardKeys.catalog(),
    enabled,
    queryFn: ({ signal }) => apiFetch<ShopCatalogResponse>(`${USER}?op=shop-catalog`, { signal }),
    staleTime: 60_000,
  });
}

export function useOrders(enabled: boolean) {
  return useQuery({
    queryKey: rewardKeys.orders(),
    enabled,
    queryFn: ({ signal }) => apiFetch<OrdersResponse>(`${USER}?op=orders`, { signal }),
    staleTime: 15_000,
  });
}

export function useCosmetics(enabled: boolean) {
  return useQuery({
    queryKey: rewardKeys.cosmetics(),
    enabled,
    queryFn: ({ signal }) => apiFetch<CosmeticsResponse>(`${USER}?op=cosmetic`, { signal }),
    staleTime: 60_000,
  });
}

/** A key that survives a retry, so a double click cannot buy twice. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderRequest) =>
      apiFetch<{ orderId: string; status: string; created: boolean }>(`${USER}?op=orders`, {
        method: 'POST',
        body: JSON.stringify({ action: 'create', ...input }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.wallet() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.orders() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.catalog() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.cosmetics() });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<{ orderId: string; status: string }>(`${USER}?op=orders`, {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel', orderId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.wallet() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.orders() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.catalog() });
    },
  });
}

export function useEquipCosmetic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sku: string; equip: boolean }) =>
      apiFetch<{ equipped: string | null }>(`${USER}?op=cosmetic`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (result) => queryClient.setQueryData(rewardKeys.cosmetics(), (previous: CosmeticsResponse | undefined) =>
      previous
        ? { ...previous, equipped: result.equipped, owned: previous.owned.map((one) => ({ ...one, equipped: one.sku === result.equipped })) }
        : previous),
  });
}

/** The shop and the wallet exist on devShark only. */
export const rewardsAvailable = (): boolean => CURRENT_PRODUCT.id === 'devshark';

/** Does this learner wear the crown? Used by every avatar placement. */
export function useCrownEquipped(enabled: boolean): boolean {
  const cosmetics = useCosmetics(enabled && rewardsAvailable());
  return cosmetics.data?.equipped === 'crown';
}

/** Format a cash price the server sent, in the currency the server named. */
export function formatCash(minor: number | null, currency: string | null, locale: string): string | null {
  if (minor === null || !currency) return null;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
