/** The public cancellation and withdrawal (`/premium/cancel`, § 312k BGB and
 * the EU withdrawal button). No sign-in: the buyer names the email of the
 * subscription and confirms. The server finds the Stripe customers with that
 * email and acts on their devShark subscriptions:
 *
 *   cancel    the subscription ends at the end of the paid period.
 *   withdraw  within 14 days of the first payment: every payment is refunded
 *             in full, the subscription ends now and the grant is revoked (the
 *             owner's voluntary refund policy, so nobody argues about the
 *             waiver). Later than that, a withdrawal is a cancellation.
 *
 * The HTTP answer never says whether anything was found; the details go by
 * email to the address on the subscription, and on screen only to a signed-in
 * owner of that address. */

import type Stripe from 'stripe';
import { logEvent } from '../http';
import type { BillingConfig } from './config';
import {
  BillingPermanentError,
  endsInsteadOfRenewing,
  idOf,
  LIVE_SUBSCRIPTION_STATUSES,
  periodEnd,
  revokeSubscription,
  syncSubscription,
  type BillingDeps,
} from './sync';
import { stripeErrorCode } from './stripe';

export type CancelAction = 'cancel' | 'withdraw';
export const WITHDRAWAL_DAYS = 14;

export interface CancelEffect {
  subscriptionId: string;
  customerEmail: string | null;
  /** The subscription ended now (a withdrawal) rather than at period end. */
  withdrawn: boolean;
  refunded: boolean;
  /** When Premium ends. */
  endsAt: string | null;
}

const log = (event: Record<string, unknown>) => logEvent('user/billing-cancel', event);

/** A devShark subscription: written by our checkout, or billing one of our
 * Prices. Anything else on a shared Stripe account is left alone. */
function isOurs(sub: Stripe.Subscription, config: BillingConfig): boolean {
  if (typeof sub.metadata?.supabase_user_id === 'string' && sub.metadata.supabase_user_id) return true;
  const ours = new Set([config.prices.monthly, config.prices.annual].filter(Boolean));
  return (sub.items?.data ?? []).some((item) => ours.has(idOf(item.price) ?? ''));
}

/** Mirror the change now so the Profile shows it at once. The webhook that
 * follows does the same; a failure here is logged and left to it. */
async function mirror(run: () => Promise<unknown>, subscriptionId: string) {
  try {
    await run();
  } catch (error) {
    log({ level: 'warn', kind: 'mirror_deferred', reason: error instanceof BillingPermanentError ? error.code : 'error', subscription: subscriptionId });
  }
}

async function cancelAtPeriodEnd(deps: BillingDeps, sub: Stripe.Subscription, email: string | null): Promise<CancelEffect> {
  const updated = endsInsteadOfRenewing(sub)
    ? sub
    : await deps.stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  await mirror(() => syncSubscription(deps, sub.id), sub.id);
  return { subscriptionId: sub.id, customerEmail: email, withdrawn: false, refunded: false, endsAt: periodEnd(updated) };
}

async function withdraw(deps: BillingDeps, sub: Stripe.Subscription, email: string | null): Promise<CancelEffect> {
  const now = deps.now?.() ?? Date.now();
  const invoices = await deps.stripe.invoices.list({ subscription: sub.id, status: 'paid', limit: 100 });
  const paidAt = invoices.data
    .map((invoice) => invoice.status_transitions?.paid_at)
    .filter((value): value is number => typeof value === 'number');
  const firstPaid = paidAt.length ? Math.min(...paidAt) * 1000 : null;
  if (firstPaid !== null && now - firstPaid > WITHDRAWAL_DAYS * 86_400_000) {
    // The withdrawal period is over: the request still ends the subscription.
    return cancelAtPeriodEnd(deps, sub, email);
  }

  let refunded = false;
  for (const invoice of invoices.data) {
    if (!invoice.amount_paid) continue;
    const payments = await deps.stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 10 });
    for (const payment of payments.data) {
      const paymentIntent = idOf(payment.payment?.payment_intent);
      const charge = idOf(payment.payment?.charge);
      if (!paymentIntent && !charge) continue;
      try {
        await deps.stripe.refunds.create(
          {
            ...(paymentIntent ? { payment_intent: paymentIntent } : { charge: charge! }),
            reason: 'requested_by_customer',
            metadata: { devshark: 'withdrawal', subscription: sub.id },
          },
          { idempotencyKey: `devshark-withdraw-${payment.id}` },
        );
        refunded = true;
      } catch (error) {
        if (stripeErrorCode(error).code !== 'charge_already_refunded') throw error;
        refunded = true;
      }
    }
  }
  const received = new Date(now).toISOString().slice(0, 10);
  const note = refunded
    ? `Revoked: withdrawal within ${WITHDRAWAL_DAYS} days of the first payment, refunded in full (${received}).`
    : `Revoked: withdrawal before any payment (${received}).`;
  await deps.stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false }).catch((error: unknown) => {
    if (stripeErrorCode(error).code !== 'resource_missing') throw error;
  });
  await mirror(() => revokeSubscription(deps, sub.id, note), sub.id);
  return { subscriptionId: sub.id, customerEmail: email, withdrawn: true, refunded, endsAt: new Date(now).toISOString() };
}

