/** Runs a learner's JavaScript against a list of call expressions and compares
 * the results by deep equality. Shared by the browser worker (untrusted code,
 * isolated in a Worker) and the node content test (trusted reference
 * solutions). The server never uses this: learner code there runs inside the
 * QuickJS sandbox in `lib/coding/sandbox.ts`. Ported from interview-prepper. */

import { CONSOLE_SOURCE, type ConsoleFactory } from './coding-console';

export const RUN_TIMEOUT_MS = 2_000;
/** Timer- and promise-based tasks need longer than a synchronous one. */
export const ASYNC_TIMEOUT_MS = 6_000;
export const TIMEOUT_MESSAGE = 'Timed out. Check for an infinite loop.';
export const MAX_LOGS = 100;

export interface CallOutcome {
  /** null when the run was not graded (the Run button). */
  pass: boolean | null;
  actual: string | null;
  error: string | null;
}

export interface EvaluateResult {
  results: CallOutcome[];
  logs: string[];
  codeError: string | null;
  timedOut?: boolean;
}

export const deepEqual = (actual: unknown, expected: unknown): boolean => {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length &&
      actual.every((value, index) => deepEqual(value, expected[index]));
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    return actualKeys.length === expectedKeys.length &&
      actualKeys.every((key) => Object.prototype.hasOwnProperty.call(expected, key) &&
        deepEqual((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key]));
  }
  return false;
};

/** Renders a value the way the results table shows it. */
export const displayValue = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text;
  } catch {
    return String(value);
  }
};

let cachedFactory: ConsoleFactory | null = null;
/** The shared console, compiled once per worker from its single source. */
const consoleFactory = (): ConsoleFactory => {
  cachedFactory ??= new Function(`return (${CONSOLE_SOURCE});`)() as ConsoleFactory;
  return cachedFactory;
};

const errorText = (error: unknown): string =>
  String((error && typeof error === 'object' && 'message' in error && (error as { message?: unknown }).message) || error);

/**
 * Runs `code` once and evaluates each call in its scope. Pass `expectations`
 * to grade, or omit them to just run: an ungraded call reports what it
 * returned with `pass: null`. Every call is awaited, so a promise is graded on
 * what it resolves to. Only clone-safe strings cross the worker boundary.
 */
export async function evaluateCalls(input: { code: string; calls: string[]; expectations?: unknown[] | null }): Promise<EvaluateResult> {
  const logs: string[] = [];
  const emit = (line: string) => {
    if (logs.length < MAX_LOGS) logs.push(line);
  };
  // Built here rather than at module load: this file also reaches the page
  // bundle for its types and constants, and the page's policy forbids eval.
  // Only the worker (and the node content test) ever get this far.
  const sink = consoleFactory()(emit, () => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const grading = Array.isArray(input.expectations);

  let evaluate: (calls: string[], console: typeof sink) => Promise<{ ok: boolean; value?: unknown; error?: string }[]>;
  try {
    // Declarations from the learner's code are in scope for the direct eval of
    // each call, so a suite sees the functions the code defines.
    evaluate = new Function('__calls__', 'console', `${input.code}\n${[
      'return Promise.all(__calls__.map(async source => {',
      '  try { return { ok: true, value: await eval(source) }; }',
      '  catch (error) { return { ok: false, error: String((error && error.message) || error) }; }',
      '}));',
    ].join('\n')}`) as typeof evaluate;
  } catch (error) {
    return { results: [], logs, codeError: errorText(error) };
  }

  try {
    const outcomes = await evaluate(input.calls, sink);
    const results = outcomes.map((outcome, index): CallOutcome => {
      if (!outcome.ok) return { pass: false, actual: null, error: outcome.error ?? 'Error' };
      return {
        pass: grading ? deepEqual(outcome.value, input.expectations![index]) : null,
        actual: displayValue(outcome.value),
        error: null,
      };
    });
    return { results, logs, codeError: null };
  } catch (error) {
    return { results: [], logs, codeError: errorText(error) };
  }
}

/** True when every case in a completed graded run passed. */
export const allPassed = (run: EvaluateResult): boolean =>
  !run.codeError && !run.timedOut && run.results.length > 0 && run.results.every((result) => result.pass === true);
