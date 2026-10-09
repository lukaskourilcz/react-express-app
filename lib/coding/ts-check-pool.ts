/** TypeScript type checks, off the request thread and with a deadline.
 *
 * The compiler checks types synchronously, and a few hundred bytes of
 * recursive conditional types kept it busy for half a minute; larger inputs
 * took minutes. On the request thread that blocked the roadmap function, which
 * also serves Learn, for every other request the instance held. So a check
 * runs on a worker thread, and the thread is stopped when the learner's checks
 * run past TYPE_CHECK_DEADLINE_MS. The caller reports that as a timeout. The
 * same thread then turns the code into JavaScript: deeply nested code
 * overflows the compiler's stack there, and on the request thread that
 * surfaced as an HTTP 500.
 *
 * A thread keeps the compiler and its parsed lib files between checks; the
 * first check on a new thread parses them before its clock starts. Up to
 * MAX_WORKERS checks run at once, and further ones wait a bounded time for a
 * thread (grader-capacity.ts). When no thread can take a check, the caller
 * gets `GraderBusyError`. Only off a deployment, when the worker bundle is
 * missing (tests and local runs before a build) or a thread cannot start,
 * does the check run in this thread, as it did before; the missing bundle is
 * logged. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { TypeCheckResult, TypeTestInput } from '../../shared/coding-ts-check';
import { nodeTypeScriptChecker, transpileOrNull } from './ts-check-node';
import { bootBackoff, GraderBusyError, inThreadGradingAllowed, threadSlots } from './grader-capacity';

/** The worker bundle build-sandbox-worker.mjs writes
 * (scripts/ts-check-worker-entry.ts). vercel.json ships every
 * lib/coding/generated/*.cjs with api/quiz/roadmap.ts. */
export const TS_CHECK_WORKER_FILE = 'lib/coding/generated/ts-check-worker.cjs';
/** How long one submission's type checks and its transpile may take
 * together. A task's checks finish in well under a second on a warm thread. */
export const TYPE_CHECK_DEADLINE_MS = 4_000;
/** What the learner reads when the checker was stopped. */
export { TYPE_CHECK_STOPPED_MESSAGE } from '../../shared/coding-evaluate';
/** What the learner reads when the code could not be turned into JavaScript. */
export const TRANSPILE_FAILED_MESSAGE =
  'The compiler could not turn this TypeScript into JavaScript: the code nests too deeply. Flatten the most deeply nested functions, calls or blocks and submit again.';
/** How long a new thread may take to load the compiler and parse its libs. */
const WORKER_BOOT_MS = 20_000;
/** Threads checking at once; further checks wait for one to finish. */
const MAX_WORKERS = 2;
/** Checks that may wait for a thread; one more is told the grader is busy. */
const MAX_WAITING = 16;
/** How long a check may wait for a thread: two runaway checks ahead of it,
 * stopped at TYPE_CHECK_DEADLINE_MS, and the start of a new thread. */
export const TS_CHECK_SLOT_WAIT_MS = 8_000;
/** Threads kept loaded between checks. */
const IDLE_WORKERS = 1;
/** A thread's heap. A check that needs more ends the thread, as a timeout. */
const WORKER_HEAP_MB = 512;

/** The checks' results in the order of their sets and the code as
 * JavaScript, null when the compiler could not transpile it; or `stopped`
 * when the checker ran past its deadline, its heap or its stack. */
export type TypeCheckOutcome =
  | { stopped: false; results: TypeCheckResult[]; javascript: string | null }
  | { stopped: true; results: null; javascript: null };

const idleWorkers: Worker[] = [];
const slots = threadSlots({ threads: MAX_WORKERS, waiting: MAX_WAITING, waitMs: TS_CHECK_SLOT_WAIT_MS, name: 'ts_check' });
const boot = bootBackoff();
let workerFile: string | null | undefined;

const checkWorkerFile = (): string | null => {
  if (workerFile === undefined) {
    const file = join(process.cwd(), TS_CHECK_WORKER_FILE);
    workerFile = existsSync(file) ? file : null;
    if (!workerFile) console.warn(JSON.stringify({ level: 'warn', msg: 'ts_check_worker_missing', file: TS_CHECK_WORKER_FILE }));
  }
  return workerFile;
};

type WorkerReply = { type: 'start' } | { type: 'done'; results: TypeCheckResult[]; javascript: string | null } | { type: 'fail'; message: string };

