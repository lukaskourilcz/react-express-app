// The wallet, the shop and the orders, as the browser sees them. Product copy
// calls the wallet's unit coins; the API and these types keep `token`.
//
// Every number here is read from the server and none of it is computed locally.
// That is the whole point of the change: a balance that the browser could add
// to was fine when it bought a coloured ring and is not fine when it can buy a
// T-shirt. The client asks; the server decides and records.

import { queryOptions, useQuery } from '@tanstack/react-query';
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

export interface PlaceOrderInput {
  items: { sku: MerchSku; variant: string; quantity: number }[];
  address: ShippingAddress;
  paymentKind: 'tokens' | 'cash';
}

export const cancelOrder = (orderId: string): Promise<{ outcome: string }> =>
  apiFetch(`${USER}?op=orders&id=${encodeURIComponent(orderId)}`, { method: 'DELETE' });

// Shared by the hook and the Rewards page's first-data prefetch
// (lib/routeData.ts). The page's other reads and purchases live in
// lib/rewardsShop.ts, out of the main chunk.
export const walletQuery = queryOptions({ queryKey: rewardKeys.wallet(), queryFn: ({ signal }) => fetchWallet(signal), staleTime: 30_000 });

// `held`: the Rewards page's first-data hold read it (lib/routeData.ts
// HELD_READ), so a failure the hold met draws as the page's error at once
// instead of a loading line that the same error replaces after a retry.
type Held = { held?: boolean };

export function useWallet(enabled: boolean, { held = false }: Held = {}) {
  return useQuery({ ...walletQuery, enabled, retryOnMount: !held });
}
