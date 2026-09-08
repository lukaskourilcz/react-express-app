/** Server-only reference solutions and hidden assertions for DSA D09.
 * Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions target what the visible ones leave open: a hard-coded
 * answer for the one tree the visible tests use, a height that only works when
 * both subtrees are the same depth, a traversal that quietly mutates the tree,
 * a search that returns the value instead of the node, and a search that finds
 * the right node by reading every node in the tree. */

import type { PathCodeSolution } from '../types';

export const DSA_D09_SOLUTIONS: Record<string, PathCodeSolution> = {
  'dsa-v1-d09-height-and-size': {
    solution: [
      'const treeSize = root => {',
      '  if (root === null) return 0;',
      '  return 1 + treeSize(root.left) + treeSize(root.right);',
      '};',
      '',
      'const treeHeight = root => {',
      '  if (root === null) return -1;',
      '  return 1 + Math.max(treeHeight(root.left), treeHeight(root.right));',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]); return [treeSize(t), treeHeight(t)]; })()',
        expected: [15, 3],
      },
      {
        call: '(() => { const t = __chain([1, 2, 3, 4, 5, 6, 7, 8], "left"); return [treeSize(t), treeHeight(t)]; })()',
        expected: [8, 7],
      },
      {
        call: '(() => { const t = __build([10, null, 20, null, null, null, 30]); return [treeSize(t), treeHeight(t)]; })()',
        expected: [3, 2],
      },
      {
        call: '(() => { const t = { value: 1, left: __chain([2, 3, 4], "left"), right: __leaf(5) }; return [treeSize(t), treeHeight(t)]; })()',
        expected: [5, 3],
      },
      {
        call: '(() => { const t = __leaf(0); return [treeSize(t), treeHeight(t)]; })()',
        expected: [1, 0],
      },
      {
        call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); treeSize(t); treeHeight(t); return [__preorder(t), __inorder(t)]; })()',
        expected: [[4, 2, 1, 3, 7, 9], [1, 2, 3, 4, 7, 9]],
      },
      {
        call: '(() => { const t = __build([5, 3]); return [treeSize(t), treeHeight(t)]; })()',
        expected: [2, 1],
      },
    ],
  },
  'dsa-v1-d09-traversals': {
    solution: [
      'const walkInorder = (node, out) => {',
      '  if (node === null) return out;',
      '  walkInorder(node.left, out);',
      '  out.push(node.value);',
      '  walkInorder(node.right, out);',
      '  return out;',
      '};',
      '',
      'const walkPreorder = (node, out) => {',
      '  if (node === null) return out;',
      '  out.push(node.value);',
      '  walkPreorder(node.left, out);',
      '  walkPreorder(node.right, out);',
      '  return out;',
      '};',
      '',
      'const walkPostorder = (node, out) => {',
      '  if (node === null) return out;',
      '  walkPostorder(node.left, out);',
      '  walkPostorder(node.right, out);',
      '  out.push(node.value);',
      '  return out;',
      '};',
      '',
      'const inorder = root => walkInorder(root, []);',
      'const preorder = root => walkPreorder(root, []);',
      'const postorder = root => walkPostorder(root, []);',
      '',
      'const levelOrder = root => {',
      '  if (root === null) return [];',
      '',
      '  const out = [];',
      '  const queue = [root];',
      '  let head = 0;',
      '',
      '  while (head < queue.length) {',
      '    const node = queue[head];',
      '    head += 1;',
      '    out.push(node.value);',
      '    if (node.left !== null) queue.push(node.left);',
      '    if (node.right !== null) queue.push(node.right);',
      '  }',
      '',
      '  return out;',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]); return preorder(t); })()',
        expected: [8, 4, 2, 1, 3, 6, 5, 7, 12, 10, 9, 11, 14, 13, 15],
      },
      {
        call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]); return inorder(t); })()',
        expected: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      {
        call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]); return postorder(t); })()',
        expected: [1, 3, 2, 5, 7, 6, 4, 9, 11, 10, 13, 15, 14, 12, 8],
      },
      {
        call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]); return levelOrder(t); })()',
        expected: [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15],
      },
      {
        call: '(() => { const t = __chain([1, 2, 3, 4], "left"); return [inorder(t), preorder(t), postorder(t), levelOrder(t)]; })()',
        expected: [[4, 3, 2, 1], [1, 2, 3, 4], [4, 3, 2, 1], [1, 2, 3, 4]],
      },
      {
        call: '(() => { const t = __build([1, null, 2]); return [inorder(t), preorder(t), postorder(t), levelOrder(t)]; })()',
        expected: [[1, 2], [1, 2], [2, 1], [1, 2]],
      },
      {
        call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); inorder(t); preorder(t); postorder(t); levelOrder(t); return [__preorder(t), __inorder(t)]; })()',
        expected: [[4, 2, 1, 3, 7, 9], [1, 2, 3, 4, 7, 9]],
      },
    ],
  },
  'dsa-v1-d09-bst-search-insert': {
    solution: [
      'const bstInsert = (root, value) => {',
      '  if (root === null) return { value, left: null, right: null };',
      '',
      '  let node = root;',
      '  while (true) {',
      '    if (value < node.value) {',
      '      if (node.left === null) {',
      '        node.left = { value, left: null, right: null };',
      '        return root;',
      '      }',
      '      node = node.left;',
      '    } else {',
      '      if (node.right === null) {',
      '        node.right = { value, left: null, right: null };',
      '        return root;',
      '      }',
      '      node = node.right;',
      '    }',
      '  }',
      '};',
      '',
      'const bstSearch = (root, value) => {',
      '  let node = root;',
      '',
      '  while (node !== null) {',
      '    if (value === node.value) return node;',
      '    node = value < node.value ? node.left : node.right;',
      '  }',
      '',
      '  return null;',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: '(() => { const t = __build([8, 4, 12]); return bstSearch(t, 4) === t.left; })()',
        expected: true,
      },
      {
        call: '(() => { let t = null; for (const v of [50, 30, 70, 20, 40, 60, 80]) t = bstInsert(t, v); return [__inorder(t), __preorder(t)]; })()',
        expected: [[20, 30, 40, 50, 60, 70, 80], [50, 30, 20, 40, 70, 60, 80]],
      },
      {
        call: '(() => { let t = null; for (const v of [1, 2, 3, 4, 5]) t = bstInsert(t, v); return [__preorder(t), t.right.right.right.right.value, t.left]; })()',
        expected: [[1, 2, 3, 4, 5], 5, null],
      },
      {
        call: '(() => { let t = null; for (const v of [5, 3, 5, 7]) t = bstInsert(t, v); return [t.left.value, t.right.value, t.right.left, t.right.right.value]; })()',
        expected: [3, 5, null, 7],
      },
      {
        call: '(() => { const t = __build([8, 4, 12]); const back = bstInsert(t, 6); return [back === t, t.left.right.value]; })()',
        expected: [true, 6],
      },
      {
        call: '__searchVisits(__build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]), 1, function (root, value) { return bstSearch(root, value); }).value',
        expected: 1,
      },
      {
        call: '__searchVisits(__build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]), 1, function (root, value) { return bstSearch(root, value); }).visits <= 4',
        expected: true,
        criterion: 'follows-bst-path',
      },
      {
        call: '__searchVisits(__build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]), 16, function (root, value) { return bstSearch(root, value); }).visits <= 4',
        expected: true,
        criterion: 'follows-bst-path',
      },
    ],
  },
};
