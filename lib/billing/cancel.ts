/** The public cancellation and withdrawal (`/premium/cancel`, § 312k BGB and
 * the EU withdrawal button). No sign-in needed: the buyer names the email of
 * the subscription and confirms. The server acts on an address only once the
 * person who typed it has shown they read its mail: a signed-in owner of the
 * address at once, anyone else through a single-use link sent to it
 * (`handleBillingCancel`). Then it finds the Stripe customers with that email
 * and acts on their devShark subscriptions:
 *
 *   cancel    the subscription ends at the end of the paid period.
 *   withdraw  within 14 days of the account's first payment, and once per
 *             account: every payment of the subscription is refunded in full,
 *             it ends now and the grant is revoked (the owner's voluntary
 *             refund policy, so nobody argues about the waiver). Otherwise a
 *             withdrawal is a cancellation.
 *
 * Nothing on the page says whether an address has a subscription before its
 * mail was read; the details go by email to the address on the subscription. */

import type Stripe from 'stripe';
import { isRpcMissing, logEvent, withTimeout } from '../http';
import { premiumPriceIds, type BillingConfig } from './config';
import {
  BillingMigrationError,
  BillingPermanentError,
  customerOwner,
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
/** The Stripe customer metadata key that remembers a voluntary refund, so an
 * account deleted and made again with the same address does not get a
 * second one. */
export const REFUND_MARK = 'devshark_voluntary_refund';

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
 * Prices. Anything else on a shared Stripe account is left alone. Broader than
 * `billsPremium` on purpose: a subscription our checkout made can always be
 * cancelled here, whatever it bills now. */
function isOurs(sub: Stripe.Subscription, config: BillingConfig): boolean {
  if (typeof sub.metadata?.supabase_user_id === 'string' && sub.metadata.supabase_user_id) return true;
  const ours = premiumPriceIds(config);
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

/** When the account first paid anything: the earliest paid invoice of every
 * Stripe customer that shares the address, so a second subscription, or an
 * account deleted and made again, does not start a new refund window
 * (finding integrity-2). Milliseconds, or null before any payment. */
async function firstPaymentAt(deps: BillingDeps, customerIds: readonly string[]): Promise<number | null> {
  let first: number | null = null;
  for (const customer of new Set(customerIds)) {
    const invoices = await deps.stripe.invoices.list({ customer, status: 'paid', limit: 100 });
    for (const invoice of invoices.data) {
      const paidAt = invoice.status_transitions?.paid_at;
      if (typeof paidAt === 'number' && (first === null || paidAt < first)) first = paidAt;
    }
  }
  return first === null ? null : first * 1000;
}

/** Take the account's one voluntary refund for this subscription. False when
 * the account took it for another subscription, when a customer that shares
 * the address carries the mark of one, or when the account is unknown. */
async function claimRefund(deps: BillingDeps, sub: Stripe.Subscription, customers: readonly Stripe.Customer[]): Promise<boolean> {
  const marked = customers.some((customer) => {
    const mark = customer.metadata?.[REFUND_MARK];
    return typeof mark === 'string' && mark.length > 0 && mark !== sub.id;
  });
  if (marked) return false;
  const customerId = idOf(sub.customer);
  const fromMetadata = typeof sub.metadata?.supabase_user_id === 'string' && sub.metadata.supabase_user_id ? sub.metadata.supabase_user_id : null;
  const userId = fromMetadata ?? (customerId ? await customerOwner(deps, customerId) : null);
  if (!userId) return false;
  const { data, error } = await withTimeout(deps.supabase.rpc('claim_voluntary_refund', { p_user_id: userId, p_subscription_id: sub.id }));
  if (error) {
    if (isRpcMissing(error)) throw new BillingMigrationError();
    throw new Error('db_error: claim_voluntary_refund');
  }
  if (data !== true) return false;
  if (customerId) await deps.stripe.customers.update(customerId, { metadata: { [REFUND_MARK]: sub.id } });
  return true;
}

async function withdraw(
  deps: BillingDeps,
  sub: Stripe.Subscription,
  email: string | null,
  customers: readonly Stripe.Customer[],
): Promise<CancelEffect> {
  const now = deps.now?.() ?? Date.now();
  const customerIds = [...customers.map((customer) => customer.id), idOf(sub.customer)].filter((id): id is string => Boolean(id));
  const firstPaid = await firstPaymentAt(deps, customerIds);
  if (firstPaid !== null && now - firstPaid > WITHDRAWAL_DAYS * 86_400_000) {
    // The withdrawal period is over: the request still ends the subscription.
    return cancelAtPeriodEnd(deps, sub, email);
  }
  const invoices = await deps.stripe.invoices.list({ subscription: sub.id, status: 'paid', limit: 100 });
  const charged = invoices.data.filter((invoice) => invoice.amount_paid > 0);
  // Money to give back: the account's one voluntary refund. Taken already, it
  // is a cancellation at the end of the paid period.
  if (charged.length > 0 && !(await claimRefund(deps, sub, customers))) {
    log({ status: 200, kind: 'withdraw', reason: 'refund_already_used' });
    return cancelAtPeriodEnd(deps, sub, email);
  }

  let refunded = false;
  for (const invoice of charged) {
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
  const all = [...customers.values()];
  for (const customer of all) {
    const subs = await deps.stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 20 });
    for (const sub of subs.data) {
      if (!LIVE_SUBSCRIPTION_STATUSES.has(sub.status) || !isOurs(sub, config)) continue;
      effects.push(
        action === 'withdraw'
          ? await withdraw(deps, sub, customer.email ?? null, all)
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

/* ── The emails (Resend) ────────────────────────────────────────────────── */

/** How long a confirmation link works. */
export const CANCEL_LINK_MINUTES = 60;

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));
const longTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso));

/** The receipt for one effect. Exported for the tests. */
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

/** The link that confirms a request made on the page. The token sits after
 * `#`, so it never reaches a server log or a Referer header. Exported for the
 * tests. */
export function cancellationLinkEmail(action: CancelAction, token: string, receivedAt: string, origin: string): { subject: string; text: string } {
  const what = action === 'withdraw' ? 'withdraw from' : 'cancel';
  return {
    subject: action === 'withdraw' ? 'Confirm your devShark Premium withdrawal' : 'Confirm your devShark Premium cancellation',
    text: [
      `On ${longTime(receivedAt)} UTC someone asked on devshark.app to ${what} the devShark Premium subscription of this email address.`,
      `If it was you, open this link within ${CANCEL_LINK_MINUTES} minutes and confirm: ${origin}/premium/cancel#confirm=${token}`,
      'Nothing changes until you confirm. If it was not you, or no devShark Premium subscription uses this address, ignore this email.',
    ].join('\n\n'),
  };
}

async function sendEmail(
  config: BillingConfig,
  to: string,
  message: { subject: string; text: string },
  fetchImpl: typeof fetch,
): Promise<boolean> {
  if (!config.email) return false;
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.email.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.email.from, to: [to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) log({ level: 'warn', kind: 'email_failed', status: response.status });
    return response.ok;
  } catch {
    log({ level: 'warn', kind: 'email_failed', status: 0 });
    return false;
  }
}

export async function sendCancellationEmail(
  config: BillingConfig,
  effect: CancelEffect,
  receivedAt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!effect.customerEmail) return false;
  return sendEmail(config, effect.customerEmail, cancellationEmail(effect, receivedAt, config.origin), fetchImpl);
}

export async function sendCancellationLinkEmail(
  config: BillingConfig,
  to: string,
  action: CancelAction,
  token: string,
  receivedAt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  return sendEmail(config, to, cancellationLinkEmail(action, token, receivedAt, config.origin), fetchImpl);
}
