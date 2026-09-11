/** Rewards: the merchandise catalogue, the crown, and the rules that keep both
 * away from anything a learner earns.
 *
 * Four physical items and one cosmetic. The physical ones are real objects that
 * cost real money to make and post, so this module describes them and refuses
 * to invent the parts nobody has supplied yet. A price, a currency, a shipping
 * region and a stock figure are **configuration**, entered once a supplier has
 * quoted them; until then every item reports `unconfigured` and cannot be
 * ordered by anyone, through any route. There is no placeholder price and no
 * pretend checkout — see `docs/rewards-launch.md` for what has to be obtained.
 *
 * The crown is different: it is an SVG this repository draws, it ships nothing,
 * and it costs tokens alone.
 *
 * The invariant that outranks all of this, and the one bounded exception to it.
 *
 * **Rewards never touch learning.** Buying, owning and equipping change no
 * access, no content, no XP, no score, no rank, no leaderboard position and no
 * prerequisite. The crown is a picture.
 *
 * The exception is **streak protection**, and it is written down here rather
 * than left implicit because it is real. Two protections a month are granted
 * free, and one bridges a missed day so a streak continues instead of resetting
 * — that has been true since migration 024, long before any of it was for sale.
 * Extra protections may now be bought, and four things keep the exception
 * bounded:
 *
 *   * The currency is tokens, earned at 10% of verified XP. No money buys one.
 *     The path is learn more, then protect a streak.
 *   * The ceiling never rises. Buying restores the same two-a-month budget and
 *     never exceeds it, so nobody can hold a deeper reserve than a learner who
 *     spends nothing.
 *   * A protection changes the day count of a streak and nothing else: no XP,
 *     no score, no rank, no badge, no access, no content.
 *   * No leaderboard in this product ranks by streak. Every one of them ranks
 *     by correct answers and accuracy, so a protected streak moves nobody up
 *     anything.
 *
 * And the reverse direction is not an exception at all: finishing a whole
 * learning path earns the merchandise package. A reward *for* learning is not a
 * purchase that affects learning, and it changes no progress. */

/* ── the catalogue ─────────────────────────────────────────────────────── */

export const MERCH_SKUS = ['sticker-set', 'mug', 't-shirt', 'cap'] as const;
export type MerchSku = (typeof MERCH_SKUS)[number];
export const isMerchSku = (value: unknown): value is MerchSku =>
  typeof value === 'string' && (MERCH_SKUS as readonly string[]).includes(value);

/** The one purchasable avatar cosmetic. Not merchandise: nothing is shipped. */
export const COSMETIC_IDS = ['crown'] as const;
export type CosmeticId = (typeof COSMETIC_IDS)[number];
export const isCosmeticId = (value: unknown): value is CosmeticId =>
  typeof value === 'string' && (COSMETIC_IDS as readonly string[]).includes(value);

/** T-shirt sizes. The only variant axis any item has, kept small on purpose:
 * every extra variant is stock somebody has to hold. */
export const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];
export const isShirtSize = (value: unknown): value is ShirtSize =>
  typeof value === 'string' && (SHIRT_SIZES as readonly string[]).includes(value);

export interface MerchItem {
  sku: MerchSku;
  /** Variant values the item accepts, or an empty list when it has none. */
  variants: readonly string[];
  /** Whether ordering it means posting something to an address. */
  shipped: true;
}

export const MERCH_CATALOGUE: readonly MerchItem[] = [
  { sku: 'sticker-set', variants: [], shipped: true },
  { sku: 'mug', variants: [], shipped: true },
  { sku: 't-shirt', variants: SHIRT_SIZES, shipped: true },
  { sku: 'cap', variants: [], shipped: true },
];

export const merchItem = (sku: string): MerchItem | undefined =>
  MERCH_CATALOGUE.find((item) => item.sku === sku);

/* ── what a supplier has to tell us before anything can be sold ────────── */

