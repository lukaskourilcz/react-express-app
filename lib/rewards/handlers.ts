/** The wallet, the shop and the crown. Mounted as `op=` branches on
 * `api/user/[op].ts`, so the twelve-function budget is unchanged.
 *
 * Everything valuable is decided here and recorded in the ledger of migration
 * 028. A browser can ask for a balance, ask to spend one and ask what an order
 * costs; it can never assert any of the three. In particular:
 *
 *   - balances come from `token_balances`, written only by the ledger routines;
 *   - prices come from the owner's configuration, never from the request;
 *   - payment is established by the provider's signed webhook, never by a
 *     redirect the browser followed or a flag it set;
 *   - an unconfigured item cannot be ordered by anyone, through any route,
 *     regardless of what the shop UI happens to be showing.
 *
 * None of it touches learning. A balance buys a picture or a mug. */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import { isRpcMissing, jsonError, createLogger, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { getGameSettings } from '../settings-store';
import { requireAdmin } from '../admin-auth';
import { deploymentSubjectIds } from '../product-scope';
import { isScopeSubject } from '../../shared/subject-catalog';
import {
  crownAvailable,
  streakProtectionAvailable,
  STREAK_PROTECTION_CAP,
  isMerchSku,
  isShirtSize,
  merchAvailability,
  merchItem,
  merchMarginMinor,
  validateAddress,
  type MerchAvailability,
  type MerchSku,
} from '../../shared/rewards';

const logEvent = createLogger('rewards');

const newId = (): string => randomBytes(24).toString('base64url').slice(0, 32);
const migrationRequired = (res: VercelResponse) =>
  jsonError(res, 503, 'migration_required', 'Rewards migration 028 is not installed');

/** The subject a wallet belongs to. Wallets are per subject, as they have
 * always been; the deployment decides which one a request may touch. */
function walletSubject(req: VercelRequest): string | null {
  const raw = typeof req.query.subject === 'string' ? req.query.subject : (req.body as { subject?: unknown } | null)?.subject;
  const allowed = deploymentSubjectIds();
  if (typeof raw === 'string' && isScopeSubject(raw) && allowed.includes(raw)) return raw;
  return allowed[0] ?? null;
}

/* ── GET/POST ?op=wallet ───────────────────────────────────────────────── */

/**
 * The balance, the recent ledger entries behind it, and what the learner owns.
 *
 * The entries are the point: a wallet whose owner cannot see why it holds what
 * it holds is the thing this replaced.
 */
export async function handleWallet(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');
  const subject = walletSubject(req);
  if (!subject) return jsonError(res, 400, 'bad_request', 'Unknown subject');

  if (req.method === 'GET') {
    const [balance, entries, cosmetics] = await Promise.all([
      withTimeout(supabase.from('token_balances').select('balance').eq('user_id', userId).eq('subject', subject).maybeSingle()),
      withTimeout(
        supabase.from('token_ledger').select('event_id,amount,reason,reference,created_at')
          .eq('user_id', userId).eq('subject', subject).order('created_at', { ascending: false }).limit(25),
      ),
      withTimeout(supabase.from('cosmetic_entitlements').select('cosmetic_id,equipped').eq('user_id', userId)),
    ]);
    if (balance.error && isRpcMissing(balance.error)) return migrationRequired(res);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      subject,
      balance: Number(balance.data?.balance ?? 0),
      entries: (entries.data ?? []).map((row) => ({
        eventId: String(row.event_id),
        amount: Number(row.amount),
        reason: String(row.reason),
        reference: row.reference == null ? null : String(row.reference),
        createdAt: String(row.created_at),
      })),
      cosmetics: (cosmetics.data ?? []).map((row) => ({
        id: String(row.cosmetic_id),
        equipped: row.equipped === true,
      })),
    });
  }

  // POST claims the one-time sign-up grant. Idempotent by construction: the
  // ledger event id is derived from the account, so a second device grants
  // nothing. There is no user_metadata flag to forge.
  if (req.method === 'POST') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const { SIGNUP_TOKEN_GRANT } = await import('../../shared/rewards');
    const granted = await withTimeout(
      supabase.rpc('grant_signup_tokens', { p_user_id: userId, p_subject: subject, p_amount: SIGNUP_TOKEN_GRANT }),
    );
    if (granted.error) {
      if (isRpcMissing(granted.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not grant the sign-up tokens');
    }
    const balance = await withTimeout(
      supabase.from('token_balances').select('balance').eq('user_id', userId).eq('subject', subject).maybeSingle(),
    );
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ granted: granted.data === true, balance: Number(balance.data?.balance ?? 0) });
  }

  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/**
 * Credit tokens for XP the server itself awarded.
 *
 * Called from the paths that record verified XP, with that award's own id as
 * the ledger event. The browser is not involved and cannot be: it never sees
 * an award id it did not receive from a completed, server-graded activity, and
 * replaying one credits nothing.
 */
