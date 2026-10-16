import assert from 'node:assert/strict';
import { runChecks, runInSandbox } from '../lib/coding/sandbox';
import { codeFromReusedTask, gradePathCode } from '../lib/learning-paths/grade';
import { CODING_TASKS } from '../lib/coding/catalog';
import { allPassed } from '../shared/coding-evaluate';
import { runtimePolicyForTask, installTaskRuntimePolicy } from '../shared/coding-task-runtime';
import { solutionFor } from '../lib/coding/solutions';
import { createContext, runInContext } from 'node:vm';
import { evaluateInRunRealm } from './run-realm-node';

/** Check the real realm restriction, including aliases captured at top level.
 * No test patches the host's Promise or examines learner source text. */
export async function checkCodingTaskRuntimePolicy(): Promise<void> {
  const task = CODING_TASKS.find((item) => item.id === 'js-clone-promise-all')!;
  const runtimePolicy = runtimePolicyForTask(task.id)!;
  assert.deepEqual(codeFromReusedTask(task).runtimePolicy, runtimePolicy, 'reused Learn tasks carry the server policy');
  assert.equal(runtimePolicyForTask('js-easy2-total-when-ready'), undefined);
  assert.equal(Object.hasOwn(codeFromReusedTask(CODING_TASKS.find((item) => item.id === 'js-sum-array')!), 'runtimePolicy'), false);
  const cases = [{ call: 'promiseAll([1, Promise.resolve(2)])', expected: [1, 2] }];
  const manual = `function promiseAll(items) {
    const inputs = Array.from(items);
    return new Promise((resolve, reject) => {
      const values = new Array(inputs.length); let remaining = inputs.length;
      if (!remaining) { resolve(values); return; }
      inputs.forEach((item, index) => Promise.resolve(item).then(value => {
        values[index] = value; if (--remaining === 0) resolve(values);
      }, reject));
    });
  }`;
  const blocked = [
    'const promiseAll = items => Promise.all(items);',
    'const original = Promise.all.bind(Promise); const promiseAll = items => original(items);',
    'const original = globalThis.Promise.all; const promiseAll = items => original.call(Promise, items);',
    'const original = Promise.resolve().constructor.all; const promiseAll = items => original.call(Promise, items);',
    "const original = Object.getOwnPropertyDescriptor(Promise, 'all').value; const promiseAll = items => Reflect.apply(original, Promise, [items]);",
    'class Derived extends Promise {} const promiseAll = items => Derived.all(items);',
    "const promiseAll = items => Function('items', 'return Promise.all(items)')(items);",
    `Object.defineProperty(Promise, 'all', { value: () => Promise.resolve([1, 2]) }); ${manual}`,
    `delete Promise.all; ${manual}`,
    `Promise.all = () => Promise.resolve([1, 2]); ${manual}`,
  ];
  for (const [name, code, expected] of [
    ...blocked.map((code, index) => [`blocked-${index}`, code, false] as const),
    ['manual', manual, true] as const,
    ['manual after caught native error', `try { Promise.all([]); } catch {}\n${manual}`, true] as const,
  ]) {
    const submit = await runChecks({ runtimePolicy, code, visible: cases, hidden: cases, shuffle: (list) => list.reverse() });
    const run = await evaluateInRunRealm({ runtimePolicy, code, calls: cases.map((item) => item.call), expectations: cases.map((item) => item.expected) });
    assert.equal(allPassed(submit.visible) && allPassed(submit.hidden!), expected, `Submit ${name}: ${JSON.stringify(submit)}`);
    assert.equal(allPassed(run), expected, `Run ${name}: ${JSON.stringify(run)}`);
  }
  const activity = {
    id: 'runtime-policy-proof', kind: 'code' as const, purpose: 'exercise' as const,
    verification: 'machine_verified' as const, title: task.title, summary: task.prompt,
    competencies: [], estimatedMinutes: 20, reuseTaskId: task.id,
  };
  for (const [code, expected] of [[manual, true], [blocked[1], false]] as const) {
    const grade = await gradePathCode(activity, codeFromReusedTask(task), code);
    assert.equal(grade.code.outcome === 'passed', expected, 'reused Learn grader applies the canonical restriction');
  }
  const unrestricted = { code: 'const promiseAll = items => Promise.all(items);', calls: cases.map((item) => item.call), expectations: cases.map((item) => item.expected) };
  assert.ok(allPassed(await runInSandbox(unrestricted)), 'another task gets a fresh native Promise.all');
  assert.ok(allPassed(await evaluateInRunRealm(unrestricted)), 'another Run gets a fresh native Promise.all');
  assert.deepEqual(await Promise.all([1, Promise.resolve(2)]), [1, 2], 'the host native Promise.all is unchanged');
  console.log('PASS integrity: native Promise.all unavailable before learner initialization, isolated per task in Run/Submit and reused Learn');
  await checkFlattenRuntimePolicy();
  await checkCloneRuntimePolicy();
  await checkDynamicCompilationRuntimePolicy();
}

