// Content contract for the coding catalogue.
//   npm run test:coding
// Opt-in:
//   CODING_REQUIRE_CS=1         check Czech parity (the app ships English only)
//   CODING_CS_TRACKS=a,b        with the above, check only these tracks
// Local aids while content is being authored (never set in CI):
//   CODING_ALLOW_LEVEL_GAPS=1   allow Learn levels without a task
//   CODING_SKIP_INDEX=1         do not require shared/coding-index.ts to be fresh
//   CODING_COVERAGE_ENFORCED=1  fail on Easy-band technique gaps even while COVERAGE_ENFORCED is off
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CODING_TASKS, EASY_BAND_TASK_IDS, MEDIUM_HARD_BAND_TASK_IDS, playable } from '../lib/coding/catalog';
import { CODING_SUMMARIES, levelCodingTasks, tasksForLevel } from '../lib/coding/active';
import { solutionFor, solutionIds } from '../lib/coding/solutions';
import { stripComments } from '../lib/coding/solutions/strip-comments';
import { localizedFields, localizedLists } from '../lib/coding/types';
import {
  CODING_DIFFICULTIES,
  CODING_SECTION_TRACKS,
  CODING_TRACKS,
  STAGE_DIFFICULTY_BANDS,
  TIER_DIFFICULTY,
  difficultyFitsTier,
  difficultyOf,
  gardenPathFor,
  isCodingTaskId,
  isCodingTechnique,
  isCodingTier,
  isDifficulty,
  stageDifficulty,
  type CodingTier,
  type Difficulty,
} from '../shared/coding-catalog';
import { COVERAGE_ENFORCED, COVERAGE_MIN_EASY, coverageGaps, renderCoverage, techniqueCoverage } from './coding-coverage';
import { docsFor, taskResources } from '../shared/coding-docs';
import { approachCoverage, approachesFor } from '../lib/coding/approaches';
import { formatOf } from '../shared/coding-catalog';
import { runInSandbox } from '../lib/coding/sandbox';
import { presentPuzzle, puzzleCoverage, puzzleFor, resolvePuzzleOrder } from '../lib/coding/puzzles';
import { isAcceptedOrder, isCompleteOrder, PUZZLE_MAX_LINES } from '../shared/coding-puzzle';
import { evaluateCalls, allPassed } from '../shared/coding-evaluate';
import { createTypeScript, isCheckerLibFile, typesPassed } from '../shared/coding-ts-check';
import { runReactSuite } from '../lib/coding/react-runner';
import { HIDDEN_CASE_PREFIX, splitHiddenCases, withHiddenCases } from '../lib/coding/react-hidden';
import { renderCodingIndex } from './build-coding-index';
import { EVOLVING_CHALLENGES, evolvingResume, evolvingStage, evolvingUnlocked, evolvingTaskTrack, evolvingPassed, listedChallenges } from '../shared/evolving';

