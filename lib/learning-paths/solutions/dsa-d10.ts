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
      { call: "(() => {const records=Object.freeze([Object.freeze({id:-1.5,name:\"a\"}),Object.freeze({id:0.25,name:\"b\"}),Object.freeze({id:9,name:\"c\"})]);const index=buildIndex(records);return [index.lookup(0.25)===records[1],index.lookup(-1.5)===records[0],index.lookup(0.5)];})()", expected: [true, true, null] },
      { call: "(() => {const snap=items=>items.map(item=>[item,Object.getPrototypeOf(item),Object.getOwnPropertyDescriptors(item)]);const unchanged=before=>before.every(([item,p,d])=>Object.getPrototypeOf(item)===p&&Reflect.ownKeys(item).length===Reflect.ownKeys(d).length&&Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(item,k);return b&&Object.is(a.value,b.value)&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}));const records=[{id:1,name:\"a\"},{id:3,name:\"b\"}];const before=snap([records,...records]);const index=buildIndex(records);index.lookup(3);index.lookup(2);return unchanged(before);})()", expected: true },
      { call: "(() => {const records=__records64();const ids=[99,353,250,...records.map(r=>r.id)];return ids.every(id=>__lookupReads(records,buildIndex,[id]).reads<=20);})()", expected: true, criterion: "logarithmic-lookup" },
      { call: "(() => {const records=Object.freeze(Array.from({length:1024},(_,i)=>Object.freeze({id:i/2,name:String(i)})));const index=buildIndex(records);return [index.lookup(0)===records[0],index.lookup(511.5)===records[1023],index.lookup(0.25),index.lookup(512)];})()", expected: [true, true, null, null] },
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
      { call: "(() => {const snap=items=>items.map(item=>[item,Object.getPrototypeOf(item),Object.getOwnPropertyDescriptors(item)]);const unchanged=before=>before.every(([item,p,d])=>Object.getPrototypeOf(item)===p&&Reflect.ownKeys(item).length===Reflect.ownKeys(d).length&&Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(item,k);return b&&Object.is(a.value,b.value)&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}));const tree=__build([0,-1.5,0,null,2.25]);const all=[tree,tree.left,tree.right,tree.left.right];const before=snap(all);const result=levelOrder(tree);return [result,unchanged(before)];})()", expected: [[0, -1.5, 0, 2.25], true] },
      { call: "(() => {const t=__chain(Array.from({length:128},(_,i)=>i),\"right\");const freeze=n=>{if(!n)return;freeze(n.left);freeze(n.right);Object.freeze(n);};freeze(t);return levelOrder(t);})()", expected: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127] },
      { call: "(() => {const a=levelOrder(__leaf(7)),b=levelOrder(null),c=levelOrder(__leaf(8));return a!==b&&a!==c&&b!==c&&a.length===1&&a[0]===7&&b.length===0&&c[0]===8;})()", expected: true },
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
      { call: "(() => {const a={},b={},fn=()=>{},symbol=Symbol(\"x\");return mostFrequent([NaN,NaN,-0,0,a,b,a,fn,symbol],[NaN,+0,-0,a,b,{},fn,()=>{},symbol,Symbol(\"x\")]);})()", expected: [2, 2, 2, 2, 1, 0, 1, 0, 1, 0] },
      { call: "mostFrequent([\"__proto__\",\"constructor\",\"toString\",\"__proto__\",undefined,null,false],[\"__proto__\",\"constructor\",\"toString\",undefined,null,false])", expected: [2, 1, 1, 1, 1, 1] },
      { call: "(() => {const snap=items=>items.map(item=>[item,Object.getPrototypeOf(item),Object.getOwnPropertyDescriptors(item)]);const unchanged=before=>before.every(([item,p,d])=>Object.getPrototypeOf(item)===p&&Reflect.ownKeys(item).length===Reflect.ownKeys(d).length&&Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(item,k);return b&&Object.is(a.value,b.value)&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}));const item={id:1};const values=[item,item,0],queries=[item,0,{}];const before=snap([values,queries,item,queries[2]]);const result=mostFrequent(values,queries);return [result,unchanged(before)];})()", expected: [[2, 1, 0], true] },
      { call: "(() => {const values=Object.freeze(Array.from({length:1000},(_,i)=>i%10));const queries=Object.freeze(Array.from({length:1000},(_,i)=>i%20));const result=mostFrequent(values,queries);return result.length===1000&&result.every((n,i)=>n===(i%20<10?100:0));})()", expected: true },
      { call: "(() => {const a=mostFrequent([1],[1]),b=mostFrequent([],[]),c=mostFrequent([2],[2]);return a!==b&&a!==c&&b!==c&&a.length===1&&a[0]===1&&b.length===0&&c[0]===1;})()", expected: true },
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
