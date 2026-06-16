// Shared server-side HTTP/DB helpers for the Vercel functions in `api/*`.
//
// Every route used to re-declare its own Supabase client, `jsonError`,
// `logEvent` and `withTimeout`. They now live here so the routes stay thin and
// the error envelope / log shape stays consistent across the API.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Service-role key bypasses RLS; the anon key is RLS-restricted. Both fall back
// to the anon key for local dev where only the anon key is configured.
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/**
 * Service-role-preferred client: bypasses RLS for trusted, auth-scoped writes.
 * Callers MUST verify identity (via `requireAuth`) and scope every query to the
 * verified subject before using it. Falls back to the anon key in local dev.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, clientOptions) : null;

/**
 * Anon-key client: subject to RLS. Used by public read paths (leaderboards,
 * health) and anonymous writes (question reports).
 */
export const supabaseAnon: SupabaseClient | null =
  supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey, clientOptions) : null;

/** Standard error envelope: `{ error: { code, message } }`. */
export function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

/** Structured single-line JSON log; Vercel ingests this natively. */
export function logEvent(route: string, event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), route, ...event }));
}

/**
 * Reject a pending DB call after `ms` so a hung Postgres can't burn the full
 * Vercel function slot. Routes surface this as `504 upstream_timeout`.
 */
export function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('supabase_timeout')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Type guard for a non-empty string no longer than `max`. */
export function isShortString(v: unknown, max = 256): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

/** Returns the value when it's a non-empty string within `max`, else `null`. */
export const str = (v: unknown, max: number): string | null =>
  isShortString(v, max) ? v : null;
