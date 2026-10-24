import { LEARNING_PATHS } from './learning-paths/catalog';
/** Server enforcement of the free tier and Premium.
 *
 * `shared/tiers.ts` says what each tier opens; this module asks the database
 * whether an account is Premium and refuses locked content with HTTP 402
 * `premium_required`. Handlers call `refuseLocked` at the point where a learner
 * starts something: a Learn level, a part test, a coding task, an evolving
 * stage, a learning path.
 *
 * Three rules hold for every call site:
 *   * A signed-out visitor holds the free tier and nothing more, and a guest
 *     never records anything. Premium content is refused to a guest with the
 *     same 402, which the browser answers with the upgrade sheet and its way
 *     to sign in (review finding integrity-4: otherwise signing out, or
 *     leaving the token off a request, opened every Premium level and
 *     challenge with grading and explanations). The guest previews the
 *     the product allows are free content already: stage one of every project
 *     and path, and the landing's sample question, which never reaches here.
 *   * Free content never costs a query. The tier is resolved only when the
 *     content is Premium, and at most once per request.
 *   * Content the learner already cleared stays open, so a lapsed account can
 *     review everything it passed. Each call site says what "cleared" means
 *     for it; the check runs only after the tier said no.
 */

import type { VercelResponse } from './vercel-types.js';
import {
  createServiceClient,
  isRpcMissing,
  jsonError,
  jsonPremiumRequired,
  PremiumRequiredError,
  requestMemo,
  withTimeout,
} from './http';
import { contentTier, type ContentIndex, type GatedContent, type Tier } from '../shared/tiers';
import { EVOLVING_CHALLENGES } from '../shared/evolving';
import { ROADMAP_TOPICS, topicLevelCount } from './roadmap';

export { PremiumRequiredError };

const supabase = createServiceClient();

/** The database could not say which tier an account holds. Answered with 503
 * rather than guessed: guessing "free" would lock a paying learner out, and
 * guessing "Premium" would open everything during an outage. */
export class EntitlementUnavailableError extends Error {
  constructor() {
    super('entitlement_unavailable');
    this.name = 'EntitlementUnavailableError';
  }
}

/** The issuable coding summaries, loaded when a gate first asks about a
 * coding task. `./coding/active` evaluates the whole coding catalogue with
 * its reference solutions and the eligibility gate (about 170 ms and 20 MB
 * of heap, measured offline), and every importer of this module paid it at
 * load: the wallet read on every signed-in page among them, through
 * lib/rewards/handlers.ts (#587, server item 3). A Learn level, a learning
 * path or the merchandise gate never reads them. A plain `require` keeps the
 * load synchronous, as `contentTier` is, and is what @vercel/node's file
 * tracer follows. */
let codingSummaries: ContentIndex['coding'] | null = null;
function loadCodingSummaries(): ContentIndex['coding'] {
  codingSummaries ??= (require('./coding/active') as typeof import('./coding/active')).CODING_SUMMARIES;
  return codingSummaries;
}

let index: ContentIndex | null = null;
/** The server's `ContentIndex`: the issuable coding summaries with their
 * projected `free` flags (read on first use), evolving registry, authored
 * level counts and path manifests. */
export function serverContentIndex(): ContentIndex {
  index ??= {
    levelCounts: Object.fromEntries(ROADMAP_TOPICS.map((topic) => [topic, topicLevelCount(topic)])),
    get coding() { return loadCodingSummaries(); },
    learningPaths: LEARNING_PATHS,
    evolving: EVOLVING_CHALLENGES,
  };
  return index;
}

/* Premium answers this instance read lately (#587, server item 6). A Learn
 * level is eight answers, and each one asked is_premium again for a session
 * issued to a Premium account a minute before: one round trip of four on
 * every answer of a Premium level. Only the Learn answer gate trusts this
 * (`OpenOptions.recentPremium`); every other gate, the level open and the
 * completion included, asks the database each time. Only a Premium answer
 * is kept, for at most a minute, and a free answer read anywhere on the
 * instance forgets it at once, along with a Premium answer asked before it
 * that comes back later. The bounded trade-off, for the owner: an
 * account whose Premium ended keeps answering the questions of a Premium
 * session it already holds for up to a minute on an instance that saw it
 * Premium just before. Completing that session asks again and is refused. */
const RECENT_PREMIUM_MS = 60_000;
const RECENT_PREMIUM_LIMIT = 5_000;
const recentPremium = new Map<string, number>();
/** The `is_premium` calls in flight per account, and, while any is, when the
 * latest free answer among them was asked. A Premium answer asked before that
 * free one and back after it is older news: kept, it would trust the account
 * again after the instance read it free. Once no call is in flight no older
 * answer can arrive, so the mark goes with the last one. Both are bounded by
 * the calls in flight. */