/** Act on every live devShark subscription of the customers with this email. */
export async function cancelByEmail(
  deps: BillingDeps,
  config: BillingConfig,
  email: string,
  action: CancelAction,
): Promise<CancelEffect[]> {
  const addresses = [...new Set([email, email.toLowerCase()])];
  const customers = new Map<string, Stripe.Customer>();
  for (const address of addresses) {
    const found = await deps.stripe.customers.list({ email: address, limit: 10 });
    for (const customer of found.data) customers.set(customer.id, customer);
  }
  const effects: CancelEffect[] = [];
  for (const customer of customers.values()) {
    const subs = await deps.stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 20 });
    for (const sub of subs.data) {
      if (!LIVE_SUBSCRIPTION_STATUSES.has(sub.status) || !isOurs(sub, config)) continue;
      effects.push(
        action === 'withdraw'
          ? await withdraw(deps, sub, customer.email ?? null)
          : await cancelAtPeriodEnd(deps, sub, customer.email ?? null),
      );
    }
  }
  log({ status: 200, kind: action, matched: effects.length > 0 ? 'some' : 'none' });
  return effects;
}

/** Cancel every live devShark subscription of an account that is being
 * deleted, at once, so a deleted account is never charged again. */
export async function cancelForDeletedAccount(deps: BillingDeps, config: BillingConfig, customerId: string): Promise<number> {
  const subs = await deps.stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  let ended = 0;
  for (const sub of subs.data) {
    if (!LIVE_SUBSCRIPTION_STATUSES.has(sub.status) || !isOurs(sub, config)) continue;
    await deps.stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
    ended += 1;
  }
  return ended;
}

/* ── The confirmation email (Resend, optional) ─────────────────────────── */

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));
const longTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso));

/** The email text for one effect. Exported for the tests. */
export function cancellationEmail(effect: CancelEffect, receivedAt: string, origin: string): { subject: string; text: string } {
  if (effect.withdrawn) {
    return {
      subject: 'Your devShark Premium withdrawal',
      text: [
        `We received your withdrawal on ${longTime(receivedAt)} UTC.`,
        effect.refunded
          ? 'Your subscription ended at once and we refunded your payment in full. Your bank may take 5 to 10 days to show it.'
          : 'Your subscription ended at once. You were not charged.',
        'Everything you passed stays in your account on the free plan.',
      ].join('\n\n'),
    };
  }
  return {
    subject: 'Your devShark Premium cancellation',
    text: [
      `We received your cancellation on ${longTime(receivedAt)} UTC.`,
      effect.endsAt
        ? `Premium stays open until ${longDate(effect.endsAt)}. You will not be charged again.`
        : 'Premium stays open until the end of the period you paid for. You will not be charged again.',
      `Changed your mind? Open Manage billing on your profile before that date: ${origin}/profile`,
    ].join('\n\n'),
  };
}

export async function sendCancellationEmail(
  config: BillingConfig,
  effect: CancelEffect,
  receivedAt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!config.email || !effect.customerEmail) return false;
  const { subject, text } = cancellationEmail(effect, receivedAt, config.origin);
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.email.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.email.from, to: [effect.customerEmail], subject, text }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) log({ level: 'warn', kind: 'email_failed', status: response.status });
    return response.ok;
  } catch {
    log({ level: 'warn', kind: 'email_failed', status: 0 });
    return false;
  }
}