async function checkCloneRuntimePolicy(): Promise<void> {
  const task = CODING_TASKS.find(item => item.id === 'alg-deep-clone')!;
  const runtimePolicy = runtimePolicyForTask(task.id)!;
  assert.deepEqual(codeFromReusedTask(task).runtimePolicy, runtimePolicy);
  assert.deepEqual(runtimePolicy, { forbidNativeCloneHelpers: true });
  const cases = [{ call: 'deepClone({a:[1,2]})', expected: { a: [1, 2] } }];
  const manual = 'const deepClone=value=>{if(value===null||typeof value!=="object")return value;const out=Array.isArray(value)?[]:Object.create(null);if(Array.isArray(value)){for(let i=0;i<value.length;i++)out[i]=deepClone(value[i]);}else for(const key of Object.keys(value))out[key]=deepClone(value[key]);return out;};';
  const blocked = [
    'const deepClone=value=>structuredClone(value);',
    'const original=globalThis.structuredClone;const deepClone=value=>original(value);',
    "const original=Object.getOwnPropertyDescriptor(globalThis,'structuredClone').value;const deepClone=value=>Reflect.apply(original,null,[value]);",
    'const deepClone=value=>value===null||typeof value!=="object"?value:JSON.parse(JSON.stringify(value));',
    'const original=JSON.parse.bind(JSON);const deepClone=value=>original(JSON.stringify(value));',
    "const original=Object.getOwnPropertyDescriptor(JSON,'parse').value;const deepClone=value=>Reflect.apply(original,JSON,[JSON.stringify(value)]);",
    `Object.defineProperty(JSON,'parse',{value:()=>({a:[1,2]})});${manual}`,
    `globalThis.structuredClone=()=>({a:[1,2]});${manual}`,
    `delete JSON.parse;${manual}`,
    "const deepClone=value=>(function(){}).constructor('value','return structuredClone(value)')(value);",
    "const deepClone=value=>JSON.constructor.constructor('return JSON.parse')()(JSON.stringify(value));",
  ];
  const debug = 'console.log(JSON.stringify({a:[1,2]}));';
  for (const [name, code, expected] of [
    ...blocked.map((code, index) => [`blocked-${index}`, code, false] as const),
    ['manual', manual, true] as const,
    ['JSON debugging', debug + manual, true] as const,
    ['caught blocked calls', `try{JSON.parse('{}')}catch{};try{structuredClone({})}catch{};${manual}`, true] as const,
    ['custom method names', `const custom={parse:()=>42,structuredClone:()=>43};custom.parse();custom.structuredClone();${manual}`, true] as const,
    ['unrelated array helpers', `[1,[2]].flat();[1].flatMap(value=>[value]);${manual}`, true] as const,
  ]) {
    const submit = await runChecks({ runtimePolicy, code, visible: cases, hidden: cases, shuffle: list => list.reverse() });
    const run = await evaluateInRunRealm({ runtimePolicy, code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) });
    assert.equal(allPassed(submit.visible) && allPassed(submit.hidden!), expected, `Submit clone ${name}: ${JSON.stringify(submit)}`);
    assert.equal(allPassed(run), expected, `Run clone ${name}: ${JSON.stringify(run)}`);
    if (expected) {
      assert.equal(submit.visible.results[0].actual, '{"a":[1,2]}', 'Submit result formatting stays available');
      assert.equal(run.results[0].actual, '{"a":[1,2]}', 'Run result formatting stays available');
      if (name === 'JSON debugging') {
        assert.ok(submit.visible.logs.includes('{"a":[1,2]}'));
        assert.ok(run.logs.includes('{"a":[1,2]}'));
      }
    }
  }
  const activity = {
    id: 'clone-runtime-policy-proof', kind: 'code' as const, purpose: 'exercise' as const,
    verification: 'machine_verified' as const, title: task.title, summary: task.prompt,
    competencies: [], estimatedMinutes: 20, reuseTaskId: task.id,
  };
  for (const [code, expected] of [[manual, true], [blocked[1], false], [blocked[4], false]] as const) {
    const grade = await gradePathCode(activity, codeFromReusedTask(task), code);
    assert.equal(grade.code.outcome === 'passed', expected, 'reused Learn applies the clone restriction');
  }
  for (const code of [blocked[0], blocked[3]]) {
    const input = { code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) };
    assert.ok(allPassed(await runInSandbox(input)), 'another task retains native clone helpers');
    assert.ok(allPassed(await evaluateInRunRealm(input)), 'another Run retains native clone helpers');
  }
  assert.deepEqual(JSON.parse(JSON.stringify({ a: [1, 2] })), { a: [1, 2] }, 'host JSON remains unchanged');
  assert.deepEqual(structuredClone({ a: [1, 2] }), { a: [1, 2] }, 'host structuredClone remains unchanged');
  console.log('PASS integrity: native JSON.parse/structuredClone blocked only for deepClone; Run/Submit/Learn, aliases, isolation, formatting and JSON debugging checked');
}

