// Password gate for the /dev admin endpoints.
//
// Intentionally lightweight (per request): a single shared password, supplied
// in the `x-dev-password` header (or request body). The expected value comes
// from the DEV_PASSWORD env var.
//
// Production posture: fail closed. If DEV_PASSWORD is missing on a prod
// deploy (Vercel production env, or NODE_ENV=production), every admin call
// is refused — no dev fallback is honoured, because this gate exposes the
// full question-editor surface incl. answer keys. Local development still
// gets the historical 'autobus' fallback so contributors can run the /dev
// console without wiring an env var.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { jsonError } from './http';

const IS_PROD = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const RAW_DEV_PASSWORD = process.env.DEV_PASSWORD;
// Sentinel that no supplied password can match (128 random-looking chars).
const DEV_PASSWORD =
  RAW_DEV_PASSWORD && RAW_DEV_PASSWORD.length > 0
    ? RAW_DEV_PASSWORD
    : IS_PROD
      ? '__admin_disabled__' + Math.random().toString(36).repeat(20)
      : 'autobus';
const ADMIN_DISABLED_IN_PROD = IS_PROD && (!RAW_DEV_PASSWORD || RAW_DEV_PASSWORD.length === 0);
if (ADMIN_DISABLED_IN_PROD) {
  console.warn('[admin-auth] DEV_PASSWORD is not set in production; admin API is disabled');
}

function constantTimeEquals(a: string, b: string): boolean {
  const ab = new Uint8Array(Buffer.from(a, 'utf8'));
  const bb = new Uint8Array(Buffer.from(b, 'utf8'));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function suppliedPassword(req: VercelRequest): string {
  const header = req.headers['x-dev-password'];
  if (typeof header === 'string') return header;
  if (Array.isArray(header)) return header[0] ?? '';
  const body = (req.body || {}) as { password?: unknown };
  return typeof body.password === 'string' ? body.password : '';
}

/** True if the request carries the correct dev password; else sends 401 and returns false. */
export function requireDevPassword(req: VercelRequest, res: VercelResponse): boolean {
  if (ADMIN_DISABLED_IN_PROD) {
    jsonError(res, 503, 'admin_disabled', 'Admin API is disabled');
    return false;
  }
  if (constantTimeEquals(suppliedPassword(req), DEV_PASSWORD)) return true;
  jsonError(res, 401, 'unauthorized', 'Invalid dev password');
  return false;
}
