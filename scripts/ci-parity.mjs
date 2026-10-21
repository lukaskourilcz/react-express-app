// Runs the `verify` job of .github/workflows/quality.yml on this machine, step
// by step, and reports each step's real result. The skill that explains it is
// .claude/skills/ci-parity-and-pr/SKILL.md.
//
//   npm run ci:parity                 the whole job: Storybook and browsers too
//   npm run ci:parity -- --fast       everything but the browser specs,
//                                     test:harness and Storybook/performance
//   npm run ci:parity -- --sql        also the `sql` job (needs DATABASE_URL
//                                     pointing at an empty Postgres)
//   npm run ci:parity -- --list       print the plan and exit
//   npm run ci:parity -- --only test:launch,build
//   npm run ci:parity -- --bail       stop at the first failure, as CI does
//   npm run ci:parity -- --install    run `npm ci` even when node_modules exist
//
// Before running anything the script compares its plan with the `verify` job:
// every `npm` and `npx playwright` command there, in order, must be a step
// here. When the workflow changes, the script stops with the difference
// instead of reporting a stale sequence as green.
//
// The steps run on the working tree. CI checks out only committed files, so a
// dirty tree is reported in the summary.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORKFLOW = '.github/workflows/quality.yml';
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const FAST = flag('--fast');
const SQL = flag('--sql');
const BAIL = flag('--bail');
const LIST = flag('--list');
const FORCE_INSTALL = flag('--install');
const ONLY = option('--only')?.split(',').map((one) => one.trim()).filter(Boolean);
const LOG_DIR = path.resolve(option('--log-dir') ?? 'artifacts/ci-parity');

if (!existsSync(WORKFLOW) || !existsSync('package.json')) {
  console.error('Run ci:parity from the repository root.');
  process.exit(2);
}

// ---- What the workflow says ------------------------------------------------

const workflow = readFileSync(WORKFLOW, 'utf8');
const verifyJob = workflow.slice(workflow.indexOf('\n  verify:'));
if (!verifyJob.includes('runs-on')) {
  console.error(`${WORKFLOW} has no verify job; update scripts/ci-parity.mjs.`);
  process.exit(2);
}
const TOPIC = verifyJob.match(/^\s*TOPIC=(\S+)/m)?.[1] ?? '';
const QUICKJS_INPUTS = verifyJob.match(/git diff --quiet "\$QUICKJS_BASE_SHA" HEAD -- ([^;\n]+);/)?.[1].trim().split(/\s+/) ?? [];

/** The `npm …` and `npx playwright …` commands of the verify job, in order. */
function workflowCommands() {
  const commands = [];
  for (const rawLine of verifyJob.split('\n')) {
    const line = rawLine.replace(/^\s*-?\s*(run:)?\s*/, '');
    if (line.startsWith('#')) continue;
    for (const part of line.split(/\s*&&\s*/)) {
      const command = part.match(/^(?:[A-Z_]+=\S+\s+)*(npm (?:ci|audit|run)\b.*|npx playwright\b.*)$/)?.[1];
      if (!command) continue;
      commands.push(command.replace(/\s*>.*$/, '').replace(/\$TOPIC/g, TOPIC).trim());
    }
  }
  return commands;
}

const env = { ...process.env, CI: 'true' };
let budget;
try {
  budget = JSON.parse(readFileSync('docs/quality/bundle-budget.json', 'utf8')).measuredBuild.env;
} catch (error) {
  console.error(`docs/quality/bundle-budget.json has no measuredBuild.env: ${error.message}`);
  process.exit(2);
}
// The build step's env in quality.yml: the product lock plus the placeholder
// Supabase project that check:bundle measures with.
const BUILD_ENV = {
  VITE_PRODUCT: 'devshark',
  VITE_LOCK_SUBJECT: 'webdev',
  VITE_SUPABASE_URL: budget.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: budget.VITE_SUPABASE_ANON_KEY,
};

