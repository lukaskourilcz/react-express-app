import { runReactSuite } from '../lib/coding/react-runner';
// Content and grading contract for the learning paths.
//   npm run test:paths
//
// Three things are checked, and the third is the one that matters most:
//   1. The validator finds no errors in either published path.
//   2. The public projections carry no answer — no correct index, no
//      explanation, no hidden assertion, no reference implementation.
//   3. Every reference solution actually passes its own visible AND hidden
//      assertions in the real sandbox, and every declared criterion is met by
//      it. A task whose reference cannot pass is a task no learner can pass.
//
// Local aids while content is being authored (never set in CI):
//   PATHS_ONLY=dsa-foundations   check one path
//   PATHS_SKIP_RUN=1             skip the sandbox runs (shape checks only)

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LEARNING_PATHS, activitySummary, publicManifest, readinessFor } from '../lib/learning-paths/catalog';
import { codeFeedback, domainThresholds, gradeCheck, gradePathCode, codeFromReusedTask } from '../lib/learning-paths/grade';
import { solutionFor, solutionIds } from '../lib/learning-paths/solutions';
import { solutionFor as codingSolutionFor } from '../lib/coding/solutions';
import { DEFAULT_CRITERION, type MergedActivity, type MergedPath } from '../lib/learning-paths/types';
import { codingTaskById } from '../lib/coding/active';
import { isOffLoopModule, moduleComplete, nextActivityId, pathInventory, type EvidenceState } from '../shared/learning-paths';
import { PATH_LIMITS } from '../shared/learning-path-api';
import { moduleRequirements, recordedState } from '../lib/learning-paths/handlers';
import { DSA_PATH_CODING_TASKS, canonicalCodingTaskId } from '../lib/learning-paths/dsa-coding-tasks';
import { handlerContracts } from './learning-path-handler-contracts';
import { diagnosticCompetencyContracts } from './diagnostic-competency-contracts';
import { schemaContracts } from './learning-path-schema-contracts';
import { buildSandboxWorker } from './build-sandbox-worker.mjs';

const ONLY = process.env.PATHS_ONLY ?? '';
const SKIP_RUN = process.env.PATHS_SKIP_RUN === '1';

/** For every coding task a path reuses, an implementation that meets the
 * visible tests with the wrong method. The path grader must refuse it, which
 * it can only do by running the task's own hidden assertions. */
const KNOWN_WRONG_REUSED: Record<string, { label: string; code: string }> = {
  'js-binary-search': {
    label: 'a linear search (indexOf)',
    code: 'const binarySearch = (sorted, target) => sorted.indexOf(target);',
  },
};

/** Mistakes in a path exercise that once met every criterion (Coding audit
 * C2-7): the reference with one mistake put back in, and the criterion that
 * must now catch it. */
