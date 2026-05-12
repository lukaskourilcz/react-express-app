import type { VercelRequest } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || process.env.VITE_AUTH0_AUDIENCE;
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

// JWKS endpoint and remote key set; the JWKS is fetched lazily and cached
// by `jose` across invocations within the same warm function instance.
const issuer = AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN}/` : undefined;
const jwks =
  AUTH0_DOMAIN ? createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`)) : null;

export interface AuthResult {
  sub: string;
  payload: JWTPayload;
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

/**
 * Verify the caller's Auth0 access token and return the verified subject.
 *
 * In production this is strictly required. Outside production, if Auth0 env
 * vars are missing the helper falls back to trusting a client-supplied
 * `auth0_id` (in body or query) so local dev continues to work — but it
 * logs a warning and never accepts that fallback when NODE_ENV=production.
 */
export async function requireAuth(req: VercelRequest): Promise<AuthResult> {
  const token = getBearer(req);

  if (jwks && issuer) {
    if (!token) throw new AuthError(401, 'missing_token', 'Missing Bearer token');
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: AUTH0_AUDIENCE,
      });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new AuthError(401, 'invalid_token', 'Token missing sub claim');
      }
      return { sub: payload.sub, payload };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError(401, 'invalid_token', 'Token verification failed');
    }
  }

  if (IS_PROD) {
    throw new AuthError(503, 'auth_not_configured', 'Authentication is not configured');
  }

  const body = (req.body || {}) as { auth0_id?: unknown; auth0_sub?: unknown };
  const fallback =
    (typeof body.auth0_id === 'string' && body.auth0_id) ||
    (typeof body.auth0_sub === 'string' && body.auth0_sub) ||
    (typeof req.query.auth0_id === 'string' && req.query.auth0_id) ||
    (typeof req.query.auth0_sub === 'string' && req.query.auth0_sub);
  if (!fallback) throw new AuthError(401, 'missing_token', 'Missing Bearer token');

  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'warn',
      msg: 'requireAuth_dev_fallback',
      note: 'Trusting client-supplied auth0_id because AUTH0_DOMAIN is not set. Configure Auth0 env vars in production.',
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
