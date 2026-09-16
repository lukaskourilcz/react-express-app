/** Puzzle sprint: the three-minute mode's rules, in one place both the browser
 * and the server import.
 *
 * The mode is Lichess Puzzle Storm's shape, which is public and has been played
 * for years: a single clock for the whole run, one point per correct answer, a
 * combo that adds seconds as it grows, and a wrong answer that costs ten
 * seconds and empties the combo.
 *
 * Two rules decide everything else in this file:
 *
 *   1. **The server owns the score.** The browser never reports one. Every
 *      answer is graded by `api/quiz/submit.ts`, which seals a score proof
 *      carrying a server-minted timestamp; `replaySprint` walks those
 *      timestamps and derives the score, the bonuses and the deadline from
 *      them alone. A client clock is never read, never sent and never trusted.
 *   2. **The clock is derived, not stored.** There is no "time remaining"
 *      anywhere in the protocol. The deadline is a function of the run's start
 *      and the answers that have been graded so far, so the browser's display
 *      and the server's verdict are the same computation over the same inputs.
 *
 * Nothing here touches access, XP rates, streaks, ranks or content. A sprint is
 * the same free questions as every other mode, on a different clock.
 */

import type { ScopeSubjectId } from './subject-catalog';

/** The whole run, before any bonus or penalty. Three minutes. */
export const SPRINT_DURATION_MS = 180_000;

/** Seconds a wrong answer removes from the running deadline. */
export const SPRINT_WRONG_PENALTY_S = 10;

/**
 * The combo curve. Each step is granted once per unbroken run of correct
 * answers, when the combo counter reaches `at`. A wrong answer empties the
 * combo, so the curve can be earned again from zero — which is the whole point
 * of a combo bar: it is a thing to rebuild, not a one-time unlock.
 */
export const SPRINT_COMBO_STEPS: ReadonlyArray<{ at: number; bonusS: number }> = [
  { at: 5, bonusS: 3 },
  { at: 12, bonusS: 5 },
  { at: 20, bonusS: 7 },
  { at: 30, bonusS: 10 },
];

/** The subjects that offer the sprint. chessShark and mathShark, and no other:
 * a sprint needs items that can be read and answered in a few seconds. */
export const SPRINT_SUBJECTS: ReadonlyArray<ScopeSubjectId> = ['chess', 'math'];

export const isSprintSubject = (value: unknown): value is ScopeSubjectId =>
  typeof value === 'string' && (SPRINT_SUBJECTS as readonly string[]).includes(value);

/**
 * A defensive ceiling on the replayed score, well above anything the clock can
 * physically produce: the longest possible window is three minutes plus the
 * whole combo curve (205 s), and no human reads and answers a question in under
 * a second. 300 is therefore unreachable by play and still bounds the number
 * the API will ever write to a board or turn into XP.
 */
export const SPRINT_MAX_SCORE = 300;

/** Upper bound on the proof array one run may submit. */
export const SPRINT_MAX_PROOFS = 400;

export interface SprintEvent {
  questionId: string;
  isCorrect: boolean;
  /** When the server graded this answer. Never a browser timestamp. */
  at: number;
}

export interface SprintReplay {
  /** Correct answers that landed inside the running clock. */
  score: number;
  /** Wrong answers that landed inside the running clock. */
  wrong: number;
  /** The longest unbroken run of correct answers. */
  longestCombo: number;
  /** Milliseconds the combo curve added. */
  bonusMs: number;
  /** Milliseconds wrong answers removed. */
  penaltyMs: number;
  /** The clock's final position: start + duration + bonuses − penalties. */
  deadlineAt: number;
  /** The last counted answer's time, or the start when nothing counted. */
  endedAt: number;
  /** Answers dropped for arriving after the clock had already run out. */
  rejected: number;
}

/**
 * Replay one run from its server-minted answer timestamps.
 *
 * Duplicates are collapsed by question id — the grading ledger already refuses
 * to grade the same question twice in a run, so a repeated proof is a replayed
 * request, not a second answer. The earliest one wins.
 *
 * An answer graded after the deadline is dropped rather than counted: the run
 * was over when it arrived. That is the rule that makes a withheld answer
 * useless as a way to buy time, because the clock the next answer is judged
 * against has already moved.
 */
export function replaySprint(startedAt: number, events: ReadonlyArray<SprintEvent>): SprintReplay {
  const start = Number.isFinite(startedAt) ? startedAt : 0;
  const ordered = [...events]
    .filter((event) => event && typeof event.questionId === 'string' && Number.isFinite(event.at))
    .sort((a, b) => a.at - b.at || a.questionId.localeCompare(b.questionId));

  const seen = new Set<string>();
  let deadlineAt = start + SPRINT_DURATION_MS;
  let score = 0;
  let wrong = 0;
  let combo = 0;
  let longestCombo = 0;
  let bonusMs = 0;
  let penaltyMs = 0;
  let rejected = 0;
  let endedAt = start;

  for (const event of ordered) {
    if (seen.has(event.questionId)) continue;
    seen.add(event.questionId);
    // A timestamp before the run started can only come from a server clock
    // stepping backwards between minting the run and grading the answer. The
    // proof is sealed, so it is not forgery; count it at the start instead of
    // charging the learner for the skew.
    const at = Math.max(start, event.at);
    if (at > deadlineAt) {
      rejected++;
      continue;
    }
    endedAt = at;
    if (event.isCorrect) {
      score++;
      combo++;
      if (combo > longestCombo) longestCombo = combo;
      const step = SPRINT_COMBO_STEPS.find((one) => one.at === combo);
      if (step) {
        bonusMs += step.bonusS * 1000;
        deadlineAt += step.bonusS * 1000;
      }
    } else {
      wrong++;
      combo = 0;
      penaltyMs += SPRINT_WRONG_PENALTY_S * 1000;
      deadlineAt -= SPRINT_WRONG_PENALTY_S * 1000;
    }
  }

  return {
    score: Math.min(score, SPRINT_MAX_SCORE),
    wrong,
    longestCombo,
    bonusMs,
    penaltyMs,
    deadlineAt,
    endedAt,
    rejected,
  };
}

/**
 * The next combo step a run is working toward, for the bar the learner watches.
 * Returns null once the curve's last step has been reached in this combo.
 */
export function nextComboStep(combo: number): { at: number; bonusS: number } | null {
  return SPRINT_COMBO_STEPS.find((step) => step.at > combo) ?? null;
}

/** How full the combo bar is, 0–100, between the last step reached and the next. */
export function comboProgressPct(combo: number): number {
  const next = nextComboStep(combo);
  if (!next) return 100;
  const previous = [...SPRINT_COMBO_STEPS].reverse().find((step) => step.at <= combo)?.at ?? 0;
  const span = next.at - previous;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((combo - previous) / span) * 100)));
}
