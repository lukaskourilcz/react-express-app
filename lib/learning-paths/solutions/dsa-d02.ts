/** Server-only reference solutions and hidden assertions for DSA D02.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions go after the shortcuts the visible tests leave open: a
 * reversed copy handed back instead of the original array, a case-insensitive
 * palindrome check, a compaction that never touches the caller's array, and
 * input shapes the visible cases never used. */

import type { PathCodeSolution } from '../types';

export const DSA_D02_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d02-reverse-in-place': {
    solution:
      'const reverseInPlace = values => {\n  let left = 0;\n  let right = values.length - 1;\n  while (left < right) {\n    const held = values[left];\n    values[left] = values[right];\n    values[right] = held;\n    left += 1;\n    right -= 1;\n  }\n  return values;\n};',
    hiddenTests: [
      { call: 'reverseInPlace([1, 2])', expected: [2, 1] },
      { call: 'reverseInPlace([\'a\', \'b\', \'c\'])', expected: ['c', 'b', 'a'] },
      {
        call: '(() => { const values = [1, 2, 3, 4, 5, 6, 7]; reverseInPlace(values); return values; })()',
        expected: [7, 6, 5, 4, 3, 2, 1],
        criterion: 'in-place',
      },
      {
        call: '(() => { const values = []; return reverseInPlace(values) === values; })()',
        expected: true,
        criterion: 'in-place',
      },
      {
        call: '(() => { const values = [9]; return reverseInPlace(values) === values; })()',
        expected: true,
        criterion: 'in-place',
      },
      {
        call: '__countWrites([1, 2, 3, 4, 5, 6, 7, 8], function (view) { return reverseInPlace(view); }).values',
        expected: [8, 7, 6, 5, 4, 3, 2, 1],
      },
      {
        call: '__countWrites([1, 2, 3, 4, 5, 6, 7, 8], function (view) { return reverseInPlace(view); }).same',
        expected: true,
        criterion: 'in-place',
      },
      {
        call: '__countWrites([1, 2, 3, 4, 5, 6, 7], function (view) { return reverseInPlace(view); }).writes <= 7',
        expected: true,
        criterion: 'in-place',
      },
    ],
  },
  'dsa-v1-d02-palindrome-two-pointer': {
    solution:
      'const isPalindrome = text => {\n  let left = 0;\n  let right = text.length - 1;\n  while (left < right) {\n    if (text[left] !== text[right]) return false;\n    left += 1;\n    right -= 1;\n  }\n  return true;\n};',
    hiddenTests: [
      { call: 'isPalindrome(\'a\')', expected: true },
      { call: 'isPalindrome(\'ab\')', expected: false },
      { call: 'isPalindrome(\'aa\')', expected: true },
      { call: 'isPalindrome(\'aBBa\')', expected: true },
      { call: 'isPalindrome(\'AbBA\')', expected: false },
      { call: 'isPalindrome(\'0110\')', expected: true },
      { call: 'isPalindrome(\'abcdefghihgfedcba\')', expected: true },
      { call: 'isPalindrome(\'abcdefghihgfedcbb\')', expected: false },
    ],
  },
  'dsa-v1-d02-dedupe-sorted': {
    solution:
      'const removeDuplicatesSorted = sorted => {\n  if (sorted.length === 0) return 0;\n  let write = 1;\n  for (let read = 1; read < sorted.length; read += 1) {\n    if (sorted[read] !== sorted[write - 1]) {\n      sorted[write] = sorted[read];\n      write += 1;\n    }\n  }\n  return write;\n};',
    hiddenTests: [
      { call: 'removeDuplicatesSorted([1])', expected: 1 },
      { call: 'removeDuplicatesSorted([2, 2])', expected: 1 },
      { call: 'removeDuplicatesSorted([-2, -2, -1, 0, 0, 0, 4, 4])', expected: 4 },
      {
        call: '(() => { const values = [5, 5, 5, 5]; const length = removeDuplicatesSorted(values); return values.slice(0, length); })()',
        expected: [5],
        criterion: 'in-place',
      },
      {
        call: '(() => { const values = [-2, -2, -1, 0, 0, 0, 4, 4]; const length = removeDuplicatesSorted(values); return values.slice(0, length); })()',
        expected: [-2, -1, 0, 4],
        criterion: 'in-place',
      },
      {
        call: '(() => { const values = [1, 1, 2]; const length = removeDuplicatesSorted(values); return [length, values[0], values[1]]; })()',
        expected: [2, 1, 2],
        criterion: 'in-place',
      },
      {
        call: '__countWrites([1, 2, 3, 4, 5], function (view) { return removeDuplicatesSorted(view); }).values',
        expected: [1, 2, 3, 4, 5],
      },
      {
        call: '__countWrites([7, 7, 7, 7, 7, 7], function (view) { return removeDuplicatesSorted(view); }).writes <= 6',
        expected: true,
        criterion: 'in-place',
      },
    ],
  },
};
