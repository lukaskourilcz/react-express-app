/** Server-only reference solutions and hidden assertions for DSA D04.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions go after the shortcuts the visible tests leave open:
 * a stack whose storage is shared between instances, a queue that satisfies
 * the visible budget on 32 values but not on 64, a bracket checker that
 * counts characters instead of matching them, and the value shapes the
 * visible cases never used. */

import type { PathCodeSolution } from '../types';

export const DSA_D04_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d04-stack-api': {
    solution:
      'const createStack = () => {\n' +
      '  const items = [];\n' +
      '  return {\n' +
      '    push(value) {\n' +
      '      items.push(value);\n' +
      '    },\n' +
      '    pop() {\n' +
      '      return items.length === 0 ? null : items.pop();\n' +
      '    },\n' +
      '    peek() {\n' +
      '      return items.length === 0 ? null : items[items.length - 1];\n' +
      '    },\n' +
      '    size() {\n' +
      '      return items.length;\n' +
      '    },\n' +
      '  };\n' +
      '};',
    hiddenTests: [
      { call: '(() => { const s = createStack(); return s.size(); })()', expected: 0 },
      {
        call: '(() => { const s = createStack(); [1, 2, 3, 4, 5].forEach(v => s.push(v)); return [s.pop(), s.pop(), s.size()]; })()',
        expected: [5, 4, 3],
      },
      {
        call: '(() => { const s = createStack(); s.push(null); return [s.size(), s.pop(), s.size()]; })()',
        expected: [1, null, 0],
      },
      { call: '(() => { const s = createStack(); s.push({ id: 7 }); return s.pop(); })()', expected: { id: 7 } },
      {
        call: '(() => { const s = createStack(); s.push(1); return [s.peek(), s.peek(), s.peek(), s.size()]; })()',
        expected: [1, 1, 1, 1],
      },
      {
        call: "(() => { const s = createStack(); s.pop(); s.pop(); s.push('x'); return [s.size(), s.pop(), s.pop()]; })()",
        expected: [1, 'x', null],
        criterion: 'underflow',
      },
      {
        call: '(() => { const a = createStack(); a.push(1); const b = createStack(); return [b.size(), b.pop(), a.size()]; })()',
        expected: [0, null, 1],
      },
      {
        call: "(() => { const s = createStack(); s.push('a'); s.push('b'); s.pop(); return [s.peek(), s.size()]; })()",
        expected: ['a', 1],
      },
    ],
  },
  'dsa-v1-d04-head-index-queue': {
    solution:
      'const createQueue = () => {\n' +
      '  const items = newQueueBuffer();\n' +
      '  let head = 0;\n' +
      '\n' +
      '  return {\n' +
      '    enqueue(value) {\n' +
      '      items.push(value);\n' +
      '    },\n' +
      '    dequeue() {\n' +
      '      if (head >= items.length) return null;\n' +
      '      const value = items[head];\n' +
      '      items[head] = null;\n' +
      '      head += 1;\n' +
      '      return value;\n' +
      '    },\n' +
      '    size() {\n' +
      '      return items.length - head;\n' +
      '    },\n' +
      '  };\n' +
      '};',
    hiddenTests: [
      { call: '__measureQueue(32).size', expected: 0 },
      { call: '__measureQueue(48).out.length', expected: 48 },
      {
        call: '(() => { const q = createQueue(); q.enqueue(null); return [q.size(), q.dequeue(), q.size()]; })()',
        expected: [1, null, 0],
      },
      {
        call: '(() => { const a = createQueue(); const b = createQueue(); a.enqueue(1); a.enqueue(2); b.enqueue(9); return [a.dequeue(), b.dequeue(), a.size(), b.size()]; })()',
        expected: [1, 9, 1, 0],
      },
      { call: '(() => { const q = createQueue(); q.enqueue({ id: 3 }); return q.dequeue(); })()', expected: { id: 3 } },
      {
        call: '(() => { const q = createQueue(); [1, 2, 3].forEach(v => q.enqueue(v)); q.dequeue(); return [q.size(), q.dequeue(), q.dequeue(), q.dequeue()]; })()',
        expected: [2, 2, 3, null],
      },
      { call: '__measureQueue(64).ops <= 384', expected: true, criterion: 'constant-dequeue' },
      { call: '__measureQueue(64).buffers >= 1', expected: true, criterion: 'constant-dequeue' },
    ],
  },
  'dsa-v1-d04-balanced-brackets': {
    solution:
      'const isBalanced = text => {\n' +
      "  const partners = { ')': '(', ']': '[', '}': '{' };\n" +
      '  const open = [];\n' +
      '\n' +
      '  for (const character of text) {\n' +
      '    if (character in partners) {\n' +
      '      if (open.pop() !== partners[character]) return false;\n' +
      '    } else {\n' +
      '      open.push(character);\n' +
      '    }\n' +
      '  }\n' +
      '\n' +
      '  return open.length === 0;\n' +
      '};',
    hiddenTests: [
      { call: "isBalanced('{[()()]}')", expected: true },
      { call: "isBalanced('(()')", expected: false },
      { call: "isBalanced('())')", expected: false },
      { call: "isBalanced(']')", expected: false, edge: true },
      { call: "isBalanced('{[}]')", expected: false, criterion: 'nesting-order' },
      { call: "isBalanced('{}[]()'.repeat(4))", expected: true },
      { call: "isBalanced('('.repeat(20) + ')'.repeat(20))", expected: true },
      { call: "isBalanced('('.repeat(20) + ')'.repeat(19))", expected: false },
    ],
  },
};
