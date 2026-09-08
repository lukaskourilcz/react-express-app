/** Server-only reference solutions and hidden assertions for DSA D03.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions target what the visible tests leave open: a
 * hard-coded return, counting into a plain object instead of a Map (which
 * merges `0` with `'0'` and reorders integer-like keys), a comparison built on
 * `indexOf` (which cannot find `NaN`), and returning one of the inputs
 * instead of a fresh array. */

import type { PathCodeSolution } from '../types';

export const DSA_D03_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d03-frequency-map': {
    solution:
      'const countFrequencies = values => {\n  const counts = new Map();\n  for (const value of values) {\n    counts.set(value, (counts.get(value) || 0) + 1);\n  }\n  return counts;\n};',
    hiddenTests: [
      { call: '(() => [...countFrequencies([true, false, true, true]).entries()])()', expected: [[true, 3], [false, 1]] },
      { call: 'countFrequencies([NaN, NaN, 5]).get(NaN)', expected: 2 },
      {
        call: "(() => [...countFrequencies(['b', 'a', 'b', 'c', 'a', 'b']).entries()])()",
        expected: [['b', 3], ['a', 2], ['c', 1]],
      },
      {
        call: "(() => { const m = countFrequencies(['a']); return [m instanceof Map, m.size, m.get('a'), m.get('z') === undefined]; })()",
        expected: [true, 1, 1, true],
      },
      {
        call: '(() => [...countFrequencies([1, 2, 3]).keys()])()',
        expected: [1, 2, 3],
        criterion: 'first-appearance-order',
      },
      {
        call: '(() => [...countFrequencies([100, 5, 100, 1, 5]).keys()])()',
        expected: [100, 5, 1],
        criterion: 'first-appearance-order',
      },
      {
        call: "(() => [...countFrequencies(['2', 2, '2', 2, 2]).entries()])()",
        expected: [['2', 2], [2, 3]],
        criterion: 'first-appearance-order',
      },
    ],
  },
  'dsa-v1-d03-first-unique': {
    solution:
      'const firstUnique = values => {\n  const counts = new Map();\n  for (const value of values) {\n    counts.set(value, (counts.get(value) || 0) + 1);\n  }\n  for (const value of values) {\n    if (counts.get(value) === 1) return value;\n  }\n  return null;\n};',
    hiddenTests: [
      { call: 'firstUnique([1, 2, 3])', expected: 1 },
      { call: 'firstUnique([NaN, 8, NaN])', expected: 8 },
      { call: "firstUnique([0, '0', 0])", expected: '0' },
      { call: "firstUnique(['x', 'y', 'x', 'y', 'z', 'z', 'q'])", expected: 'q' },
      { call: 'firstUnique([5, 5, 5, 5])', expected: null },
      { call: 'firstUnique([true, 1, true])', expected: 1 },
      { call: "firstUnique(['solo'])", expected: 'solo' },
    ],
  },
  'dsa-v1-d03-set-intersection': {
    solution:
      'const intersection = (left, right) => {\n  const pool = new Set(right);\n  const taken = new Set();\n  const out = [];\n  for (const value of left) {\n    if (pool.has(value) && !taken.has(value)) {\n      taken.add(value);\n      out.push(value);\n    }\n  }\n  return out;\n};',
    hiddenTests: [
      {
        call: '(() => { const a = [1, 2, 3]; const b = [2, 3, 4]; intersection(a, b); return [a, b]; })()',
        expected: [[1, 2, 3], [2, 3, 4]],
      },
      { call: '(() => { const a = [1, 2]; return intersection(a, [1, 2]) === a; })()', expected: false },
      { call: 'intersection([], [])', expected: [] },
      { call: "intersection([0, '0'], ['0'])", expected: ['0'] },
      { call: 'intersection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [10, 9, 1])', expected: [1, 9, 10] },
      { call: 'intersection([3, 2, 1], [1, 2, 3])', expected: [3, 2, 1], criterion: 'duplicate-free' },
      { call: 'intersection([9, 8, 7, 8, 9], [8, 9])', expected: [9, 8], criterion: 'duplicate-free' },
      { call: 'intersection([true, 1], [1, true, 1])', expected: [true, 1], criterion: 'duplicate-free' },
    ],
  },
};