export async function creditVerifiedXp(
  supabase: SupabaseClient,
  input: { userId: string; awardId: string; subject: string; xp: number },
): Promise<void> {
  const { tokensForVerifiedXp } = await import('../../shared/rewards');
  const amount = tokensForVerifiedXp(input.xp);
  if (amount <= 0) return;
  const credited = await withTimeout(
    supabase.rpc('credit_tokens', {
      p_user_id: input.userId,
      p_event_id: `xp:${input.awardId}`,
      p_subject: input.subject,
      p_amount: amount,
      p_reason: 'verified-xp',
      p_reference: input.awardId,
    }),
  );
  // A missing migration must never fail the learning it rode along with.
  if (credited.error && !isRpcMissing(credited.error)) {
    logEvent({ status: 500, kind: 'credit_failed', reason: credited.error.code ?? 'unknown' });
  }
}

/* ── GET ?op=shop ──────────────────────────────────────────────────────── */

/** The catalogue as this deployment can actually sell it: every item with its
 * availability, and a price only where one has been configured. */
export async function handleShopCatalogue(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const settings = await getGameSettings();
  const merch = settings.merch;
  const region = typeof req.query.region === 'string' ? req.query.region.toUpperCase() : null;

  const stockRows = supabase
    ? await withTimeout(supabase.from('merch_stock').select('sku,variant,on_hand,reserved'))
    : { data: [], error: null };
  const freeStock = new Map<string, number>();
  for (const row of (stockRows.data ?? []) as { sku: string; variant: string; on_hand: number; reserved: number }[]) {
    freeStock.set(`${row.sku}|${row.variant}`, Math.max(0, Number(row.on_hand) - Number(row.reserved)));
  }

  const { MERCH_CATALOGUE } = await import('../../shared/rewards');
  const items = MERCH_CATALOGUE.map((item) => {
    const pricing = merch.pricing[item.sku];
    const variants = item.variants.length > 0 ? item.variants : [''];
    const stock = variants.reduce((total, variant) => total + (freeStock.get(`${item.sku}|${variant}`) ?? 0), 0);
    const availability: MerchAvailability = merchAvailability({
      sku: item.sku,
      settings: merch,
      region,
      stock: stockRows.data ? stock : null,
    });
    return {
      sku: item.sku,
      variants: item.variants,
      availability,
      // A price is published only when a real quote produced it.
      price: pricing
        ? {
            minor: pricing.priceMinor,
            currency: pricing.currency,
            taxIncluded: pricing.taxIncluded,
            tokenPrice: pricing.tokenPrice ?? null,
            regions: pricing.regions,
          }
        : null,
      variantStock: variants.map((variant) => ({ variant, free: freeStock.get(`${item.sku}|${variant}`) ?? 0 })),
    };
  });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    enabled: merch.enabled,
    cashCheckoutEnabled: merch.cashCheckoutEnabled,
    testMode: merch.testMode,
    policyUrl: merch.policyUrl,
    items,
    crown: { available: crownAvailable(merch), tokenPrice: merch.crownTokenPrice },
    // Consumable rather than owned, so the shop shows a cap and a balance
    // instead of an owned/not-owned state.
    protection: {
      available: streakProtectionAvailable(merch),
      tokenPrice: merch.streakProtectionTokenPrice,
      cap: STREAK_PROTECTION_CAP,
    },
  });
}

/* ── GET/POST/DELETE ?op=orders ────────────────────────────────────────── */

interface RequestedLine {
  sku: MerchSku;
  variant: string;
  quantity: number;
}

