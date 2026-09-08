// Applies the schema to a scratch database and runs the SQL integration checks
// for migrations 026-029 (issues #151, #154, #157, #159, #160, #168, #170,
// #172, #173).
//
//   npm run test:db
//
// It needs a PostgreSQL it may create a database on. Point DATABASE_URL at one,
// or leave it unset and the script uses a local `psql` if one is available. With
// neither it skips, the same way the responsive sweep skips without a browser —
// a check that cannot run says so rather than reporting a pass.
//
// The checks are real: every ASSERT in the .sql files raises, so a regression in
// the wallet ledger, the order state machine, the stock reservation, the puzzle
// evidence separation or account erasure fails this command.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DB = process.env.SHARK_TEST_DB ?? 'shark_test';
const URL = process.env.DATABASE_URL ?? null;

function psqlAvailable() {
  const probe = spawnSync('psql', ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

function run(args, { input } = {}) {
  const base = URL ? ['-d', URL] : ['-d', DB];
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-X', '-q', ...base, ...args], {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PGOPTIONS: '-c client_min_messages=notice' },
  });
}

const BOOTSTRAP = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon') $$;
`;

if (!psqlAvailable()) {
  console.log('Database checks skipped: no psql on PATH. Set DATABASE_URL and install psql to run them.');
  process.exit(0);
}

try {
  // Create the scratch database on first use; an existing one is reused, and the
  // migrations are idempotent, so a repeat run is clean.
  // A fresh scratch database each run, so the checks never see leftovers. The
  // base schema predates the IF NOT EXISTS convention the numbered migrations
  // follow, so it is applied exactly once.
  if (!URL) {
    try { execFileSync('dropdb', ['--if-exists', DB], { stdio: 'ignore' }); } catch { /* nothing to drop */ }
    execFileSync('createdb', [DB], { stdio: 'ignore' });
  }
  run(['-c', 'SELECT 1']);
} catch {
  console.log(`Database checks skipped: could not connect (${URL ? 'DATABASE_URL' : DB}).`);
  process.exit(0);
}

const migrations = [
  path.join('supabase', 'supabase-schema.sql'),
  ...readdirSync(path.join(ROOT, 'supabase'))
    .filter((name) => /^supabase-schema-\d+\.sql$/.test(name))
    .sort()
    .map((name) => path.join('supabase', name)),
].filter((file) => existsSync(path.join(ROOT, file)));

run([], { input: BOOTSTRAP });
for (const file of migrations) run(['-f', path.join(ROOT, file)]);
// Migrations 026 and later say "safe to re-run", which is worth checking rather
// than trusting. Earlier files predate that convention (schema.sql creates
// tables unconditionally, 003 creates policies unconditionally), so re-applying
// them is not a claim anyone made.
const RERUNNABLE_FROM = 26;
const rerunnable = migrations.filter((file) => {
  const number = Number.parseInt(file.match(/-(\d+)\.sql$/)?.[1] ?? '0', 10);
  return number >= RERUNNABLE_FROM;
});
for (const file of rerunnable) run(['-f', path.join(ROOT, file)]);

const suites = ['test-learning.sql', 'test-rewards.sql'];
const checkpoints = [];
for (const suite of suites) {
  const result = spawnSync('psql', [
    '-v', 'ON_ERROR_STOP=1', '-X', '-q',
    ...(URL ? ['-d', URL] : ['-d', DB]),
    '-f', path.join(ROOT, 'scripts', 'sql', suite),
  ], { encoding: 'utf8', env: { ...process.env, PGOPTIONS: '-c client_min_messages=notice' } });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`${suite} failed`);
  }
  for (const line of `${result.stdout}\n${result.stderr}`.split('\n')) {
    const match = line.match(/NOTICE:\s+(.*)$/);
    if (match) checkpoints.push(match[1].trim());
  }
}

console.log(`Database checks passed: ${migrations.length} migrations applied, ${rerunnable.length} re-applied cleanly, ${checkpoints.length} suites — ${checkpoints.join('; ')}.`);
