// Runs a JavaScript or TypeScript task in the runner worker with a hard
// budget. Never rejects: a hung loop resolves as timed out once the worker is
// terminated, a crash resolves as a code error, and a runner that never
// loaded resolves as unavailable, which says nothing about the code.
import {
  ASYNC_TIMEOUT_MS,
  RUN_TIMEOUT_MS,
  TIMEOUT_MESSAGE,
  TYPE_CHECK_STOPPED_MESSAGE,
  type EvaluateResult,
} from '../../../../shared/coding-evaluate';
import type { TypeCheckResult, TypeTestInput } from '../../../../shared/coding-ts-check';
import type { CallTest } from '../../../../shared/coding-catalog';
import type { RunnerRequest } from './worker';

/** Loading the runner, and for the first TypeScript run the compiler (about
 * 1 MB) and its lib files. Running out of it is the network's doing. */
export const COMPILE_TIMEOUT_MS = 45_000;
/** Checking the learner's types once the compiler is loaded. A task's checks
 * take well under a second; a type that keeps recursing is stopped here and
 * reported as a type problem, not a loop. The server stops the same check
 * after 4 s, and Submit never waits for this one. */
export const TYPE_CHECK_TIMEOUT_MS = 8_000;

export type RunPhase = 'starting' | 'compiling' | 'checking' | 'running';

export interface RunOutcome extends EvaluateResult {
  check: TypeCheckResult | null;
  timedOut: boolean;
  /** The runner or the compiler never loaded (offline, or a failed
   * download). Nothing ran, so nothing is said about the code. */
  runnerUnavailable?: boolean;
}

export interface RunInput {
  track: 'javascript' | 'typescript';
  code: string;
  tests: CallTest[];
  typeTests?: TypeTestInput[];
  /** false = the Run button: report values, grade nothing. */
  grade?: boolean;
  onPhase?: (phase: RunPhase) => void;
  signal?: AbortSignal;
}

const runnerWorker = (): Worker => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

export function runCodeTests(input: RunInput): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const budget = input.tests.some((test) => test.async) ? ASYNC_TIMEOUT_MS : RUN_TIMEOUT_MS;
    const unavailable: Partial<RunOutcome> = { runnerUnavailable: true };
    let worker: Worker;
    try {
      worker = runnerWorker();
    } catch {
      resolve({ results: [], logs: [], codeError: null, check: null, timedOut: false, ...unavailable });
      return;
    }

    let settled = false;
    let started = false;
    let timer: number | undefined;
    const finish = (payload: Partial<RunOutcome>) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve({ results: [], logs: [], codeError: null, check: null, timedOut: false, ...payload });
    };
    const arm = (ms: number, payload: Partial<RunOutcome>) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => finish(payload), ms);
    };

    input.signal?.addEventListener('abort', () => finish({ codeError: 'Cancelled' }), { once: true });
    input.onPhase?.('starting');
    // Until the worker answers, the clock measures the download, not the code.
    arm(COMPILE_TIMEOUT_MS, unavailable);

    worker.onmessage = (event: MessageEvent<{ phase: string } & Partial<RunOutcome>>) => {
      const message = event.data;
      started = true;
      if (message.phase === 'compiling') {
        input.onPhase?.('compiling');
        arm(COMPILE_TIMEOUT_MS, unavailable);
        return;
      }
      if (message.phase === 'checking') {
        input.onPhase?.('checking');
        arm(TYPE_CHECK_TIMEOUT_MS, { timedOut: true, codeError: TYPE_CHECK_STOPPED_MESSAGE });
        return;
      }
      if (message.phase === 'running') {
        input.onPhase?.('running');
        arm(budget, { timedOut: true, codeError: TIMEOUT_MESSAGE });
        return;
      }
      finish(message);
    };
    // An error with a message came from the learner's code; one without, before
    // the worker ever answered, is a script that did not load.
    worker.onerror = (event) => {
      const message = (event as ErrorEvent).message;
      finish(message ? { codeError: String(message) } : started ? { codeError: 'The runner crashed.' } : unavailable);
    };

    const request: RunnerRequest = {
      track: input.track,
      code: input.code,
      calls: input.tests.map((test) => test.call),
      expectations: input.grade === false ? null : input.tests.map((test) => test.expected),
      typeTests: input.typeTests,
    };
    worker.postMessage(request);
  });
}

/** Loads the runner, and for TypeScript the compiler, while the learner reads
 * the task, so the first Run does not wait for the download and still works
 * if the connection drops afterwards. The files stay in the browser's cache;
 * the worker that fetched them is closed. */
export function warmRunner(track: 'javascript' | 'typescript'): () => void {
  if (typeof Worker === 'undefined') return () => {};
  let worker: Worker | null = null;
  try {
    worker = runnerWorker();
  } catch {
    return () => {};
  }
  const close = () => { worker?.terminate(); worker = null; };
  const timer = window.setTimeout(close, COMPILE_TIMEOUT_MS);
  worker.onmessage = () => { window.clearTimeout(timer); close(); };
  worker.onerror = () => { window.clearTimeout(timer); close(); };
  const request: RunnerRequest = { track, code: '', calls: [], expectations: null, warm: true };
  worker.postMessage(request);
  return () => { window.clearTimeout(timer); close(); };
}

/** True when the run is a pass: every call matched and, for TypeScript, the types were clean. */
export function runPassed(outcome: RunOutcome): boolean {
  if (outcome.codeError || outcome.timedOut || outcome.runnerUnavailable || outcome.results.length === 0) return false;
  if (!outcome.results.every((result) => result.pass === true)) return false;
  if (outcome.check && (outcome.check.codeErrors.length > 0 || outcome.check.typeTests.some((one) => !one.pass))) return false;
  return true;
}
