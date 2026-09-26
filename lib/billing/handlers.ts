/** The billing routes, all `op=` branches of `api/user/[op].ts`:
 *
 *   POST /api/user/billing-checkout        { plan } → { url } of a Stripe Checkout Session
 *   GET  /api/user/billing-checkout?session_id=cs_…  the success page's lookup
 *   POST /api/user/billing-portal          → { url } of a Customer Portal session
 *   POST /api/user/billing-webhook         Stripe events, signed
 *   POST /api/user/billing-cancel          the public cancellation page and
 *                                          the link it emails
 *
 * Checkout needs BILLING_ENABLED; the other routes need only the Stripe key,
 * so people who already pay keep the portal and the cancel page when sales
 * are switched off. Only the signed webhook and the server-side session lookup
 * change an entitlement. */

import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import { createLogger, isRpcMissing, jsonError, requireAuthResult, withTimeout } from '../http';
import { tryAuth } from '../auth';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { toEntitlementResponse } from '../entitlements';
import { billingConfig, BILLING_PLANS, type BillingConfig, type BillingPlan } from './config';
import { stripeErrorCode, stripeFor, verifyStripeEvent, type StripeApi } from './stripe';
import {
  applyCheckoutSession,
  billingAccount,
  BillingMigrationError,
  BillingPermanentError,
  linkCustomer,
  processBillingEvent,
  WAIVER_TEXT,
  type BillingDeps,
} from './sync';
import {
  CANCEL_LINK_MINUTES,
  cancelByEmail,
  cancelForDeletedAccount,
  sendCancellationEmail,
  sendCancellationLinkEmail,
  type CancelAction,
  type CancelEffect,
} from './cancel';

const log = createLogger('user/billing');

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{8,240}$/;
const EVENT_ID = /^evt_[A-Za-z0-9_]{6,120}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

function allow(res: VercelResponse, methods: string) {
  res.setHeader('Allow', methods);
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

function unavailable(res: VercelResponse, error: unknown, route: string) {
  if (error instanceof BillingMigrationError) {
    return jsonError(res, 503, 'migration_required', 'Billing needs migration 039');
  }
  const { status, code, type } = stripeErrorCode(error);
  log({ status: 502, kind: route, reason: 'stripe_error', stripe_status: status, stripe_code: code, stripe_type: type });
  return jsonError(res, 502, 'billing_unavailable', 'The payment provider did not answer. Try again in a few minutes.');
}

/** The dependencies for one request, or null when Stripe is not configured. */
function depsFor(config: BillingConfig, supabase: SupabaseClient): BillingDeps | null {
  const stripe: StripeApi | null = stripeFor(config);
  return stripe ? { supabase, stripe } : null;
}

/* ── Checkout ───────────────────────────────────────────────────────────── */

/** The words around the order button. Checkout shows the price itself, in the
 * buyer's currency when Adaptive Pricing converts it, so the text names the
 * period and the terms rather than an amount. The owner's lawyer checks this
 * wording against § 1826a of the Czech Civil Code (NEEDED.md). */
export function checkoutText(plan: BillingPlan, origin: string) {
  const period = plan === 'annual' ? 'year' : 'month';
  return {
    terms_of_service_acceptance: { message: `${WAIVER_TEXT} I accept the [Terms](${origin}/terms).` },
    submit: {
      message:
        `Pay starts a subscription at the price shown, VAT included, renewed every ${period} until you cancel. ` +
        `Cancel any time from your profile or at ${origin}/premium/cancel; Premium stays open until the end of the period you paid for.`,
    },
  };
}

/** The Checkout Session for one plan. Exported for the tests. */
export function checkoutSessionParams(
  config: BillingConfig,
  plan: BillingPlan,
  userId: string,
  customerId: string,
): Stripe.Checkout.SessionCreateParams {
  const price = config.prices[plan];
  if (!price) throw new Error(`price_missing:${plan}`);
  return {
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { supabase_user_id: userId, plan } },
    metadata: { supabase_user_id: userId, plan },
    success_url: `${config.origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.origin}/premium`,
    allow_promotion_codes: true,
    consent_collection: { terms_of_service: 'required' },
    custom_text: checkoutText(plan, config.origin),
    // "Pay" is the order button that reads as an obligation to pay.
    submit_type: 'pay',
    locale: 'auto',
    ...(config.managedPayments
      ? { managed_payments: { enabled: true } }
      : {
          automatic_tax: { enabled: true },
          billing_address_collection: 'required' as const,
          customer_update: { address: 'auto' as const, name: 'auto' as const },
        }),
  };
}

