/** TypeScript type checks, off the request thread and with a deadline.
 *
 * The compiler checks types synchronously, and a few hundred bytes of
 * recursive conditional types kept it busy for half a minute; larger inputs
 * took minutes. On the request thread that blocked the roadmap function, which
 * also serves Learn, for every other request the instance held. So a check
 * runs on a worker thread, and the thread is stopped when the learner's checks
 * run past TYPE_CHECK_DEADLINE_MS. The caller reports that as a timeout.
 *
 * A thread keeps the compiler and its parsed lib files between checks; the
 * first check on a new thread parses them before its clock starts. Up to
 * MAX_WORKERS checks run at once, and further ones wait for a thread. When the
 * worker bundle is missing (tests and local runs before a build) or a thread
 * cannot start, the check runs in this thread, as it did before, and the
 * missing bundle is logged. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { TypeCheckResult, TypeTestInput } from '../../shared/coding-ts-check';
import { nodeTypeScriptChecker } from './ts-check-node';

/** The worker bundle build-sandbox-worker.mjs writes
 * (scripts/ts-check-worker-entry.ts). vercel.json ships every
 * lib/coding/generated/*.cjs with api/quiz/roadmap.ts. */
export const TS_CHECK_WORKER_FILE = 'lib/coding/generated/ts-check-worker.cjs';
/** How long one submission's type checks may take together. A task's checks
 * finish in well under a second on a warm thread. */
export const TYPE_CHECK_DEADLINE_MS = 4_000;
/** What the learner reads when the checker was stopped. */
export const TYPE_CHECK_STOPPED_MESSAGE =
  'Type checking stopped before it finished: it ran out of time, memory or stack. A type that keeps recursing, or one that builds very large unions or tuples, can do this.';
/** How long a new thread may take to load the compiler and parse its libs. */
const WORKER_BOOT_MS = 20_000;
/** Threads checking at once; further checks wait for one to finish. */
const MAX_WORKERS = 2;
/** Threads kept loaded between checks. */
const IDLE_WORKERS = 1;
/** A thread's heap. A check that needs more ends the thread, as a timeout. */
const WORKER_HEAP_MB = 512;

/** The checks' results in the order of their sets, or `stopped` when the
 * checker ran past its deadline, its heap or its stack. */
export type TypeCheckOutcome =
  | { stopped: false; results: TypeCheckResult[] }
  | { stopped: true; results: null };

const idleWorkers: Worker[] = [];
const waiting: (() => void)[] = [];
let busyWorkers = 0;
let workerFile: string | null | undefined;

const checkWorkerFile = (): string | null => {
  if (workerFile === undefined) {
    const file = join(process.cwd(), TS_CHECK_WORKER_FILE);
    workerFile = existsSync(file) ? file : null;
    if (!workerFile) console.warn(JSON.stringify({ level: 'warn', msg: 'ts_check_worker_missing', file: TS_CHECK_WORKER_FILE }));
  }
  return workerFile;
};

const acquireSlot = async (): Promise<void> => {
  if (busyWorkers < MAX_WORKERS) { busyWorkers++; return; }
  await new Promise<void>((resume) => waiting.push(resume));
};
const releaseSlot = () => {
  const next = waiting.shift();
  if (next) next();
  else busyWorkers--;
};

type WorkerReply = { type: 'start' } | { type: 'done'; results: TypeCheckResult[] } | { type: 'fail'; message: string };

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
  const worker = idleWorkers.pop() ?? newWorker(file);
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
      resolve({ stopped: true, results: null });
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
        clearTimeout(timer);
        timer = setTimeout(stop, deadlineMs);
        return;
      }
      if (reply.type === 'done') {
        settle(true);
        resolve({ stopped: false, results: reply.results });
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
 * Type-checks `code` once per set of type tests, all within `deadlineMs`.
 * Results come back in the order of `sets`; checks the thread had to stop
 * come back as `stopped`, with no results.
 */
export async function checkTypes(
  code: string,
  sets: readonly TypeTestInput[][],
  deadlineMs: number = TYPE_CHECK_DEADLINE_MS,
): Promise<TypeCheckOutcome> {
  const inThread = (): TypeCheckOutcome => {
    const checker = nodeTypeScriptChecker();
    return { stopped: false, results: sets.map((tests) => checker.check(code, tests)) };
  };
  const file = checkWorkerFile();
  if (!file) return inThread();
  await acquireSlot();
  try {
    return await checkOnWorker(file, code, sets, deadlineMs);
  } catch (error) {
    if (!(error instanceof WorkerUnavailableError)) throw error;
    console.warn(JSON.stringify({ level: 'warn', msg: 'ts_check_worker_unavailable', reason: error.message }));
    workerFile = null;
    return inThread();
  } finally {
    releaseSlot();
  }
}