// The app ships English only (`ENABLED_LANGS` in the client's LanguageContext),
// so Czech copy is retained work rather than a shipped surface and a new task
// is not obliged to arrive with an overlay. The parity check is kept and can
// still be run over whatever Czech exists — `CODING_REQUIRE_CS=1` — so the day
// the language comes back the gaps are one command away from being listed.
const REQUIRE_CS = process.env.CODING_REQUIRE_CS === '1';
const ALLOW_GAPS = process.env.CODING_ALLOW_LEVEL_GAPS === '1';
// Restrict the Czech parity check to some tracks, e.g.
// CODING_CS_TRACKS=javascript,typescript.
const CS_TRACKS = (process.env.CODING_CS_TRACKS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SKIP_INDEX = process.env.CODING_SKIP_INDEX === '1';
const ENFORCE_COVERAGE = COVERAGE_ENFORCED || process.env.CODING_COVERAGE_ENFORCED === '1';
// Prove only the solutions whose task id matches, e.g. CODING_ONLY='^ts-'
// while one file is being authored. The shape checks still cover everything.
// Never set in CI.
const ONLY = new RegExp(process.env.CODING_ONLY ?? '');
const nodeRequire = createRequire(import.meta.url);

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timed out after ${ms} ms`)), ms))]);

// The cases a hidden React suite declares, counted from its source. The React
// proofs below check the count against the cases the run registered.
const hiddenCaseCount = (hiddenSuite: string | undefined): number => (hiddenSuite?.match(/^\s*(?:test|it)\(/gm) ?? []).length;

async function main() {
  const failures: string[] = [];
  const fail = (message: string) => { failures.push(message); };

  // Optional whitespace must be exercised publicly and graded consistently.
  const calculator = CODING_TASKS.find(task => task.id === 'js-evolving-calculator-1')!;
  const calculatorChecks = [...calculator.tests!, ...solutionFor(calculator.id)!.hiddenTests!];
  const calculatorRun = await runInSandbox({code:'function calculate(s) { return s.split("+").reduce((sum, value) => sum + Number(value), 0); }', calls:calculatorChecks.map(test=>test.call), expectations:calculatorChecks.map(test=>test.expected)});
  assert.ok(allPassed(calculatorRun), 'valid addition must pass visible and hidden server checks');
  const spacingBug = await runInSandbox({code:'function calculate(s) { return s.trim().split(/\\s+/).filter(value => value !== "+").reduce((sum, value) => sum + Number(value), 0); }', calls:calculator.tests!.map(test=>test.call), expectations:calculator.tests!.map(test=>test.expected)});
  assert.ok(!allPassed(spacingBug), 'visible tests must expose space-dependent tokenization');

  assert.ok(EVOLVING_CHALLENGES.length >= 10, 'at least ten evolving projects');
  const stageIds = EVOLVING_CHALLENGES.flatMap(project => [...project.stages]);
  assert.equal(new Set(stageIds).size, stageIds.length, 'unique stable stage IDs');
  for (const project of EVOLVING_CHALLENGES) {
    if (project.short) {
      // A short path lives on its section's page: five levels at most, no
      // checkpoints, and a section that exists to list it.
      assert.ok(project.stages.length >= 3 && project.stages.length <= 5, `${project.id}: a short path has three to five levels`);
      assert.ok(project.stages.every(id => !id.endsWith('-start')), `${project.id}: a short path has no checkpoints`);
      assert.ok(project.category === 'fullstack' || CODING_SECTION_TRACKS.includes(project.track), `${project.id}: a short path belongs to a listed section`);
    } else {
      assert.ok(project.stages.length >= (project.category === 'fullstack' ? 6 : 5) && project.stages.length <= 12);
    }
    const passed = new Set<string>();
    for (const [index,id] of project.stages.entries()) {
      const task = CODING_TASKS.find(task => task.id === id);
      assert.ok(task, `${id}: authored task exists`);
      assert.equal(task.track, evolvingTaskTrack(id));
      assert.ok(task.references?.length && task.references.every(ref=>ref.title.en && (!REQUIRE_CS || ref.title.cs) && ref.url.startsWith('https://')), 'each stage has localized references');
      assert.equal(evolvingResume(project, passed), id, 'resume is the first unfinished stage');
      assert.equal(evolvingUnlocked(id, passed), true, 'earlier verified passes unlock the next stage');
      if (index > 0) assert.equal(evolvingUnlocked(id, new Set()), false, 'deep links cannot skip prerequisites');
      assert.ok(!tasksForLevel(task.topic, task.level).some(item => item.id === id), 'optional projects never change Learn quotas');
      if (index > 0) {
        const prior = CODING_TASKS.find(task => task.id === project.stages[index-1])!;
        assert.deepEqual(task.previousRequirements?.[index-1], prior.prompt, 'earlier requirements remain available');
        // The new stage's checks lead, so the first rows in Results show what
        // the brief just asked for; every earlier check follows, unchanged.
        if (task.tests) {
          assert.deepEqual(task.tests.slice(task.tests.length - prior.tests!.length), prior.tests, 'earlier runtime checks remain, after the new ones');
        }
        if (task.suite && prior.suite) {
          // The shared header is whatever both suites open with, cut back to
          // a whole line: the imports, and for FullStack the runtime checks
          // and seed the UI checks depend on.
          let common = 0;
          while (common < prior.suite.length && prior.suite[common] === task.suite[common]) common += 1;
          const header = prior.suite.slice(0, prior.suite.lastIndexOf('\n', common - 1) + 1);
          assert.ok(header.length > 0 && task.suite.startsWith(header), `${id}: the suite keeps its header first`);
          assert.ok(task.suite.endsWith(prior.suite.slice(header.length)), `${id}: earlier UI checks remain, after the new ones`);
        }
      }
      passed.add(id);
    }
    assert.equal(evolvingResume(project, passed), project.stages.at(-1), 'finished projects reopen their final stage');
    assert.equal(evolvingUnlocked(project.stages.at(-1)!, new Set([project.stages.at(-2)!])), false, 'all prerequisites are required');
    const legacy = new Set(project.stages.filter(id => !id.endsWith('-start')));
    assert.ok(project.stages.every(id => evolvingPassed(id, legacy)), 'legacy milestone completion covers new prerequisites');
    assert.equal(evolvingResume(project, legacy), project.stages.at(-1), 'existing finishers remain finished');
  }
  assert.equal(evolvingStage('js-count-multiples'), null, 'ordinary tasks stay ordinary');

  /* ── shape ─────────────────────────────────────────────────────────── */
  const ids = new Set<string>();
  const legacy = new Set<string>();
  for (const task of CODING_TASKS) {
    const where = `${task.id} (${task.title.en})`;
    if (!isCodingTaskId(task.id)) fail(`${where}: id must be a track-prefixed slug`);
    if (ids.has(task.id)) fail(`${where}: duplicate id`);
    ids.add(task.id);
    if (task.legacyId) {
      if (legacy.has(task.legacyId)) fail(`${where}: duplicate legacy id ${task.legacyId}`);
      legacy.add(task.legacyId);
    }
    if (!CODING_TRACKS.includes(task.track)) fail(`${where}: unknown track ${task.track}`);
    if (task.track === 'system-design') {
      if (task.level !== 0) fail(`${where}: system design tasks carry no Learn level`);
    } else {
      if (task.topic !== task.track) fail(`${where}: topic must match the track`);
      if (!Number.isInteger(task.level) || task.level < 1 || task.level > 25) fail(`${where}: level must be 1–25`);
    }
    if (!isCodingTier(task.tier)) fail(`${where}: bad tier`);
    // An authored label may only move a task within what its tier allows.
    if (task.difficulty !== undefined) {
      if (!isDifficulty(task.difficulty)) fail(`${where}: unknown difficulty ${String(task.difficulty)}`);
      else if (!difficultyFitsTier(task.difficulty, task.tier)) fail(`${where}: ${task.difficulty} contradicts tier ${task.tier}`);
    }
    if (task.focus.length === 0) fail(`${where}: needs at least one technique tag`);
    for (const tag of task.focus) if (!isCodingTechnique(tag)) fail(`${where}: unknown technique tag ${tag}`);
    if (!(task.estimatedMinutes > 0)) fail(`${where}: estimatedMinutes must be positive`);
    if (task.hints.en.length === 0 && task.verify !== 'drill' && task.verify !== 'guided') fail(`${where}: needs a hint`);
    assert.ok(docsFor(task.focus).url.startsWith('https://'), `${where}: docs link`);
    assert.match(gardenPathFor(task), /^[a-z-]+\/\d{2}-[a-z0-9-]+\.(js|ts|jsx|md)$/, `${where}: garden path`);

    switch (task.verify) {
      case 'tests':
        if (task.track === 'react') {
          if (!task.suite?.includes('test(')) fail(`${where}: React task needs a suite`);
        } else {
          if (!task.tests || task.tests.length < 4) fail(`${where}: needs at least 4 test calls`);
          if (task.tests && !task.tests.some((t) => t.edge)) fail(`${where}: needs at least one edge case`);
          if (task.track === 'typescript' && (!task.typeTests || task.typeTests.length < 2)) fail(`${where}: TypeScript task needs type tests`);
          if (!solutionFor(task.id)) fail(`${where}: missing reference solution`);
        }
        if (task.track === 'react' && !solutionFor(task.id)) fail(`${where}: missing reference solution`);
        break;
      case 'checklist':
        if (!task.checklist || task.checklist.en.length < 2) fail(`${where}: checklist tasks need at least 2 items`);
        break;
      case 'guided':
        if (!task.design) { fail(`${where}: guided task needs a design`); break; }
        if (task.design.steps.length !== 5) fail(`${where}: a walkthrough has five steps`);
        for (const step of task.design.steps) {
          if (step.options.length < 3) fail(`${where}: step ${step.key} needs at least 3 options`);
          if (step.correct < 0 || step.correct >= step.options.length) fail(`${where}: step ${step.key} answer out of range`);
        }
        if (task.design.passMark < 1 || task.design.passMark > task.design.steps.length) fail(`${where}: bad pass mark`);
        break;
      case 'drill': {
        if (!task.drill) { fail(`${where}: drill task needs a drill`); break; }
        const d = task.drill;
        if (d.format === 'estimate' && !(typeof d.answer === 'number' && typeof d.min === 'number' && typeof d.max === 'number' && d.min <= d.answer && d.answer <= d.max && d.unit)) fail(`${where}: estimate needs answer, band and unit`);
        if ((d.format === 'tradeoff' || d.format === 'bottleneck') && !(d.options && d.options.length >= 3 && typeof d.correct === 'number' && d.correct >= 0 && d.correct < d.options.length)) fail(`${where}: choice drill needs options and a correct index`);
        if (d.format === 'sequence' && !(d.steps && d.steps.length >= 3)) fail(`${where}: sequence needs at least 3 steps`);
        break;
      }
      default:
        fail(`${where}: unknown verify mode ${String(task.verify)}`);
    }

    // The playable projection must never carry an answer.
    const play = JSON.stringify(playable(task));
    if (task.design) {
      if (play.includes('"correct"') || play.includes(task.design.reference.en.slice(0, 40))) fail(`${where}: playable payload leaks the design answers`);
    }
    if (task.drill) {
      if (play.includes('"correct"') || play.includes('"answer"') || play.includes('"min"')) fail(`${where}: playable payload leaks the drill key`);
      if (task.drill.explanation.en && play.includes(task.drill.explanation.en.slice(0, 40))) fail(`${where}: playable payload leaks the drill explanation`);
    }
    const solution = solutionFor(task.id);
    for (const code of [solution?.solution, solution?.junior, solution?.senior]) {
      if (code && code.trim().length > 0 && play.includes(JSON.stringify(code).slice(1, -1))) fail(`${where}: playable payload leaks a solution`);
    }
  }
  for (const id of solutionIds()) if (!ids.has(id)) fail(`solution ${id} has no task`);

  // The junior and senior boards are read as code after a pass, so the notes
  // that explain them in the source must not travel. `solutionFor` strips
  // them; this asserts the text that actually ships is clean, and that
  // stripping it again would change nothing — a stripper that ate real code
  // would fail the solution proofs below instead.
  for (const id of solutionIds()) {
    const solution = solutionFor(id)!;
    for (const [kind, code] of [['junior', solution.junior], ['senior', solution.senior]] as const) {
      if (!code) continue;
      if (stripComments(code) !== code) fail(`${id}: the ${kind} board still carries a comment`);
    }
  }

  /* ── difficulty labels ─────────────────────────────────────────────── */
  // Easy, Medium and Hard are derived, so they are proven rather than read.
  // An override that contradicts its tier is refused.
  const refused: [Difficulty, CodingTier][] = [['easy', 3], ['easy', 4], ['easy', 5], ['hard', 1], ['hard', 2]];
  for (const [label, tier] of refused) assert.equal(difficultyFitsTier(label, tier), false, `an ${label} override cannot sit at tier ${tier}`);
  for (const tier of [1, 2, 3, 4, 5] as CodingTier[]) assert.equal(difficultyFitsTier('medium', tier), true, `a Medium override fits tier ${tier}`);
  assert.equal(difficultyOf({ id: 'js-count-multiples', tier: 3, difficulty: 'medium' }), 'medium', 'an authored label wins');
  // Stages and levels read their position, in the bands the handoff fixed.
  const bandOf = (length: number) => Array.from({ length }, (_, index) => stageDifficulty(index, length)[0].toUpperCase()).join('');
  assert.equal(bandOf(5), 'EEMMH', 'five-level paths: 1–2 Easy, 3–4 Medium, 5 Hard');
  assert.equal(bandOf(10), 'EEEMMMMHHH', 'ten-stage projects: 1–3, 4–7, 8–10');
  assert.equal(bandOf(12), 'EEEEMMMMMHHH', 'twelve-stage FullStack apps: 1–4, 5–9, 10–12');
  const byId = new Map(CODING_TASKS.map((task) => [task.id, task]));
  for (const project of EVOLVING_CHALLENGES) {
    const length = project.stages.length;
    if (!STAGE_DIFFICULTY_BANDS[length]) { fail(`${project.id}: no difficulty band for a path of ${length} stages; add one to STAGE_DIFFICULTY_BANDS`); continue; }
    project.stages.forEach((id, index) => {
      const task = byId.get(id);
      if (!task || task.difficulty) return; // missing stages fail above; an authored label is bounded by its tier
      const expected = stageDifficulty(index, length);
      if (difficultyOf(task) !== expected) fail(`${id}: stage ${index + 1} of ${length} should be ${expected}, not ${difficultyOf(task)}`);
    });
  }
  // Standalone tasks read their tier: 1–2 Easy, 3 Medium, 4–5 Hard.
  for (const task of CODING_TASKS) {
    if (evolvingStage(task.id) || task.difficulty) continue;
    const label = difficultyOf(task);
    if (label !== TIER_DIFFICULTY[task.tier]) fail(`${task.id}: tier ${task.tier} should read ${TIER_DIFFICULTY[task.tier]}, not ${label}`);
    if (label === 'easy' && task.tier > 2) fail(`${task.id}: Easy at tier ${task.tier}`);
    if (label === 'hard' && task.tier < 3) fail(`${task.id}: Hard at tier ${task.tier}`);
  }
  // Every summary the browser reads carries exactly the label the task resolves to.
  const labelCounts = new Map<Difficulty, number>(CODING_DIFFICULTIES.map((label) => [label, 0]));
  for (const summary of CODING_SUMMARIES) {
    const task = byId.get(summary.id);
    if (!isDifficulty(summary.difficulty)) { fail(`${summary.id}: summary has no difficulty`); continue; }
    if (task && summary.difficulty !== difficultyOf(task)) fail(`${summary.id}: summary says ${summary.difficulty}, the task resolves to ${difficultyOf(task)}`);
    labelCounts.set(summary.difficulty, (labelCounts.get(summary.difficulty) ?? 0) + 1);
  }
  const labelTotal = [...labelCounts.values()].reduce((sum, n) => sum + n, 0);
  if (labelTotal !== CODING_SUMMARIES.length) fail(`difficulty labels cover ${labelTotal} of ${CODING_SUMMARIES.length} summaries`);

  /* ── parity ─────────────────────────────────────────────────────────── */
  if (REQUIRE_CS) {
    for (const task of CODING_TASKS) {
      if (CS_TRACKS.length > 0 && !CS_TRACKS.includes(task.track)) continue;
      const where = `${task.id}`;
      for (const { path: field, value } of localizedFields(task)) {
        if (!value.en.trim()) fail(`${where}: ${field} has no English`);
        if (!value.cs.trim()) fail(`${where}: ${field} has no Czech`);
      }
      for (const { path: field, value } of localizedLists(task)) {
        if (value.en.length !== value.cs.length) fail(`${where}: ${field} has ${value.en.length} English and ${value.cs.length} Czech entries`);
        if (value.cs.some((one) => !one.trim())) fail(`${where}: ${field} has an empty Czech entry`);
      }
    }
  }

  /* ── Learn coverage ─────────────────────────────────────────────────── */
  for (const topic of ['javascript', 'typescript', 'react'] as const) {
    for (let level = 1; level <= 25; level++) {
      const tasks = tasksForLevel(topic, level);
      if (tasks.length === 0 && !ALLOW_GAPS) fail(`${topic} level ${level} has no coding task`);
      const chosen = levelCodingTasks(topic, level);
      if (chosen.some((t) => t.verify === 'checklist')) fail(`${topic} level ${level} would gate on a checklist task`);
    }
  }

  /* ── index freshness ────────────────────────────────────────────────── */
  const indexPath = path.join(process.cwd(), 'shared', 'coding-index.ts');
  if (!SKIP_INDEX && (!existsSync(indexPath) || readFileSync(indexPath, 'utf8') !== renderCodingIndex(CODING_SUMMARIES))) {
    fail('shared/coding-index.ts is stale: run npm run build:coding-index');
  }

  /* ── technique coverage of the Easy band (#226) ─────────────────────── */
  // The check itself must bite: three Easy challenges cover a Medium tag, and
  // taking one away opens a gap.
  const probe = [
    { id: 'js-probe-medium', track: 'javascript' as const, tier: 3 as const, focus: ['closures'] },
    ...[1, 2, 3].map((n) => ({ id: `js-probe-easy-${n}`, track: 'javascript' as const, tier: 1 as const, focus: ['closures'] })),
  ];
  assert.equal(coverageGaps(techniqueCoverage(probe, ['javascript'])).length, 0, `${COVERAGE_MIN_EASY} Easy challenges cover a Medium tag`);
  assert.deepEqual(
    coverageGaps(techniqueCoverage(probe.slice(0, -1), ['javascript'])).map((row) => [row.tag, row.easy]),
    [['closures', COVERAGE_MIN_EASY - 1]],
    'removing an Easy challenge opens a gap',
  );
  const coverage = techniqueCoverage(CODING_SUMMARIES);
  console.log(renderCoverage(coverage, ENFORCE_COVERAGE));
  if (ENFORCE_COVERAGE) {
    for (const gap of coverageGaps(coverage)) fail(`${gap.track}: ${gap.tag} is on ${gap.medium} Medium challenge(s) and only ${gap.easy} Easy one(s); it needs ${COVERAGE_MIN_EASY}`);
  }

  /* ── the Easy-band waves (#226) ─────────────────────────────────────── */
  // What every wave promises: a standalone Easy challenge on one technique
  // (two focus tags at most) that fits in ten minutes, a hint ladder whose
  // last rung is the documentation page of its first tag, hidden checks
  // beside the visible ones, and no seat in a Learn level's quota. The
  // solution proofs below cover the three solutions and the failing starter.
  assert.ok(EASY_BAND_TASK_IDS.size > 0, 'the Easy-band waves are registered');
  const summarized = new Set(CODING_SUMMARIES.map((summary) => summary.id));
  for (const id of EASY_BAND_TASK_IDS) {
    const task = byId.get(id);
    if (!task) { fail(`${id}: an Easy-band id with no task`); continue; }
    if (!summarized.has(id)) fail(`${id}: an Easy-band task must be issued`);
    if (evolvingStage(id)) fail(`${id}: an Easy-band task is standalone`);
    if (task.difficulty !== undefined || difficultyOf(task) !== 'easy') fail(`${id}: an Easy-band task reads Easy from its tier`);
    if (task.focus.length > 2) fail(`${id}: at most two focus tags, one technique`);
    if (task.estimatedMinutes > 10) fail(`${id}: an Easy-band task fits in ten minutes`);
    if (task.verify !== 'tests') fail(`${id}: an Easy-band task is graded by its tests`);
    const [page] = taskResources(task.focus);
    if (!page || page.tag !== task.focus[0] || docsFor(task.focus).url !== page.url) fail(`${id}: the first focus tag must have a documentation page to end the hint ladder`);
    if (task.hints.en.length === 0 || (task.approach?.en.length ?? 0) < 2) fail(`${id}: a hint and at least two method steps before the documentation`);
    const hiddenChecks = task.track === 'react' ? hiddenCaseCount(solutionFor(id)?.hiddenSuite) : (solutionFor(id)?.hiddenTests?.length ?? 0);
    if (hiddenChecks < 3) fail(`${id}: at least three hidden checks`);
    if (tasksForLevel(task.topic, task.level).some((one) => one.id === id)) fail(`${id}: an Easy-band task never enters a Learn level's quota`);
  }

  /* ── the Medium and Hard waves (#226) ───────────────────────────────── */
  // What every Medium and Hard wave promises: a standalone challenge that
  // combines two to four techniques, each one taught by at least
  // COVERAGE_MIN_EASY Easy challenges of the same track. The coverage matrix
  // above holds every Medium challenge to that; this holds the Hard ones of
  // the waves to it too. The label comes from the tier (3 Medium, 4 Hard, 5
  // for a React capstone), the hint ladder has a skeleton and ends in the
  // documentation page of the first tag, the visible checks come with hidden
  // ones, and the challenge takes no seat in a Learn level's quota.
  assert.ok(MEDIUM_HARD_BAND_TASK_IDS.size > 0, 'the Medium and Hard waves are registered');
  const easyPerTag = new Map<string, number>();
  for (const summary of CODING_SUMMARIES) {
    if (evolvingStage(summary.id) || summary.difficulty !== 'easy') continue;
    for (const tag of summary.focus) easyPerTag.set(`${summary.track}:${tag}`, (easyPerTag.get(`${summary.track}:${tag}`) ?? 0) + 1);
  }
  for (const id of MEDIUM_HARD_BAND_TASK_IDS) {
    const task = byId.get(id);
    if (!task) { fail(`${id}: a Medium or Hard band id with no task`); continue; }
    if (!summarized.has(id)) fail(`${id}: a Medium or Hard band task must be issued`);
    if (EASY_BAND_TASK_IDS.has(id)) fail(`${id}: listed in the Easy band as well`);
    if (evolvingStage(id)) fail(`${id}: a Medium or Hard band task is standalone`);
    const label = difficultyOf(task);
    if (task.difficulty !== undefined || (label !== 'medium' && label !== 'hard')) fail(`${id}: a Medium or Hard band task reads its label from its tier`);
    if (task.tier === 5 && task.track !== 'react') fail(`${id}: tier 5 is for React capstones`);
    if (task.focus.length < 2 || task.focus.length > 4) fail(`${id}: combines two to four techniques`);
    for (const tag of task.focus) {
      const easy = easyPerTag.get(`${task.track}:${tag}`) ?? 0;
      if (easy < COVERAGE_MIN_EASY) fail(`${id}: ${tag} is on only ${easy} Easy ${task.track} challenge(s); a Medium or Hard challenge needs ${COVERAGE_MIN_EASY} behind each tag`);
    }
    if (!(task.estimatedMinutes > 10 && task.estimatedMinutes <= 45)) fail(`${id}: takes longer than an Easy challenge and at most 45 minutes`);
    if (task.verify !== 'tests') fail(`${id}: a Medium or Hard band task is graded by its tests`);
    const [page] = taskResources(task.focus);
    if (!page || page.tag !== task.focus[0] || docsFor(task.focus).url !== page.url) fail(`${id}: the first focus tag must have a documentation page to end the hint ladder`);
    if (task.hints.en.length === 0 || (task.approach?.en.length ?? 0) < 3 || !task.skeleton) fail(`${id}: a hint, at least three method steps and a skeleton before the documentation`);
    const visibleChecks = task.track === 'react' ? hiddenCaseCount(task.suite) : (task.tests?.length ?? 0);
    const hiddenChecks = task.track === 'react' ? hiddenCaseCount(solutionFor(id)?.hiddenSuite) : (solutionFor(id)?.hiddenTests?.length ?? 0);
    if (visibleChecks < 5) fail(`${id}: at least five visible checks`);
    if (hiddenChecks < 4) fail(`${id}: at least four hidden checks`);
    if (tasksForLevel(task.topic, task.level).some((one) => one.id === id)) fail(`${id}: a Medium or Hard band task never enters a Learn level's quota`);
  }

  /* ── JavaScript and TypeScript solutions ────────────────────────────── */
  const libDir = path.join(path.dirname(nodeRequire.resolve('typescript/package.json')), 'lib');
  const libs = Object.fromEntries(readdirSync(libDir).filter(isCheckerLibFile).map((name) => [name, readFileSync(path.join(libDir, name), 'utf8')]));
  const checker = createTypeScript({ ts: nodeRequire('typescript'), libs });

  // Every graded code task carries three solutions — the reference the
  // learner can give up to, and the junior and senior versions shown after a
  // pass — and all three have to pass the same visible and hidden checks.
  const variants = (solution: NonNullable<ReturnType<typeof solutionFor>>, where: string): [string, string][] => {
    const out: [string, string][] = [['reference', solution.solution]];
    if (typeof solution.junior === 'string' && solution.junior.trim()) out.push(['junior', solution.junior]);
    else fail(`${where}: missing the junior solution`);
    if (typeof solution.senior === 'string' && solution.senior.trim()) out.push(['senior', solution.senior]);
    else fail(`${where}: missing the senior solution`);
    if (solution.junior && solution.senior && solution.junior.trim() === solution.senior.trim()) fail(`${where}: the junior and senior solutions are the same code`);
    return out;
  };

  for (const task of CODING_TASKS) {
    if (task.verify !== 'tests' || task.track === 'react' || !task.tests) continue;
    if (!ONLY.test(task.id)) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const where = `${task.id}`;
    let starterCode = task.starter;
    if (task.track === 'typescript') {
      const starterCheck = checker.check(task.starter, task.typeTests ?? []);
      const starterRun = await withTimeout(evaluateCalls({ code: checker.toJavaScript(task.starter), calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }), 8_000, where);
      if (typesPassed(starterCheck) && allPassed(starterRun)) fail(`${where}: the untouched starter already passes`);
      starterCode = checker.toJavaScript(task.starter);
    }
    for (const [name, source] of variants(solution, where)) {
      const label = `${where} (${name})`;
      let code = source;
      if (task.track === 'typescript') {
        const check = checker.check(source, task.typeTests ?? []);
        if (!typesPassed(check)) fail(`${label}: solution fails the type tests: ${JSON.stringify(check).slice(0, 300)}`);
        if (solution.hiddenTypeTests?.length) {
          const hidden = checker.check(source, solution.hiddenTypeTests);
          if (!typesPassed(hidden)) fail(`${label}: solution fails the hidden type tests`);
        }
        code = checker.toJavaScript(source);
      }
      const run = await withTimeout(evaluateCalls({ code, calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }), 8_000, label);
      const serverTests = [...task.tests, ...solution.hiddenTests ?? []];
      const sandbox = await runInSandbox({code, calls:serverTests.map(test=>test.call), expectations:serverTests.map(test=>test.expected)});
      if (!allPassed(sandbox)) fail(`${label}: solution fails the production QuickJS grader: ${JSON.stringify(sandbox).slice(0,500)}`);
      if (!allPassed(run)) {
        const wrong = run.results.map((r, i) => (r.pass ? null : `${task.tests![i].call} → ${r.error ?? r.actual}`)).filter(Boolean);
        fail(`${label}: solution fails visible tests: ${run.codeError ?? wrong.join('; ')}`);
      }
      if (solution.hiddenTests?.length) {
        const hidden = await withTimeout(evaluateCalls({ code, calls: solution.hiddenTests.map((t) => t.call), expectations: solution.hiddenTests.map((t) => t.expected) }), 8_000, label);
        if (!allPassed(hidden)) fail(`${label}: solution fails hidden tests: ${hidden.codeError ?? hidden.results.map((r, i) => (r.pass ? null : solution.hiddenTests![i].call)).filter(Boolean).join('; ')}`);
      }
    }
    // Algorithms challenges are plain JavaScript too, so their starters must fail the same way.
    if (task.track === 'javascript' || task.track === 'algorithms') {
      const starterRun = await withTimeout(evaluateCalls({ code: starterCode, calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }), 8_000, where);
      if (allPassed(starterRun)) fail(`${where}: the untouched starter already passes`);
    }
  }

  /* ── React solutions ────────────────────────────────────────────────── */
  for (const task of CODING_TASKS) {
    if (task.track !== 'react' || task.verify !== 'tests' || !task.suite) continue;
    if (!ONLY.test(task.id)) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const where = `${task.id}`;
    // Hidden cases are test blocks appended to the visible suite; the server
    // runs both, and every solution has to pass both.
    if (task.suite.includes(HIDDEN_CASE_PREFIX)) fail(`${where}: a visible suite never uses the hidden case prefix`);
    if (solution.hiddenSuite !== undefined && /^\s*import\s/m.test(solution.hiddenSuite)) fail(`${where}: a hidden suite shares the visible suite's imports and declares none`);
    const suite = withHiddenCases(task.suite, solution.hiddenSuite);
    for (const [name, source] of variants(solution, where)) {
      const run = await withTimeout(runReactSuite({ suite, appSource: source }), 20_000, `${where} (${name})`);
      if (run.compileError || run.failed > 0) {
        fail(`${where} (${name}): solution fails its suite: ${run.compileError ?? run.cases.filter((c) => c.status === 'fail').map((c) => `${c.name}: ${c.error}`).join('; ')}`);
      }
      const { hidden } = splitHiddenCases(run.cases);
      if (hidden.length !== hiddenCaseCount(solution.hiddenSuite)) fail(`${where} (${name}): the hidden suite declares ${hiddenCaseCount(solution.hiddenSuite)} case(s) and ran ${hidden.length}`);
    }
    const starter = await withTimeout(runReactSuite({ suite: task.suite, appSource: task.starter }), 20_000, where);
    if (!starter.compileError && starter.failed === 0) fail(`${where}: the untouched starter already passes its suite`);
  }

  if (failures.length > 0) {
    console.error(`Coding content contract: ${failures.length} problem(s)\n  - ${failures.join('\n  - ')}`);
    process.exitCode = 1;
    return;
  }
  const byTrack = CODING_TRACKS.map((track) => `${track} ${CODING_TASKS.filter((t) => t.track === track).length}`).join(', ');
  // ── approach comparisons (#158) ────────────────────────────────────────
  // Every covered id is a real task; every comparison has at least two
  // approaches, both languages throughout, and a stated cost. Nothing here
  // reaches the browser before the server sees a recorded pass.
  const coveredIds = approachCoverage();
  assert.ok(coveredIds.length > 0, 'the approach manifest must cover something');
  for (const id of coveredIds) {
    const task = CODING_TASKS.find((one) => one.id === id);
    assert.ok(task, `approach comparison ${id} must name a real task`);
    const approaches = approachesFor(id);
    assert.ok(approaches.length >= 2, `${id} needs at least two approaches to compare`);
    for (const approach of approaches) {
      for (const field of [approach.name, approach.readability, approach.assumptions, approach.tradeoffs]) {
        assert.ok(field.en.length > 0 && field.cs.length > 0, `${id}: every approach field needs EN and CS`);
      }
      assert.ok(approach.code.trim().length > 0, `${id}: an approach needs code`);
      assert.ok(approach.time.length > 0 && approach.space.length > 0, `${id}: an approach must state its cost`);
    }
  }

  // ── code-ordering puzzles (#154) ───────────────────────────────────────
  // Every covered id is a real task; every accepted order is a permutation of
  // that puzzle's own lines; no puzzle is short enough to be guessed; and each
  // one declares what arranging it demonstrates.
  const puzzleIds = puzzleCoverage();
  assert.ok(puzzleIds.length > 0, 'the puzzle manifest must cover something');
  for (const id of puzzleIds) {
    const task = CODING_TASKS.find((one) => one.id === id);
    assert.ok(task, `puzzle ${id} must name a real task`);
    const puzzle = puzzleFor(id)!;
    assert.ok(puzzle.lines.length >= 5, `${id}: a puzzle of fewer than five lines is guesswork`);
    assert.ok(puzzle.lines.length <= PUZZLE_MAX_LINES, `${id}: a puzzle over ${PUZZLE_MAX_LINES} lines is unusable on a phone`);
    assert.equal(new Set(puzzle.lines.map((line) => line.id)).size, puzzle.lines.length, `${id}: line ids must be unique`);
    assert.ok(puzzle.accepted.length > 0, `${id}: a puzzle needs at least one accepted order`);
    for (const order of puzzle.accepted) {
      assert.ok(isCompleteOrder(order, puzzle.lines), `${id}: every accepted order must use each line exactly once`);
    }
    assert.ok(isAcceptedOrder(puzzle.accepted[0], puzzle.accepted), `${id}: its own order must be accepted`);
    // A wrong order is rejected — the check is not vacuous.
    const wrong = [...puzzle.accepted[0]].reverse();
    if (puzzle.lines.length > 1) {
      assert.equal(isAcceptedOrder(wrong, puzzle.accepted), false, `${id}: a reversed order must not pass`);
    }
    assert.ok(puzzle.competencies.length > 0, `${id}: a puzzle must declare what it demonstrates`);
    assert.ok(puzzle.claim.en.length > 0 && puzzle.claim.cs.length > 0, `${id}: the claim needs EN and CS`);
    // What the browser sees carries no authored id, and sorting what it sees
    // never produces an accepted order — the ids say nothing about the answer.
    const reversed = <T>(list: T[]) => [...list].reverse();
    for (const shuffle of [reversed, <T>(list: T[]) => [...list.slice(1), ...list.slice(0, 1)]]) {
      const presented = presentPuzzle(puzzle, shuffle);
      const authored = new Set(puzzle.lines.map((line) => line.id));
      assert.ok(presented.lines.every((line) => !authored.has(line.id)), `${id}: presented ids must not be the authored ids`);
      const sorted = [...presented.lines.map((line) => line.id)].sort();
      const resolved = resolvePuzzleOrder(sorted, presented.map).filter((one): one is string => one !== null);
      assert.equal(isAcceptedOrder(resolved, puzzle.accepted), false, `${id}: sorting the presented ids must not solve the puzzle`);
      const back = resolvePuzzleOrder(presented.lines.map((line) => line.id), presented.map);
      assert.deepEqual(back, presented.map, `${id}: presentation ids resolve to the authored ids`);
      assert.deepEqual(resolvePuzzleOrder(['zz', 'b0', 'b99'], presented.map), [null, null, null], `${id}: ids never issued resolve to nothing`);
    }
  }

  // ── the debugging format (#163) ────────────────────────────────────────
  // A debugging task must actually start from broken code: its starter has to
  // fail its own visible tests, or the format is a label rather than an
  // exercise. Each one also declares the misconception it is built around.
  const debugTasks = CODING_TASKS.filter((task) => formatOf(task) === 'debug');
  assert.ok(debugTasks.filter((task) => !evolvingStage(task.id)).length >= 4, 'the four standalone repair tasks stay beside the debugging paths');
  for (const task of debugTasks) {
    assert.equal(task.track, 'javascript', 'the first debugging set is JavaScript; extend this check when others land');
    assert.ok((task.tests?.length ?? 0) >= 3, `${task.id}: a debugging task needs tests that pin the behaviour down`);
    assert.ok(task.failureHints || task.pitfall, `${task.id}: a debugging task must name the misconception it teaches`);
    for (const hint of Object.values(task.failureHints ?? {})) {
      assert.ok(hint.en.length > 0 && hint.cs.length > 0, `${task.id}: failure hints need EN and CS`);
    }
    const solution = solutionFor(task.id);
    assert.ok(solution, `${task.id}: a debugging task needs its reference repair`);
    // The starter is wrong on purpose: running it against the task's own tests
    // must fail. This is what separates a debugging task from a filled-in one.
    const starterRun = await runInSandbox({
      code: task.starter,
      calls: (task.tests ?? []).map((one) => one.call),
      expectations: (task.tests ?? []).map((one) => one.expected),
    });
    const starterPasses = !starterRun.codeError
      && starterRun.results.length > 0
      && starterRun.results.every((one) => one.pass === true);
    assert.equal(starterPasses, false, `${task.id}: the broken starter must fail its own tests`);
  }

  // ── the debugging paths (#225) ─────────────────────────────────────────
  // Three short paths replace the café-orders project on the Coding home.
  // Every level starts from code that runs and is wrong: the starter for the
  // first level, then the previous level's repair, which is what a learner
  // carries forward. The first hint rung names the logging technique and the
  // ladder ends in documentation before the solution.
  const debugPaths = listedChallenges({ category: 'debugging' });
  assert.deepEqual(debugPaths.map((project) => project.id), ['js-path-logging', 'js-path-tracing', 'js-path-edges'], 'the Coding home lists the three debugging paths');
  const promised: Record<string, string> = { 'js-path-logging': 'EEEEE', 'js-path-tracing': 'MMMMM', 'js-path-edges': 'MMMMH' };
  for (const project of debugPaths) {
    assert.ok(project.short && project.track === 'javascript' && project.stages.length === 5, `${project.id}: a JavaScript path of five levels`);
    assert.equal(project.stages.map((id) => difficultyOf(byId.get(id)!)[0].toUpperCase()).join(''), promised[project.id], `${project.id}: the difficulty the path promises`);
    for (const [index, id] of project.stages.entries()) {
      const task = byId.get(id)!;
      assert.equal(formatOf(task), 'debug', `${id}: a debugging level`);
      assert.match(task.hints.en[0] ?? '', /console\.[a-zA-Z]+\(|structuredClone\(/, `${id}: the first hint rung names the logging technique`);
      assert.ok(task.approach && task.approach.en.length >= 3, `${id}: method steps between the hint and the documentation`);
      assert.ok(task.references?.[0]?.url.startsWith('https://developer.mozilla.org/'), `${id}: the ladder ends in documentation`);
      const earlier = index > 0 ? byId.get(project.stages[index - 1])!.tests!.length : 0;
      const own = task.tests!.slice(0, task.tests!.length - earlier);
      const startingCode = index === 0 ? task.starter : solutionFor(project.stages[index - 1])!.solution;
      const start = await runInSandbox({ code: startingCode, calls: own.map((one) => one.call), expectations: own.map((one) => one.expected) });
      assert.equal(start.codeError, null, `${id}: the code this level starts from runs`);
      assert.ok(start.results.some((one) => one.pass !== true), `${id}: the code this level starts from fails the level's own checks`);
    }
  }
  // The debug helper's hidden check reads what the call printed, so it tells
  // a helper that logs and returns from one that only does half the job.
  const printed = solutionFor('js-path-logging-5')!.hiddenTests!.find((one) => one.call.includes('printed'))!;
  const helper = async (code: string) => allPassed(await runInSandbox({ code, calls: [printed.call], expectations: [printed.expected] }));
  assert.equal(await helper('function debug(label, value) { console.log(label, value); return value; }'), true, 'console.log(label, value) and a return pass');
  assert.equal(await helper('function debug(label, value) { console.log({ [label]: value }); return value; }'), true, 'the object shorthand passes too');
  assert.equal(await helper('function debug(label, value) { console.debug(label, value); return value; }'), true, 'console.debug passes too');
  assert.equal(await helper('function debug(label, value) { return value; }'), false, 'returning without logging fails');
  assert.equal(await helper('function debug(label, value) { console.log(label, value); }'), false, 'logging without returning fails');
  assert.equal(await helper('function debug(label, value) { console.log(label); console.log(value); return value; }'), false, 'two lines for one value fail');
  // The café-orders project leaves every list and nothing else: its ten
  // stages still open, grade and keep their drafts and passes (#225).
  const retiredProject = EVOLVING_CHALLENGES.find((project) => project.id === 'js-evolving-debug')!;
  assert.equal(retiredProject.unlisted, true, 'js-evolving-debug is unlisted');
  const everyList = [undefined, 'fullstack', 'debugging'].map((category) => listedChallenges({ category: category as 'fullstack' | 'debugging' | undefined }))
    .concat(CODING_SECTION_TRACKS.map((track) => listedChallenges({ track })));
  assert.ok(everyList.every((list) => !list.includes(retiredProject)), 'no list shows js-evolving-debug');
  const issued = new Set(CODING_SUMMARIES.map((summary) => summary.id));
  assert.equal(retiredProject.stages.length, 10, 'the retired project keeps its ten stages');
  for (const id of retiredProject.stages) {
    assert.ok(issued.has(id), `${id}: still issued, so a draft, a pass or a bookmark still opens`);
    assert.ok(solutionFor(id), `${id}: still graded`);
    assert.ok(evolvingStage(id)?.challenge === retiredProject, `${id}: still unlocks in order`);
  }

  // ── the learner console ────────────────────────────────────────────────
  // The Run button's worker and the grading sandbox print the same lines for
  // every console method the debugging paths teach. Timings differ (the
  // sandbox clock is virtual), so they are checked on their own.
  const consoleProgram = [
    'console.log({ total: 12 }, "label", [1, 2], undefined);',
    'console.table([{ name: "tea", price: 3 }, { name: "cake", price: 2.5, qty: 1 }]);',
    'console.table([1, "two"]);',
    'console.group("checkout"); console.count("addPoints"); console.count("addPoints"); console.table({ a: { x: 1 } }); console.groupEnd();',
    'console.countReset("addPoints"); console.count("addPoints"); console.count();',
    'console.assert(false, "broken", 3); console.assert(true, "fine");',
    'console.dir({ deep: { er: 1 } }); console.trace("here"); console.info("i"); console.warn("w"); console.error("e"); console.debug("d");',
    'console.timeEnd("never"); console.time("t"); console.time("t"); console.groupCollapsed(); console.log("inside"); console.groupEnd();',
  ].join('\n');
  const inSandbox = await runInSandbox({ code: consoleProgram, calls: [], expectations: null });
  const inWorker = await evaluateCalls({ code: consoleProgram, calls: [], expectations: null });
  assert.equal(inSandbox.codeError, null, 'every taught console method exists in the sandbox');
  assert.equal(inWorker.codeError, null, 'every taught console method exists in the worker');
  assert.deepEqual(inWorker.logs, inSandbox.logs, 'both runners print the same lines');
  assert.deepEqual(inSandbox.logs.slice(0, 5), [
    '{"total":12} label [1,2] undefined',
    '(index) | name   | price | qty\n--------+--------+-------+----\n0       | "tea"  | 3     |\n1       | "cake" | 2.5   | 1',
    '(index) | Values\n--------+-------\n0       | 1\n1       | "two"',
    'checkout',
    '  addPoints: 1',
  ], 'console.table draws rows under their index, and a group indents');
  const timed = await runInSandbox({ code: 'console.time("wait"); setTimeout(() => console.timeEnd("wait"), 100);', calls: ['new Promise((done) => setTimeout(done, 150))'], expectations: null });
  assert.deepEqual(timed.logs, ['wait: 100ms'], 'console.time reads the sandbox\'s virtual clock');

  const byLabel = CODING_DIFFICULTIES.map((label) => `${label} ${labelCounts.get(label) ?? 0}`).join(', ');
  console.log(`Coding content contract passed: ${CODING_TASKS.length} tasks (${byTrack}; ${byLabel}), solutions proven, payloads answer-free${REQUIRE_CS ? ', Czech parity checked' : ''}${ALLOW_GAPS ? ', level gaps allowed' : ''}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
