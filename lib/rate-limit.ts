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
//      a request on the limiter. Buckets are keyed per (endpoint, caller): the
//      identity a handler passes, always `user:<verified id>`, or the client
//      IP when it passes none. They live in the module's Map, which persists
//      across warm invocations of the same instance. Not distributed, but
//      enough to blunt the "one script hammering one endpoint" abuse the app
//      cares about (leaderboard spam, report spam, admin-password guessing).
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

/**
 * How many people may legitimately share one public address inside one room.
 *
 * This is a statement about networks, not a product cap. A school class is
 * about thirty pupils and a school NATs all of them onto one address, so every
 * `play` bucket below that is keyed by address has to hold a whole class, or
 * a classroom round 429s its own participants. Thirty pupils, the teacher,
 * and one spare.
 *
 * The per-person limits are enforced separately, per verified account, so
 * raising these does not widen what any one learner may do.
 */
export const SHARED_NETWORK_SEATS = 32;

export const RATE_LIMITS = {
  admin: { key: 'admin_gate', capacity: 5, refillPerSecond: 1 },
  quizSession: { key: 'quiz_session', capacity: 20, refillPerSecond: 20 / 60 },
  // Grading and the Challenge have two tiers, like `play` below. The address
  // buckets hold a class behind one NAT: a Challenge sends one submit per
  // question, so a class playing it at once spent the old one-person budget
  // in seconds. Each caller is then bounded by a bucket of their own: a
  // signed-in caller's account, or, for a Challenge played without an
  // account, the run id sealed in its session or run token (`run:<runId>`),
  // with the same budget, so a class of guests is not held to one person's
  // rate. Any other caller without an account keeps the address rate these
  // endpoints had before the split.
  quizSubmit: { key: 'quiz_submit', capacity: SHARED_NETWORK_SEATS * 12, refillPerSecond: (SHARED_NETWORK_SEATS * 12) / 60 },
  quizSubmitPerUser: { key: 'quiz_submit_user', capacity: 12, refillPerSecond: 12 / 60 },
  // One Challenge answer per submit: a quick learner answers a question every
  // few seconds, which the twelve-a-minute quiz budget cut off.
  challengeSubmitPerUser: { key: 'challenge_submit_user', capacity: 30, refillPerSecond: 30 / 60 },
  quizSubmitAnonymous: { key: 'quiz_submit_anon', capacity: 12, refillPerSecond: 12 / 60 },
  challengeScore: { key: 'challenge_score', capacity: SHARED_NETWORK_SEATS * 3, refillPerSecond: (SHARED_NETWORK_SEATS * 10) / 3600 },
  challengeScorePerUser: { key: 'challenge_score_user', capacity: 3, refillPerSecond: 10 / 3600 },
  // A run can end after three quick answers, and a completion that failed is
  // sent again with the next one, so a learner's own budget is larger than
  // the twelve an hour one whole address used to share.
  challengeComplete: { key: 'challenge_complete', capacity: SHARED_NETWORK_SEATS * 12, refillPerSecond: (SHARED_NETWORK_SEATS * 12) / 3600 },
  challengeCompletePerUser: { key: 'challenge_complete_user', capacity: 30, refillPerSecond: 30 / 3600 },
  // A signed-in leaderboard read skips the CDN (it carries the learner's own
  // rank), so it gets a bucket; the anonymous board is cached and needs none.
  leaderboardPersonal: { key: 'leaderboard_personal', capacity: 30, refillPerSecond: 30 / 60 },
  questionReport: { key: 'question_report', capacity: 3, refillPerSecond: 20 / 3600 },
  // Every write to `api/user/[op].ts`, in two tiers like play's: an address
  // backstop that holds a class behind one NAT, then `userMutation` keyed by
  // the verified account. A caller without an account keeps `userMutation` by
  // address, the rate it had before the split.
  userMutation: { key: 'user_mutation', capacity: 20, refillPerSecond: 20 / 60 },
  userMutationAddress: { key: 'user_mutation_address', capacity: SHARED_NETWORK_SEATS * 20, refillPerSecond: (SHARED_NETWORK_SEATS * 20) / 60 },
  flashcardMutation: { key: 'flashcard_mutation', capacity: 20, refillPerSecond: 20 / 60 },
  roadmapMutation: { key: 'roadmap_mutation', capacity: 20, refillPerSecond: 20 / 60 },
  roadmapAnswer: { key: 'roadmap_answer', capacity: 80, refillPerSecond: 80 / 60 },
  roadmapComplete: { key: 'roadmap_complete', capacity: 12, refillPerSecond: 12 / 60 },
  // Play has two tiers (ported by hand from fa884b7). The address buckets
  // hold a whole class behind one NAT; each is paired with a bucket keyed by
  // the caller's verified account (`user:<id>`) at the rate the address bucket
  // used to carry, which is what bounds one learner.
  //
  // A host opens one room per round, but several teachers in one school share
  // one address, so the address bucket holds a handful of concurrent rooms.
  playCreate: { key: 'play_create', capacity: 20, refillPerSecond: 20 / 60 },
  // A class arrives at once: one join each, plus retries on a bad code.
  playJoin: { key: 'play_join', capacity: SHARED_NETWORK_SEATS + 16, refillPerSecond: (SHARED_NETWORK_SEATS + 16) / 60 },
  // Every seat on the 4 s Realtime fallback poll in `Play.tsx`, 15 reads a
  // minute each. With Realtime up, each answer's broadcast makes every client
  // read state again, and a full class outruns this bucket; coalescing those
  // reads in `Play.tsx` is the fix for that, not a larger bucket.
  playState: { key: 'play_state', capacity: SHARED_NETWORK_SEATS * 15 + 120, refillPerSecond: (SHARED_NETWORK_SEATS * 15 + 120) / 60 },
  // One answer per seat per question, a brisk round being a few questions a
  // minute, plus the host's heartbeat and controls.
  playMutation: { key: 'play_mutation', capacity: SHARED_NETWORK_SEATS * 5 + 40, refillPerSecond: (SHARED_NETWORK_SEATS * 5 + 40) / 60 },
  // Per verified account: the values the address buckets carried before the
  // split, so no individual may do more than before.
  playCreatePerUser: { key: 'play_create_user', capacity: 5, refillPerSecond: 5 / 60 },
  playJoinPerUser: { key: 'play_join_user', capacity: 12, refillPerSecond: 12 / 60 },
  playStatePerUser: { key: 'play_state_user', capacity: 60, refillPerSecond: 60 / 60 },
  playMutationPerUser: { key: 'play_mutation_user', capacity: 30, refillPerSecond: 30 / 60 },
  // A classroom host's answer distribution. The presenter view polls it every
  // 1.5 s (`Play.tsx`), 40 reads a minute, beside its own state reads, so it
  // does not share `playStatePerUser` (fa884b7 charged it there). It had no
  // limit before the split; this holds two presenter windows.
  playDistributionPerUser: { key: 'play_distribution_user', capacity: 90, refillPerSecond: 90 / 60 },
  // `state` is the one play action a caller without an account may complete:
  // anyone holding the six-character code can read it. Signed out, it keeps
  // the address rate it had before the split, so the class-sized `playState`
  // buys an anonymous caller nothing.
  playStateAnonymous: { key: 'play_state_anon', capacity: 60, refillPerSecond: 60 / 60 },
  accountDelete: { key: 'account_delete', capacity: 2, refillPerSecond: 2 / 3600 },
  accountDeleteAddress: { key: 'account_delete_address', capacity: SHARED_NETWORK_SEATS * 2, refillPerSecond: (SHARED_NETWORK_SEATS * 2) / 3600 },
  aiExplanation: { key: 'ai_explanation', capacity: 3, refillPerSecond: 5 / 3600 },
  codingRun: { key: 'coding_run', capacity: 30, refillPerSecond: 30 / 600 },
  codingDraft: { key: 'coding_draft', capacity: 60, refillPerSecond: 60 / 600 },
  codingReveal: { key: 'coding_reveal', capacity: 10, refillPerSecond: 10 / 3600 },
  githubConnect: { key: 'github_connect', capacity: 10, refillPerSecond: 10 / 3600 },
  githubSync: { key: 'github_sync', capacity: 6, refillPerSecond: 6 / 3600 },
  // Learning paths: starting an activity is cheap, submitting one runs the
  // sandbox, and a draft autosave fires while the learner types. These four
  // are keyed by the verified account (`user:<id>`), because a class works
  // through one address.
  learningPathStart: { key: 'learning_path_start', capacity: 30, refillPerSecond: 30 / 600 },
  learningPathSubmit: { key: 'learning_path_submit', capacity: 30, refillPerSecond: 30 / 600 },
  learningPathDraft: { key: 'learning_path_draft', capacity: 60, refillPerSecond: 60 / 600 },
  learningPathEnroll: { key: 'learning_path_enroll', capacity: 10, refillPerSecond: 10 / 600 },
  // Their address backstops, taken before the token is verified: a whole class
  // behind one NAT at the per-account rate, so only a flood from one address
  // meets them.
  learningPathStartAddress: { key: 'learning_path_start_address', capacity: SHARED_NETWORK_SEATS * 30, refillPerSecond: (SHARED_NETWORK_SEATS * 30) / 600 },
  learningPathSubmitAddress: { key: 'learning_path_submit_address', capacity: SHARED_NETWORK_SEATS * 30, refillPerSecond: (SHARED_NETWORK_SEATS * 30) / 600 },
  learningPathDraftAddress: { key: 'learning_path_draft_address', capacity: SHARED_NETWORK_SEATS * 60, refillPerSecond: (SHARED_NETWORK_SEATS * 60) / 600 },
  // Billing (#221). Checkout, the portal and the success-page lookup are keyed
  // by account (the `identity` argument); the public cancellation page by
  // address. The Stripe webhook has no limit: its signature is the gate.
  billingCheckout: { key: 'billing_checkout', capacity: 10, refillPerSecond: 10 / 60 },
  billingPortal: { key: 'billing_portal', capacity: 10, refillPerSecond: 10 / 60 },
  billingSession: { key: 'billing_session', capacity: 20, refillPerSecond: 20 / 60 },
  billingCancel: { key: 'billing_cancel', capacity: 5, refillPerSecond: 5 / 3600 },
  // Opening and confirming the emailed link of the cancellation page.
  billingCancelLink: { key: 'billing_cancel_link', capacity: 10, refillPerSecond: 10 / 3600 },
  // An invite code is bound once, at sign-up (#228); keyed by account.
  referralClaim: { key: 'referral_claim', capacity: 5, refillPerSecond: 5 / 3600 },
  // Premium vouchers (migration 045). A code can be guessed, so every attempt
  // counts, a success included: five an hour per account, and ten an hour per
  // address, so two people behind one router each keep their five.
  voucherRedeem: { key: 'voucher_redeem', capacity: 5, refillPerSecond: 5 / 3600 },
  voucherRedeemAddress: { key: 'voucher_redeem_address', capacity: 10, refillPerSecond: 10 / 3600 },
  // The GitHub garden's address backstops. githubConnect and githubSync above
  // are keyed by the verified account (`user:<id>`), so each learner keeps
  // the budget one whole address used to share (a connect is a start and a
  // finish, so five an hour); these hold a class connecting behind one NAT.
  githubConnectAddress: { key: 'github_connect_address', capacity: SHARED_NETWORK_SEATS * 10, refillPerSecond: (SHARED_NETWORK_SEATS * 10) / 3600 },
  githubSyncAddress: { key: 'github_sync_address', capacity: SHARED_NETWORK_SEATS * 6, refillPerSecond: (SHARED_NETWORK_SEATS * 6) / 3600 },
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
  const address = forwardedAddress(req);
  // An account's bucket is `user:<id>`. No address starts that way, but the
  // header is whatever the client sent where no proxy overwrites it, so such
  // a value is moved out of that namespace rather than reach an account's
  // bucket.
  return address.startsWith('user:') ? `ip:${address}` : address;
}

