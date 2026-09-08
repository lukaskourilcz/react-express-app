/** Authored code-ordering puzzles for the JavaScript foundations (issue #154).
 *
 * Every puzzle is written for devShark against its own task: the blocks are the
 * repository's own reference solution broken at the lines that carry a decision,
 * plus a distractor that looks plausible and is wrong for a stated reason. The
 * content test assembles each accepted arrangement and runs it against the
 * task's real tests, so a puzzle that stops matching its task fails the build. */

import type { AuthoredPuzzle } from './types';

export const JAVASCRIPT_PUZZLES: AuthoredPuzzle[] = [
  {
    taskId: 'js-double-numbers',
    version: 1,
    competencies: ['read-code', 'choose-method', 'reject-distractor'],
    lines: [
      { id: 'sig', code: 'const double = numbers =>' },
      { id: 'map', code: 'numbers.map(number => number * 2);', indent: 1 },
      { id: 'foreach', code: 'numbers.forEach(number => number * 2);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'map']],
  },
  {
    taskId: 'js-even-numbers',
    version: 1,
    competencies: ['read-code', 'choose-method', 'reject-distractor'],
    lines: [
      { id: 'sig', code: 'const evens = numbers =>' },
      { id: 'filter', code: 'numbers.filter(number => number % 2 === 0);', indent: 1 },
      { id: 'map', code: 'numbers.map(number => number % 2 === 0);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'filter']],
  },
  {
    taskId: 'js-sum-array',
    version: 1,
    competencies: ['read-code', 'order-algorithm', 'reject-distractor'],
    lines: [
      { id: 'sig', code: 'const sum = numbers =>' },
      { id: 'reduce', code: 'numbers.reduce((total, number) => total + number, 0);', indent: 1 },
      { id: 'noseed', code: 'numbers.reduce((total, number) => total + number);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'reduce']],
  },
  {
    taskId: 'js-countdown',
    version: 1,
    competencies: ['order-algorithm', 'trace-control-flow'],
    lines: [
      { id: 'open', code: 'const countDown = n => {' },
      { id: 'result', code: 'const result = [];', indent: 1 },
      { id: 'loop', code: 'while (n > 0) result.push(n--);', indent: 1 },
      { id: 'return', code: 'return result;', indent: 1 },
      { id: 'close', code: '};' },
    ],
    accepted: [['open', 'result', 'loop', 'return', 'close']],
  },
  {
    taskId: 'js-reverse-string',
    version: 1,
    competencies: ['read-code', 'order-algorithm'],
    lines: [
      { id: 'sig', code: 'const reverse = text =>' },
      { id: 'body', code: '[...text].reverse().join("");', indent: 1 },
      { id: 'wrong', code: 'text.reverse().join("");', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'body']],
  },
  {
    taskId: 'js-count-vowels',
    version: 1,
    competencies: ['read-code', 'order-algorithm', 'choose-method'],
    lines: [
      { id: 'open', code: 'const countVowels = text => {' },
      { id: 'lower', code: 'const letters = [...text.toLowerCase()];', indent: 1 },
      { id: 'filter', code: 'const vowels = letters.filter(letter => "aeiou".includes(letter));', indent: 1 },
      { id: 'return', code: 'return vowels.length;', indent: 1 },
      { id: 'close', code: '};' },
    ],
    accepted: [['open', 'lower', 'filter', 'return', 'close']],
  },
  {
    taskId: 'js-unique-values',
    version: 1,
    competencies: ['read-code', 'choose-method'],
    lines: [
      { id: 'sig', code: 'const unique = values =>' },
      { id: 'set', code: '[...new Set(values)];', indent: 1 },
      { id: 'filterdup', code: 'values.filter(value => value);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'set']],
  },
  {
    taskId: 'js-largest-number',
    version: 1,
    competencies: ['read-code', 'choose-method'],
    lines: [
      { id: 'sig', code: 'const largest = numbers =>' },
      { id: 'max', code: 'Math.max(...numbers);', indent: 1 },
      { id: 'sorted', code: 'numbers.sort()[0];', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'max']],
  },
  {
    taskId: 'js-all-positive',
    version: 1,
    competencies: ['read-code', 'choose-method', 'reject-distractor'],
    lines: [
      { id: 'sig', code: 'const allPositive = numbers =>' },
      { id: 'every', code: 'numbers.every(number => number > 0);', indent: 1 },
      { id: 'some', code: 'numbers.some(number => number > 0);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'every']],
  },
  {
    taskId: 'js-has-adult',
    version: 1,
    competencies: ['read-code', 'choose-method', 'reject-distractor'],
    lines: [
      { id: 'sig', code: 'const hasAdult = ages =>' },
      { id: 'some', code: 'ages.some(age => age >= 18);', indent: 1 },
      { id: 'every', code: 'ages.every(age => age >= 18);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'some']],
  },
  {
    taskId: 'js-first-letters',
    version: 1,
    competencies: ['read-code', 'choose-method'],
    lines: [
      { id: 'sig', code: 'const firstLetters = words =>' },
      { id: 'map', code: 'words.map(word => word[0]);', indent: 1 },
      { id: 'filter', code: 'words.filter(word => word[0]);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'map']],
  },
  {
    taskId: 'js-total-price',
    version: 1,
    competencies: ['read-code', 'order-algorithm'],
    lines: [
      { id: 'sig', code: 'const total = items =>' },
      { id: 'reduce', code: 'items.reduce((sum, item) => sum + item.price, 0);', indent: 1 },
      { id: 'noprice', code: 'items.reduce((sum, item) => sum + item, 0);', indent: 1, distractor: true },
    ],
    accepted: [['sig', 'reduce']],
  },
];
