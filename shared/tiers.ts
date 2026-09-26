/** The free tier and Premium: one contract for the browser's locks and the
 * server's refusals.
 *
 * This is the only place that says what the free tier includes. The server
 * (`lib/access.ts`) refuses locked content with HTTP 402 `premium_required`,
 * and the browser draws its locks from the same `contentTier`, so the two can
 * never disagree about a level, a part test, a coding task, an evolving stage
 * or a learning path. The module is pure: it imports nothing from `lib/`, and
 * the launch contracts fail if it ever does.
 *
 * Premium changes which content a learner may start and nothing else. Grading,
 * explanations, XP amounts, scores, streaks, ranks, leaderboards and matchmaking
 * read no tier. Drafts, bookmarks, skips and reviews of content a learner
 * already cleared are never refused, and a lapsed account keeps everything it
 * passed.
 *
 * A signed-out visitor holds the free tier, unsaved: the server refuses
 * Premium content to a guest with the same 402 as a free account, and the
 * browser draws it with the Premium mark. The landing's sample question ("Try
 * one, no signup") runs in the browser, and stage one of every project and
 * short path is free content. */

import type { CodingTaskSummary } from './coding-catalog';
import { EVOLVING_CHALLENGES, type EvolvingChallenge } from './evolving';
import type { LearningPathId } from './learning-paths';
import { partRanges } from './progression';

export type Tier = 'free' | 'premium';
export const isTier = (value: unknown): value is Tier => value === 'free' || value === 'premium';

/** Learn topics open to every registered account, in full. */
export const FREE_LEARN_TOPICS = ['html', 'css', 'javascript'] as const;
/** Topics open up to a level; React has 25 levels, so 12 is the first half. */
export const FREE_LEARN_LEVELS: Readonly<Partial<Record<string, number>>> = { react: 12 };
/** Stage or level one of every evolving project and short path stays open. */
export const FREE_EVOLVING_STAGES = 1;
/** Share of the whole coding catalogue that carries `free: true`; the launch contract asserts it. */
export const FREE_CODING_SHARE = { target: 0.15, min: 0.12, max: 0.18 } as const;
/** Quizzes stay open in every category. Set to 'free-topics' to tighten later. */
export const QUIZ_FREE_CATEGORIES: 'all' | 'free-topics' = 'all';
/** The prices shown to a learner, VAT included. Billing charges the provider's
 * Price objects (section 3.1 of the second handoff); this is the display copy
 * and must match them. */
export const PREMIUM_PRICE = { currency: 'EUR', symbol: '€', monthly: '3.99', annual: '39.99' } as const;

/** The standalone coding challenges open on the free tier: the starter set.
 *
 * One list, projected into `shared/coding-index.ts` as `free: true` by
 * `npm run build:coding-index`, so no task file carries the flag and a content
 * wave never has to edit this contract to add a task. Stage one of every
 * evolving project and short path is free as well; that part is derived from
 * `FREE_EVOLVING_STAGES` rather than listed.
 *
 * The pick: every tier-1 technique group of every track has its first task
 * open. The rest are Easy standalone tasks chosen so each track's free set
 * reaches the technique groups the track teaches (loops, array methods,
 * strings, objects, functions and async in JavaScript; types, objects and
 * array methods in TypeScript; rendering, hooks and async in React; loops,
 * objects, sorting and recursion in Algorithms). JavaScript 41, TypeScript 18,
 * React 19, Algorithms 9: with stage one of the 29 projects and short paths,
 * 116 of the 770 tasks, 15.1 %. The second block of each track came with the
 * Easy waves of #226. The third came with its Medium and Hard waves, which
 * added no Easy task: it opens an Easy task for the techniques those
 * challenges combine most and the free set had least of (closures, recursion,
 * promises, while and sort in JavaScript; utility types and records in
 * TypeScript; custom hooks, refs, events and accessibility in React; two
 * pointers and recursion in Algorithms). When the catalogue grows, re-pick
 * here so the share stays near `FREE_CODING_SHARE.target`, and keep every
 * task already listed: a learner on the free plan may have started it. */
