/** Server-side execution of learner JavaScript inside QuickJS (WebAssembly).
 *
 * Nothing from the host is reachable: no `process`, no `require`, no network,
 * no real timers. Timers are virtual, so a debounce task that waits 80 ms
 * finishes in microseconds and the same code grades the same way every time.
 * A memory limit, a stack limit and a CPU deadline bound every run. This is
 * the verdict of record for JavaScript and TypeScript tasks. */

import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline, type QuickJSWASMModule } from 'quickjs-emscripten';
import variant from '@jitl/quickjs-singlefile-cjs-release-sync';
import type { EvaluateResult } from '../../shared/coding-evaluate';
import { TIMEOUT_MESSAGE } from '../../shared/coding-evaluate';

let modulePromise: Promise<QuickJSWASMModule> | null = null;
const getModule = () => (modulePromise ??= newQuickJSWASMModuleFromVariant(variant));

export interface SandboxInput {
  code: string;
  calls: string[];
  expectations: unknown[] | null;
  /** CPU budget for the whole run. */
  deadlineMs?: number;
  memoryBytes?: number;
}

export const SANDBOX_DEADLINE_MS = 2_500;
const MEMORY_BYTES = 64 * 1024 * 1024;
const STACK_BYTES = 1024 * 1024;
const MAX_TICKS = 10_000;
const MAX_LOGS = 100;

// Runs inside the VM before the learner's code: a virtual clock, timers,
// console capture and the evaluator. Declared with `var` so a learner's own
// top-level `const` cannot collide with a `let` of the same name.
const PRELUDE = `
var __vtime = 0;
var __timers = [];
var __nextTimer = 1;
var __logs = [];
var __done = false;
var __out = null;
var __fmt = function (value) {
  if (typeof value === 'string') return value;
  try { var t = JSON.stringify(value); return t === undefined ? String(value) : t; } catch (e) { return String(value); }
};
var __display = function (value) {
  if (value === undefined) return 'undefined';
  try { var t = JSON.stringify(value); return t === undefined ? String(value) : t; } catch (e) { return String(value); }
};
var __deepEqual = function (a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (v, i) { return __deepEqual(v, b[i]); });
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    var ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && __deepEqual(a[k], b[k]); });
  }
  return false;
};
var __schedule = function (fn, ms, interval, args) {
  var id = __nextTimer++;
  var delay = Math.max(0, Number(ms) || 0);
  __timers.push({ id: id, at: __vtime + delay, fn: fn, args: args, interval: interval ? Math.max(1, delay) : null });
  return id;
};
var __tick = function () {
  if (__timers.length === 0) return false;
  __timers.sort(function (a, b) { return a.at - b.at || a.id - b.id; });
  var t = __timers.shift();
  __vtime = Math.max(__vtime, t.at);
  if (t.interval !== null) __timers.push({ id: t.id, at: __vtime + t.interval, fn: t.fn, args: t.args, interval: t.interval });
  try { if (typeof t.fn === 'function') t.fn.apply(null, t.args); } catch (e) { __logs.push('timer error: ' + String(e && e.message || e)); }
  return true;
};
var __record = function (level, args) {
  if (__logs.length < ${MAX_LOGS}) __logs.push(args.map(__fmt).join(' '));
};
globalThis.setTimeout = function (fn, ms) { return __schedule(fn, ms, false, Array.prototype.slice.call(arguments, 2)); };
globalThis.setInterval = function (fn, ms) { return __schedule(fn, ms, true, Array.prototype.slice.call(arguments, 2)); };
globalThis.clearTimeout = function (id) { __timers = __timers.filter(function (t) { return t.id !== id; }); };
globalThis.clearInterval = globalThis.clearTimeout;
globalThis.queueMicrotask = function (fn) { Promise.resolve().then(fn); };
globalThis.structuredClone = function (v) { return JSON.parse(JSON.stringify(v)); };
var __epoch = 1_700_000_000_000;
Date.now = function () { return __epoch + __vtime; };
globalThis.performance = { now: function () { return __vtime; } };
globalThis.console = {
  log: function () { __record('log', Array.prototype.slice.call(arguments)); },
  info: function () { __record('info', Array.prototype.slice.call(arguments)); },
  warn: function () { __record('warn', Array.prototype.slice.call(arguments)); },
  error: function () { __record('error', Array.prototype.slice.call(arguments)); },
  debug: function () { __record('debug', Array.prototype.slice.call(arguments)); },
};
`;

