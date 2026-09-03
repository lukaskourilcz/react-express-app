// Runs a JavaScript or TypeScript task in the runner worker with a hard
// budget. Never rejects: a hung loop resolves as timed out once the worker is
// terminated, a crash resolves as a code error.
import {
  ASYNC_TIMEOUT_MS,
  RUN_TIMEOUT_MS,
  TIMEOUT_MESSAGE,
  type EvaluateResult,
} from '../../../../shared/coding-evaluate';
import type { TypeCheckResult, TypeTestInput } from '../../../../shared/coding-ts-check';
import type { CallTest } from '../../../../shared/coding-catalog';
import type { RunnerRequest } from './worker';

/** The first TypeScript run has to download the compiler (about 700 kB). */
export const COMPILE_TIMEOUT_MS = 45_000;

export type RunPhase = 'starting' | 'compiling' | 'running';

export interface RunOutcome extends EvaluateResult {
  check: TypeCheckResult | null;
  timedOut: boolean;
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

export function runCodeTests(input: RunInput): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const budget = input.tests.some((test) => test.async) ? ASYNC_TIMEOUT_MS : RUN_TIMEOUT_MS;
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      resolve({ results: [], logs: [], codeError: String((error as Error)?.message ?? error), check: null, timedOut: false });
      return;
    }

    let settled = false;
    let timer: number | undefined;
    const finish = (payload: Partial<RunOutcome>) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve({ results: [], logs: [], codeError: null, check: null, timedOut: false, ...payload });
    };
    const arm = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => finish({ timedOut: true, codeError: TIMEOUT_MESSAGE }), ms);
    };

    input.signal?.addEventListener('abort', () => finish({ codeError: 'Cancelled' }), { once: true });
    input.onPhase?.('starting');
    arm(input.track === 'typescript' ? COMPILE_TIMEOUT_MS : budget);

    worker.onmessage = (event: MessageEvent<{ phase: string } & Partial<RunOutcome>>) => {
      const message = event.data;
      if (message.phase === 'compiling') {
        input.onPhase?.('compiling');
        arm(COMPILE_TIMEOUT_MS);
        return;
      }
      if (message.phase === 'running') {
        input.onPhase?.('running');
        arm(budget);
        return;
      }
      finish(message);
    };
    worker.onerror = (event) => finish({ codeError: String(event.message || 'The runner crashed.') });

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

/** True when the run is a pass: every call matched and, for TypeScript, the types were clean. */
export function runPassed(outcome: RunOutcome): boolean {
  if (outcome.codeError || outcome.timedOut || outcome.results.length === 0) return false;
  if (!outcome.results.every((result) => result.pass === true)) return false;
  if (outcome.check && (outcome.check.codeErrors.length > 0 || outcome.check.typeTests.some((one) => !one.pass))) return false;
  return true;
}
