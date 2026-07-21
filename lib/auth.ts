import type { VercelRequest } from './vercel-types.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

// A keyless client used only to validate access tokens via auth.getUser(jwt).
// No session is persisted; each call verifies the token against Supabase Auth,
// which works regardless of the project's JWT signing algorithm.
const authClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export interface AuthResult {
  sub: string;
  payload: Record<string, unknown>;
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getBearer(req: VercelRequest): string | null {
  const raw = req.headers.authorization || req.headers.Authorization;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function withAuthDeadline<T>(promise: Promise<T>, timeoutMs = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthError(504, 'auth_timeout', 'Authentication service timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Verify the caller's Supabase access token and return the verified subject
 * (the Supabase user id / UUID).
 *
 * In production this is strictly required. Outside production, if Supabase env
 * vars are missing the helper falls back to trusting a client-supplied
 * `user_id` (in body or query) so local dev continues to work — but it logs a
 * warning and never accepts that fallback when NODE_ENV=production.
 */
export async function requireAuth(req: VercelRequest): Promise<AuthResult> {
  const token = getBearer(req);

  if (authClient) {
    if (!token) throw new AuthError(401, 'missing_token', 'Missing Bearer token');
    const { data, error } = await withAuthDeadline(authClient.auth.getUser(token));
    if (error || !data?.user?.id) {
      const status = typeof error?.status === 'number' ? error.status : 401;
      if (status >= 500) {
        throw new AuthError(503, 'auth_unavailable', 'Authentication service is unavailable');
      }
      throw new AuthError(401, 'invalid_token', 'Token verification failed');
    }
    return { sub: data.user.id, payload: data.user as unknown as Record<string, unknown> };
  }

  if (IS_PROD) {
    throw new AuthError(503, 'auth_not_configured', 'Authentication is not configured');
  }

  const body = (req.body || {}) as { user_id?: unknown; host_id?: unknown };
  const fallback =
    (typeof body.user_id === 'string' && body.user_id) ||
    (typeof body.host_id === 'string' && body.host_id) ||
    (typeof req.query.user_id === 'string' && req.query.user_id) ||
    (typeof req.query.host_id === 'string' && req.query.host_id);
  if (!fallback) throw new AuthError(401, 'missing_token', 'Missing Bearer token');

  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'warn',
      msg: 'requireAuth_dev_fallback',
      note: 'Trusting client-supplied user_id because Supabase env vars are not set. Configure Supabase env vars in production.',
    }),
  );
  return { sub: fallback, payload: { sub: fallback } };
}

/**
 * Verify auth, but return null on failure instead of throwing. Useful for
 * routes that have both authenticated and unauthenticated branches.
 */
export async function tryAuth(req: VercelRequest): Promise<AuthResult | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}
