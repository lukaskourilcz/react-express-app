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
import { gradeCheck, gradePathCode, codeFromReusedTask } from '../lib/learning-paths/grade';
import { solutionFor, solutionIds } from '../lib/learning-paths/solutions';
import { DEFAULT_CRITERION, type MergedActivity, type MergedPath } from '../lib/learning-paths/types';
import { codingTaskById } from '../lib/coding/active';
import { pathInventory } from '../shared/learning-paths';

const ONLY = process.env.PATHS_ONLY ?? '';
const SKIP_RUN = process.env.PATHS_SKIP_RUN === '1';

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
          if (question.explanation.en.length >= LEAK_MATCH_MIN && publicJson.includes(question.explanation.en)) {
            fail(`${where}/${question.id}: an explanation reached the published manifest`);
          }
          const correctText = question.options[question.correct]?.en ?? '';
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
      const graded = await withTimeout(gradePathCode(activity, code, solution.solution), 30_000, at);
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
