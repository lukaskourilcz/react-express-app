// Content contract for the coding catalogue.
//   npm run test:coding
// Local aids while content is being authored (never set in CI):
//   CODING_SKIP_CS=1            skip the Czech parity checks
//   CODING_ALLOW_LEVEL_GAPS=1   allow Learn levels without a task
//   CODING_CS_TRACKS=a,b        check Czech parity for these tracks only
//   CODING_SKIP_INDEX=1         do not require shared/coding-index.ts to be fresh
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CODING_TASKS, CODING_SUMMARIES, levelCodingTasks, playable, tasksForLevel } from '../lib/coding/catalog';
import { solutionFor, solutionIds } from '../lib/coding/solutions';
import { localizedFields, localizedLists } from '../lib/coding/types';
import {
  CODING_TRACKS,
  gardenPathFor,
  isCodingTaskId,
  isCodingTechnique,
  isCodingTier,
} from '../shared/coding-catalog';
import { docRegistryProblems, docsFor, resourcesFor } from '../shared/coding-docs';
import { allFailureAdvice } from '../lib/coding/failure-hints';
import { FAILURE_CATEGORIES, classifyFailure, stageOf } from '../shared/coding-failures';
import { evaluateCalls, allPassed } from '../shared/coding-evaluate';
import { createTypeScript, isCheckerLibFile, typesPassed } from '../shared/coding-ts-check';
import { runReactSuite } from '../lib/coding/react-runner';
import { renderCodingIndex } from './build-coding-index';
import { allPuzzles, assemble, gradePuzzle, preparePuzzle, puzzleProblems } from '../lib/coding/puzzles';
import { MAX_PUZZLE_BLOCKS, PUZZLE_COMPETENCIES } from '../shared/coding-puzzle';

