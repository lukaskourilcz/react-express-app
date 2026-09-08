/** Server-only reference solutions and hidden assertions for DSA D01.
 * Never imported from client code, and never from `../catalog`.
 *
 * Hidden assertions target the shortcut the visible tests leave open: a
 * hard-coded return, a second traversal that the visible read budget happened
 * not to catch, or an input shape the visible cases never used. */

import type { PathCodeSolution } from '../types';

export const DSA_D01_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d01-linear-accumulator': {
    solution:
      'const sumOfEvens = values => {\n  let total = 0;\n  for (const value of values) {\n    if (value % 2 === 0) total += value;\n  }\n  return total;\n};',
    hiddenTests: [
      { call: 'sumOfEvens([0])', expected: 0 },
      { call: 'sumOfEvens([2, 2, 2, 2, 2])', expected: 10 },
      { call: 'sumOfEvens([1000000, 1, -1000000])', expected: 0 },
      { call: 'sumOfEvens([-2, -4, -6])', expected: -12 },
      {
        call: '__countReads([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], function (view) { return sumOfEvens(view); }).result',
        expected: 110,
      },
      {
        call: '__countReads([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], function (view) { return sumOfEvens(view); }).reads <= 10',
        expected: true,
        criterion: 'single-pass',
      },
      {
        call: '__countReads([1, 1, 1], function (view) { return sumOfEvens(view); }).reads <= 3',
        expected: true,
        criterion: 'single-pass',
      },
    ],
  },
  'dsa-v1-d01-halving-counter': {
    solution:
      'const halvingSteps = n => {\n  let steps = 0;\n  let value = n;\n  while (value > 1) {\n    value = Math.floor(value / 2);\n    steps += 1;\n  }\n  return steps;\n};',
    hiddenTests: [
      { call: 'halvingSteps(3)', expected: 1 },
      { call: 'halvingSteps(7)', expected: 2 },
      { call: 'halvingSteps(16)', expected: 4 },
      { call: 'halvingSteps(17)', expected: 4 },
      { call: 'halvingSteps(31)', expected: 4 },
      { call: 'halvingSteps(32)', expected: 5 },
      { call: 'halvingSteps(1000000)', expected: 19 },
    ],
  },
  'dsa-v1-d01-pair-versus-pass': {
    solution:
      'const maxGap = values => {\n  if (values.length < 2) return 0;\n  let smallest = values[0];\n  let largest = values[0];\n  for (const value of values) {\n    if (value < smallest) smallest = value;\n    if (value > largest) largest = value;\n  }\n  return largest - smallest;\n};',
    hiddenTests: [
      { call: 'maxGap([1, 2])', expected: 1 },
      { call: 'maxGap([-5, 5])', expected: 10 },
      { call: 'maxGap([10, 2, 8, 2, 10])', expected: 8 },
      { call: 'maxGap([0, 0, 0, 1])', expected: 1 },
      {
        call: '__countReads([9, 1, 8, 2, 7, 3, 6, 4, 5], function (view) { return maxGap(view); }).result',
        expected: 8,
      },
      {
        call: '__countReads([9, 1, 8, 2, 7, 3, 6, 4, 5], function (view) { return maxGap(view); }).reads <= 18',
        expected: true,
        criterion: 'linear-budget',
      },
      {
        call: '__countReads([5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6], function (view) { return maxGap(view); }).reads <= 24',
        expected: true,
        criterion: 'linear-budget',
      },
    ],
  },
};
