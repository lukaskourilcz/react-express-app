/** From Stripe to `entitlement_grants`.
 *
 * Every path that changes an entitlement ends in `syncSubscription`: it
 * fetches the subscription from Stripe, works out which account owns it and
 * mirrors it with `upsert_provider_entitlement`. Events arrive out of order and
 * more than once; reading the live object instead of the event snapshot makes
 * the result the same whatever the order. Only two callers exist: the signed
 * webhook and the success page's server-side session lookup. A redirect or a
 * browser never changes an entitlement.
 *
 * Manual and promo grants are separate rows keyed by nothing Stripe knows, so
 * nothing here can touch them. */

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { isRpcMissing, withTimeout } from '../http';
import { accountExists } from '../entitlements';
import { stripeErrorCode, type StripeApi } from './stripe';

export interface BillingDeps {
  supabase: SupabaseClient;
  stripe: StripeApi;
  now?: () => number;
}

/** Something about the event can never be applied: an account the server
 * cannot resolve, a subscription that does not exist. Recorded on the event
 * and answered 200, so Stripe stops retrying. */
export class BillingPermanentError extends Error {
  constructor(readonly code: string, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'BillingPermanentError';
  }
}

/** The database routines of migration 039 are not installed yet. */
export class BillingMigrationError extends Error {
  constructor() {
    super('migration_required');
    this.name = 'BillingMigrationError';
  }
}

/** The text the buyer ticks in Checkout. Stored with the session id. */
export const WAIVER_TEXT =
  'I want Premium to start now and I understand that I lose my 14-day right of withdrawal for digital content.';

/** Subscription states `entitlement_grants.status` accepts from Stripe. */
const PROVIDER_STATUSES = new Set([
  'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused',
]);
/** States in which a subscription may still charge or open Premium. */
export const LIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

const USER_ID = /^[A-Za-z0-9-]{1,128}$/;

export const idOf = (value: unknown): string | null => {
  if (typeof value === 'string') return value || null;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') return (value as { id: string }).id;
  return null;
};

const iso = (seconds: number | null | undefined): string | null =>
  typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;

/** When the paid period ends. The API version this code pins keeps the period
 * on each subscription item; older versions kept it on the subscription. A
 * scheduled cancellation that comes first ends the subscription earlier. */
export function periodEnd(sub: Stripe.Subscription): string | null {
  const itemEnds = (sub.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === 'number');
  const legacy = (sub as unknown as { current_period_end?: unknown }).current_period_end;
  let end = itemEnds.length ? Math.max(...itemEnds) : typeof legacy === 'number' ? legacy : null;
  if (typeof sub.cancel_at === 'number' && (end === null || sub.cancel_at < end)) end = sub.cancel_at;
  return iso(end);
}

/** Whether the subscription is set to end instead of renewing. */
export const endsInsteadOfRenewing = (sub: Stripe.Subscription): boolean =>
  sub.cancel_at_period_end === true || (typeof sub.cancel_at === 'number' && sub.status !== 'canceled');

export const priceOf = (sub: Stripe.Subscription): string | null => idOf(sub.items?.data?.[0]?.price) ?? null;

/** The subscription an invoice bills, in this API version's shape or the older one. */
export function subscriptionOfInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent?.subscription_details?.subscription;
  return idOf(parent) ?? idOf((invoice as unknown as { subscription?: unknown }).subscription);
}

async function rpc<T>(deps: BillingDeps, name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await withTimeout(deps.supabase.rpc(name, args));
  if (error) {
    if (isRpcMissing(error)) throw new BillingMigrationError();
    const message = error.message ?? 'db_error';
    if (/_conflict/.test(message)) throw new BillingPermanentError(message.match(/[a-z_]+_conflict/)?.[0] ?? 'conflict');
    throw new Error(`db_error: ${name}`);
  }
  return data as T;
}

export const customerOwner = (deps: BillingDeps, customerId: string) =>
  rpc<string | null>(deps, 'billing_customer_owner', { p_provider_customer_id: customerId });

export const linkCustomer = (deps: BillingDeps, userId: string, customerId: string) =>
  rpc<boolean>(deps, 'link_billing_customer', { p_user_id: userId, p_provider_customer_id: customerId });

export interface BillingAccount {
  customerId: string | null;
  providerLive: boolean;
}

export async function billingAccount(deps: BillingDeps, userId: string): Promise<BillingAccount> {
  const raw = await rpc<Record<string, unknown> | null>(deps, 'billing_account', { p_user_id: userId });
  return {
    customerId: typeof raw?.customerId === 'string' && raw.customerId ? raw.customerId : null,
    providerLive: raw?.providerLive === true,
  };
}

/** Which account a subscription belongs to. The id written into the
 * subscription's metadata at checkout comes first; the customer link and the
 * caller's hint (the session's client_reference_id) back it up. Two sources
 * that disagree, or an account that does not exist, cannot be applied. */
