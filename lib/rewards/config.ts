/** Commercial configuration for the shop (issues #167, #171).
 *
 * Everything here comes from the environment, and nothing has a made-up
 * default. Until the owner supplies a quote, a currency, a region list, stock
 * and a supplier for an item, that item is unavailable and the shop says which
 * piece is missing. The same rule holds for payments: without a configured
 * provider and its keys, checkout is off, and a provider in test mode is
 * labelled as such wherever a learner can see it.
 *
 * Set REWARDS_PRICING to a JSON object keyed by SKU, e.g.
 *   {"mug":{"currency":"CZK","cashMinor":39000,"tokens":1800,
 *           "regions":["CZ","SK"],"stock":50,"supplier":"<name>",
 *           "effectiveFrom":"2026-10-01"}}
 * Every field is optional; a missing one becomes a stated blocker rather than
 * an assumption.
 */

import { MERCH_SKUS, isMerchSku, type MerchPricing, type MerchSku } from '../../shared/merchandise';

const asInt = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;

const asRegions = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((one): one is string => typeof one === 'string' && /^[A-Za-z]{2}$/.test(one)).map((one) => one.toUpperCase()))).slice(0, 64)
    : [];

function parsePricing(raw: unknown, sku: MerchSku): MerchPricing {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const currency = typeof value.currency === 'string' && /^[A-Za-z]{3}$/.test(value.currency)
    ? value.currency.toUpperCase()
    : null;
  return {
    sku,
    currency,
    cashMinor: asInt(value.cashMinor, 10_000_000),
    tokens: asInt(value.tokens, 1_000_000),
    regions: asRegions(value.regions),
    stock: asInt(value.stock, 1_000_000),
    supplier: typeof value.supplier === 'string' && value.supplier.trim().length > 0 ? value.supplier.trim().slice(0, 120) : null,
    effectiveFrom: typeof value.effectiveFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.effectiveFrom) ? value.effectiveFrom : null,
  };
}

let cached: Record<MerchSku, MerchPricing> | null = null;

/** The configured pricing per SKU. Unconfigured items get an all-null record. */
export function merchPricing(): Record<MerchSku, MerchPricing> {
  if (cached) return cached;
  let parsed: Record<string, unknown> = {};
  const raw = process.env.REWARDS_PRICING;
  if (raw) {
    try {
      const value = JSON.parse(raw) as unknown;
      if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>;
    } catch {
      // A malformed configuration is treated as no configuration: the shop
      // stays closed rather than guessing what the owner meant.
      parsed = {};
    }
  }
  const out = {} as Record<MerchSku, MerchPricing>;
  for (const sku of MERCH_SKUS) out[sku] = parsePricing(isMerchSku(sku) ? parsed[sku] : undefined, sku);
  cached = out;
  return out;
}

/** Test hook: forget the parsed configuration. */
export const resetMerchPricingCache = (): void => { cached = null; };

export interface PaymentConfig {
  provider: string | null;
  publishableKey: string | null;
  /** Server-only. Never leaves this module. */
  secretKey: string | null;
  webhookSecret: string | null;
  /** True while the configured provider is running in its test mode. */
  testMode: boolean;
}

/**
 * The payment provider, from the environment. A provider counts as configured
 * only when it has both a secret key and a webhook secret: without the webhook
 * secret there is no way to verify that a payment happened, and a redirect is
 * not evidence.
 */
export function paymentConfig(): PaymentConfig {
  const provider = process.env.REWARDS_PAYMENT_PROVIDER?.trim() || null;
  const secretKey = process.env.REWARDS_PAYMENT_SECRET_KEY?.trim() || null;
  const webhookSecret = process.env.REWARDS_PAYMENT_WEBHOOK_SECRET?.trim() || null;
  const publishableKey = process.env.REWARDS_PAYMENT_PUBLISHABLE_KEY?.trim() || null;
  const testMode = (process.env.REWARDS_PAYMENT_MODE?.trim() || 'test') !== 'live';
  return { provider, publishableKey, secretKey, webhookSecret, testMode };
}

export const isPaymentConfigured = (config: PaymentConfig = paymentConfig()): boolean =>
  Boolean(config.provider && config.secretKey && config.webhookSecret);

/**
 * Live charging needs one more thing than a working integration: the owner has
 * to say so. Until REWARDS_PAYMENT_MODE is `live`, checkout runs against the
 * provider's test mode and every surface says so.
 */
export const isLiveCharging = (config: PaymentConfig = paymentConfig()): boolean =>
  isPaymentConfigured(config) && !config.testMode;
