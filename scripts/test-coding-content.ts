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
import { runChecks, runInSandbox } from '../lib/coding/sandbox';
import { buildSandboxWorker } from './build-sandbox-worker.mjs';
import { presentPuzzle, puzzleCoverage, puzzleFor, resolvePuzzleOrder, type AuthoredPuzzle } from '../lib/coding/puzzles';
import { isAcceptedOrder, isCompleteOrder, PUZZLE_MAX_LINES, type PuzzleLine } from '../shared/coding-puzzle';
import { evaluateCalls, allPassed, deepEqual } from '../shared/coding-evaluate';
import { createTypeScript, isCheckerLibFile, typesPassed } from '../shared/coding-ts-check';
import { prepareReactRuntime, runReactSuite } from '../lib/coding/react-runner';
import { lockDownRealm } from '../lib/coding/realm-lockdown';
import { HIDDEN_CASE_PREFIX, splitHiddenCases, suiteCaseCount, withHiddenCases } from '../lib/coding/react-hidden';
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

// The cases a React suite declares, counted from its source the way the
// server counts them. The React proofs below check the count against the
// cases each run registered.
const hiddenCaseCount = suiteCaseCount;

// The hosts a hint ladder may end on: official documentation, never a blog.
const OFFICIAL_DOCS = new Set(['developer.mozilla.org', 'www.typescriptlang.org', 'react.dev']);

/* Two cheats the hidden checks must catch, written as solutions. */
type TypeScriptApi = typeof import('typescript');
type Check = { call: string; expected: unknown };

/** JavaScript source that evaluates to a fresh copy of an expected value. */
const literal = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${literal(item)}`).join(', ')}}`;
};

/** `name(argument, …)` with a plain name as the callee, or null. */
const plainCall = (ts: TypeScriptApi, call: string): { name: string; args: string } | null => {
  const file = ts.createSourceFile('call.ts', `(${call.trim().replace(/;+$/, '')}\n)`, ts.ScriptTarget.Latest, true);
  const [statement] = file.statements;
  if (file.statements.length !== 1 || !ts.isExpressionStatement(statement)) return null;
  let expression = statement.expression;
  while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
  return { name: expression.expression.text, args: expression.arguments.map((arg) => arg.getText(file)).join(', ') };
};

/** A learner who copies the page's examples into a table: every visible
 * call answered with its visible answer, compared by value and key order
 * the way a JSON.stringify key would, and undefined for anything else. Null
 * when a visible check is not a plain call a table could answer. */
const lookupTable = (ts: TypeScriptApi, visible: readonly Check[]): string | null => {
  const rows = visible.map((test) => ({ call: plainCall(ts, test.call), expected: test.expected }));
  if (rows.some((row) => !row.call)) return null;
  const names = [...new Set(rows.map((row) => row.call!.name))];
  return [
    'const __same = (x, y) => { if (Object.is(x, y)) return true; if (typeof x === "function" || typeof y === "function") return typeof x === typeof y && String(x) === String(y); if (!x || !y || typeof x !== "object" || typeof y !== "object" || Array.isArray(x) !== Array.isArray(y)) return false; const kx = Object.keys(x), ky = Object.keys(y); return kx.length === ky.length && kx.every((k, i) => k === ky[i] && __same(x[k], y[k])); };',
    `const __table = {${names.map((name) => `${JSON.stringify(name)}: [${rows.filter((row) => row.call!.name === name).map((row) => `[() => [${row.call!.args}], () => (${literal(row.expected)})]`).join(', ')}]`).join(', ')}};`,
    ...names.map((name) => `function ${name}(...args) { for (const [input, output] of __table[${JSON.stringify(name)}]) if (__same(input(), args)) return output(); return undefined; }`),
  ].join('\n');
};

/** The names a solution declares at its top level. */
const topLevelNames = (ts: TypeScriptApi, source: string): string[] => {
  const names = new Set<string>();
  for (const statement of ts.createSourceFile('solution.ts', source, ts.ScriptTarget.Latest, true).statements) {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) names.add(statement.name.text);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
    }
  }
  return [...names];
};

/** Every arrangement of a puzzle's lines whose code passes `checks`, found
 * without trying them all. The function's own first and last lines stay
 * first and last; any body line without a brace may also stand outside the
 * function, before or after it (a loop or a branch out there cannot see the
 * parameters). Arrangements grow line by line, and whenever the lines placed
 * so far close every block they open, they run on their own as the whole
 * body: a check they already throw on or answer wrongly fails every way of
 * finishing them, so that branch stops there. */
