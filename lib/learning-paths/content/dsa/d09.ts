/** D09 — Trees and binary search trees.
 *
 * The first structure in this path that branches. A node is
 * `{ value, left, right }`, a missing child is `null`, and a tree is its root
 * node or `null` when empty. Height is counted in edges throughout: a single
 * node is height 0 and the empty tree is height -1, which is what makes
 * `1 + max(left, right)` come out right for a leaf.
 *
 * Lesson one is terminology and the four traversals; lesson two is the search
 * property and the height it buys. Duplicates go into the right subtree, and
 * every prompt says so. Balanced variants are out of scope: this module
 * teaches O(h) and teaches that nothing here keeps h small.
 *
 * The search exercise is graded on method. Its harness rebuilds the tree out
 * of proxied nodes and counts how many distinct nodes the learner's search
 * touched, so a full traversal fails the budget even when it returns the right
 * node. That is a bounded contract about these inputs, never a proof about
 * arbitrary code. */

import type { ModuleSource } from '../../types';

/** Builders and readers shared by the visible and hidden assertions of every
 * exercise in this module. `__build` takes a level-order array in which every
 * slot is counted, so index i has its children at 2i+1 and 2i+2 and a missing
 * node is written `null`. Both walks stop after a fixed number of nodes: a
 * submission that accidentally builds a cycle fails an assertion instead of
 * burning the whole run's deadline. */
const TREE_PROBE = `
var __TREE_LIMIT = 512;
var __leaf = function (value) { return { value: value, left: null, right: null }; };
var __build = function (levels) {
  var nodes = levels.map(function (value) {
    return value === null ? null : { value: value, left: null, right: null };
  });
  for (var i = 0; i < nodes.length; i += 1) {
    if (!nodes[i]) continue;
    nodes[i].left = nodes[2 * i + 1] || null;
    nodes[i].right = nodes[2 * i + 2] || null;
  }
  return nodes.length === 0 ? null : nodes[0];
};
var __chain = function (values, side) {
  var head = null;
  for (var i = values.length - 1; i >= 0; i -= 1) {
    var node = { value: values[i], left: null, right: null };
    node[side] = head;
    head = node;
  }
  return head;
};
var __inorder = function (root) {
  var out = [];
  var walk = function (node) {
    if (!node || out.length > __TREE_LIMIT) return;
    walk(node.left);
    out.push(node.value);
    walk(node.right);
  };
  walk(root);
  return out;
};
var __preorder = function (root) {
  var out = [];
  var walk = function (node) {
    if (!node || out.length > __TREE_LIMIT) return;
    out.push(node.value);
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out;
};
`.trim();

/** Rebuilds a tree out of proxied nodes and counts how many distinct nodes a
 * search touched. A node counts once, the first time any of `value`, `left` or
 * `right` is read on it, so the number is nodes visited rather than property
 * reads. Counting stops before the returned node is inspected, so reading the
 * answer never costs a visit. */
const SEARCH_PROBE = `${TREE_PROBE}
var __searchVisits = function (root, target, run) {
  var visits = 0;
  var counting = true;
  var wrap = function (node) {
    if (!node) return null;
    var seen = false;
    var inner = { value: node.value, left: null, right: null };
    var proxy = new Proxy(inner, {
      get: function (holder, prop) {
        if (counting && !seen && (prop === 'value' || prop === 'left' || prop === 'right')) {
          seen = true;
          visits += 1;
        }
        return holder[prop];
      },
    });
    inner.left = wrap(node.left);
    inner.right = wrap(node.right);
    return proxy;
  };
  var found = run(wrap(root), target);
  counting = false;
  return { value: found ? found.value : null, visits: visits };
};`;