function parseLines(raw: unknown): RequestedLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) return null;
  const lines: RequestedLine[] = [];
  for (const entry of raw) {
    const row = (entry ?? {}) as Record<string, unknown>;
    if (!isMerchSku(row.sku)) return null;
    const item = merchItem(row.sku)!;
    const variant = typeof row.variant === 'string' ? row.variant : '';
    if (item.variants.length > 0) {
      if (!isShirtSize(variant)) return null;
    } else if (variant !== '') return null;
    const quantity = Number(row.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) return null;
    lines.push({ sku: row.sku, variant, quantity });
  }
  return lines;
}

export async function handleOrders(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  if (req.method === 'GET') {
    const orders = await withTimeout(
      supabase.from('merch_orders')
        .select('order_id,payment_kind,state,total_minor,currency,token_total,ship_country,carrier,tracking_ref,test_mode,created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    );
    if (orders.error) {
      if (isRpcMissing(orders.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not load your orders');
    }
    const ids = (orders.data ?? []).map((row) => String(row.order_id));
    const items = ids.length
      ? await withTimeout(supabase.from('merch_order_items').select('order_id,sku,variant,quantity').in('order_id', ids))
      : { data: [], error: null };
    const byOrder = new Map<string, { sku: string; variant: string; quantity: number }[]>();
    for (const row of (items.data ?? []) as { order_id: string; sku: string; variant: string; quantity: number }[]) {
      const list = byOrder.get(row.order_id) ?? [];
      list.push({ sku: row.sku, variant: row.variant, quantity: Number(row.quantity) });
      byOrder.set(row.order_id, list);
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      orders: (orders.data ?? []).map((row) => ({
        orderId: String(row.order_id),
        paymentKind: String(row.payment_kind),
        state: String(row.state),
        totalMinor: row.total_minor == null ? null : Number(row.total_minor),
        currency: row.currency == null ? null : String(row.currency),
        tokenTotal: row.token_total == null ? null : Number(row.token_total),
        country: String(row.ship_country),
        carrier: row.carrier == null ? null : String(row.carrier),
        trackingRef: row.tracking_ref == null ? null : String(row.tracking_ref),
        testMode: row.test_mode === true,
        createdAt: String(row.created_at),
        items: byOrder.get(String(row.order_id)) ?? [],
      })),
    });
  }

  if (req.method === 'POST') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const settings = await getGameSettings();
    const merch = settings.merch;
    if (!merch.enabled) return jsonError(res, 409, 'shop_disabled', 'The shop is not open');

    const body = (req.body || {}) as Record<string, unknown>;
    const lines = parseLines(body.items);
    if (!lines) return jsonError(res, 400, 'bad_request', 'Choose between one and ten valid items');
    const address = validateAddress(body.address);
    if (!address.ok) return jsonError(res, 400, 'bad_address', `Check the ${address.field} on your address`);
    const paymentKind = body.paymentKind === 'cash' ? 'cash' : 'tokens';
    if (paymentKind === 'cash' && !merch.cashCheckoutEnabled) {
      return jsonError(res, 409, 'checkout_unavailable', 'Paying with money is not configured yet');
    }
    const subject = walletSubject(req);
    if (!subject) return jsonError(res, 400, 'bad_request', 'Unknown subject');

    // The server prices the order from its own configuration. Anything the
    // request said about money is ignored, not validated.
    let totalMinor = 0;
    let tokenTotal = 0;
    let currency: string | null = null;
    const priced: Record<string, unknown>[] = [];
    for (const line of lines) {
      const pricing = merch.pricing[line.sku];
      if (!pricing) return jsonError(res, 409, 'unconfigured', 'That item is not on sale yet');
      if (!pricing.regions.includes(address.address.country)) {
        return jsonError(res, 409, 'out_of_region', 'That item cannot be posted to your country yet');
      }
      if (currency === null) currency = pricing.currency;
      else if (currency !== pricing.currency) {
        return jsonError(res, 409, 'mixed_currency', 'Those items are priced in different currencies');
      }
      if (paymentKind === 'tokens' && !pricing.tokenPrice) {
        return jsonError(res, 409, 'tokens_unavailable', 'That item cannot be redeemed with tokens');
      }
      totalMinor += pricing.priceMinor * line.quantity;
      tokenTotal += (pricing.tokenPrice ?? 0) * line.quantity;
      priced.push({
        sku: line.sku,
        variant: line.variant,
        quantity: line.quantity,
        unitMinor: pricing.priceMinor,
        unitTokens: pricing.tokenPrice ?? null,
      });
    }

    const orderId = newId();
    const created = await withTimeout(
      supabase.rpc('create_merch_order', {
        p_order_id: orderId,
        p_user_id: userId,
        p_payment_kind: paymentKind,
        p_items: priced,
        p_total_minor: totalMinor,
        p_currency: currency,
        p_token_total: paymentKind === 'tokens' ? tokenTotal : null,
        p_subject: subject,
        p_ship: address.address,
        p_test_mode: merch.testMode,
      }),
    );
    if (created.error) {
      if (isRpcMissing(created.error)) return migrationRequired(res);
      const message = created.error.message ?? '';
      if (/out_of_stock/i.test(message)) return jsonError(res, 409, 'out_of_stock', 'That is out of stock');
      if (/insufficient_tokens/i.test(message)) return jsonError(res, 409, 'insufficient_tokens', 'You do not have enough tokens');
      return jsonError(res, 500, 'db_error', 'Could not place the order');
    }
    logEvent({ status: 200, kind: 'order_created', paymentKind, testMode: merch.testMode });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      orderId,
      state: paymentKind === 'tokens' ? 'paid' : 'awaiting_payment',
      totalMinor,
      currency,
      tokenTotal: paymentKind === 'tokens' ? tokenTotal : null,
      testMode: merch.testMode,
    });
  }

  // Cancelling: the owner's own order, and only while it can still be stopped.
  if (req.method === 'DELETE') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const orderId = typeof req.query.id === 'string' ? req.query.id : '';
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId)) return jsonError(res, 400, 'bad_request', 'An order is required');
    const subject = walletSubject(req);
    const cancelled = await withTimeout(
      supabase.rpc('cancel_merch_order', { p_order_id: orderId, p_user_id: userId, p_subject: subject }),
    );
    if (cancelled.error) {
      if (isRpcMissing(cancelled.error)) return migrationRequired(res);
      const message = cancelled.error.message ?? '';
      if (/order_not_owned/i.test(message)) return jsonError(res, 403, 'forbidden', 'That order belongs to another account');
      if (/order_not_cancellable/i.test(message)) {
        return jsonError(res, 409, 'not_cancellable', 'That order has already gone to the supplier');
      }
      if (/unknown_order/i.test(message)) return jsonError(res, 404, 'not_found', 'Unknown order');
      return jsonError(res, 500, 'db_error', 'Could not cancel the order');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ outcome: String(cancelled.data ?? 'cancelled') });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/* ── POST ?op=cosmetic ─────────────────────────────────────────────────── */

