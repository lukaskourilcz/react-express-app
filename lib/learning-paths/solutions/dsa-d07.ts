/** Server-only reference solutions and hidden assertions for DSA D07.
 * Never imported from client code, and never from `../catalog`.
 *
 * `dsa-v1-d07-binary-search` reuses the ordinary coding task
 * `js-binary-search`, so its reference solution and hidden tests stay with
 * that task and nothing for it belongs here.
 *
 * Hidden assertions target the shortcuts the visible tests leave open: a
 * mutated input, loose equality standing in for strict, a first index quietly
 * turned into a last one, and the run of sixty-four equal values where
 * finding any match and then walking left goes over the read budget. */

import type { PathCodeSolution } from '../types';

export const DSA_D07_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d07-linear-search': {
    solution:
      'const linearSearch = (values, target) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (values[index] === target) return index;\n  }\n  return -1;\n};',
    hiddenTests: [
      { call: 'linearSearch([1, 2, 3, 2, 1], 2)', expected: 1 },
      { call: 'linearSearch([0, -3, -3, 5], -3)', expected: 1 },
      { call: 'linearSearch([false, 0, 1], 0)', expected: 1 },
      { call: 'linearSearch([9, 9, 9, 9], 9)', expected: 0 },
      { call: 'linearSearch([1, 2, 3], 3)', expected: 2 },
      { call: '(() => { const values = [3, 1, 2]; linearSearch(values, 1); return values; })()', expected: [3, 1, 2] },
      {
        call: '__countReads([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function (view) { return linearSearch(view, 10); }).reads <= 10',
        expected: true,
        criterion: 'one-pass',
      },
      {
        call: '__countReads([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function (view) { return linearSearch(view, 2); }).reads <= 2',
        expected: true,
        criterion: 'one-pass',
      },
    ],
  },
  'dsa-v1-d07-first-occurrence': {
    solution:
      'const firstOccurrence = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length;\n\n  while (low < high) {\n    const middle = Math.floor((low + high) / 2);\n    if (sorted[middle] < target) low = middle + 1;\n    else high = middle;\n  }\n\n  return low < sorted.length && sorted[low] === target ? low : -1;\n};',
    hiddenTests: [
      { call: 'firstOccurrence([5], 5)', expected: 0 },
      { call: 'firstOccurrence([5], 4)', expected: -1 },
      { call: 'firstOccurrence([1, 1, 1, 1, 2], 2)', expected: 4 },
      { call: 'firstOccurrence([-9, -4, -4, 0, 3], -4)', expected: 1 },
      { call: 'firstOccurrence([1, 3, 5, 7], 2)', expected: -1 },
      { call: '(() => { const values = [1, 2, 2, 3]; firstOccurrence(values, 2); return values; })()', expected: [1, 2, 2, 3] },
      {
        call: '__countReads(__same64(), function (view) { return firstOccurrence(view, 5); }).result',
        expected: 0,
      },
      {
        call: '__countReads(__same64(), function (view) { return firstOccurrence(view, 5); }).reads <= 20',
        expected: true,
        criterion: 'logarithmic',
      },
    ],
  },
};
