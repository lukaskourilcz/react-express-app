import assert from 'node:assert/strict';
import { assessComplexity } from '../lib/coding/complexity';
import { codingPassXp, complexityGuidance } from '../shared/coding-complexity';
import { codingTaskForHistory } from '../lib/coding/catalog';
import { solutionFor } from '../lib/coding/solutions';

export function complexityContracts() {
  const task = { track: 'javascript' as const, prompt: { en: 'Target: O(n) time and O(1) extra space.', cs: '' }, tests: [{ call: 'solve([1,2,3])', expected: 6 }] };
  const target = (prompt: string) => complexityGuidance({ ...task, prompt: { en: prompt } }).targetTime;
  assert.equal(target('Target: O(n).'), 'O(n)', 'a standalone authored runtime target is applicable');
  assert.equal(target('Target: O(log min(a, b)) calls.'), 'O(log min(a, b))', 'nested notation remains complete');
  assert.equal(target('Target: O(log n) checks and O(1) space.'), 'O(log n)');
  assert.equal(target('Target: O(n) space.'), null, 'space cannot be mistaken for time');
  assert.equal(target('Target: O(n time.'), null, 'incomplete notation is not presented');
  assert.equal(complexityGuidance({ ...task, tests: [] }).targetTime, null, 'type-only tasks have no runtime target');
  assert.equal(complexityGuidance({ ...task, track: 'react' }).targetTime, null, 'UI rendering has no comparable runtime target');
  const check = (code: string) => assessComplexity(task, code);
  assert.equal(check('const solve = xs => xs.length;').time, 'O(1)');
  assert.equal(check('const solve = xs => xs.map(x => x * 2);').time, 'O(n)');
  assert.equal(check('const solve = xs => xs.slice().sort((a,b) => a-b);').time, 'O(n log n)');
  const nested = check('function solve(xs) { let sum=0; for(let i=0;i<xs.length;i++) for(let j=0;j<xs.length;j++) sum+=xs[j]; return sum; }');
  assert.equal(nested.time, 'O(n^2)');
  assert.equal(nested.assessment, 'above-target');
  assert.equal(codingPassXp(nested), 15);
  assert.equal(codingPassXp(check('const solve = xs => xs.map(x => x);')), 25);
  assert.equal(codingPassXp(check('const solve = xs => mystery(xs);')), 25);
  assert.equal(check('const solve = xs => xs.map(x => [1, 2, 3].includes(x));').time, 'O(n)', 'a fixed inner scan is constant work');
  assert.equal(check('const solve = xs => [1, 2, 3].map(x => xs.includes(x));').time, 'O(n)', 'a fixed outer scan does not multiply input growth');
  assert.equal(check('function solve(xs) { const fixed = [1,2,3]; for (const x of fixed) { fixed.includes(x); } return xs; }').time, 'O(1)');
  assert.equal(check('function solve(xs) { const copy = xs; return copy.map(x => xs.map(y => y+x)); }').time, 'O(n^2)');

  assert.equal(check('function solve(xs) { for(let i=0;i<xs.length;i++) for(let j=0;j<3;j++) xs[i]+=j; return xs; }').time, 'O(n)');
  assert.equal(check('const solve = xs => xs.map(x => xs.map(y => y+x));').time, 'O(n^2)');
  assert.equal(check('const solve = xs => new Set(xs.map(x => xs.map(y => y+x)));').time, 'O(n^2)');
  assert.equal(check('const solve = xs => [...xs.map(x => xs.map(y => y+x))];').time, 'O(n^2)');
  assert.equal(check('function solve(xs) { for (const x of xs.map(x => xs.map(y => y+x))) {} return xs; }').time, 'O(n^2)');
  assert.equal(check('function solve(xs) { for (let i=0;i<xs.length && xs.includes(i);i++) {} return xs; }').assessment, 'unknown');
  for (const code of [
    'function solve(xs) { for(let i=0;i<xs.length;i++) for(let j=0;j<Math.min(xs.length,3);j++) {} return xs; }',
    'function solve(xs) { for(let i=0;i<xs.length;i++) for(let j=0;j<3 && xs.length>0;j++) {} return xs; }',
    'function solve(xs) { for(let i=0;i<xs.length;i+=3) for(let j=i;j<Math.min(i+3,xs.length);j++) {} return xs; }',
    'function solve(xs) { let right=0; for(let left=0;left<xs.length;left++) while(right<xs.length) right++; return xs; }',
    'function solve(xs) { let arr=xs; arr=[1,2,3]; return xs.map(x=>arr.includes(x)); }',
    'function solve(xs) { for(let i=0;i<xs.length;i++) for(let j=0;j<xs.length;j++) { break; } return xs; }',
    'function solve(xs) { let j=0; for(let i=0;i<xs.length;i++) for(;j<xs.length;j++) {} return xs; }',
    'function solve(xs) { const n=xs.length%3; for(let i=0;i<xs.length;i++) for(let j=0;j<n;j++) {} return xs; }',
    'function solve(xs) { for(let i=0;i<xs.length;i++) for(let j=0;j<(xs.length?3:0);j++) {} return xs; }',
    'const solve = xs => xs.map(x => xs.some(() => true));',
    'const solve = xs => xs.map(x => xs.every(() => false));',
    'const solve = xs => xs.map(x => xs.includes(xs[0]));',
  ]) assert.equal(codingPassXp(check(code)), 25, 'an uncertain bounded/amortized traversal must not reduce XP');
  assert.equal(check("const solve = xs => xs.map(x => /[a-z]/.test('abc'));").time, 'O(n)');
  assert.equal(check('const solve = xs => xs.map(x => xs.slice(0,3).includes(x));').time, 'O(n)');
  assert.equal(check('const solve = xs => xs.map(x => xs.slice(-3).includes(x));').time, 'O(n)');
  assert.equal(check('const solve = xs => xs.split("").map(x => xs.substring(0,3).includes(x));').time, 'O(n)');
  assert.equal(check('function solve(xs) { for (let i=mystery(xs);i<xs.length;i++) {} return xs; }').assessment, 'unknown');
  assert.equal(check('const solve = xs => /[a-z]/.test(xs);').time, 'O(n)');
  assert.equal(check('function solve(xs) { let i=1; while(i<xs.length) i*=2; return i; }').time, 'O(log n)');
  assert.equal(check('const solve = xs => xs.length ? solve(xs.slice(1)) : 0;').assessment, 'unknown');
  assert.equal(check('const solve = xs => mystery(xs);').time, null);
  assert.equal(check('const solve = xs => { while(xs.length) xs = mystery(xs); return 1; };').assessment, 'unknown');
  assert.equal(check('const solve =').assessment, 'unknown');
  const deeplyNested = `function solve(xs) { ${'{'.repeat(5000)} return xs; ${'}'.repeat(5000)} }`;
  assert.doesNotThrow(() => check(deeplyNested), 'an advisory parser failure cannot replace the grader verdict');
  assert.equal(check(deeplyNested).assessment, 'unknown');
  assert.equal(check('const solve = xs => { let out = ""; for (let i=0;i<xs.length;i++) out+=xs[i]; return out; };').assessment, 'unknown');
  assert.equal(check('const solve = xs => /^(a+)+$/.test(xs);').assessment, 'unknown');
  assert.equal(check('const cache = mystery(); const solve = xs => cache[xs];').assessment, 'unknown');
  for (const code of [
    'const solve = text => `Hello, ${text}!`;',
    'const solve = text => "Hello, " + text + "!";',
    'function solve(text:string, suffix:string){return text+suffix;}',
    'function solve(text:string){let prefix:string;prefix="Hello";return prefix+", "+text;}',
  ]) {
    assert.equal(check(code).time, null, 'unresolved string construction has no constant label');
    assert.equal(codingPassXp(check(code)), 25, 'unknown string construction keeps its base reward');
  }
  const stringInputs = { ...task, tests: [{ call: 'solve("first", "second")', expected: 'firstsecond' }] };
  assert.equal(assessComplexity(stringInputs, 'const solve = (left, right) => left + right;').time, null, 'tested string arguments do not become scalar arithmetic');
  assert.equal(check('const solve = value => value + 1;').time, 'O(1)', 'scalar arithmetic remains analyzable');
  assert.equal(check('const solve = value => value.name;').time, 'O(1)', 'field access has no output construction');
  assert.equal(check('const solve = value => "a" + "b";').time, 'O(1)', 'fixed literals remain bounded');
  assert.equal(check('const solve = value => `prefix${"fixed"}`;').time, 'O(1)', 'fixed template interpolation is bounded');
  // The tested factory's setup cost cannot stand in for later calls. These
  // pairs construct just as cheaply but their returned workloads differ.
  const factoryTask = { ...task, tests: [{ call: '(() => { const run = solve(); return run([1,2,3]); })()', expected: 6 }] };
  for (const code of [
    'const solve = () => xs => xs.map(x => x);',
    'const solve = () => xs => xs.map(x => xs.map(y => x+y));',
    'function solve() { const work = xs => xs.map(x => x); const alias = work; return alias; }',
    'function solve() { function work(xs) { return xs.map(x => x); } return { work }; }',
    'function solve() { let work; work = xs => xs.map(x => x); return work; }',
    'const solve = () => ({ work(xs) { return xs.map(x => x); } });',
    'const solve = () => ({ get work() { return [1,2,3].map(x => x); } });',
    'const solve = () => [xs => xs.map(x => x)];',
    'const solve = () => true ? (xs => xs.map(x => x)) : (xs => xs);',
    'const solve = () => { const work = xs => xs; return ({ work } as const); };',
    'function helper() { return xs => xs.map(x => x); } const solve = () => helper();',
  ]) {
    const scoped = assessComplexity(factoryTask, code);
    assert.equal(scoped.time, null, code);
    assert.equal(scoped.assessment, 'unknown', code);
    assert.equal(codingPassXp(scoped), 25, code);
    assert.equal(scoped.guidance.targetTime, 'O(n)', 'an unavailable estimate keeps the authored target');
  }
  const aliases = 'const a0 = xs => xs.map(x => x);' + Array.from({ length: 500 }, (_, i) => `const a${i + 1} = a${i};`).join('');
  assert.equal(assessComplexity(factoryTask, `function solve() { ${aliases} return a500; }`).assessment, 'unknown', 'a bounded long alias chain stays unavailable');
  assert.equal(check('function solve(xs) { function unused() { return () => xs.length; } return xs.length; }').time, 'O(1)', 'an uncalled local factory does not replace the eager entry workload');
  assert.equal(check('const solve = xs => xs.map(x => x * 2);').time, 'O(n)', 'an eager callback is not an escaping function');
  assert.equal(codingPassXp(nested), 15, 'reliably quadratic eager work still earns 15 XP');
  for (const id of ['js-mh-rate-limit', 'js-mh-curry', 'js-mh-latest-only']) {
    const authored = codingTaskForHistory(id)!;
    for (const variant of ['solution', 'junior', 'senior'] as const) {
      const scoped = assessComplexity(authored, solutionFor(id)![variant]!);
      assert.equal(scoped.time, null, id + '/' + variant);
      assert.equal(scoped.assessment, 'unknown', id + '/' + variant);
      assert.equal(codingPassXp(scoped), 25, id + '/' + variant);
    }
  }
  const palindrome = codingTaskForHistory('alg-valid-palindrome')!;
  const report = assessComplexity(palindrome, solutionFor(palindrome.id)!.solution);
  assert.equal(report.guidance.targetTime, 'O(n)');
  assert.equal(report.guidance.targetSpace, 'O(1)');
  assert.equal(report.time, 'O(n)', JSON.stringify(report));
  assert.equal(report.assessment, 'within-target');
  assert.equal(assessComplexity({ ...task, track: 'react' }, 'const App = () => null').assessment, 'unknown');
  console.log('Complexity contracts passed: scans, nesting, fixed bounds, sorting, logarithmic loops, recursion, unresolved calls, deferred workloads and palindrome.');
}
