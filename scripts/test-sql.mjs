// Runs the SQL behaviour suite against a real Postgres.
//
// It builds the schema the way production got it — supabase/supabase-schema.sql,
// then every numbered migration in order — and then runs each
// supabase/tests/*.test.sql file in its own transaction that is rolled back.
// A test file fails when psql stops on an error: a failed ASSERT, a RAISE, or
// any SQL error.
//
// DATABASE_URL must point at an EMPTY database (a fresh `supabase/postgres`
// container): the script refuses to touch a database that already has tables
// in `public`, so it can never run against a real project.
//
//   docker run -d --name devshark-sql -p 54339:5432 -e POSTGRES_PASSWORD=postgres supabase/postgres:17.6.1.171
//   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54339/postgres npm run test:sql
//
// supabase/tests/known-failures.txt lists test files that fail today because of
// a known, tracked bug. They still run: a listed file that fails is reported as
// an expected failure, and a listed file that passes fails the suite until it
// is removed from the list, so the list can only shrink.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('test:sql needs DATABASE_URL pointing at an empty Postgres database (see scripts/test-sql.mjs).');
  process.exit(2);
}

// Relative paths, so psql names files the way the repository does.
const schemaDir = 'supabase';
const testDir = join(schemaDir, 'tests');

function psql(args) {
  return spawnSync('psql', [url, '-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8',
    env: { ...process.env, PGOPTIONS: '--client-min-messages=warning -c plpgsql.check_asserts=on' },
    maxBuffer: 64 * 1024 * 1024,
  });
}

function must(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message} (is psql installed?)`);
  if (result.status !== 0) {
    console.error(`${what} failed:\n${(result.stderr || result.stdout).trim()}`);
    process.exit(1);
  }
  return result.stdout;
}

// 1. Refuse anything but an empty database.
const tables = must(psql(['-A', '-t', '-c', "SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')"]), 'Checking the database');
if (Number(tables.trim()) !== 0) {
  console.error(`test:sql rebuilds the schema from the migrations and needs an empty database; public already has ${tables.trim()} tables. Point DATABASE_URL at a fresh container.`);
  process.exit(2);
}

// 2. The few objects Supabase provides that a bare image may lack.
must(psql(['-f', join(testDir, 'shims.sql')]), 'Applying supabase/tests/shims.sql');

// 3. The base schema, then every numbered migration, discovered and ordered by number.
const numbered = readdirSync(schemaDir)
  .map((name) => ({ name, match: /^supabase-schema-(\d+)\.sql$/.exec(name) }))
  .filter((file) => file.match)
  .map((file) => ({ name: file.name, number: Number(file.match[1]) }))
  .sort((a, b) => a.number - b.number);
const numbers = numbered.map((file) => file.number);
for (let i = 0; i < numbers.length; i += 1) {
  const expected = i + 2;
  if (numbers[i] !== expected) {
    console.error(`Migrations must be numbered 002, 003, … without gaps or duplicates; expected ${String(expected).padStart(3, '0')}, found ${numbered[i].name}.`);
    process.exit(1);
  }
}
const migrations = ['supabase-schema.sql', ...numbered.map((file) => file.name)];
for (const name of migrations) must(psql(['-f', join(schemaDir, name)]), `Applying supabase/${name}`);
console.log(`Applied ${migrations.length} schema files (supabase-schema.sql … ${migrations.at(-1)}).`);

// 4. The behaviour tests, each in a transaction that is rolled back.
const knownPath = join(testDir, 'known-failures.txt');
const known = new Map();
if (existsSync(knownPath)) {
  for (const line of readFileSync(knownPath, 'utf8').split('\n')) {
    const text = line.replace(/#.*/, '').trim();
    if (!text) continue;
    const [file, ...reason] = text.split(/\s+/);
    known.set(file, reason.join(' '));
  }
}
const tests = readdirSync(testDir).filter((name) => name.endsWith('.test.sql')).sort();
for (const file of known.keys()) {
  if (!tests.includes(file)) {
    console.error(`known-failures.txt names ${file}, which is not a test file in supabase/tests.`);
    process.exit(1);
  }
}

let failed = 0;
let expected = 0;
for (const name of tests) {
  const result = psql(['-c', 'BEGIN', '-f', join(testDir, name), '-c', 'ROLLBACK']);
  if (result.error) throw result.error;
  const passed = result.status === 0;
  const output = (result.stderr || '').trim();
  if (known.has(name)) {
    if (passed) {
      failed += 1;
      console.error(`  FIXED ${name} — it passes now; remove it from supabase/tests/known-failures.txt`);
    } else {
      expected += 1;
      console.log(`  XFAIL ${name} — known bug: ${known.get(name)}`);
      console.log(indent(output));
    }
  } else if (passed) {
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(indent(output));
  }
}

function indent(text) {
  return text.split('\n').map((line) => `        ${line}`).join('\n');
}

const summary = `${tests.length} SQL test files · ${tests.length - failed - expected} passed · ${expected} known failures · ${failed} failed`;
if (failed) {
  console.error(summary);
  process.exit(1);
}
console.log(summary);
