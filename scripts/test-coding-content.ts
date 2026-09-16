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
import { CODING_TASKS, playable } from '../lib/coding/catalog';
import { CODING_SUMMARIES, levelCodingTasks, tasksForLevel } from '../lib/coding/active';
import { solutionFor, solutionIds } from '../lib/coding/solutions';
import { localizedFields, localizedLists } from '../lib/coding/types';
import {
  CODING_TRACKS,
  gardenPathFor,
  isCodingTaskId,
  isCodingTechnique,
  isCodingTier,
} from '../shared/coding-catalog';
import { docsFor } from '../shared/coding-docs';
import { approachCoverage, approachesFor } from '../lib/coding/approaches';
import { formatOf } from '../shared/coding-catalog';
import { runInSandbox } from '../lib/coding/sandbox';
import { puzzleCoverage, puzzleFor } from '../lib/coding/puzzles';
import { isAcceptedOrder, isCompleteOrder, PUZZLE_MAX_LINES } from '../shared/coding-puzzle';
import { evaluateCalls, allPassed } from '../shared/coding-evaluate';
import { createTypeScript, isCheckerLibFile, typesPassed } from '../shared/coding-ts-check';
import { runReactSuite } from '../lib/coding/react-runner';
import { renderCodingIndex } from './build-coding-index';
import { DEBUGGING_COURSE_ID, DEBUGGING_COURSE_STAGES, EVOLVING_CHALLENGES, evolvingResume, evolvingStage, evolvingUnlocked, evolvingTaskTrack, evolvingPassed } from '../shared/evolving';
import { prepareEvolvingDraft } from '../shared/coding-fullstack-support';

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
    assert.ok(project.stages.length >= (project.category === 'fullstack' ? 6 : 5) && project.stages.length <= 15);
    const passed = new Set<string>();
    for (const [index,id] of project.stages.entries()) {
      const task = CODING_TASKS.find(task => task.id === id);
      assert.ok(task, `${id}: authored task exists`);
      assert.equal(task.track, evolvingTaskTrack(id));
      assert.ok(task.references?.length && task.references.every(ref=>ref.title.en && ref.title.cs && ref.url.startsWith('https://')), 'each stage has localized references');
      assert.equal(evolvingResume(project, passed), id, 'resume is the first unfinished stage');
      assert.equal(evolvingUnlocked(id, passed), true, 'earlier verified passes unlock the next stage');
      if (index > 0) assert.equal(evolvingUnlocked(id, new Set()), false, 'deep links cannot skip prerequisites');
      assert.ok(!tasksForLevel(task.topic, task.level).some(item => item.id === id), 'optional projects never change Learn quotas');
      // A standalone challenge gives each stage its own starter and tests, so
      // nothing accumulates and nothing from an earlier stage is required.
      if (index > 0 && !project.standalone) {
        const prior = CODING_TASKS.find(task => task.id === project.stages[index-1])!;
        assert.deepEqual(task.previousRequirements?.[index-1], prior.prompt, 'earlier requirements remain available');
        // Newest checks first, earlier ones after them: the prior stage's list
        // is the tail of this one, and the head is what this stage introduced.
        if (task.tests) assert.deepEqual(prior.tests!.length ? task.tests.slice(-prior.tests!.length) : [], prior.tests, 'earlier runtime checks remain, after the new ones');
        if (task.suite && prior.suite) assert.ok(task.suite.startsWith(prior.suite), 'earlier UI checks remain');
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
    const serverTests = [...task.tests, ...solution.hiddenTests ?? []];
    const sandbox = await runInSandbox({code, calls:serverTests.map(test=>test.call), expectations:serverTests.map(test=>test.expected)});
    if (!allPassed(sandbox)) fail(`${where}: reference fails the production QuickJS grader: ${JSON.stringify(sandbox).slice(0,500)}`);
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
  }

  // ── the debugging format (#163) ────────────────────────────────────────
  // A debugging task must actually start from broken code: its starter has to
  // fail its own visible tests, or the format is a label rather than an
  // exercise. Each one also declares the misconception it is built around.
  const debugTasks = CODING_TASKS.filter((task) => formatOf(task) === 'debug');
  assert.ok(debugTasks.length >= 4, 'the debugging format needs an authored set, not one example');
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

  // ── the shared console ─────────────────────────────────────────────────
  // Both runtimes build their console from one source (shared/coding-console).
  // A fixture that calls every method must print the same lines through the
  // worker's evaluator and through the production QuickJS grader, minus the
  // trace frames, which each engine names from its own stack. The debugging
  // course relies on every one of these calls, so this is the proof that the
  // grader allows them.
  {
    const fixture = `
function applyDiscount(price, percent) { console.trace('applyDiscount', price, percent); return price - price * percent / 100; }
function checkout(cart) { return cart.map((item) => applyDiscount(item.price, item.percent)); }
function probe() {
  console.log('plain', 1, 'two', { three: 3 }, [4], null, undefined, true);
  console.info('info'); console.warn('warn'); console.error('error'); console.debug('debug');
  console.table([{ sku: 'latte', price: 40 }, { sku: 'tea', price: 30, stock: 2 }]);
  console.table(['a', 'b']);
  console.table({ x: { n: 1 }, y: 2 });
  console.table(5);
  console.assert(1 === 1, 'never shown');
  console.assert(false, 'shown', { why: 'because' });
  console.assert(false);
  console.group('outer'); console.log('in outer'); console.group(); console.log('in inner'); console.groupEnd(); console.groupEnd(); console.groupEnd(); console.log('back out');
  console.count(); console.count('sku'); console.count('sku'); console.countReset('sku'); console.count('sku');
  console.dir({ nested: { deep: [1, 2] } });
  console.dir('text');
  console.time('t'); console.timeEnd('t'); console.timeEnd('never started');
  checkout([{ price: 100, percent: 10 }]);
  return 'ok';
}`;
    const browserRun = await evaluateCalls({ code: fixture, calls: ['probe()'], expectations: ['ok'] });
    const sandboxRun = await runInSandbox({ code: fixture, calls: ['probe()'], expectations: ['ok'] });
    assert.ok(allPassed(browserRun), `the console fixture must run in the worker evaluator: ${browserRun.codeError}`);
    assert.ok(allPassed(sandboxRun), `the console fixture must run in the QuickJS grader: ${sandboxRun.codeError}`);
    const comparable = (lines: string[]) => lines.filter((line) => !/^\s+at /.test(line) && !/^t: [\d.]+ms$/.test(line));
    assert.deepEqual(comparable(sandboxRun.logs), comparable(browserRun.logs), 'the QuickJS console prints the same lines as the worker console');
    for (const run of [browserRun, sandboxRun]) {
      assert.ok(run.logs.includes('Trace: applyDiscount 100 10'), 'trace prints its arguments');
      assert.ok(run.logs.some((line) => /^\s+at applyDiscount$/.test(line)) && run.logs.some((line) => /^\s+at checkout$/.test(line)), `trace names the calling functions: ${JSON.stringify(run.logs)}`);
      assert.ok(run.logs.includes('(index) | sku   | price | stock'), 'table lays out a header from the union of columns');
      assert.ok(run.logs.includes('Assertion failed: shown {"why":"because"}') && run.logs.includes('Assertion failed'), 'assert prints only when its condition is falsy');
      assert.ok(run.logs.includes('  in outer') && run.logs.includes('    in inner') && run.logs.includes('back out'), 'groups indent and unwind');
      assert.ok(run.logs.includes('default: 1') && run.logs.includes('sku: 2') && run.logs.at(-1) !== undefined, 'count and countReset keep separate labels');
      assert.ok(run.logs.some((line) => /^t: [\d.]+ms$/.test(line)), 'time and timeEnd print a duration');
    }
  }

  // ── the debugging course ───────────────────────────────────────────────
  // Fifteen standalone stages, each a repair task with its own starter, its
  // own tests and a reference page. Every stage is unlocked in order like any
  // other evolving challenge and carries no earlier requirements, because it
  // carries no earlier code. The last stage is the quiet one.
  {
    const course = EVOLVING_CHALLENGES.find((project) => project.id === DEBUGGING_COURSE_ID);
    assert.ok(course && course.standalone === true, 'the debugging course is a standalone challenge');
    assert.equal(course.stages.length, DEBUGGING_COURSE_STAGES, 'the debugging course has fifteen stages');
    const stages = course.stages.map((id) => CODING_TASKS.find((task) => task.id === id)!);
    const starters = new Set(stages.map((stage) => stage.starter));
    assert.equal(starters.size, stages.length, 'every stage of the course starts from its own program');
    for (const stage of stages) {
      assert.equal(formatOf(stage), 'debug', `${stage.id}: every course stage is a repair task`);
      assert.equal(stage.previousRequirements, undefined, `${stage.id}: a standalone stage lists no earlier requirements`);
      assert.ok(stage.hints.en.length >= 2 && stage.hints.cs.length >= 2, `${stage.id}: a course stage teaches with at least two hints`);
      assert.ok(solutionFor(stage.id)?.hiddenTests?.length, `${stage.id}: a course stage has hidden checks`);
    }
    assert.equal(stages.at(-1)!.quiet, true, 'the course ends on the stage that removes the logging');
    assert.equal(prepareEvolvingDraft('code', course, 1), null, 'a standalone challenge never seeds the next stage from the previous draft');
  }

  // ── quiet tasks ───────────────────────────────────────────────────────────
  // A task marked quiet is graded on an empty console as well as on its tests.
  // Its reference solution must therefore print nothing, and its starter must
  // print something, or the rule would never be exercised.
  assert.ok(CODING_TASKS.some((one) => one.quiet), 'at least one task exercises the quiet rule');
  for (const task of CODING_TASKS.filter((one) => one.quiet)) {
    const solution = solutionFor(task.id);
    assert.ok(solution && task.tests, `${task.id}: a quiet task needs tests and a reference solution`);
    const calls = task.tests!.map((one) => one.call);
    const expectations = task.tests!.map((one) => one.expected);
    const clean = await runInSandbox({ code: solution!.solution, calls, expectations });
    assert.ok(allPassed(clean) && clean.logs.length === 0, `${task.id}: the reference solution must pass with an empty console, got ${JSON.stringify(clean.logs)}`);
    const starterRun = await runInSandbox({ code: task.starter, calls, expectations });
    assert.ok(starterRun.logs.length > 0, `${task.id}: the starter must leave output for the learner to remove`);
  }

  console.log(`Coding content contract passed: ${CODING_TASKS.length} tasks (${byTrack}), solutions proven, payloads answer-free${SKIP_CS ? ', Czech parity skipped' : ''}${ALLOW_GAPS ? ', level gaps allowed' : ''}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
