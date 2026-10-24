// Perf baseline #587 C01: one worker per page keeps TypeScript's compiler
// loaded across Runs. It only type-checks and transpiles; the learner's code
// must never run in it, since its realm is the browser's and it outlives the
// Run. This pins the real worker module, not the fake one coding-runner uses.
import { beforeEach, expect, it, vi } from 'vitest';
import type { RunnerRequest } from '../src/coding/runner/worker';

const spies = vi.hoisted(() => ({ evaluate: vi.fn(), realm: vi.fn() }));

vi.mock('typescript', () => ({ default: {} }));
vi.mock('../../shared/coding-ts-check', async (original) => ({
  ...(await original<typeof import('../../shared/coding-ts-check')>()),
  createTypeScript: () => ({
    check: () => ({ codeErrors: [], typeTests: [] }),
    toJavaScript: (code: string) => `/* js */ ${code}`,
  }),
}));
vi.mock('../../shared/coding-evaluate', async (original) => ({
  ...(await original<typeof import('../../shared/coding-evaluate')>()),
  evaluateCalls: async (...args: unknown[]) => { spies.evaluate(...args); return { results: [], logs: [], codeError: null }; },
}));
vi.mock('../../shared/coding-run-realm', () => ({
  prepareRunRealm: (...args: unknown[]) => { spies.realm(...args); return new Set<string>(); },
}));

const posted: Record<string, unknown>[] = [];
let onmessage: (event: { data: RunnerRequest }) => Promise<void>;

beforeEach(async () => {
  posted.length = 0;
  spies.evaluate.mockClear();
  spies.realm.mockClear();
  vi.stubGlobal('postMessage', (message: Record<string, unknown>) => { posted.push(message); });
  await import('../src/coding/runner/worker');
  onmessage = (self as unknown as { onmessage: typeof onmessage }).onmessage;
});

it('only checks and transpiles a compileOnly request, and never runs the code or touches its realm', async () => {
  // Even a request that carries calls is not run by the compiler worker.
  await onmessage({ data: { track: 'typescript', code: 'const f = (): number => 1;', calls: ['f()'], expectations: [1], typeTests: [], compileOnly: true } });
  expect(posted.map((message) => message.phase)).toEqual(['compiling', 'checking', 'compiled']);
  expect(posted[2]).toMatchObject({ js: '/* js */ const f = (): number => 1;', check: { codeErrors: [], typeTests: [] } });
  expect(spies.evaluate).not.toHaveBeenCalled();
  expect(spies.realm).not.toHaveBeenCalled();
});

it('still runs a plain TypeScript request in its own worker, in the grader\'s realm', async () => {
  await onmessage({ data: { track: 'typescript', code: 'const f = (): number => 1;', calls: ['f()'], expectations: [1], typeTests: [] } });
  expect(posted.map((message) => message.phase)).toEqual(['compiling', 'checking', 'running', 'done']);
  expect(spies.realm).toHaveBeenCalledTimes(1);
  expect(spies.evaluate).toHaveBeenCalledTimes(1);
});

it('says whether the compiler loaded when warmed with it, and warms nothing else without it', async () => {
  await onmessage({ data: { track: 'typescript', code: '', calls: [], expectations: null, warm: true, compiler: true } });
  await onmessage({ data: { track: 'typescript', code: '', calls: [], expectations: null, warm: true } });
  expect(posted).toEqual([{ phase: 'warm', ready: true }, { phase: 'warm', ready: true }]);
  expect(spies.evaluate).not.toHaveBeenCalled();
});