async function createCustomer(deps: BillingDeps, userId: string, email: string | null, fresh: boolean): Promise<string> {
  const customer = await deps.stripe.customers.create(
    { ...(email ? { email } : {}), metadata: { supabase_user_id: userId } },
    // A double click creates one customer; a replacement for a deleted one
    // must not replay the original request.
    fresh ? undefined : { idempotencyKey: `devshark-customer-${userId}` },
  );
  await linkCustomer(deps, userId, customer.id);
  return customer.id;
}

async function startCheckout(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  const config = billingConfig();
  if (!config.checkoutEnabled) {
    return jsonError(res, 503, 'billing_disabled', 'Premium checkout is not open yet');
  }
  const auth = await requireAuthResult(req, res);
  if (!auth) return;
  const userId = auth.sub;
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.billingCheckout, `user:${userId}`))) return;
  const plan = (req.body as { plan?: unknown } | undefined)?.plan;
  if (typeof plan !== 'string' || !(BILLING_PLANS as readonly string[]).includes(plan)) {
    return jsonError(res, 400, 'bad_request', "plan must be 'monthly' or 'annual'");
  }
  const deps = depsFor(config, supabase)!;
  const email = typeof auth.payload.email === 'string' ? auth.payload.email : null;
  try {
    const account = await billingAccount(deps, userId);
    if (account.providerLive) {
      return jsonError(res, 409, 'already_premium', 'Your Premium subscription is active. Manage it from your profile.');
    }
    let customerId = account.customerId ?? (await createCustomer(deps, userId, email, false));
    let session: Stripe.Checkout.Session;
    try {
      session = await deps.stripe.checkout.sessions.create(checkoutSessionParams(config, plan as BillingPlan, userId, customerId));
    } catch (error) {
      // The stored customer was deleted at Stripe (a data deletion request
      // through Link does that). Start again with a new one.
      if (stripeErrorCode(error).code !== 'resource_missing') throw error;
      customerId = await createCustomer(deps, userId, email, true);
      session = await deps.stripe.checkout.sessions.create(checkoutSessionParams(config, plan as BillingPlan, userId, customerId));
    }
    if (!session.url) throw new Error('checkout_without_url');
    log({ status: 200, kind: 'checkout', plan, managed: config.managedPayments });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ url: session.url });
  } catch (error) {
    if (error instanceof BillingPermanentError) {
      log({ status: 409, kind: 'checkout', reason: error.code });
      return jsonError(res, 409, 'billing_conflict', 'This billing account belongs to someone else. Contact support.');
    }
    return unavailable(res, error, 'checkout');
  }
}

/** The success page asks whether its session opened Premium. When the webhook
 * has not arrived yet, this applies the same idempotent update from the live
 * session, so nobody waits on webhook latency. */
async function lookupSession(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  const auth = await requireAuthResult(req, res);
  if (!auth) return;
  const userId = auth.sub;
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.billingSession, `user:${userId}`))) return;
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  if (!SESSION_ID.test(sessionId)) return jsonError(res, 400, 'bad_request', 'session_id is not a Checkout Session id');
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!deps) return jsonError(res, 503, 'not_configured', 'Billing is not configured');
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    let session: Stripe.Checkout.Session;
    try {
      session = await deps.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      if (stripeErrorCode(error).code === 'resource_missing') return jsonError(res, 404, 'not_found', 'No such checkout');
      throw error;
    }
    // Another account's session reads exactly like a missing one.
    if (session.client_reference_id !== userId) return jsonError(res, 404, 'not_found', 'No such checkout');
    const outcome = await applyCheckoutSession(deps, session, Math.floor(Date.now() / 1000));
    const summary = await withTimeout(supabase.rpc('entitlement_summary', { p_user: userId }));
    if (summary.error && !isRpcMissing(summary.error)) throw new Error('db_error: entitlement_summary');
    log({ status: 200, kind: 'session', outcome: outcome.status });
    return res.json({ status: outcome.status, entitlement: toEntitlementResponse(summary.data) });
  } catch (error) {
    if (error instanceof BillingPermanentError) {
      log({ status: 409, kind: 'session', reason: error.code });
      return jsonError(res, 409, 'billing_conflict', 'This checkout could not be applied to your account. Contact support.');
    }
    return unavailable(res, error, 'session');
  }
}

