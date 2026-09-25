/** Billing configuration, read from the server environment on every call.
 *
 *   BILLING_ENABLED               'true' opens checkout; anything else hides it
 *   STRIPE_SECRET_KEY             sk_live_… or sk_test_… (server only)
 *   STRIPE_WEBHOOK_SECRET         whsec_… of the endpoint /api/user/billing-webhook
 *   STRIPE_PRICE_PREMIUM_MONTHLY  price_… (3.99 EUR, tax_behavior inclusive)
 *   STRIPE_PRICE_PREMIUM_ANNUAL   price_… (39.99 EUR, tax_behavior inclusive)
 *   STRIPE_MANAGED_PAYMENTS       'true' (Stripe as merchant of record) or
 *                                 'false' (plain Stripe with Stripe Tax)
 *   PUBLIC_ORIGIN                 where Stripe sends the buyer back; defaults
 *                                 to the canonical origin below
 *   RESEND_API_KEY, RESEND_FROM   optional cancellation emails
 *
 * Two switches, on purpose. `checkoutEnabled` needs BILLING_ENABLED and every
 * value; it is the only thing that sells Premium. `connected` needs only the
 * secret key: the portal, the webhook and the public cancellation page keep
 * working for people who already pay after the owner turns sales off. */

export const BILLING_PLANS = ['monthly', 'annual'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

/** The canonical origin. Matches PUBLIC_ORIGIN in client/src/lib/publicMetadata.ts
 * (a launch contract compares the two). */
export const DEFAULT_PUBLIC_ORIGIN = 'https://devshark.app';

export interface BillingConfig {
  /** Checkout may sell Premium: BILLING_ENABLED=true and nothing is missing. */
  checkoutEnabled: boolean;
  /** A Stripe secret key is present, so existing subscriptions can be managed. */
  connected: boolean;
  secretKey: string | null;
  webhookSecret: string | null;
  prices: Record<BillingPlan, string | null>;
  /** Managed Payments (merchant of record) or plain Stripe with Stripe Tax. */
  managedPayments: boolean;
  origin: string;
  /** The variables checkout still needs, for the operator's log. */
  missing: string[];
  email: { apiKey: string; from: string } | null;
}

type Env = Record<string, string | undefined>;

const value = (env: Env, name: string): string | null => {
  const raw = env[name]?.trim();
  return raw ? raw : null;
};

/** An https origin, or http on localhost for development. Anything else falls
 * back to the canonical origin rather than sending buyers somewhere odd. */
export function parseOrigin(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_PUBLIC_ORIGIN;
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return url.origin;
  } catch {
    // fall through
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

export function billingConfig(env: Env = process.env): BillingConfig {
  const secretKey = value(env, 'STRIPE_SECRET_KEY');
  const webhookSecret = value(env, 'STRIPE_WEBHOOK_SECRET');
  const prices = {
    monthly: value(env, 'STRIPE_PRICE_PREMIUM_MONTHLY'),
    annual: value(env, 'STRIPE_PRICE_PREMIUM_ANNUAL'),
  };
  const managedRaw = value(env, 'STRIPE_MANAGED_PAYMENTS');
  const missing: string[] = [];
  if (!secretKey) missing.push('STRIPE_SECRET_KEY');
  if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
  if (!prices.monthly) missing.push('STRIPE_PRICE_PREMIUM_MONTHLY');
  if (!prices.annual) missing.push('STRIPE_PRICE_PREMIUM_ANNUAL');
  // No default: Managed Payments needs Stripe's approval first, and plain
  // Stripe makes the owner the taxable person. The owner says which.
  if (managedRaw !== 'true' && managedRaw !== 'false') missing.push('STRIPE_MANAGED_PAYMENTS');
  const resendKey = value(env, 'RESEND_API_KEY');
  return {
    checkoutEnabled: env.BILLING_ENABLED === 'true' && missing.length === 0,
    connected: Boolean(secretKey),
    secretKey,
    webhookSecret,
    prices,
    managedPayments: managedRaw === 'true',
    origin: parseOrigin(value(env, 'PUBLIC_ORIGIN')),
    missing,
    email: resendKey ? { apiKey: resendKey, from: value(env, 'RESEND_FROM') ?? 'devShark <billing@devshark.app>' } : null,
  };
}

/** What the browser may know, through the public settings route. */
export function publicBillingSettings(env: Env = process.env): { enabled: boolean; cancellable: boolean } {
  const config = billingConfig(env);
  return { enabled: config.checkoutEnabled, cancellable: config.connected };
}
