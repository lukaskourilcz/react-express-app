/** Fulfilment operations (issue #172).
 *
 * Mounted on the existing `api/admin/[op].ts` dispatcher, behind the same admin
 * gate as every other operations screen, so the twelve-function budget is
 * unchanged. Nothing here is automatic: a person reviews what is paid or
 * redeemed, exports it for the supplier, records the dispatch, and handles
 * cancellations and returns.
 *
 * Two rules shape the code. Exactly-once: every state change goes through
 * `advance_reward_order`, which applies one transition at most and reports when
 * it changed nothing, so a repeated dispatch cannot ship twice or refund twice.
 * And addresses are for the parcel, not for the logs: they are read into the
 * export a person downloads, and never written to a log line or an analytics
 * event.
 *
 * Going live needs two things this code cannot supply: a real supplier and a
 * named operations owner. Until `REWARDS_SUPPLIER` is set, the export refuses.
 */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger, isRpcMissing, isTableMissing as tableMissing, jsonError, withTimeout } from '../http';
import { canTransition, type Order, type OrderStatus } from '../../shared/rewards';

const logEvent = createLogger('admin/fulfilment');

const FIELDS = 'order_id,user_id,status,payment,currency,total_cash_minor,total_tokens,lines,address,tracking_carrier,tracking_code,created_at,updated_at';

const migrationError = (res: VercelResponse) =>
  jsonError(res, 503, 'migration_required', 'Rewards migration 029 is not installed');

/** The supplier the export is addressed to. No supplier, no export. */
export const configuredSupplier = (): string | null => process.env.REWARDS_SUPPLIER?.trim() || null;
/** The person accountable for what leaves the warehouse. */
export const operationsOwner = (): string | null => process.env.REWARDS_OPS_OWNER?.trim() || null;

interface AdminOrderRow {
  order_id: string; user_id: string; status: string; payment: string; currency: string | null;
  total_cash_minor: number | null; total_tokens: number | null; lines: unknown; address: unknown;
  tracking_carrier: string | null; tracking_code: string | null; created_at: string; updated_at: string;
}

const toAdminOrder = (row: AdminOrderRow): Order & { userId: string } => ({
  orderId: row.order_id,
  userId: row.user_id,
  status: row.status as OrderStatus,
  payment: row.payment as Order['payment'],
  currency: row.currency,
  totalCashMinor: row.total_cash_minor === null ? null : Number(row.total_cash_minor),
  totalTokens: row.total_tokens === null ? null : Number(row.total_tokens),
  lines: Array.isArray(row.lines) ? (row.lines as Order['lines']) : [],
  address: (row.address ?? null) as Order['address'],
  trackingCarrier: row.tracking_carrier,
  trackingCode: row.tracking_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && ['pending', 'paid', 'fulfilling', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(value);

/**
 * GET  ?op=fulfilment&status=paid   → the queue a person works through
 * POST ?op=fulfilment               → export, advance, or record a shipment
 */
export async function handleFulfilment(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Orders are not configured');

  if (req.method === 'GET') {
    const status = isOrderStatus(req.query.status) ? req.query.status : 'paid';
    const rows = await withTimeout(
      supabase.from('reward_orders').select(FIELDS).eq('status', status).order('created_at', { ascending: true }).limit(200),
    );
    if (rows.error) {
      if (tableMissing(rows.error)) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not load the order queue');
    }
    // The count is logged; the addresses are not.
    logEvent({ status: 200, kind: 'queue', queue: status, count: (rows.data ?? []).length });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      orders: ((rows.data ?? []) as AdminOrderRow[]).map(toAdminOrder),
      supplier: configuredSupplier(),
      operationsOwner: operationsOwner(),
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'export') {
    const supplier = configuredSupplier();
    if (!supplier) {
      return jsonError(res, 503, 'no_supplier', 'No supplier is configured, so there is nothing to submit an order to');
    }
    if (!operationsOwner()) {
      return jsonError(res, 503, 'no_operations_owner', 'No operations owner is named; a dispatch needs someone accountable');
    }
    const rows = await withTimeout(
      supabase.from('reward_orders').select(FIELDS).eq('status', 'paid').order('created_at', { ascending: true }).limit(200),
    );
    if (rows.error) {
      if (tableMissing(rows.error)) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not build the export');
    }
    const orders = ((rows.data ?? []) as AdminOrderRow[]).map(toAdminOrder);
    // Moving each order to `fulfilling` is what makes the export exactly once:
    // a second export of the same batch finds nothing left in `paid`.
    const claimed: string[] = [];
    for (const order of orders) {
      const moved = await withTimeout(supabase.rpc('advance_reward_order', {
        p_order_id: order.orderId, p_to_status: 'fulfilling', p_actor: 'admin', p_note: `export:${supplier}`,
      }));
      if (moved.error) continue;
      if (((moved.data ?? {}) as { applied?: boolean }).applied === true) claimed.push(order.orderId);
    }
    logEvent({ status: 200, kind: 'export', supplier, claimed: claimed.length, offered: orders.length });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      supplier,
      operationsOwner: operationsOwner(),
      claimed,
      // The export carries the addresses, because a parcel needs one. It is
      // returned to the operator who asked for it and is never logged.
      orders: orders.filter((order) => claimed.includes(order.orderId)),
    });
  }

  if (action === 'advance') {
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(orderId)) return jsonError(res, 400, 'bad_request', 'An order id is required');
    if (!isOrderStatus(body.status)) return jsonError(res, 400, 'bad_request', 'A target status is required');
    const current = await withTimeout(supabase.from('reward_orders').select('status').eq('order_id', orderId).maybeSingle());
    if (current.error) { if (tableMissing(current.error)) return migrationError(res); return jsonError(res, 500, 'db_error', 'Could not load that order'); }
    if (!current.data) return jsonError(res, 404, 'not_found', 'No such order');
    const from = current.data.status as OrderStatus;
    if (from !== body.status && !canTransition(from, body.status)) {
      return jsonError(res, 409, 'invalid_transition', `An order cannot move from ${from} to ${body.status}`);
    }
    const carrier = typeof body.carrier === 'string' && body.carrier.trim().length <= 60 ? body.carrier.trim() : null;
    const tracking = typeof body.tracking === 'string' && /^[A-Za-z0-9-]{4,64}$/.test(body.tracking) ? body.tracking : null;
    if (body.status === 'shipped' && (!carrier || !tracking)) {
      return jsonError(res, 400, 'tracking_required', 'A shipment needs a carrier and a tracking code');
    }
    const moved = await withTimeout(supabase.rpc('advance_reward_order', {
      p_order_id: orderId,
      p_to_status: body.status,
      p_actor: 'admin',
      p_note: typeof body.note === 'string' ? body.note.slice(0, 280) : null,
      p_carrier: carrier,
      p_tracking: tracking,
    }));
    if (moved.error) {
      if (isRpcMissing(moved.error)) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not move that order');
    }
    const result = (moved.data ?? {}) as { applied?: boolean; error?: string; status?: string };
    if (result.error) return jsonError(res, 409, result.error, 'That transition was refused');
    logEvent({ status: 200, kind: 'advance', from, to: body.status, applied: result.applied === true });
    return res.json({ orderId, status: result.status ?? body.status, applied: result.applied === true });
  }

  return jsonError(res, 400, 'bad_request', `Unknown fulfilment action: ${action}`);
}