// ---- The plan ----------------------------------------------------------------
// `ci` lists the workflow commands a step stands for; the drift check joins
// them in plan order and compares them with workflowCommands().
// `tier`: 'fast' runs in --fast and the full run, 'full' only in the full run.

const npmRun = (script, extra = '') => `npm run ${script}${extra ? ` ${extra}` : ''}`;
const step = (id, command, more = {}) => ({ id, command, ci: [command], tier: 'fast', ...more });

const RESPONSIVE_LIGHT = `-- --routes /,/quiz,/topics/${TOPIC},/cs/topics/${TOPIC},/daily,/not-found-responsive-check --widths 360,390,430,768,1024,1280,1440`;
const RESPONSIVE_DARK = `-- --routes /,/topics/${TOPIC},/daily --widths 390,768,1280`;
const BROWSER_SPECS = [
  'public', 'guide-startup profile-leaderboard-preferences', 'evolving', 'coding-pages', 'coding-workbench',
  'coding-drafts', 'learning-release', 'segmented', 'on-accent', 'navigation', 'lazy-auth', 'sign-in',
  'route-errors', 'first-load', 'home-sample', 'routes-axe', 'daily', 'launch-offer',
].map((names) => names.split(' ').map((name) => `tests/browser/${name}.spec.ts`).join(' '));

const PLAN = [
  step('install', 'npm ci && npm ci --prefix client', { ci: ['npm ci', 'npm ci --prefix client'], kind: 'install' }),
  step('check:quickjs-build', npmRun('check:quickjs-build'), { kind: 'quickjs' }),
  step('typecheck:api', npmRun('typecheck:api')),
  step('typecheck:scripts', npmRun('typecheck:scripts')),
  step('typecheck:tooling', npmRun('typecheck:tooling', '--prefix client')),
  step('audit:native-reviews', npmRun('audit:native-reviews')),
  ...['test:performance', 'test:launch', 'test:coding-auth', 'test:grading-integrity', 'test:path-authority',
    'test:react-authority', 'test:coding', 'test:paths', 'test:billing', 'test:fallbacks', 'test:garden',
    'test:live-grading', 'test:client'].map((script) => step(script, npmRun(script))),
  step('check:unused', npmRun('check:unused')),
  step('check:security', npmRun('check:security')),
  step('build', npmRun('build'), { env: BUILD_ENV }),
  step('check:public', npmRun('check:public'), { env: BUILD_ENV, needs: ['build'] }),
  step('check:bundle', npmRun('check:bundle'), { env: BUILD_ENV, needs: ['build'] }),
  step('audit:prod', 'npm audit --omit=dev'),
  step('audit:client', 'npm audit --omit=dev --prefix client'),
  step('chromium', 'npx playwright install chromium', { ci: ['npx playwright install --with-deps chromium'], kind: 'chromium' }),
  step('preview', 'npm run preview --prefix client -- --host 0.0.0.0 --port 4173',
    { kind: 'server', url: 'http://localhost:4173', needs: ['build'] }),
  ...BROWSER_SPECS.map((specs) => step(`browser:${specs.replace(/tests\/browser\/|\.spec\.ts/g, '').replace(/ /g, '+')}`,
    npmRun('test:browser', `-- ${specs}`), { tier: 'full', needs: ['preview', 'chromium'], browser: true })),
  step('check:responsive', npmRun('check:responsive', RESPONSIVE_LIGHT), { needs: ['preview', 'chromium'], browser: true }),
  step('check:responsive:dark', npmRun('check:responsive', RESPONSIVE_DARK),
    { needs: ['preview', 'chromium'], browser: true, env: { RESPONSIVE_THEME: 'dark' } }),
  step('test:harness', npmRun('test:harness'), { tier: 'full', needs: ['build', 'chromium'], browser: true }),
  step('audit:performance', npmRun('audit:performance'), { tier: 'full', needs: ['preview'] }),
  step('build:storybook', npmRun('build:storybook'), { tier: 'full', needs: ['build'] }),
  step('storybook', npmRun('storybook', '--prefix client -- --ci'),
    { tier: 'full', kind: 'server', url: 'http://localhost:6006', needs: ['build:storybook'] }),
  step('browser:storybook', npmRun('test:browser', '-- tests/browser/storybook.spec.ts'),
    { tier: 'full', needs: ['storybook', 'chromium'], browser: true, env: { STORYBOOK_URL: 'http://localhost:6006' } }),
];
const SQL_STEP = step('test:sql', npmRun('test:sql'), { ci: [], kind: 'sql' });