export async function handleBillingCheckout(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (req.method === 'POST') return startCheckout(req, res, supabase);
  if (req.method === 'GET') return lookupSession(req, res, supabase);
  return allow(res, 'GET, POST');
}

/* ── Customer Portal ────────────────────────────────────────────────────── */

export async function handleBillingPortal(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (req.method !== 'POST') return allow(res, 'POST');
  const auth = await requireAuthResult(req, res);
  if (!auth) return;
  const userId = auth.sub;
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.billingPortal, `user:${userId}`))) return;
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!deps) return jsonError(res, 503, 'not_configured', 'Billing is not configured');
  try {
    const account = await billingAccount(deps, userId);
    if (!account.customerId) return jsonError(res, 404, 'no_billing_account', 'This account has no billing history yet');
    const portal = await deps.stripe.billingPortal.sessions.create({
      customer: account.customerId,
      return_url: `${config.origin}/profile`,
    });
    log({ status: 200, kind: 'portal' });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ url: portal.url });
  } catch (error) {
    if (stripeErrorCode(error).code === 'resource_missing') {
      return jsonError(res, 404, 'no_billing_account', 'This account has no billing history yet');
    }
    return unavailable(res, error, 'portal');
  }
}

/* ── Webhook ────────────────────────────────────────────────────────────── */

export async function handleBillingWebhook(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (req.method !== 'POST') return allow(res, 'POST');
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!config.webhookSecret || !deps) return jsonError(res, 503, 'not_configured', 'Billing is not configured');

  const event = await verifyStripeEvent(req, config.webhookSecret);
  if (!event) {
    log({ status: 400, kind: 'webhook', reason: 'bad_signature' });
    return jsonError(res, 400, 'bad_signature', 'Signature did not verify');
  }
  if (!EVENT_ID.test(event.id)) return jsonError(res, 400, 'bad_request', 'Malformed event id');
  const objectId = (event.data?.object as { id?: unknown } | undefined)?.id;

  // Record the event first. False: processed already, or another delivery is
  // processing it right now. Either way this delivery is done.
  const recorded = await withTimeout(supabase.rpc('record_billing_event', {
    p_event_id: event.id,
    p_type: event.type.slice(0, 100),
    p_object_id: typeof objectId === 'string' ? objectId.slice(0, 128) : null,
  })).catch((error: unknown) => ({ data: null, error: { message: error instanceof Error ? error.message : 'timeout' } }));
  if (recorded.error) {
    if (isRpcMissing(recorded.error)) return jsonError(res, 503, 'migration_required', 'Billing needs migration 039');
    log({ status: 500, kind: 'webhook', reason: 'record_failed' });
    return jsonError(res, 500, 'db_error', 'Could not record the event');
  }
  if (recorded.data !== true) {
    log({ status: 200, kind: 'webhook', type: event.type, duplicate: true });
    return res.json({ received: true, duplicate: true });
  }

  try {
    const result = await processBillingEvent(deps, event);
    await withTimeout(supabase.rpc('finish_billing_event', { p_event_id: event.id, p_error: result.note ?? null }));
    log({ status: 200, kind: 'webhook', type: event.type, outcome: result.outcome, note: result.note, status_after: result.sync?.status });
    return res.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (error instanceof BillingPermanentError) {
      // Recorded with its reason and answered 200: retrying for three days
      // would not make the account appear.
      await withTimeout(supabase.rpc('finish_billing_event', { p_event_id: event.id, p_error: error.message })).catch(() => undefined);
      log({ status: 200, kind: 'webhook', type: event.type, outcome: 'recorded', reason: error.code });
      return res.json({ received: true, outcome: 'recorded', reason: error.code });
    }
    // Anything else is worth a retry: hand the event back and answer 500.
    const reason = error instanceof BillingMigrationError ? 'migration_required' : stripeErrorCode(error).code ?? (error instanceof Error ? error.message : 'error');
    await withTimeout(supabase.rpc('release_billing_event', { p_event_id: event.id, p_error: String(reason).slice(0, 500) })).catch(() => undefined);
    log({ status: 500, kind: 'webhook', type: event.type, reason });
    return jsonError(res, 500, 'webhook_failed', 'The event could not be processed yet');
  }
}