/** Buy or equip the crown. The purchase is one transaction: the debit and the
 * entitlement land together or neither does. */
export async function handleCosmetic(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as Record<string, unknown>;
  if (body.id !== 'crown') return jsonError(res, 400, 'bad_request', 'Unknown cosmetic');
  const subject = walletSubject(req);
  if (!subject) return jsonError(res, 400, 'bad_request', 'Unknown subject');
  const settings = await getGameSettings();

  if (body.op === 'equip' || body.op === 'unequip') {
    const changed = await withTimeout(
      supabase.rpc('equip_cosmetic', { p_user_id: userId, p_cosmetic_id: 'crown', p_equipped: body.op === 'equip' }),
    );
    if (changed.error) {
      if (isRpcMissing(changed.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not change what you are wearing');
    }
    if (changed.data !== true) return jsonError(res, 409, 'not_owned', 'You do not own that yet');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ equipped: body.op === 'equip' });
  }

  if (!crownAvailable(settings.merch)) return jsonError(res, 409, 'unavailable', 'The crown is not on sale');
  const bought = await withTimeout(
    supabase.rpc('purchase_cosmetic', {
      p_user_id: userId, p_cosmetic_id: 'crown', p_subject: subject, p_price: settings.merch.crownTokenPrice,
    }),
  );
  if (bought.error) {
    if (isRpcMissing(bought.error)) return migrationRequired(res);
    if (/insufficient_tokens/i.test(bought.error.message ?? '')) {
      return jsonError(res, 409, 'insufficient_tokens', 'You do not have enough tokens');
    }
    return jsonError(res, 500, 'db_error', 'Could not complete the purchase');
  }
  logEvent({ status: 200, kind: 'cosmetic_bought' });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({ owned: true, alreadyOwned: bought.data !== true });
}