function checkDrift() {
  const expected = workflowCommands();
  const planned = PLAN.flatMap((one) => one.ci);
  const firstDifference = expected.findIndex((command, index) => command !== planned[index]);
  if (firstDifference === -1 && expected.length === planned.length) return;
  const at = firstDifference === -1 ? Math.min(expected.length, planned.length) : firstDifference;
  console.error(`scripts/ci-parity.mjs no longer matches the verify job in ${WORKFLOW}.`);
  console.error(`First difference at command ${at + 1}:`);
  console.error(`  workflow: ${expected[at] ?? '(nothing)'}`);
  console.error(`  plan:     ${planned[at] ?? '(nothing)'}`);
  console.error('Update PLAN in scripts/ci-parity.mjs and the sequence in .claude/skills/ci-parity-and-pr/SKILL.md.');
  process.exit(2);
}
checkDrift();
if (!QUICKJS_INPUTS.length || !TOPIC) {
  console.error(`Could not read the QuickJS inputs or the responsive TOPIC from ${WORKFLOW}; update scripts/ci-parity.mjs.`);
  process.exit(2);
}

// ---- Running -----------------------------------------------------------------

const selected = [...PLAN, ...(SQL ? [SQL_STEP] : [])];
if (LIST) {
  for (const one of selected) {
    const mode = ONLY ? (ONLY.includes(one.id) ? 'run' : 'skip') : FAST && one.tier === 'full' ? 'full only' : 'run';
    console.log(`${one.id.padEnd(40)} ${mode.padEnd(10)} ${one.command}`);
  }
  process.exit(0);
}

mkdirSync(LOG_DIR, { recursive: true });
const results = new Map();
const servers = [];
const started = Date.now();
const git = (...gitArgs) => spawnSync('git', gitArgs, { encoding: 'utf8' });
const head = git('rev-parse', 'HEAD').stdout.trim();
const dirty = git('status', '--porcelain').stdout.trim() !== '';
const nodeMajor = Number(process.versions.node.split('.')[0]);
const logFile = (one) => path.join(LOG_DIR, `${one.id.replace(/[^\w.-]+/g, '_')}.log`);

function record(one, result, detail, seconds = 0) {
  results.set(one.id, { id: one.id, result, detail, seconds, log: result === 'pass' || result === 'fail' ? path.relative(ROOT, logFile(one)) : '' });
  const mark = { pass: 'PASS', fail: 'FAIL', skipped: 'SKIP', 'not-run': 'NOT RUN' }[result];
  console.log(`${mark.padEnd(8)} ${one.id}${seconds ? ` (${seconds}s)` : ''}${detail ? `: ${detail}` : ''}`);
}