export const FREE_CODING_TASK_IDS: readonly string[] = [
  // JavaScript
  'js-digit-sum',
  'js-count-multiples',
  'js-words-of-length',
  'js-reverse-string',
  'js-first-letters',
  'js-capitalize',
  'js-word-count',
  'js-debug-average',
  'js-fizz-values',
  'js-queue-with-shift',
  'js-swap-stack-top',
  'js-copy-a-range',
  'js-double-numbers',
  'js-count-vowels',
  'js-largest-number',
  'js-number-items',
  'js-even-numbers',
  'js-has-adult',
  'js-all-positive',
  'js-find-user',
  'js-sum-array',
  'js-total-price',
  'js-easy3-digits-only',
  'js-easy2-flatten-once',
  'js-easy2-keys-with-value',
  'js-easy3-column-totals',
  'js-easy4-letters-in-order',
  'js-attempt-until',
  'js-debug-tally',
  'js-easy3-highest-score',
  'js-easy2-factorial',
  'js-easy2-sort-by-key',
  'js-easy2-cancel-a-timer',
  'js-easy2-double-later',
  'js-easy2-await-both',
  'js-easy4-post-json',
  'js-easy2-running-average',
  'js-easy2-power',
  'js-easy2-total-when-ready',
  'js-countdown-by-step',
  'js-easy3-sort-numbers',
  // TypeScript
  'ts-typed-slug',
  'ts-inferred-total',
  'ts-greeting-with-a-default',
  'ts-top-three-scores',
  'ts-take-turns',
  'ts-lowest-and-highest',
  'ts-person-interface',
  'ts-shipping-speed',
  'ts-optional-nickname',
  'ts-easy2-flip-a-pair',
  'ts-easy3-pin-to-top',
  'ts-total-expenses',
  'ts-easy2-select-and-deselect',
  'ts-easy3-check-the-json',
  'ts-only-the-files',
  'ts-easy3-alternate-playlists',
  'ts-easy2-draft-post',
  'ts-tally-votes',
  // React
  'react-heading-and-intro',
  'react-greeting-component',
  'react-price-component',
  'react-keyed-book-list',
  'react-show-and-hide',
  'react-counter',
  'react-guest-list',
  'react-search-a-list',
  'react-delayed-message',
  'react-get-one-user',
  'react-easy2-stop-the-download',
  'react-memoised-total',
  'react-undo-stack',
  'react-easy3-radio-group',
  'react-easy3-name-the-remove-buttons',
  'react-easy2-page-of-photos',
  'react-easy2-use-toggle',
  'react-easy2-focus-the-search',
  'react-easy2-disclosure',
  // Algorithms
  'alg-valid-palindrome',
  'alg-chunk-array',
  'alg-missing-number',
  'alg-two-sum',
  'alg-easy2-count-jewels',
  'alg-easy2-median',
  'alg-easy2-greatest-common-divisor',
  'alg-merge-sorted',
  'alg-easy2-fibonacci-memo',
];
const FREE_CODING_TASKS = new Set(FREE_CODING_TASK_IDS);

/** Something a learner starts. `stage` is one-based. */
export type GatedContent =
  | { kind: 'learn-level'; topic: string; level: number }
  | { kind: 'learn-part-test'; topic: string; part: number }
  | { kind: 'coding-task'; taskId: string }
  | { kind: 'evolving-stage'; challengeId: string; stage: number }
  | { kind: 'learning-path'; pathId: LearningPathId }
  // Redeeming coins for shipped merchandise (step D8). Not content, but refused
  // with the same 402 so the browser answers it with the same upgrade sheet.
  | { kind: 'merch-redemption'; sku: string };
export type GatedKind = GatedContent['kind'];

/** The pure data `contentTier` needs. The server builds it from `lib/`, the
 * browser from `shared/coding-index.ts` and the roadmap structure; both hand it
 * to the same function. */
export interface ContentIndex {
  /** Level count per Learn topic, which decides where the part tests fall. */
  levelCounts: Readonly<Partial<Record<string, number>>>;
  /** The coding index with its projected `free` flags. */
  coding: readonly Pick<CodingTaskSummary, 'id' | 'free'>[];
  /** The evolving registry. */
  evolving: readonly Pick<EvolvingChallenge, 'id' | 'stages'>[];
}

/** One-based stage number of an evolving stage task, or null for a standalone task. */
export function evolvingStageNumber(
  taskId: string,
  evolving: ContentIndex['evolving'] = EVOLVING_CHALLENGES,
): { challengeId: string; stage: number } | null {
  for (const challenge of evolving) {
    const index = challenge.stages.indexOf(taskId);
    if (index >= 0) return { challengeId: challenge.id, stage: index + 1 };
  }
  return null;
}

/** Whether the free tier includes a coding task: the starter set, plus stage one
 * of every evolving project and short path. `build:coding-index` projects this
 * into the index; everything else reads the projected flag. */
export function isFreeCodingTask(taskId: string): boolean {
  if (FREE_CODING_TASKS.has(taskId)) return true;
  const stage = evolvingStageNumber(taskId);
  return stage !== null && stage.stage <= FREE_EVOLVING_STAGES;
}

const learnLevelTier = (topic: string, level: number): Tier => {
  if ((FREE_LEARN_TOPICS as readonly string[]).includes(topic)) return 'free';
  const openUpTo = FREE_LEARN_LEVELS[topic];
  return openUpTo !== undefined && Number.isInteger(level) && level >= 1 && level <= openUpTo ? 'free' : 'premium';
};

