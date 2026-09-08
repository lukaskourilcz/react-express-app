/** The payment adapter and its webhook (issue #171).
 *
 * Provider-neutral on purpose: the integration is written against a signed
 * webhook and a hosted checkout, which is what every provider this shop would
 * use offers. The secrets stay on the server, the totals stay server-owned, and
 * the SIGNED WEBHOOK is the only authority for a payment — never the redirect
 * the browser comes back on, and never a flag in a request body.
 *
 * Nothing is charged until the owner configures a provider AND switches
 * REWARDS_PAYMENT_MODE to `live`. Until then checkout runs in the provider's
 * test mode and every surface says so.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger, isRpcMissing, isTableMissing, jsonError, withTimeout } from '../http';
import { isPaymentConfigured, paymentConfig } from './config';

const logEvent = createLogger('rewards/payment');

/** How far apart the signed timestamp and our clock may be. */
export const WEBHOOK_TOLERANCE_MS = 5 * 60_000;

export interface WebhookVerification {
  ok: boolean;
  reason?: 'no_secret' | 'malformed' | 'bad_signature' | 'stale';
}

/**
 * Verify a `t=<unix seconds>,v1=<hex hmac>` signature over `<t>.<body>`, the
 * shape the mainstream providers use. Constant-time comparison, and a
 * timestamp outside the tolerance is refused so a captured request cannot be
 * replayed later.
 */
export function verifyWebhookSignature(input: {
  body: string;
  header: string | undefined;
  secret: string | null;
  now: number;
  toleranceMs?: number;
}): WebhookVerification {
  if (!input.secret) return { ok: false, reason: 'no_secret' };
  if (typeof input.header !== 'string' || input.header.length === 0 || input.header.length > 512) {
    return { ok: false, reason: 'malformed' };
  }
  const parts = new Map<string, string>();
  for (const piece of input.header.split(',')) {
    const [key, value] = piece.split('=');
    if (key && value) parts.set(key.trim(), value.trim());
  }
  const timestamp = Number.parseInt(parts.get('t') ?? '', 10);
  const signature = parts.get('v1');
  if (!Number.isFinite(timestamp) || !signature || !/^[0-9a-f]{64}$/i.test(signature)) {
    return { ok: false, reason: 'malformed' };
  }
  const tolerance = input.toleranceMs ?? WEBHOOK_TOLERANCE_MS;
  if (Math.abs(input.now - timestamp * 1000) > tolerance) return { ok: false, reason: 'stale' };

  const expected = createHmac('sha256', input.secret).update(`${timestamp}.${input.body}`, 'utf8').digest('hex');
  const a = new Uint8Array(Buffer.from(expected, 'utf8'));
  const b = new Uint8Array(Buffer.from(signature.toLowerCase(), 'utf8'));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

export type PaymentEventType = 'payment_succeeded' | 'payment_failed' | 'checkout_expired' | 'refunded';

export interface PaymentEvent {
  type: PaymentEventType;
  /** The provider's own id for the event, so a repeat is recognised. */
  eventId: string;
  orderId: string;
  providerRef: string | null;
  amountMinor: number | null;
  currency: string | null;
}

/** Read the provider's payload into the shape the order service understands. */
export function parsePaymentEvent(raw: unknown): PaymentEvent | null {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const type = value.type;
  if (type !== 'payment_succeeded' && type !== 'payment_failed' && type !== 'checkout_expired' && type !== 'refunded') return null;
  const data = (value.data && typeof value.data === 'object' ? value.data : {}) as Record<string, unknown>;
  const orderId = typeof data.orderId === 'string' ? data.orderId : '';
  const eventId = typeof value.id === 'string' ? value.id : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(orderId) || !/^[A-Za-z0-9_.:-]{6,128}$/.test(eventId)) return null;
  return {
    type,
    eventId,
    orderId,
    providerRef: typeof data.providerRef === 'string' && data.providerRef.length <= 128 ? data.providerRef : null,
    amountMinor: Number.isInteger(data.amountMinor) ? Number(data.amountMinor) : null,
    currency: typeof data.currency === 'string' && /^[A-Z]{3}$/.test(data.currency) ? data.currency : null,
  };
}

/**
 * The raw request body, which is what the signature covers. A runtime that
 * hands us a parsed object cannot be signature-checked byte for byte, so the
 * webhook refuses rather than pretending: the deployment has to preserve the
 * raw body for this route.
 */
export function rawBodyOf(req: VercelRequest): string | null {
  const candidate = (req as unknown as { rawBody?: unknown }).rawBody;
  if (typeof candidate === 'string') return candidate;
  if (candidate instanceof Uint8Array) return Buffer.from(candidate).toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body).toString('utf8');
  return null;
}

