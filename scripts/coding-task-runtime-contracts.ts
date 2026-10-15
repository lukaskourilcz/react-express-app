import assert from 'node:assert/strict';
import { runChecks, runInSandbox } from '../lib/coding/sandbox';
import { codeFromReusedTask, gradePathCode } from '../lib/learning-paths/grade';
import { CODING_TASKS } from '../lib/coding/catalog';
import { allPassed } from '../shared/coding-evaluate';
import { runtimePolicyForTask } from '../shared/coding-task-runtime';
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
