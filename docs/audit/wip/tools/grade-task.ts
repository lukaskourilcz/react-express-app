import { runtimePolicyForTask } from '../../../../shared/coding-task-runtime';
// Grade a code file against one coding task exactly the way the server does.
//   node grade-task.mjs <taskId> <codeFile> [--visible-only]
//   node grade-task.mjs <taskId> --design '[0,2,1,3,0]'   (guided design answers, original option order)
//   node grade-task.mjs <taskId> --drill '<answer json>'   (estimate: number; tradeoff/bottleneck: option index; sequence: [indices])
// Prints JSON: verdict, visible results, hidden results, type check, logs.
import { readFileSync } from 'node:fs';
import { CODING_TASKS } from '../../../../lib/coding/catalog';
import { solutionFor } from '../../../../lib/coding/solutions';
import { runChecks } from '../../../../lib/coding/sandbox';
import { nodeTypeScriptChecker } from '../../../../lib/coding/ts-check-node';
import { codeOutcome, gradeDesign, prepareDesign } from '../../../../lib/coding/grade';
import { runReactSuite } from '../../../../lib/coding/react-runner';
import { withHiddenCases } from '../../../../lib/coding/react-hidden';

async function main() {
  const [taskId, arg, extra] = process.argv.slice(2);
  const task = CODING_TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error(`unknown task ${taskId}`);
  const solution = solutionFor(task.id);
  const identity = <U>(list: U[]) => [...list];
  if (arg === '--design') {
    const answers = JSON.parse(extra);
    const { key } = prepareDesign(task, identity);
    console.log(JSON.stringify(gradeDesign(task, key, answers), null, 1));
    return;
  }
  if (arg === '--drill') {
    const answer = JSON.parse(extra);
    const { key } = prepareDesign(task, identity);
    console.log(JSON.stringify(gradeDesign(task, key, Array.isArray(answer) && task.drill?.format === 'sequence' ? [answer] : [answer]), null, 1));
    return;
  }
  const code = readFileSync(arg, 'utf8');
  if (task.track === 'react') {
    if (!task.suite) { console.log(JSON.stringify({ verdict: 'checklist-task: no suite' })); return; }
    const run = await runReactSuite({ suite: withHiddenCases(task.suite, solution?.hiddenSuite), appSource: code });
    console.log(JSON.stringify({ verdict: run.compileError ? 'error' : run.timedOut ? 'timeout' : run.failed === 0 && run.total > 0 ? 'passed' : 'failed', compileError: run.compileError, cases: run.cases }, null, 1));
    return;
  }
  const tests = task.tests ?? [];
  const hidden = solution?.hiddenTests ?? [];
  let codeToRun = code;
  let check = null;
  let hiddenTypes = null;
  if (task.track === 'typescript') {
    const checker = nodeTypeScriptChecker();
    check = checker.check(code, task.typeTests ?? []);
    if (solution?.hiddenTypeTests?.length) hiddenTypes = checker.check(code, solution.hiddenTypeTests);
    codeToRun = checker.toJavaScript(code);
  }
  const { visible, hidden: hiddenRun } = await runChecks({
    runtimePolicy: runtimePolicyForTask(task.id),
    code: codeToRun,
    visible: tests,
    hidden,
    shuffle: identity,
  });
  let verdict = codeOutcome({ visible, hidden: hiddenRun, check });
  if (verdict === 'passed' && hiddenTypes && hiddenTypes.typeTests.some((t) => !t.pass)) verdict = 'failed';
  console.log(JSON.stringify({
    verdict,
    codeError: visible.codeError ?? hiddenRun?.codeError ?? null,
    timedOut: Boolean(visible.timedOut || hiddenRun?.timedOut),
    visible: tests.map((t, i) => ({ call: t.call, expected: t.expected, ...visible.results[i] })),
    hidden: hidden.map((t, i) => ({ call: t.call, expected: t.expected, ...hiddenRun?.results[i] })),
    typeCheck: check,
    hiddenTypeCheck: hiddenTypes,
    logs: visible.logs.slice(0, 20),
  }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
