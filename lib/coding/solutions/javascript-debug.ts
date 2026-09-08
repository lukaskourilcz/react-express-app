/** Reference repairs for the JavaScript debugging tasks. Server-only.
 *
 * Each one is the smallest change that fixes the stated behaviour, because
 * that is what the task asks for: a debugging exercise whose reference answer
 * rewrites the function teaches rewriting, not debugging. The hidden tests
 * check the same behaviour from angles the visible ones do not. */

import type { CodingSolution } from '../types';

export const JAVASCRIPT_DEBUG_SOLUTIONS: Record<string, CodingSolution> = {
  'js-debug-average': {
    solution: `const average = numbers => {
  if (numbers.length === 0) return 0;
  const total = numbers.reduce((sum, number) => sum + number, 0);
  return total / numbers.length;
};`,
    hiddenTests: [
      { call: 'average([0])', expected: 0 },
      { call: 'average([1, 2, 3, 4])', expected: 2.5 },
      { call: 'Number.isNaN(average([]))', expected: false, label: 'the empty case is a number, not NaN' },
    ],
  },
  'js-debug-tally': {
    solution: `const tally = words => {
  const counts = new Map();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
};`,
    hiddenTests: [
      { call: '[...tally(["a", "a", "b", "a"]).entries()]', expected: [['a', 3], ['b', 1]] },
      { call: 'tally(["a", "a"]).get("a")', expected: 2 },
      { call: 'tally(["a"]) instanceof Map', expected: true },
    ],
  },
  'js-debug-remove-item': {
    solution: `const without = (items, unwanted) => items.filter(item => item !== unwanted);`,
    hiddenTests: [
      { call: 'without(["a", "a", "a"], "a")', expected: [] },
      {
        call: '(() => { const source = ["a", "b", "a"]; const out = without(source, "a"); return [source.length, out.length]; })()',
        expected: [3, 1],
        label: 'the original keeps its length',
      },
      {
        call: '(() => { const source = ["a"]; return without(source, "b") === source; })()',
        expected: false,
        label: 'a new array comes back even when nothing was removed',
      },
    ],
  },
  'js-debug-first-match': {
    solution: `const firstLongerThan = (words, length) => {
  for (const word of words) {
    if (word.length > length) return word;
  }
  return null;
};`,
    hiddenTests: [
      { call: 'firstLongerThan(["aa", "bbb", "cccc"], 1)', expected: 'aa' },
      { call: 'firstLongerThan(["a", "b"], 0)', expected: 'a' },
      { call: 'firstLongerThan(["abc"], 3)', expected: null, label: 'longer than means strictly longer' },
    ],
  },
};
