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
 *     handoff names are free content already: stage one of every project
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
import { CODING_SUMMARIES } from './coding/active';
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

let index: ContentIndex | null = null;
/** The server's `ContentIndex`: the issuable coding summaries with their
 * projected `free` flags, the evolving registry and the authored level counts. */
export function serverContentIndex(): ContentIndex {
  index ??= {
    levelCounts: Object.fromEntries(ROADMAP_TOPICS.map((topic) => [topic, topicLevelCount(topic)])),
    coding: CODING_SUMMARIES,
    evolving: EVOLVING_CHALLENGES,
  };
  return index;
}

/** The account's tier: one `is_premium` call, remembered for the rest of the
 * request. Before migration 039 is installed nobody can hold a grant, so a
 * missing routine reads as the free tier. */
export function resolveTier(userId: string): Promise<Tier> {
  return requestMemo(`tier:${userId}`, async () => {
    if (!supabase) return 'free';
    const { data, error } = await withTimeout(supabase.rpc('is_premium', { p_user: userId }));
    if (error) {
      if (isRpcMissing(error)) return 'free';
      throw new EntitlementUnavailableError();
    }
    return data === true ? 'premium' : 'free';
  });
}

export interface OpenOptions {
  /** Whether the learner already cleared this content. Called only when the
   * tier refuses it; true keeps it open for review. */
  cleared?: () => Promise<boolean>;
}

/** Throws `PremiumRequiredError` when a guest, or a signed-in free account,
 * starts Premium content it has not cleared. A guest has cleared nothing. */
export async function assertOpen(userId: string | null, content: GatedContent, options: OpenOptions = {}): Promise<void> {
  if (contentTier(content, serverContentIndex()) === 'free') return;
  if (!userId) throw new PremiumRequiredError(content);
  if ((await resolveTier(userId)) === 'premium') return;
  if (options.cleared && (await options.cleared().catch(() => false))) return;
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
