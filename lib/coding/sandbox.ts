/** Server-side execution of learner JavaScript inside QuickJS (WebAssembly).
 *
 * Nothing from the host is reachable: no `process`, no `require`, no network,
 * no real timers. Timers are virtual, so a debounce task that waits 80 ms
 * finishes in microseconds and the same code grades the same way every time.
 * A memory limit, a stack limit and a CPU deadline bound every run. This is
 * the verdict of record for JavaScript and TypeScript tasks. */

import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline, type QuickJSWASMModule, type QuickJSHandle } from 'quickjs-emscripten';
import variant from '@jitl/quickjs-singlefile-cjs-release-sync';
import type { EvaluateResult } from '../../shared/coding-evaluate';
import { TIMEOUT_MESSAGE, deepEqual, displayValue } from '../../shared/coding-evaluate';
import { CONSOLE_SOURCE } from '../../shared/coding-console';

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
/** What a learner sees when their call chain ran out of stack. Named rather
 * than inlined so the message reads the same wherever the overflow surfaces. */
const STACK_MESSAGE = 'The call stack ran out of room: the recursion went too deep, or a base case is never reached.';

// The learner is compiled in a separate strict function scope. This controller
// stays in an inaccessible closure held by the host, never in VM globals.
// Expected values and pass/fail comparison stay entirely outside QuickJS.
function program(code: string, calls: string[]): string {
  return `(() => {
'use strict';
const apply = Reflect.apply, keys = Object.keys, isArray = Array.isArray;
const setPrototype = Object.setPrototypeOf, stringify = JSON.stringify;
const NativeFunction = Function, nativeThen = Promise.prototype.then;
const string = String, number = Number, is = Object.is;
const makeArray = () => setPrototype([], null);
const packet = (...values) => setPrototype(values, null);
let now = 0, nextId = 1, timers = makeArray(), logs = makeArray();
let done = false, output = null;
const encode = (value, depth = 0, seen = makeArray()) => {
  if (depth > 40) throw new Error('Result nesting limit exceeded');
  if (value === undefined) return packet('undefined');
  if (value === null) return packet('null');
  if (typeof value === 'number') return packet('number', is(value, -0) ? '-0' : string(value));
  if (typeof value === 'string' || typeof value === 'boolean') return packet(typeof value, value);
  if (typeof value !== 'object') throw new Error('Result is not cloneable');
  for (let i = 0; i < seen.length; i++) if (seen[i] === value) throw new Error('Circular result');
  seen[seen.length] = value;
  const entries = makeArray();
  const names = isArray(value) ? null : keys(value);
  const length = names ? names.length : value.length;
  if (length > 10000) throw new Error('Result size limit exceeded');
  for (let i = 0; i < length; i++) {
    entries[entries.length] = names ? packet(names[i], encode(value[names[i]], depth + 1, seen)) : encode(value[i], depth + 1, seen);
  }
  seen.length--;
  return packet(names ? 'object' : 'array', entries);
};
const message = error => { try { return string(error && error.message || error); } catch { return 'Evaluation failed'; } };
const emit = line => {
  if (logs.length >= ${MAX_LOGS}) return;
  logs[logs.length] = string(line);
};
const schedule = (fn, ms, interval, args) => {
  const id = nextId++, delay = number(ms) || 0;
  timers[timers.length] = { id, at: now + (delay > 0 ? delay : 0), fn, args, interval: interval ? (delay > 1 ? delay : 1) : null };
  return id;
};
globalThis.setTimeout = (fn, ms, ...args) => schedule(fn, ms, false, args);
globalThis.setInterval = (fn, ms, ...args) => schedule(fn, ms, true, args);
globalThis.clearTimeout = globalThis.clearInterval = id => {
  const kept = makeArray();
  for (let i = 0; i < timers.length; i++) if (timers[i].id !== id) kept[kept.length] = timers[i];
  timers = kept;
};
globalThis.queueMicrotask = fn => { void (async () => { await 0; fn(); })(); };
const parse = JSON.parse;
globalThis.structuredClone = value => parse(stringify(value));
Date.now = () => 1700000000000 + now;
globalThis.performance = { now: () => now };
// The same console the browser worker builds, from the same source, so Run
// and Submit print identical lines. Its natives are captured here, before the
// learner's code has run.
globalThis.console = (${CONSOLE_SOURCE})(emit, () => now);
const evaluate = NativeFunction(${JSON.stringify('"use strict";\n' + code + '\n;return [' + calls.map(call => '() => (' + call.trim().replace(/;+$/, '') + '\n)').join(',') + '];')})();
const outcomes = makeArray();
let remaining = ${calls.length};
if (!remaining) { output = stringify(outcomes); done = true; }
for (let i = 0; i < ${calls.length}; i++) {
  const invoke = async () => {
    try { outcomes[i] = packet('value', encode(await evaluate[i]())); }
    catch (error) { outcomes[i] = packet('error', message(error)); }
  };
  apply(nativeThen, invoke(), [() => {
    remaining--;
    if (!remaining) { output = stringify(outcomes); done = true; }
  }]);
}
return {
  done: () => done,
  output: () => output,
  logs: () => stringify(logs),
  tick: () => {
    if (!timers.length) return false;
    let first = 0;
    for (let i = 1; i < timers.length; i++) if (timers[i].at < timers[first].at || (timers[i].at === timers[first].at && timers[i].id < timers[first].id)) first = i;
    const timer = timers[first], rest = makeArray();
    for (let i = 0; i < timers.length; i++) if (i !== first) rest[rest.length] = timers[i];
    timers = rest;
    now = timer.at > now ? timer.at : now;
    if (timer.interval !== null) { timer.at = now + timer.interval; timers[timers.length] = timer; }
    try { if (typeof timer.fn === 'function') apply(timer.fn, null, timer.args); }
    catch (error) { emit('timer error: ' + message(error)); }
    return true;
  },
};
})()`;
}