async function resolveAccount(deps: BillingDeps, sub: Stripe.Subscription, hint: string | null): Promise<string> {
  const fromMetadata = typeof sub.metadata?.supabase_user_id === 'string' ? sub.metadata.supabase_user_id : null;
  const customerId = idOf(sub.customer);
  const owner = customerId ? await customerOwner(deps, customerId) : null;
  const userId = fromMetadata ?? hint ?? owner;
  if (!userId || !USER_ID.test(userId)) throw new BillingPermanentError('unknown_user', sub.id);
  for (const other of [hint, owner]) {
    if (other && other !== userId) throw new BillingPermanentError('owner_conflict', sub.id);
  }
  if (!(await accountExists(deps.supabase, userId))) throw new BillingPermanentError('unknown_user', sub.id);
  return userId;
}

async function retrieveSubscription(deps: BillingDeps, subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await deps.stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    if (stripeErrorCode(error).code === 'resource_missing') throw new BillingPermanentError('subscription_missing', subscriptionId);
    throw error;
  }
}

export interface SyncResult {
  userId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** Mirror one subscription into its provider grant. `revoke` writes the grant
 * as revoked with that note (a full refund, a dispute, a withdrawal); a revoked
 * grant stays revoked whatever Stripe says later. */
export async function syncSubscription(
  deps: BillingDeps,
  subscriptionId: string,
  options: { userHint?: string | null; revoke?: string | null } = {},
): Promise<SyncResult> {
  const sub = await retrieveSubscription(deps, subscriptionId);
  const userId = await resolveAccount(deps, sub, options.userHint ?? null);
  const customerId = idOf(sub.customer);
  if (customerId) await linkCustomer(deps, userId, customerId);
  const status = options.revoke ? 'revoked' : sub.status;
  if (status !== 'revoked' && !PROVIDER_STATUSES.has(status)) throw new BillingPermanentError('unknown_status', `${sub.id} ${status}`);
  const currentPeriodEnd = periodEnd(sub);
  const cancelAtPeriodEnd = endsInsteadOfRenewing(sub);
  await rpc(deps, 'upsert_provider_entitlement', {
    p_user_id: userId,
    p_subscription_id: sub.id,
    p_status: status,
    p_price_id: priceOf(sub),
    p_current_period_end: currentPeriodEnd,
    p_cancel_at_period_end: cancelAtPeriodEnd,
    p_note: options.revoke ?? null,
  });
  return { userId, subscriptionId: sub.id, status, currentPeriodEnd, cancelAtPeriodEnd };
}

/** The subscription a payment paid for, found through its invoice. */
export async function subscriptionForPayment(
  deps: BillingDeps,
  paymentIntentId: string | null,
  chargeId: string | null,
): Promise<string | null> {
  if (paymentIntentId) {
    const payments = await deps.stripe.invoicePayments.list({
      payment: { type: 'payment_intent', payment_intent: paymentIntentId },
      limit: 1,
      expand: ['data.invoice'],
    });
    const invoice = payments.data[0]?.invoice;
    if (invoice && typeof invoice === 'object' && !('deleted' in invoice && invoice.deleted)) {
      const found = subscriptionOfInvoice(invoice as Stripe.Invoice);
      if (found) return found;
    } else if (typeof invoice === 'string') {
      const found = subscriptionOfInvoice(await deps.stripe.invoices.retrieve(invoice));
      if (found) return found;
    }
  }
  if (chargeId) {
    // Older API versions name the invoice on the charge itself.
    const charge = await deps.stripe.charges.retrieve(chargeId);
    const invoiceId = idOf((charge as unknown as { invoice?: unknown }).invoice);
    if (invoiceId) return subscriptionOfInvoice(await deps.stripe.invoices.retrieve(invoiceId));
  }
  return null;
}

/** End a subscription now and revoke its grant: a full refund, a dispute, an
 * early fraud warning or a withdrawal. Cancelling at Stripe stops further
 * charges; the grant is written revoked with the reason in its note. */
export async function revokeSubscription(deps: BillingDeps, subscriptionId: string, note: string): Promise<SyncResult> {
  const sub = await retrieveSubscription(deps, subscriptionId);
  if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
    try {
      await deps.stripe.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false });
    } catch (error) {
      // Already ended between the read and the cancel: nothing left to stop.
      if (stripeErrorCode(error).code !== 'resource_missing') throw error;
    }
  }
  return syncSubscription(deps, subscriptionId, { revoke: note.slice(0, 500) });
}

const day = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

/* ── Checkout sessions ──────────────────────────────────────────────────── */

export interface SessionOutcome {
  status: 'complete' | 'pending' | 'expired';
  sync: SyncResult | null;
}

/** Apply a completed Checkout Session: link the customer, keep the consent
 * with the session id, mirror the subscription. Shared by the webhook and the
 * success page, and idempotent, so both may run for one session. */
