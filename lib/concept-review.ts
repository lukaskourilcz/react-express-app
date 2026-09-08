// Reading and writing concept-level review state.
//
// The policy itself is pure and lives in shared/spaced-practice.ts, with the
// clock injected, so the intervals are testable without a database and without
// a fake now. This module is the boundary: it loads the rows, calls the policy,
// and writes the result through the idempotent routine in migration 030.
//
// Correctness is derived from the server's own grading. The one thing the
// client contributes is which questions had a hint open, and that is safe to
// take at face value for a specific reason: it can only ever *downgrade* a
// result. Claiming a hint was open shortens nobody else's interval and cannot
// manufacture mastery; the interesting direction — claiming an answer was
// independent when it was not — is not something the client can assert, because
// the absence of a hint id is not a claim the server acts on. It re-derives
// correctness itself and treats anything it is told about hints as a reason to
// be more conservative.

import { createLogger, withTimeout } from './http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { conceptOf } from '../shared/concepts';
import {
  DEFAULT_INTERVAL_HOURS,
  SCHEDULING_POLICY_VERSION,
  nextReviewState,
  dueConcepts,
  type AttemptOutcome,
  type DueConcept,
  type RetrievalKind,
  type ReviewState,
} from '../shared/spaced-practice';
import type { ScopeSubjectId } from '../shared/subject-catalog';

const logEvent = createLogger('concept-review');

interface ReviewRow {
  concept_id: string;
  stage: number;
  due_at: string | null;
  streak: number;
  last_item_id: string | null;
}

const toState = (row: ReviewRow): ReviewState => ({
  conceptId: row.concept_id,
  stage: Number(row.stage ?? 0),
  dueAt: row.due_at,
  streak: Number(row.streak ?? 0),
  lastItemId: row.last_item_id,
});

/**
 * The learner's review state for one subject.
 *
 * An unreadable table is an empty list, not an error: review is an enhancement
 * to practice, and a learner whose scheduling cannot be read should still get a
 * session. The failure is logged rather than shown.
 */
export async function loadReviewStates(
  supabase: SupabaseClient | null,
  userId: string,
  subject: ScopeSubjectId,
): Promise<ReviewState[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('concept_reviews')
        .select('concept_id,stage,due_at,streak,last_item_id')
        .eq('user_id', userId)
        .eq('subject', subject),
    );
    if (error || !data) {
      logEvent({ status: 200, reason: 'states_unavailable', error: error?.message ?? 'no_rows' });
      return [];
    }
    return (data as ReviewRow[]).map(toState);
  } catch (err) {
    logEvent({ status: 200, reason: 'states_failed', error: err instanceof Error ? err.message : 'unknown' });
    return [];
  }
}

/** How many times each concept has been practised, for the interleaver's
 * "teach it before you mix it" rule. Derived from the same rows. */
export function practisedCounts(states: readonly ReviewState[]): Record<string, number> {
  const out: Record<string, number> = {};
  // `stage` is how far up the ladder a concept has climbed and `streak` how
  // many independent successes are behind it; either being non-zero means the
  // learner has met it more than once. The interleaver only needs "enough to
  // contrast", so the ladder position is the honest proxy for it.
  for (const state of states) out[state.conceptId] = state.stage * 2 + state.streak;
  return out;
}

/** The due list, filtered by the caller's own eligibility rule. */
export function dueFor(
  states: readonly ReviewState[],
  eligible: (conceptId: string) => boolean,
  now: number,
  cap?: number,
): DueConcept[] {
  return dueConcepts(states, eligible, now, cap);
}

export interface GradedItem {
  itemId: string;
  itemVersion?: string;
  category?: string;
  tags?: readonly string[];
  correct: boolean;
  kind: RetrievalKind;
}

/**
 * Record one session's worth of outcomes, one row per concept.
 *
 * A session that answers three `reduce` questions is one review of `reduce`,
 * not three: the interval is about the concept, and advancing it three times
 * for one sitting would push it a week out on the strength of a single evening.
 * The worst outcome in the session wins, because a concept the learner got
 * wrong once is not one they have retained.
 *
 * `eventId` makes the write idempotent. A retried submit, or the same attempt
 * arriving from two devices, reports the stored state and applies nothing.
 */
export async function recordConceptReviews(
  supabase: SupabaseClient | null,
  input: {
    userId: string;
    subject: ScopeSubjectId;
    /** Stable per attempt — the same value for a retry of the same submit. */
    eventId: string;
    items: readonly GradedItem[];
  },
  states: readonly ReviewState[],
  now = Date.now(),
): Promise<void> {
  if (!supabase) return;

  // Collapse the session to one outcome per concept, worst-first.
  const worst = new Map<string, GradedItem>();
  for (const item of input.items) {
    const concept = conceptOf(item);
    if (!concept) continue;
    const held = worst.get(concept);
    if (!held) {
      worst.set(concept, item);
      continue;
    }
    const worseThanHeld =
      (!item.correct && held.correct) ||
      (item.correct === held.correct && rank(item.kind) > rank(held.kind));
    if (worseThanHeld) worst.set(concept, item);
  }
  if (worst.size === 0) return;

  const byConcept = new Map(states.map((state) => [state.conceptId, state]));
  // One row per concept, written concurrently: they are independent rows and a
  // submit should not wait for them in series. Awaited rather than fired and
  // forgotten, because a serverless function can be frozen the moment it
  // responds and an unawaited write would sometimes simply not happen.
  await Promise.all([...worst].map(async ([conceptId, item]) => {
    const outcome: AttemptOutcome = {
      conceptId,
      correct: item.correct,
      kind: item.kind,
      itemId: item.itemId,
    };
    const next = nextReviewState(byConcept.get(conceptId) ?? null, outcome, now, DEFAULT_INTERVAL_HOURS);
    try {
      const { error } = await withTimeout(
        supabase.rpc('record_concept_review', {
          p_user_id: input.userId,
          p_concept_id: conceptId,
          p_subject: input.subject,
          // One event per concept per attempt, so a retry of the whole submit
          // is recognised row by row.
          p_event_id: `${input.eventId}:${conceptId}`,
          p_stage: next.stage,
          p_due_at: next.dueAt,
          p_streak: next.streak,
          p_item_id: item.itemId,
          p_item_version: item.itemVersion ?? null,
          p_kind: item.kind,
          p_correct: item.correct,
          p_policy_version: SCHEDULING_POLICY_VERSION,
        }),
      );
      if (error) {
        logEvent({ status: 200, reason: 'record_failed', concept: conceptId, error: error.message });
      }
    } catch (err) {
      logEvent({
        status: 200,
        reason: 'record_threw',
        concept: conceptId,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }));
}

/** How far a retrieval kind is from independent recall. Higher is weaker. */
const rank = (kind: RetrievalKind): number =>
  kind === 'independent' ? 0 : kind === 'assisted' ? 1 : kind === 'hinted' ? 2 : 3;
