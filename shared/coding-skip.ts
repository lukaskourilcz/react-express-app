/** Skipping a task, with a reason and a useful next step (issue #160).
 *
 * A skip is feedback, not progress. It records why the learner moved on, never
 * awards XP, evidence or an unlock, and never marks anything complete. A task a
 * Learn level requires stays required and comes back — with an explanation of
 * why it is back — while an optional session will not serve it again in the
 * same sitting. */

export type SkipReason = 'too-easy' | 'too-hard' | 'missing-prerequisite' | 'unclear' | 'later';

export const SKIP_REASONS: readonly SkipReason[] = ['too-easy', 'too-hard', 'missing-prerequisite', 'unclear', 'later'];
export const isSkipReason = (value: unknown): value is SkipReason =>
  typeof value === 'string' && (SKIP_REASONS as readonly string[]).includes(value);

/** An optional note, kept short on purpose: this is a signal, not a support ticket. */
export const MAX_SKIP_NOTE = 280;

export interface CodingSkipRequest {
  taskId: string;
  reason: SkipReason;
  note?: string;
  /** The practice session this skip happened in, when there is one. */
  sessionId?: string;
}

export interface CodingSkipResponse {
  recorded: boolean;
  /** Stated explicitly so no surface has to guess: a skip awards nothing. */
  awarded: { xp: 0; completion: false; unlock: false };
  /** True when a Learn level requires this task, so it will come back. */
  required: boolean;
  /** Another eligible task to try instead, when one exists. */
  next: { taskId: string; track: string } | null;
  /** Remedial reading for a missing prerequisite, when one applies. */
  remedial: { topic: string; level: number } | null;
}
