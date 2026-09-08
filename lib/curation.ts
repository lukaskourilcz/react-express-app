// Server-side curation metadata: the version of an item's content, and the
// review record for that exact version.
//
// The version is a keyed digest of everything authored about the item —
// question, options, correct answer, explanation, hint and tags. Keyed, not a
// plain hash: an unkeyed digest that covered the correct answer could be
// brute-forced by anyone holding the four options, which would hand out the
// answer key in a field meant to protect it. Covering the answer matters,
// because "the answer was changed" is exactly the edit that must invalidate an
// approval.
//
// The review registry is empty. That is not an oversight: no item-level audit
// has run, so there are no recorded decisions, and every claim derived from it
// resolves to "not reviewed yet". Populating it is the content audit's job.
// Everything downstream — the item note, the coverage sentence, the
// methodology page — is written to be correct with the registry empty and to
// become more specific, without a code change, when it is not.

import { createLogger } from './http';
import { stableAttemptId } from './quiz-tokens';
import { getEffectiveQuestions, overridesAvailable } from './questions-store';
import type { Question } from './quiz-data';
import type { ScopeSubjectId } from '../shared/subject-catalog';
import type { Localized } from '../shared/coding-catalog';
import {
  publicItemReview,
  summarizeCoverage,
  type CoverageReport,
  type CoverageSource,
  type PublicItemReview,
  type ReviewRecord,
} from '../shared/curation';

const logEvent = createLogger('curation');

/**
 * A stable, opaque id for exactly this wording of this item.
 *
 * Changing any authored field changes it, which is what makes "an edit
 * invalidates the previous approval" enforceable rather than a promise. It is
 * safe to show and safe to quote in a problem report.
 */
export function contentVersion(q: Question): string {
  return stableAttemptId(
    'content-version:v1',
    q.id,
    q.question,
    q.options.join(''),
    String(q.correctAnswer),
    q.explanation ?? '',
    q.introduction ?? '',
    (q.tags ?? []).join(''),
  ).slice(0, 12);
}

/**
 * Recorded review decisions, keyed by item id.
 *
 * Empty until the content audit records its first decision. A record here is a
 * claim the product will repeat to learners, so it is added when a decision was
 * actually made about a version that actually shipped — never to make a screen
 * look better.
 */
const REVIEW_RECORDS = new Map<string, ReviewRecord>();

export const reviewRecordFor = (itemId: string): ReviewRecord | null =>
  REVIEW_RECORDS.get(itemId) ?? null;

/** The review metadata for one item, safe to send to any client. */
export function itemReview(q: Question): PublicItemReview {
  const version = contentVersion(q);
  return publicItemReview(reviewRecordFor(q.id), version);
}

/** The day the coding content contract last ran in CI is not knowable from
 * inside a request, so the recorded date is the day the evidence was
 * established for the shipped catalogue. It moves when the contract's
 * guarantees change, not on every deploy. */
const CODING_CONTRACT_DATE = '2026-09-08';

/**
 * The review metadata for one coding task.
 *
 * Coding tasks carry evidence questions do not: `npm run test:coding` executes
 * a reference solution against every task's own grader, so "this task is
 * solvable exactly as specified" is a checked fact for each of them
 * individually rather than a claim about the suite. That is recorded as one
 * execution check, and it is deliberately not called a review — nobody has
 * read the brief for clarity or judged whether it is worth doing.
 */
export function codingTaskReview(task: {
  id: string;
  prompt: Localized;
  title: Localized;
  starter: string;
}): PublicItemReview {
  const version = stableAttemptId(
    'content-version:v1',
    task.id,
    task.title.en,
    task.prompt.en,
    task.starter,
  ).slice(0, 12);
  return publicItemReview(reviewRecordFor(task.id), version, [
    { kind: 'execution', at: CODING_CONTRACT_DATE, check: 'reference solution vs. grader' },
  ]);
}

/**
 * How much of what a learner can actually be served has been reviewed.
 *
 * The effective question set already folds in the database overrides and
 * operator-authored questions, so it is the real deliverable pool rather than
 * the static bank. When the override layer cannot be read, the count is not
 * "the static bank" — it is unknown, because items could exist that this
 * process cannot see, and an unknown source is what stops a bank-wide claim
 * being made at all.
 */
export async function curationCoverage(subject?: ScopeSubjectId): Promise<CoverageReport> {
  const sources: CoverageSource[] = [];
  try {
    const questions = await getEffectiveQuestions(subject);
    const complete = overridesAvailable();
    const reviewed = questions.reduce(
      (total, q) => total + (itemReview(q).status === 'reviewed' ? 1 : 0),
      0,
    );
    sources.push({
      id: 'question-bank',
      items: complete ? questions.length : null,
      reviewed: complete ? reviewed : null,
    });
  } catch (err) {
    logEvent({
      status: 500,
      reason: 'coverage_failed',
      error: err instanceof Error ? err.message : 'unknown',
    });
    sources.push({ id: 'question-bank', items: null, reviewed: null });
  }
  return summarizeCoverage(sources);
}
