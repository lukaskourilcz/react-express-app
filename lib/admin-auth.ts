// Password gate for the /dev admin endpoints.
//
// Intentionally lightweight (per request): a single shared password, supplied
// in the `x-dev-password` header (or request body). The expected value comes
// from the DEV_PASSWORD env var, defaulting to 'autobus'. Set a strong
// DEV_PASSWORD in production — this gate exposes question answer keys.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { jsonError } from './http';

const DEV_PASSWORD = process.env.DEV_PASSWORD || 'autobus';

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
  if (constantTimeEquals(suppliedPassword(req), DEV_PASSWORD)) return true;
  jsonError(res, 401, 'unauthorized', 'Invalid dev password');
  return false;
}
