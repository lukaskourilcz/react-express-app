/* What a fresh function instance evaluates before it can answer (#587).
 *
 * Vercel's @vercel/node compiles every file under api/ and lib/ to CommonJS
 * on its own and leaves node_modules outside, so a `require` runs when its
 * module first evaluates. These checks bundle a module the same way (esbuild,
 * CommonJS, packages external, dynamic `import()` kept lazy), require it in a
 * fresh Node process with no Supabase or Upstash settings, and read what that
 * process loaded. Nothing calls the network.
 *
 * They pin the cold-start properties the performance pass bought:
 *  - lib/coding/active.ts computes the per-task source versions on first
 *    read, not at import (server item 15), and the lazy map holds the same
 *    hashes as before. */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const out = join(root, 'node_modules/.cache/shark/cold-start');

interface Loaded {
  /** npm packages the process had loaded once the module was required. */
  packages: string[];
  /** What the probe expression returned, JSON-encoded by the child. */
  probe: unknown;
}

/** Bundle `entry` as @vercel/node would ship it and require it in a fresh
 * process. `probe` is a JavaScript expression evaluated in that process with
 * `mod` bound to the module's exports, after the require. */
export async function loadFresh(entry: string, probe = 'null'): Promise<Loaded> {
  mkdirSync(out, { recursive: true });
  const outfile = join(out, `${entry.replace(/[/[\]]/g, '_').replace(/\.ts$/, '')}.cjs`);
  await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    outfile,
    logLevel: 'warning',
    absWorkingDir: root,
  });
  const code = [
    `const mod = require(${JSON.stringify(outfile)});`,
    'const packages = [...new Set(Object.keys(require.cache)',
    '  .map((path) => (path.match(/node_modules\\/((?:@[^/]+\\/)?[^/]+)/) || [])[1])',
    "  .filter((name) => name && name !== '.cache'))].sort();",
    `Promise.resolve(${probe}).then((probe) => { console.log(JSON.stringify({ packages, probe })); process.exit(0); });`,
  ].join('\n');
  const env: Record<string, string> = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_ENV: 'development' };
  const child = spawnSync(process.execPath, ['-e', code], { cwd: root, env, encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.equal(child.status, 0, `${entry} loads in a fresh process: ${child.stderr.slice(0, 800)}`);
  return JSON.parse(child.stdout.trim().split('\n').pop()!) as Loaded;
}

export async function coldStartContracts(): Promise<void> {
  // ── server item 15: the coding source versions are hashed on first read ──
  {
    const fresh = await loadFresh('lib/coding/active.ts', 'mod.CODING_SOURCE_VERSIONS.built');
    assert.equal(fresh.probe, false, 'importing lib/coding/active.ts hashes no task for CODING_SOURCE_VERSIONS');
    const [{ CODING_SOURCE_VERSIONS }, { CODING_TASKS }, { taskHash }, { solutionFor }] = await Promise.all([
      import('../lib/coding/active'),
      import('../lib/coding/catalog'),
      import('../lib/curation'),
      import('../lib/coding/solutions'),
    ]);
    assert.equal(CODING_SOURCE_VERSIONS.size, CODING_TASKS.length, 'one source version per authored task');
    for (const task of CODING_TASKS) {
      assert.equal(CODING_SOURCE_VERSIONS.get(task.id), taskHash(task, solutionFor(task.id)), `${task.id}: the same source version as an eager hash`);
    }
    assert.deepEqual([...CODING_SOURCE_VERSIONS.keys()], CODING_TASKS.map((task) => task.id), 'in catalogue order');
    assert.equal(CODING_SOURCE_VERSIONS.has('not-a-task'), false);
    console.log('PASS cold start: lib/coding/active.ts hashes source versions on first read, with the same values');
  }
}