const passingArrangements = (puzzle: AuthoredPuzzle, checks: readonly Check[]): string[][] => {
  const depthOf = (code: string) => {
    const bare = code.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '');
    return (bare.match(/\{/g)?.length ?? 0) - (bare.match(/\}/g)?.length ?? 0);
  };
  const header = puzzle.lines[0];
  const footer = puzzle.lines[puzzle.lines.length - 1];
  const body = puzzle.lines.slice(1, -1);
  const name = /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(.*\{\s*$/.exec(header.code)?.[1];
  assert.ok(name && footer.code.trim() === '}', 'a puzzle is one function: its first line opens it and its last line closes it');
  // A body cut short reads as the start of the full one only while nothing
  // later in it is hoisted.
  assert.ok(body.every((line) => !/\b(var|function)\b/.test(line.code)), 'a puzzle body declares nothing with var or function');
  // Every loop gets a step budget, so an arrangement that never leaves one fails instead of hanging.
  const guard = (code: string) => (/^\s*(while|for|do)\b.*\{\s*$/.test(code) ? `${code} __step();` : code);
  const callers = checks.map((check) => new Function(name, `"use strict"; return (${check.call});`) as (fn: unknown) => unknown);
  const END = Symbol('end');
  // `open`: the body stops early, and falling off its end returns END.
  const run = (top: PuzzleLine[], placed: PuzzleLine[], open: boolean): 'pass' | 'fail' | 'open' => {
    const code = [...top, header, ...placed].map((line) => guard(line.code)).concat(open ? ['return __end;'] : [], footer.code).join('\n');
    let fn: unknown;
    let reset: () => void;
    try {
      [fn, reset] = new Function('__end', `"use strict"; let __steps = 0; const __step = () => { if (++__steps > 10000) throw new Error('steps'); };\n${code}\nreturn [${name}, () => { __steps = 0; }];`)(END);
    } catch { return 'fail'; }
    let undecided = false;
    for (const [index, call] of callers.entries()) {
      reset();
      let value: unknown;
      try { value = call(fn); } catch { return 'fail'; }
      if (value === END) undecided = true;
      else if (!deepEqual(value, checks[index].expected)) return 'fail';
    }
    return undecided ? 'open' : 'pass';
  };
  const permutations = <T>(items: T[]): T[][] => (items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])));
  const flat = body.filter((line) => !/[{}]/.test(line.code));
  const found: string[][] = [];
  for (let mask = 0; mask < 1 << flat.length; mask++) {
    const outside = flat.filter((_, i) => mask & (1 << i));
    const inside = body.filter((line) => !outside.includes(line));
    for (const top of permutations(outside)) {
      const walk = (placed: PuzzleLine[], rest: PuzzleLine[], depth: number): void => {
        if (rest.length === 0) {
          // Function declarations hoist, so the outside lines run the same wherever they split around it.
          if (depth === 1 && run(top, placed, false) === 'pass') {
            for (let split = 0; split <= top.length; split++) found.push([...top.slice(0, split), header, ...placed, footer, ...top.slice(split)].map((line) => line.id));
          }
          return;
        }
        if (placed.length > 0 && depth === 1 && run(top, placed, true) === 'fail') return;
        for (const [i, line] of rest.entries()) {
          const next = depth + depthOf(line.code);
          if (next >= 1) walk([...placed, line], [...rest.slice(0, i), ...rest.slice(i + 1)], next);
        }
      };
      walk([], inside, 1);
    }
  }
  return found;
};

