/** Server-only reference solutions and hidden assertions for DSA D10, the
 * final assessment. Never imported from client code, and never from
 * `../catalog`.
 *
 * The hidden assertions target what the visible tests leave open: a hard-coded
 * return, an index that shares state between two builds, an accumulator reused
 * across calls, a mutated input, and read budgets on inputs the visible cases
 * never used. */

import type { PathCodeSolution } from '../types';

export const DSA_D10_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d10-record-index': {
    solution: [
      'const buildIndex = records => {',
      '  const lookup = id => {',
      '    let low = 0;',
      '    let high = records.length - 1;',
      '    while (low <= high) {',
      '      const middle = Math.floor((low + high) / 2);',
      '      const record = records[middle];',
      '      if (record.id === id) return record;',
      '      if (record.id < id) low = middle + 1;',
      '      else high = middle - 1;',
      '    }',
      '    return null;',
      '  };',
      '  return { lookup };',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: "(() => { const index = buildIndex([{ id: 2, name: 'a' }, { id: 4, name: 'b' }, { id: 6, name: 'c' }, { id: 8, name: 'd' }]); return [index.lookup(2).name, index.lookup(8).name, index.lookup(3), index.lookup(9)]; })()",
        expected: ['a', 'd', null, null],
      },
      {
        call: "(() => { const index = buildIndex([{ id: 1, name: 'x' }, { id: 2, name: 'y' }]); return [index.lookup(2).name, index.lookup(2).name, index.lookup(1).name]; })()",
        expected: ['y', 'y', 'x'],
      },
      {
        call: "(() => { const records = [{ id: 1, name: 'a' }, { id: 5, name: 'b' }, { id: 9, name: 'c' }]; const before = JSON.stringify(records); const index = buildIndex(records); index.lookup(9); index.lookup(4); return JSON.stringify(records) === before; })()",
        expected: true,
      },
      {
        call: "(() => { const index = buildIndex([{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }, { id: 4, name: 'd' }, { id: 5, name: 'e' }, { id: 6, name: 'f' }]); return [index.lookup(6).name, index.lookup(1).name, index.lookup(4).name]; })()",
        expected: ['f', 'a', 'd'],
      },
      {
        call: "(() => { const first = buildIndex([{ id: 1, name: 'a' }]); const second = buildIndex([{ id: 2, name: 'b' }]); return [first.lookup(2), second.lookup(1), first.lookup(1).name, second.lookup(2).name]; })()",
        expected: [null, null, 'a', 'b'],
      },
      {
        call: '__lookupReads(__records64(), buildIndex, [104, 348, 99, 353]).names',
        expected: ['rec-01', 'rec-62', null, null],
      },
      {
        call: '__lookupReads(__records64(), buildIndex, [99, 353, 250]).reads <= 60',
        expected: true,
        criterion: 'logarithmic-lookup',
      },
      {
        call: "__buildReads([{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }], buildIndex) <= 2",
        expected: true,
        criterion: 'logarithmic-lookup',
      },
    ],
  },
  'dsa-v1-d10-repair-traversal': {
    solution: [
      'const levelOrder = root => {',
      '  if (root === null) return [];',
      '  const out = [];',
      '  const queue = [root];',
      '  let head = 0;',
      '  while (head < queue.length) {',
      '    const node = queue[head];',
      '    head += 1;',
      '    out.push(node.value);',
      '    if (node.left !== null) queue.push(node.left);',
      '    if (node.right !== null) queue.push(node.right);',
      '  }',
      '  return out;',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: '(() => { const tree = __build([1, 2, 3, null, 4, 5, null]); return levelOrder(tree); })()',
        expected: [1, 2, 3, 4, 5],
      },
      {
        call: "(() => { const tree = __chain([9, 8, 7, 6, 5], 'right'); return levelOrder(tree); })()",
        expected: [9, 8, 7, 6, 5],
      },
      {
        call: '(() => { const first = levelOrder(null); first.push(99); return levelOrder(null); })()',
        expected: [],
      },
      {
        call: '(() => { const tree = __build([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]); return levelOrder(tree); })()',
        expected: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      {
        call: '(() => { const tree = __build([5, 3, 8, 2, null, null, 9, 1]); return levelOrder(tree); })()',
        expected: [5, 3, 8, 2, 9, 1],
      },
      {
        call: '(() => { const tree = __build([1, 2, 3, 4, 5]); const first = levelOrder(tree); first.push(0); return levelOrder(tree); })()',
        expected: [1, 2, 3, 4, 5],
      },
    ],
  },
  'dsa-v1-d10-frequency-index': {
    solution: [
      'const mostFrequent = (values, queries) => {',
      '  const counts = new Map();',
      '  for (const value of values) {',
      '    const seen = counts.get(value);',
      '    counts.set(value, seen === undefined ? 1 : seen + 1);',
      '  }',
      '  return queries.map(query => {',
      '    const count = counts.get(query);',
      '    return count === undefined ? 0 : count;',
      '  });',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: '__countReads(__pool50(), function (view) { return mostFrequent(view, __queries40()); }).result',
        expected: [
          8, 7, 7, 7, 7, 7, 7, 0, 0, 0,
          8, 7, 7, 7, 7, 7, 7, 0, 0, 0,
          8, 7, 7, 7, 7, 7, 7, 0, 0, 0,
          8, 7, 7, 7, 7, 7, 7, 0, 0, 0,
        ],
      },
      { call: "mostFrequent(['x'], ['x', 'x', 'x'])", expected: [1, 1, 1] },
      { call: 'mostFrequent([5, 5, 5, 5], [5, 4])', expected: [4, 0] },
      {
        call: "(() => { const values = ['a', 'b', 'a']; const queries = ['a', 'b']; const before = JSON.stringify([values, queries]); mostFrequent(values, queries); return JSON.stringify([values, queries]) === before; })()",
        expected: true,
      },
      {
        call: "mostFrequent([true, 1, 'true'], [true, 1, 'true', false])",
        expected: [1, 1, 1, 0],
      },
      {
        call: "__countReads(['a', 'b', 'a', 'a'], function (view) { return mostFrequent(view, ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c']); }).reads <= 16",
        expected: true,
        criterion: 'preprocessed',
      },
      {
        call: "mostFrequent(['a', 'b'], ['b', 'a', 'b'])",
        expected: [1, 1, 1],
      },
    ],
  },
};
