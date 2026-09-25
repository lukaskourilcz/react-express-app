/* Billing contract (#221, SECOND-HANDOFF-25-9-2026.md section 3.5).
 *
 * Runs the real billing handlers against a fake Stripe API and an in-memory
 * model of the migration 039 routines. Nothing reaches Stripe: the client is
 * replaced through `setStripeForTests`, and sign-in is answered by a small
 * local Auth stand-in.
 *
 * The webhook payloads in scripts/fixtures/billing/ cover the nine subscribed
 * event types. They were written from Stripe's API reference for the pinned
 * version (2026-08-26.dahlia), not captured, because no Stripe account exists
 * yet; once the owner's sandbox exists, replace them with `stripe trigger`
 * captures (NEEDED.md). Each test signs its payload with
 * `stripe.webhooks.generateTestHeaderString`, the way Stripe signs a delivery.
 *
 * `runBillingSuite` takes the database as a parameter, so the same assertions
 * also run against a real Postgres holding migration 039 (the run recorded in
 * docs/release-acceptance.md). */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ── Environment ─────────────────────────────────────────────────────────── */

export const WEBHOOK_SECRET = 'whsec_devshark_contract_test';
export const PRICES = { monthly: 'price_1FixturePremiumMonthly', annual: 'price_1FixturePremiumAnnual' };

const BASE_ENV = {
  BILLING_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'sk_test_devshark_contract_never_sent',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_PREMIUM_MONTHLY: PRICES.monthly,
  STRIPE_PRICE_PREMIUM_ANNUAL: PRICES.annual,
  STRIPE_MANAGED_PAYMENTS: 'true',
  PUBLIC_ORIGIN: 'https://devshark.app',
};

