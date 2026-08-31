// Shared helpers for the Vercel serverless API handlers.
//
// Every function under api/ is its own serverless entrypoint, which is why the
// same Supabase-client setup, JSON error shape, structured logging, timeout
// guard and auth check used to be copy-pasted into each file. They now live
// here so there is a single source of truth.

import type { VercelRequest, VercelResponse } from './vercel-types.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AuthError, requireAuth, type AuthResult } from './auth';
import { SUBJECT_SCOPE_CATALOG } from '../shared/subject-catalog';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// The service-role key bypasses row-level security. Callers are always verified
// via requireAuth() and scoped to their own id, so using it server-side is safe.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

// No browser session to persist or refresh in a serverless function.
const SERVER_SIDE_AUTH = { auth: { persistSession: false, autoRefreshToken: false } } as const;
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

function incomingRequestId(req: VercelRequest): string {
  const raw = req.headers['x-request-id'] ?? req.headers['x-vercel-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && /^[A-Za-z0-9._:/-]{6,128}$/.test(value)
    ? value
    : randomUUID();
}

/** Give every handler/log/error a correlation id without logging request bodies. */
export function withRequestContext<T>(
  req: VercelRequest,
  res: VercelResponse,
  run: () => T,
): Promise<Awaited<T> | VercelResponse | void> {
  const requestId = incomingRequestId(req);
  res.setHeader('X-Request-Id', requestId);
  const started = Date.now();
  return requestContext.run({ requestId }, async () => {
    try {
      return await run();
    } catch (error) {
      logEvent('request', {
        level: 'error',
        method: req.method ?? 'UNKNOWN',
        path: req.url?.split('?')[0] ?? 'unknown',
        status: 500,
        category: error instanceof AuthError ? error.code : error instanceof Error ? error.name : 'unknown',
      });
      if (res.headersSent) return;
      if (error instanceof AuthError) {
        return jsonError(res, error.status, error.code, error.message);
      }
      return jsonError(res, 500, 'internal_error', 'Internal error');
    } finally {
      logEvent('request', {
        method: req.method ?? 'UNKNOWN',
        path: req.url?.split('?')[0] ?? 'unknown',
        status: res.statusCode ?? 200,
        latency_ms: Date.now() - started,
      });
    }
  }) as Promise<Awaited<T> | VercelResponse | void>;
}

/**
 * Client for endpoints that read/write a user's own private rows. Prefers the
 * service-role key (bypasses RLS); falls back to the anon key for local dev.
 */
export function createServiceClient(): SupabaseClient | null {
  // Treat an accidentally copied public anon key as unconfigured. It cannot
  // call the service-only learning RPCs and otherwise turns a clear readiness
  // failure into opaque database permission errors.
  if (IS_PROD && (
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY === ANON_KEY
  )) return null;
  return SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, SERVER_SIDE_AUTH)
    : null;
}

/**
 * Client for endpoints that only touch public data (leaderboards, health) or
 * accept anonymous writes (question reports). Always uses the anon key.
 */
export function createAnonClient(): SupabaseClient | null {
  return SUPABASE_URL && ANON_KEY
    ? createClient(SUPABASE_URL, ANON_KEY, SERVER_SIDE_AUTH)
    : null;
}

/** Send the app's standard `{ error: { code, message } }` JSON error response. */
export function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({
    error: { code, message, ...(requestContext.getStore()?.requestId ? { requestId: requestContext.getStore()!.requestId } : {}) },
  });
}

/** Emit one structured single-line JSON log entry (Vercel ingests this natively). */
export function logEvent(route: string, event: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    route,
    ...(requestContext.getStore()?.requestId ? { request_id: requestContext.getStore()!.requestId } : {}),
    ...event,
  }));
}

/** A logEvent bound to a fixed route, e.g. `const log = createLogger('quiz/submit')`. */
export function createLogger(route: string) {
  return (event: Record<string, unknown>) => logEvent(route, event);
}

/** Reject if the Supabase call hasn't settled within `ms`, so a hung upstream can't hang the request. */
export function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('supabase_timeout')), ms);
    Promise.resolve(p).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** True when a Supabase error means the RPC isn't installed yet (a schema migration is pending). */
export function isRpcMissing(error: { message?: string } | null | undefined): boolean {
  return !!error && /function .* does not exist/i.test(error.message ?? '');
}

/**
 * Verify the caller and return the whole verified result (subject id plus the
 * token claims). Use this instead of `requireAuthSub` when the handler also
 * needs a claim such as the email, so the token is only verified once. On
 * failure this sends the error response itself and returns null.
 */
export async function requireAuthResult(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthResult | null> {
  try {
    return await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      jsonError(res, err.status, err.code, err.message);
      return null;
    }
    jsonError(res, 500, 'internal_error', 'Auth failed');
    return null;
  }
}

/**
 * Verify the caller and return their subject id (Supabase user id). On failure
 * this sends the error response itself and returns null, so handlers can write:
 *
 *   const sub = await requireAuthSub(req, res);
 *   if (!sub) return;
 */
export async function requireAuthSub(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  return (await requireAuthResult(req, res))?.sub ?? null;
}

// Categories that count toward stats and leaderboards.
export const STATS_CATEGORIES: ReadonlySet<string> = new Set(
  Object.values(SUBJECT_SCOPE_CATALOG).flatMap((subject) => [...subject.categories]),
);