/**
 * The webhook. Unauthenticated by nature — the signature is the credential —
 * and the only thing in the system that may move a cash order to `paid`.
 *
 * Duplicate and out-of-order events are safe twice over: the provider's own
 * event id is recorded before anything is applied, so a re-delivery is
 * recognised and dropped, and `advance_reward_order` still applies at most one
 * transition and reports when it changed nothing.
 */
export async function handlePaymentWebhook(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const config = paymentConfig();
  if (!isPaymentConfigured(config)) {
    logEvent({ status: 503, kind: 'webhook_unconfigured' });
    return jsonError(res, 503, 'not_configured', 'No payment provider is configured');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Orders are not configured');

  const body = rawBodyOf(req);
  if (body === null) {
    logEvent({ status: 400, kind: 'webhook_no_raw_body' });
    return jsonError(res, 400, 'raw_body_required', 'The signature covers the raw body, which was not preserved');
  }
  const header = req.headers['x-payment-signature'];
  const verification = verifyWebhookSignature({
    body,
    header: Array.isArray(header) ? header[0] : header,
    secret: config.webhookSecret,
    now: Date.now(),
  });
  if (!verification.ok) {
    logEvent({ status: 400, kind: 'webhook_rejected', reason: verification.reason });
    return jsonError(res, 400, 'invalid_signature', 'The webhook signature did not verify');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return jsonError(res, 400, 'bad_request', 'The webhook body is not JSON');
  }
  const event = parsePaymentEvent(parsed);
  if (!event) return jsonError(res, 400, 'bad_request', 'Unrecognised event');

  const order = await withTimeout(
    supabase.from('reward_orders').select('order_id,status,payment,currency,total_cash_minor').eq('order_id', event.orderId).maybeSingle(),
  );
  if (order.error) return jsonError(res, 500, 'db_error', 'Could not load that order');
  if (!order.data) {
    // A provider event for an order we do not have is acknowledged and dropped:
    // returning an error would have the provider retry forever.
    logEvent({ status: 200, kind: 'webhook_unknown_order' });
    return res.json({ received: true, applied: false });
  }
  if (order.data.payment !== 'cash') {
    logEvent({ status: 200, kind: 'webhook_not_cash' });
    return res.json({ received: true, applied: false });
  }
  // The amount is checked against what the server itself computed, so a forged
  // or altered amount cannot mark an order paid for less than it costs.
  if (event.type === 'payment_succeeded') {
    const expected = Number(order.data.total_cash_minor ?? 0);
    if (event.amountMinor !== null && event.amountMinor !== expected) {
      logEvent({ status: 409, kind: 'webhook_amount_mismatch' });
      return jsonError(res, 409, 'amount_mismatch', 'The paid amount does not match the order');
    }
    if (event.currency !== null && order.data.currency !== null && event.currency !== order.data.currency) {
      return jsonError(res, 409, 'currency_mismatch', 'The paid currency does not match the order');
    }
  }

  // Providers retry until they get a 2xx, and a retry can arrive after an
  // operator has already moved the order on by hand. Claiming the event id
  // first — one insert, decided by the primary key — is what stops a second
  // delivery of `refunded` from running a second refund.
  const claimed = await withTimeout(
    supabase
      .from('reward_payment_events')
      .upsert({ event_id: event.eventId, order_id: event.orderId, type: event.type }, { onConflict: 'event_id', ignoreDuplicates: true })
      .select('event_id'),
  );
  if (claimed.error) {
    if (isTableMissing(claimed.error)) return jsonError(res, 503, 'migration_required', 'Rewards migration 029 is not installed');
    return jsonError(res, 500, 'db_error', 'Could not record that event');
  }
  if ((claimed.data ?? []).length === 0) {
    logEvent({ status: 200, kind: 'webhook_replay', type: event.type });
    return res.json({ received: true, applied: false, status: order.data.status });
  }

  const target = event.type === 'payment_succeeded' ? 'paid'
    : event.type === 'refunded' ? 'refunded'
    : 'cancelled';
  const moved = await withTimeout(supabase.rpc('advance_reward_order', {
    p_order_id: event.orderId,
    p_to_status: target,
    p_actor: 'provider',
    p_note: event.type,
    p_provider: config.provider,
    p_provider_ref: event.providerRef,
  }));
  if (moved.error) {
    if (isRpcMissing(moved.error)) return jsonError(res, 503, 'migration_required', 'Rewards migration 029 is not installed');
    return jsonError(res, 500, 'db_error', 'Could not apply that event');
  }
  const result = (moved.data ?? {}) as { applied?: boolean; error?: string; status?: string };
  logEvent({ status: 200, kind: 'webhook_applied', type: event.type, applied: result.applied === true, testMode: config.testMode });
  return res.json({ received: true, applied: result.applied === true, status: result.status ?? order.data.status });
}