async function checkFlattenRuntimePolicy(): Promise<void> {
  const task = CODING_TASKS.find(item => item.id === 'alg-deep-flatten')!;
  const runtimePolicy = runtimePolicyForTask(task.id)!;
  assert.deepEqual(codeFromReusedTask(task).runtimePolicy, runtimePolicy);
  assert.equal(runtimePolicyForTask('alg-merge-intervals'), undefined);
  const cases = [{ call: 'deepFlatten([1,[2]])', expected: [1, 2] }];
  const manual = 'const deepFlatten=items=>{const result=[];function visit(values){for(let index=0;index<values.length;index++){const value=values[index];if(Array.isArray(value))visit(value);else result.push(value);}}visit(items);return result;};';
  const blocked = [
    'const deepFlatten=items=>items.flat(Infinity);',
    'const original=Array.prototype.flat;const deepFlatten=items=>original.call(items,Infinity);',
    'const original=[].flat;const deepFlatten=items=>Reflect.apply(original,items,[Infinity]);',
    'const original=[].constructor.prototype.flat;const deepFlatten=items=>original.call(items,Infinity);',
    "const original=Object.getOwnPropertyDescriptor(Array.prototype,'flat').value;const deepFlatten=items=>original.call(items,Infinity);",
    'const deepFlatten=items=>items.flatMap(value=>Array.isArray(value)?deepFlatten(value):[value]);',
    'const original=Array.prototype.flatMap;const deepFlatten=items=>original.call(items,value=>Array.isArray(value)?deepFlatten(value):[value]);',
    `Object.defineProperty(Array.prototype,'flat',{value:()=>[1,2]});${manual}`,
    `Array.prototype.flatMap=()=>[1,2];${manual}`,
    `delete Array.prototype.flat;${manual}`,
  ];
  for (const [name, code, expected] of [
    ...blocked.map((code, index) => [`blocked-${index}`, code, false] as const),
    ['manual', manual, true] as const,
    ['caught blocked call', `try{[].flat()}catch{};${manual}`, true] as const,
    ['custom method name', `const unrelated={flat:()=>42,flatMap:()=>43};unrelated.flat();unrelated.flatMap();${manual}`, true] as const,
  ]) {
    const submit = await runChecks({ runtimePolicy, code, visible: cases, hidden: cases, shuffle: list => list.reverse() });
    const run = await evaluateInRunRealm({ runtimePolicy, code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) });
    assert.equal(allPassed(submit.visible) && allPassed(submit.hidden!), expected, `Submit flatten ${name}: ${JSON.stringify(submit)}`);
    assert.equal(allPassed(run), expected, `Run flatten ${name}: ${JSON.stringify(run)}`);
  }
  const activity = {
    id: 'flatten-runtime-policy-proof', kind: 'code' as const, purpose: 'exercise' as const,
    verification: 'machine_verified' as const, title: task.title, summary: task.prompt,
    competencies: [], estimatedMinutes: 20, reuseTaskId: task.id,
  };
  for (const [code, expected] of [[manual, true], [blocked[1], false]] as const) {
    const grade = await gradePathCode(activity, codeFromReusedTask(task), code);
    assert.equal(grade.code.outcome === 'passed', expected, 'reused Learn applies the flatten restriction');
  }
  const unrestricted = { code: blocked[0], calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) };
  assert.ok(allPassed(await runInSandbox(unrestricted)), 'another task retains native flat');
  assert.ok(allPassed(await evaluateInRunRealm(unrestricted)), 'another Run retains native flat');
  assert.deepEqual([1, [2]].flat(Infinity), [1, 2], 'host flat remains unchanged');
  assert.deepEqual([1, 2].flatMap(value => [value]), [1, 2], 'host flatMap remains unchanged');
  console.log('PASS integrity: native flat/flatMap unavailable before initialization only for deepFlatten; Run/Submit/Learn, captured aliases and unrelated/host methods checked');
}


