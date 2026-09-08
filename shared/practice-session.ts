/** Short practice sessions built from time, topic and the learner's plan
 * (issue #159).
 *
 * The builder is pure and deterministic: the same inputs always produce the
 * same queue, so a resumed session is the session the learner left and the
 * selection can be tested without a database. It schedules nothing of its own —
 * the review dates come from the coding review ladder that already exists, and
 * eligibility comes from the progression policy. Choosing a session can never
 * open a task the policy has not opened.
 *
 * Times are estimates and are labelled as estimates. A session is a suggestion
 * about how long something might take, not a timer. */

export const SESSION_MINUTES = [5, 10, 20, 40] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];
export const isSessionMinutes = (value: unknown): value is SessionMinutes =>
  SESSION_MINUTES.includes(value as SessionMinutes);

export type PracticeItemKind = 'review' | 'saved' | 'new';

export interface PracticeCandidate {
  taskId: string;
  track: string;
  estimatedMinutes: number;
  tier: number;
  /** True when the learner may start it right now. */
  eligible: boolean;
  /** True when an authored arrangement puzzle exists (issue #154). */
  hasPuzzle: boolean;
}

export interface PracticeItem {
  taskId: string;
  kind: PracticeItemKind;
  estimatedMinutes: number;
}

export interface PracticeSessionPlan {
  minutes: SessionMinutes;
  items: PracticeItem[];
  /** The sum of the estimates. Always presented as an estimate. */
  estimatedMinutes: number;
  /** Fewer items than the budget could hold, because nothing else was eligible. */
  short: boolean;
}

export interface BuildPracticeSessionInput {
  minutes: SessionMinutes;
  /** Every task the learner could be offered, in plan order. */
  candidates: readonly PracticeCandidate[];
  /** Task ids due for review, oldest first. */
  due: readonly string[];
  /** Task ids the learner saved. */
  saved: readonly string[];
  /** Task ids already passed. */
  passed: readonly string[];
  /** Task ids skipped in this sitting; a skipped task does not come straight
   * back in the same optional session (issue #160). */
  skipped?: readonly string[];
  /** On a touch screen, prefer tasks that have an arrangement puzzle. */
  preferPuzzles?: boolean;
}

/** At most this share of a session is spent on review, so new work still moves. */
const REVIEW_SHARE = 0.5;

/**
 * Compose the queue: due reviews first (up to half the budget), then saved
 * work, then new eligible tasks in plan order. Deterministic throughout — no
 * clock, no randomness, no set iteration order.
 */
export function buildPracticeSession(input: BuildPracticeSessionInput): PracticeSessionPlan {
  const passed = new Set(input.passed);
  const skipped = new Set(input.skipped ?? []);
  const saved = new Set(input.saved);
  const byId = new Map(input.candidates.map((one) => [one.taskId, one]));

  const budget = input.minutes;
  const reviewBudget = Math.max(0, Math.round(budget * REVIEW_SHARE));
  const items: PracticeItem[] = [];
  const used = new Set<string>();
  let spent = 0;
  let reviewSpent = 0;

  const take = (candidate: PracticeCandidate, kind: PracticeItemKind, cap: number, spentSoFar: number): boolean => {
    if (used.has(candidate.taskId) || !candidate.eligible || skipped.has(candidate.taskId)) return false;
    // An item that would blow the whole budget is still offered when nothing is
    // in the queue yet, so a five-minute session is never empty by arithmetic.
    if (items.length > 0 && spentSoFar + candidate.estimatedMinutes > cap) return false;
    items.push({ taskId: candidate.taskId, kind, estimatedMinutes: candidate.estimatedMinutes });
    used.add(candidate.taskId);
    spent += candidate.estimatedMinutes;
    return true;
  };

  for (const taskId of input.due) {
    const candidate = byId.get(taskId);
    if (!candidate) continue;
    if (take(candidate, 'review', Math.min(budget, reviewBudget), reviewSpent)) reviewSpent += candidate.estimatedMinutes;
    if (reviewSpent >= reviewBudget) break;
  }

  const ordered = (kind: PracticeItemKind, pool: readonly PracticeCandidate[]) => {
    const preferred = input.preferPuzzles
      ? [...pool].sort((a, b) => Number(b.hasPuzzle) - Number(a.hasPuzzle))
      : pool;
    for (const candidate of preferred) {
      if (spent >= budget) break;
      take(candidate, kind, budget, spent);
    }
  };

  ordered('saved', input.candidates.filter((one) => saved.has(one.taskId) && !passed.has(one.taskId)));
  ordered('new', input.candidates.filter((one) => !saved.has(one.taskId) && !passed.has(one.taskId)));

  const estimatedMinutes = items.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  return { minutes: budget, items, estimatedMinutes, short: estimatedMinutes < budget };
}

/** The stored session: where the learner is, so a resume lands in place. */
export interface PracticeSessionState {
  sessionId: string;
  minutes: SessionMinutes;
  taskIds: string[];
  /** Index into `taskIds`; equals the length when the session is finished. */
  position: number;
  startedAt: string;
  completedAt: string | null;
}

export interface PracticeSessionResponse {
  session: PracticeSessionState | null;
  /** The plan a fresh session of each length would produce right now. */
  available: SessionMinutes[];
}