/** The thread could not start or never picked the check up: the host's
 * fault, not the learner's. */
class WorkerUnavailableError extends Error {}

function newWorker(file: string): Worker {
  const worker = new Worker(file, { resourceLimits: { maxOldGenerationSizeMb: WORKER_HEAP_MB } });
  worker.unref();
  const forget = () => {
    const index = idleWorkers.indexOf(worker);
    if (index >= 0) idleWorkers.splice(index, 1);
  };
  worker.on('error', forget);
  worker.on('exit', forget);
  return worker;
}

function checkOnWorker(file: string, code: string, sets: readonly TypeTestInput[][], deadlineMs: number): Promise<TypeCheckOutcome> {
  const idle = idleWorkers.pop();
  const worker = idle ?? newWorker(file);
  return new Promise<TypeCheckOutcome>((resolve, reject) => {
    let settled = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (keep: boolean) => {
      settled = true;
      clearTimeout(timer);
      worker.off('message', onMessage);
      worker.off('error', onFailure);
      worker.off('exit', onFailure);
      if (keep && idleWorkers.length < IDLE_WORKERS) idleWorkers.push(worker);
      else void worker.terminate();
    };
    const stop = () => {
      if (settled) return;
      settle(false);
      resolve({ stopped: true, results: null, javascript: null });
    };
    const unavailable = (reason: string) => {
      if (settled) return;
      settle(false);
      reject(new WorkerUnavailableError(reason));
    };
    const onMessage = (reply: WorkerReply) => {
      if (settled) return;
      if (reply.type === 'start') {
        started = true;
        // A new thread that picked its check up ends the pause after a failed start.
        if (!idle) boot.started();
        clearTimeout(timer);
        timer = setTimeout(stop, deadlineMs);
        return;
      }
      if (reply.type === 'done') {
        settle(true);
        resolve({ stopped: false, results: reply.results, javascript: reply.javascript });
        return;
      }
      // The compiler threw. After the learner's check started that is their
      // types (a stack overflow in the checker); before, it is the host's.
      if (started) stop();
      else unavailable(`ts_check_worker_failed: ${reply.message.slice(0, 120)}`);
    };
    // A thread that dies mid-check (its heap limit) was ended by the
    // learner's types; one that dies before it started is the host's problem.
    const onFailure = () => (started ? stop() : unavailable('ts_check_worker_failed'));
    worker.on('message', onMessage);
    worker.on('error', onFailure);
    worker.on('exit', onFailure);
    timer = setTimeout(() => unavailable('ts_check_worker_boot_timeout'), WORKER_BOOT_MS);
    worker.postMessage({ type: 'check', code, sets });
  });
}

/**
 * Type-checks `code` once per set of type tests, then transpiles it, all
 * within `deadlineMs`. Results come back in the order of `sets`; checks the
 * thread had to stop come back as `stopped`, with no results. Throws
 * `GraderBusyError` when no thread can take the check (see runInSandbox).
 */
export async function checkTypes(
  code: string,
  sets: readonly TypeTestInput[][],
  deadlineMs: number = TYPE_CHECK_DEADLINE_MS,
): Promise<TypeCheckOutcome> {
  const inThread = (): TypeCheckOutcome => {
    const checker = nodeTypeScriptChecker();
    return { stopped: false, results: sets.map((tests) => checker.check(code, tests)), javascript: transpileOrNull(checker, code) };
  };
  const file = checkWorkerFile();
  if (!file) {
    if (inThreadGradingAllowed()) return inThread();
    throw new GraderBusyError('ts_check_worker_missing', 30);
  }
  await slots.acquire();
  try {
    const pause = idleWorkers.length === 0 ? boot.pause() : 0;
    if (pause > 0) {
      if (inThreadGradingAllowed()) return inThread();
      throw new GraderBusyError('ts_check_worker_backoff', pause / 1000);
    }
    return await checkOnWorker(file, code, sets, deadlineMs);
  } catch (error) {
    if (!(error instanceof WorkerUnavailableError)) throw error;
    boot.failed();
    console.warn(JSON.stringify({ level: 'warn', msg: 'ts_check_worker_unavailable', reason: error.message }));
    if (inThreadGradingAllowed()) return inThread();
    throw new GraderBusyError(error.message, boot.pause() / 1000);
  } finally {
    slots.release();
  }
}
