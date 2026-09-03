// Rate limiter for the Vercel serverless API.
//
// Two backends behind one entrypoint, `enforceRateLimit()`:
//
//   1. Upstash Redis (distributed) — used automatically when
//      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set. This is the
//      real limit: it holds across every cold serverless instance, closing the
//      gap the in-memory limiter can't (a burst spread over many fresh
//      instances). Recommended for production.
//
//   2. In-memory token bucket (`checkRateLimit`) — the fallback used when
//      Upstash isn't configured, or if a Redis call fails so we never hard-fail
//      a request on the limiter. Buckets are keyed per (endpoint, client IP)
//      and live in the module's Map, which persists across warm invocations of
//      the same instance. Not distributed, but enough to blunt the
//      "one script hammering one endpoint" abuse the app cares about
//      (leaderboard spam, report spam, admin-password guessing).
//
// Callers should prefer `await enforceRateLimit(...)`; `checkRateLimit()` stays
// exported for the fallback path and any sync call site.

import type { VercelRequest, VercelResponse } from './vercel-types.js';
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

export const RATE_LIMITS = {
  admin: { key: 'admin_gate', capacity: 5, refillPerSecond: 1 },
  quizSession: { key: 'quiz_session', capacity: 20, refillPerSecond: 20 / 60 },
  quizSubmit: { key: 'quiz_submit', capacity: 12, refillPerSecond: 12 / 60 },
  challengeScore: { key: 'challenge_score', capacity: 3, refillPerSecond: 10 / 3600 },
  challengeComplete: { key: 'challenge_complete', capacity: 12, refillPerSecond: 12 / 3600 },
  questionReport: { key: 'question_report', capacity: 3, refillPerSecond: 20 / 3600 },
  userMutation: { key: 'user_mutation', capacity: 20, refillPerSecond: 20 / 60 },
  flashcardMutation: { key: 'flashcard_mutation', capacity: 20, refillPerSecond: 20 / 60 },
  roadmapMutation: { key: 'roadmap_mutation', capacity: 20, refillPerSecond: 20 / 60 },
  roadmapAnswer: { key: 'roadmap_answer', capacity: 80, refillPerSecond: 80 / 60 },
  roadmapComplete: { key: 'roadmap_complete', capacity: 12, refillPerSecond: 12 / 60 },
  playCreate: { key: 'play_create', capacity: 5, refillPerSecond: 5 / 60 },
  playJoin: { key: 'play_join', capacity: 12, refillPerSecond: 12 / 60 },
  playState: { key: 'play_state', capacity: 60, refillPerSecond: 60 / 60 },
  playMutation: { key: 'play_mutation', capacity: 30, refillPerSecond: 30 / 60 },
  accountDelete: { key: 'account_delete', capacity: 2, refillPerSecond: 2 / 3600 },
  aiExplanation: { key: 'ai_explanation', capacity: 3, refillPerSecond: 5 / 3600 },
  codingRun: { key: 'coding_run', capacity: 30, refillPerSecond: 30 / 600 },
  codingDraft: { key: 'coding_draft', capacity: 60, refillPerSecond: 60 / 600 },
  codingReveal: { key: 'coding_reveal', capacity: 10, refillPerSecond: 10 / 3600 },
  githubConnect: { key: 'github_connect', capacity: 10, refillPerSecond: 10 / 3600 },
  githubSync: { key: 'github_sync', capacity: 6, refillPerSecond: 6 / 3600 },
} satisfies Record<string, RateLimitConfig>;

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

/* -------------------------------------------------------------------------- */
/* Distributed backend (Upstash Redis), lazily wired                          */
/* -------------------------------------------------------------------------- */

// `@upstash/ratelimit` + `@upstash/redis` are optional deps: present in
// package.json, but the limiter must not hard-depend on them at build time so
// the app keeps working (on the in-memory path) if they're absent or the env
// vars aren't set. Hence the lazy, guarded, cached import below.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** `true` when the distributed limiter has been configured via env vars. */
export function isDistributedRateLimitEnabled(): boolean {
  return !!(UPSTASH_URL && UPSTASH_TOKEN);
}

// One Ratelimit instance per config.key (per warm instance). `null` marks a
// backend that failed to initialise, so we don't retry the import every call.
type UpstashLimiter = { limit: (id: string) => Promise<{ success: boolean; reset: number }> };
const limiterCache = new Map<string, UpstashLimiter | null>();
let redisClient: unknown | null | undefined; // undefined = not tried yet

async function getUpstashLimiter(config: RateLimitConfig): Promise<UpstashLimiter | null> {
  if (!isDistributedRateLimitEnabled()) return null;
  if (limiterCache.has(config.key)) return limiterCache.get(config.key) ?? null;

  try {
    // Optional deps: `@ts-ignore` covers the "package not installed" case, and
    // the `as any` casts keep the block from hard-coupling to Upstash's types
    // (which may or may not be resolvable at typecheck time).
    // @ts-ignore — optional dependency, resolved at runtime in production
    const Ratelimit = ((await import('@upstash/ratelimit')) as any).Ratelimit;
    // @ts-ignore — optional dependency, resolved at runtime in production
    const Redis = ((await import('@upstash/redis')) as any).Redis;

    if (redisClient === undefined) {
      redisClient = new Redis({ url: UPSTASH_URL as string, token: UPSTASH_TOKEN as string });
    }

    // Map the token-bucket config onto a sliding window: `capacity` requests
    // per (capacity / refillPerSecond) seconds — i.e. the time it takes an
    // empty bucket to refill to full — which preserves the intended budget.
    const windowSeconds = Math.max(1, Math.round(config.capacity / config.refillPerSecond));
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.capacity, `${windowSeconds} s`),
      prefix: `rl:${config.key}`,
      analytics: false,
    }) as UpstashLimiter;

    limiterCache.set(config.key, limiter);
    return limiter;
  } catch {
    // Package missing or init failed — record the miss and fall back forever.
    limiterCache.set(config.key, null);
    return null;
  }
}

async function withLimiterDeadline<T>(promise: Promise<T>, timeoutMs = 500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('rate_limit_timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Enforce a rate limit, preferring the distributed Upstash backend and falling
 * back to the in-memory token bucket. Returns true if the request may proceed,
 * or false after writing a 429 (+ Retry-After) response.
 *
 *   if (!(await enforceRateLimit(req, res, { key: 'admin_gate', capacity: 5, refillPerSecond: 1 }))) return;
 */
export async function enforceRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  config: RateLimitConfig,
): Promise<boolean> {
  const limiter = await getUpstashLimiter(config);
  if (!limiter) return checkRateLimit(req, res, config);

  try {
    const id = clientIp(req);
    const { success, reset } = await withLimiterDeadline(limiter.limit(id));
    if (success) return true;

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    jsonError(res, 429, 'rate_limited', 'Too many requests. Try again shortly.');
    return false;
  } catch {
    // Redis unreachable mid-request — never hard-fail on the limiter; fall back
    // to the in-memory bucket so the endpoint stays available.
    return checkRateLimit(req, res, config);
  }
}
