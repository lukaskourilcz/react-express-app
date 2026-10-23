// The browser runner's clock, phase by phase (audit C3-7 and C5-2). A worker
// that never loads is the connection's problem, not the learner's; a type that
// keeps the checker busy is stopped within seconds and named as a type
// problem; only a run that started and did not finish is a loop.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runCodeTests, warmRunner, TYPE_CHECK_TIMEOUT_MS, COMPILE_TIMEOUT_MS } from '../src/coding/runner/run-tests';
import { RUN_TIMEOUT_MS, TIMEOUT_MESSAGE, TYPE_CHECK_STOPPED_MESSAGE } from '../../shared/coding-evaluate';

// The worker's compiler, with a checker that runs out of stack on any real
// code (a type that keeps recursing). The compiler itself is never loaded.
vi.mock('typescript', () => ({ default: {} }));
vi.mock('../../shared/coding-ts-check', async (original) => ({
  ...(await original<typeof import('../../shared/coding-ts-check')>()),
  createTypeScript: () => ({
    check: (code: string) => {
      if (code) throw new RangeError('Maximum call stack size exceeded');
      return { codeErrors: [], typeTests: [] };
    },
    toJavaScript: (code: string) => code,
  }),
}));

type Script = (worker: FakeWorker) => void;
let script: Script = () => {};
let started = 0;
class FakeWorker {
  constructor() { started += 1; }
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  terminated = false;
  post(data: unknown) { this.onmessage?.({ data } as MessageEvent); }
  postMessage() { queueMicrotask(() => script(this)); }
  terminate() { this.terminated = true; }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const run = (track: 'javascript' | 'typescript') => runCodeTests({ track, code: 'x', tests: [{ call: 'f()', expected: 1 }] });

it('reports a worker that never loaded as the runner, not as the code', async () => {
  script = (worker) => worker.onerror?.(new Event('error'));
  const outcome = await run('javascript');
  expect(outcome.runnerUnavailable).toBe(true);
  expect(outcome.codeError).toBeNull();
  expect(outcome.timedOut).toBe(false);
});

it('reports an error the learner’s code threw as a code error', async () => {
  script = (worker) => { worker.post({ phase: 'running' }); worker.onerror?.(Object.assign(new Event('error'), { message: 'Uncaught Error: boom' })); };
  const outcome = await run('javascript');
  expect(outcome.runnerUnavailable).toBeUndefined();
  expect(outcome.codeError).toBe('Uncaught Error: boom');
});

it('does not call a slow download an infinite loop', async () => {
  script = () => { /* the worker script never arrives */ };
  const pending = run('javascript');
  await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS + 1);
  let settled = false;
  void pending.then(() => { settled = true; });
  await vi.advanceTimersByTimeAsync(0);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS);
  expect(await pending).toMatchObject({ runnerUnavailable: true, timedOut: false });
});

it('stops a runaway type check within seconds and names the types', async () => {
  script = (worker) => { worker.post({ phase: 'compiling' }); worker.post({ phase: 'checking' }); };
  const pending = run('typescript');
  await vi.advanceTimersByTimeAsync(TYPE_CHECK_TIMEOUT_MS + 1);
  expect(await pending).toMatchObject({ timedOut: true, codeError: TYPE_CHECK_STOPPED_MESSAGE });
  expect(TYPE_CHECK_TIMEOUT_MS).toBeLessThan(10_000);
});

it('names a run that started and never finished a loop', async () => {
  script = (worker) => worker.post({ phase: 'running' });
  const pending = run('javascript');
  await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS + 1);
  expect(await pending).toMatchObject({ timedOut: true, codeError: TIMEOUT_MESSAGE });
});

it('passes on a compiler that did not download as unavailable', async () => {
  script = (worker) => { worker.post({ phase: 'compiling' }); worker.post({ phase: 'done', results: [], logs: [], codeError: null, check: null, runnerUnavailable: true }); };
  expect(await run('typescript')).toMatchObject({ runnerUnavailable: true, codeError: null });
});

it('loads the runner ahead of the first Run, unless the browser asks to save data', () => {
  script = () => {};
  started = 0;
  warmRunner('typescript')();
  expect(started).toBe(1);
  vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } });
  warmRunner('typescript')();
  expect(started).toBe(1);
});

// A checker that ran out of stack reported the raw RangeError as the
// learner's code throwing, with the hint for a throw; the server and the
// runner's own clock both call it a stopped type check.
it('names a checker that ran out of stack a stopped type check, as Submit does', async () => {
  const posted: Record<string, unknown>[] = [];
  vi.stubGlobal('postMessage', (message: Record<string, unknown>) => { posted.push(message); });
  await import('../src/coding/runner/worker');
  const onmessage = (self as unknown as { onmessage: (event: { data: unknown }) => Promise<void> }).onmessage;
  await onmessage({ data: { track: 'typescript', code: 'type Loop<T> = Loop<[T]>;', calls: ['f()'], expectations: [1], typeTests: [] } });
  expect(posted.map((message) => message.phase)).toEqual(['compiling', 'checking', 'done']);
  expect(posted[posted.length - 1]).toMatchObject({ codeError: TYPE_CHECK_STOPPED_MESSAGE, timedOut: true, check: null, results: [] });
});