function applyEnv(overrides: Record<string, string | undefined> = {}) {
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** Sign-in for the handlers: a local stand-in for Supabase Auth's /user. */
export const TOKENS = new Map<string, { id: string; email: string }>();

export async function startAuthStandIn(): Promise<Server> {
  const server = createServer((req, res) => {
    const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const user = TOKENS.get(token);
    res.setHeader('content-type', 'application/json');
    if (req.url?.startsWith('/auth/v1/user') && user) {
      res.end(JSON.stringify({ id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }));
      return;
    }
    res.statusCode = 401;
    res.end(JSON.stringify({ message: 'invalid token' }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // lib/auth.ts reads these when it loads, so set them before loading it.
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_ANON_KEY = 'anon-contract-test';
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
  delete process.env.RESEND_API_KEY;
  return server;
}

export async function loadLib() {
  const [stripe, handlers, config, cancel, sync, entitlements] = await Promise.all([
    import('../lib/billing/stripe'),
    import('../lib/billing/handlers'),
    import('../lib/billing/config'),
    import('../lib/billing/cancel'),
    import('../lib/billing/sync'),
    import('../lib/entitlements'),
  ]);
  return { ...stripe, ...handlers, ...config, ...cancel, ...sync, toEntitlementResponse: entitlements.toEntitlementResponse };
}
type Lib = Awaited<ReturnType<typeof loadLib>>;

/* ── The database ────────────────────────────────────────────────────────── */

export interface GrantView {
  source: string;
  status: string;
  subscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  note: string | null;
}

export interface Backend {
  name: string;
  supabase: SupabaseClient;
  addUser(id: string, email: string): Promise<void> | void;
  grants(userId: string): Promise<GrantView[]>;
  event(id: string): Promise<{ processed: boolean; error: string | null; attempts: number } | null>;
  consent(sessionId: string): Promise<{ userId: string; subscriptionId: string | null; waiverText: string } | null>;
}

type Row = {
  id: string; user_id: string; source: string; status: string; provider_subscription_id: string | null;
  provider_price_id: string | null; current_period_end: string | null; cancel_at_period_end: boolean;
  valid_until: string | null; note: string | null; updated_at: number;
};

/** An in-memory model of the migration 039 routines the billing code calls.
 * The rules mirror the SQL; the Postgres run proves the SQL itself. */
export function memoryBackend(): Backend {
  const users = new Map<string, string>();
  const grants: Row[] = [];
  const customers = new Map<string, string>();
  const events = new Map<string, { processed_at: number | null; attempted_at: number | null; attempts: number; error: string | null }>();
  const consents = new Map<string, { user_id: string; provider_subscription_id: string | null; waiver_text: string }>();
  let seq = 0;
  const live = (g: Row) => {
    const now = Date.now();
    if (g.source !== 'provider') return g.status === 'active' && (!g.valid_until || Date.parse(g.valid_until) > now);
    return g.status === 'active' || g.status === 'trialing'
      || (g.status === 'past_due' && !!g.current_period_end && Date.parse(g.current_period_end) + 7 * 86_400_000 > now);
  };
  const ok = (data: unknown) => ({ data, error: null });
  const fail = (message: string) => ({ data: null, error: { message } });
  const routines: Record<string, (a: Record<string, any>) => { data: unknown; error: { message: string } | null }> = {
    is_premium: (a) => ok(grants.some((g) => g.user_id === a.p_user && live(g))),
    entitlement_summary: (a) => {
      const best = grants.filter((g) => g.user_id === a.p_user && live(g)).sort((x, y) => {
        const end = (g: Row) => (g.source === 'provider' ? g.current_period_end : g.valid_until);
        const ex = end(x); const ey = end(y);
        if (ex === null || ey === null) return ex === ey ? 0 : ex === null ? -1 : 1;
        return Date.parse(ey) - Date.parse(ex) || Number(y.source === 'provider') - Number(x.source === 'provider');
      })[0];
      return ok(best
        ? { premium: true, source: best.source, status: best.status, currentPeriodEnd: best.current_period_end, cancelAtPeriodEnd: best.cancel_at_period_end, validUntil: best.valid_until, inGrace: best.source === 'provider' && best.status === 'past_due' }
        : { premium: false });
    },
    record_billing_event: (a) => {
      const now = Date.now();
      const row = events.get(a.p_event_id);
      if (!row) { events.set(a.p_event_id, { processed_at: null, attempted_at: now, attempts: 1, error: null }); return ok(true); }
      if (row.processed_at === null && (row.attempted_at === null || row.attempted_at < now - 60_000)) {
        row.attempted_at = now; row.attempts += 1; return ok(true);
      }
      return ok(false);
    },
    finish_billing_event: (a) => {
      const row = events.get(a.p_event_id);
      if (!row) return ok(false);
      row.processed_at = Date.now(); row.error = a.p_error ?? null; return ok(true);
    },
    release_billing_event: (a) => {
      const row = events.get(a.p_event_id);
      if (!row || row.processed_at !== null) return ok(false);
      row.attempted_at = null; row.error = a.p_error ?? null; return ok(true);
    },
    link_billing_customer: (a) => {
      for (const [user, customer] of customers) {
        if (customer === a.p_provider_customer_id && user !== a.p_user_id) return fail('billing_customer_conflict');
      }
      customers.set(a.p_user_id, a.p_provider_customer_id); return ok(true);
    },
    billing_customer_owner: (a) => ok([...customers].find(([, c]) => c === a.p_provider_customer_id)?.[0] ?? null),
    billing_account: (a) => ok({
      customerId: customers.get(a.p_user_id) ?? null,
      providerLive: grants.some((g) => g.user_id === a.p_user_id && g.source === 'provider' && live(g)),
    }),
    upsert_provider_entitlement: (a) => {
      const existing = grants.find((g) => g.provider_subscription_id === a.p_subscription_id);
      if (existing && existing.user_id !== a.p_user_id) return fail('subscription_owner_conflict');
      if (existing) {
        existing.status = existing.status === 'revoked' ? 'revoked' : a.p_status;
        existing.provider_price_id = a.p_price_id; existing.current_period_end = a.p_current_period_end;
        existing.cancel_at_period_end = Boolean(a.p_cancel_at_period_end); existing.note = a.p_note ?? existing.note;
        existing.updated_at = Date.now(); return ok(existing.id);
      }
      const row: Row = {
        id: `grant-${++seq}`, user_id: a.p_user_id, source: 'provider', status: a.p_status, provider_subscription_id: a.p_subscription_id,
        provider_price_id: a.p_price_id, current_period_end: a.p_current_period_end, cancel_at_period_end: Boolean(a.p_cancel_at_period_end),
        valid_until: null, note: a.p_note ?? null, updated_at: Date.now(),
      };
      grants.push(row); return ok(row.id);
    },
    grant_manual_entitlement: (a) => {
      const row: Row = {
        id: `grant-${++seq}`, user_id: a.p_user_id, source: 'manual', status: 'active', provider_subscription_id: null, provider_price_id: null,
        current_period_end: null, cancel_at_period_end: false, valid_until: a.p_valid_until ?? null, note: a.p_note, updated_at: Date.now(),
      };
      grants.push(row); return ok(row.id);
    },
    record_checkout_consent: (a) => {
      const existing = consents.get(a.p_session_id);
      if (existing && existing.user_id !== a.p_user_id) return fail('checkout_consent_conflict');
      if (existing) { existing.provider_subscription_id ??= a.p_subscription_id; return ok(true); }
      consents.set(a.p_session_id, { user_id: a.p_user_id, provider_subscription_id: a.p_subscription_id, waiver_text: a.p_waiver_text });
      return ok(true);
    },
  };
  const supabase = {
    rpc: async (name: string, args: Record<string, unknown>) =>
      routines[name] ? routines[name](args) : fail(`function public.${name}(...) does not exist`),
    auth: {
      admin: {
        getUserById: async (id: string) => users.has(id)
          ? { data: { user: { id, email: users.get(id) } }, error: null }
          : { data: { user: null }, error: { message: 'User not found', status: 404 } },
      },
    },
  } as unknown as SupabaseClient;
  return {
    name: 'memory',
    supabase,
    addUser: (id, email) => { users.set(id, email); },
    grants: async (userId) => grants.filter((g) => g.user_id === userId).map((g) => ({
      source: g.source, status: g.status, subscriptionId: g.provider_subscription_id, cancelAtPeriodEnd: g.cancel_at_period_end, note: g.note,
    })),
    event: async (id) => {
      const row = events.get(id);
      return row ? { processed: row.processed_at !== null, error: row.error, attempts: row.attempts } : null;
    },
    consent: async (sessionId) => {
      const row = consents.get(sessionId);
      return row ? { userId: row.user_id, subscriptionId: row.provider_subscription_id, waiverText: row.waiver_text } : null;
    },
  };
}

/* ── A fake Stripe API ───────────────────────────────────────────────────── */

const FIXTURES = join(process.cwd(), 'scripts/fixtures/billing');
const FIXTURE_TYPES = [
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
type FixtureType = (typeof FIXTURE_TYPES)[number];

/** The ids the fixtures use, rewritten per scenario. */
const FIXTURE_IDS = {
  user: '00000000-0000-4000-8000-00000000f1a1',
  sub: 'sub_1FixturePremium0001',
  cus: 'cus_FixturePremium01',
  cs: 'cs_test_a1FixturePremiumCheckout0001',
  inv: 'in_1FixturePremium0001',
  pi: 'pi_3FixturePremium0001',
  ch: 'ch_3FixturePremium0001',
  dp: 'dp_1FixturePremium0001',
  efw: 'issfr_1FixturePremium0001',
};
type Ids = typeof FIXTURE_IDS;

export function idsFor(tag: string, userId: string): Ids {
  return {
    user: userId, sub: `sub_${tag}`, cus: `cus_${tag}`, cs: `cs_test_${tag}Session0001`, inv: `in_${tag}`,
    pi: `pi_${tag}`, ch: `ch_${tag}`, dp: `dp_${tag}`, efw: `issfr_${tag}`,
  };
}

/** A fixture as Stripe would send it for these ids: indented JSON. */
export function eventText(type: FixtureType, ids: Ids, eventSuffix: string): string {
  let text = readFileSync(join(FIXTURES, `${type}.json`), 'utf8');
  for (const key of Object.keys(FIXTURE_IDS) as (keyof Ids)[]) text = text.split(FIXTURE_IDS[key]).join(ids[key]);
  const event = JSON.parse(text) as { id: string };
  event.id = `${event.id}_${eventSuffix}`;
  return JSON.stringify(event, null, 2);
}
const fixtureObject = (type: FixtureType, ids: Ids) =>
  structuredClone((JSON.parse(eventText(type, ids, 'x')) as { data: { object: any } }).data.object);

const stripeError = (statusCode: number, code: string, message = code) =>
  Object.assign(new Error(message), { statusCode, code, type: statusCode >= 500 ? 'StripeAPIError' : 'StripeInvalidRequestError' });

const DAY = 86_400;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export class FakeStripe {
  customers = new Map<string, any>();
  subs = new Map<string, any>();
  sessions = new Map<string, any>();
  invoices = new Map<string, any>();
  charges = new Map<string, any>();
  invoicePayments: any[] = [];
  refunds: Array<{ params: any; key?: string }> = [];
  createdSessions: any[] = [];
  portalSessions: any[] = [];
  customerCreates: Array<{ params: any; key?: string }> = [];
  calls = 0;
  failNext = new Map<string, unknown>();
  private seq = 0;
  private keys = new Map<string, any>();

  private call(name: string) {
    this.calls += 1;
    const failure = this.failNext.get(name);
    if (failure) { this.failNext.delete(name); throw failure; }
  }
  private get<T>(map: Map<string, T>, id: string, what: string): T {
    const value = map.get(id);
    if (!value) throw stripeError(404, 'resource_missing', `No such ${what}: '${id}'`);
    return structuredClone(value);
  }

  /** Seed a customer and a live subscription from the fixtures. */
  seed(ids: Ids, email: string, sub: { status?: string; periodEnd?: number; cancel?: boolean; metadataUser?: string | null } = {}) {
    this.customers.set(ids.cus, { id: ids.cus, object: 'customer', email, metadata: { supabase_user_id: ids.user } });
    this.setSub(ids, sub);
    this.sessions.set(ids.cs, fixtureObject('checkout.session.completed', ids));
    this.invoices.set(ids.inv, fixtureObject('invoice.paid', ids));
    this.charges.set(ids.ch, { ...fixtureObject('charge.refunded', ids), refunded: false, amount_refunded: 0 });
    this.invoicePayments.push({
      id: `inpay_${ids.inv.slice(3)}`, object: 'invoice_payment', amount_paid: 399, currency: 'eur', invoice: ids.inv, is_default: true,
      livemode: false, payment: { type: 'payment_intent', payment_intent: ids.pi }, status: 'paid',
      status_transitions: { canceled_at: null, paid_at: nowSeconds() },
    });
  }
  setSub(ids: Ids, sub: { status?: string; periodEnd?: number; cancel?: boolean; metadataUser?: string | null } = {}) {
    const base = this.subs.get(ids.sub) ?? fixtureObject('customer.subscription.created', ids);
    if (sub.status) base.status = sub.status;
    if (sub.periodEnd !== undefined) base.items.data[0].current_period_end = sub.periodEnd;
    else if (!this.subs.has(ids.sub)) base.items.data[0].current_period_end = nowSeconds() + 30 * DAY;
    if (sub.cancel !== undefined) base.cancel_at_period_end = sub.cancel;
    if (sub.metadataUser === null) base.metadata = {};
    else if (sub.metadataUser) base.metadata = { supabase_user_id: sub.metadataUser };
    this.subs.set(ids.sub, base);
  }

  api(): any {
    return {
      customers: {
        create: async (params: any, options?: { idempotencyKey?: string }) => {
          this.call('customers.create');
          this.customerCreates.push({ params, key: options?.idempotencyKey });
          if (options?.idempotencyKey && this.keys.has(options.idempotencyKey)) return this.keys.get(options.idempotencyKey);
          const customer = { id: `cus_new${++this.seq}`, object: 'customer', email: params.email ?? null, metadata: params.metadata ?? {} };
          this.customers.set(customer.id, customer);
          if (options?.idempotencyKey) this.keys.set(options.idempotencyKey, customer);
          return customer;
        },
        list: async (params: { email?: string }) => {
          this.call('customers.list');
          return { object: 'list', data: [...this.customers.values()].filter((c) => c.email === params.email), has_more: false };
        },
      },
      checkout: {
        sessions: {
          create: async (params: any) => {
            this.call('checkout.sessions.create');
            if (!this.customers.has(params.customer)) throw stripeError(400, 'resource_missing', `No such customer: '${params.customer}'`);
            this.createdSessions.push(params);
            const id = `cs_test_created${++this.seq}Session`;
            return { id, object: 'checkout.session', url: `https://checkout.stripe.com/c/pay/${id}` };
          },
          retrieve: async (id: string) => { this.call('checkout.sessions.retrieve'); return this.get(this.sessions, id, 'checkout.session'); },
        },
      },
      billingPortal: {
        sessions: {
          create: async (params: any) => {
            this.call('billingPortal.sessions.create');
            if (!this.customers.has(params.customer)) throw stripeError(400, 'resource_missing');
            this.portalSessions.push(params);
            return { id: 'bps_test', object: 'billing_portal.session', url: 'https://billing.stripe.com/p/session/test_contract' };
          },
        },
      },
      subscriptions: {
        retrieve: async (id: string) => { this.call('subscriptions.retrieve'); return this.get(this.subs, id, 'subscription'); },
        update: async (id: string, params: any) => {
          this.call('subscriptions.update');
          const sub = this.subs.get(id);
          if (!sub) throw stripeError(404, 'resource_missing');
          if (params.cancel_at_period_end !== undefined) sub.cancel_at_period_end = params.cancel_at_period_end;
          return structuredClone(sub);
        },
        cancel: async (id: string) => {
          this.call('subscriptions.cancel');
          const sub = this.subs.get(id);
          if (!sub) throw stripeError(404, 'resource_missing');
          sub.status = 'canceled'; sub.canceled_at = nowSeconds(); sub.ended_at = nowSeconds();
          return structuredClone(sub);
        },
        list: async (params: { customer: string }) => {
          this.call('subscriptions.list');
          return { object: 'list', data: [...this.subs.values()].filter((s) => s.customer === params.customer).map((s) => structuredClone(s)), has_more: false };
        },
      },
      invoices: {
        retrieve: async (id: string) => { this.call('invoices.retrieve'); return this.get(this.invoices, id, 'invoice'); },
        list: async (params: { subscription: string; status?: string }) => {
          this.call('invoices.list');
          const data = [...this.invoices.values()].filter((inv) =>
            inv.parent?.subscription_details?.subscription === params.subscription && (!params.status || inv.status === params.status));
          return { object: 'list', data: structuredClone(data), has_more: false };
        },
      },
      invoicePayments: {
        list: async (params: any) => {
          this.call('invoicePayments.list');
          const data = this.invoicePayments.filter((p) =>
            (params.payment ? p.payment.payment_intent === params.payment.payment_intent : true)
            && (params.invoice ? p.invoice === params.invoice : true)
            && (params.status ? p.status === params.status : true));
          const expand = (params.expand ?? []).includes('data.invoice');
          return { object: 'list', data: data.map((p) => ({ ...structuredClone(p), invoice: expand ? structuredClone(this.invoices.get(p.invoice)) : p.invoice })), has_more: false };
        },
      },
      charges: {
        retrieve: async (id: string) => { this.call('charges.retrieve'); return this.get(this.charges, id, 'charge'); },
      },
      refunds: {
        create: async (params: any, options?: { idempotencyKey?: string }) => {
          this.call('refunds.create');
          if (!options?.idempotencyKey || !this.refunds.some((r) => r.key === options.idempotencyKey)) {
            this.refunds.push({ params, key: options?.idempotencyKey });
          }
          return { id: `re_${++this.seq}`, object: 'refund', status: 'succeeded' };
        },
      },
    };
  }
}

/* ── Requests and responses ──────────────────────────────────────────────── */

export function mockRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    body: undefined as any,
    headersSent: false,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; this.headersSent = true; return this; },
    send(body: unknown) { this.body = body; this.headersSent = true; return this; },
    end() { this.headersSent = true; },
    setHeader(name: string, value: unknown) { this.headers[name.toLowerCase()] = value; return this; },
    redirect() { return this; },
  };
}

let ipSeq = 0;
const freshIp = () => `10.20.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

/** A webhook delivery. `stream` replays the raw bytes the way Vercel's
 * runtime does; `string`, `buffer` and `parsed` are what other runtimes hand
 * a handler. */
function webhookReq(raw: string, signature: string | null, mode: 'stream' | 'string' | 'buffer' | 'parsed' = 'stream') {
  const base = {
    method: 'POST',
    url: '/api/user/billing-webhook',
    headers: { 'content-type': 'application/json', ...(signature ? { 'stripe-signature': signature } : {}), 'x-forwarded-for': freshIp() },
    query: { op: 'billing-webhook' },
    socket: { remoteAddress: '127.0.0.1' },
  };
  const body = mode === 'string' ? raw : mode === 'buffer' ? Buffer.from(raw) : JSON.parse(raw);
  if (mode !== 'stream') return { ...base, body };
  return Object.assign(Readable.from([Buffer.from(raw)]), base, { body });
}

function apiReq(method: string, op: string, { token, body, query = {}, ip }: { token?: string; body?: unknown; query?: Record<string, string>; ip?: string } = {}) {
  return {
    method,
    url: `/api/user/${op}`,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-forwarded-for': ip ?? freshIp() },
    query: { op, ...query },
    body,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

const sign = (raw: string, secret = WEBHOOK_SECRET) => Stripe.webhooks.generateTestHeaderString({ payload: raw, secret });

/* ── The suite ───────────────────────────────────────────────────────────── */

let userSeq = 0;
const newUserId = () => `00000000-0000-4000-8000-${String(++userSeq).padStart(12, '0')}`;

export async function runBillingSuite(db: Backend, lib: Lib): Promise<number> {
  let checks = 0;
  const check = async (name: string, run: () => Promise<void>) => {
    try {
      await run();
      checks += 1;
    } catch (error) {
      console.error(`[${db.name}] ${name}`);
      throw error;
    }
  };
  applyEnv();
  const stripe = new FakeStripe();
  lib.setStripeForTests(stripe.api() as never);
  const supabase = db.supabase;

  const deliver = async (raw: string, mode: 'stream' | 'string' | 'buffer' | 'parsed' = 'stream', signature: string | null = sign(raw)) => {
    const res = mockRes();
    await lib.handleBillingWebhook(webhookReq(raw, signature, mode) as never, res as never, supabase);
    return res;
  };
  const premium = async (userId: string) => {
    const { data, error } = await supabase.rpc('is_premium', { p_user: userId });
    assert.equal(error, null);
    return data === true;
  };
  const summary = async (userId: string) => lib.toEntitlementResponse(
    (await supabase.rpc('entitlement_summary', { p_user: userId })).data,
  );
  const account = async (tag: string, sub: Parameters<FakeStripe['seed']>[2] = {}) => {
    const userId = newUserId();
    const email = `${tag.toLowerCase()}@example.com`;
    await db.addUser(userId, email);
    const token = `token-${tag}`;
    TOKENS.set(token, { id: userId, email });
    const ids = idsFor(tag, userId);
    stripe.seed(ids, email, sub);
    return { userId, email, token, ids };
  };
  const providerGrant = async (userId: string) => (await db.grants(userId)).find((g) => g.source === 'provider');

  /* Signatures ------------------------------------------------------------ */

  await check('unsigned, wrongly signed and tampered payloads answer 400', async () => {
    const a = await account('Sig1');
    const raw = eventText('customer.subscription.created', a.ids, 'sig');
    for (const res of [
      await deliver(raw, 'stream', null),
      await deliver(raw, 'stream', sign(raw, 'whsec_someone_else')),
      await deliver(raw.replace('"active"', '"trialing"'), 'stream', sign(raw)),
      await deliver(raw, 'stream', 't=1,v1=00'),
    ]) {
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.error.code, 'bad_signature');
    }
    assert.equal(await db.event(`evt_1FixtureSubscriptionCreated_sig`), null, 'an unsigned event is never recorded');
    assert.equal(await premium(a.userId), false);
    const old = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal((await deliver(raw)).statusCode, 503, 'no secret, no webhook');
    process.env.STRIPE_WEBHOOK_SECRET = old;
  });

  await check('the raw body verifies however the runtime hands it over', async () => {
    for (const mode of ['stream', 'string', 'buffer', 'parsed'] as const) {
      const a = await account(`Raw${mode}`);
      const res = await deliver(eventText('customer.subscription.created', a.ids, `raw${mode}`), mode);
      assert.equal(res.statusCode, 200, mode);
      assert.equal(await premium(a.userId), true, mode);
    }
    const raw = eventText('invoice.paid', idsFor('RawX', newUserId()), 'rawx');
    const candidates = await lib.rawBodyCandidates(webhookReq(raw, 'x', 'stream') as never);
    assert.equal(candidates[0], raw, 'the replayed bytes come first');
  });

  /* The subscription lifecycle, including a local billing simulation ------ */

  await check('checkout.session.completed opens Premium, links the customer and keeps the consent', async () => {
    const a = await account('Life1');
    const raw = eventText('checkout.session.completed', a.ids, 'life1');
    const res = await deliver(raw);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.outcome, 'applied');
    assert.equal(await premium(a.userId), true);
    const consent = await db.consent(a.ids.cs);
    assert.equal(consent?.userId, a.userId);
    assert.equal(consent?.subscriptionId, a.ids.sub);
    assert.match(consent?.waiverText ?? '', /lose my 14-day right of withdrawal for digital content/);
    assert.equal((await supabase.rpc('billing_customer_owner', { p_provider_customer_id: a.ids.cus })).data, a.userId);
    assert.deepEqual(await db.event('evt_1FixtureCheckoutCompleted_life1'), { processed: true, error: null, attempts: 1 });

    // A second delivery of the same event is a no-op: no Stripe call, no change.
    const before = stripe.calls;
    const again = await deliver(raw);
    assert.equal(again.statusCode, 200);
    assert.equal(again.body.duplicate, true);
    assert.equal(stripe.calls, before, 'a duplicate never reaches Stripe');
    assert.equal((await db.grants(a.userId)).length, 1);

    // Renewal: invoice.paid mirrors the new period from the live object.
    const renewed = nowSeconds() + 60 * DAY;
    stripe.setSub(a.ids, { periodEnd: renewed });
    assert.equal((await deliver(eventText('invoice.paid', a.ids, 'life1'))).statusCode, 200);
    assert.equal((await summary(a.userId)).currentPeriodEnd, new Date(renewed * 1000).toISOString());

    // Cancel at period end: Premium stays open and the plan line says so.
    stripe.setSub(a.ids, { cancel: true });
    await deliver(eventText('customer.subscription.updated', a.ids, 'life1'));
    assert.equal(await premium(a.userId), true);
    assert.equal((await summary(a.userId)).cancelAtPeriodEnd, true);
  });

  await check('past_due keeps Premium inside the seven-day grace and ends after it; canceled ends it', async () => {
    const a = await account('Grace1');
    await deliver(eventText('customer.subscription.created', a.ids, 'grace0'));
    stripe.setSub(a.ids, { status: 'past_due', periodEnd: nowSeconds() - 3 * DAY });
    assert.equal((await deliver(eventText('invoice.payment_failed', a.ids, 'grace1'))).statusCode, 200);
    assert.equal(await premium(a.userId), true, 'day 3 of the grace window');
    assert.equal((await summary(a.userId)).inGrace, true);
    stripe.setSub(a.ids, { status: 'past_due', periodEnd: nowSeconds() - 8 * DAY });
    await deliver(eventText('customer.subscription.updated', a.ids, 'grace2'));
    assert.equal(await premium(a.userId), false, 'day 8: the grace window is over');
    stripe.setSub(a.ids, { status: 'canceled' });
    await deliver(eventText('customer.subscription.deleted', a.ids, 'grace3'));
    assert.equal(await premium(a.userId), false);
    assert.equal((await providerGrant(a.userId))?.status, 'canceled');
  });

  await check('deleted before created ends canceled', async () => {
    const a = await account('Order1', { status: 'canceled' });
    assert.equal((await deliver(eventText('customer.subscription.deleted', a.ids, 'order1'))).statusCode, 200);
    assert.equal((await deliver(eventText('customer.subscription.created', a.ids, 'order1'))).statusCode, 200);
    assert.equal(await premium(a.userId), false);
    const grants = await db.grants(a.userId);
    assert.equal(grants.length, 1);
    assert.equal(grants[0].status, 'canceled');
  });

  await check('an unknown user is recorded and answered 200', async () => {
    const ghost = newUserId();
    const ids = idsFor('Ghost1', ghost);
    stripe.seed(ids, 'ghost@example.com');
    const res = await deliver(eventText('customer.subscription.created', ids, 'ghost1'));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.outcome, 'recorded');
    assert.equal(res.body.reason, 'unknown_user');
    const event = await db.event('evt_1FixtureSubscriptionCreated_ghost1');
    assert.equal(event?.processed, true);
    assert.match(event?.error ?? '', /^unknown_user/);
    assert.deepEqual(await db.grants(ghost), []);
    // No account id anywhere is just as unknown.
    const nobody = idsFor('Ghost2', newUserId());
    stripe.seed(nobody, 'nobody@example.com', { metadataUser: null });
    assert.equal((await deliver(eventText('customer.subscription.updated', nobody, 'ghost2'))).body.reason, 'unknown_user');
  });

  await check('a failure part-way is retried by the next delivery', async () => {
    const a = await account('Retry1');
    const raw = eventText('customer.subscription.created', a.ids, 'retry1');
    stripe.failNext.set('subscriptions.retrieve', stripeError(500, 'api_error'));
    const failed = await deliver(raw);
    assert.equal(failed.statusCode, 500);
    const event = await db.event('evt_1FixtureSubscriptionCreated_retry1');
    assert.equal(event?.processed, false);
    assert.equal(event?.error, 'api_error');
    const retried = await deliver(raw);
    assert.equal(retried.statusCode, 200);
    assert.equal(retried.body.outcome, 'applied');
    assert.equal(await premium(a.userId), true);
    assert.equal((await db.event('evt_1FixtureSubscriptionCreated_retry1'))?.attempts, 2);
  });

  /* Refunds, disputes and fraud warnings revoke ---------------------------- */

  await check('a full refund revokes, cancels the subscription and stays revoked', async () => {
    const a = await account('Refund1');
    await deliver(eventText('checkout.session.completed', a.ids, 'refund0'));
    assert.equal(await premium(a.userId), true);
    stripe.charges.get(a.ids.ch).refunded = true;
    stripe.charges.get(a.ids.ch).amount_refunded = 399;
    const res = await deliver(eventText('charge.refunded', a.ids, 'refund1'));
    assert.equal(res.statusCode, 200);
    assert.equal(await premium(a.userId), false);
    const grant = await providerGrant(a.userId);
    assert.equal(grant?.status, 'revoked');
    assert.match(grant?.note ?? '', /refunded in full/);
    assert.equal(stripe.subs.get(a.ids.sub).status, 'canceled', 'no further charges');
    // Stripe reporting the subscription active again changes nothing.
    stripe.setSub(a.ids, { status: 'active' });
    await deliver(eventText('customer.subscription.updated', a.ids, 'refund2'));
    assert.equal((await providerGrant(a.userId))?.status, 'revoked');
    assert.equal(await premium(a.userId), false);
  });

  await check('a partial refund only logs', async () => {
    const a = await account('Partial1');
    await deliver(eventText('customer.subscription.created', a.ids, 'partial0'));
    stripe.charges.get(a.ids.ch).amount_refunded = 100;
    const res = await deliver(eventText('charge.refunded', a.ids, 'partial1'));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.outcome, 'ignored');
    assert.equal(await premium(a.userId), true);
    assert.equal(stripe.subs.get(a.ids.sub).status, 'active');
  });

  await check('a dispute revokes at once with a note', async () => {
    const a = await account('Dispute1');
    await deliver(eventText('customer.subscription.created', a.ids, 'dispute0'));
    const res = await deliver(eventText('charge.dispute.created', a.ids, 'dispute1'));
    assert.equal(res.statusCode, 200);
    assert.equal(await premium(a.userId), false);
    const grant = await providerGrant(a.userId);
    assert.equal(grant?.status, 'revoked');
    assert.match(grant?.note ?? '', new RegExp(`dispute ${a.ids.dp}`));
  });

  await check('an early fraud warning refunds once and revokes', async () => {
    const a = await account('Fraud1');
    await deliver(eventText('customer.subscription.created', a.ids, 'fraud0'));
    const raw = eventText('radar.early_fraud_warning.created', a.ids, 'fraud1');
    assert.equal((await deliver(raw)).statusCode, 200);
    assert.equal(await premium(a.userId), false);
    const refunds = stripe.refunds.filter((r) => r.params.charge === a.ids.ch);
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0].params.reason, 'fraudulent');
    assert.equal(refunds[0].key, `devshark-efw-${a.ids.efw}`);
    await deliver(raw);
    assert.equal(stripe.refunds.filter((r) => r.params.charge === a.ids.ch).length, 1, 'a redelivery refunds nothing more');
  });

  await check('a manual grant survives every provider event', async () => {
    const a = await account('Manual1');
    await supabase.rpc('grant_manual_entitlement', { p_user_id: a.userId, p_valid_until: null, p_note: 'contract test' });
    stripe.charges.get(a.ids.ch).refunded = true;
    for (const type of FIXTURE_TYPES) {
      if (type === 'customer.subscription.deleted') stripe.setSub(a.ids, { status: 'canceled' });
      const res = await deliver(eventText(type, a.ids, `manual${type.replace(/\W/g, '')}`));
      assert.equal(res.statusCode, 200, type);
      assert.equal(await premium(a.userId), true, `still Premium after ${type}`);
      const manual = (await db.grants(a.userId)).filter((g) => g.source === 'manual');
      assert.equal(manual.length, 1);
      assert.equal(manual[0].status, 'active', `manual grant untouched by ${type}`);
    }
    assert.equal((await providerGrant(a.userId))?.status, 'revoked', 'the provider grant took the revocations');
  });

  /* Checkout --------------------------------------------------------------- */

  const checkout = async (token: string | undefined, body: unknown) => {
    const res = mockRes();
    await lib.handleBillingCheckout(apiReq('POST', 'billing-checkout', { token, body }) as never, res as never, supabase);
    return res;
  };

  await check('checkout refuses anonymous callers, bad plans and a closed shop', async () => {
    const a = await account('Checkout0');
    assert.equal((await checkout(undefined, { plan: 'monthly' })).statusCode, 401);
    assert.equal((await checkout(a.token, { plan: 'lifetime' })).statusCode, 400);
    applyEnv({ BILLING_ENABLED: 'false' });
    const closed = await checkout(a.token, { plan: 'monthly' });
    assert.equal(closed.statusCode, 503);
    assert.equal(closed.body.error.code, 'billing_disabled');
    applyEnv({ STRIPE_MANAGED_PAYMENTS: undefined });
    assert.equal((await checkout(a.token, { plan: 'monthly' })).body.error.code, 'billing_disabled', 'the tax mode is the owner’s explicit choice');
    applyEnv();
  });

  await check('checkout creates one customer and a Checkout Session with the legal terms', async () => {
    const userId = newUserId();
    await db.addUser(userId, 'buyer@example.com');
    TOKENS.set('token-Buyer', { id: userId, email: 'buyer@example.com' });
    const res = await checkout('token-Buyer', { plan: 'monthly' });
    assert.equal(res.statusCode, 200);
    assert.match(res.body.url, /^https:\/\/checkout\.stripe\.com\//);
    const params = stripe.createdSessions.at(-1);
    assert.equal(params.mode, 'subscription');
    assert.equal(params.client_reference_id, userId);
    assert.deepEqual(params.line_items, [{ price: PRICES.monthly, quantity: 1 }]);
    assert.equal(params.subscription_data.metadata.supabase_user_id, userId);
    assert.equal(params.success_url, 'https://devshark.app/premium/success?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(params.cancel_url, 'https://devshark.app/premium');
    assert.deepEqual(params.consent_collection, { terms_of_service: 'required' });
    assert.match(params.custom_text.terms_of_service_acceptance.message, /^I want Premium to start now and I understand that I lose my 14-day right of withdrawal for digital content\./);
    assert.match(params.custom_text.submit.message, /VAT included, renewed every month until you cancel/);
    assert.equal(params.submit_type, 'pay');
    assert.equal(params.allow_promotion_codes, true);
    assert.equal(params.locale, 'auto');
    assert.deepEqual(params.managed_payments, { enabled: true });
    assert.equal(params.automatic_tax, undefined, 'Managed Payments computes the tax itself');
    const customer = stripe.customerCreates.at(-1);
    assert.equal(customer?.key, `devshark-customer-${userId}`);
    assert.equal(customer?.params.email, 'buyer@example.com');
    const linked = (await supabase.rpc('billing_account', { p_user_id: userId })).data as { customerId: string };
    assert.ok(linked.customerId, 'the customer is linked to the account');

    // A second checkout reuses the customer; the annual plan takes its Price.
    const creates = stripe.customerCreates.length;
    await checkout('token-Buyer', { plan: 'annual' });
    assert.equal(stripe.customerCreates.length, creates);
    assert.deepEqual(stripe.createdSessions.at(-1).line_items, [{ price: PRICES.annual, quantity: 1 }]);
    assert.match(stripe.createdSessions.at(-1).custom_text.submit.message, /renewed every year/);

    // Plain Stripe with Stripe Tax behind the same flag.
    applyEnv({ STRIPE_MANAGED_PAYMENTS: 'false' });
    await checkout('token-Buyer', { plan: 'monthly' });
    const plain = stripe.createdSessions.at(-1);
    assert.deepEqual(plain.automatic_tax, { enabled: true });
    assert.deepEqual(plain.customer_update, { address: 'auto', name: 'auto' });
    assert.equal(plain.managed_payments, undefined);
    applyEnv();
  });

  await check('a live subscription is sent to the portal, and a deleted customer is replaced', async () => {
    const live = await account('Checkout1');
    await deliver(eventText('checkout.session.completed', live.ids, 'checkout1'));
    const refused = await checkout(live.token, { plan: 'monthly' });
    assert.equal(refused.statusCode, 409);
    assert.equal(refused.body.error.code, 'already_premium');

    const gone = await account('Checkout2');
    await supabase.rpc('link_billing_customer', { p_user_id: gone.userId, p_provider_customer_id: 'cus_goneCheckout2' });
    const res = await checkout(gone.token, { plan: 'monthly' });
    assert.equal(res.statusCode, 200);
    const relinked = (await supabase.rpc('billing_account', { p_user_id: gone.userId })).data as { customerId: string };
    assert.notEqual(relinked.customerId, 'cus_goneCheckout2');
  });

  /* The success page's session lookup -------------------------------------- */

  const lookup = async (token: string | undefined, sessionId: string) => {
    const res = mockRes();
    await lib.handleBillingCheckout(apiReq('GET', 'billing-checkout', { token, query: { session_id: sessionId } }) as never, res as never, supabase);
    return res;
  };

  await check('the success page applies its own completed session and nobody else’s', async () => {
    const a = await account('Success1');
    const b = await account('Success2');
    assert.equal((await lookup(undefined, a.ids.cs)).statusCode, 401);
    assert.equal((await lookup(a.token, 'cs_live_bad!')).statusCode, 400);
    assert.equal((await lookup(b.token, a.ids.cs)).statusCode, 404, 'another account’s session reads as missing');
    assert.equal((await lookup(a.token, 'cs_test_doesNotExist001')).statusCode, 404);

    stripe.sessions.get(a.ids.cs).status = 'open';
    stripe.sessions.get(a.ids.cs).payment_status = 'unpaid';
    const pending = await lookup(a.token, a.ids.cs);
    assert.equal(pending.statusCode, 200);
    assert.equal(pending.body.status, 'pending');
    assert.equal(pending.body.entitlement.tier, 'free');

    stripe.sessions.get(a.ids.cs).status = 'complete';
    stripe.sessions.get(a.ids.cs).payment_status = 'paid';
    const done = await lookup(a.token, a.ids.cs);
    assert.equal(done.statusCode, 200);
    assert.equal(done.body.status, 'complete');
    assert.equal(done.body.entitlement.tier, 'premium');
    assert.equal((await db.consent(a.ids.cs))?.userId, a.userId);

    // The webhook arriving afterwards changes nothing.
    await deliver(eventText('checkout.session.completed', a.ids, 'success1'));
    assert.equal((await db.grants(a.userId)).length, 1);
  });

  /* The Customer Portal ---------------------------------------------------- */

  await check('the portal needs a billing account and returns to the profile', async () => {
    const fresh = await account('Portal0');
    const portal = async (token?: string) => {
      const res = mockRes();
      await lib.handleBillingPortal(apiReq('POST', 'billing-portal', { token }) as never, res as never, supabase);
      return res;
    };
    assert.equal((await portal()).statusCode, 401);
    const none = await portal(fresh.token);
    assert.equal(none.statusCode, 404);
    assert.equal(none.body.error.code, 'no_billing_account');
    const payer = await account('Portal1');
    await deliver(eventText('checkout.session.completed', payer.ids, 'portal1'));
    const res = await portal(payer.token);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.url, /^https:\/\/billing\.stripe\.com\//);
    assert.deepEqual(stripe.portalSessions.at(-1), { customer: payer.ids.cus, return_url: 'https://devshark.app/profile' });
  });

  /* The public cancellation page ------------------------------------------- */

  const cancel = async (body: Record<string, unknown>, options: { token?: string; ip?: string } = {}) => {
    const res = mockRes();
    await lib.handleBillingCancel(apiReq('POST', 'billing-cancel', { body, ...options }) as never, res as never, supabase);
    return res;
  };

  await check('the cancel page never says whether an email exists', async () => {
    assert.equal((await cancel({ email: 'not-an-email', action: 'cancel', step: 'request' })).body.error.code, 'bad_email');
    const calls = stripe.calls;
    const first = await cancel({ email: 'someone@example.com', action: 'cancel', step: 'request' });
    assert.deepEqual(first.body, { step: 'confirm', action: 'cancel', email: 'someone@example.com' });
    assert.equal(stripe.calls, calls, 'step one looks nothing up');

    const k = await account('Cancel1');
    const started = Date.now();
    const unknown = await cancel({ email: 'nobody-here@example.com', action: 'cancel', step: 'confirm' });
    assert.ok(Date.now() - started >= 850, 'the confirm step keeps its time floor');
    const known = await cancel({ email: k.email.toUpperCase(), action: 'cancel', step: 'confirm' });
    assert.equal(unknown.statusCode, 200);
    assert.equal(known.statusCode, 200);
    assert.deepEqual(Object.keys(unknown.body).sort(), Object.keys(known.body).sort(), 'same answer shape either way');
    assert.equal(known.body.details, undefined, 'an anonymous caller sees no details');
    assert.equal(stripe.subs.get(k.ids.sub).cancel_at_period_end, true, 'the subscription ends at period end');
  });

  await check('a signed-in owner sees the effective date; cancel keeps Premium to the period end', async () => {
    const k = await account('Cancel2');
    await deliver(eventText('customer.subscription.created', k.ids, 'cancel2'));
    const res = await cancel({ email: k.email, action: 'cancel', step: 'confirm' }, { token: k.token });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.details.length, 1);
    assert.equal(res.body.details[0].withdrawn, false);
    assert.equal(res.body.details[0].endsAt, new Date(stripe.subs.get(k.ids.sub).items.data[0].current_period_end * 1000).toISOString());
    assert.equal(await premium(k.userId), true);
    assert.equal((await summary(k.userId)).cancelAtPeriodEnd, true);
    // A signed-in account asking about someone else's address learns nothing.
    const other = await account('Cancel3');
    const foreign = await cancel({ email: other.email, action: 'cancel', step: 'confirm' }, { token: k.token });
    assert.equal(foreign.body.details, undefined);
  });

  await check('a withdrawal within 14 days refunds in full and revokes; later it only cancels', async () => {
    const w = await account('Withdraw1');
    await deliver(eventText('customer.subscription.created', w.ids, 'withdraw1'));
    stripe.invoices.get(w.ids.inv).status_transitions.paid_at = nowSeconds() - 3 * DAY;
    const res = await cancel({ email: w.email, action: 'withdraw', step: 'confirm' }, { token: w.token });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.details.map((d: { withdrawn: boolean; refunded: boolean }) => [d.withdrawn, d.refunded]), [[true, true]]);
    const refund = stripe.refunds.find((r) => r.params.payment_intent === w.ids.pi);
    assert.equal(refund?.params.reason, 'requested_by_customer');
    assert.equal(refund?.key, `devshark-withdraw-inpay_${w.ids.inv.slice(3)}`);
    assert.equal(stripe.subs.get(w.ids.sub).status, 'canceled');
    assert.equal(await premium(w.userId), false);
    assert.equal((await providerGrant(w.userId))?.status, 'revoked');

    const late = await account('Withdraw2');
    await deliver(eventText('customer.subscription.created', late.ids, 'withdraw2'));
    stripe.invoices.get(late.ids.inv).status_transitions.paid_at = nowSeconds() - 20 * DAY;
    const lateRes = await cancel({ email: late.email, action: 'withdraw', step: 'confirm' }, { token: late.token });
    assert.equal(lateRes.body.details[0].withdrawn, false);
    assert.equal(stripe.refunds.some((r) => r.params.payment_intent === late.ids.pi), false);
    assert.equal(stripe.subs.get(late.ids.sub).cancel_at_period_end, true);
    assert.equal(await premium(late.userId), true);
  });

  await check('the confirm step is limited to five an hour per address and survives an outage', async () => {
    const ip = '10.99.0.1';
    for (let i = 0; i < 5; i++) {
      assert.equal((await cancel({ email: `limit${i}@example.com`, action: 'cancel', step: 'confirm' }, { ip })).statusCode, 200);
    }
    const limited = await cancel({ email: 'limit5@example.com', action: 'cancel', step: 'confirm' }, { ip });
    assert.equal(limited.statusCode, 429);
    stripe.failNext.set('customers.list', stripeError(500, 'api_error'));
    const outage = await cancel({ email: 'outage@example.com', action: 'cancel', step: 'confirm' });
    assert.equal(outage.statusCode, 502);
    assert.equal(outage.body.error.code, 'billing_unavailable');
  });

  /* Account deletion, settings, email --------------------------------------- */

  await check('deleting an account ends its subscriptions first', async () => {
    const d = await account('Delete1');
    await deliver(eventText('checkout.session.completed', d.ids, 'delete1'));
    assert.equal(await lib.endBillingForDeletedAccount(supabase, d.userId), true);
    assert.equal(stripe.subs.get(d.ids.sub).status, 'canceled');
    assert.equal(await lib.endBillingForDeletedAccount(supabase, newUserId()), true, 'no customer, nothing to end');
    const e = await account('Delete2');
    await deliver(eventText('checkout.session.completed', e.ids, 'delete2'));
    stripe.failNext.set('subscriptions.list', stripeError(500, 'api_error'));
    assert.equal(await lib.endBillingForDeletedAccount(supabase, e.userId), false, 'an outage stops the deletion');
  });

  await check('settings expose the two switches and the seller, and the origin is never taken from a guess', async () => {
    assert.deepEqual(lib.publicBillingSettings({}), { enabled: false, cancellable: false, seller: null });
    assert.deepEqual(lib.publicBillingSettings({ ...BASE_ENV }), { enabled: true, cancellable: true, seller: 'link' });
    assert.deepEqual(lib.publicBillingSettings({ ...BASE_ENV, BILLING_ENABLED: 'false' }), { enabled: false, cancellable: true, seller: 'link' });
    assert.equal(lib.publicBillingSettings({ ...BASE_ENV, STRIPE_MANAGED_PAYMENTS: 'false' }).seller, 'trader', 'plain Stripe: the trader sells');
    assert.equal(lib.publicBillingSettings({ ...BASE_ENV, STRIPE_MANAGED_PAYMENTS: undefined }).seller, null, 'unsaid: the Terms name no seller');
    assert.equal(lib.parseOrigin('javascript:alert(1)'), lib.DEFAULT_PUBLIC_ORIGIN);
    assert.equal(lib.parseOrigin('http://evil.example'), lib.DEFAULT_PUBLIC_ORIGIN);
    assert.equal(lib.parseOrigin('http://localhost:5173/path'), 'http://localhost:5173');
    assert.equal(lib.billingConfig({ ...BASE_ENV, STRIPE_MANAGED_PAYMENTS: 'yes' }).checkoutEnabled, false);
  });

  await check('the confirmation email names the date and goes to the subscription address', async () => {
    const effect = { subscriptionId: 'sub_x', customerEmail: 'payer@example.com', withdrawn: false, refunded: false, endsAt: '2026-11-12T10:00:00.000Z' };
    const mail = lib.cancellationEmail(effect, '2026-09-25T14:32:00.000Z', 'https://devshark.app');
    assert.match(mail.text, /We received your cancellation on 25 September 2026 at 14:32 UTC\./);
    assert.match(mail.text, /Premium stays open until 12 November 2026\. You will not be charged again\./);
    assert.match(lib.cancellationEmail({ ...effect, withdrawn: true, refunded: true }, '2026-09-25T14:32:00.000Z', 'https://devshark.app').text, /refunded your payment in full/);
    const sent: Array<{ url: string; body: any }> = [];
    const fakeFetch = (async (url: string, init: { body: string }) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200 }; }) as never;
    const config = lib.billingConfig({ ...BASE_ENV, RESEND_API_KEY: 're_test', RESEND_FROM: 'devShark <billing@devshark.app>' });
    assert.equal(await lib.sendCancellationEmail(config, effect, '2026-09-25T14:32:00.000Z', fakeFetch), true);
    assert.equal(sent[0].url, 'https://api.resend.com/emails');
    assert.deepEqual(sent[0].body.to, ['payer@example.com']);
    assert.equal(await lib.sendCancellationEmail(lib.billingConfig({ ...BASE_ENV }), effect, '2026-09-25T14:32:00.000Z', fakeFetch), false, 'no key, no email');
  });

  lib.setStripeForTests(null);
  return checks;
}

async function main() {
  const auth = await startAuthStandIn();
  try {
    const lib = await loadLib();
    const checks = await runBillingSuite(memoryBackend(), lib);
    console.log(`Billing contract passed (${checks} checks): signatures over the raw body, nine event types, duplicates, order, unknown accounts, retries, refunds, disputes, fraud warnings, manual grants, checkout, the success lookup, the portal, the public cancel page, account deletion and the switches.`);
  } finally {
    auth.close();
  }
}

if (!process.env.BILLING_SUITE_EXTERNAL) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