const SKIP_CS = process.env.CODING_SKIP_CS === '1';
const ALLOW_GAPS = process.env.CODING_ALLOW_LEVEL_GAPS === '1';
// Restrict the Czech parity check to some tracks while overlays are authored
// in parallel, e.g. CODING_CS_TRACKS=javascript,typescript. Never set in CI.
const CS_TRACKS = (process.env.CODING_CS_TRACKS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SKIP_INDEX = process.env.CODING_SKIP_INDEX === '1';
const nodeRequire = createRequire(import.meta.url);

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timed out after ${ms} ms`)), ms))]);

async function main() {
  const failures: string[] = [];
  const fail = (message: string) => { failures.push(message); };

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
    if (solution && solution.solution.trim().length > 0 && play.includes(JSON.stringify(solution.solution).slice(1, -1))) fail(`${where}: playable payload leaks the solution`);
  }
  for (const id of solutionIds()) if (!ids.has(id)) fail(`solution ${id} has no task`);

  /* ── parity ─────────────────────────────────────────────────────────── */
  if (!SKIP_CS) {
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

  /* ── JavaScript and TypeScript solutions ────────────────────────────── */
  const libDir = path.join(path.dirname(nodeRequire.resolve('typescript/package.json')), 'lib');
  const libs = Object.fromEntries(readdirSync(libDir).filter(isCheckerLibFile).map((name) => [name, readFileSync(path.join(libDir, name), 'utf8')]));
  const checker = createTypeScript({ ts: nodeRequire('typescript'), libs });

  for (const task of CODING_TASKS) {
    if (task.verify !== 'tests' || task.track === 'react' || !task.tests) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const where = `${task.id}`;
    let code = solution.solution;
    let starterCode = task.starter;
    if (task.track === 'typescript') {
      const check = checker.check(solution.solution, task.typeTests ?? []);
      if (!typesPassed(check)) fail(`${where}: reference solution fails the type tests: ${JSON.stringify(check).slice(0, 300)}`);
      if (solution.hiddenTypeTests?.length) {
        const hidden = checker.check(solution.solution, solution.hiddenTypeTests);
        if (!typesPassed(hidden)) fail(`${where}: reference solution fails the hidden type tests`);
      }
      const starterCheck = checker.check(task.starter, task.typeTests ?? []);
      const starterRun = await withTimeout(evaluateCalls({ code: checker.toJavaScript(task.starter), calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }), 8_000, where);
      if (typesPassed(starterCheck) && allPassed(starterRun)) fail(`${where}: the untouched starter already passes`);
      code = checker.toJavaScript(solution.solution);
      starterCode = checker.toJavaScript(task.starter);
    }
    const run = await withTimeout(evaluateCalls({ code, calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }), 8_000, where);
    if (!allPassed(run)) {
      const wrong = run.results.map((r, i) => (r.pass ? null : `${task.tests![i].call} → ${r.error ?? r.actual}`)).filter(Boolean);
      fail(`${where}: reference solution fails visible tests: ${run.codeError ?? wrong.join('; ')}`);
    }
    if (solution.hiddenTests?.length) {
      const hidden = await withTimeout(evaluateCalls({ code, calls: solution.hiddenTests.map((t) => t.call), expectations: solution.hiddenTests.map((t) => t.expected) }), 8_000, where);
      if (!allPassed(hidden)) fail(`${where}: reference solution fails hidden tests: ${hidden.codeError ?? hidden.results.map((r, i) => (r.pass ? null : solution.hiddenTests![i].call)).filter(Boolean).join('; ')}`);
    }
    if (task.track === 'javascript') {
      const starterRun = await withTimeout(evaluateCalls({ code: starterCode, calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }), 8_000, where);
      if (allPassed(starterRun)) fail(`${where}: the untouched starter already passes`);
    }
  }

  /* ── React solutions ────────────────────────────────────────────────── */
  for (const task of CODING_TASKS) {
    if (task.track !== 'react' || task.verify !== 'tests' || !task.suite) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const where = `${task.id}`;
    const run = await withTimeout(runReactSuite({ suite: task.suite, appSource: solution.solution }), 20_000, where);
    if (run.compileError || run.failed > 0) {
      fail(`${where}: reference solution fails its suite: ${run.compileError ?? run.cases.filter((c) => c.status === 'fail').map((c) => `${c.name}: ${c.error}`).join('; ')}`);
    }
    const starter = await withTimeout(runReactSuite({ suite: task.suite, appSource: task.starter }), 20_000, where);
    if (!starter.compileError && starter.failed === 0) fail(`${where}: the untouched starter already passes its suite`);
  }

  /* ── code-ordering puzzles (issue #154) ─────────────────────────────── */
  // Every authored puzzle must belong to a real task, declare what solving it
  // proves, and — the point of the check — assemble into code that passes that
  // task's own tests. A puzzle that drifts away from its task fails here.
  for (const problem of puzzleProblems()) fail(`puzzle: ${problem}`);
  for (const puzzle of allPuzzles()) {
    const where = `puzzle ${puzzle.taskId}`;
    const task = CODING_TASKS.find((one) => one.id === puzzle.taskId);
    if (!task) { fail(`${where}: no such task`); continue; }
    if (task.track === 'system-design') fail(`${where}: design tasks take no arrangement puzzle`);
    if (puzzle.lines.length > MAX_PUZZLE_BLOCKS) fail(`${where}: more than ${MAX_PUZZLE_BLOCKS} blocks`);
    for (const competency of puzzle.competencies) {
      if (!PUZZLE_COMPETENCIES.includes(competency)) fail(`${where}: unknown competency ${competency}`);
    }
    if (!task.tests || task.tests.length === 0) { fail(`${where}: the task has no tests to prove the puzzle against`); continue; }
    for (const [index, accepted] of puzzle.accepted.entries()) {
      const code = assemble(puzzle, accepted);
      const run = await withTimeout(
        evaluateCalls({ code, calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }),
        8_000,
        where,
      );
      if (!allPassed(run)) {
        fail(`${where}: accepted arrangement ${index} does not pass the task's tests: ${run.codeError ?? run.results.map((r, i) => (r.pass ? null : task.tests![i].call)).filter(Boolean).join('; ')}`);
      }
    }
    // A distractor must actually break the solution, or it is not a distractor.
    for (const distractor of puzzle.lines.filter((line) => line.distractor)) {
      const spoiled = assemble(puzzle, [...puzzle.accepted[0].slice(0, -1), distractor.id]);
      const run = await withTimeout(
        evaluateCalls({ code: spoiled, calls: task.tests.map((t) => t.call), expectations: task.tests.map((t) => t.expected) }),
        8_000,
        where,
      );
      if (allPassed(run)) fail(`${where}: distractor ${distractor.id} still passes the task's tests`);
    }
    // Grading is driven by the sealed permutation, not by what the browser sees.
    const identity = <T,>(items: T[]): T[] => items;
    const { playable: shown, permutation } = preparePuzzle(puzzle, identity);
    const idToPosition = new Map(permutation.map((authored, position) => [puzzle.lines[authored].id, `b${position}`]));
    const correct = puzzle.accepted[0].map((id) => idToPosition.get(id)!);
    const graded = gradePuzzle(puzzle, permutation, correct);
    if (!graded.passed) fail(`${where}: the authored arrangement does not grade as passing`);
    if (shown.blocks.length !== puzzle.lines.length) fail(`${where}: the playable puzzle drops blocks`);
    if (JSON.stringify(shown).includes('"distractor"')) fail(`${where}: the playable puzzle names its distractors`);
    if (correct.length > 1) {
      const swapped = [correct[1], correct[0], ...correct.slice(2)];
      if (gradePuzzle(puzzle, permutation, swapped).passed) fail(`${where}: a swapped arrangement grades as passing`);
    }
    const withDistractor = puzzle.lines.find((line) => line.distractor);
    if (withDistractor) {
      const bad = [...correct.slice(0, -1), idToPosition.get(withDistractor.id)!];
      const badGrade = gradePuzzle(puzzle, permutation, bad);
      if (badGrade.passed) fail(`${where}: an arrangement using a distractor grades as passing`);
      if (!badGrade.usedDistractor) fail(`${where}: a used distractor is not reported`);
    }
  }

  /* ── resources and failure advice (issues #155, #156) ───────────────── */
  for (const problem of docRegistryProblems()) fail(`docs: ${problem}`);
  for (const task of CODING_TASKS) {
    if (task.track === 'system-design') continue;
    const resources = resourcesFor(task.focus);
    // Resources are reading material, not the ladder: they exist independently
    // of how many hints were taken, so the only contract is that every link the
    // panel would show is a reviewed one and that nothing repeats.
    const urls = new Set(resources.map((one) => one.url));
    if (urls.size !== resources.length) fail(`${task.id}: duplicate resource link`);
    for (const resource of resources) {
      if (!task.focus.includes(resource.tag)) fail(`${task.id}: resource ${resource.tag} is not a technique of this task`);
    }
  }
  // Authored advice must never quote a hidden fixture or an internal error, and
  // must exist in both languages.
  const hiddenCalls = new Set(
    CODING_TASKS.flatMap((task) => solutionFor(task.id)?.hiddenTests?.map((test) => test.call) ?? []),
  );
  for (const entry of allFailureAdvice()) {
    const where = `advice ${entry.taskId ?? 'category'} ${entry.category}`;
    if (!entry.body.en.trim()) fail(`${where}: missing English text`);
    if (!SKIP_CS && !entry.body.cs.trim()) fail(`${where}: missing Czech text`);
    for (const text of [entry.body.en, entry.body.cs]) {
      for (const call of hiddenCalls) {
        if (call && text.includes(call)) fail(`${where}: quotes the hidden test ${call}`);
      }
      if (/stack trace|at Object\.|node_modules|SyntaxError:/i.test(text)) fail(`${where}: quotes an internal error`);
      if (/\bsolution\b|\břešení\b/i.test(text)) fail(`${where}: mentions the solution`);
    }
  }
  // Every category resolves to advice and to a stage.
  for (const category of FAILURE_CATEGORIES) {
    if (!allFailureAdvice().some((entry) => entry.taskId === null && entry.category === category)) {
      fail(`advice: no fallback authored for ${category}`);
    }
    if (!['compile', 'runtime', 'test'].includes(stageOf(category))) fail(`advice: ${category} has no stage`);
  }
  // The classifier separates compile, runtime and test failures.
  const noVisible = { visible: [], hidden: null, typeErrors: 0, threw: false, allUndefined: false, shapeMismatch: false, mutated: false };
  if (classifyFailure({ ...noVisible, outcome: 'timeout' }) !== 'timeout') fail('advice: a timeout must classify as a timeout');
  if (classifyFailure({ ...noVisible, outcome: 'failed', typeErrors: 2 }) !== 'types') fail('advice: type errors must classify as types');
  if (classifyFailure({ ...noVisible, outcome: 'error', threw: true }) !== 'threw') fail('advice: a thrown error must classify as threw');
  if (classifyFailure({ ...noVisible, outcome: 'failed', visible: [{ pass: true, edge: false }, { pass: false, edge: true }] }) !== 'boundary') {
    fail('advice: an edge-only failure must classify as boundary');
  }
  if (classifyFailure({ ...noVisible, outcome: 'failed', visible: [{ pass: true, edge: false }], hidden: { passed: 1, total: 3 } }) !== 'hidden-only') {
    fail('advice: a hidden-only failure must classify as hidden-only');
  }
  if (classifyFailure({ ...noVisible, outcome: 'failed', allUndefined: true, visible: [{ pass: false, edge: false }] }) !== 'missing-return') {
    fail('advice: an all-undefined failure must classify as missing-return');
  }

  if (failures.length > 0) {
    console.error(`Coding content contract: ${failures.length} problem(s)\n  - ${failures.join('\n  - ')}`);
    process.exitCode = 1;
    return;
  }
  const byTrack = CODING_TRACKS.map((track) => `${track} ${CODING_TASKS.filter((t) => t.track === track).length}`).join(', ');
  console.log(`Coding content contract passed: ${CODING_TASKS.length} tasks (${byTrack}), solutions proven, ${allPuzzles().length} arrangement puzzles proven, ${allFailureAdvice().length} failure hints checked, payloads answer-free${SKIP_CS ? ', Czech parity skipped' : ''}${ALLOW_GAPS ? ', level gaps allowed' : ''}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
