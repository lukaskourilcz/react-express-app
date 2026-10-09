/** XP paid again, or held back by the hour (migration 060, owner decision of
 * 9 October 2026). The routines report it as JSON; the handlers keep only
 * these shapes and pass them to the browser, which says it in a toast. */

/** A Learn level or part test passed again: the XP it paid, or when its XP
 * opens again. */
export interface LearnRepeatXp {
  /** XP this pass paid again; 0 when it paid none. */
  xp: number;
  /** When the step's XP can be earned again (ISO). */
  availableAt: string | null;
  /** 'cooldown' when the step paid its XP less than an hour ago, so this
   * pass paid none. */
  withheld: 'cooldown' | null;
}

/** The correct answers of a quiz, daily or Challenge result that paid no XP
 * because their question paid this account XP less than an hour ago. */
export interface QuestionXpHeld {
  questions: number;
  /** When the last of them pays again (ISO). */
  availableAt: string;
}

const isoOf = (value: unknown): string | null =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;

/** complete_verified_roadmap_attempt_v2's `repeatXp`, or null. */
export function learnRepeatXpOf(value: unknown): LearnRepeatXp | null {
  if (!value || typeof value !== 'object') return null;
  const one = value as { xp?: unknown; availableAt?: unknown; withheld?: unknown };
  const xp = typeof one.xp === 'number' && Number.isInteger(one.xp) && one.xp > 0 ? one.xp : 0;
  return { xp, availableAt: isoOf(one.availableAt), withheld: one.withheld === 'cooldown' ? 'cooldown' : null };
}

/** The `xpHeld` of record_verified_quiz_result_v3 and
 * record_challenge_completion_v2, or null when nothing was held back. */
export function questionXpHeldOf(value: unknown): QuestionXpHeld | null {
  if (!value || typeof value !== 'object') return null;
  const one = value as { questions?: unknown; availableAt?: unknown };
  const at = isoOf(one.availableAt);
  const questions = typeof one.questions === 'number' && Number.isInteger(one.questions) ? one.questions : 0;
  return questions > 0 && at ? { questions, availableAt: at } : null;
}