/** The parser bans native compilation, while the trusted controller still
 * compiles the module and its authored callbacks privately. */
async function checkDynamicCompilationRuntimePolicy(): Promise<void> {
  const task = CODING_TASKS.find(item => item.id === 'js-evolving-calculator-3')!;
  const runtimePolicy = runtimePolicyForTask(task.id)!;
  assert.deepEqual(runtimePolicy, { forbidNativeDynamicCompilation: true });
  for (const id of ['js-evolving-calculator-4', 'js-evolving-calculator-5', 'js-evolving-calculator-4-start', 'js-evolving-calculator-5-start']) {
    assert.deepEqual(runtimePolicyForTask(id), runtimePolicy, id + ' inherits the parser restriction');
  }
  for (const id of ['js-evolving-calculator-1-start', 'js-evolving-calculator-1', 'js-evolving-calculator-2-start', 'js-evolving-calculator-2', 'js-evolving-calculator-3-start', 'js-sum-array']) {
    assert.equal(runtimePolicyForTask(id), undefined, id + ' has no compilation restriction');
  }
  assert.deepEqual(codeFromReusedTask(task).runtimePolicy, runtimePolicy);
  const manual = solutionFor(task.id)!.solution;
  const parse = manual.replace('function calculate(s)', 'function parseManual(s)');
  const cases = [
    { call: 'calculate("2+3")', expected: 5 },
    { call: 'calculate("-(2+3)*4")', expected: -20 },
    { call: 'calculate("1 +")', expected: null },
  ];
  const probes = [
    ["const compile = Function;", "compile('return 5;');"],
    ["const compile = globalThis.Function;", "new compile('return 5;');"],
    ["const compile = Function.bind(null);", "compile('return 5;');"],
    ["const compile = (() => {}).constructor;", "Reflect.apply(compile, null, ['return 5;']);"],
    ["const compile = Object.getOwnPropertyDescriptor(Function.prototype, 'constructor').value;", "Reflect.construct(compile, ['return 5;']);"],
    ["const compile = (async function(){}).constructor;", "compile('return 5;');"],
    ["const compile = (function*(){}).constructor;", "compile('return 5;');"],
    ["const compile = (async function*(){}).constructor;", "compile('return 5;');"],
    ["const compile = Object.getPrototypeOf(Object.getPrototypeOf(async function(){})).constructor;", "compile('return 5;');"],
    ["const compile = eval;", "compile('0');"],
    ["const compile = globalThis.eval.bind(null);", "Reflect.apply(compile, null, ['0']);"],
    ["", "eval('0');"],
  ];
  const blocked = probes.map(([capture, invoke]) => capture + '\n' + parse + '\nfunction calculate(s) {' + invoke + ' return parseManual(s); }');
  for (const [index, code] of blocked.entries()) {
    const submit = await runChecks({ runtimePolicy, code, visible: cases, hidden: cases, shuffle: list => list.reverse() });
    const run = await evaluateInRunRealm({ runtimePolicy, code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) });
    assert.equal(allPassed(submit.visible) && allPassed(submit.hidden!), false, 'Submit native compiler route ' + index);
    assert.equal(allPassed(run), false, 'Run native compiler route ' + index);
    // The same probe really works without this task's policy; a malformed
    // attack cannot pass merely because both restricted and normal runs fail.
    assert.ok(allPassed(await runInSandbox({ code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) })), 'unrestricted Submit compiler route ' + index);
    assert.ok(allPassed(await evaluateInRunRealm({ code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) })), 'unrestricted Run compiler route ' + index);
  }
  const restores = [
    "Object.defineProperty(globalThis, 'Function', { value: () => () => 5 });",
    "Object.defineProperty(Function.prototype, 'constructor', { value: () => () => 5 });",
    "Object.defineProperty(Object.getPrototypeOf(async function(){}), 'constructor', { value: () => () => 5 });",
    // Contextified native globals can silently ignore these operations;
    // follow the attempt with a real capability call, so ignoring a write
    // is not mistaken for restored native compilation.
    "globalThis.eval = () => 0; (0, eval)('0');",
    "delete globalThis.Function; Function('return 0;');",
  ];
  const accepted = [
    manual,
    ...['junior', 'senior'].map(key => solutionFor(task.id)![key as 'junior' | 'senior']!),
    "try { Function('return 0;'); } catch {}\n" + manual,
    "try { eval('0'); } catch {}\n" + manual,
    "const helpers = { Function: value => value, eval: value => value };\n" + parse + "\nfunction calculate(s) { return helpers.eval(helpers.Function(parseManual(s))); }",
    "const Function = value => value; const compileProgram = value => value;\n" + parse + "\nfunction calculate(s) { return Function(compileProgram(parseManual(s))); }",
  ];
  for (const [name, code, expected] of [
    ...restores.map((restore, index) => ['restore-' + index, restore + '\n' + manual, false] as const),
    ...accepted.map((code, index) => ['manual-' + index, code, true] as const),
  ]) {
    const submit = await runChecks({ runtimePolicy, code, visible: cases, hidden: cases, shuffle: list => list.reverse() });
    const run = await evaluateInRunRealm({ runtimePolicy, code, calls: cases.map(item => item.call), expectations: cases.map(item => item.expected) });
    assert.equal(allPassed(submit.visible) && allPassed(submit.hidden!), expected, 'Submit ' + name + ': ' + JSON.stringify(submit));
    assert.equal(allPassed(run), expected, 'Run ' + name + ': ' + JSON.stringify(run));
  }
  const syntax = {
    code: 'async function syntax(){return [await (async()=>5)(),(function*(){yield 6})().next().value,(await (async function*(){yield 7})().next()).value]}',
    calls: ['syntax();'], expectations: [[5, 6, 7]],
  };
  assert.ok(allPassed(await runInSandbox({ runtimePolicy, ...syntax })), 'Submit retains function syntax');
  assert.ok(allPassed(await evaluateInRunRealm({ runtimePolicy, ...syntax })), 'Run retains syntax and trailing-semicolon calls');
  const privateCompiler = { code: 'function hiddenCompiler(){return [typeof compileProgram,typeof compileConsole]}', calls: ['hiddenCompiler() // final comment'], expectations: [['undefined','undefined']] };
  assert.ok(allPassed(await runInSandbox({ runtimePolicy, ...privateCompiler })), 'Submit compiler is outside learner scope');
  assert.ok(allPassed(await evaluateInRunRealm({ runtimePolicy, ...privateCompiler })), 'Run compiler is outside learner scope');
  const activity = {
    id: 'parser-runtime-policy-proof', kind: 'code' as const, purpose: 'exercise' as const,
    verification: 'machine_verified' as const, title: task.title, summary: task.prompt,
    competencies: [], estimatedMinutes: 20, reuseTaskId: task.id,
  };
  for (const [code, expected] of [[manual, true], [blocked[0], false]] as const) {
    const grade = await gradePathCode(activity, codeFromReusedTask(task), code);
    assert.equal(grade.code.outcome === 'passed', expected, 'reused Learn enforces parser compilation policy');
  }
  // Install from the host into another VM: constructor prototypes must be
  // taken from that target realm, never from the policy factory's realm.
  const realm = createContext({});
  const target = runInContext('globalThis', realm) as typeof globalThis;
  const targetFunctionPrototype = runInContext('Object.getPrototypeOf(function(){})', realm);
  installTaskRuntimePolicy(target, runtimePolicy);
  assert.equal(Object.getPrototypeOf(target.Function), targetFunctionPrototype, 'blocked Function stays in the target realm');
  assert.equal(Object.getPrototypeOf(target.eval), targetFunctionPrototype, 'blocked eval stays in the target realm');
  assert.equal(runInContext("(() => {try {(function*(){}).constructor('return 1');return false;}catch{return true;}})()", realm), true);
  assert.equal(Function('return 5;')(), 5, 'host ordinary compiler unchanged');
  assert.equal(Object.getPrototypeOf(async function(){}).constructor('return 6;') instanceof Function, true, 'host async compiler unchanged');
  assert.equal(Object.getPrototypeOf(function*(){}).constructor('return 7;')().next().value, 7, 'host generator compiler unchanged');
  console.log('PASS integrity: native eval/Function families revoked before parser initialization; real Run/Submit/Learn, trusted callbacks, aliases, restoration, manual fallbacks and target-realm isolation checked');
}
