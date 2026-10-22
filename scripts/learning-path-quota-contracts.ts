// Contracts for a module's quota (`requiresAtLeast`, #499), run by
// `npm run test:paths`. Pure: the validator, the public projection, the
// shared completion arithmetic and the requirements a submit sends the
// database, over scripts/learning-path-schema-fixture.ts and the published
// FDE path.
//
//   * the validator accepts a quota and refuses each broken one with its own
//     code: a count outside 1..n, an unknown or repeated activity, an
//     activity both required and counted, a self-reviewed activity counted
//     toward verified_pass, an impossible state, a quota on a shelf module
//   * the public module summary carries the quota as authored
//   * a module completes only with every plain requirement AND the quota,
//     and the next action offers the quota's activities once the plain
//     requirements are met
//   * a module with a quota preserves its plain requirements for the
//     atomic quota routine
//   * the decomposition cases module asks for its lessons and nine of its
//     twelve cases, and each case is one scenario check of four or five
//     questions that passes at 80 %

import { LEARNING_PATHS, moduleSummary, publicManifest } from '../lib/learning-paths/catalog';
import { moduleRequirements } from '../lib/learning-paths/handlers';
import { mergePath, type ModuleSource, type PathSource } from '../lib/learning-paths/types';
import { validatePath } from '../lib/learning-paths/validate';
import { moduleComplete, nextActivityId, type EvidenceState } from '../shared/learning-paths';
import { schemaFixtureSource } from './learning-path-schema-fixture';

type Fail = (message: string) => void;

const LOOP = 'fde-v1-x01';
const SHELF = 'fde-v1-ip01';
const READ = 'fde-v1-x01-read';
const CASE = 'fde-v1-x01-case';
const DRILL = 'fde-v1-x01-drill';

const CASES_MODULE = 'fde-v1-m02-cases';
const CASES_COUNT = 12;
const CASES_NEEDED = 9;

function moduleOf(source: PathSource, id: string): ModuleSource {
  return source.modules.find((module) => module.id === id)!;
}

/** The fixture's loop module asks for its lesson and one of its two graded
 * activities. */
function quotaSource(): PathSource {
  const source = structuredClone(schemaFixtureSource());
  const loop = moduleOf(source, LOOP);
  loop.requires = [{ activityId: READ, state: 'self_reviewed' }];
  loop.requiresAtLeast = { count: 1, of: [CASE, DRILL], state: 'verified_pass' };
  return source;
}

function errorsOf(edit: (source: PathSource) => void): string[] {
  const source = quotaSource();
  edit(source);
  return validatePath(mergePath(source)).map((issue) => `${issue.level}:${issue.code}`);
}

