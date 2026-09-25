/** The Stripe client and the webhook signature check.
 *
 * Only the server talks to Stripe. The browser is redirected to Stripe's hosted
 * Checkout and Customer Portal pages: no Stripe.js, no iframe, and the CSP in
 * vercel.json stays as it is. */

import Stripe from 'stripe';
import type { VercelRequest } from '../vercel-types.js';
import type { BillingConfig } from './config';

/** The part of the Stripe client the billing code calls. Tests hand in a fake
 * with the same shape through `setStripeForTests`, so no test reaches Stripe. */
export type StripeApi = Pick<
  Stripe,
  'customers' | 'checkout' | 'billingPortal' | 'subscriptions' | 'invoices' | 'invoicePayments' | 'charges' | 'refunds'
>;

let testClient: StripeApi | null = null;
let cached: { key: string; client: StripeApi } | null = null;

/** Replace the Stripe client (tests only); null restores the real one. */
export function setStripeForTests(client: StripeApi | null): void {
  testClient = client;
}

/** The Stripe client for the configured key, or null without one. */
export function stripeFor(config: BillingConfig): StripeApi | null {
  if (testClient) return testClient;
  if (!config.secretKey) return null;
  if (cached?.key !== config.secretKey) {
    cached = {
      key: config.secretKey,
      client: new Stripe(config.secretKey, {
        // The function budget is ten seconds; one quick retry fits in it.
        maxNetworkRetries: 1,
        timeout: 7000,
        appInfo: { name: 'devShark', url: config.origin },
      }),
    };
  }
  return cached.client;
}

/** A Stripe API error, read without trusting its shape. */
export function stripeErrorCode(error: unknown): { status: number | null; code: string | null; type: string | null } {
  const e = (error && typeof error === 'object' ? error : {}) as Record<string, unknown>;
  return {
    status: typeof e.statusCode === 'number' ? e.statusCode : null,
    code: typeof e.code === 'string' ? e.code : null,
    type: typeof e.type === 'string' ? e.type : null,
  };
}

/* ── The raw body ─────────────────────────────────────────────────────────
 *
 * Stripe signs the exact bytes it sends. `op=payment-webhook` reads its body
 * as `req.body` when that is a string and re-serialises it otherwise; that is
 * enough for a provider that signs compact JSON, but Stripe sends indented
 * JSON, and `JSON.stringify` of the parsed object no longer matches it.
 *
 * Vercel's Node runtime buffers the request before the handler runs and then
 * replays the same bytes through the request's `data` and `end` events. So the
 * raw body is read from those events first. When a runtime has already
 * consumed the stream, the candidates fall back to what payment-webhook uses:
 * the body string, or the body re-serialised (compact, then with Stripe's
 * two-space indentation). Trying a candidate is safe: a signature only matches
 * bytes Stripe signed, and every candidate parses to the body the handler
 * then uses. */

type StreamLike = {
  on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => unknown;
  readableEnded?: boolean;
};

function readStream(req: VercelRequest, timeoutMs: number): Promise<string | null> {
  const stream = req as unknown as StreamLike;
  if (typeof stream.on !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stream.removeListener?.('data', onData);
      stream.removeListener?.('end', onEnd);
      stream.removeListener?.('error', onError);
      resolve(value);
    };
    const onData = (chunk: unknown) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
    };
    const onEnd = () => finish(chunks.length ? Buffer.concat(chunks).toString('utf8') : null);
    const onError = () => finish(null);
    const timer = setTimeout(() => finish(null), timeoutMs);
    stream.on!('data', onData);
    stream.on!('end', onEnd);
    stream.on!('error', onError);
  });
}

/** The strings the signature may cover, most faithful first. */
export async function rawBodyCandidates(req: VercelRequest, timeoutMs = 1500): Promise<string[]> {
  const out: string[] = [];
  const add = (value: string | null | undefined) => {
    if (typeof value === 'string' && value.length > 0 && !out.includes(value)) out.push(value);
  };
  add(await readStream(req, timeoutMs));
  const body = req.body as unknown;
  if (typeof body === 'string') add(body);
  else if (Buffer.isBuffer(body)) add(body.toString('utf8'));
  else if (body && typeof body === 'object') {
    add(JSON.stringify(body));
    add(JSON.stringify(body, null, 2));
  }
  return out;
}

/** Verify `Stripe-Signature` against the raw body and return the event, or
 * null when no candidate verifies. Uses Stripe's own verifier (HMAC-SHA256,
 * constant-time comparison, five-minute tolerance). */
export async function verifyStripeEvent(req: VercelRequest, secret: string): Promise<Stripe.Event | null> {
  const header = req.headers['stripe-signature'];
  const signature = Array.isArray(header) ? header[0] : header;
  if (typeof signature !== 'string' || signature.length === 0 || signature.length > 2000) return null;
  for (const candidate of await rawBodyCandidates(req)) {
    try {
      return Stripe.webhooks.constructEvent(candidate, signature, secret);
    } catch {
      // Try the next candidate; none verifying means the request is refused.
    }
  }
  return null;
}

export type { Stripe };
