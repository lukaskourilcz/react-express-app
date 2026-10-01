/** Runs a learner's JavaScript against a list of call expressions and compares
 * the results by deep equality. Shared by the browser worker (untrusted code,
 * isolated in a Worker) and the node content test (trusted reference
 * solutions). The server never uses this: learner code there runs inside the
 * QuickJS sandbox in `lib/coding/sandbox.ts`. Ported from interview-prepper. */

import { learnerConsoleFactory } from './coding-console';

export const RUN_TIMEOUT_MS = 2_000;
/** Timer- and promise-based tasks need longer than a synchronous one. */
export const ASYNC_TIMEOUT_MS = 6_000;
export const TIMEOUT_MESSAGE = 'Timed out. Check for an infinite loop.';
export const MAX_LOGS = 100;
/** Console output is capped by size as well as by line count: a line past
 * MAX_LOG_LINE_CHARS is cut, and past MAX_LOG_CHARS in all the rest is
 * dropped, so a print loop cannot make a response too large to send or a
 * Console tab too long to draw. Both runners apply the same caps. */
export const MAX_LOG_LINE_CHARS = 2_000;
export const MAX_LOG_CHARS = 64_000;
export const LOG_LINE_CUT = ' … (line cut)';
export const LOG_OUTPUT_CUT = '… (output cut)';

/**
 * The built-ins a check's probe counts with. A check that grades how code
 * touches its input (a binary search's reads, a one-pass budget) wraps the
 * input in a `Proxy` and counts the index reads it sees. Code that replaced
 * the global `Proxy` (`var Proxy = function (t) { return t; };`) or
 * `RegExp.prototype.test` made every count zero, and a linear scan passed a
 * binary-search budget. Both runners take these before the learner's code
 * runs and hand them to it as the constant `__probe`, declared on the first
 * line (PROBE_LINE), which the code cannot redeclare; the object is frozen.
 * Checks and path harnesses write `new __probe.Proxy(...)`,
 * `__probe.isIndex(key)` and `__probe.get(...)`.
 */
export const PROBE_LINE = '"use strict"; const __probe = arguments[arguments.length - 1];';
/** Whether a property key is an array index, with no built-in method. The
 * grading sandbox embeds the same function as source (PROBE_IS_INDEX_SOURCE). */
const isProbeIndex = (key: unknown): boolean => {
  if (typeof key !== 'string' || key.length === 0) return false;
  for (let i = 0; i < key.length; i++) {
    const c = key[i];
    if (c < '0' || c > '9') return false;
  }
  return true;
};
export const PROBE_IS_INDEX_SOURCE =
  "(key) => { if (typeof key !== 'string' || key.length === 0) return false; for (let i = 0; i < key.length; i++) { const c = key[i]; if (c < '0' || c > '9') return false; } return true; }";
/** Taken when this module loads, before any learner code in this realm. */
const PROBE = Object.freeze({ Proxy, get: Reflect.get, isIndex: isProbeIndex });

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

const formatArg = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
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
  let logChars = 0;
  let logsCut = false;
  const emit = (line: string) => {
    if (logsCut || logs.length >= MAX_LOGS) return;
    const text = line.length > MAX_LOG_LINE_CHARS ? line.slice(0, MAX_LOG_LINE_CHARS) + LOG_LINE_CUT : line;
    if (logChars + text.length > MAX_LOG_CHARS) {
      logs.push(LOG_OUTPUT_CUT);
      logsCut = true;
      return;
    }
    logChars += text.length;
    logs.push(text);
  };
  // The same console the grading sandbox gives the code, on the real clock.
  const sink = learnerConsoleFactory()(emit, formatArg, () => (typeof performance === 'undefined' ? Date.now() : performance.now()));
  const grading = Array.isArray(input.expectations);

  let evaluate: (calls: string[], console: typeof sink, probe: typeof PROBE) => Promise<{ ok: boolean; value?: unknown; error?: string }[]>;
  try {
    // Declarations from the learner's code are in scope for the direct eval of
    // each call, so a suite sees the functions the code defines. Strict mode,
    // as in the grading sandbox: an undeclared assignment that Run let through
    // as a stray global would otherwise fail only on Submit. The first line
    // also declares `__probe` (PROBE_LINE), on the line "use strict" had, so
    // the learner's line numbers stay as they were.
    evaluate = new Function('__calls__', 'console', `${PROBE_LINE}\n${input.code}\n${[
      'return Promise.all(__calls__.map(async source => {',
      '  try { return { ok: true, value: await eval(source) }; }',
      '  catch (error) { return { ok: false, error: String((error && error.message) || error) }; }',
      '}));',
    ].join('\n')}`) as typeof evaluate;
  } catch (error) {
    return { results: [], logs, codeError: errorText(error) };
  }

  try {
    const outcomes = await evaluate(input.calls, sink, PROBE);
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
