import type { VercelRequest } from '@vercel/node';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || process.env.VITE_AUTH0_AUDIENCE;

const JWKS = AUTH0_DOMAIN
  ? createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`))
  : null;

/**
 * Whether server-side JWT verification is configured. When false, every
 * handler degrades to "trust the supplied auth0_id" (the legacy behaviour)
 * so the API keeps working in environments that haven't finished Auth0
 * setup yet. Production deployments MUST set AUTH0_DOMAIN to enforce auth.
 */
export const isAuthEnforced = !!JWKS;

export interface VerifiedUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface VerifiedRequest {
  ok: true;
  sub: string;
  user: VerifiedUser | null;
}

interface AuthFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

/**
 * Verify the request's Bearer token (when Auth0 is configured) and return
 * the resolved subject. Falls back to the supplied `claimedId` when JWKS is
 * not configured — this allows local development and the existing degraded
 * mode to keep working.
 *
 * Production note: deploy with `AUTH0_DOMAIN` set in the Vercel project env
 * so verification is enforced. Without it, anyone can pass an arbitrary
 * `auth0_id` in the request body.
 */
export async function authenticate(
  req: VercelRequest,
  claimedId?: string,
): Promise<VerifiedRequest | AuthFailure> {
  if (JWKS) {
    const header = req.headers.authorization || (req.headers.Authorization as string | undefined);
    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return { ok: false, status: 401, code: 'unauthorized', message: 'Bearer token required' };
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      return { ok: false, status: 401, code: 'unauthorized', message: 'Bearer token required' };
    }
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://${AUTH0_DOMAIN}/`,
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
      });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        return { ok: false, status: 401, code: 'invalid_token', message: 'Token has no subject' };
      }
      // Optional: enforce that the claimed id matches the verified sub.
      // We don't — it's enough that the server uses the verified sub.
      return {
        ok: true,
        sub: payload.sub,
        user: extractUser(payload),
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'verification_failed';
      return { ok: false, status: 401, code: 'invalid_token', message: reason };
    }
  }

  // Degraded mode: trust the claimed id. Logged so it's visible in Vercel logs.
  if (typeof claimedId !== 'string' || claimedId.length === 0 || claimedId.length > 256) {
    return { ok: false, status: 400, code: 'bad_request', message: 'auth0_id required' };
  }
  if (typeof process !== 'undefined' && process.env?.VERCEL === '1') {
    // Production-ish but no AUTH0_DOMAIN. Loud warning per request.
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        msg: 'auth.degraded_mode',
        hint: 'Set AUTH0_DOMAIN in Vercel env to enforce JWT verification',
      }),
    );
  }
  return { ok: true, sub: claimedId, user: null };
}

function extractUser(payload: JWTPayload): VerifiedUser {
  return {
    sub: payload.sub as string,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}
