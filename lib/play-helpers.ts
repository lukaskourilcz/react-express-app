import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import type { VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Prefer the service-role key so server-side match reads/writes bypass RLS.
// Callers are verified via requireAuth() and scoped to their own id. Falls
// back to the anon key for local dev.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export function logEvent(route: string, event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), route, ...event }));
}

// Crockford base32 alphabet — no I/L/O/U so codes are easy to read aloud.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateMatchCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export function isShortString(v: unknown, max = 256): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}
