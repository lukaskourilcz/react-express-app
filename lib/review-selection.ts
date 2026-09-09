import type { Question } from './quiz-data';

export interface ReviewCategoryStat {
  category: string;
  total_correct: number;
  total_questions: number;
}

export interface ReviewHistory {
  question_id: string;
  category: string;
  times_seen: number;
  times_missed: number;
  last_seen_at: string;
  last_missed_at: string | null;
}

export interface WeakArea {
  category: string;
  accuracyPct: number;
  answered: number;
  focusTags: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How much of a review session concepts that are actually due may take.
 *
 * Not all of it. A session made only of due items stops being a review of the
 * subject and becomes a drill on whatever the learner last got wrong, and one
 * due concept would produce ten questions about that one concept. Not none of
 * it either, which is what shipped first: the due ordering was handed to the
 * ranking below, which re-sorts by its own total order and threw it away, so a
 * learner told two concepts were due got a session with neither in it.
 */
export const DUE_SHARE = 0.6;

/**
 * One item per due concept, most overdue first, until the reserved slots run
 * out. Pure, and separate from the ranking below on purpose: which concepts
 * come back is spaced practice's decision, and which item serves a concept is
 * this file's.
 *
 * Round-robin rather than concept-by-concept, so four due concepts and four
 * slots give four concepts rather than four questions about the first one.
 * Within a concept, an item the learner has not just seen comes first — a
 * review that re-asks the identical question tests whether the answer position
 * was memorised, not whether the idea was.
 */
export function selectDueItems(
  duePool: readonly Question[],
  dueOrder: readonly string[],
  conceptOf: (question: Question) => string | null,
  lastItemIds: ReadonlySet<string>,
  limit: number,
): Question[] {
  if (limit <= 0) return [];
  const byConcept = new Map<string, Question[]>();
  for (const question of duePool) {
    const concept = conceptOf(question);
    if (concept === null) continue;
    const bucket = byConcept.get(concept) ?? [];
    bucket.push(question);
    byConcept.set(concept, bucket);
  }
  for (const [concept, bucket] of byConcept) {
    byConcept.set(
      concept,
      [...bucket].sort(
        (a, b) =>
          Number(lastItemIds.has(a.id)) - Number(lastItemIds.has(b.id)) ||
          (b.importance ?? 5) - (a.importance ?? 5) ||
          a.id.localeCompare(b.id),
      ),
    );
  }

  const taken: Question[] = [];
  const used = new Set<string>();
  const order = dueOrder.filter((concept) => byConcept.has(concept));
  for (let round = 0; taken.length < limit && round < duePool.length; round++) {
    let progressed = false;
    for (const concept of order) {
      if (taken.length >= limit) break;
      const next = (byConcept.get(concept) ?? []).find((question) => !used.has(question.id));
      if (!next) continue;
      taken.push(next);
      used.add(next.id);
      progressed = true;
    }
    if (!progressed) break;
  }
  return taken;
}

/** Deterministic, curated-bank-only personalized review selection. */
export function selectPersonalizedReview(
  questions: Question[],
  stats: ReviewCategoryStat[],
  history: ReviewHistory[],
  count: number,
  now = Date.now(),
): { questions: Question[]; weakAreas: WeakArea[] } {
  const safeCount = Math.max(1, Math.min(50, Math.floor(count)));
  const statsByCategory = new Map(stats.map((row) => [row.category, row]));
  const historyByQuestion = new Map(history.map((row) => [row.question_id, row]));

  const score = (question: Question): number => {
    const category = statsByCategory.get(question.category);
    const accuracy = category && category.total_questions > 0
      ? category.total_correct / category.total_questions
      : 0.6;
    const item = historyByQuestion.get(question.id);
    const lastSeen = item ? Date.parse(item.last_seen_at) : 0;
    const lastMissed = item?.last_missed_at ? Date.parse(item.last_missed_at) : 0;
    const seenAge = lastSeen ? now - lastSeen : Number.POSITIVE_INFINITY;
    const missAge = lastMissed ? now - lastMissed : Number.POSITIVE_INFINITY;
    const recentMiss = Number.isFinite(missAge) ? Math.max(0, 45 - missAge / DAY_MS) : 0;
    const repeatedRecently = seenAge < 3 * DAY_MS ? 80 - seenAge / DAY_MS : 0;
    const missRatio = item?.times_seen ? item.times_missed / item.times_seen : 0;
    return (1 - accuracy) * 100 + (question.importance ?? 5) * 8 + recentMiss + missRatio * 30 - repeatedRecently;
  };

  const ranked = [...questions].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const older = ranked.filter((question) => {
    const seen = historyByQuestion.get(question.id)?.last_seen_at;
    return !seen || now - Date.parse(seen) >= 3 * DAY_MS;
  });
  const olderIds = new Set(older.map((question) => question.id));
  const candidates = [...older, ...ranked.filter((question) => !olderIds.has(question.id))];

  // Rotate difficulty targets while preserving the ranked ordering within a
  // bucket. This avoids a weak category producing ten nearly identical easy
  // questions and makes each set useful across recall and application.
  const byDifficulty = new Map<number, Question[]>();
  for (const question of candidates) {
    const bucket = byDifficulty.get(question.difficulty) ?? [];
    bucket.push(question);
    byDifficulty.set(question.difficulty, bucket);
  }
  const selected: Question[] = [];
  const selectedIds = new Set<string>();
  const cycle = [2, 3, 1, 4, 3, 2, 5];
  for (let i = 0; selected.length < safeCount && i < candidates.length * 2; i++) {
    const bucket = byDifficulty.get(cycle[i % cycle.length]) ?? [];
    const next = bucket.find((question) => !selectedIds.has(question.id));
    if (next) {
      selected.push(next);
      selectedIds.add(next.id);
    }
  }
  for (const question of candidates) {
    if (selected.length >= safeCount) break;
    if (!selectedIds.has(question.id)) {
      selected.push(question);
      selectedIds.add(question.id);
    }
  }

  const weakAreas = [...stats]
    .filter((row) => row.total_questions > 0)
    .sort((a, b) => {
      const accuracyA = a.total_correct / a.total_questions;
      const accuracyB = b.total_correct / b.total_questions;
      return accuracyA - accuracyB || b.total_questions - a.total_questions || a.category.localeCompare(b.category);
    })
    .slice(0, 3)
    .map((row) => {
      const tags = new Map<string, number>();
      for (const question of selected.filter((item) => item.category === row.category)) {
        for (const tag of question.tags.slice(0, 4)) tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
      return {
        category: row.category,
        accuracyPct: Math.round(100 * row.total_correct / row.total_questions),
        answered: row.total_questions,
        focusTags: [...tags.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 3)
          .map(([tag]) => tag),
      };
    });

  return { questions: selected, weakAreas };
}
