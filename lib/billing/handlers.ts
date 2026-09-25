/** The billing routes, all `op=` branches of `api/user/[op].ts`:
 *
 *   POST /api/user/billing-checkout        { plan } → { url } of a Stripe Checkout Session
 *   GET  /api/user/billing-checkout?session_id=cs_…  the success page's lookup
 *   POST /api/user/billing-portal          → { url } of a Customer Portal session
 *   POST /api/user/billing-webhook         Stripe events, signed
 *   POST /api/user/billing-cancel          the public cancellation page
 *
 * Checkout needs BILLING_ENABLED; the other routes need only the Stripe key,
 * so people who already pay keep the portal and the cancel page when sales
 * are switched off. Only the signed webhook and the server-side session lookup
 * change an entitlement. */

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
import { cancelByEmail, cancelForDeletedAccount, sendCancellationEmail, type CancelAction } from './cancel';

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
/** The confirm step never answers faster than this, so a found and a missing
 * email take about as long. */
const CONFIRM_FLOOR_MS = 900;

export async function handleBillingCancel(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (req.method !== 'POST') return allow(res, 'POST');
  const started = Date.now();
  const body = (req.body || {}) as { email?: unknown; action?: unknown; step?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const action = body.action as CancelAction;
  if (!EMAIL.test(email) || email.length > 254) return jsonError(res, 400, 'bad_email', 'Enter the email address of your subscription');
  if (!ACTIONS.includes(action)) return jsonError(res, 400, 'bad_request', "action must be 'cancel' or 'withdraw'");
  res.setHeader('Cache-Control', 'no-store');

  // Step one only checks the form; nothing is looked up.
  if (body.step === 'request') return res.json({ step: 'confirm', action, email });
  if (body.step !== 'confirm') return jsonError(res, 400, 'bad_request', "step must be 'request' or 'confirm'");

  if (!(await enforceRateLimit(req, res, RATE_LIMITS.billingCancel))) return;
  const config = billingConfig();
  const deps = depsFor(config, supabase);
  if (!deps) return jsonError(res, 503, 'not_configured', 'Cancellation is not available on this deployment');

  const receivedAt = new Date().toISOString();
  let effects;
  try {
    effects = await cancelByEmail(deps, config, email, action);
  } catch (error) {
    return unavailable(res, error, 'cancel');
  }
  for (const effect of effects) await sendCancellationEmail(config, effect, receivedAt);

  // A signed-in owner of this address may see what changed; nobody else
  // learns whether the address has a subscription.
  let owner = false;
  try {
    const auth = await tryAuth(req);
    const authEmail = typeof auth?.payload.email === 'string' ? auth.payload.email.toLowerCase() : null;
    owner = authEmail !== null && authEmail === email.toLowerCase();
  } catch {
    owner = false;
  }
  const wait = CONFIRM_FLOOR_MS - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return res.json({
    received: true,
    action,
    email,
    receivedAt,
    emailed: Boolean(config.email),
    ...(owner ? { details: effects.map(({ withdrawn, refunded, endsAt }) => ({ withdrawn, refunded, endsAt })) } : {}),
  });
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
