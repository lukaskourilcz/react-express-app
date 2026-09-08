/** Wallet, shop catalogue, orders and the cosmetic inventory
 * (issues #168, #169, #170, #172, #173).
 *
 * Mounted on the existing `api/user/[op].ts` dispatcher, so the deployment
 * keeps exactly twelve physical functions:
 *   GET  ?op=wallet         → the ledger-derived balance, after a sync
 *   GET  ?op=shop-catalog   → the products, their configuration and what blocks them
 *   GET  ?op=orders         → the learner's own orders
 *   POST ?op=orders         → place one, or cancel one
 *   POST ?op=cosmetic       → equip or unequip an owned cosmetic
 *
 * The server owns every total. A request names a SKU, a variant and a quantity;
 * prices come from configuration and are recomputed here, so a patched client
 * cannot buy anything for less than it costs.
 */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { createLogger, isRpcMissing, isTableMissing as tableMissing, jsonError, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { isPaymentConfigured, merchPricing, paymentConfig } from './config';
import {
  MERCH_CATALOG,
  availabilityFor,
  isMerchSku,
  merchBySku,
  type MerchListing,
  type ShopCatalogResponse,
} from '../../shared/merchandise';
import {
  IDEMPOTENCY_KEY_PATTERN,
  MAX_ORDER_QUANTITY,
  REGISTRATION_GRANT,
  TOKENS_PER_XP,
  learnerMayCancel,
  validateAddress,
  type Order,
  type OrderLine,
  type OrdersResponse,
  type OrderStatus,
  type WalletResponse,
} from '../../shared/rewards';

const logEvent = createLogger('user/rewards');

/** devShark is the `webdev` deployment; the wallet is scoped to that subject. */
const SUBJECT = 'webdev';
const available = () => deploymentSubjectIds().includes(SUBJECT);

const migrationError = (res: VercelResponse) =>
  jsonError(res, 503, 'migration_required', 'Rewards migration 029 is not installed');

const notAvailable = (res: VercelResponse) =>
  jsonError(res, 404, 'not_available', 'The shop is not part of this product');

/* ── wallet ──────────────────────────────────────────────────────────────── */

export async function handleWallet(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return notAvailable(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  // The balance is derived, never accepted: the sync folds every verified
  // award that has not been credited yet and returns what the ledger says.
  const synced = await withTimeout(supabase.rpc('sync_reward_wallet', {
    p_user_id: userId, p_subject: SUBJECT, p_grant: REGISTRATION_GRANT, p_xp_ratio: TOKENS_PER_XP,
  }));
  if (synced.error) {
    if (isRpcMissing(synced.error) || tableMissing(synced.error)) return migrationError(res);
    return jsonError(res, 500, 'db_error', 'Could not read your wallet');
  }

  const [wallet, entries] = await Promise.all([
    withTimeout(supabase.from('reward_wallets').select('balance,updated_at').eq('user_id', userId).eq('subject', SUBJECT).maybeSingle()),
    withTimeout(supabase.from('reward_ledger').select('entry_id,delta,reason,receipt_id,created_at')
      .eq('user_id', userId).eq('subject', SUBJECT).order('created_at', { ascending: false }).limit(25)),
  ]);
  if (wallet.error || entries.error) return jsonError(res, 500, 'db_error', 'Could not read your wallet');

  // A number a browser once wrote down is not evidence. It is reported so the
  // learner is not left wondering, and it is never credited.
  const legacyRaw = req.query.legacy;
  const legacy = typeof legacyRaw === 'string' && /^\d{1,9}$/.test(legacyRaw) ? Number.parseInt(legacyRaw, 10) : null;

  res.setHeader('Cache-Control', 'private, no-store');
  const body: WalletResponse = {
    wallet: {
      subject: SUBJECT,
      balance: Number(wallet.data?.balance ?? 0),
      updatedAt: wallet.data?.updated_at ?? null,
      entries: ((entries.data ?? []) as { entry_id: number; delta: number; reason: string; receipt_id: string; created_at: string }[])
        .map((row) => ({
          entryId: String(row.entry_id),
          delta: Number(row.delta),
          reason: row.reason as WalletResponse['wallet']['entries'][number]['reason'],
          receiptId: row.receipt_id,
          createdAt: row.created_at,
        })),
    },
    legacy: { reported: legacy, converted: false },
  };
  return res.json(body);
}

/* ── shop catalogue ──────────────────────────────────────────────────────── */

/**
 * Units a learner could actually order, per SKU: what is on the shelf minus
 * what other open orders have reserved.
 *
 * `reward_stock` is the only authority, on both the shelf and the till. The
 * catalogue used to fall back to a number in `REWARDS_PRICING` when a SKU had
 * no row, while `place_reward_order` reserves against the table and refuses
 * with `no_stock_configured` — so a configured item was advertised as buyable
 * and then refused at the last step. A SKU with no row has no stock.
 */
async function stockOnHand(supabase: SupabaseClient): Promise<Map<string, number>> {
  const stock = await withTimeout(supabase.from('reward_stock').select('sku,on_hand,reserved'));
  const onHand = new Map<string, number>();
  if (!stock.error) {
    for (const row of (stock.data ?? []) as { sku: string; on_hand: number; reserved: number }[]) {
      onHand.set(row.sku, Math.max(0, Number(row.on_hand) - Number(row.reserved)));
    }
  }
  return onHand;
}

export async function handleShopCatalog(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return notAvailable(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const payment = paymentConfig();
  const configured = isPaymentConfigured(payment);
  const pricing = merchPricing();

  const onHand = await stockOnHand(supabase);

  const listings: MerchListing[] = MERCH_CATALOG.map((product) => {
    const configuredPricing = pricing[product.sku];
    const withStock = { ...configuredPricing, stock: onHand.get(product.sku) ?? null };
    return {
      product,
      pricing: withStock,
      availability: availabilityFor(product, withStock, { paymentConfigured: configured }),
    };
  });

  res.setHeader('Cache-Control', 'private, no-store');
  const body: ShopCatalogResponse = { listings, paymentConfigured: configured, testMode: payment.testMode };
  return res.json(body);
}

/* ── orders ──────────────────────────────────────────────────────────────── */

interface OrderRow {
  order_id: string; status: string; payment: string; currency: string | null;
  total_cash_minor: number | null; total_tokens: number | null; lines: unknown;
  address: unknown; tracking_carrier: string | null; tracking_code: string | null;
  created_at: string; updated_at: string;
}

const toOrder = (row: OrderRow): Order => ({
  orderId: row.order_id,
  status: row.status as Order['status'],
  payment: row.payment as Order['payment'],
  currency: row.currency,
  totalCashMinor: row.total_cash_minor === null ? null : Number(row.total_cash_minor),
  totalTokens: row.total_tokens === null ? null : Number(row.total_tokens),
  lines: Array.isArray(row.lines) ? (row.lines as OrderLine[]) : [],
  address: (row.address ?? null) as Order['address'],
  trackingCarrier: row.tracking_carrier,
  trackingCode: row.tracking_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ORDER_FIELDS = 'order_id,status,payment,currency,total_cash_minor,total_tokens,lines,address,tracking_carrier,tracking_code,created_at,updated_at';

export async function handleOrders(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const rows = await withTimeout(
      supabase.from('reward_orders').select(ORDER_FIELDS).eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    );
    if (rows.error) {
      if (tableMissing(rows.error)) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not load your orders');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    const body: OrdersResponse = { orders: ((rows.data ?? []) as OrderRow[]).map(toOrder) };
    return res.json(body);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : 'create';

  if (action === 'cancel') {
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(orderId)) return jsonError(res, 400, 'bad_request', 'An order id is required');
    const owned = await withTimeout(supabase.from('reward_orders').select('order_id,status').eq('user_id', userId).eq('order_id', orderId).maybeSingle());
    if (owned.error) { if (tableMissing(owned.error)) return migrationError(res); return jsonError(res, 500, 'db_error', 'Could not load that order'); }
    if (!owned.data) return jsonError(res, 404, 'not_found', 'No such order');
    // The state machine still allows an operator to stop an order that is
    // already being packed. The learner does not get that reach.
    if (!learnerMayCancel(owned.data.status as OrderStatus)) {
      return jsonError(res, 409, 'too_late_to_cancel', 'That order is already being prepared — contact support');
    }
    const moved = await withTimeout(supabase.rpc('advance_reward_order', {
      p_order_id: orderId, p_to_status: 'cancelled', p_actor: 'learner', p_note: null,
    }));
    if (moved.error) { if (isRpcMissing(moved.error)) return migrationError(res); return jsonError(res, 500, 'db_error', 'Could not cancel that order'); }
    const result = (moved.data ?? {}) as { error?: string; status?: string };
    if (result.error) return jsonError(res, 409, result.error, 'That order can no longer be cancelled');
    logEvent({ status: 200, kind: 'order_cancelled' });
    return res.json({ orderId, status: result.status ?? 'cancelled' });
  }

  if (action !== 'create') return jsonError(res, 400, 'bad_request', `Unknown order action: ${action}`);

  const sku = body.sku;
  if (!isMerchSku(sku)) return jsonError(res, 400, 'bad_request', 'A known product is required');
  const product = merchBySku(sku)!;
  const quantity = Number.isInteger(body.quantity) ? Number(body.quantity) : 1;
  if (quantity < 1 || quantity > MAX_ORDER_QUANTITY) return jsonError(res, 400, 'bad_request', `Between 1 and ${MAX_ORDER_QUANTITY} at a time`);
  const payment = body.payment === 'cash' ? 'cash' : body.payment === 'tokens' ? 'tokens' : null;
  if (!payment) return jsonError(res, 400, 'bad_request', 'Choose tokens or cash');
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) return jsonError(res, 400, 'bad_request', 'An idempotency key is required');

  const variantId = typeof body.variantId === 'string' ? body.variantId : null;
  if (product.variants.length > 0) {
    if (!variantId || !product.variants.some((one) => one.id === variantId)) {
      return jsonError(res, 400, 'bad_request', 'Choose a variant');
    }
  } else if (variantId) {
    return jsonError(res, 400, 'bad_request', 'That product has no variants');
  }

  const config = paymentConfig();
  // The same stock the catalogue showed, read again here: availability is
  // decided against the table the order will reserve from, never against
  // configuration.
  const configuredPricing = merchPricing()[product.sku];
  const pricing = { ...configuredPricing, stock: (await stockOnHand(supabase)).get(product.sku) ?? null };
  const region = product.kind === 'physical' && typeof (body.address as { country?: unknown } | undefined)?.country === 'string'
    ? String((body.address as { country: string }).country).toUpperCase()
    : null;
  const availability = availabilityFor(product, pricing, { paymentConfigured: isPaymentConfigured(config), region });
  if (payment === 'cash' && !availability.cash) {
    return res.status(409).json({ error: { code: 'not_available', message: 'This item cannot be bought yet', blockers: availability.blockers } });
  }
  if (payment === 'tokens' && !availability.tokens) {
    return res.status(409).json({ error: { code: 'not_available', message: 'This item cannot be redeemed yet', blockers: availability.blockers } });
  }
  // Live charging is a deliberate switch, not a side effect of having keys.
  if (payment === 'cash' && config.testMode) {
    return res.status(409).json({
      error: { code: 'test_mode', message: 'Payments are running in test mode; no card is charged', blockers: availability.blockers },
    });
  }

  let address: Order['address'] = null;
  if (product.kind === 'physical') {
    const checked = validateAddress(body.address);
    if ('errors' in checked) return res.status(400).json({ error: { code: 'invalid_address', message: 'The shipping address is incomplete', fields: checked.errors } });
    address = checked.address;
  }

  // The server computes the totals from its own configuration.
  const totalTokens = pricing.tokens === null ? null : pricing.tokens * quantity;
  const totalCash = pricing.cashMinor === null ? null : pricing.cashMinor * quantity;
  const lines: OrderLine[] = [{ sku: product.sku, variantId, quantity, unitCashMinor: pricing.cashMinor, unitTokens: pricing.tokens }];
  const orderId = randomBytes(12).toString('base64url');

  const placed = await withTimeout(supabase.rpc('place_reward_order', {
    p_order_id: orderId,
    p_user_id: userId,
    p_subject: SUBJECT,
    p_payment: payment,
    p_sku: product.sku,
    p_quantity: quantity,
    p_currency: pricing.currency,
    p_total_cash_minor: totalCash,
    p_total_tokens: totalTokens,
    p_lines: lines,
    p_address: address,
    p_idempotency_key: idempotencyKey,
    p_physical: product.kind === 'physical',
  }));
  if (placed.error) {
    if (isRpcMissing(placed.error)) return migrationError(res);
    return jsonError(res, 500, 'db_error', 'Could not place that order');
  }
  const result = (placed.data ?? {}) as { error?: string; orderId?: string; status?: string; created?: boolean };
  if (result.error) {
    return res.status(409).json({ error: { code: result.error, message: 'That order could not be placed' } });
  }

  logEvent({ status: 200, kind: 'order_placed', payment, sku: product.sku, created: result.created === true });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({ orderId: result.orderId ?? orderId, status: result.status ?? 'pending', created: result.created === true });
}

/* ── cosmetics ───────────────────────────────────────────────────────────── */

export async function handleCosmetic(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const rows = await withTimeout(
      supabase.from('reward_inventory').select('sku,equipped,acquired_at').eq('user_id', userId).eq('subject', SUBJECT),
    );
    if (rows.error) {
      if (tableMissing(rows.error)) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not load your items');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    const owned = (rows.data ?? []) as { sku: string; equipped: boolean; acquired_at: string }[];
    return res.json({
      owned: owned.map((row) => ({ sku: row.sku, equipped: row.equipped === true, acquiredAt: row.acquired_at })),
      equipped: owned.find((row) => row.equipped)?.sku ?? null,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as { sku?: unknown; equip?: unknown };
  if (!isMerchSku(body.sku)) return jsonError(res, 400, 'bad_request', 'A known item is required');
  const product = merchBySku(body.sku)!;
  if (product.kind !== 'cosmetic') return jsonError(res, 400, 'bad_request', 'That item is not worn');

  const moved = await withTimeout(supabase.rpc('equip_reward_cosmetic', {
    p_user_id: userId, p_subject: SUBJECT, p_sku: body.sku, p_equip: body.equip === true,
  }));
  if (moved.error) {
    if (isRpcMissing(moved.error)) return migrationError(res);
    return jsonError(res, 500, 'db_error', 'Could not change that');
  }
  const result = (moved.data ?? {}) as { applied?: boolean; error?: string; equipped?: boolean };
  if (result.error === 'not_owned') return jsonError(res, 403, 'not_owned', 'You do not own that item');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({ equipped: result.equipped === true ? body.sku : null });
}
