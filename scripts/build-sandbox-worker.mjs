// Bundles the QuickJS grader's worker thread (scripts/sandbox-worker-entry.ts)
// into one self-contained CommonJS file. QuickJS and its WebAssembly are
// inside it, so the deployed function needs nothing from node_modules to
// start the thread. build-react-runner.mjs runs this on every build, and the
// suites that grade code run it first so they exercise the same thread.
import { build } from 'esbuild';

export async function buildSandboxWorker() {
  await build({
    entryPoints: ['scripts/sandbox-worker-entry.ts'],
    outfile: 'lib/coding/generated/quickjs-sandbox.cjs',
    bundle: true, platform: 'node', format: 'cjs', target: 'node22', logLevel: 'warning',
  });
}