/**
 * The commercial facts for one item. Every field is owner-entered from a real
 * quote; none of it has a default, because a default here would be a made-up
 * price on a real product.
 */
export interface MerchPricing {
  /** Minor units (cents, haléře) so no float ever holds money. */
  unitCostMinor: number;
  printCostMinor: number;
  shippingCostMinor: number;
  packagingCostMinor: number;
  /** What the learner pays in cash, minor units. */
  priceMinor: number;
  /** ISO 4217. One currency per deployment for now. */
  currency: string;
  /** Whether tax is already inside `priceMinor`. */
  taxIncluded: boolean;
  /** Token price, when the item may also be redeemed with tokens. */
  tokenPrice?: number;
  /** ISO 3166-1 alpha-2 codes this item may be posted to. */
  regions: string[];
  /** Who supplies it, for the audit trail. */
  vendor: string;
  /** ISO date these figures took effect. */
  effectiveFrom: string;
}

export interface MerchSettings {
  /** The whole shop, off until the owner turns it on. Turning it on with any
   * item unconfigured still leaves that item unavailable. */
  enabled: boolean;
  /** Cash checkout, separately gated: token redemption can run without it. */
  cashCheckoutEnabled: boolean;
  /** Visibly marked in the UI when true, so a test order is never mistaken for
   * a real one. */
  testMode: boolean;
  /** Per-SKU commercial facts. A missing entry means unconfigured. */
  pricing: Partial<Record<MerchSku, MerchPricing>>;
  /** Token price of the crown. Cosmetic, so this one may ship with a value. */
  crownTokenPrice: number;
  /** Token price of one streak protection. Consumable and capped at two, so it
   * is priced far below the crown: roughly a fortnight of steady learning
   * rather than a season of it. */
  streakProtectionTokenPrice: number;
  /** Where the returns and delivery policy lives, shown beside every item. */
  policyUrl: string;
}

export const DEFAULT_MERCH_SETTINGS: MerchSettings = {
  enabled: false,
  cashCheckoutEnabled: false,
  testMode: true,
  pricing: {},
  crownTokenPrice: 1200,
  streakProtectionTokenPrice: 250,
  policyUrl: '',
};

/** How many protections a learner may hold at once. Granted monthly, and the
 * ceiling a purchase restores toward but never past. */
export const STREAK_PROTECTION_CAP = 2;

/** Whether extra protections may be bought. Like the crown it needs no
 * supplier, only a price and a wallet to pay it from. */
export const streakProtectionAvailable = (settings: MerchSettings): boolean =>
  settings.streakProtectionTokenPrice > 0;

/* ── availability ──────────────────────────────────────────────────────── */

/**
 * Why an item cannot be ordered, or `available`.
 *
 * `unconfigured` is the honest default and the one the catalogue ships in: we
 * do not know what this costs to make, so we are not going to name a price.
 */
export type MerchAvailability =
  | 'available'
  | 'unconfigured'
  | 'shop_disabled'
  | 'out_of_region'
  | 'out_of_stock';

export function merchAvailability(input: {
  sku: MerchSku;
  settings: MerchSettings;
  /** The learner's region, when known. */
  region?: string | null;
  /** Units free to reserve, when stock is tracked. */
  stock?: number | null;
}): MerchAvailability {
  const pricing = input.settings.pricing[input.sku];
  if (!pricing) return 'unconfigured';
  if (!input.settings.enabled) return 'shop_disabled';
  if (pricing.regions.length === 0) return 'unconfigured';
  if (input.region && !pricing.regions.includes(input.region.toUpperCase())) return 'out_of_region';
  if (input.stock !== undefined && input.stock !== null && input.stock <= 0) return 'out_of_stock';
  return 'available';
}

/** Whether the crown can be bought. Cosmetic, so it needs no supplier — only
 * the wallet the price is paid from. */
export const crownAvailable = (settings: MerchSettings): boolean => settings.crownTokenPrice > 0;