/* ── POST ?op=protection ───────────────────────────────────────────────── */

/**
 * Buy one streak protection with earned tokens.
 *
 * The whole decision is the database's: whether there is room under the cap,
 * whether the wallet covers it, and how much the budget becomes. This function
 * supplies the price from settings — never from the request — and reports what
 * happened.
 *
 * At the cap it is not an error and not a charge. Asking for a third protection
 * when two are already in hand returns the budget unchanged, because the point
 * of the cap is that no amount of currency buys a deeper reserve than a learner
 * who spends nothing has.
 */
export async function handleStreakProtection(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const subject = walletSubject(req);
  if (!subject) return jsonError(res, 400, 'bad_request', 'Unknown subject');
  const settings = await getGameSettings();
  if (!streakProtectionAvailable(settings.merch)) {
    return jsonError(res, 409, 'unavailable', 'Streak protection is not on sale');
  }

  const bought = await withTimeout(
    supabase.rpc('purchase_streak_protection', {
      p_user_id: userId,
      p_subject: subject,
      p_price: settings.merch.streakProtectionTokenPrice,
    }),
  );
  if (bought.error) {
    if (isRpcMissing(bought.error)) return migrationRequired(res);
    if (/insufficient_tokens/i.test(bought.error.message ?? '')) {
      return jsonError(res, 409, 'insufficient_tokens', 'You do not have enough tokens');
    }
    return jsonError(res, 500, 'db_error', 'Could not complete the purchase');
  }
  const row = Array.isArray(bought.data) ? bought.data[0] : bought.data;
  logEvent({ status: 200, kind: 'protection_bought', charged: row?.bought === true });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    bought: row?.bought === true,
    remaining: Number(row?.remaining ?? 0),
    period: String(row?.period ?? ''),
    shieldUntil: row?.shield_until ?? null,
    shieldSupported: true,
  });
}

/* ── POST ?op=payment-webhook ──────────────────────────────────────────── */

/**
 * The payment provider's callback. This is the only thing in the product that
 * may mark an order paid.
 *
 * The signature is checked first, in constant time, against a secret that lives
 * only in the server environment. A redirect the browser followed proves
 * nothing and is not accepted here or anywhere else; nor is a body without a
 * valid signature, however plausible it looks. Duplicate and out-of-order
 * deliveries are ordinary and handled: the state only moves forward, and a
 * second delivery of an event finds its work already done.
 */
export async function handlePaymentWebhook(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const provider = process.env.PAYMENT_PROVIDER;
  if (!secret || !provider) {
    // Nothing is configured, so nothing can be paid for. Saying so is better
    // than a 404 that looks like a routing mistake to whoever is wiring it up.
    return jsonError(res, 503, 'not_configured', 'No payment provider is configured');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  const signature = req.headers['x-payment-signature'];
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const given = typeof signature === 'string' ? signature : '';
  const ok = given.length === expected.length
    && timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'));
  if (!ok) {
    logEvent({ status: 401, kind: 'webhook_rejected' });
    return jsonError(res, 401, 'bad_signature', 'Signature did not verify');
  }

  const event = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as Record<string, unknown>;
  const orderId = typeof event.orderId === 'string' ? event.orderId : '';
  const providerRef = typeof event.providerRef === 'string' ? event.providerRef.slice(0, 200) : '';
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId) || providerRef.length === 0) {
    return jsonError(res, 400, 'bad_request', 'The event names no order');
  }

  if (event.type === 'payment.succeeded') {
    const paid = await withTimeout(
      supabase.rpc('mark_merch_order_paid', { p_order_id: orderId, p_provider: provider, p_provider_ref: providerRef }),
    );
    if (paid.error) {
      if (isRpcMissing(paid.error)) return migrationRequired(res);
      if (/unknown_order/i.test(paid.error.message ?? '')) return jsonError(res, 404, 'not_found', 'Unknown order');
      return jsonError(res, 500, 'db_error', 'Could not record the payment');
    }
    logEvent({ status: 200, kind: 'webhook_paid', applied: paid.data === true });
    return res.json({ applied: paid.data === true });
  }

  if (event.type === 'payment.refunded' || event.type === 'payment.failed') {
    const cancelled = await withTimeout(
      supabase.rpc('cancel_merch_order', { p_order_id: orderId, p_user_id: null, p_subject: deploymentSubjectIds()[0] }),
    );
    if (cancelled.error && !isRpcMissing(cancelled.error)) {
      const message = cancelled.error.message ?? '';
      if (!/order_not_cancellable|unknown_order/i.test(message)) {
        return jsonError(res, 500, 'db_error', 'Could not reconcile the payment');
      }
    }
    logEvent({ status: 200, kind: 'webhook_reconciled', type: String(event.type) });
    return res.json({ applied: true });
  }

  // An event we do not act on is still a delivered event: 200 so the provider
  // stops retrying, and a log line so it is visible.
  logEvent({ status: 200, kind: 'webhook_ignored', type: String(event.type ?? 'unknown') });
  return res.json({ applied: false });
}