function forwardedAddress(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).split(',')[0].trim();
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.length > 0) return real;
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Consume one token from the (endpoint, caller) bucket. Returns true if
 * allowed, or false + writes a 429 response with a Retry-After header.
 *
 * Pass `identity`, `user:<id>` built from a verified token, to bucket per
 * account instead of per address: a classroom round has thirty callers behind
 * one address. The `user:` prefix keeps it apart from every address
 * (`clientIp` never returns one that starts so), so one handler can hold an
 * address bucket and an account bucket at once.
 */
export function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  config: RateLimitConfig,
  identity?: string,
): boolean {
  const now = Date.now();
  maybeCleanup(now);

  const key = `${config.key}:${identity ?? clientIp(req)}`;
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
  /** Who the bucket belongs to, such as `user:<id>`; the client IP when omitted. */
  identity?: string,
): Promise<boolean> {
  const limiter = await getUpstashLimiter(config);
  if (!limiter) return checkRateLimit(req, res, config, identity);

  try {
    const id = identity ?? clientIp(req);
    const { success, reset } = await withLimiterDeadline(limiter.limit(id));
    if (success) return true;

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    jsonError(res, 429, 'rate_limited', 'Too many requests. Try again shortly.');
    return false;
  } catch {
    // Redis unreachable mid-request — never hard-fail on the limiter; fall back
    // to the in-memory bucket so the endpoint stays available.
    return checkRateLimit(req, res, config, identity);
  }
}