export async function applyCheckoutSession(
  deps: BillingDeps,
  session: Stripe.Checkout.Session,
  acceptedAtSeconds: number,
): Promise<SessionOutcome> {
  if (session.mode !== 'subscription') throw new BillingPermanentError('not_a_subscription', session.id);
  if (session.status === 'expired') return { status: 'expired', sync: null };
  const subscriptionId = idOf(session.subscription);
  if (session.status !== 'complete' || session.payment_status === 'unpaid' || !subscriptionId) {
    return { status: 'pending', sync: null };
  }
  const userId = session.client_reference_id;
  if (!userId || !USER_ID.test(userId)) throw new BillingPermanentError('unknown_user', session.id);
  const customerId = idOf(session.customer);
  if (customerId) await linkCustomer(deps, userId, customerId);
  if (session.consent?.terms_of_service === 'accepted') {
    await rpc(deps, 'record_checkout_consent', {
      p_session_id: session.id,
      p_user_id: userId,
      p_subscription_id: subscriptionId,
      p_waiver_text: (session.custom_text?.terms_of_service_acceptance?.message || WAIVER_TEXT).slice(0, 1200),
      p_accepted_at: new Date(acceptedAtSeconds * 1000).toISOString(),
    });
  }
  return { status: 'complete', sync: await syncSubscription(deps, subscriptionId, { userHint: userId }) };
}

/* ── Webhook events ─────────────────────────────────────────────────────── */

/** The events the endpoint subscribes to. Anything else is recorded and
 * ignored. */
export const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'radar.early_fraud_warning.created',
] as const;

export interface EventOutcome {
  outcome: 'applied' | 'ignored';
  /** Why nothing changed, kept on the event row for the operator. */
  note?: string;
  sync?: SyncResult;
}

export async function processBillingEvent(deps: BillingDeps, event: Stripe.Event): Promise<EventOutcome> {
  const object = event.data.object as unknown as Record<string, unknown>;
  switch (event.type) {
    case 'checkout.session.completed': {
      const id = idOf(object);
      if (!id) throw new BillingPermanentError('malformed_event');
      const session = await deps.stripe.checkout.sessions.retrieve(id);
      if (session.mode !== 'subscription') return { outcome: 'ignored', note: 'not_a_subscription' };
      const applied = await applyCheckoutSession(deps, session, event.created);
      return applied.sync ? { outcome: 'applied', sync: applied.sync } : { outcome: 'ignored', note: `session_${applied.status}` };
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const id = idOf(object);
      if (!id) throw new BillingPermanentError('malformed_event');
      return { outcome: 'applied', sync: await syncSubscription(deps, id) };
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const id = idOf(object);
      if (!id) throw new BillingPermanentError('malformed_event');
      const invoice = await deps.stripe.invoices.retrieve(id);
      const subscriptionId = subscriptionOfInvoice(invoice);
      if (!subscriptionId) return { outcome: 'ignored', note: 'not_a_subscription' };
      return { outcome: 'applied', sync: await syncSubscription(deps, subscriptionId) };
    }
    case 'charge.refunded': {
      const id = idOf(object);
      if (!id) throw new BillingPermanentError('malformed_event');
      const charge = await deps.stripe.charges.retrieve(id);
      const full = charge.refunded === true || (charge.amount_captured > 0 && charge.amount_refunded >= charge.amount_captured);
      // A partial refund is a goodwill gesture; Premium stays as it is.
      if (!full) return { outcome: 'ignored', note: 'partial_refund' };
      const subscriptionId = await subscriptionForPayment(deps, idOf(charge.payment_intent), charge.id);
      if (!subscriptionId) return { outcome: 'ignored', note: 'not_a_subscription' };
      const note = `Revoked: charge ${charge.id} was refunded in full (${day(event.created)}).`;
      return { outcome: 'applied', sync: await revokeSubscription(deps, subscriptionId, note) };
    }
    case 'charge.dispute.created': {
      const dispute = object as unknown as Stripe.Dispute;
      const subscriptionId = await subscriptionForPayment(deps, idOf(dispute.payment_intent), idOf(dispute.charge));
      if (!subscriptionId) return { outcome: 'ignored', note: 'not_a_subscription' };
      const note = `Revoked: dispute ${dispute.id} opened on charge ${idOf(dispute.charge) ?? 'unknown'} (${day(event.created)}).`;
      return { outcome: 'applied', sync: await revokeSubscription(deps, subscriptionId, note) };
    }
    case 'radar.early_fraud_warning.created': {
      const warning = object as unknown as Stripe.Radar.EarlyFraudWarning;
      const chargeId = idOf(warning.charge);
      const subscriptionId = await subscriptionForPayment(deps, idOf(warning.payment_intent), chargeId);
      if (!subscriptionId) return { outcome: 'ignored', note: 'not_a_subscription' };
      // A refund costs less than the dispute that usually follows a warning.
      if (warning.actionable && chargeId) {
        try {
          await deps.stripe.refunds.create(
            { charge: chargeId, reason: 'fraudulent', metadata: { early_fraud_warning: warning.id } },
            { idempotencyKey: `devshark-efw-${warning.id}` },
          );
        } catch (error) {
          if (stripeErrorCode(error).code !== 'charge_already_refunded') throw error;
        }
      }
      const note = `Revoked: early fraud warning ${warning.id} on charge ${chargeId ?? 'unknown'}, refunded (${day(event.created)}).`;
      return { outcome: 'applied', sync: await revokeSubscription(deps, subscriptionId, note) };
    }
    default:
      return { outcome: 'ignored', note: 'unhandled_type' };
  }
}
