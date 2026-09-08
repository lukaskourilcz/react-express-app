/** Server-only reference solutions and hidden assertions for DSA D05.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions go after what the visible ones leave open: loose
 * equality standing in for `===`, a list rebuilt from its values instead of
 * rewired, a removal that mutates the list it was told to leave alone, and
 * node identity where the visible cases only compared values. */

import type { PathCodeSolution } from '../types';

export const DSA_D05_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d05-prepend-and-find': {
    solution:
      'const prepend = (head, value) => ({ value, next: head });\n\nconst find = (head, value) => {\n  let node = head;\n  while (node !== null) {\n    if (node.value === value) return node;\n    node = node.next;\n  }\n  return null;\n};',
    hiddenTests: [
      {
        call: '(() => { const head = __build([1, 2, 3]); prepend(head, 0); return __toArray(head); })()',
        expected: [1, 2, 3],
      },
      { call: "(() => __toArray(prepend(__build(['b']), 'a')))()", expected: ['a', 'b'] },
      {
        call: '(() => { const h = prepend(__build([2, 3]), 1); return [h.value, h.next.value, h.next.next.value, h.next.next.next]; })()',
        expected: [1, 2, 3, null],
      },
      { call: '(() => { const node = find(__build([1, 2, 3]), 3); return node.next; })()', expected: null },
      {
        call: "(() => { const head = __build([0, false, '']); return find(head, false) === head.next; })()",
        expected: true,
      },
      { call: "find(__build([1, 2, 3]), '2')", expected: null },
      { call: '(() => { const head = __build([5]); return find(head, 5) === head; })()', expected: true },
    ],
  },
  'dsa-v1-d05-delete-first-match': {
    solution:
      'const deleteFirst = (head, value) => {\n  if (head === null) return null;\n  if (head.value === value) return head.next;\n\n  let previous = head;\n  while (previous.next !== null) {\n    if (previous.next.value === value) {\n      previous.next = previous.next.next;\n      return head;\n    }\n    previous = previous.next;\n  }\n\n  return head;\n};',
    hiddenTests: [
      {
        call: '(() => { const head = __build([1, 2, 3]); const third = head.next.next; return deleteFirst(head, 2).next === third; })()',
        expected: true,
      },
      {
        call: '(() => { const head = __build([1, 2, 3]); const second = head.next; return deleteFirst(head, 1) === second; })()',
        expected: true,
      },
      { call: '(() => __toArray(deleteFirst(__build([0, 1]), false)))()', expected: [0, 1] },
      { call: "(() => __toArray(deleteFirst(__build(['a', 'b', 'a']), 'a')))()", expected: ['b', 'a'] },
      {
        call: '(() => { const head = __build([1, 2, 3]); deleteFirst(head, 9); return __toArray(head); })()',
        expected: [1, 2, 3],
      },
      {
        call: '(() => { const head = __build([1, 2]); const out = deleteFirst(head, 2); return out === head && out.next === null; })()',
        expected: true,
      },
      { call: '(() => __toArray(deleteFirst(__build([1, 2, 3, 4, 5]), 5)))()', expected: [1, 2, 3, 4] },
    ],
  },
  'dsa-v1-d05-reverse-list': {
    solution:
      'const reverseList = head => {\n  let previous = null;\n  let current = head;\n  while (current !== null) {\n    const rest = current.next;\n    current.next = previous;\n    previous = current;\n    current = rest;\n  }\n  return previous;\n};',
    hiddenTests: [
      { call: '(() => __toArray(reverseList(__build([1, 2, 3, 4, 5, 6]))))()', expected: [6, 5, 4, 3, 2, 1] },
      { call: "(() => __toArray(reverseList(__build(['a', 'b', 'c']))))()", expected: ['c', 'b', 'a'] },
      { call: '(() => { const head = __build([1, 2, 3]); const first = head; reverseList(head); return first.next; })()', expected: null },
      {
        call: '(() => { const head = __build([1, 2, 3, 4]); const last = head.next.next.next; return reverseList(head) === last; })()',
        expected: true,
        criterion: 'in-place-links',
      },
      {
        call: '__reusesNodes([1, 2, 3, 4, 5, 6, 7, 8], function (head) { return reverseList(head); })',
        expected: true,
        criterion: 'in-place-links',
      },
      {
        call: '__reusesNodes([2, 2, 2], function (head) { return reverseList(head); })',
        expected: true,
        criterion: 'in-place-links',
      },
    ],
  },
};