const KNOWN_WRONG_PATH: Record<string, { label: string; replace: [string, string]; criterion: string }[]> = {
  'fde-v1-bridge-operator-state': [
    { label: 'a failure accepted from any request in flight', replace: ['if (!inFlight || action.requestId !== state.requestId) return state;', 'if (!inFlight) return state;'], criterion: 'stale-responses' },
    { label: 'an approval accepted from any request', replace: ["if (state.status !== 'approving' || action.requestId !== state.requestId) return state;", "if (state.status !== 'approving') return state;"], criterion: 'stale-responses' },
    { label: 'a transition that writes into the state it was given', replace: ["return { ...state, status: 'ready', requestId: null, proposal: action.proposal, error: null };", "return Object.assign(state, { status: 'ready', requestId: null, proposal: action.proposal, error: null });"], criterion: 'core' },
  ],
  'fde-v1-m10-operator-state': [
    { label: 'any noted revision superseding the proposal', replace: ['    if (!(revision > state.proposal.revision)) return;\n', ''], criterion: 'approval-guarded' },
  ],
  // The M11 release gate (#504): each gate taken out alone must fail its own
  // critical criterion. The first is the issue's acceptance case: a gate that
  // rolls out on a failed migration check.
  'fde-v1-m11-deploy-release-gate': [
    { label: 'a rollout over a failed migration', replace: ["if (migration.status !== 'applied') reasons", "if (migration.status === 'pending') reasons"], criterion: 'migration-gate' },
    { label: 'a missing migration report read as no migrations', replace: ["if (!Array.isArray(migrations)) return ['migration:no-report'];", 'if (!Array.isArray(migrations)) return [];'], criterion: 'migration-gate' },
    { label: 'a blank restore point accepted for an irreversible migration', replace: ['migration.reversible !== true && !hasRestorePoint', 'migration.reversible !== true && restorePoint === null'], criterion: 'migration-gate' },
    { label: 'an empty probe list read as healthy', replace: ["if (!Array.isArray(probes) || probes.length === 0) return ['health:no-probes'];", "if (!Array.isArray(probes)) return ['health:no-probes'];"], criterion: 'health-gate' },
    { label: 'only not_ready counted as unhealthy', replace: [".filter((probe) => probe.status !== 'ready')", ".filter((probe) => probe.status === 'not_ready')"], criterion: 'health-gate' },
    { label: 'a required key nobody reported passing', replace: ['if (probe === undefined) reasons.push(`config:${key}:missing`);\n    else if', 'if (probe === undefined) continue;\n    if'], criterion: 'config-gate' },
    { label: 'an empty configuration report read as no report', replace: ["if (!Array.isArray(probes)) return ['config:no-report'];", "if (!Array.isArray(probes) || probes.length === 0) return ['config:no-report'];"], criterion: 'config-gate' },
    { label: 'a configuration state compared without its case', replace: ["else if (probe.state !== 'ok')", "else if (probe.state.toLowerCase() !== 'ok')"], criterion: 'config-gate' },
    { label: 'a configuration value written into the reason', replace: ['`config:${key}:${probe.state}`', '`config:${key}:${probe.state}:${probe.value}`'], criterion: 'config-gate' },
    { label: 'a rollout left out of the log', replace: ['  log.record({', "  if (decision === 'hold') log.record({"], criterion: 'records-why' },
    { label: 'reasons recorded in discovery order', replace: ['[...new Set(found)].sort()', '[...new Set(found)]'], criterion: 'records-why' },
  ],
  // M10 (file m08) injection and excessive-agency repair: the security gates
  // each fail their own critical criterion when taken out.
  'fde-v1-m08-untrusted-content': [
    { label: 'the proposal’s tenant sent to the tool', replace: ['    tenantId: session.tenantId,\n    actor:', '    tenantId: request.tenantId,\n    actor:'], criterion: 'no-cross-tenant' },
    { label: 'the recipient compared without normalising', replace: ["one.email.trim().toLowerCase() === wanted", 'one.email === request.recipient'], criterion: 'allowlisted-recipient' },
    { label: 'another tenant’s article accepted as evidence', replace: ['    doc.tenantId === session.tenantId &&\n', ''], criterion: 'no-cross-tenant' },
  ],
  // B6 (#502): the two flaws the issue names, plus two that break the
  // order-free merge, one that sorts by locale collation and one that writes
  // into the caller's ledger.
  'fde-v1-m05-data-reconcile': [
    { label: 'the last row delivered always wins (non-idempotent replay)', replace: ['if (current === undefined || supersedes(result, current)) {', 'if (true) {'], criterion: 'replay' },
    { label: 'an identical replay counted as a fresh write', replace: ['incoming.updatedAt > current.updatedAt', 'incoming.updatedAt >= current.updatedAt'], criterion: 'replay' },
    { label: 'an equal timestamp decided by arrival order', replace: ['\n  || (incoming.updatedAt === current.updatedAt && SOURCE_RANK[incoming.source] > SOURCE_RANK[current.source])', ''], criterion: 'replay' },
    { label: 'rejected rows dropped without a count', replace: ['report.rejected.push({ ref: row.ref, reason: result });', ''], criterion: 'accounted' },
    { label: 'the ledger sorted by locale collation instead of UTF-16 code units', replace: ['(a.id < b.id ? -1 : a.id > b.id ? 1 : 0)', 'a.id.localeCompare(b.id)'], criterion: 'core' },
    { label: 'the merged ledger written back into the ledger it was given', replace: ['  return { ledger: out, report };', '  (ledger as AccountRecord[]).splice(0, ledger.length, ...out);\n  return { ledger: out, report };'], criterion: 'atomic' },
  ],
};

/** The authoring targets the curriculum documents commit to. A path that
 * falls short is not ready to publish, whatever the validator says. */
