/**
 * Card-Level Spaced Repetition Loop & Scheduler (#197).
 * Implements FSRS / Leitner scheduler with stability/difficulty updates,
 * format escalation on lapse, and daily-review queue capping.
 */

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type QuestionFormatTier = 'free_response' | 'multiple_choice' | 'recall_hint';

export interface CardReviewState {
  cardId: string;
  intervalDays: number;
  easeFactor: number;       // Base: 2.5 (Leitner/SM-2 ease)
  stability: number;        // Days retention probability remains >= 90%
  difficulty: number;       // Scale: 1 (easiest) to 10 (hardest)
  reps: number;             // Successful consecutive repetitions
  lapses: number;           // Times failed ('again')
  dueTimestamp: number;     // Epoch millisecond when card becomes due
  lastReviewedAt: number;
  formatTier: QuestionFormatTier;
}

export interface ReviewScheduleOptions {
  now?: number;
  dailyReviewLimit?: number;
}

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_DAILY_LIMIT = 20;

/**
 * Creates an unreviewed, initial card state.
 */
export function createInitialCardState(cardId: string, now: number = Date.now()): CardReviewState {
  return {
    cardId,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    stability: 1.0,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    dueTimestamp: now,
    lastReviewedAt: 0,
    formatTier: 'multiple_choice',
  };
}

/**
 * Calculates next card review state with stability/difficulty update and format escalation on lapse.
 */
export function updateCardReviewState(
  current: CardReviewState,
  rating: ReviewRating,
  now: number = Date.now()
): CardReviewState {
  const next = { ...current, lastReviewedAt: now };

  if (rating === 'again') {
    // 1. Lapse occurred
    next.lapses += 1;
    next.reps = 0;
    next.intervalDays = 1; // Drop to minimum 1-day interval
    next.stability = Math.max(0.5, current.stability * 0.5);
    next.difficulty = Math.min(10.0, current.difficulty + 1.5);
    next.easeFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.2);

    // Format Escalation on Lapse: drop back to simpler scaffolding
    if (current.formatTier === 'free_response') {
      next.formatTier = 'multiple_choice';
    } else if (current.formatTier === 'multiple_choice') {
      next.formatTier = 'recall_hint';
    }
  } else {
    // 2. Successful review (hard / good / easy)
    next.reps += 1;

    // Difficulty adjustment
    if (rating === 'hard') {
      next.difficulty = Math.min(10.0, current.difficulty + 0.5);
      next.easeFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.15);
    } else if (rating === 'easy') {
      next.difficulty = Math.max(1.0, current.difficulty - 0.8);
      next.easeFactor = current.easeFactor + 0.15;
    }

    // Interval growth across standard multi-tier schedule
    if (next.reps === 1) {
      next.intervalDays = rating === 'easy' ? 3 : (rating === 'hard' ? 1 : 2);
    } else if (next.reps === 2) {
      next.intervalDays = rating === 'easy' ? 7 : (rating === 'hard' ? 3 : 5);
    } else {
      const modifier = rating === 'easy' ? 1.3 : (rating === 'hard' ? 0.8 : 1.0);
      next.intervalDays = Math.max(next.intervalDays + 1, Math.round(current.intervalDays * next.easeFactor * modifier));
    }

    next.stability = Math.round(next.intervalDays * 1.2 * 10) / 10;

    // Format escalation on success: advance towards open recall
    if (next.reps >= 3 && current.formatTier !== 'free_response') {
      next.formatTier = 'free_response';
    } else if (next.reps >= 1 && current.formatTier === 'recall_hint') {
      next.formatTier = 'multiple_choice';
    }
  }

  const DAY_MS = 86400000;
  next.dueTimestamp = now + (next.intervalDays * DAY_MS);

  return next;
}

/**
 * Surfaces cards due today, sorted by urgency (lapsed first), capped at dailyReviewLimit.
 */
export function selectDueReviewCards(
  cards: CardReviewState[],
  options: ReviewScheduleOptions = {}
): CardReviewState[] {
  const now = options.now ?? Date.now();
  const limit = options.dailyReviewLimit ?? DEFAULT_DAILY_LIMIT;

  return cards
    .filter((card) => card.dueTimestamp <= now)
    .sort((a, b) => {
      // Prioritize lapsed/failed cards first, then oldest overdue
      if (a.lapses !== b.lapses) return b.lapses - a.lapses;
      return a.dueTimestamp - b.dueTimestamp;
    })
    .slice(0, limit);
}

/**
 * Progress serialization helpers for cross-session persistence.
 */
export function exportCardReviewProgress(cards: CardReviewState[]): string {
  return JSON.stringify(cards, null, 2);
}

export function importCardReviewProgress(rawJson: string): CardReviewState[] {
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.cardId === 'string' && typeof c.dueTimestamp === 'number');
  } catch {
    return [];
  }
}