/* ── The public cancellation page ───────────────────────────────────────── */

const ACTIONS: readonly CancelAction[] = ['cancel', 'withdraw'];
/** The confirm step never answers faster than this. A request from anyone but
 * a signed-in owner of the address makes no provider call at all, so its time
 * says nothing about whether the address has a subscription. */
const CONFIRM_FLOOR_MS = 900;
/** The link's token: 32 random bytes, base64url. Only its SHA-256 is stored. */
const LINK_TOKEN = /^[A-Za-z0-9_-]{43}$/;

const tokenHash = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

async function floor(started: number) {
  const wait = CONFIRM_FLOOR_MS - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/** A signed-in account whose verified, confirmed email is this address. */
async function signedInOwner(req: VercelRequest, email: string): Promise<boolean> {
  try {
    const auth = await tryAuth(req);
    const payload = (auth?.payload ?? {}) as { email?: unknown; email_confirmed_at?: unknown };
    return typeof payload.email === 'string'
      && Boolean(payload.email_confirmed_at)
      && payload.email.toLowerCase() === email.toLowerCase();
  } catch {
    return false;
  }
}

const receipt = (action: CancelAction, email: string, receivedAt: string, config: BillingConfig, effects: CancelEffect[]) => ({
  received: true as const,
  confirmed: true as const,
  action,
  email,
  receivedAt,
  emailed: Boolean(config.email),
  details: effects.map(({ withdrawn, refunded, endsAt }) => ({ withdrawn, refunded, endsAt })),
});

/**
 * The page's two steps, then the link (review finding integrity-1):
 *
 *   request   checks the form; nothing is looked up.
 *   confirm   a signed-in owner of the address: acts now and shows what
 *             changed. Anyone else: records the request and emails a
 *             single-use link to the address; nothing changes yet, and no
 *             provider is asked anything, so the answer is the same whether or
 *             not the address has a subscription.
 *   review    the link's page asks what the link is for, without using it.
 *   execute   the link's page confirms: the link is used and the request is
 *             carried out, with the time it was first made.
 */
export async function handleBillingCancel(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (req.method !== 'POST') return allow(res, 'POST');
  const started = Date.now();
  const body = (req.body || {}) as { email?: unknown; action?: unknown; step?: unknown; token?: unknown };
  res.setHeader('Cache-Control', 'no-store');
  if (body.step === 'review' || body.step === 'execute') return handleCancelLink(req, res, supabase, body.step, body.token);

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const action = body.action as CancelAction;
  if (!EMAIL.test(email) || email.length > 254) return jsonError(res, 400, 'bad_email', 'Enter the email address of your subscription');
  if (!ACTIONS.includes(action)) return jsonError(res, 400, 'bad_request', "action must be 'cancel' or 'withdraw'");

  // Step one only checks the form; nothing is looked up.
  if (body.step === 'request') return res.json({ step: 'confirm', action, email });
  if (body.step !== 'confirm') return jsonError(res, 400, 'bad_request', "step must be 'request', 'confirm', 'review' or 'execute'");

  if (!(await enforceRateLimit(req, res, RATE_LIMITS.billingCancel))) return;
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!deps) return jsonError(res, 503, 'not_configured', 'Cancellation is not available on this deployment');
  const receivedAt = new Date().toISOString();

  // Signed in with this very address: the mail is theirs already.
  if (await signedInOwner(req, email)) {
    let effects: CancelEffect[];
    try {
      effects = await cancelByEmail(deps, config, email, action);
    } catch (error) {
      return unavailable(res, error, 'cancel');
    }
    for (const effect of effects) await sendCancellationEmail(config, effect, receivedAt);
    return res.json(receipt(action, email, receivedAt, config, effects));
  }

  // Anyone else confirms through the address's mail. Without an email
  // provider there is no way to reach it, so only a signed-in owner can
  // cancel here; the page says so and offers the sign-in.
  if (!config.email) {
    await floor(started);
    return res.json({ received: false, confirmBy: 'sign-in', action, email });
  }
  const token = randomBytes(32).toString('base64url');
  const created = await withTimeout(supabase.rpc('create_billing_cancel_request', {
    p_token_hash: tokenHash(token),
    p_email: email,
    p_action: action,
    p_ttl_minutes: CANCEL_LINK_MINUTES,
    p_requested_at: receivedAt,
  })).catch(() => ({ data: null, error: { message: 'timeout' } }));
  if (created.error) {
    if (isRpcMissing(created.error)) return jsonError(res, 503, 'migration_required', 'Billing needs migration 039');
    log({ status: 500, kind: 'cancel_request', reason: 'db_error' });
    return jsonError(res, 500, 'db_error', 'Could not record your request. Try again in a minute.');
  }
  // False: this address already had three links in the hour. Nothing more is
  // sent, and the answer is the same, so the page cannot flood an inbox.
  if (created.data === true && !(await sendCancellationLinkEmail(config, email, action, token, receivedAt))) {
    return jsonError(res, 502, 'email_unavailable', 'We could not send the confirmation email. Try again in a few minutes.');
  }
  log({ status: 200, kind: 'cancel_request', action, sent: created.data === true });
  await floor(started);
  return res.json({ received: true, confirmBy: 'email', action, email, receivedAt, expiresInMinutes: CANCEL_LINK_MINUTES });
}

