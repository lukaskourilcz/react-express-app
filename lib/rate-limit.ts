// In-memory token-bucket rate limiter for Vercel serverless functions.
//
// Buckets are keyed per (endpoint, client IP) and live in the module's Map,
// which persists across warm invocations of the same function instance. This
// isn't a distributed limit — a burst hitting many cold instances can bypass
// it — but it's plenty to block the "one script hammering the same endpoint"
// abuse patterns the app cares about (leaderboard spam, report spam,
// admin-password guessing).
//
// If we ever need cross-instance limits we can swap this for Upstash / KV.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError } from './http';

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/** Per-endpoint bucket configuration. */
export interface RateLimitConfig {
  /** Max requests allowed in a full bucket. */
  capacity: number;
  /** Refill rate — tokens per second. */
  refillPerSecond: number;
  /** Namespace so different endpoints don't share buckets. */
  key: string;
}

const buckets = new Map<string, Bucket>();

// Trim any buckets that are effectively "full again" and haven't been touched
// recently, so a long-running instance can't slowly leak memory.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();
function maybeCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, b] of buckets) {
    if (now - b.updatedAt > CLEANUP_INTERVAL_MS && b.tokens >= 1) buckets.delete(k);
  }
}

/**
 * Extract the client IP from headers Vercel sets. Falls back to a stable
 * bucket key when nothing is available, which just means the whole
 * unknown-IP population shares one bucket — safe under abuse, mildly noisy
 * for legit users behind a shared proxy.
 */
function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).split(',')[0].trim();
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.length > 0) return real;
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Consume one token from the (endpoint, IP) bucket. Returns true if allowed,
 * or false + writes a 429 response with a Retry-After header.
 */
export function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  config: RateLimitConfig,
): boolean {
  const now = Date.now();
  maybeCleanup(now);

  const key = `${config.key}:${clientIp(req)}`;
  const b = buckets.get(key) ?? { tokens: config.capacity, updatedAt: now };
  const elapsedSeconds = (now - b.updatedAt) / 1000;
  const refilled = Math.min(config.capacity, b.tokens + elapsedSeconds * config.refillPerSecond);

  if (refilled < 1) {
    const retryAfter = Math.ceil((1 - refilled) / config.refillPerSecond);
    buckets.set(key, { tokens: refilled, updatedAt: now });
    res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
    jsonError(res, 429, 'rate_limited', 'Too many requests. Try again shortly.');
    return false;
  }

  buckets.set(key, { tokens: refilled - 1, updatedAt: now });
  return true;
}