const TARGETS: Record<string, { lessons: number; moduleChecks: number; codeExercises: number }> = {
  'dsa-foundations': { lessons: 18, moduleChecks: 36, codeExercises: 30 },
  fde: { lessons: 20, moduleChecks: 40, codeExercises: 10 },
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timed out after ${ms} ms`)), ms)),
  ]);

function codeActivities(path: MergedPath): { module: string; activity: MergedActivity }[] {
  return path.modules.flatMap((module) =>
    module.activities.filter((activity) => activity.kind === 'code').map((activity) => ({ module: module.id, activity })),
  );
}

async function main() {
  // Code activities are graded on the grader's worker thread, built fresh.
  await buildSandboxWorker();
  const failures: string[] = [];
  const fail = (message: string) => {
    failures.push(message);
  };

  const paths = LEARNING_PATHS.filter((path) => !ONLY || path.id === ONLY);
  assert.ok(paths.length > 0, 'no learning paths to check');

  for (const path of paths) {
    const where = `${path.id} v${path.version}`;

    /* ── 1. the validator ──────────────────────────────────────────────── */
    const readiness = readinessFor(path);
    for (const issue of readiness.issues) {
      if (issue.level === 'error') fail(`${where}: ${issue.at} — ${issue.message} (${issue.code})`);
    }

    /* ── inventory against the documented target ───────────────────────── */
    const manifest = publicManifest(path);
    const inventory = pathInventory(manifest);
    const target = TARGETS[path.id];
    if (target) {
      if (inventory.lessons < target.lessons) {
        fail(`${where}: ${inventory.lessons} lessons, the curriculum commits to ${target.lessons}`);
      }
      if (inventory.moduleChecks < target.moduleChecks) {
        fail(`${where}: ${inventory.moduleChecks} module checks, the curriculum commits to ${target.moduleChecks}`);
      }
      const exercises = inventory.moduleCodeExercises + inventory.finalCodeExercises;
      if (exercises < target.codeExercises) {
        fail(`${where}: ${exercises} coding exercises, the curriculum commits to ${target.codeExercises}`);
      }
    }

    /* ── a learner can hold a draft of every exercise and write-up ─────── */
    // Every code exercise and artifact autosaves a draft, one per activity.
    // With a cap below their number, a learner who typed into all of them was
    // refused from the next one on (DSA has 30 and the cap was 20).
    const draftable = inventory.codeExercises + inventory.artifacts;
    if (draftable > PATH_LIMITS.draftsPerEnrollment) {
      fail(`${where}: ${draftable} activities keep drafts, but an enrollment holds at most ${PATH_LIMITS.draftsPerEnrollment}`);
    }

    /* ── the database completes a module by moduleComplete's rule ──────── */
    // accept_learning_path_result (migration 054) decides completion from the
    // requirement lists a submit sends. For every module they must agree with
    // moduleComplete: nothing recorded, every requirement met at its own state
    // (and a verified pass for a write-up), and each requirement missed alone.
    for (const module of path.modules) {
      const requirements = moduleRequirements(module);
      const databaseSays = (states: Map<string, EvidenceState>) => requirements.length > 0
        && requirements.every((one) => one.states.includes(states.get(one.activityId) ?? 'not_started'));
      const met = new Map(module.requires.map((one) => [one.activityId, one.state]));
      const cases = [
        new Map<string, EvidenceState>(),
        met,
        new Map(module.requires.map((one) => [one.activityId, 'verified_pass' as EvidenceState])),
        ...module.requires.map((one) => new Map([...met, [one.activityId, 'needs_revision' as EvidenceState]])),
      ];
      for (const states of cases) {
        const expected = !isOffLoopModule(module) && moduleComplete(module, states);
        if (databaseSays(states) !== expected) {
          fail(`${where}/${module.id}: the requirements sent to the database say ${!expected} where moduleComplete says ${expected} for ${JSON.stringify([...states])}`);
        }
      }
    }

    /* ── 2. no answer leaks through a public projection ────────────────── */
    // Two complementary checks. The structural one is exact: the manifest must
    // not carry the shapes that hold answers at all. The textual one only fires
    // on strings long enough that a coincidence is implausible — a correct
    // option of "8" or "O(n)" appears all over a manifest legitimately, and
    // matching on those would report a leak that is not there.
    const publicJson = JSON.stringify(manifest);
    const LEAK_MATCH_MIN = 30;
    for (const key of ['options', 'correct', 'questions', 'explanation', 'harness', 'hiddenTests', 'starter']) {
      if (new RegExp(`"${key}"\\s*:`).test(publicJson)) {
        fail(`${where}: the published manifest carries a "${key}" field`);
      }
    }
    for (const module of path.modules) {
      for (const activity of module.activities) {
        const summary = JSON.stringify(activitySummary(activity));
        if (/"correct"/.test(summary)) fail(`${where}/${activity.id}: activity summary carries a correct index`);
        if (/"explanation"/.test(summary)) fail(`${where}/${activity.id}: activity summary carries an explanation`);
        if (/"harness"/.test(summary)) fail(`${where}/${activity.id}: activity summary carries the grading harness`);
        for (const question of activity.questions ?? []) {
          if (publicJson.includes(question.id)) {
            fail(`${where}/${question.id}: a question id reached the published manifest`);
          }
          if (question.explanation.length >= LEAK_MATCH_MIN && publicJson.includes(question.explanation)) {
            fail(`${where}/${question.id}: an explanation reached the published manifest`);
          }
          const correctText = question.options[question.correct] ?? '';
          if (correctText.length >= LEAK_MATCH_MIN && publicJson.includes(correctText)) {
            fail(`${where}/${question.id}: the correct option text reached the published manifest`);
          }
        }
        const solution = solutionFor(activity.id);
        if (solution && publicJson.includes(solution.solution)) {
          fail(`${where}/${activity.id}: the reference solution reached the published manifest`);
        }
      }
    }

    /* ── an objective check grades against the sealed key only ─────────── */
    for (const module of path.modules) {
      for (const activity of module.activities) {
        if (activity.kind !== 'check' || !activity.questions) continue;
        const key = activity.questions.map((question) => question.correct);
        const perfect = gradeCheck(activity, key, key);
        if (perfect.state !== 'verified_pass') {
          fail(`${where}/${activity.id}: the correct answers do not pass its own check`);
        }
        // Every answer wrong: with three or more options there is always a
        // different index to choose, so this really is a miss on every item.
        const wrong = activity.questions.map((question) => (question.correct === 0 ? 1 : 0));
        const missed = gradeCheck(activity, key, wrong);
        if (missed.state === 'verified_pass') {
          fail(`${where}/${activity.id}: an all-wrong submission passed`);
        }
        // A submission with no key cannot be graded as a pass, which is what
        // stops a forged or replayed session from minting one.
        if (gradeCheck(activity, undefined, key).state === 'verified_pass') {
          fail(`${where}/${activity.id}: graded as a pass without a sealed key`);
        }
      }
    }

    /* ── the next action teaches before it checks ───────────────────────── */
    // A lesson never gates a module, but a new learner is sent to the first
    // lesson, then the next, and only then to the first unmet requirement.
    {
      const first = manifest.modules.find((module) => !isOffLoopModule(module));
      const lessons = first?.activities.filter((activity) => activity.kind === 'lesson') ?? [];
      const states = new Map<string, EvidenceState>();
      for (const lesson of lessons) {
        const next = nextActivityId(manifest, states);
        if (next !== lesson.id) fail(`${where}: after ${states.size} lessons read, the next action is ${next}, not the lesson ${lesson.id}`);
        states.set(lesson.id, 'self_reviewed');
      }
      const firstRequirement = first?.requires[0]?.activityId ?? null;
      if (nextActivityId(manifest, states) !== firstRequirement) {
        fail(`${where}: with every lesson read, the next action is not the first requirement ${firstRequirement}`);
      }
      // Reading changes no completion arithmetic: lessons are never required.
      if (first && moduleComplete(first, states)) fail(`${where}: reading the lessons completed ${first.id}`);
    }

    /* ── 3. every reference solution passes its own assertions ─────────── */
    for (const { activity } of codeActivities(path)) {
      const at = `${where}/${activity.id}`;
      if (activity.reuseTaskId) {
        const task = codingTaskById(activity.reuseTaskId);
        if (!task) {
          fail(`${at}: reuses unknown coding task ${activity.reuseTaskId}`);
          continue;
        }
        // A reused task keeps its own identity and its own reference; the path
        // must not restate it, or the two could drift apart.
        if (solutionFor(activity.id)) fail(`${at}: a reused task must not carry a second reference solution`);
        // Its hidden assertions are the task's own, and the path grader must
        // run them: they are what forces the intended method.
        const reference = codingSolutionFor(activity.reuseTaskId);
        if (!reference) {
          fail(`${at}: reused task ${activity.reuseTaskId} has no reference solution`);
          continue;
        }
        const wrong = KNOWN_WRONG_REUSED[activity.reuseTaskId];
        if (!wrong) fail(`${at}: name a known-wrong implementation of ${activity.reuseTaskId} in KNOWN_WRONG_REUSED`);
        if (SKIP_RUN) continue;
        const merged = codeFromReusedTask(task);
        const graded = await withTimeout(gradePathCode(activity, merged, reference.solution, runReactSuite), 30_000, at);
        if (graded.state !== 'verified_pass') fail(`${at}: the reused task's reference does not pass through the path grader (${graded.code.outcome})`);
        const hiddenCount = (reference.hiddenTests?.length ?? 0) + (reference.hiddenTypeTests?.length ?? 0);
        if ((graded.code.hidden?.total ?? 0) !== hiddenCount) {
          fail(`${at}: the path grader ran ${graded.code.hidden?.total ?? 0} of the reused task's ${hiddenCount} hidden assertions`);
        }
        if (wrong) {
          const shortcut = await withTimeout(gradePathCode(activity, merged, wrong.code, runReactSuite), 30_000, at);
          if (shortcut.state === 'verified_pass') fail(`${at}: ${wrong.label} passes; the hidden assertions did not run`);
        }
        continue;
      }
      const solution = solutionFor(activity.id);
      if (!solution) {
        fail(`${at}: missing reference solution`);
        continue;
      }
      if (!solution.hiddenTests?.length && !solution.hiddenTypeTests?.length) {
        fail(`${at}: needs hidden assertions, or the visible tests are the whole grade`);
      }
      const code = activity.code;
      if (!code) continue;
      const criterionIds = new Set(code.criteria.map((criterion) => criterion.id));
      for (const test of solution.hiddenTests ?? []) {
        const criterion = test.criterion ?? DEFAULT_CRITERION;
        if (!criterionIds.has(criterion)) fail(`${at}: hidden assertion references unknown criterion ${criterion}`);
      }
      // Every declared criterion needs at least one assertion somewhere, or it
      // would fail for a correct solution and could never be met.
      const exercised = new Set([
        ...code.tests.map((test) => test.criterion),
        ...(solution.hiddenTests ?? []).map((test) => test.criterion ?? DEFAULT_CRITERION),
      ]);
      for (const criterion of code.criteria) {
        if (!exercised.has(criterion.id)) fail(`${at}: criterion ${criterion.id} has no assertion`);
      }

      if (SKIP_RUN) continue;
      const graded = await withTimeout(gradePathCode(activity, code, solution.solution, runReactSuite), 30_000, at);
      if (graded.state !== 'verified_pass') {
        const missed = graded.criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.id);
        const firstFailure = graded.code.results.findIndex((result) => result.pass !== true);
        fail(
          `${at}: the reference solution does not pass (${graded.code.outcome})` +
            (missed.length ? `; criteria not met: ${missed.join(', ')}` : '') +
            (firstFailure >= 0 ? `; first failing visible test: ${code.tests[firstFailure]?.call}` : '') +
            (graded.code.codeError ? `; ${graded.code.codeError}` : ''),
        );
      }
      // Learners fill the starter and keep its authored examples. Those calls
      // must see provided helpers before the grader installs instrumentation.
      const scratchpadAt = code.starter.indexOf('// Scratch pad');
      if (scratchpadAt >= 0) {
        const filledStarter = solution.solution + '\n' + code.starter.slice(scratchpadAt);
        const withExamples = await withTimeout(gradePathCode(activity, code, filledStarter, runReactSuite), 30_000, at);
        if (withExamples.state !== 'verified_pass') {
          fail(`${at}: the reference with its starter examples does not pass (${withExamples.code.outcome})` +
            (withExamples.code.codeError ? `; ${withExamples.code.codeError}` : ''));
        }
      }
      for (const wrong of KNOWN_WRONG_PATH[activity.id] ?? []) {
        const [from, to] = wrong.replace;
        if (!solution.solution.includes(from)) {
          fail(`${at}: the known mistake "${wrong.label}" no longer applies to the reference; rewrite it`);
          continue;
        }
        const shortcut = await withTimeout(gradePathCode(activity, code, solution.solution.split(from).join(to), runReactSuite), 30_000, at);
        if (shortcut.criteria.find((criterion) => criterion.id === wrong.criterion)?.passed !== false) fail(`${at}: ${wrong.label} still meets ${wrong.criterion}`);
      }
    }

    /* ── code that does not run is a recorded attempt, and says so ─────── */
    // The submit handler records a syntax error as needs_revision, so its
    // feedback must not tell the learner that nothing was recorded.
    const plain = codeActivities(path).find(({ activity }) => activity.code?.language === 'javascript');
    if (plain && !SKIP_RUN) {
      const broken = await gradePathCode(plain.activity, plain.activity.code!, 'const broken = (n) => { return n +; };');
      if (broken.state !== 'needs_revision') fail(`${where}: a syntax error grades as ${broken.state}, not needs_revision`);
      for (const line of codeFeedback(broken)) {
        if (/nothing was recorded|not recorded/i.test(line)) fail(`${where}: a recorded syntax error says "${line}"`);
      }
    }
  }

  /* ── no orphan solutions ───────────────────────────────────────────── */
  if (!ONLY) {
    const known = new Set(
      LEARNING_PATHS.flatMap((path) => path.modules.flatMap((module) => module.activities.map((one) => one.id))),
    );
    for (const id of solutionIds()) {
      if (!known.has(id)) fail(`solutions: ${id} does not match any activity`);
    }
    for (const id of Object.keys(KNOWN_WRONG_PATH)) {
      if (!known.has(id)) fail(`KNOWN_WRONG_PATH: ${id} does not match any activity`);
    }
  }

  /* ── the probes, the hidden run and the type check (PATH-1, CODE-2) ─── */
  const dsaPath = LEARNING_PATHS.find((path) => path.id === 'dsa-foundations');
  const dsaActivity = (id: string) => dsaPath?.modules.flatMap((module) => module.activities).find((activity) => activity.id === id);
  if (!SKIP_RUN && dsaPath) {
    // The DSA method checks count array reads through a Proxy. Code that
    // replaced the global Proxy, or RegExp.prototype.test, made every count
    // zero, so a linear scan passed the binary-search and one-pass budgets.
    const tamperings = [
      ['Proxy replaced', 'var Proxy = function (target) { return target; };'],
      ['RegExp test replaced', 'RegExp.prototype.test = function () { return false; };'],
    ] as const;
    const binary = dsaActivity('dsa-v1-d07-binary-search');
    const linear = dsaActivity('dsa-v1-d07-linear-search');
    if (!binary?.reuseTaskId || !linear?.code) {
      fail('dsa-foundations: the D07 search exercises are missing');
    } else {
      const binaryCode = codeFromReusedTask(codingTaskById(binary.reuseTaskId)!);
      const scan = 'const binarySearch = (sorted, target) => { for (let i = 0; i < sorted.length; i++) if (sorted[i] === target) return i; return -1; };';
      const runOn = 'const linearSearch = (values, target) => { let found = -1; for (let i = values.length - 1; i >= 0; i--) if (values[i] === target) found = i; return found; };';
      for (const [name, tamper] of tamperings) {
        const scanned = await gradePathCode(binary, binaryCode, `${tamper}\n${scan}`);
        if (scanned.state === 'verified_pass') fail(`dsa-v1-d07-binary-search: a linear scan passes with the ${name}`);
        const ranOn = await gradePathCode(linear, linear.code, `${tamper}\n${runOn}`);
        if (ranOn.state === 'verified_pass') fail(`dsa-v1-d07-linear-search: a scan past the match passes with the ${name}`);
      }
    }
    // The hidden assertions run in a fresh program, in a shuffled order, as
    // in the coding section: a table of every expected answer served by call
    // count passed them when they ran in the same program after the visible
    // ones.
    const digits = codingTaskById('js-digit-sum')!;
    const table = [...digits.tests!, ...codingSolutionFor(digits.id)!.hiddenTests!].map((test) => test.expected);
    const byCount = await gradePathCode(
      { ...binary!, id: 'synthetic-digit-sum', reuseTaskId: digits.id },
      codeFromReusedTask(digits),
      `let k = 0; const table = ${JSON.stringify(table)}; const digitSum = () => table[k++];`,
    );
    if (byCount.code.results.some((result) => result.pass !== true)) fail('the call-count table should pass the visible assertions');
    if (byCount.state === 'verified_pass') fail('a table of answers served by call count passes the hidden assertions');
    // A type check that runs past its deadline is stopped on its worker
    // thread and graded as a timeout, as in the coding section.
    const typed = LEARNING_PATHS.flatMap(codeActivities).find(({ activity }) => activity.code?.language === 'typescript');
    if (typed) {
      const recursive = "type B<N extends number, E, A extends unknown[] = []> = A['length'] extends N ? A : B<N, E, [...A, E]>;\n"
        + Array.from({ length: 30 }, (_, index) => `const q${index}: B<999, 'k${index}'>['length'] = 999;\n`).join('');
      const started = Date.now();
      const stopped = await gradePathCode(typed.activity, typed.activity.code!, recursive);
      const took = Date.now() - started;
      if (stopped.code.outcome !== 'timeout' || stopped.state !== 'needs_revision') fail(`a runaway type check grades as ${stopped.code.outcome}/${stopped.state}, not a timeout`);
      if (took > 15_000) fail(`a runaway type check took ${took} ms to stop`);
    } else {
      fail('no TypeScript path activity to check the type-check deadline with');
    }
  }

  /* ── what a later, weaker result leaves on record ──────────────────── */
  // The rule accept_learning_path_result applies (migration 054): a verified
  // pass is never demoted, and a submitted write-up only by a verified pass.
  {
    const folds: Array<[EvidenceState | undefined, EvidenceState, EvidenceState]> = [
      ['self_reviewed', 'needs_revision', 'self_reviewed'],
      ['self_reviewed', 'in_progress', 'self_reviewed'],
      ['self_reviewed', 'verified_pass', 'verified_pass'],
      ['verified_pass', 'needs_revision', 'verified_pass'],
      ['verified_pass', 'self_reviewed', 'verified_pass'],
      ['needs_revision', 'self_reviewed', 'self_reviewed'],
      [undefined, 'needs_revision', 'needs_revision'],
    ];
    for (const [prior, next, kept] of folds) {
      const got = recordedState(prior, next);
      if (got !== kept) fail(`${next} after ${prior ?? 'nothing'} leaves ${got} on record, not ${kept}`);
    }
  }

  /* ── the DSA final's pass rule ─────────────────────────────────────── */
  // Ten questions, two per domain. An 80% gate per domain meant both of a
  // domain's questions, so one slip anywhere failed a check whose screen said
  // 80%. The rule is 80% overall and at least one of each domain's two.
  {
    const dsa = LEARNING_PATHS.find((path) => path.id === 'dsa-foundations');
    const final = dsa?.modules.flatMap((module) => module.activities).find((activity) => activity.id === 'dsa-v1-d10-final-checks');
    if (!final?.questions || !final.domains) {
      fail('dsa-foundations: the final check dsa-v1-d10-final-checks is missing');
    } else {
      const key = final.questions.map((question) => question.correct);
      const missing = (indexes: number[]) => key.map((correct, index) => (indexes.includes(index) ? (correct === 0 ? 1 : 0) : correct));
      const inDomain = (domain: string) =>
        final.questions!.flatMap((question, index) => (question.domain === domain ? [index] : []));
      const [first, second, third] = final.domains;
      const cases: Array<[string, number[], 'verified_pass' | 'needs_revision', string[]]> = [
        ['9/10 with one miss', [inDomain(first)[0]], 'verified_pass', []],
        ['8/10 with one miss in each of two domains', [inDomain(first)[0], inDomain(second)[0]], 'verified_pass', []],
        ['8/10 with both misses in one domain', inDomain(second), 'needs_revision', [second]],
        ['7/10 with one miss in each of three domains', [inDomain(first)[0], inDomain(second)[0], inDomain(third)[0]], 'needs_revision', []],
      ];
      for (const [label, misses, state, failedDomains] of cases) {
        const graded = gradeCheck(final, key, missing(misses));
        if (graded.state !== state) fail(`dsa final: ${label} grades ${graded.state}, not ${state}`);
        if (JSON.stringify(graded.failedDomains) !== JSON.stringify(failedDomains)) {
          fail(`dsa final: ${label} fails the domains [${graded.failedDomains.join(', ')}], not [${failedDomains.join(', ')}]`);
        }
      }
      if (Object.values(domainThresholds(final)).some((share) => share !== 0.5)) {
        fail('dsa final: a two-question domain needs 50% on its own');
      }

      // A domain with five or more questions keeps the check's own 80%. With
      // five in one domain and fifteen in another, 18 of 20 clears the overall
      // threshold, so only the five-question domain's own gate can refuse two
      // misses there, and it does; one miss there passes.
      const question = final.questions[0];
      const mixed = {
        ...final,
        domains: ['five', 'fifteen'],
        questions: Array.from({ length: 20 }, (_, index) => ({
          ...question, id: `mixed-q${index}`, correct: 0, domain: index < 5 ? 'five' : 'fifteen',
        })),
      };
      const thresholds = domainThresholds(mixed);
      if (thresholds.five !== 0.8 || thresholds.fifteen !== 0.8) {
        fail(`domains of five and fifteen questions keep the 80% gate, not ${JSON.stringify(thresholds)}`);
      }
      const mixedKey = mixed.questions.map(() => 0);
      const twoMissed = gradeCheck(mixed, mixedKey, mixedKey.map((correct, index) => (index < 2 ? 1 : correct)));
      if (twoMissed.state !== 'needs_revision' || twoMissed.failedDomains.join() !== 'five') {
        fail(`18/20 with two of a five-question domain missed grades ${twoMissed.state} [${twoMissed.failedDomains.join(', ')}], not a fail on that domain`);
      }
      const oneMissed = gradeCheck(mixed, mixedKey, mixedKey.map((correct, index) => (index < 1 ? 1 : correct)));
      if (oneMissed.state !== 'verified_pass') fail(`19/20 with one miss in a five-question domain grades ${oneMissed.state}`);

      /* ── a failed project check keeps its key ───────────────────────── */
      // A retry deals the same questions reshuffled, so a failed attempt says
      // only which were wrong. The key and explanations come with a pass, and
      // a practice check returns them every time.
      if (final.purpose !== 'project') fail('dsa final: the final check is a project check');
      const failedFinal = gradeCheck(final, key, missing(inDomain(second)));
      if (!failedFinal.keyWithheld) fail('dsa final: a failed project check does not say it withheld its key');
      const leaked = failedFinal.verdicts.filter((verdict) => 'correctIndex' in verdict || 'explanation' in verdict);
      if (leaked.length > 0) fail(`dsa final: a failed project check returns the key or an explanation for ${leaked.map((one) => one.questionId).join(', ')}`);
      const wrongIds = failedFinal.verdicts.filter((verdict) => !verdict.correct).map((verdict) => verdict.questionId);
      const expectedWrong = inDomain(second).map((index) => final.questions![index].id);
      if (wrongIds.join() !== expectedWrong.join()) fail(`dsa final: a failed attempt names [${wrongIds.join(', ')}] wrong, not [${expectedWrong.join(', ')}]`);
      const passedFinal = gradeCheck(final, key, missing([inDomain(first)[0]]));
      if (passedFinal.keyWithheld || passedFinal.verdicts.some((verdict, index) => verdict.correctIndex !== key[index] || !verdict.explanation)) {
        fail('dsa final: a passed project check does not return the key and every explanation');
      }
      const practice = paths.flatMap((path) => path.modules.flatMap((module) => module.activities))
        .find((activity) => activity.kind === 'check' && activity.purpose === 'exercise' && (activity.questions?.length ?? 0) > 0);
      if (!practice?.questions) {
        fail('no exercise check to compare with');
      } else {
        const practiceKey = practice.questions.map((one) => one.correct);
        const practiceMissed = gradeCheck(practice, practiceKey, practiceKey.map((correct) => (correct === 0 ? 1 : 0)));
        if (practiceMissed.keyWithheld || practiceMissed.verdicts.some((verdict, index) => verdict.correctIndex !== practiceKey[index] || !verdict.explanation)) {
          fail(`${practice.id}: a failed exercise check no longer returns its key and explanations`);
        }
      }
    }
  }

  /* ── the answer material stays server-side ─────────────────────────── */
  const clientRoot = join(process.cwd(), 'client', 'src');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(full) ? [full] : [];
    });
  for (const file of walk(clientRoot)) {
    const text = readFileSync(file, 'utf8');
    if (/lib\/learning-paths/.test(text)) {
      fail(`${file.replace(process.cwd() + '/', '')} must not import lib/learning-paths`);
    }
  }
  const catalogSource = readFileSync(join(process.cwd(), 'lib/learning-paths/catalog.ts'), 'utf8');
  assert.doesNotMatch(catalogSource, /from '\.\/solutions/, 'the catalogue must not import the solutions');

  /* ── one coding record per DSA exercise (#493) ─────────────────────── */
  // A DSA path pass records under the Coding task the exercise became, so it
  // and a Coding pass share one record and one award. The queue keeps its
  // path id: its path contract (a harness-declared buffer) is not the task's.
  {
    const dsa = LEARNING_PATHS.find((path) => path.id === 'dsa-foundations')!;
    const code = dsa.modules.flatMap((module) => module.activities).filter((activity) => activity.kind === 'code');
    const mapped = code.filter((activity) => !activity.reuseTaskId && activity.id !== 'dsa-v1-d04-head-index-queue');
    assert.deepEqual(Object.keys(DSA_PATH_CODING_TASKS).sort(), mapped.map((activity) => activity.id).sort(), 'every DSA exercise but the reuse and the queue maps to a Coding task');
    const targets = Object.values(DSA_PATH_CODING_TASKS);
    assert.equal(new Set(targets).size, targets.length, 'each Coding task takes one exercise');
    for (const id of targets) {
      const task = codingTaskById(id);
      assert.ok(task && task.topic === 'dsa' && task.track === 'algorithms', `${id} is an issued DSA Foundations task`);
    }
    for (const activity of code) {
      const id = canonicalCodingTaskId(dsa.id, activity);
      if (activity.reuseTaskId) assert.equal(id, activity.reuseTaskId, `${activity.id} keeps the task it reuses`);
      else if (activity.id === 'dsa-v1-d04-head-index-queue') assert.match(id, /^path-code-[0-9a-f]{32}$/, 'the queue keeps its path id');
      else assert.equal(id, DSA_PATH_CODING_TASKS[activity.id]);
    }
    assert.equal(canonicalCodingTaskId(dsa.id, { id: 'dsa-v1-d07-binary-search', reuseTaskId: 'js-binary-search' }), 'js-binary-search');
    const fde = LEARNING_PATHS.find((path) => path.id === 'fde');
    for (const activity of (fde?.modules ?? []).flatMap((module) => module.activities).filter((one) => one.kind === 'code' && !one.reuseTaskId)) {
      assert.match(canonicalCodingTaskId(fde!.id, activity), /^path-code-[0-9a-f]{32}$/, `${activity.id}: an FDE exercise keeps its path id`);
    }
  }

  /* ── the handlers: availability, refusals, rate limits ─────────────── */
  diagnosticCompetencyContracts();
  schemaContracts(fail);
  await handlerContracts(fail);

  if (failures.length > 0) {
    console.error(`Learning-path content check failed with ${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  const summary = LEARNING_PATHS.map((path) => {
    const inventory = pathInventory(publicManifest(path));
    return `${path.id} v${path.version}: ${inventory.modules} modules, ${inventory.lessons} lessons, ` +
      `${inventory.moduleChecks}+${inventory.finalChecks} checks, ${inventory.codeExercises} exercises, ` +
      `${inventory.artifacts} artifacts`;
  }).join('\n  ');
  console.log(`Learning-path content passed.\n  ${summary}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