async function handleCancelLink(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient, step: 'review' | 'execute', raw: unknown) {
  const token = typeof raw === 'string' ? raw : '';
  if (!LINK_TOKEN.test(token)) return jsonError(res, 400, 'bad_link', 'This link is not complete. Open it again from the email.');
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.billingCancelLink))) return;
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!deps) return jsonError(res, 503, 'not_configured', 'Cancellation is not available on this deployment');
  const hash = tokenHash(token);
  const expired = () => jsonError(res, 410, 'link_expired', 'This link has expired or was used already. Start again on this page.');
  const read = async (name: string) => {
    const found = await withTimeout(supabase.rpc(name, { p_token_hash: hash }));
    if (found.error) throw isRpcMissing(found.error) ? new BillingMigrationError() : new Error(`db_error: ${name}`);
    const row = found.data as { email?: unknown; action?: unknown; requestedAt?: unknown; expiresAt?: unknown } | null;
    return row && typeof row.email === 'string' && ACTIONS.includes(row.action as CancelAction) && typeof row.requestedAt === 'string'
      ? { email: row.email, action: row.action as CancelAction, requestedAt: new Date(row.requestedAt).toISOString(), expiresAt: String(row.expiresAt ?? '') }
      : null;
  };

  let request: Awaited<ReturnType<typeof read>>;
  try {
    request = await read(step === 'review' ? 'review_billing_cancel_request' : 'consume_billing_cancel_request');
  } catch (error) {
    if (error instanceof BillingMigrationError) return jsonError(res, 503, 'migration_required', 'Billing needs migration 039');
    log({ status: 500, kind: `cancel_${step}`, reason: 'db_error' });
    return jsonError(res, 500, 'db_error', 'Could not read this link. Try again in a minute.');
  }
  if (!request) return expired();
  if (step === 'review') {
    return res.json({ action: request.action, email: request.email, requestedAt: request.requestedAt, expiresAt: request.expiresAt });
  }

  let effects: CancelEffect[];
  try {
    effects = await cancelByEmail(deps, config, request.email, request.action);
  } catch (error) {
    // The provider did not answer: hand the link back so it works again.
    await withTimeout(supabase.rpc('release_billing_cancel_request', { p_token_hash: hash })).catch(() => undefined);
    return unavailable(res, error, 'cancel');
  }
  for (const effect of effects) await sendCancellationEmail(config, effect, request.requestedAt);
  return res.json(receipt(request.action, request.email, request.requestedAt, config, effects));
}

/* ── Account deletion ───────────────────────────────────────────────────── */

/** Before an account is deleted, end its subscriptions at Stripe so it is
 * never charged again. True when nothing is left to charge; false when Stripe
 * could not be reached, and the deletion should stop. */
export async function endBillingForDeletedAccount(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!deps) return true;
  try {
    const account = await billingAccount(deps, userId);
    if (!account.customerId) return true;
    const ended = await cancelForDeletedAccount(deps, config, account.customerId);
    log({ status: 200, kind: 'account_deleted', ended });
    return true;
  } catch (error) {
    if (error instanceof BillingMigrationError) return true;
    if (stripeErrorCode(error).code === 'resource_missing') return true;
    log({ status: 502, kind: 'account_deleted', reason: 'stripe_error', stripe_code: stripeErrorCode(error).code });
    return false;
  }
}
