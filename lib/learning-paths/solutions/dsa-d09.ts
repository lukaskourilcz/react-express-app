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
      { call: "(() => { const snap=root=>{const out=[],stack=root?[root]:[];while(stack.length){const n=stack.pop();out.push([n,Object.getPrototypeOf(n),Object.getOwnPropertyDescriptors(n)]);if(n.left)stack.push(n.left);if(n.right)stack.push(n.right);}return out;}; const unchanged=before=>before.every(([n,p,d])=>Object.getPrototypeOf(n)===p && Reflect.ownKeys(n).length===Reflect.ownKeys(d).length && Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(n,k);return b && a.value===b.value && a.get===b.get && a.set===b.set && a.writable===b.writable && a.enumerable===b.enumerable && a.configurable===b.configurable;})); const t=__build([0,-1.5,2.25,null,0]); const before=snap(t); const result=[treeSize(t),treeHeight(t)]; return [result,unchanged(before)]; })()", expected: [[4, 2], true] },
      { call: "(() => { const t=__chain(Array.from({length:128},(_,i)=>i),\"right\"); const freeze=n=>{if(!n)return;freeze(n.left);freeze(n.right);Object.freeze(n);};freeze(t);return [treeSize(t),treeHeight(t)]; })()", expected: [128, 127] },
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
      { call: "(() => { const snap=root=>{const out=[],stack=root?[root]:[];while(stack.length){const n=stack.pop();out.push([n,Object.getPrototypeOf(n),Object.getOwnPropertyDescriptors(n)]);if(n.left)stack.push(n.left);if(n.right)stack.push(n.right);}return out;}; const unchanged=before=>before.every(([n,p,d])=>Object.getPrototypeOf(n)===p && Reflect.ownKeys(n).length===Reflect.ownKeys(d).length && Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(n,k);return b && a.value===b.value && a.get===b.get && a.set===b.set && a.writable===b.writable && a.enumerable===b.enumerable && a.configurable===b.configurable;})); const t=__build([0,-1.5,0,null,2.25]);const before=snap(t);const result=[inorder(t),preorder(t),postorder(t),levelOrder(t)];return [result,unchanged(before)]; })()", expected: [[[-1.5, 2.25, 0, 0], [0, -1.5, 2.25, 0], [2.25, -1.5, 0, 0], [0, -1.5, 0, 2.25]], true] },
      { call: "(() => {const functions=[inorder,preorder,postorder,levelOrder];return functions.every(fn=>{const a=fn(__leaf(7)),b=fn(null),c=fn(__leaf(8));return a!==b&&a!==c&&b!==c&&a.length===1&&a[0]===7&&b.length===0&&c.length===1&&c[0]===8;});})()", expected: true },
      { call: "(() => {const t=__chain(Array.from({length:128},(_,i)=>i),\"left\");const freeze=n=>{if(!n)return;freeze(n.left);freeze(n.right);Object.freeze(n);};freeze(t);return [inorder(t),preorder(t),postorder(t),levelOrder(t)];})()", expected: [[127, 126, 125, 124, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127], [127, 126, 125, 124, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127]] },
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
      { call: "(() => { const snap=root=>{const out=[],stack=root?[root]:[];while(stack.length){const n=stack.pop();out.push([n,Object.getPrototypeOf(n),Object.getOwnPropertyDescriptors(n)]);if(n.left)stack.push(n.left);if(n.right)stack.push(n.right);}return out;}; const unchanged=before=>before.every(([n,p,d])=>Object.getPrototypeOf(n)===p && Reflect.ownKeys(n).length===Reflect.ownKeys(d).length && Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(n,k);return b && a.value===b.value && a.get===b.get && a.set===b.set && a.writable===b.writable && a.enumerable===b.enumerable && a.configurable===b.configurable;}));const t=__build([0,-1.5,2.25]);const before=snap(t);const a=bstSearch(t,-1.5),b=bstSearch(t,0.5);return [a===t.left,b,unchanged(before)];})()", expected: [true, null, true] },
      { call: "(() => {const t=__build([5,3,8,1,4,7,9]);const old=[t,t.left,t.right,t.left.left,t.left.right,t.right.left,t.right.right];const desc=old.map(n=>Object.getOwnPropertyDescriptors(n));const protos=old.map(n=>Object.getPrototypeOf(n));const back=bstInsert(t,6);const added=t.right.left.left;return back===t&&added.value===6&&added.left===null&&added.right===null&&Reflect.ownKeys(added).sort().join(\",\")===\"left,right,value\"&&old.every((n,i)=>Object.getPrototypeOf(n)===protos[i]&&Reflect.ownKeys(n).length===3&&Reflect.ownKeys(desc[i]).every(k=>{const a=desc[i][k],b=Object.getOwnPropertyDescriptor(n,k);return b&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(n===old[5]&&k===\"left\"?b.value===added:a.value===b.value);}));})()", expected: true },
      { call: "(() => {let t=null;for(let i=0;i<128;i++)t=bstInsert(t,i/2);let n=t,count=0;while(n&&count<129){if(n.value!==count/2||n.left!==null)return false;count++;n=n.right;}return count===128&&n===null&&bstSearch(t,63.5).value===63.5&&bstSearch(t,63.75)===null;})()", expected: true },
      { call: "(() => {const t=__leaf(5);bstInsert(t,5);return bstSearch(t,5)===t;})()", expected: true },
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
