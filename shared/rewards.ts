/** The auditable server wallet and the order model (issues #168, #170).
 *
 * Tokens are earned from verified activity and nothing else. Every credit
 * carries the receipt of the event that produced it, so the balance can be
 * recomputed from the ledger at any time and a replayed sync is a no-op. The
 * browser never asserts a balance: it reads one.
 *
 * A legacy local balance is reported for what it is — an unverified number from
 * a device — and is never converted into redeemable value.
 */

/** A verified XP award is worth this share of its XP in tokens. */
export const TOKENS_PER_XP = 0.1;
/** One grant per account, on the first wallet sync after registration. */
export const REGISTRATION_GRANT = 200;
export const MAX_WALLET_BALANCE = 100_000_000;

export type WalletReason = 'signup' | 'activity' | 'redemption' | 'refund' | 'adjustment';

export interface WalletEntry {
  entryId: string;
  delta: number;
  reason: WalletReason;
  /** The verified event this entry came from. Unique per wallet. */
  receiptId: string;
  createdAt: string;
}

export interface WalletState {
  subject: string;
  balance: number;
  updatedAt: string | null;
  /** The most recent entries, newest first. */
  entries: WalletEntry[];
}

export interface WalletResponse {
  wallet: WalletState;
  /**
   * What the old device-local wallet held, reported so the learner is not left
   * wondering where it went. It is never credited: an unverified number is not
   * evidence of anything, and converting it would mint value from a browser.
   */
  legacy: { reported: number | null; converted: false };
}

/* ── orders ─────────────────────────────────────────────────────────────── */

export type OrderPayment = 'tokens' | 'cash';

export type OrderStatus =
  /** Stock reserved, waiting for payment (cash) or already paid (tokens). */
  | 'pending'
  | 'paid'
  | 'fulfilling'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending', 'paid', 'fulfilling', 'shipped', 'delivered', 'cancelled', 'refunded',
];

/** The smallest set of shipping details that can get a parcel to a person. */
export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export interface OrderLine {
  sku: string;
  variantId: string | null;
  quantity: number;
  /** Unit price at the moment the order was placed, in minor units. */
  unitCashMinor: number | null;
  unitTokens: number | null;
}

export interface Order {
  orderId: string;
  status: OrderStatus;
  payment: OrderPayment;
  currency: string | null;
  /** Server-computed totals. The browser never sends a total. */
  totalCashMinor: number | null;
  totalTokens: number | null;
  lines: OrderLine[];
  /** Present for the owner and for an admin; absent everywhere else. */
  address: ShippingAddress | null;
  trackingCarrier: string | null;
  trackingCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  sku: string;
  variantId?: string | null;
  quantity: number;
  payment: OrderPayment;
  address?: ShippingAddress;
  /** Retrying with the same key must not create a second order or debit twice. */
  idempotencyKey: string;
}

export interface OrdersResponse {
  orders: Order[];
}

export const MAX_ORDER_QUANTITY = 3;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** Validate an address without pretending to know every country's format. */
export function validateAddress(raw: unknown): { address: ShippingAddress } | { errors: string[] } {
  const errors: string[] = [];
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (key: string, max: number, required = true): string => {
    const one = typeof value[key] === 'string' ? (value[key] as string).trim() : '';
    if (required && one.length === 0) errors.push(`${key}_required`);
    if (one.length > max) errors.push(`${key}_too_long`);
    return one;
  };
  const name = text('name', 120);
  const line1 = text('line1', 160);
  const line2 = text('line2', 160, false);
  const city = text('city', 100);
  const postcode = text('postcode', 20);
  const country = (typeof value.country === 'string' ? value.country : '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) errors.push('country_invalid');
  if (errors.length > 0) return { errors };
  return { address: { name, line1, ...(line2 ? { line2 } : {}), city, postcode, country } };
}

/** Which transitions the order service will make. Anything else is refused. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['fulfilling', 'cancelled', 'refunded'],
  fulfilling: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  ORDER_TRANSITIONS[from].includes(to);

/**
 * Which of those a learner may make themselves. The order service will still
 * cancel an order that is already being packed — an operator has to be able to
 * stop a parcel — but the learner cannot, because by then someone has printed
 * a label against it. They ask support instead.
 */
export const LEARNER_CANCELLABLE: readonly OrderStatus[] = ['pending', 'paid'];

export const learnerMayCancel = (status: OrderStatus): boolean =>
  LEARNER_CANCELLABLE.includes(status);