// Every string a suite mentions: quoted literals (minus module names and ARIA
// role names) and the text of simple regular expressions.
const ARIA_ROLE = /^(button|textbox|checkbox|heading|listitem|list|combobox|option|alert|status|link|img|dialog|form|region|navigation|searchbox|spinbutton|radio|tab|tabpanel|table|row|cell|article|main|group|progressbar|separator|switch|menu|menuitem|tooltip|banner|contentinfo|complementary)$/;
const suiteStrings = (suite: string): string[] => {
  const found = new Set<string>();
  for (const match of suite.matchAll(/(['"`])((?:(?!\1)[^\\\n$]|\\.){1,80})\1/g)) {
    if (/^\.\/|^@testing|^react/.test(match[2]) || ARIA_ROLE.test(match[2])) continue;
    found.add(match[2].replace(/\\(.)/g, '$1'));
  }
  for (const match of suite.matchAll(/\/((?:[A-Za-z0-9 ,.'!?:-]|\\s){2,60})\/[gimsuy]*/g)) found.add(match[1].replace(/\\s/g, ' '));
  return [...found];
};

// Components with no state, effect, request or timer: one that renders
// nothing, and static pages that print every string the suite mentions as
// paragraphs, buttons or list items. A suite one of them passes checks that
// some text is on the page, not that the component does what the task asks.
const staticPages = (suite: string): [string, string][] => {
  const text = suiteStrings(suite).map((one) => `{${JSON.stringify(one)}}`);
  return [
    ['a component that renders nothing', 'const App = () => null;'],
    ['one static paragraph of the suite\'s strings', `const App = () => <main><p>${text.join(' ')}</p><button>ok</button><input /></main>;`],
    ['one static paragraph per suite string', `const App = () => <main>${text.map((one) => `<p>${one}</p>`).join('')}<button>ok</button><input /></main>;`],
    ['one static button per suite string', `const App = () => <main>${text.map((one) => `<button>${one}</button>`).join('')}<input /></main>;`],
    ['one static list item per suite string', `const App = () => <main><ul>${text.map((one) => `<li>${one}</li>`).join('')}</ul><button>ok</button><input /></main>;`],
  ];
};

// The Testing Library instance the React runner loaded (the runner loads it
// on its first suite), for its waitFor and findBy settings.
interface AsyncWaitConfig {
  getConfig(): { asyncUtilTimeout: number };
  configure(config: { asyncUtilTimeout: number }): void;
}
const testingLibrary = async (): Promise<AsyncWaitConfig> => {
  const loaded = await import('@testing-library/react');
  return ((loaded as { default?: AsyncWaitConfig }).default ?? loaded) as AsyncWaitConfig;
};

async function main() {
  // The solutions are proven on the grader's worker thread, built fresh from
  // the sources under test, as the deployment runs it.
  await buildSandboxWorker();
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
  // pass — and all three have to pass the same visible and hidden checks. An
  // evolving project's checkpoint (`…-start`) carries its reference alone.
  const variants = (solution: NonNullable<ReturnType<typeof solutionFor>>, where: string): [string, string][] => {
    const out: [string, string][] = [['reference', solution.solution]];
    const boards = !where.endsWith('-start');
    if (typeof solution.junior === 'string' && solution.junior.trim()) out.push(['junior', solution.junior]);
    else if (boards) fail(`${where}: missing the junior solution`);
    if (typeof solution.senior === 'string' && solution.senior.trim()) out.push(['senior', solution.senior]);
    else if (boards) fail(`${where}: missing the senior solution`);
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
      // Code that ends inside an unterminated template literal must not pull
      // the type tests into it: the check reports the code instead.
      if (typesPassed(checker.check(`${solution.solution}\ntype __Unterminated = \``, task.typeTests ?? []))) fail(`${where}: an unterminated template literal at the end of the code passes the type tests`);
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
      // The production grader: the hidden checks in a fresh program and, here,
      // in reverse order, so no solution leans on the order they run in or on
      // state the visible calls left behind.
      const server = await runChecks({ code, visible: task.tests, hidden: solution.hiddenTests ?? [], shuffle: (list) => [...list].reverse() });
      if (!allPassed(server.visible) || (server.hidden && !allPassed(server.hidden))) fail(`${label}: solution fails the production QuickJS grader: ${JSON.stringify(server).slice(0,500)}`);
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

  /* ── hidden checks that catch the cheap passes ──────────────────────── */
  // The checks a learner can see are examples; the hidden ones are what make
  // a pass mean the task was done. Every standalone task and every milestone
  // carries hidden checks (a checkpoint is graded on its visible contract
  // alone, by design), and they have to reject two solutions that do not do
  // the task: a table of the visible answers, and a function that returns
  // one constant. A skeleton hint rung must not already be a passing answer.
  const ts = nodeRequire('typescript') as TypeScriptApi;
  const cheatsStarted = Date.now();
  let cheatTasks = 0;
  let tables = 0;
  for (const task of CODING_TASKS) {
    if (task.verify !== 'tests' || task.track === 'react' || !task.tests || task.id.endsWith('-start')) continue;
    if (!ONLY.test(task.id)) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const where = `${task.id}`;
    const visible = task.tests;
    const hidden = solution.hiddenTests ?? [];
    if (hidden.length === 0) { fail(`${where}: needs hidden checks beside the visible ones`); continue; }
    cheatTasks += 1;
    const every = [...visible, ...hidden];
    // None of these is a real answer, so a short deadline is enough: running
    // out of time counts as failing, never as passing, and a skeleton whose
    // loop has no condition yet would otherwise spin for the full deadline.
    const passes = async (code: string, checks: readonly Check[] = every, deadlineMs = 1_000): Promise<boolean> =>
      allPassed(await runInSandbox({ code, calls: checks.map((one) => one.call), expectations: checks.map((one) => one.expected), shownCalls: visible.length, deadlineMs }));
    // A table only proves something when it really answers every visible call.
    const table = lookupTable(ts, visible);
    if (table && await passes(table, visible)) {
      tables += 1;
      if (await passes(table)) fail(`${where}: a table of the visible answers passes the hidden checks too`);
    }
    const names = topLevelNames(ts, solution.solution);
    const callees = every.map((one) => plainCall(ts, one.call)?.name);
    const constants = new Map(every.map((one) => [literal(one.expected), one.expected]));
    for (const [shown, value] of constants) {
      // A plain call to a replaced function returns the constant itself, so a
      // single such check that expects something else already sinks it; only
      // the constants no plain check rules out need a run.
      if (every.some((one, index) => names.includes(callees[index] ?? '') && !deepEqual(value, one.expected))) continue;
      if (await passes(names.map((name) => `function ${name}() { return (${literal(value)}); }`).join('\n'))) fail(`${where}: a solution that always returns ${shown.slice(0, 60)} passes every check`);
    }
    if (task.skeleton) {
      const skeleton = task.skeleton;
      const code = task.track === 'typescript' ? checker.toJavaScript(skeleton) : skeleton;
      const typed = () => task.track !== 'typescript' || (typesPassed(checker.check(skeleton, task.typeTests ?? [])) && typesPassed(checker.check(skeleton, solution.hiddenTypeTests ?? [])));
      if (await passes(code, every, 250) && typed()) fail(`${where}: the skeleton hint rung already passes every check`);
    }
  }
  console.log(`Hidden checks: ${cheatTasks} tasks reject a constant answer, ${tables} of them a table of the visible answers too (${((Date.now() - cheatsStarted) / 1000).toFixed(1)} s).`);

  await stagesPromisesAndSignatures({ fail, checker, ts, byId });

  /* ── the last hint rung ─────────────────────────────────────────────── */
  // The ladder ends on the task's first reference, or on the documentation
  // page of its first focus tag: official documentation either way.
  for (const task of CODING_TASKS) {
    const url = task.references?.[0]?.url ?? docsFor(task.focus).url;
    if (!OFFICIAL_DOCS.has(new URL(url).host)) fail(`${task.id}: the hint ladder ends on ${url}, not on official documentation`);
  }

  /* ── React solutions ────────────────────────────────────────────────── */
  // The React guest freezes its realm's built-ins after loading jsdom, React
  // and Testing Library and before any learner code runs
  // (lib/coding/realm-lockdown.ts). The solutions and probes run the same way
  // here, so a suite or a library path that needs a writable built-in fails
  // this test instead of every Submit.
  await prepareReactRuntime();
  lockDownRealm();
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
      // The server refuses a run whose case count differs from the suite's.
      if (run.cases.length !== suiteCaseCount(suite)) fail(`${where} (${name}): the suite declares ${suiteCaseCount(suite)} case(s) and ran ${run.cases.length}`);
    }
    const starter = await withTimeout(runReactSuite({ suite: task.suite, appSource: task.starter }), 20_000, where);
    if (!starter.compileError && starter.failed === 0) fail(`${where}: the untouched starter already passes its suite`);
    // A learning path runs the visible suite alone, and the server counts it too.
    if (!starter.compileError && starter.cases.length !== suiteCaseCount(task.suite)) fail(`${where}: the visible suite declares ${suiteCaseCount(task.suite)} case(s) and ran ${starter.cases.length}`);
    // The server's suite (visible and hidden cases) has to check behaviour:
    // no page without state, effects, requests or timers may pass it. A
    // static page never changes after its first render, so what a waitFor or
    // findBy waits for cannot arrive later: the probes run with Testing
    // Library's default wait cut short, which only makes them fail sooner.
    // Every case stops at the runner's own time limit, so a probe run always
    // ends; it gets no outer timer, which would keep the process alive long
    // after the last probe.
    const testing = await testingLibrary();
    const fullWait = testing.getConfig().asyncUtilTimeout;
    testing.configure({ asyncUtilTimeout: 150 });
    try {
      for (const [page, source] of staticPages(suite)) {
        const run = await runReactSuite({ suite, appSource: source });
        if (run.compileError) fail(`${where}: the probe "${page}" did not run: ${run.compileError}`);
        else if (run.failed === 0 && run.total > 0) fail(`${where}: ${page} passes the suite, so it checks text instead of behaviour`);
      }
    } finally {
      testing.configure({ asyncUtilTimeout: fullWait });
    }
  }

  /* ── React suites inside the grader's time limit ────────────────────── */
  // The isolated grader stops a React run after 10 s, node start-up and the
  // page runtime included (lib/coding/react-isolated.ts), and a run it stops
  // reports no case at all: the learner reads a timeout instead of the checks
  // that failed. So a whole suite, visible and hidden cases together, has to
  // stay well inside that for the pages learners submit on the way to a pass:
  // one that renders nothing, the untouched starter, and for a task with an
  // API one that asks for its data and shows none of it. These run with
  // Testing Library's own wait, not the shortened wait of the probes above,
  // and add up the time the cases take.
  const REACT_CASE_BUDGET_MS = 6_000;
  for (const task of CODING_TASKS) {
    if (task.track !== 'react' || task.verify !== 'tests' || !task.suite || !ONLY.test(task.id)) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const suite = withHiddenCases(task.suite, solution.hiddenSuite);
    const url = task.api?.url;
    const pages: [string, string][] = [
      ['a page that renders nothing', 'const App = () => null;'],
      ['the untouched starter', task.starter],
    ];
    if (url) pages.push(['a page that asks for its data and shows none of it', `import React, { useEffect } from 'react';\nexport default function App() {\n  useEffect(() => { fetch(${JSON.stringify(url)}).catch(() => {}); }, []);\n  return null;\n}\n`]);
    for (const [page, source] of pages) {
      const run = await runReactSuite({ suite, appSource: source });
      const spent = run.cases.reduce((sum, one) => sum + one.durationMs, 0);
      if (spent > REACT_CASE_BUDGET_MS) fail(`${task.id}: ${page} spends ${spent} ms in the suite's cases; the grader stops a run at 10 s with start-up, so keep it under ${REACT_CASE_BUDGET_MS} ms`);
    }
  }

  /* ── React forms cancel their submit ────────────────────────────────── */
  // In the preview a form the component lets submit reloads the frame and
  // loses what it showed, so the runner fails the case
  // (watchFormSubmits in shared/coding-react-support.ts). Every task whose
  // reference handles a submit proves that its checks submit the form: the
  // reference with each preventDefault() call taken out fails, and says why.
  const { FORM_SUBMIT_NOT_PREVENTED } = await import('../shared/coding-react-support');
  for (const task of CODING_TASKS) {
    if (task.track !== 'react' || task.verify !== 'tests' || !task.suite || !ONLY.test(task.id)) continue;
    const solution = solutionFor(task.id);
    if (!solution || !solution.solution.includes('onSubmit')) continue;
    const careless = solution.solution.replace(/[\w$]+\??\.preventDefault\(\)/g, 'void 0');
    if (careless === solution.solution) {
      fail(`${task.id}: the reference handles a submit without preventDefault()`);
      continue;
    }
    const run = await runReactSuite({ suite: withHiddenCases(task.suite, solution.hiddenSuite), appSource: careless });
    if (run.compileError) fail(`${task.id}: the reference without preventDefault() did not run: ${run.compileError}`);
    else if (!run.cases.some((one) => one.error === FORM_SUBMIT_NOT_PREVENTED)) fail(`${task.id}: the reference without preventDefault() trips no check, so no check submits its form`);
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
  const puzzlesStarted = Date.now();
  let puzzleOrders = 0;
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
    // Every accepted order is a working solution: put together, it passes
    // the task's own visible and hidden checks. js-word-count's puzzle was a
    // word-frequency Map that failed all of them.
    const checks = [...(task!.tests ?? []), ...(solutionFor(id)?.hiddenTests ?? [])];
    for (const order of puzzle.accepted) {
      const code = order.map((lineId) => puzzle.lines.find((line) => line.id === lineId)!.code).join('\n');
      const run = await runInSandbox({ code, calls: checks.map((one) => one.call), expectations: checks.map((one) => one.expected) });
      assert.ok(allPassed(run), `${id}: the accepted order ${order.join('')} fails the task's checks: ${run.codeError ?? JSON.stringify(run.results.filter((one) => one.pass !== true))}`);
    }
    // ...and every order that passes them is accepted: a learner who arranged
    // working code is not told it is wrong. js-largest-number accepted one of
    // the six that pass. The enumeration must also find each accepted order,
    // or it no longer covers the arrangements a puzzle allows.
    const passing = passingArrangements(puzzle, checks).map((order) => order.join(''));
    const acceptedOrders = new Set(puzzle.accepted.map((order) => order.join('')));
    for (const order of passing) assert.ok(acceptedOrders.has(order), `${id}: the order ${order} passes the task's checks and is not accepted`);
    for (const order of acceptedOrders) assert.ok(passing.includes(order), `${id}: the enumeration does not reach the accepted order ${order}`);
    puzzleOrders += passing.length;
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
  console.log(`Puzzles: ${puzzleIds.length} accept exactly the ${puzzleOrders} arrangements that pass their checks (${((Date.now() - puzzlesStarted) / 1000).toFixed(1)} s).`);

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

/* ── staged levels, new-array promises and typed parameters ─────────── */
// Three ways to pass a task without doing what its statement asks.
//  1. A staged family (an evolving project, a short path, a FullStack app)
//     shows the reference, junior and senior boards once a level is passed.
//     None of them may pass the next level or its checkpoint as they stand,
//     or pasting one back earns that level for nothing. React levels prove
//     the reference only, because their suites take far longer to run.
//  2. A statement that promises a new array is held to it: the reference
//     changed to write its result into the array it was given, and hand that
//     same array back, has to fail a check.
//  3. A TypeScript signature is held by the type tests: the reference with
//     every parameter typed `any` has to fail one. A checkpoint is graded on
//     its smaller contract alone, so only the milestones are held to this.
type ContentTask = (typeof CODING_TASKS)[number];

/** How many parameters of the top-level functions are typed as something
 * other than `unknown` or `any`: loosening those shows at the call site. */
const typedParameterCount = (ts: TypeScriptApi, source: string): number => {
  let count = 0;
  const typed = (fn: import('typescript').SignatureDeclarationBase) => {
    for (const parameter of fn.parameters) {
      const kind = parameter.type?.kind;
      if (kind !== undefined && kind !== ts.SyntaxKind.UnknownKeyword && kind !== ts.SyntaxKind.AnyKeyword) count += 1;
    }
  };
  for (const statement of ts.createSourceFile('solution.ts', source, ts.ScriptTarget.Latest, true).statements) {
    if (ts.isFunctionDeclaration(statement)) typed(statement);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const value = declaration.initializer;
        if (value && (ts.isArrowFunction(value) || ts.isFunctionExpression(value))) typed(value);
      }
    }
  }
  return count;
};

/** The solution with every function parameter typed `any`, callbacks too so
 * the loosened code still compiles. Type parameters and return types stay,
 * and so does every type written inside an annotation. */
const everyParameterAny = (ts: TypeScriptApi, source: string): string => {
  const file = ts.createSourceFile('solution.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const any = (rest: boolean) => {
    const one = ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    return rest ? ts.factory.createArrayTypeNode(one) : one;
  };
  const loosen = (parameters: import('typescript').NodeArray<import('typescript').ParameterDeclaration>) => ts.factory.createNodeArray(parameters.map((one) =>
    ts.factory.updateParameterDeclaration(one, one.modifiers, one.dotDotDotToken, one.name, one.questionToken, any(Boolean(one.dotDotDotToken)), one.initializer)));
  const transformer: import('typescript').TransformerFactory<import('typescript').SourceFile> = (context) => {
    const visit = (node: import('typescript').Node): import('typescript').Node => {
      // A function type inside an annotation is a type, not a function.
      if (ts.isTypeNode(node)) return node;
      const next = ts.visitEachChild(node, visit, context);
      if (ts.isArrowFunction(next)) return ts.factory.updateArrowFunction(next, next.modifiers, next.typeParameters, loosen(next.parameters), next.type, next.equalsGreaterThanToken, next.body);
      if (ts.isFunctionExpression(next)) return ts.factory.updateFunctionExpression(next, next.modifiers, next.asteriskToken, next.name, next.typeParameters, loosen(next.parameters), next.type, next.body);
      if (ts.isFunctionDeclaration(next)) return ts.factory.updateFunctionDeclaration(next, next.modifiers, next.asteriskToken, next.name, next.typeParameters, loosen(next.parameters), next.type, next.body);
      if (ts.isMethodDeclaration(next)) return ts.factory.updateMethodDeclaration(next, next.modifiers, next.asteriskToken, next.name, next.questionToken, next.typeParameters, loosen(next.parameters), next.type, next.body);
      return next;
    };
    return (sourceFile) => ts.visitNode(sourceFile, visit) as import('typescript').SourceFile;
  };
  const result = ts.transform(file, [transformer]);
  try {
    return ts.createPrinter().printFile(result.transformed[0]);
  } finally {
    result.dispose();
  }
};

/** Statements that promise the result is a new array. */
const NEW_ARRAY = /\bnew (?:array|list)\b/i;

/** The solution changed to work in place: every top-level function that a
 * check calls with an array literal first writes its result into that array
 * and hands the same array back, so the values still match. As a `probe` it
 * throws there instead, which shows whether any check reaches the rewrite; as
 * a `control` it changes nothing, which shows the wrapping itself is sound.
 * Null when no check passes a top-level function an array literal first. */
const inPlaceVariant = (ts: TypeScriptApi, js: string, checks: readonly Check[], mode: 'write' | 'probe' | 'control'): string | null => {
  const names = topLevelNames(ts, js);
  const wrapped = new Set<string>();
  for (const check of checks) {
    const visit = (node: import('typescript').Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && names.includes(node.expression.text) && node.arguments[0] && ts.isArrayLiteralExpression(node.arguments[0])) wrapped.add(node.expression.text);
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile('call.ts', `(${check.call.trim().replace(/;+$/, '')}\n)`, ts.ScriptTarget.Latest, true));
  }
  if (wrapped.size === 0) return null;
  const write = { write: 'args[0].length = 0; args[0].push(...out); return args[0];', probe: 'throw new Error("in place");', control: '' }[mode];
  return [
    `const __original = (() => {\n${js}\n;return { ${names.join(', ')} };\n})();`,
    ...names.map((name) => wrapped.has(name)
      ? `function ${name}(...args) { const out = __original.${name}(...args); if (Array.isArray(args[0]) && Array.isArray(out) && out !== args[0]) { ${write} } return out; }`
      : `const ${name} = __original.${name};`),
  ].join('\n');
};

async function stagesPromisesAndSignatures({ fail, checker, ts, byId }: {
  fail: (message: string) => void;
  checker: ReturnType<typeof createTypeScript>;
  ts: TypeScriptApi;
  byId: ReadonlyMap<string, ContentTask>;
}): Promise<void> {
  const started = Date.now();
  // The production grader's verdict: the visible checks and, in a fresh
  // program, the hidden ones.
  const passesChecks = async (task: ContentTask, code: string): Promise<boolean> => {
    const run = await withTimeout(runChecks({ code, visible: task.tests ?? [], hidden: solutionFor(task.id)?.hiddenTests ?? [], shuffle: (list) => list }), 8_000, task.id);
    return allPassed(run.visible) && (!run.hidden || allPassed(run.hidden));
  };
  // The same with the type tests (visible and hidden) first for TypeScript,
  // and the suite with its hidden cases for React.
  const passesTask = async (task: ContentTask, source: string): Promise<boolean> => {
    const solution = solutionFor(task.id);
    if (task.track === 'react') {
      const run = await withTimeout(runReactSuite({ suite: withHiddenCases(task.suite!, solution?.hiddenSuite), appSource: source }), 20_000, task.id);
      return !run.compileError && run.failed === 0 && run.total > 0;
    }
    if (task.track !== 'typescript') return passesChecks(task, source);
    if (!typesPassed(checker.check(source, task.typeTests ?? []))) return false;
    if (solution?.hiddenTypeTests?.length && !typesPassed(checker.check(source, solution.hiddenTypeTests))) return false;
    return passesChecks(task, checker.toJavaScript(source));
  };

  // 1. What a pass shows must not pass the next level.
  let staged = 0;
  for (const project of EVOLVING_CHALLENGES) {
    const milestones = project.stages.filter((id) => !id.endsWith('-start'));
    for (const id of project.stages) {
      if (!ONLY.test(id)) continue;
      const earlier = milestones[milestones.indexOf(id.endsWith('-start') ? id.slice(0, -6) : id) - 1];
      const task = byId.get(id);
      const before = earlier ? byId.get(earlier) : undefined;
      const shown = earlier ? solutionFor(earlier) : undefined;
      if (!task || !before || !shown || task.verify !== 'tests' || task.track !== before.track) continue;
      const boards: [string, string | undefined][] = task.track === 'react'
        ? [['reference', shown.solution]]
        : [['reference', shown.solution], ['junior', shown.junior], ['senior', shown.senior]];
      for (const [name, source] of boards) {
        if (!source?.trim()) continue;
        staged += 1;
        if (await passesTask(task, source)) fail(`${id}: the ${name} solution of ${earlier}, shown once that level is passed, already passes this one`);
      }
    }
  }

  // 1b. What a checkpoint shows must not pass the milestone it leads to. Its
  // reference opens on giving up there, and for free once it is passed (any
  // boards with the pass), while the milestone is still to do: pasted into
  // the milestone, with its hidden checks, it has to fail. The proofs above
  // show it passes the checkpoint itself.
  let checkpoints = 0;
  for (const project of EVOLVING_CHALLENGES) {
    for (const id of project.stages) {
      if (!id.endsWith('-start') || !ONLY.test(id)) continue;
      const milestone = byId.get(id.slice(0, -6));
      const shown = solutionFor(id);
      if (!milestone || !shown || milestone.verify !== 'tests') continue;
      for (const [name, source] of [['reference', shown.solution], ['junior', shown.junior], ['senior', shown.senior]] as const) {
        if (!source?.trim()) continue;
        checkpoints += 1;
        if (await passesTask(milestone, source)) fail(`${id}: its ${name} solution, shown on giving up or after a pass, already passes ${milestone.id}`);
      }
    }
  }

  // 2. A promised new array: an in-place version of the reference must fail.
  let promises = 0;
  for (const task of CODING_TASKS) {
    if (task.verify !== 'tests' || task.track === 'react' || !task.tests || !ONLY.test(task.id) || !NEW_ARRAY.test(task.prompt.en)) continue;
    const solution = solutionFor(task.id);
    if (!solution) continue;
    const js = task.track === 'typescript' ? checker.toJavaScript(solution.solution) : solution.solution;
    const checks = [...task.tests, ...(solution.hiddenTests ?? [])];
    const control = inPlaceVariant(ts, js, checks, 'control');
    if (!control) continue;
    if (!await passesChecks(task, control)) { fail(`${task.id}: the reference wrapped for the in-place check no longer passes, so that check proves nothing`); continue; }
    // No call hands back a different array from the one it was given: the
    // promise is about something the rewrite cannot reach.
    if (await passesChecks(task, inPlaceVariant(ts, js, checks, 'probe')!)) continue;
    promises += 1;
    if (await passesChecks(task, inPlaceVariant(ts, js, checks, 'write')!)) fail(`${task.id}: the statement promises a new array, and a version that changes the array it was given and returns it passes every check`);
  }

  // 3. A TypeScript signature: every parameter typed any must fail a type test.
  let signatures = 0;
  for (const task of CODING_TASKS) {
    if (task.track !== 'typescript' || task.verify !== 'tests' || !task.tests || task.id.endsWith('-start') || !ONLY.test(task.id)) continue;
    const solution = solutionFor(task.id);
    if (!solution || typedParameterCount(ts, solution.solution) === 0) continue;
    signatures += 1;
    const loose = everyParameterAny(ts, solution.solution);
    if (typesPassed(checker.check(loose, task.typeTests ?? [])) && typesPassed(checker.check(loose, solution.hiddenTypeTests ?? []))) {
      fail(`${task.id}: the reference with every parameter typed any still passes the type tests, so they do not hold the signature the statement gives`);
    }
  }
  console.log(`Staged levels, promises and signatures: ${staged} earlier solutions fail the next level, ${checkpoints} checkpoint solutions fail their milestone, ${promises} new-array promises and ${signatures} TypeScript signatures are held by a check (${((Date.now() - started) / 1000).toFixed(1)} s).`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
