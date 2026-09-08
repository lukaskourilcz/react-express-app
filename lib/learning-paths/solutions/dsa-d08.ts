/** Server-only reference solutions and hidden assertions for DSA D08.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible tests show the shape of each sort; the hidden ones close the
 * gaps they leave. A hard-coded `a - b` fails the descending comparator, a
 * sorted copy fails the mutation check, a merge sort that returns its input
 * fails the identity check, and the comparison counts are repeated on inputs
 * the learner never saw so a solution tuned to one fixture does not pass. */

import type { PathCodeSolution } from '../types';

export const DSA_D08_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d08-selection-sort': {
    solution:
      'const selectionSort = (values, compare) => {\n' +
      '  for (let start = 0; start < values.length - 1; start += 1) {\n' +
      '    let smallest = start;\n' +
      '    for (let index = start + 1; index < values.length; index += 1) {\n' +
      '      if (compare(values[index], values[smallest]) < 0) smallest = index;\n' +
      '    }\n' +
      '    if (smallest !== start) {\n' +
      '      const held = values[start];\n' +
      '      values[start] = values[smallest];\n' +
      '      values[smallest] = held;\n' +
      '    }\n' +
      '  }\n' +
      '  return values;\n' +
      '};',
    hiddenTests: [
      { call: 'selectionSort([8, 7, 6, 5, 4, 3, 2, 1], function (a, b) { return a - b; })', expected: [1, 2, 3, 4, 5, 6, 7, 8] },
      {
        call: 'selectionSort([1, 5, 3], function (a, b) { return b - a; })',
        expected: [5, 3, 1],
      },
      {
        call: 'selectionSort(["pear", "apple", "fig"], function (a, b) { return a < b ? -1 : a > b ? 1 : 0; })',
        expected: ['apple', 'fig', 'pear'],
      },
      {
        call: '(() => { const input = [3, 1, 2]; selectionSort(input, (a, b) => a - b); return input; })()',
        expected: [1, 2, 3],
      },
      {
        call: '__countCompares(__range(8), function (values, compare) { return selectionSort(values, compare); }).compares',
        expected: 28,
        criterion: 'selection-method',
      },
      {
        call: '__countCompares([5, 5, 5, 5, 5, 5, 5, 5], function (values, compare) { return selectionSort(values, compare); }).compares',
        expected: 28,
        criterion: 'selection-method',
      },
      {
        call: '__countCompares(__range(9), function (values, compare) { return selectionSort(values, compare); }).compares',
        expected: 36,
        criterion: 'selection-method',
      },
      {
        call: '__countCompares(__reversed(8), function (values, compare) { return selectionSort(values, compare); }).result',
        expected: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    ],
  },
  'dsa-v1-d08-insertion-sort': {
    solution:
      'const insertionSort = (values, compare) => {\n' +
      '  for (let i = 1; i < values.length; i += 1) {\n' +
      '    const current = values[i];\n' +
      '    let j = i - 1;\n' +
      '    while (j >= 0 && compare(values[j], current) > 0) {\n' +
      '      values[j + 1] = values[j];\n' +
      '      j -= 1;\n' +
      '    }\n' +
      '    values[j + 1] = current;\n' +
      '  }\n' +
      '  return values;\n' +
      '};',
    hiddenTests: [
      { call: 'insertionSort([8, 7, 6, 5, 4, 3, 2, 1], function (a, b) { return a - b; })', expected: [1, 2, 3, 4, 5, 6, 7, 8] },
      {
        call: 'insertionSort([1, 5, 3], function (a, b) { return b - a; })',
        expected: [5, 3, 1],
      },
      {
        call: 'insertionSort(["pear", "apple", "fig"], function (a, b) { return a < b ? -1 : a > b ? 1 : 0; })',
        expected: ['apple', 'fig', 'pear'],
      },
      {
        call: '(() => { const input = [3, 1, 2]; return insertionSort(input, (a, b) => a - b) === input && input.join() === "1,2,3"; })()',
        expected: true,
      },
      {
        call:
          '(() => { const items = [{ k: 2, t: "a" }, { k: 1, t: "b" }, { k: 2, t: "c" }, { k: 1, t: "d" }, { k: 2, t: "e" }, { k: 1, t: "f" }];' +
          ' return insertionSort(items, (a, b) => a.k - b.k).map(item => item.t).join(""); })()',
        expected: 'bdface',
      },
      {
        call: '__countCompares(__range(6), function (values, compare) { return insertionSort(values, compare); }).compares',
        expected: 5,
        criterion: 'insertion-method',
      },
      {
        call: '__countCompares(__reversed(6), function (values, compare) { return insertionSort(values, compare); }).compares',
        expected: 15,
        criterion: 'insertion-method',
      },
      {
        call: '__countCompares(__reversed(8), function (values, compare) { return insertionSort(values, compare); }).result',
        expected: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    ],
  },
  'dsa-v1-d08-merge-sort': {
    solution:
      'const merge = (left, right, compare) => {\n' +
      '  const out = [];\n' +
      '  let i = 0;\n' +
      '  let j = 0;\n' +
      '  while (i < left.length && j < right.length) {\n' +
      '    if (compare(left[i], right[j]) <= 0) {\n' +
      '      out.push(left[i]);\n' +
      '      i += 1;\n' +
      '    } else {\n' +
      '      out.push(right[j]);\n' +
      '      j += 1;\n' +
      '    }\n' +
      '  }\n' +
      '  while (i < left.length) {\n' +
      '    out.push(left[i]);\n' +
      '    i += 1;\n' +
      '  }\n' +
      '  while (j < right.length) {\n' +
      '    out.push(right[j]);\n' +
      '    j += 1;\n' +
      '  }\n' +
      '  return out;\n' +
      '};\n' +
      '\n' +
      'const mergeSort = (values, compare) => {\n' +
      '  if (values.length < 2) return values.slice();\n' +
      '  const middle = Math.floor(values.length / 2);\n' +
      '  const left = mergeSort(values.slice(0, middle), compare);\n' +
      '  const right = mergeSort(values.slice(middle), compare);\n' +
      '  return merge(left, right, compare);\n' +
      '};',
    hiddenTests: [
      { call: 'mergeSort([8, 7, 6, 5, 4, 3, 2, 1], function (a, b) { return a - b; })', expected: [1, 2, 3, 4, 5, 6, 7, 8] },
      {
        call: '(() => { const input = []; return mergeSort(input, (a, b) => a - b) !== input; })()',
        expected: true,
      },
      {
        call:
          '(() => { const input = [4, 1, 3, 2, 5]; const out = mergeSort(input, (a, b) => a - b);' +
          ' return out !== input && input.join() === "4,1,3,2,5" && out.join() === "1,2,3,4,5"; })()',
        expected: true,
      },
      {
        call: 'mergeSort([1, 5, 3], function (a, b) { return b - a; })',
        expected: [5, 3, 1],
      },
      {
        call:
          '(() => { const run = __countCompares(__range(16), function (values, compare) { return mergeSort(values, compare); });' +
          ' return run.compares === 32 && run.result.join() === __range(16).join(); })()',
        expected: true,
        criterion: 'merge-method',
      },
      {
        call:
          '(() => { const run = __countCompares(__reversed(8), function (values, compare) { return mergeSort(values, compare); });' +
          ' return run.compares >= 12 && run.compares <= 24 && run.result.join() === "1,2,3,4,5,6,7,8"; })()',
        expected: true,
        criterion: 'merge-method',
      },
      {
        call:
          '(() => { const run = __countCompares([4, 4, 2, 9, 2, 7, 4, 1], function (values, compare) { return mergeSort(values, compare); });' +
          ' return run.compares >= 12 && run.compares <= 24 && run.result.join() === "1,2,2,4,4,4,7,9"; })()',
        expected: true,
        criterion: 'merge-method',
      },
      {
        call:
          '__tags(mergeSort([{ key: 3, tag: "x" }, { key: 1, tag: "y" }, { key: 3, tag: "z" }, { key: 1, tag: "w" }], __byKey))',
        expected: 'ywxz',
        criterion: 'merge-method',
      },
    ],
  },
};
