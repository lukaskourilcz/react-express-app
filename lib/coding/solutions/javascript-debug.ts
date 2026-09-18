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
    junior: `const average = numbers => {
  if (numbers.length === 0) {
    return 0;
  }
  let total = 0;
  for (let index = 0; index < numbers.length; index += 1) {
    total = total + numbers[index];
  }
  const mean = total / numbers.length;
  return mean;
};`,
    senior: `// A running mean folds each value in as it arrives, so there is no total to divide and nothing to divide by zero.
const average = numbers => numbers.reduce((mean, number, index) => mean + (number - mean) / (index + 1), 0);`,
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
    junior: `const tally = words => {
  const counts = new Map();
  for (const word of words) {
    if (counts.has(word)) {
      const previous = counts.get(word);
      counts.set(word, previous + 1);
    } else {
      counts.set(word, 1);
    }
  }
  return counts;
};`,
    senior: `// Map.set returns the map itself, which is what lets the reducer hand it straight back.
const tally = words => words.reduce((counts, word) => counts.set(word, (counts.get(word) ?? 0) + 1), new Map());`,
    hiddenTests: [
      { call: '[...tally(["a", "a", "b", "a"]).entries()]', expected: [['a', 3], ['b', 1]] },
      { call: 'tally(["a", "a"]).get("a")', expected: 2 },
      { call: 'tally(["a"]) instanceof Map', expected: true },
    ],
  },
  'js-debug-remove-item': {
    solution: `const without = (items, unwanted) => items.filter(item => item !== unwanted);`,
    junior: `const without = (items, unwanted) => {
  const kept = [];
  for (const item of items) {
    if (item !== unwanted) {
      kept.push(item);
    }
  }
  return kept;
};`,
    senior: `// filter builds a new array, so the caller's list is never touched; reject names the intent the positive way round.
const reject = (items, predicate) => items.filter(item => !predicate(item));

const without = (items, unwanted) => reject(items, item => item === unwanted);`,
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
    junior: `const firstLongerThan = (words, length) => {
  let found = null;
  let index = 0;
  while (index < words.length && found === null) {
    const word = words[index];
    if (word.length > length) {
      found = word;
    }
    index = index + 1;
  }
  return found;
};`,
    senior: `// find gives undefined when nothing matches; ?? turns that into the null the contract promises.
const firstLongerThan = (words, length) => words.find(word => word.length > length) ?? null;`,
    hiddenTests: [
      { call: 'firstLongerThan(["aa", "bbb", "cccc"], 1)', expected: 'aa' },
      { call: 'firstLongerThan(["a", "b"], 0)', expected: 'a' },
      { call: 'firstLongerThan(["abc"], 3)', expected: null, label: 'longer than means strictly longer' },
    ],
  },
};