export function quotaContracts(fail: Fail): void {
  /* ── 1. the validator ──────────────────────────────────────────────── */
  const clean = errorsOf(() => {});
  if (clean.length) fail(`quota fixture: expected no issues, got ${clean.join(', ')}`);
  const onlyQuota = errorsOf((s) => { moduleOf(s, LOOP).requires = []; });
  if (onlyQuota.includes('error:no_requirements')) fail('quota fixture: a module with only a quota was refused as having no requirements');
  const expect = (label: string, edit: (source: PathSource) => void, code: string) => {
    const got = errorsOf(edit);
    if (!got.includes(`error:${code}`)) fail(`quota ${label}: expected ${code}, got ${got.join(', ') || 'no issues'}`);
  };
  expect('count of zero', (s) => { moduleOf(s, LOOP).requiresAtLeast!.count = 0; }, 'bad_quota');
  expect('count above its list', (s) => { moduleOf(s, LOOP).requiresAtLeast!.count = 3; }, 'bad_quota');
  expect('fractional count', (s) => { moduleOf(s, LOOP).requiresAtLeast!.count = 1.5; }, 'bad_quota');
  expect('unknown activity', (s) => { moduleOf(s, LOOP).requiresAtLeast!.of.push('fde-v1-x01-missing'); }, 'unknown_requirement');
  expect('repeated activity', (s) => { moduleOf(s, LOOP).requiresAtLeast!.of.push(CASE); }, 'duplicate_id');
  expect('required and counted', (s) => {
    moduleOf(s, LOOP).requires.push({ activityId: CASE, state: 'verified_pass' });
  }, 'quota_overlap');
  expect('a lesson counted toward verified_pass', (s) => {
    const loop = moduleOf(s, LOOP);
    loop.requires = [];
    loop.requiresAtLeast!.of.push(READ);
  }, 'unverifiable_requirement');
  expect('an impossible state', (s) => { moduleOf(s, LOOP).requiresAtLeast!.state = 'needs_revision'; }, 'impossible_requirement');
  expect('a quota on a shelf module', (s) => {
    moduleOf(s, SHELF).requiresAtLeast = { count: 1, of: ['fde-v1-ip01-check'], state: 'verified_pass' };
  }, 'optional_requirements');

  /* ── 2. the projection ─────────────────────────────────────────────── */
  const path = mergePath(quotaSource());
  const loop = path.modules.find((module) => module.id === LOOP)!;
  const summary = moduleSummary(loop);
  if (JSON.stringify(summary.requiresAtLeast) !== JSON.stringify({ count: 1, of: [CASE, DRILL], state: 'verified_pass' })) {
    fail(`quota projection: the module summary carries ${JSON.stringify(summary.requiresAtLeast)}`);
  }
  const plain = mergePath(schemaFixtureSource()).modules.find((module) => module.id === LOOP)!;
  if ('requiresAtLeast' in moduleSummary(plain)) fail('quota projection: a module without a quota carries the key');

  /* ── 3. completion and the next action ─────────────────────────────── */
  const states = (entries: [string, EvidenceState][]) => new Map<string, EvidenceState>(entries);
  const completion: [string, Map<string, EvidenceState>, boolean][] = [
    ['nothing recorded', states([]), false],
    ['the lesson alone', states([[READ, 'self_reviewed']]), false],
    ['one graded activity without the lesson', states([[CASE, 'verified_pass']]), false],
    ['the lesson and one graded activity', states([[READ, 'self_reviewed'], [DRILL, 'verified_pass']]), true],
    ['the lesson and a failed attempt', states([[READ, 'self_reviewed'], [CASE, 'needs_revision']]), false],
  ];
  for (const [label, recorded, expected] of completion) {
    if (moduleComplete(loop, recorded) !== expected) fail(`quota completion: ${label} reads as ${!expected}`);
  }
  const manifest = publicManifest(path);
  const next: [string, Map<string, EvidenceState>, string | null][] = [
    ['a new learner', states([]), READ],
    ['the lesson read', states([[READ, 'self_reviewed']]), CASE],
    ['the lesson read, the drill in progress', states([[READ, 'self_reviewed'], [DRILL, 'in_progress']]), DRILL],
    ['the module complete', states([[READ, 'self_reviewed'], [CASE, 'verified_pass']]), null],
  ];
  for (const [label, recorded, expected] of next) {
    const got = nextActivityId(manifest, recorded);
    if (got !== expected) fail(`quota next action: for ${label} it is ${got}, not ${expected}`);
  }

  /* ── 4. the database gets both plain and quota requirements ───────── */
  if (JSON.stringify(moduleRequirements(loop)) !== JSON.stringify([{ activityId: READ, states: ['self_reviewed', 'verified_pass'] }])) fail('quota database: the quota module lost its plain lesson requirement');
  if (moduleRequirements(plain).length === 0) fail('quota database: a module without a quota stopped sending its requirements');

  /* ── 5. the decomposition cases module ─────────────────────────────── */
  const fde = LEARNING_PATHS.find((one) => one.id === 'fde');
  const cases = fde?.modules.find((module) => module.id === CASES_MODULE);
  if (!fde || !cases) {
    fail(`quota cases: the FDE path has no ${CASES_MODULE} module`);
    return;
  }
  const quota = cases.requiresAtLeast;
  const checks = cases.activities.filter((activity) => activity.kind === 'check');
  const lessons = cases.activities.filter((activity) => activity.kind === 'lesson');
  if (!quota || quota.count !== CASES_NEEDED || quota.of.length !== CASES_COUNT || quota.state !== 'verified_pass') {
    fail(`quota cases: expected ${CASES_NEEDED} of ${CASES_COUNT} cases at verified_pass, got ${JSON.stringify(quota)}`);
    return;
  }
  if (checks.length !== CASES_COUNT || checks.some((check) => !quota.of.includes(check.id))) {
    fail(`quota cases: the quota does not list exactly the module's ${CASES_COUNT} checks`);
  }
  for (const check of checks) {
    const count = check.questions?.length ?? 0;
    if (!check.scenario) fail(`quota cases: ${check.id} has no scenario`);
    if (count < 4 || count > 5) fail(`quota cases: ${check.id} has ${count} questions, not four or five`);
    if (check.passThreshold !== 0.8) fail(`quota cases: ${check.id} passes at ${check.passThreshold}, not 0.8`);
  }
  const lessonIds = lessons.map((lesson) => lesson.id);
  const required = cases.requires.map((one) => `${one.activityId}:${one.state}`);
  if (lessons.length !== 2 || JSON.stringify(required) !== JSON.stringify(lessonIds.map((id) => `${id}:self_reviewed`))) {
    fail(`quota cases: the module should require its two lessons read, got ${required.join(', ')}`);
  }
  const read: [string, EvidenceState][] = lessonIds.map((id) => [id, 'self_reviewed']);
  const passed = (n: number): [string, EvidenceState][] => quota.of.slice(0, n).map((id) => [id, 'verified_pass']);
  if (moduleComplete(cases, states([...read, ...passed(CASES_NEEDED - 1)]))) fail('quota cases: eight cases complete the module');
  if (!moduleComplete(cases, states([...read, ...passed(CASES_NEEDED)]))) fail('quota cases: nine cases and both lessons leave the module incomplete');
  if (moduleComplete(cases, states([...read.slice(1), ...passed(CASES_COUNT)]))) fail('quota cases: twelve cases complete the module with a lesson unread');
  const failedFirst = states([...read, [quota.of[0], 'needs_revision'], ...passed(CASES_NEEDED).slice(1)]);
  if (moduleComplete(cases, failedFirst)) fail('quota cases: eight passes and a failed case complete the module');
  if (moduleRequirements(cases).length !== 2) fail('quota cases: the database did not receive both lesson requirements');
}