/* -------------------------------------------------------------------------- */
/* One-time claims                                                            */
/* -------------------------------------------------------------------------- */

// A sealed token can be replayed as often as its lifetime allows. Where a
// replay would leak something (a placement round answered again with other
// options reports a different score), the handler claims the token's id once:
// the first claim wins, every later one is refused. Upstash holds the claim
// across instances (SET NX with an expiry); without it, or when Redis fails
// mid-request, a per-instance map does, which is enough locally and blunts a
// script hammering one warm instance.

type OnceStore = { set: (key: string, value: string, opts: { nx: true; ex: number }) => Promise<unknown> };
let onceStore: Promise<OnceStore | null> | null = null;
const localClaims = new Map<string, number>();

function getOnceStore(): Promise<OnceStore | null> {
  if (!isDistributedRateLimitEnabled()) return Promise.resolve(null);
  onceStore ??= (async () => {
    try {
      // @ts-ignore — optional dependency, resolved at runtime in production
      const Redis = ((await import('@upstash/redis')) as any).Redis;
      return new Redis({ url: UPSTASH_URL as string, token: UPSTASH_TOKEN as string }) as OnceStore;
    } catch {
      return null;
    }
  })();
  return onceStore;
}

/** Claim `key` for `ttlSeconds`. True for the first caller, false while the
 * claim stands. */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const store = await getOnceStore();
  if (store) {
    try {
      return (await withLimiterDeadline(store.set(`once:${key}`, '1', { nx: true, ex: ttlSeconds }))) === 'OK';
    } catch {
      // Redis unreachable: fall back to this instance's memory below.
    }
  }
  const now = Date.now();
  if ((localClaims.get(key) ?? 0) > now) return false;
  if (localClaims.size >= 10_000) {
    for (const [claimed, until] of localClaims) if (until <= now) localClaims.delete(claimed);
  }
  localClaims.set(key, now + ttlSeconds * 1000);
  return true;
}
