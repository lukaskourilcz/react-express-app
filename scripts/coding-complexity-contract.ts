import assert from 'node:assert/strict';
import { assessComplexity } from '../lib/coding/complexity';
import { codingTaskForHistory } from '../lib/coding/catalog';
import { solutionFor } from '../lib/coding/solutions';

export function complexityContracts() {
  const task = { track: 'javascript' as const, prompt: { en: 'Target: O(n) time and O(1) extra space.', cs: '' }, tests: [{ call: 'solve([1,2,3])', expected: 6 }] };
  const check = (code: string) => assessComplexity(task, code);
  assert.equal(check('const solve = xs => xs.length;').time, 'O(1)');
  assert.equal(check('const solve = xs => xs.map(x => x * 2);').time, 'O(n)');
  assert.equal(check('const solve = xs => xs.slice().sort((a,b) => a-b);').time, 'O(n log n)');
  const nested = check('function solve(xs) { let sum=0; for(let i=0;i<xs.length;i++) for(let j=0;j<xs.length;j++) sum+=xs[j]; return sum; }');
  assert.equal(nested.time, 'O(n^2)');
  assert.equal(nested.assessment, 'above-target');
  assert.equal(check('function solve(xs) { for(let i=0;i<xs.length;i++) for(let j=0;j<3;j++) xs[i]+=j; return xs; }').time, 'O(n)');
  assert.equal(check('const solve = xs => xs.map(x => xs.includes(x));').time, 'O(n^2)');
  assert.equal(check('function solve(xs) { let i=1; while(i<xs.length) i*=2; return i; }').time, 'O(log n)');
  assert.equal(check('const solve = xs => xs.length ? solve(xs.slice(1)) : 0;').assessment, 'unknown');
  assert.equal(check('const solve = xs => mystery(xs);').time, null);
  assert.equal(check('const solve = xs => { while(xs.length) xs = mystery(xs); return 1; };').assessment, 'unknown');
  assert.equal(check('const solve =').assessment, 'unknown');
  assert.equal(check('const solve = xs => { let out = ""; for (let i=0;i<xs.length;i++) out+=xs[i]; return out; };').assessment, 'unknown');
  assert.equal(check('const solve = xs => /^(a+)+$/.test(xs);').assessment, 'unknown');
  assert.equal(check('const cache = mystery(); const solve = xs => cache[xs];').assessment, 'unknown');
  const palindrome = codingTaskForHistory('alg-valid-palindrome')!;
  const report = assessComplexity(palindrome, solutionFor(palindrome.id)!.solution);
  assert.equal(report.guidance.targetTime, 'O(n)');
  assert.equal(report.guidance.targetSpace, 'O(1)');
  assert.equal(report.time, 'O(n)', JSON.stringify(report));
  assert.equal(report.assessment, 'within-target');
  assert.equal(assessComplexity({ ...task, track: 'react' }, 'const App = () => null').assessment, 'unknown');
  console.log('Complexity contracts passed: scans, nesting, fixed bounds, sorting, logarithmic loops, recursion, unresolved calls and palindrome.');
}