/* ── GET/POST ?op=fulfilment (admin) ───────────────────────────────────── */

/**
 * Operations: read the orders waiting to go out, hand them to the supplier,
 * record a shipment, and cancel or refund one.
 *
 * Admin-only through the existing authorization, and deliberately narrow: it
 * shows an operator what they need to pack a parcel and nothing more. Addresses
 * are returned here because a picking list needs them, and they are never
 * logged or sent to analytics.
 */
export async function handleFulfilment(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!(await requireAdmin(req, res))) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  if (req.method === 'GET') {
    const state = typeof req.query.state === 'string' ? req.query.state : 'paid';
    const rows = await withTimeout(
      supabase.from('merch_orders').select('*').eq('state', state).order('created_at').limit(100),
    );
    if (rows.error) {
      if (isRpcMissing(rows.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not load the queue');
    }
    const ids = (rows.data ?? []).map((row) => String(row.order_id));
    const items = ids.length
      ? await withTimeout(supabase.from('merch_order_items').select('order_id,sku,variant,quantity').in('order_id', ids))
      : { data: [], error: null };
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ orders: rows.data ?? [], items: items.data ?? [] });
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as Record<string, unknown>;
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId)) return jsonError(res, 400, 'bad_request', 'An order is required');

    if (body.op === 'cancel') {
      const subject = deploymentSubjectIds()[0];
      const cancelled = await withTimeout(
        supabase.rpc('cancel_merch_order', { p_order_id: orderId, p_user_id: null, p_subject: subject }),
      );
      if (cancelled.error) {
        if (isRpcMissing(cancelled.error)) return migrationRequired(res);
        return jsonError(res, 409, 'not_cancellable', cancelled.error.message ?? 'Could not cancel');
      }
      logEvent({ status: 200, kind: 'order_cancelled_by_admin' });
      return res.json({ outcome: String(cancelled.data ?? 'cancelled') });
    }

    const state = body.op === 'ship' ? 'shipped' : body.op === 'submit' ? 'submitted' : null;
    if (!state) return jsonError(res, 400, 'bad_request', 'Unknown operation');
    const carrier = typeof body.carrier === 'string' ? body.carrier.slice(0, 60) : null;
    const tracking = typeof body.trackingRef === 'string' ? body.trackingRef.slice(0, 120) : null;
    const advanced = await withTimeout(
      supabase.rpc('advance_merch_order', {
        p_order_id: orderId, p_state: state, p_carrier: carrier, p_tracking: tracking,
      }),
    );
    if (advanced.error) {
      if (isRpcMissing(advanced.error)) return migrationRequired(res);
      return jsonError(res, 409, 'invalid_transition', advanced.error.message ?? 'Could not advance the order');
    }
    logEvent({ status: 200, kind: 'order_advanced', state });
    return res.json({ applied: advanced.data === true });
  }

  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/** The margin each configured item implies, for the readiness report. Shown
 * rather than hidden, including when it is negative. */
export async function merchMargins(): Promise<{ sku: MerchSku; marginMinor: number; currency: string }[]> {
  const settings = await getGameSettings();
  return Object.entries(settings.merch.pricing).flatMap(([sku, pricing]) =>
    pricing && isMerchSku(sku)
      ? [{ sku, marginMinor: merchMarginMinor(pricing), currency: pricing.currency }]
      : [],
  );
}