function runToLog(one, command, extraEnv = {}) {
  return new Promise((resolve) => {
    const out = createWriteStream(logFile(one));
    out.write(`$ ${command}\n`);
    const child = spawn(command, { shell: true, env: { ...env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });
    child.on('close', (code) => { out.end(`\nexit ${code}\n`); resolve(code); });
  });
}

async function waitFor(url, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return true; } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function chromiumPath() {
  if (env.CHROME_BIN) return env.CHROME_BIN;
  try {
    return execFileSync(process.execPath, ['-e', "console.log(require('@playwright/test').chromium.executablePath())"], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function runStep(one) {
  if (ONLY && !ONLY.includes(one.id)) return;
  if (FAST && one.tier === 'full') return record(one, 'skipped', 'not part of --fast');
  const blocked = (one.needs ?? []).filter((need) => !ONLY?.length || ONLY.includes(need) ? ['fail', 'not-run'].includes(results.get(need)?.result) : false);
  if (blocked.length) return record(one, 'not-run', `needs ${blocked.join(', ')}`);

  if (one.kind === 'install') {
    const missing = !existsSync('node_modules') || !existsSync('client/node_modules');
    if (!missing && !FORCE_INSTALL) return record(one, 'skipped', 'node_modules present (pass --install to run npm ci)');
  }
  if (one.kind === 'quickjs') {
    const base = git('merge-base', 'HEAD', 'origin/main').stdout.trim();
    if (base && git('diff', '--quiet', base, '--', ...QUICKJS_INPUTS).status === 0) {
      return record(one, 'skipped', `QuickJS inputs unchanged against origin/main ${base.slice(0, 8)}, as CI skips it`);
    }
  }
  if (one.kind === 'chromium') {
    const chrome = chromiumPath();
    if (chrome && existsSync(chrome)) {
      env.CHROME_BIN = chrome;
      return record(one, 'skipped', `using ${chrome}`);
    }
  }
  if (one.kind === 'sql' && !env.DATABASE_URL) {
    return record(one, 'not-run', 'DATABASE_URL is not set; see scripts/test-sql.mjs for the empty Postgres it needs');
  }
  if (one.kind === 'server') return startServer(one);

  const begin = Date.now();
  const code = await runToLog(one, one.command, one.env);
  const seconds = Math.round((Date.now() - begin) / 1000);
  if (one.kind === 'chromium' && code === 0) env.CHROME_BIN = chromiumPath();
  record(one, code === 0 ? 'pass' : 'fail', code === 0 ? '' : `exit ${code}`, seconds);
}

async function startServer(one) {
  if (await waitFor(one.url, 1)) {
    return record(one, 'fail', `${one.url} already answers; stop that server so the checks see this build`);
  }
  const out = createWriteStream(logFile(one));
  const child = spawn(one.command, { shell: true, detached: true, env, stdio: ['ignore', out, out] });
  servers.push(child);
  const begin = Date.now();
  const up = await waitFor(one.url);
  record(one, up ? 'pass' : 'fail', up ? `serving ${one.url}` : `${one.url} did not answer within 60 s`, Math.round((Date.now() - begin) / 1000));
}

function stopServers() {
  for (const child of servers) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already stopped */ }
  }
}
process.on('SIGINT', () => { stopServers(); process.exit(130); });

if (nodeMajor !== 24) console.log(`Node ${process.versions.node}: CI runs Node 24, so results may differ.`);
if (dirty) console.log('The working tree has uncommitted changes; CI sees only what you commit.');
console.log(`ci:parity ${FAST ? '--fast' : 'full'} at ${head.slice(0, 8)}, logs in ${path.relative(ROOT, LOG_DIR)}/`);

try {
  for (const one of selected) {
    await runStep(one);
    if (BAIL && results.get(one.id)?.result === 'fail') break;
  }
} finally {
  stopServers();
}

const rows = [...results.values()];
const count = (result) => rows.filter((row) => row.result === result).length;
const summary = {
  mode: FAST ? 'fast' : 'full',
  head,
  dirty,
  node: process.versions.node,
  minutes: Math.round((Date.now() - started) / 600) / 100,
  passed: count('pass'),
  failed: count('fail'),
  skipped: count('skipped'),
  notRun: count('not-run'),
  steps: rows,
};
writeFileSync(path.join(LOG_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`\n${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped, ${summary.notRun} not run in ${summary.minutes} min.`);
if (!SQL) console.log('The sql job did not run; pass --sql with DATABASE_URL set to include it.');
for (const row of rows.filter((one) => one.result === 'fail')) console.log(`  failed: ${row.id}, see ${row.log}`);
process.exit(summary.failed ? 1 : 0);