/** The margin a quote implies, in minor units. Negative means the item loses
 * money at that price, which the readiness report shows rather than hides. */
export const merchMarginMinor = (pricing: MerchPricing): number =>
  pricing.priceMinor
  - pricing.unitCostMinor
  - pricing.printCostMinor
  - pricing.shippingCostMinor
  - pricing.packagingCostMinor;

/* ── the wallet ────────────────────────────────────────────────────────── */

/** Why tokens moved. Every ledger entry carries one, and every entry is
 * attributable to something the server itself verified. */
export const TOKEN_REASONS = [
  'signup',
  'verified-xp',
  'purchase',
  'refund',
  'adjustment',
] as const;
export type TokenReason = (typeof TOKEN_REASONS)[number];
export const isTokenReason = (value: unknown): value is TokenReason =>
  typeof value === 'string' && (TOKEN_REASONS as readonly string[]).includes(value);

/** Tokens earned per unit of verified XP. The server applies this to XP it
 * awarded itself; a browser's claim about its own XP is never an input. */
export const TOKENS_PER_XP = 0.1;
export const SIGNUP_TOKEN_GRANT = 200;
export const MAX_TOKEN_BALANCE = 100_000_000;

export const tokensForVerifiedXp = (xp: number): number =>
  Number.isFinite(xp) && xp > 0 ? Math.floor(xp * TOKENS_PER_XP) : 0;

/* ── orders ────────────────────────────────────────────────────────────── */

/** How an order was paid for. */
export const PAYMENT_KINDS = ['tokens', 'cash'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

/**
 * Order states, in the order they occur.
 *
 * `awaiting_payment` exists only for cash: a token order is paid at creation,
 * atomically, or it does not exist. Payment is established by the provider's
 * signed webhook and by nothing else — not a redirect, not a client flag.
 */
export const ORDER_STATES = [
  'awaiting_payment',
  'paid',
  'submitted',
  'shipped',
  'cancelled',
  'refunded',
] as const;
export type OrderState = (typeof ORDER_STATES)[number];
export const isOrderState = (value: unknown): value is OrderState =>
  typeof value === 'string' && (ORDER_STATES as readonly string[]).includes(value);

/** States from which an order may still be cancelled by its owner. */
export const CANCELLABLE_STATES: readonly OrderState[] = ['awaiting_payment', 'paid'];

/** The shipping details an order needs, and nothing beyond them. No phone
 * number, no date of birth, no account of what the learner studied. */
export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export const MAX_ADDRESS_FIELD = 120;

/** Bounds and basic shape only. A real address check belongs to the carrier;
 * this refuses the obviously wrong before anything is charged. */
export function validateAddress(value: unknown): { ok: true; address: ShippingAddress } | { ok: false; field: string } {
  const raw = (value ?? {}) as Record<string, unknown>;
  const text = (key: string, required: boolean): string | null => {
    const candidate = raw[key];
    if (candidate === undefined || candidate === null || candidate === '') return required ? null : '';
    if (typeof candidate !== 'string') return null;
    const trimmed = candidate.trim();
    if (trimmed.length === 0) return required ? null : '';
    if (trimmed.length > MAX_ADDRESS_FIELD) return null;
    return trimmed;
  };
  const name = text('name', true);
  if (name === null) return { ok: false, field: 'name' };
  const line1 = text('line1', true);
  if (line1 === null) return { ok: false, field: 'line1' };
  const line2 = text('line2', false);
  if (line2 === null) return { ok: false, field: 'line2' };
  const city = text('city', true);
  if (city === null) return { ok: false, field: 'city' };
  const postalCode = text('postalCode', true);
  if (postalCode === null) return { ok: false, field: 'postalCode' };
  const country = typeof raw.country === 'string' ? raw.country.trim().toUpperCase() : '';
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, field: 'country' };
  return {
    ok: true,
    address: { name, line1, ...(line2 ? { line2 } : {}), city, postalCode, country },
  };
}
