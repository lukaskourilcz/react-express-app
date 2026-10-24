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
 *    hashes as before;
 *  - neither the complexity estimator nor the type-check pool loads the
 *    TypeScript compiler at import (server item 16); the first assessment
 *    and the in-thread fallback load it and still work;
 *  - api/settings.ts, read on every page load, loads neither the learning-
 *    path handlers nor a grader (server item 17), and publishes the same
 *    capability the handlers compute;
 *  - api/user/[op].ts loads its op families on first call (server item 3):
 *    a fresh instance evaluates no grader, no TypeScript, no Stripe and no
 *    coding catalogue before it answers, and an op that needs them loads them
 *    and answers;
 *  - api/quiz/roadmap.ts does the same for its coding and learning-path
 *    resources, the tier check and a code level's tasks (server item 4). */

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
export async function loadFresh(entry: string, probe = 'null', extraEnv: Record<string, string> = {}): Promise<Loaded> {
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
  const env: Record<string, string> = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_ENV: 'development', ...extraEnv };
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

  // ── server item 16: TypeScript loads on first use, not at import ─────────
  for (const entry of ['lib/coding/complexity.ts', 'lib/coding/ts-check-pool.ts']) {
    const fresh = await loadFresh(entry);
    assert.ok(!fresh.packages.includes('typescript'), `${entry} does not load the TypeScript compiler at import (${fresh.packages.join(', ')})`);
  }
  {
    // The first assessment in a fresh process loads the compiler and answers
    // as the eager import did.
    const assessed = await loadFresh('lib/coding/complexity.ts', `(() => {
      const report = mod.assessComplexity({ track: 'javascript', prompt: '', tests: [{ call: 'sum([1, 2, 3])', expected: 6 }] },
        'function sum(xs) { let total = 0; for (let i = 0; i < xs.length; i++) total += xs[i]; return total; }');
      return { time: report.time, typescript: Object.keys(require.cache).some((path) => path.includes('/node_modules/typescript/')) };
    })()`);
    assert.deepEqual(assessed.probe, { time: 'O(n)', typescript: true }, 'the first assessment loads TypeScript and estimates O(n)');
    // The in-thread fallback (no worker bundle in a fresh checkout's probe,
    // and in-thread grading allowed off a deployment) loads it too.
    const checked = await loadFresh('lib/coding/ts-check-pool.ts', `(process.chdir(require('node:os').tmpdir()), mod.checkTypes('const n: number = 1;', [[{ code: 'const s: string = n;', rejects: true }]]).then((outcome) => ({ stopped: outcome.stopped, results: outcome.results?.length, javascript: typeof outcome.javascript })))`);
    assert.deepEqual(checked.probe, { stopped: false, results: 1, javascript: 'string' }, 'the in-thread type check still answers');
    console.log('PASS cold start: the complexity estimator and the type-check pool load TypeScript on first use');
  }

  // ── server item 17: /api/settings without the learning-path handlers ─────
  {
    const fresh = await loadFresh('api/settings.ts');
    for (const heavy of ['typescript', 'quickjs-emscripten', 'stripe']) {
      assert.ok(!fresh.packages.includes(heavy), `api/settings.ts does not load ${heavy} (${fresh.packages.join(', ')})`);
    }
    const [{ learningPathCapability: published }, { learningPathCapability: handlers }] = await Promise.all([
      import('../lib/learning-paths/capability'),
      import('../lib/learning-paths/handlers'),
    ]);
    const before = process.env.LEARNING_PATH_FDE_ENABLED;
    try {
      for (const value of [undefined, 'false', 'true']) {
        if (value === undefined) delete process.env.LEARNING_PATH_FDE_ENABLED;
        else process.env.LEARNING_PATH_FDE_ENABLED = value;
        assert.deepEqual(published(), handlers(), `the settings capability matches the handlers' with the switch ${value ?? 'unset'}`);
      }
      assert.ok(Object.keys(published().paths).length > 0, 'and it names the paths');
    } finally {
      if (before === undefined) delete process.env.LEARNING_PATH_FDE_ENABLED;
      else process.env.LEARNING_PATH_FDE_ENABLED = before;
    }
    console.log('PASS cold start: /api/settings publishes the learning-path capability without the handlers or a grader');
  }

  // ── server item 3: api/user/[op].ts loads op families on first call ──────
  {
    const fresh = await loadFresh('api/user/[op].ts');
    for (const heavy of ['typescript', 'quickjs-emscripten', '@jitl/quickjs-singlefile-cjs-release-sync', 'stripe']) {
      assert.ok(!fresh.packages.includes(heavy), `api/user/[op].ts does not load ${heavy} at import (${fresh.packages.join(', ')})`);
    }
    // An op served by a lazily loaded family loads it on its first call and
    // answers. The database address is a closed local port and the request
    // carries no token, so the op's own sign-in check answers 401 without
    // any network call; QuickJS loading shows the coding handlers ran.
    const called = await loadFresh('api/user/[op].ts', `(async () => {
      const res = { statusCode: 200, headers: {}, body: undefined, headersSent: false,
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; }, getHeader(k) { return this.headers[k.toLowerCase()]; },
        status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; this.headersSent = true; return this; }, end() { this.headersSent = true; return this; } };
      const loaded = () => Object.keys(require.cache).some((path) => path.includes('/node_modules/quickjs-emscripten/'));
      const before = loaded();
      await mod.default({ method: 'GET', headers: { 'x-forwarded-for': '198.51.100.7' }, query: { op: 'coding-progress' }, url: '/api/user/coding-progress', socket: {} }, res);
      return { before, after: loaded(), status: res.statusCode, code: res.body && res.body.error && res.body.error.code };
    })()`, { SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_ANON_KEY: 'cold-start-anon', SUPABASE_SERVICE_ROLE_KEY: 'cold-start-service' });
    assert.deepEqual(called.probe, { before: false, after: true, status: 401, code: 'missing_token' }, 'a coding op loads its handlers on first call and answers');
    console.log('PASS cold start: api/user/[op].ts loads no grader, TypeScript, Stripe or coding catalogue before its first answer');
  }

  // ── server item 4: api/quiz/roadmap.ts loads coding and paths on use ─────
  {
    const fresh = await loadFresh('api/quiz/roadmap.ts');
    for (const heavy of ['typescript', 'quickjs-emscripten', '@jitl/quickjs-singlefile-cjs-release-sync']) {
      assert.ok(!fresh.packages.includes(heavy), `api/quiz/roadmap.ts does not load ${heavy} at import (${fresh.packages.join(', ')})`);
    }
    // The public path catalogue is served by the lazily loaded path handlers,
    // which bring the graders with them, and answers as before.
    const called = await loadFresh('api/quiz/roadmap.ts', `(async () => {
      const res = { statusCode: 200, headers: {}, body: undefined, headersSent: false,
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; }, getHeader(k) { return this.headers[k.toLowerCase()]; },
        status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; this.headersSent = true; return this; }, end() { this.headersSent = true; return this; } };
      const loaded = () => Object.keys(require.cache).some((path) => path.includes('/node_modules/quickjs-emscripten/'));
      const before = loaded();
      await mod.default({ method: 'GET', headers: { 'x-forwarded-for': '198.51.100.8' }, query: { resource: 'learning-path-catalog' }, url: '/api/quiz/roadmap', socket: {} }, res);
      return { before, after: loaded(), status: res.statusCode, paths: Array.isArray(res.body && res.body.paths) };
    })()`);
    assert.deepEqual(called.probe, { before: false, after: true, status: 200, paths: true }, 'the path catalogue loads its handlers on first call and answers');
    console.log('PASS cold start: api/quiz/roadmap.ts loads no grader or TypeScript before its first answer');
  }
}

/** Bundle a test script as the npm scripts do and run it in its own process,
 * for a script that sets the settings modules read when they load. */
export async function runIsolated(script: string): Promise<void> {
  mkdirSync(out, { recursive: true });
  const outfile = join(out, `${script.replace(/[/[\]]/g, '_').replace(/\.ts$/, '')}.mjs`);
  await build({ entryPoints: [join(root, script)], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile, logLevel: 'warning', absWorkingDir: root });
  const child = spawnSync(process.execPath, [outfile], { cwd: root, env: process.env, stdio: 'inherit' });
  assert.equal(child.status, 0, `${script} passes`);
}