const codingFree = new WeakMap<ContentIndex['coding'], ReadonlySet<string>>();
const freeCodingIds = (coding: ContentIndex['coding']): ReadonlySet<string> => {
  let ids = codingFree.get(coding);
  if (!ids) {
    ids = new Set(coding.filter((task) => task.free === true).map((task) => task.id));
    codingFree.set(coding, ids);
  }
  return ids;
};

/** Which tier a piece of content belongs to. Unknown content is Premium, so a
 * gap in the index can only ever lock, never open. */
export function contentTier(content: GatedContent, index: ContentIndex): Tier {
  switch (content.kind) {
    case 'learn-level':
      return learnLevelTier(content.topic, content.level);
    case 'learn-part-test': {
      // A part test is Premium when any level in its part is Premium: React's
      // second part ends above level 12, so it is locked; its first is open.
      if ((FREE_LEARN_TOPICS as readonly string[]).includes(content.topic)) return 'free';
      const range = partRanges(index.levelCounts[content.topic] ?? 0).find((one) => one.part === content.part);
      if (!range || range.size <= 0) return 'premium';
      for (let level = range.startLevel; level <= range.endLevel; level++) {
        if (learnLevelTier(content.topic, level) === 'premium') return 'premium';
      }
      return 'free';
    }
    case 'coding-task': {
      if (freeCodingIds(index.coding).has(content.taskId)) return 'free';
      const stage = evolvingStageNumber(content.taskId, index.evolving);
      return stage ? contentTier({ kind: 'evolving-stage', ...stage }, index) : 'premium';
    }
    case 'evolving-stage':
      return index.evolving.some((challenge) => challenge.id === content.challengeId) &&
        Number.isInteger(content.stage) && content.stage >= 1 && content.stage <= FREE_EVOLVING_STAGES
        ? 'free'
        : 'premium';
    case 'learning-path':
      // The FDE and DSA paths are Premium in full, once their switches are on.
      return 'premium';
    case 'merch-redemption':
      // Premium members redeem coins for merchandise; the crown and streak
      // protection stay open to every account.
      return 'premium';
    default:
      return 'premium';
  }
}

export function isOpenTo(tier: Tier, content: GatedContent, index: ContentIndex): boolean {
  return tier === 'premium' || contentTier(content, index) === 'free';
}

/** The content a coding task id stands for: an evolving stage when it is one,
 * otherwise a standalone task. The 402 body names the same kind. */
export function codingContent(taskId: string, evolving: ContentIndex['evolving'] = EVOLVING_CHALLENGES): GatedContent {
  const stage = evolvingStageNumber(taskId, evolving);
  return stage ? { kind: 'evolving-stage', ...stage } : { kind: 'coding-task', taskId };
}

/** A short stable reference to the content, sent back in the 402 body. */
export function gatedRef(content: GatedContent): string {
  switch (content.kind) {
    case 'learn-level':
      return `${content.topic}:${content.level}`;
    case 'learn-part-test':
      return `${content.topic}:part-${content.part}`;
    case 'coding-task':
      return content.taskId;
    case 'evolving-stage':
      return `${content.challengeId}:${content.stage}`;
    case 'learning-path':
      return content.pathId;
    case 'merch-redemption':
      return content.sku;
  }
}

/* ── the wire ──────────────────────────────────────────────────────────── */

/** The error code every refusal of locked content carries, with HTTP 402. */
export const PREMIUM_REQUIRED = 'premium_required';

/** The body of a 402: the app's standard error envelope plus what was refused. */
export interface PremiumRequiredBody {
  error: { code: typeof PREMIUM_REQUIRED; message: string; kind: GatedKind; ref: string; requestId?: string };
}

/** Where a grant comes from: `provider`, a Stripe subscription; `manual`, an
 * admin's grant through op=entitlements; `promo`, a redeemed Premium voucher
 * (migration 045). */
export type EntitlementSource = 'provider' | 'manual' | 'promo';

/** GET /api/user?op=entitlement. */
export interface EntitlementResponse {
  tier: Tier;
  /** Where Premium comes from; null on the free tier. */
  source: EntitlementSource | null;
  /** The paid period's end for a subscription. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** A failed renewal inside the seven-day grace window: still Premium. */
  inGrace: boolean;
  /** The end of a manual or promo grant; null means open-ended. */
  validUntil: string | null;
  /** The account has a billing customer, whichever grant wins the plan line,
   * so Manage billing (card, plan, invoices) stays reachable. Absent from a
   * server that predates it. */
  billingAccount?: boolean;
  /** A subscription is live, so checkout would be refused: offer Manage
   * billing instead. */
  subscriptionLive?: boolean;
}