function decode(value: unknown, depth = 0): unknown {
  if (depth > 40 || !Array.isArray(value)) throw new Error('Malformed result');
  const [type, data] = value;
  if (type === 'undefined') return undefined;
  if (type === 'null') return null;
  if (type === 'number' && typeof data === 'string') return Number(data);
  if (type === 'string' && typeof data === 'string') return data;
  if (type === 'boolean' && typeof data === 'boolean') return data;
  if (type === 'array' && Array.isArray(data)) return data.map(item => decode(item, depth + 1));
  if (type === 'object' && Array.isArray(data)) return Object.fromEntries(data.map(entry => {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') throw new Error('Malformed property');
    return [entry[0], decode(entry[1], depth + 1)];
  }));
  throw new Error('Malformed result value');
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
  let driver: QuickJSHandle | null = null;
  const readDriver = (name: string): unknown => {
    if (!driver) return undefined;
    const fn = vm.getProp(driver, name);
    try {
      const result = vm.callFunction(fn, vm.undefined);
      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw new Error(error?.message ?? 'Evaluator failed');
      }
      try { return vm.dump(result.value); } finally { result.value.dispose(); }
    } finally { fn.dispose(); }
  };
  const readLogs = (): string[] => {
    const raw = readDriver('logs');
    return typeof raw === 'string' ? JSON.parse(raw) : [];
  };
  const failure = (message: string, timedOut = false): EvaluateResult => {
    let logs: string[] = [];
    try { logs = readLogs(); } catch { /* the VM may be unusable after an interrupt */ }
    return { results: [], logs, codeError: message, timedOut };
  };
  const isInterrupt = (message: string) => /interrupted|InternalError: interrupted/i.test(message);
  const isStackOverflow = (message: string) => /stack overflow|maximum call stack|gc_obj_list/i.test(message);

  try {
    const evaluated = vm.evalCode(program(input.code, input.calls), 'task.js');
    if (evaluated.error) {
      const error = vm.dump(evaluated.error) as { message?: string; name?: string } | string;
      evaluated.error.dispose();
      const message = typeof error === 'string' ? error : `${error?.name ?? 'Error'}: ${error?.message ?? 'failed'}`;
      if (isInterrupt(message)) return failure(TIMEOUT_MESSAGE, true);
      if (isStackOverflow(message)) return failure(STACK_MESSAGE);
      return failure(message.replace(/^SyntaxError: /, 'SyntaxError: '));
    }
    driver = evaluated.value;

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
      if (readDriver('done') === true) break;
      const didFire = readDriver('tick') === true;
      if (!didFire && !runtime.hasPendingJob()) {
        // Nothing left to run and the calls have not settled: a promise that
        // never resolves. Report it instead of waiting for the deadline.
        return failure('A call never settled: a promise or timer is still pending.');
      }
    }

    if (readDriver('done') !== true) return failure(TIMEOUT_MESSAGE, true);
    const raw = readDriver('output');
    const logs = readLogs();
    if (typeof raw !== 'string' || raw.length > 1_000_000) return failure('The run produced an invalid result.');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== input.calls.length) return failure('Incomplete evaluation.');
    const results = parsed.map((outcome, index) => {
      if (!Array.isArray(outcome)) throw new Error('Malformed result');
      if (outcome[0] === 'error' && typeof outcome[1] === 'string') return { pass: false, actual: null, error: outcome[1] };
      if (outcome[0] !== 'value') throw new Error('Malformed result');
      const actual = decode(outcome[1]);
      return { pass: input.expectations ? deepEqual(actual, input.expectations[index]) : null, actual: displayValue(actual), error: null };
    });
    return { results, logs, codeError: null, timedOut: false };
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    if (isInterrupt(message)) return failure(TIMEOUT_MESSAGE, true);
    if (isStackOverflow(message)) return failure(STACK_MESSAGE);
    return failure(message.includes('memory') ? 'Out of memory.' : message);
  } finally {
    // Disposal can fail after a run that exhausted the stack: QuickJS asserts
    // its object list is empty and aborts the whole WebAssembly instance.
    // Letting that escape would discard the result the run already produced and
    // surface deep recursion — an ordinary learner mistake this module promises
    // to report rather than crash on — as a 500. Swallow it, and drop the
    // cached module so the next run starts from a clean instance.
    let disposalFailed = false;
    try { driver?.dispose(); } catch { disposalFailed = true; }
    try { vm.dispose(); } catch { disposalFailed = true; }
    try { runtime.dispose(); } catch { disposalFailed = true; }
    if (disposalFailed) modulePromise = null;
  }
}
