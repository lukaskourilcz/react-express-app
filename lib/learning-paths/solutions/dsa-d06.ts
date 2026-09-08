/** Server-only reference solutions and hidden assertions for DSA D06.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions chase what the visible ones leave open: a sum that
 * quietly rewires the list it was handed, a factorial answered from a lookup
 * of the six values the visible tests used, a countdown that returns the same
 * array object twice, and call counts at both ends of the stated input range.
 *
 * Both counted solutions are declared with the `function` keyword, which is
 * what the task contract asks of the learner: the harness replaces that
 * binding with its counting wrapper before the assertions run. */

import type { PathCodeSolution } from '../types';

export const DSA_D06_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d06-recursive-list-sum': {
    solution:
      'function sumList(head) {\n  if (head === null) return 0;\n  return head.value + sumList(head.next);\n}',
    hiddenTests: [
      { call: 'sumList(__build([10, 20, 30, 40, 50]))', expected: 150 },
      { call: 'sumList(__build([1.5, 2.5]))', expected: 4 },
      { call: 'sumList(__build([-1, -2, -3]))', expected: -6 },
      {
        call: '(() => { const head = __build([1, 2, 3]); sumList(head); return __toArray(head); })()',
        expected: [1, 2, 3],
      },
      {
        call: '(() => { const head = __build([5, 6]); sumList(head); return head.next.next; })()',
        expected: null,
      },
      { call: '__callsToSum([9])', expected: 2, criterion: 'recursive' },
      { call: '__callsToSum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])', expected: 11, criterion: 'recursive' },
    ],
  },
  'dsa-v1-d06-bounded-factorial': {
    solution:
      'function factorial(n) {\n  let product = 1;\n  for (let i = 2; i <= n; i += 1) product *= i;\n  return product;\n}',
    hiddenTests: [
      { call: 'factorial(2)', expected: 2 },
      { call: 'factorial(3)', expected: 6 },
      { call: 'factorial(7)', expected: 5040 },
      { call: 'factorial(12)', expected: 479001600 },
      { call: 'factorial(13)', expected: 6227020800 },
      { call: 'factorial(17)', expected: 355687428096000 },
      { call: 'factorial(19)', expected: 121645100408832000 },
      { call: 'typeof factorial(6)', expected: 'number' },
    ],
  },
  'dsa-v1-d06-iterative-countdown': {
    solution:
      'function countdownSteps(n) {\n  const out = [];\n  for (let i = n; i >= 0; i -= 1) out.push(i);\n  return out;\n}',
    hiddenTests: [
      { call: 'countdownSteps(2)', expected: [2, 1, 0] },
      { call: 'countdownSteps(7).length', expected: 8 },
      {
        call: '(() => { const out = countdownSteps(10000); return [out[1], out[9999], out.length]; })()',
        expected: [9999, 1, 10001],
      },
      {
        call: '(() => { const first = countdownSteps(4); const second = countdownSteps(4); return first !== second; })()',
        expected: true,
      },
      {
        call: '(() => countdownSteps(4).every(function (one) { return typeof one === \'number\'; }))()',
        expected: true,
      },
      { call: '__stepsDownByOne(countdownSteps(10000))', expected: true },
      { call: '__callsToCountdown(10000)', expected: 1, criterion: 'no-recursion' },
      { call: '__callsToCountdown(1)', expected: 1, criterion: 'no-recursion' },
    ],
  },
};
