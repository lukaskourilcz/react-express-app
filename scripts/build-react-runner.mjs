import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { buildSandboxWorker } from './build-sandbox-worker.mjs';

// The QuickJS grader's worker thread (lib/coding/sandbox.ts).
await buildSandboxWorker();

// The grader's own code runs in strict mode, as its ES module sources were
// written: a stack trace the component reads then hands out no grader
// function or receiver.
await build({
  entryPoints: ['scripts/react-sandbox-entry.ts'],
  outfile: 'lib/coding/generated/react-sandbox.cjs',
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', target: 'node24',
  banner: { js: '"use strict";' },
});

// The SDK's transitive dependencies include ESM-only packages. Vercel's
// CommonJS runtime must not depend on Node's experimental require(ESM) flag.
await build({
  entryPoints: ['@vercel/sandbox'],
  outfile: 'lib/coding/generated/vercel-sandbox.cjs',
  bundle: true, platform: 'node', format: 'cjs', target: 'node22',
});

// Reproduce the deployed CommonJS boundary, even on newer local Node versions
// where require(ESM) would otherwise hide this packaging regression.
execFileSync(process.execPath, [
  '--no-experimental-require-module', '-e',
  'if (!require("./lib/coding/generated/vercel-sandbox.cjs").Sandbox) process.exit(1)',
], { stdio: 'inherit' });
