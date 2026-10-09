/** What the two grader pools share (the QuickJS runs in sandbox.ts, the type
 * checks in ts-check-pool.ts): how long a run may wait for a thread, when a
 * thread that would not start is tried again, and what the caller hears when
 * the grader cannot take a run.
 *
 * A queue with no bound let one visitor's thirty runaway submits hold every
 * thread while everyone else's waited behind them, past the function's own
 * limit for TypeScript. And one thread that failed to start sent the instance
 * back to grading on the request thread for good. Now a run waits a bounded
 * time in a bounded queue, a failed start is retried after a growing pause,
 * and in both cases the caller is told the grader is busy: nothing about the
 * learner's code is known, so nothing is recorded.
 *
 * sandbox.ts is bundled into the QuickJS worker, so this module imports
 * nothing. */

/** The grader cannot take this run now. The handlers answer it with a retry
 * (`grader_busy` and a Retry-After), and record nothing. */
export class GraderBusyError extends Error {
  /** What stopped the run, for the logs. */
  readonly reason: string;
  /** Seconds after which another Submit is worth trying. */
  readonly retryAfterSeconds: number;
  constructor(reason: string, retryAfterSeconds = 5) {
    super('The checker is busy right now, so this Submit was not recorded. Try again in a few seconds.');
    this.name = 'GraderBusyError';
    this.reason = reason;
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

/** Submits one caller (an account, or an address for a guest) may have
 * grading at once on an instance for one coding task or learning-path
 * activity (`enterInFlight` in lib/rate-limit.ts). The workbench sends one at
 * a time; more is a script holding the grader's threads, and the rest of its
 * burst is refused at once instead of queueing in front of other learners.
 * The count is per task (owner decision, 9 October 2026), so a submit still
 * grading on one task never holds up another task's. */
export const GRADING_PER_TASK = 2;

/** The ceiling across every task and activity of one caller. A learner
 * submitting from two tabs at once never meets it, and it is one fewer than
 * the four QuickJS threads of an instance (lib/coding/sandbox.ts), so one
 * caller's runaway programs on several tasks never hold all of them. */
export const GRADING_PER_CALLER = 3;

/** What a grading count is kept for (`InFlightLimits.item`). */
export const gradingItem = {
  task: (taskId: string): string => `task:${taskId}`,
  activity: (pathId: string, activityId: string): string => `path:${pathId}:${activityId}`,
};

/** Whether a run may happen on the request thread when no worker thread can
 * take it: in tests and local runs, never on a deployment. There, a runaway
 * native-call loop would block every request the instance serves. */
export const inThreadGradingAllowed = (): boolean => process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';

/** A pool's threads. `acquire` resolves once one is the caller's; it throws
 * `GraderBusyError` at once when `waiting` runs are already queued, or once
 * the run has waited `waitMs`. A released thread goes to the longest waiter. */
export function threadSlots(limits: { threads: number; waiting: number; waitMs: number; name: string }) {
  const queue: (() => void)[] = [];
  let busy = 0;
  return {
    acquire(): Promise<void> {
      if (busy < limits.threads) {
        busy++;
        return Promise.resolve();
      }
      if (queue.length >= limits.waiting) return Promise.reject(new GraderBusyError(`${limits.name}_queue_full`));
      return new Promise<void>((resume, refuse) => {
        const take = () => {
          clearTimeout(timer);
          resume();
        };
        const timer = setTimeout(() => {
          const index = queue.indexOf(take);
          if (index >= 0) queue.splice(index, 1);
          refuse(new GraderBusyError(`${limits.name}_wait_expired`));
        }, limits.waitMs);
        queue.push(take);
      });
    },
    release(): void {
      const next = queue.shift();
      if (next) next();
      else busy--;
    },
  };
}

/** The longest pause before a thread that would not start is tried again. */
const MAX_BOOT_PAUSE_MS = 30_000;

/** When to try starting a thread again after one would not start: one second
 * after the first failure, doubling with each failure after a pause up to
 * thirty, and at once after a start that worked. Starts already under way
 * when a pause began fail with it and count once. */
export function bootBackoff() {
  let failures = 0;
  let retryAt = 0;
  return {
    /** Milliseconds until a new thread may be tried, 0 when it may be now. */
    pause(): number {
      return Math.max(0, retryAt - Date.now());
    },
    failed(): void {
      if (Date.now() < retryAt) return;
      failures++;
      retryAt = Date.now() + Math.min(MAX_BOOT_PAUSE_MS, 1_000 * 2 ** (failures - 1));
    },
    started(): void {
      failures = 0;
      retryAt = 0;
    },
  };
}