export const DSA_D09: ModuleSource = {
  id: 'dsa-v1-d09',
  title: 'Trees and binary search trees',
  outcomes: [
    'Read a tree of `{ value, left, right }` nodes and give its size, its height in edges, and the depth of any node in it.',
    'Walk a tree in all four orders — inorder, preorder, postorder and level-order — and pick the one a job needs.',
    'Search and insert in a binary search tree in O(h) steps, and say why h is the height rather than log n.',
  ],
  competencies: ['trees', 'complexity', 'recursion'],
  dependsOn: ['dsa-v1-d06', 'dsa-v1-d07'],
  estimatedMinutes: 135,
  lessons: [
    {
      id: 'dsa-v1-d09-l1',
      title: 'Nodes, edges and four ways to walk a tree',
      summary: 'Root, leaf, depth, height and size, then the three depth-first orders and the queue that gives you level-order.',
      estimatedMinutes: 20,
      sources: [
        {
          label: 'MIT 6.006 — Binary Trees, Part 1',
          url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-6-binary-trees-part-1/',
          reviewedOn: '2026-09-08',
        },
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Array.prototype.shift',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A binary tree is built from nodes shaped `{ value, left, right }`. `left` and `right` hold the child nodes, and an absent child is `null`. One convention carries the whole module: a tree is its root node, and `null` is the empty tree. Every function below leans on it, which is why they are all four or five lines long.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '//         8\n//        / \\\n//       3   5\n//      / \\    \\\n//     9   1    6\nconst tree = {\n  value: 8,\n  left: {\n    value: 3,\n    left: { value: 9, left: null, right: null },\n    right: { value: 1, left: null, right: null },\n  },\n  right: {\n    value: 5,\n    left: null,\n    right: { value: 6, left: null, right: null },\n  },\n};',
          caption: 'The example tree for this lesson. The values are in no useful order, which is allowed: this is a binary tree, not yet a search tree.',
        },
        {
          kind: 'prose',
          body:
            'The node at the top is the root — 8, the only node with no parent. A node\'s `left` and `right` are its children, and it is their parent. A node with no children is a leaf, so 9, 1 and 6 are the leaves here. Every node is also the root of a subtree: 3 together with 9 and 1 is the left subtree of 8. The size of a tree is how many nodes it holds, which is 6 for this one.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'This path measures height in *edges*, not nodes. The depth of a node is the number of edges from the root down to it, so the root sits at depth 0 and 9 sits at depth 2. The height of a tree is the depth of its deepest node — the longest root-to-leaf path, again in edges. A single node therefore has height 0, and the empty tree has height -1. That -1 is not a trick to memorise: it makes `height(node) = 1 + max(height(left), height(right))` come out at 0 for a leaf, whose two absent children are both empty trees. Plenty of textbooks count nodes instead and put a leaf at height 1, so state which convention you are using before you quote a number.',
        },
        {
          kind: 'table',
          caption: 'The vocabulary, checked against the example tree.',
          headers: ['Term', 'What it counts', 'On the example tree'],
          rows: [
            ['Root', 'The one node with no parent', '8'],
            ['Leaf', 'A node with no children', '9, 1 and 6'],
            ['Depth of a node', 'Edges from the root down to that node', '9 is at depth 2; the root is at depth 0'],
            ['Height of a tree', 'Edges on the longest root-to-leaf path', '2, along 8 → 3 → 9'],
            ['Size', 'How many nodes the tree holds', '6'],
            ['Subtree', 'Any node together with everything below it', '3, 9 and 1 are the left subtree of 8'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Height is the number that predicts cost. A walk from the root down to a leaf visits h + 1 nodes, so any operation that follows a single downward path costs O(h). Size tells you how much the tree holds; height tells you how far you have to travel to reach the bottom of it. The two come apart badly: six nodes can sit at height 2, as above, or at height 5 in a chain.',
        },
        {
          kind: 'prose',
          body:
            'A traversal visits every node exactly once. The depth-first ones go as far down one branch as they can before backing up, and the three of them differ in one thing only: when the node itself is handled, relative to its two subtrees. Preorder handles the node first, inorder handles it between the subtrees, postorder handles it last.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const preorder = (node, out = []) => {\n  if (node === null) return out;\n  out.push(node.value);        // the node, then its subtrees\n  preorder(node.left, out);\n  preorder(node.right, out);\n  return out;\n};\n\nconst inorder = (node, out = []) => {\n  if (node === null) return out;\n  inorder(node.left, out);\n  out.push(node.value);        // the node, between its subtrees\n  inorder(node.right, out);\n  return out;\n};\n\nconst postorder = (node, out = []) => {\n  if (node === null) return out;\n  postorder(node.left, out);\n  postorder(node.right, out);\n  out.push(node.value);        // the node, after its subtrees\n  return out;\n};',
          caption: 'Three functions, one moved line. The `push` sits in a different place in each and nothing else changes.',
        },
        {
          kind: 'prose',
          body:
            'On the example tree, preorder gives 8, 3, 9, 1, 5, 6; inorder gives 9, 3, 1, 8, 5, 6; postorder gives 9, 1, 3, 6, 5, 8. Which one you want follows from the job. Preorder reaches a parent before its children, which is what copying a tree or writing it out as nested markup needs. Postorder finishes both subtrees before the node, which is what tearing a tree down needs, since you cannot release a parent while its children still hang off it. Inorder is the one the next lesson turns on: run it over a binary search tree and the values come out in order.',
        },
        {
          kind: 'prose',
          body:
            'Level-order visits every node at depth 0, then every node at depth 1, and so on, left to right inside each level. Recursion will not hand you that, because the call stack goes down before it goes across. A queue will: take a node off the front, record it, put its children on the back. Anything already waiting is closer to the root, so it leaves first, and the levels come out in order without anyone tracking depth.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const levelOrder = root => {\n  if (root === null) return [];\n\n  const out = [];\n  const queue = [root];\n  let head = 0;                     // where the front of the queue sits now\n\n  while (head < queue.length) {\n    const node = queue[head];\n    head += 1;\n    out.push(node.value);\n    if (node.left !== null) queue.push(node.left);\n    if (node.right !== null) queue.push(node.right);\n  }\n\n  return out;\n};',
          caption: 'Level-order with a head index: the array only grows, and a dequeue moves an index instead of shifting every remaining element.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            '`queue.shift()` reads like the obvious dequeue and costs a linear pass: every remaining element moves down one place. Doing that once per node turns an O(n) traversal into an O(n²) one on a large tree. The head index above keeps each dequeue at a fixed number of steps, and pays for it by holding the whole array until the walk ends. Same traversal, different cost, and the one-word call is what hides the difference.',
        },
        {
          kind: 'trace',
          caption: 'Level-order on the example tree. Each frame shows the queue after one node has left the front and its children have joined the back.',
          trace: {
            shape: 'queue',
            frames: [
              {
                cells: ['8'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The queue starts with the root alone. Nothing has been recorded yet, and the front of the queue is 8.',
                counter: { label: 'Nodes recorded', value: 0 },
              },
              {
                cells: ['3', '5'],
                marks: [{ index: 0, role: 'active' }],
                note: '8 leaves the front and is recorded. Its children 3 and 5 join the back, left child first. Recorded so far: 8.',
                counter: { label: 'Nodes recorded', value: 1 },
              },
              {
                cells: ['5', '9', '1'],
                marks: [{ index: 0, role: 'active' }],
                note: '3 leaves and is recorded. Its children 9 and 1 join the back, behind 5, which has been waiting longer. Recorded so far: 8, 3.',
                counter: { label: 'Nodes recorded', value: 2 },
              },
              {
                cells: ['9', '1', '6'],
                marks: [{ index: 0, role: 'active' }],
                note: '5 leaves and is recorded. It has no left child, so only 6 joins the back. Recorded so far: 8, 3, 5.',
                counter: { label: 'Nodes recorded', value: 3 },
              },
              {
                cells: ['1', '6'],
                marks: [{ index: 0, role: 'active' }],
                note: '9 leaves and is recorded. It is a leaf, so nothing joins the back and the queue shrinks. Recorded so far: 8, 3, 5, 9.',
                counter: { label: 'Nodes recorded', value: 4 },
              },
              {
                cells: ['6'],
                marks: [{ index: 0, role: 'active' }],
                note: '1 leaves and is recorded, another leaf. Only 6 is left waiting. Recorded so far: 8, 3, 5, 9, 1.',
                counter: { label: 'Nodes recorded', value: 5 },
              },
              {
                cells: [],
                note: '6 leaves and is recorded. The queue is empty, so the walk stops. The full level-order is 8, 3, 5, 9, 1, 6 — depth 0, then depth 1, then depth 2.',
                counter: { label: 'Nodes recorded', value: 6 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'All four traversals touch every node once, so all four cost O(n) in time. Their extra space differs. The three depth-first walks borrow O(h) stack frames, one per node on the path they are currently down — that is O(log n) on a balanced tree and O(n) on a chain, which is how a deep recursive walk overflows the stack. Level-order holds a queue as wide as the widest level, and the bottom level of a balanced tree holds about half its nodes, so its extra space is O(n) even when the tree is short.',
        },
      ],
    },
    {
      id: 'dsa-v1-d09-l2',
      title: 'The search property, and the height it buys',
      summary: 'What the binary-search-tree rule demands at every node, why search and insert cost O(h), and why h is not log n unless something keeps the tree in shape.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-09-08' },
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A binary search tree adds one rule to the binary tree. For every node, every value in its left subtree is smaller than that node\'s value, and every value in its right subtree is not smaller. Two words in that sentence do the work: *every* node, and the whole *subtree* rather than the two children hanging directly off it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '//         8\n//       /   \\\n//      3     10\n//     / \\      \\\n//    1   6      14\n//       / \\     /\n//      4   7   13\nconst bst = {\n  value: 8,\n  left: {\n    value: 3,\n    left: { value: 1, left: null, right: null },\n    right: {\n      value: 6,\n      left: { value: 4, left: null, right: null },\n      right: { value: 7, left: null, right: null },\n    },\n  },\n  right: {\n    value: 10,\n    left: null,\n    right: { value: 14, left: { value: 13, left: null, right: null }, right: null },\n  },\n};',
          caption: 'Nine values at height 3. Everything left of 8 is smaller than 8, everything right of it is larger, and the same holds at 3, at 6, at 10 and at 14.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Checking each node against its own two children is not enough. Take a root of 8 with a left child of 3, and give that 3 a right child of 10. Every parent-child pair passes: 3 is smaller than 8, and 10 is larger than 3. It is still not a search tree, because 10 sits inside the left subtree of 8, where nothing may reach 8. The damage is real rather than theoretical — a search for 10 turns left at the root, walks away from it, and reports it missing.',
        },
        {
          kind: 'prose',
          body:
            'Searching starts at the root and compares. Equal, and you are finished. Smaller, and the value can only be in the left subtree, so the entire right subtree is ruled out without a single look inside it. Larger, and the mirror image. Every comparison discards one subtree and moves down one edge, so the walk visits at most h + 1 nodes and ends at a `null` when nothing holds the value.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const bstSearch = (root, target) => {\n  let node = root;\n\n  while (node !== null) {\n    if (target === node.value) return node;\n    node = target < node.value ? node.left : node.right;\n  }\n\n  return null;\n};',
          caption: 'Search as a loop: one comparison per level, no recursion, and a fixed number of references whatever the height — O(1) auxiliary space.',
        },
        {
          kind: 'prose',
          body:
            'On the tree above, a search for 7 reads 8, turns left to 3, turns right to 6, turns right to 7: four nodes out of nine. A search for 5 reads 8, 3, 6, 4, then finds `null` where 4\'s right child would be and reports 5 as absent after the same four reads. Neither walk looked at 10, 14 or 13 at all.',
        },
        {
          kind: 'trace',
          caption: 'An inorder walk over a seven-node search tree. Cells are the nodes in level order; the label under each cell is the path to it from the root.',
          trace: {
            shape: 'tree',
            legend: ['root', 'L', 'R', 'L.L', 'L.R', 'R.L', 'R.R'],
            frames: [
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                note: 'The tree before the walk. The root is 5, its left subtree holds 3 with children 2 and 4, and its right subtree holds 8 with children 7 and 9. Nothing has been recorded.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [{ index: 3, role: 'active' }],
                note: 'Inorder handles the left subtree before the node, so the walk goes 5, then 3, then 2 without recording any of them. 2 has no left child, so 2 is recorded first. Recorded: 2.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [{ index: 3, role: 'settled' }, { index: 1, role: 'active' }],
                note: '2 is finished, so its parent 3 is recorded next. Everything smaller than 3 has already come out. Recorded: 2, 3.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [{ index: 3, role: 'settled' }, { index: 1, role: 'settled' }, { index: 4, role: 'active' }],
                note: 'The right subtree of 3 is the single node 4, which is recorded next. Recorded: 2, 3, 4.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [
                  { index: 3, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 0, role: 'active' },
                ],
                note: 'The whole left subtree of the root is done, so the root 5 is recorded. Everything recorded so far is smaller than 5, because the left subtree holds exactly the values that are. Recorded: 2, 3, 4, 5.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [
                  { index: 3, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 0, role: 'settled' },
                  { index: 5, role: 'active' },
                ],
                note: 'The walk moves into the right subtree and descends 8, then 7. 7 has no left child, so 7 is recorded. Recorded: 2, 3, 4, 5, 7.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [
                  { index: 3, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 0, role: 'settled' },
                  { index: 5, role: 'settled' },
                  { index: 2, role: 'active' },
                ],
                note: '7 is finished, so its parent 8 is recorded. Recorded: 2, 3, 4, 5, 7, 8.',
              },
              {
                cells: ['5', '3', '8', '2', '4', '7', '9'],
                marks: [
                  { index: 3, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 0, role: 'settled' },
                  { index: 5, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 6, role: 'active' },
                ],
                note: '9, the right child of 8, is the last node and is recorded. The walk ends with 2, 3, 4, 5, 7, 8, 9 — ascending, which is what the search property buys an inorder walk.',
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Inorder emits the whole left subtree before the node and the whole right subtree after it. Everything in the left subtree is smaller and everything in the right subtree is not smaller, so the output is in order around that node — and because the same holds at every node, the whole list is in order. That gives you the cheapest correctness check available: run an inorder walk and confirm no value is smaller than the one before it.',
        },
        {
          kind: 'prose',
          body:
            'Search and insert both cost O(h), because both follow one downward path. What h actually is depends entirely on shape. A perfectly balanced tree of 15 values has height 3, so no search reads more than 4 nodes. Insert 1 through 15 in ascending order into an empty tree and every value lands to the right of the one before it: the result is a chain of height 14, and a search for 15 reads all 15 nodes. Same values, same property, same code, and either 4 reads or 15 depending only on the order they arrived in.',
        },
        {
          kind: 'table',
          caption: 'Fifteen values in a binary search tree, in two shapes.',
          headers: ['Shape', 'Height h', 'Nodes the worst search reads', 'Class in terms of n'],
          rows: [
            ['Perfectly balanced', '3', '4', 'O(log n)'],
            ['Built by inserting in ascending order', '14', '15', 'O(n)'],
            ['Anything in between', 'Between 3 and 14', 'h + 1', 'O(h), which is the honest answer'],
          ],
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const bstInsert = (root, value) => {\n  if (root === null) return { value, left: null, right: null };\n\n  let node = root;\n  while (true) {\n    if (value < node.value) {\n      if (node.left === null) {\n        node.left = { value, left: null, right: null };\n        return root;\n      }\n      node = node.left;\n    } else {\n      if (node.right === null) {\n        node.right = { value, left: null, right: null };\n        return root;\n      }\n      node = node.right;\n    }\n  }\n};',
          caption: 'Insert walks to the empty spot the value belongs in and hangs a new leaf there. The comparison `value < node.value` sends smaller values left and everything else — larger and equal alike — right.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'This path sends a value equal to the node it is standing at into the right subtree, which is why the rule above says "not smaller" rather than "larger". Other codebases send equals left, or keep a count on the node instead of adding a second node, and all three are defensible. Pick one and write it down, because search, insert and delete all have to agree on it. With equals on the right, an inorder walk is non-decreasing rather than strictly ascending: two 5s come out next to each other.',
        },
        {
          kind: 'prose',
          body:
            'Sorted input is the usual way to end up with the chain, and it arrives by accident. Load records already ordered by id and you build a tree with no branching in it at all, so the O(log n) you were counting on is O(n). Balanced variants — AVL and red-black trees — fix that by rotating subtrees back into shape during insert, and they are outside this path. What matters here is that a plain BST gives you O(h) and nothing in the plain version keeps h small.',
        },
        {
          kind: 'prose',
          body:
            'To summarise the costs: search and insert are O(h) in time, and written as loops they need O(1) auxiliary space, while the recursive versions borrow O(h) stack. A full traversal is O(n) whatever the shape, because it visits every node either way. Finding the smallest value is a walk left until `left` is `null`, which is O(h) again — cheap on a balanced tree and a full scan on a chain.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d09-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: nodes, edges and four ways to walk a tree',
      summary: 'Root, leaf, depth, height in edges and size, then the three depth-first orders and level-order on a queue.',
      competencies: ['trees'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d09-l1',
    },
    {
      id: 'dsa-v1-d09-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: the search property, and the height it buys',
      summary: 'The BST rule at every node, search and insert in O(h), the duplicate policy, and why a skewed tree is a chain.',
      competencies: ['trees', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d09-l2',
    },
    {
      id: 'dsa-v1-d09-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Tree and BST checks',
      summary: 'Four questions: the height of a single node, whether a tree is a search tree, what shape costs, and which traversal sorts.',
      competencies: ['trees', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d09-q1',
          prompt:
            'A tree holds exactly one node: `{ value: 7, left: null, right: null }`. Height is counted in edges on the longest root-to-leaf path, as this path counts it. What are the height and the size of that tree?',
          options: [
            'Height 0 and size 1',
            'Height 1 and size 1',
            'Height 1 and size 0',
            'Height -1 and size 1',
          ],
          correct: 0,
          explanation:
            'There is no edge below the single node, so the longest root-to-leaf path has length 0. Size counts nodes, and there is one. Height 1 is the answer under the other common convention, which counts nodes on the path instead of edges — a real convention, but not this path\'s, and the question names the one in use. Size 0 describes the empty tree, not a tree with a node in it. Height -1 is also reserved for the empty tree, which has no root-to-leaf path at all.',
          competencies: ['trees'],
        },
        {
          id: 'dsa-v1-d09-q2',
          prompt:
            'Under the rule that every value in a node\'s left subtree is smaller than that node and every value in its right subtree is not smaller, is this a binary search tree?',
          context: {
            language: 'javascript',
            code: 'const tree = {\n  value: 8,\n  left: {\n    value: 3,\n    left: null,\n    right: { value: 10, left: null, right: null },\n  },\n  right: { value: 12, left: null, right: null },\n};',
          },
          options: [
            'No — 10 sits inside the left subtree of 8, and the rule covers the whole subtree rather than the immediate children.',
            'Yes — every node has at most two children, which is what the search property asks for.',
            'Yes — each node is larger than its own left child and smaller than its own right child, and that is the whole rule.',
            'No — 3 is missing a left child, and the property only holds once every node has both children.',
          ],
          correct: 0,
          explanation:
            'The rule applies to every descendant, not just the two nodes hanging off a parent, and 10 is a descendant of 8 on the left. A search for 10 goes left at the root and never reaches it. Having at most two children makes something a binary tree, which every example in this module already is; the search property is the extra rule on top. The parent-child check is the mistake the lesson names: 10 passes against its parent 3 and still breaks the tree. Missing children are ordinary — 12 has none either, and the tree would be a valid search tree if 10 were not there.',
          competencies: ['trees'],
        },
        {
          id: 'dsa-v1-d09-q3',
          prompt:
            'The same 1,023 values are loaded into two binary search trees. One comes out perfectly balanced; the other was built by inserting the values in ascending order. Counting nodes read, what does the worst-case search cost in each?',
          options: [
            'About 10 nodes when balanced and up to 1,023 in the ascending build: the cost is O(h), and h is 9 in one shape and 1,022 in the other.',
            'About 10 nodes in both, because the search property guarantees O(log n) whatever the insertion order.',
            '1,023 nodes in both, because a search has to be ready to visit every node.',
            'About 10 nodes when balanced and about 32 in the ascending build, because a skewed tree costs the square root of n.',
          ],
          correct: 0,
          explanation:
            'A balanced tree of 1,023 nodes has height 9, and a root-to-leaf walk reads h + 1 = 10 nodes. Ascending inserts put every value to the right of the one before it, producing a chain of height 1,022 where the last value costs all 1,023 reads. The search property alone guarantees nothing about height — keeping h near log n takes rebalancing, which a plain BST does not do. Reading every node describes a full traversal, not a search: the balanced case really does discard half the remaining tree at each step. Nothing here grows like the square root of n; that class does not come up in tree search.',
          competencies: ['trees', 'complexity'],
        },
        {
          id: 'dsa-v1-d09-q4',
          prompt: 'Which traversal of a binary search tree returns its values in ascending order?',
          options: [
            'Inorder: the whole left subtree, then the node, then the whole right subtree.',
            'Preorder: the node, then the whole left subtree, then the whole right subtree.',
            'Postorder: the whole left subtree, then the whole right subtree, then the node.',
            'Level-order: every node at depth 0, then every node at depth 1, and so on.',
          ],
          correct: 0,
          explanation:
            'Inorder emits everything smaller than a node before it and everything not smaller after it, and that holds at every node, so the whole output is ordered. Preorder emits the root first, which is only the smallest value when the root has no left subtree at all. Postorder emits the root last, which fails the same way at the other end. Level-order groups by depth, and depth carries no ordering information: on the nine-node tree in the lesson it starts 8, 3, 10.',
          competencies: ['trees'],
        },
      ],
    },
    {
      id: 'dsa-v1-d09-height-and-size',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Height and size',
      summary: 'Count the nodes and measure the longest root-to-leaf path in edges, with the empty tree at -1.',
      competencies: ['trees', 'recursion'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'A node is a plain object `{ value, left, right }`. `left` and `right` hold the child nodes, and an absent child is `null`. A tree is its root node, or `null` when the tree is empty.\n\nWrite two functions.\n\n`treeSize(root)` returns how many nodes the tree holds. `treeSize(null)` is 0.\n\n`treeHeight(root)` returns the number of edges on the longest path from the root down to a leaf. A single node has height 0, because there is no edge below it. An empty tree has height -1, which is what makes a leaf work out to `1 + Math.max(-1, -1)`.\n\nA tree can also be a chain — a root whose only child has one child, and so on. A chain of five nodes has size 5 and height 4.',
        contract: [
          'Do not change the tree: no assignment to `value`, `left` or `right`.',
          'Height counts edges, not nodes: one node is height 0 and the empty tree is height -1.',
          'Both functions accept `null` as the whole tree and meet it again at every absent child.',
          'Handle a lopsided tree: the taller of the two subtrees decides the height.',
        ],
        starter: `const treeSize = root => {

};

const treeHeight = root => {

};

// Scratch pad — change this and press Run.
const tree = { value: 4, left: { value: 2, left: null, right: null }, right: null };
console.log(treeSize(tree), treeHeight(tree));
`,
        skeleton: `const treeSize = root => {
  if (/* the tree is empty */) return 0;
  return /* this node, plus both subtrees */;
};

const treeHeight = root => {
  if (/* the tree is empty */) return -1;

  const left = /* the height of the left subtree */;
  const right = /* the height of the right subtree */;

  return /* one edge more than the taller of the two */;
};`,
        hints: [
          'Both functions have the same shape: answer for `null` outright, then combine the answers coming back from `left` and `right`. The recursion does the walking; you write the combination.',
          'Height is `1 + Math.max(leftHeight, rightHeight)`. With the empty tree at -1, a leaf comes out at `1 + Math.max(-1, -1)`, which is 0 — no special case needed.',
          'An absent child is `null`, which is the same thing as an empty tree. That is why one base case covers both.',
        ],
        approach: [
          'Return 0 from `treeSize` when the root is `null`; there is nothing to count.',
          'Otherwise return 1 for this node plus the size of the left subtree plus the size of the right subtree.',
          'Return -1 from `treeHeight` when the root is `null`, so that a leaf lands on 0.',
          'Otherwise take the height of each subtree and return one more than the larger of the two.',
        ],
        tests: [
          { call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); return [treeSize(t), treeHeight(t)]; })()', expected: [6, 2] },
          { call: 'treeSize(null)', expected: 0, label: 'an empty tree holds no nodes', edge: true },
          { call: 'treeHeight(null)', expected: -1, label: 'an empty tree has height -1', edge: true },
          {
            call: '(() => { const t = __leaf(7); return [treeSize(t), treeHeight(t)]; })()',
            expected: [1, 0],
            label: 'a single node has height 0',
            edge: true,
          },
          {
            call: '(() => { const t = __chain([1, 2, 3, 4, 5], "right"); return [treeSize(t), treeHeight(t)]; })()',
            expected: [5, 4],
            label: 'a five-node chain has height 4',
            edge: true,
          },
          {
            call: '(() => { const t = __chain([9, 8, 7], "left"); return [treeSize(t), treeHeight(t)]; })()',
            expected: [3, 2],
            label: 'a chain leaning the other way',
            edge: true,
          },
          {
            call: '(() => { const t = __build([5, 3, 8, null, 4]); return [treeSize(t), treeHeight(t)]; })()',
            expected: [4, 2],
            label: 'the taller subtree decides the height',
          },
        ],
        harness: TREE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d09-traversals',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Four traversals',
      summary: 'Inorder, preorder and postorder from recursion, and level-order from a queue.',
      competencies: ['trees', 'recursion'],
      estimatedMinutes: 30,
      code: {
        language: 'javascript',
        prompt:
          'A node is a plain object `{ value, left, right }`, an absent child is `null`, and a tree is its root node or `null` when empty.\n\nWrite four functions, each returning an array of values in the order it visits them.\n\n`inorder(root)` — the whole left subtree, then the node, then the whole right subtree.\n`preorder(root)` — the node, then the left subtree, then the right subtree.\n`postorder(root)` — the left subtree, then the right subtree, then the node.\n`levelOrder(root)` — every node at depth 0, then every node at depth 1, and so on, left to right inside each level.\n\nAll four return `[]` for an empty tree, and all four return a one-element array for a single node. The three depth-first walks fall out of recursion. `levelOrder` does not, because the call stack goes down before it goes across: hold a queue, take the node at the front, record it, and put its children on the back.',
        contract: [
          'Return a new array of values from each function and leave the tree unchanged.',
          'Every node appears exactly once in each result, including nodes that have only one child.',
          'An empty tree returns `[]` from all four functions.',
          'Record the values, not the nodes: each array holds numbers, not `{ value, left, right }` objects.',
        ],
        starter: `const inorder = root => {

};

const preorder = root => {

};

const postorder = root => {

};

const levelOrder = root => {

};

// Scratch pad — change this and press Run.
const tree = {
  value: 4,
  left: { value: 2, left: null, right: null },
  right: { value: 7, left: null, right: null },
};
console.log(inorder(tree), levelOrder(tree));
`,
        skeleton: `const inorder = root => {
  const out = [];

  const walk = node => {
    if (node === null) return;
    // left subtree, then this node's value, then the right subtree
  };

  walk(root);
  return out;
};

// preorder and postorder are the same function with the push moved.

const levelOrder = root => {
  if (root === null) return [];

  const out = [];
  const queue = [root];
  let head = 0;

  while (/* the queue still has a node waiting */) {
    // take queue[head], step head forward, record the value
    // push whichever children are not null
  }

  return out;
};`,
        hints: [
          'The three depth-first walks are one function with `push` in a different place. Write `preorder`, then move that line between or after the two recursive calls.',
          'A nested `walk` function that closes over one `out` array keeps the signature clean and allocates a single array per call.',
          'For `levelOrder`, seed the queue with the root and keep a `head` index. While `head` is below `queue.length`, read `queue[head]`, step `head` forward, record the value, and push the children that are not `null`.',
        ],
        approach: [
          'Return `[]` straight away when the root is `null`, in all four functions.',
          'Write `preorder` first: record the node, then recurse into `left`, then into `right`.',
          'Get `inorder` and `postorder` by moving the recording line between the two recursive calls, then after them.',
          'For `levelOrder`, hold a queue of nodes still to visit, seeded with the root.',
          'Take a node off the front, record its value, push its non-null children on the back, and stop when the queue runs out.',
        ],
        tests: [
          {
            call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); return inorder(t); })()',
            expected: [1, 2, 3, 4, 7, 9],
            label: 'inorder on the example tree',
          },
          {
            call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); return preorder(t); })()',
            expected: [4, 2, 1, 3, 7, 9],
            label: 'preorder starts at the root',
          },
          {
            call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); return postorder(t); })()',
            expected: [1, 3, 2, 9, 7, 4],
            label: 'postorder ends at the root',
          },
          {
            call: '(() => { const t = __build([4, 2, 7, 1, 3, null, 9]); return levelOrder(t); })()',
            expected: [4, 2, 7, 1, 3, 9],
            label: 'level-order goes across before it goes down',
          },
          {
            call: '(() => [inorder(null), preorder(null), postorder(null), levelOrder(null)])()',
            expected: [[], [], [], []],
            label: 'an empty tree gives an empty array from all four',
            edge: true,
          },
          {
            call: '(() => { const t = __leaf(7); return [inorder(t), preorder(t), postorder(t), levelOrder(t)]; })()',
            expected: [[7], [7], [7], [7]],
            label: 'a single node comes out the same way in every order',
            edge: true,
          },
          {
            call: '(() => { const t = __chain([1, 2, 3, 4], "right"); return [postorder(t), levelOrder(t)]; })()',
            expected: [[4, 3, 2, 1], [1, 2, 3, 4]],
            label: 'a right-leaning chain',
            edge: true,
          },
        ],
        harness: TREE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d09-bst-search-insert',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Search and insert in a BST',
      summary: 'Insert down one path with duplicates to the right, and search inside a counted budget of h + 1 nodes.',
      competencies: ['trees', 'complexity'],
      estimatedMinutes: 30,
      code: {
        language: 'javascript',
        prompt:
          'A node is a plain object `{ value, left, right }`, an absent child is `null`, and a tree is its root node or `null` when empty. In a binary search tree, every value in a node\'s left subtree is smaller than that node\'s value and every value in its right subtree is not smaller.\n\n`bstInsert(root, value)` puts `value` where the property demands and returns the root of the tree: the root you were handed, or the new node when the tree was empty. A value equal to the node you are standing at goes into the right subtree, never the left — that is this path\'s duplicate policy.\n\n`bstSearch(root, value)` returns the node object holding `value`, or `null` when no node holds it. It has to follow the property: compare, descend into one subtree, and forget the other. The grade rebuilds a balanced 15-node tree out of counted nodes and records how many of them your search touched. The budget is 4, which is the height plus one. Reading every node goes over it even when the answer is right.',
        contract: [
          'Insert by walking down from the root and hanging a new leaf where the walk stops; do not rebuild the tree from a collected list of values.',
          'A value equal to the node you are at goes into the right subtree.',
          '`bstInsert` returns the root — the same node you were given, or the new node when the tree was empty.',
          '`bstSearch` returns the node object holding the value, not the value itself, and `null` when the value is absent.',
          '`bstSearch` touches at most h + 1 nodes: 4 on the graded 15-node balanced tree. A full traversal touches all 15 and fails that criterion even with the right answer.',
        ],
        starter: `const bstInsert = (root, value) => {

};

const bstSearch = (root, value) => {

};

// Scratch pad — change this and press Run.
let tree = null;
for (const value of [8, 3, 10, 1, 6]) tree = bstInsert(tree, value);
console.log(bstSearch(tree, 6));
`,
        skeleton: `const bstInsert = (root, value) => {
  if (/* the tree is empty */) return { value, left: null, right: null };

  let node = root;
  while (true) {
    if (/* the value belongs on the left */) {
      if (node.left === null) {
        // hang the new node here and return the root
      }
      node = node.left;
    } else {
      // equal values land on this side too
      if (node.right === null) {
        // hang the new node here and return the root
      }
      node = node.right;
    }
  }
};

const bstSearch = (root, value) => {
  let node = root;

  while (/* there is still a node to look at */) {
    if (/* this node holds the value */) return node;
    node = /* the one subtree that could still hold it */;
  }

  return null;
};`,
        hints: [
          'Insert walks down exactly the way search does. The difference is where it stops: search stops when the values match, insert stops when the child it wants to step into is `null` and hangs the new node there.',
          'The duplicate rule falls out of the comparison you pick. `value < node.value` sends smaller values left and sends everything else — larger and equal alike — right.',
          '`bstSearch` returns the node, not the value: `return node` inside the loop, and `return null` after it, once the walk has run off the bottom of the tree.',
        ],
        approach: [
          'Handle the empty tree in `bstInsert` first: return a new node, since it becomes the root.',
          'Otherwise walk down from the root, going left when the value is smaller and right otherwise.',
          'Stop when the child you would step into is `null`, attach the new node there, and return the original root.',
          'Write `bstSearch` as the same walk: return the node when the values match, and otherwise move into the one subtree that could hold the value.',
          'Return `null` once the walk reaches `null`, which means no node holds the value.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct insert and search, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty tree, a duplicate value, a value that is absent, and that search returns the node rather than the value.',
          },
          {
            id: 'follows-bst-path',
            label: 'Search follows one root-to-leaf path',
            critical: true,
            weight: 2,
            detail:
              'The probe rebuilt a balanced 15-node tree out of counted nodes and recorded how many of them your search touched. The budget is 4 — the height plus one. Walking the whole tree, or collecting the values before looking, touches all 15 and lands here even when the returned node is correct.',
          },
        ],
        tests: [
          {
            call: '(() => { let t = null; for (const v of [8, 3, 10, 1, 6, 14]) t = bstInsert(t, v); return __preorder(t); })()',
            expected: [8, 3, 1, 6, 10, 14],
            label: 'six inserts land in the right places',
          },
          {
            call: '(() => { const n = bstInsert(null, 5); return [n.value, n.left, n.right]; })()',
            expected: [5, null, null],
            label: 'inserting into an empty tree makes the root',
            edge: true,
          },
          {
            call: '(() => { let t = null; for (const v of [5, 5]) t = bstInsert(t, v); return [t.left, t.right.value, t.right.left, t.right.right]; })()',
            expected: [null, 5, null, null],
            label: 'a duplicate goes into the right subtree',
            edge: true,
          },
          {
            call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14]); return bstSearch(t, 6).value; })()',
            expected: 6,
            label: 'search finds a node below the root',
          },
          {
            call: '(() => { const t = __build([8, 4, 12, 2, 6, 10, 14]); return bstSearch(t, 7); })()',
            expected: null,
            label: 'a value that is not there gives null',
            edge: true,
          },
          { call: 'bstSearch(null, 3)', expected: null, label: 'searching an empty tree gives null', edge: true },
          {
            call: '__searchVisits(__build([8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]), 13, function (root, value) { return bstSearch(root, value); }).visits <= 4',
            expected: true,
            label: 'fifteen nodes, at most four touched',
            criterion: 'follows-bst-path',
          },
        ],
        harness: SEARCH_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d09-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d09-height-and-size', state: 'verified_pass' },
    { activityId: 'dsa-v1-d09-traversals', state: 'verified_pass' },
    { activityId: 'dsa-v1-d09-bst-search-insert', state: 'verified_pass' },
  ],
};