function program(code: string, calls: string[], expectations: unknown[] | null): string {
  const grading = Array.isArray(expectations);
  return `${PRELUDE}
var __calls = ${JSON.stringify(calls)};
var __expect = ${grading ? JSON.stringify(expectations) : 'null'};
(function () {
${code}
;Promise.all(__calls.map(async function (source) {
  try { return { ok: true, value: await eval(source) }; }
  catch (error) { return { ok: false, error: String((error && error.message) || error) }; }
})).then(function (outcomes) {
  __out = JSON.stringify(outcomes.map(function (outcome, index) {
    if (!outcome.ok) return { pass: false, actual: null, error: outcome.error };
    return { pass: __expect ? __deepEqual(outcome.value, __expect[index]) : null, actual: __display(outcome.value), error: null };
  }));
  __done = true;
}, function (error) {
  __out = JSON.stringify({ codeError: String((error && error.message) || error) });
  __done = true;
});
})();
`;
}

/** Runs one program. Never throws for learner mistakes: a syntax error, a
 * throw, an infinite loop or a promise that never settles all come back as
 * results the caller can show. */
export async function runInSandbox(input: SandboxInput): Promise<EvaluateResult> {
  const QuickJS = await getModule();
  const runtime = QuickJS.newRuntime();
  const deadline = Date.now() + (input.deadlineMs ?? SANDBOX_DEADLINE_MS);
  runtime.setMemoryLimit(input.memoryBytes ?? MEMORY_BYTES);
  runtime.setMaxStackSize(STACK_BYTES);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(deadline));
  const vm = runtime.newContext();
  const readLogs = (): string[] => {
    const handle = vm.getProp(vm.global, '__logs');
    try {
      const value = vm.dump(handle);
      return Array.isArray(value) ? value.map(String) : [];
    } finally {
      handle.dispose();
    }
  };
  const readGlobal = (name: string): unknown => {
    const handle = vm.getProp(vm.global, name);
    try {
      return vm.dump(handle);
    } finally {
      handle.dispose();
    }
  };
  const failure = (message: string, timedOut = false): EvaluateResult => {
    let logs: string[] = [];
    try { logs = readLogs(); } catch { /* the VM may be unusable after an interrupt */ }
    return { results: [], logs, codeError: message, timedOut };
  };
  const isInterrupt = (message: string) => /interrupted|InternalError: interrupted/i.test(message);

  try {
    const evaluated = vm.evalCode(program(input.code, input.calls, input.expectations), 'task.js');
    if (evaluated.error) {
      const error = vm.dump(evaluated.error) as { message?: string; name?: string } | string;
      evaluated.error.dispose();
      const message = typeof error === 'string' ? error : `${error?.name ?? 'Error'}: ${error?.message ?? 'failed'}`;
      if (isInterrupt(message)) return failure(TIMEOUT_MESSAGE, true);
      return failure(message.replace(/^SyntaxError: /, 'SyntaxError: '));
    }
    evaluated.value.dispose();

    for (let tick = 0; tick < MAX_TICKS; tick++) {
      const jobs = runtime.executePendingJobs();
      if (jobs.error) {
        const error = vm.dump(jobs.error) as { message?: string } | string;
        jobs.error.dispose();
        const message = typeof error === 'string' ? error : error?.message ?? 'failed';
        if (isInterrupt(message)) return failure(TIMEOUT_MESSAGE, true);
        // An unhandled rejection inside a job: keep pumping, the harness catches per call.
      }
      if (Date.now() > deadline) return failure(TIMEOUT_MESSAGE, true);
      if (readGlobal('__done') === true) break;
      const tickFn = vm.getProp(vm.global, '__tick');
      const fired = vm.callFunction(tickFn, vm.undefined);
      tickFn.dispose();
      if (fired.error) {
        const error = vm.dump(fired.error) as { message?: string } | string;
        fired.error.dispose();
        const message = typeof error === 'string' ? error : error?.message ?? 'failed';
        if (isInterrupt(message)) return failure(TIMEOUT_MESSAGE, true);
        continue;
      }
      const didFire = vm.dump(fired.value) === true;
      fired.value.dispose();
      if (!didFire && !runtime.hasPendingJob()) {
        // Nothing left to run and the calls have not settled: a promise that
        // never resolves. Report it instead of waiting for the deadline.
        return failure('A call never settled: a promise or timer is still pending.');
      }
    }

    if (readGlobal('__done') !== true) return failure(TIMEOUT_MESSAGE, true);
    const raw = readGlobal('__out');
    const logs = readLogs();
    if (typeof raw !== 'string') return { results: [], logs, codeError: 'The run produced no result.' };
    const parsed = JSON.parse(raw) as EvaluateResult['results'] | { codeError: string };
    if (!Array.isArray(parsed)) return { results: [], logs, codeError: parsed.codeError ?? 'failed' };
    return { results: parsed, logs, codeError: null, timedOut: false };
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    if (isInterrupt(message)) return failure(TIMEOUT_MESSAGE, true);
    return failure(message.includes('memory') ? 'Out of memory.' : message);
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}
