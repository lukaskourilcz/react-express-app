// The TypeScript checker's worker thread. `npm run build:react-runner`
// (through build-sandbox-worker.mjs) bundles this file into
// lib/coding/generated/ts-check-worker.cjs, with `typescript` left to
// node_modules; lib/coding/ts-check-pool.ts starts it and stops it when a
// check overstays its deadline. One check at a time: the checker loads and
// parses its lib files first, then says when the learner's check starts, then
// answers with the results and the code as JavaScript.
import { parentPort } from 'node:worker_threads';
import { nodeTypeScriptChecker, transpileOrNull } from '../lib/coding/ts-check-node';
import type { TypeTestInput } from '../shared/coding-ts-check';

const port = parentPort;
if (!port) throw new Error('ts-check-worker-entry runs as a worker thread');

let warmed = false;

port.on('message', (message: { type?: unknown; code?: unknown; sets?: TypeTestInput[][] }) => {
  if (message?.type !== 'check' || typeof message.code !== 'string' || !Array.isArray(message.sets)) return;
  try {
    const checker = nodeTypeScriptChecker();
    // The lib files are parsed on the first check. That is the thread's cost,
    // not the learner's, so it happens before the clock starts.
    if (!warmed) {
      checker.check('', []);
      warmed = true;
    }
    port.postMessage({ type: 'start' });
    const code = message.code;
    const results = message.sets.map((tests) => checker.check(code, tests));
    port.postMessage({ type: 'done', results, javascript: transpileOrNull(checker, code) });
  } catch (error) {
    port.postMessage({ type: 'fail', message: String((error as Error)?.message ?? error) });
  }
});
