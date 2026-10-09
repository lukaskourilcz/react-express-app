/* The Run button's realm, in node, for the contracts that compare Run with
 * Submit.
 *
 * The browser worker (client/src/coding/runner/worker.ts) runs each program
 * in a fresh realm that shared/coding-run-realm.ts turns into the grader's:
 * Prague time, the grader's locale methods, and no global the grader lacks.
 * Here each run gets a fresh node:vm context with the web globals a worker
 * has, the same two modules are bundled into it, and the program runs
 * through the same evaluateCalls. So a test can hold Run and Submit to the
 * same answer without a browser; tests/browser/coding-workbench.spec.ts does
 * the same against the real worker. */

import { buildSync } from 'esbuild';
import { createContext, runInContext } from 'node:vm';
import type { EvaluateResult } from '../shared/coding-evaluate';

const ENTRY = `
import { evaluateCalls } from './shared/coding-evaluate';
import { prepareRunRealm } from './shared/coding-run-realm';
globalThis.__runRealm = (input) => evaluateCalls({ ...input, hidden: prepareRunRealm(globalThis) });
`;

let bundle: string | null = null;
const source = (): string => {
  bundle ??= buildSync({
    stdin: { contents: ENTRY, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, format: 'iife', platform: 'neutral', target: 'es2022', write: false, logLevel: 'silent',
  }).outputFiles[0].text;
  return bundle;
};

/** Globals a browser worker has beyond the language. The realm keeps the
 * ones the grader has and removes the rest. */
const workerGlobals = (): Record<string, unknown> => ({
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone, performance,
  URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
  crypto: globalThis.crypto, fetch: globalThis.fetch, Blob, AbortController, Event, EventTarget, BroadcastChannel, MessageChannel,
});

/** Runs a program as the Run button does: a new realm for every run. */
export async function evaluateInRunRealm(input: { code: string; calls: string[]; expectations?: unknown[] | null }): Promise<EvaluateResult> {
  const realm = createContext(workerGlobals());
  runInContext(source(), realm);
  const run = (realm as { __runRealm: (value: typeof input) => Promise<EvaluateResult> }).__runRealm;
  // Plain data from here, so the caller's comparisons see this realm's objects.
  return JSON.parse(JSON.stringify(await run({ code: input.code, calls: [...input.calls], expectations: input.expectations ?? null }))) as EvaluateResult;
}