const tierAsks = new Map<string, number>();
const freeAskedAt = new Map<string, number>();

function beginTierAsk(userId: string): void {
  tierAsks.set(userId, (tierAsks.get(userId) ?? 0) + 1);
}

function endTierAsk(userId: string): void {
  const left = (tierAsks.get(userId) ?? 1) - 1;
  if (left > 0) {
    tierAsks.set(userId, left);
    return;
  }
  tierAsks.delete(userId);
  freeAskedAt.delete(userId);
}

/** `askedAt` is when the `is_premium` call was sent, so the minute counts
 * from the question, not from an answer that arrived late (a slow reply, or
 * one an instance frozen after its response delivered when it thawed). */
function notePremium(userId: string, premium: boolean, askedAt: number): void {
  recentPremium.delete(userId);
  if (!premium) {
    freeAskedAt.set(userId, Math.max(freeAskedAt.get(userId) ?? askedAt, askedAt));
    return;
  }
  const freeSince = freeAskedAt.get(userId);
  if (freeSince !== undefined && askedAt <= freeSince) return;
  const until = askedAt + RECENT_PREMIUM_MS;
  if (until <= Date.now()) return;
  if (recentPremium.size >= RECENT_PREMIUM_LIMIT) recentPremium.delete(recentPremium.keys().next().value!);
  recentPremium.set(userId, until);
}

function heldPremium(userId: string): boolean {
  const until = recentPremium.get(userId);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  recentPremium.delete(userId);
  return false;
}

/** The account's tier: one `is_premium` call, remembered for the rest of the
 * request. Before migration 039 is installed nobody can hold a grant, so a
 * missing routine reads as the free tier. */
export function resolveTier(userId: string): Promise<Tier> {
  return requestMemo(`tier:${userId}`, async () => {
    if (!supabase) return 'free';
    const askedAt = Date.now();
    beginTierAsk(userId);
    try {
      const { data, error } = await withTimeout(supabase.rpc('is_premium', { p_user: userId }));
      if (error) {
        if (isRpcMissing(error)) return 'free';
        throw new EntitlementUnavailableError();
      }
      notePremium(userId, data === true, askedAt);
      return data === true ? 'premium' : 'free';
    } finally {
      endTierAsk(userId);
    }
  });
}

/** Start the tier read for content Premium opens, without waiting for it.
 * A handler that gates `content` once its other reads are back starts the
 * read beside them, and `refuseLocked` then awaits the same answer, which is
 * remembered for the request (#587, server item 6: the read was one more
 * wave after the others). Free content and a guest cost nothing, as in
 * `assertOpen`; a failure is answered where the gate awaits it. */
export async function prefetchTier(userId: string | null, content: GatedContent): Promise<void> {
  if (!userId || contentTier(content, serverContentIndex()) === 'free') return;
  resolveTier(userId).catch(() => {});
}

export interface OpenOptions {
  /** Whether the learner already cleared this content. Called only when the
   * tier refuses it; true keeps it open for review. A rejection answers 503
   * `entitlement_unavailable`, never 402. */
  cleared?: () => Promise<boolean>;
  /** Accept a Premium answer this instance read within the last minute
   * instead of asking again. Only the Learn answer gate passes it. */
  recentPremium?: boolean;
}

/** Throws `PremiumRequiredError` when a guest, or a signed-in free account,
 * starts Premium content it has not cleared. A guest has cleared nothing. */
export async function assertOpen(userId: string | null, content: GatedContent, options: OpenOptions = {}): Promise<void> {
  if (contentTier(content, serverContentIndex()) === 'free') return;
  if (!userId) throw new PremiumRequiredError(content);
  if (options.recentPremium && heldPremium(userId)) return;
  if ((await resolveTier(userId)) === 'premium') return;
  // A "cleared" read that failed is not a "no": answering 402 would show a
  // lapsed learner the upgrade sheet for work they passed, so it is the same
  // 503 as a tier that cannot be read.
  if (options.cleared) {
    let cleared: boolean;
    try {
      cleared = await options.cleared();
    } catch {
      throw new EntitlementUnavailableError();
    }
    if (cleared) return;
  }
  throw new PremiumRequiredError(content);
}

/** `assertOpen` for a handler. Sends the 402 (or a 503 when the tier cannot be
 * read) and returns true when the request was refused. */
export async function refuseLocked(
  res: VercelResponse,
  userId: string | null,
  content: GatedContent,
  options: OpenOptions = {},
): Promise<boolean> {
  try {
    await assertOpen(userId, content, options);
    return false;
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      jsonPremiumRequired(res, error);
      return true;
    }
    if (error instanceof EntitlementUnavailableError) {
      jsonError(res, 503, 'entitlement_unavailable', 'Could not check your plan. Try again in a moment.');
      return true;
    }
    throw error;
  }
}
