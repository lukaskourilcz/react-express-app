import { DSA_D09_LESSONS } from '../../../learn-lessons/dsa/d09';
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
 * answer never costs a visit. The proxy is the one taken before the learner's
 * code ran (`__probe`, shared/coding-evaluate.ts), so replacing `Proxy`
 * changes nothing. */
const SEARCH_PROBE = `${TREE_PROBE}
var __searchVisits = function (root, target, run) {
  var visits = 0;
  var counting = true;
  var wrap = function (node) {
    if (!node) return null;
    var seen = false;
    var inner = { value: node.value, left: null, right: null };
    var proxy = new __probe.Proxy(inner, {
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
  lessons: DSA_D09_LESSONS,
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
      summary: 'The BST rule at every node, nonempty search and insert in O(h + 1), the duplicate policy, and why a skewed tree is a chain.',
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
      summary: 'Four questions: single-node height, the global BST rule, shape-dependent search cost and the ordered traversal.',
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
            'The rule applies to every descendant, not just the two nodes hanging off a parent, and 10 is a descendant of 8 on the left. A search for 10 goes right at 8, then left from 12 to an empty child, so it never visits the misplaced 10. Having at most two children makes something a binary tree, which every example in this module already is; the search property is the extra rule on top. The parent-child check is the mistake the lesson names: 10 passes against its parent 3 and still breaks the tree. Missing children are ordinary — 12 has none either, and the tree would be a valid search tree if 10 were not there.',
          competencies: ['trees'],
        },
        {
          id: 'dsa-v1-d09-q3',
          prompt:
            'The distinct values 1 through 1023 form two BSTs. One is perfect; the other uses the plain insertion from this module, in ascending order without rebalancing. Counting visited nodes, what is the worst-case search cost in each?',
          options: [
            '10 nodes in the perfect tree and up to 1023 in the plain ascending build.',
            'About 10 nodes in both, because the search property guarantees O(log n) whatever the insertion order.',
            '1,023 nodes in both, because a search has to be ready to visit every node.',
            'About 10 nodes when balanced and about 32 in the ascending build, because a skewed tree costs the square root of n.',
          ],
          correct: 0,
          explanation:
            'The perfect tree of 1,023 nodes has height 9, and a root-to-leaf walk reads h + 1 = 10 nodes. Ascending inserts put every value to the right of the one before it, producing a chain of height 1,022 where the last value costs all 1,023 reads. The search property alone guarantees nothing about height — keeping h near log n takes rebalancing, which a plain BST does not do. Reading every node describes a full traversal, not a search: the balanced case really does discard half the remaining tree at each step. Nothing here grows like the square root of n; that class does not come up in tree search.',
          competencies: ['trees', 'complexity'],
        },
        {
          id: 'dsa-v1-d09-q4',
          prompt: 'Which traversal guarantees nondecreasing output for every valid BST shape under this module’s duplicate-right rule?',
          options: [
            'Inorder: the whole left subtree, then the node, then the whole right subtree.',
            'Preorder: the node, then the whole left subtree, then the whole right subtree.',
            'Postorder: the whole left subtree, then the whole right subtree, then the node.',
            'Level-order: every node at depth 0, then every node at depth 1, and so on.',
          ],
          correct: 0,
          explanation:
            'Inorder emits everything smaller than a node before it and everything not smaller after it, and that holds at every node, so the whole output is ordered. Equal values remain adjacent in the ordered result, so the guarantee is nondecreasing rather than strictly increasing. Other orders can happen to be sorted on special shapes but do not guarantee it. On the lesson tree preorder and level-order start 8,3, while postorder reaches 1,4,7,6 and decreases. Depth alone supplies no value order.',
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
          'A node is a plain object `{ value, left, right }`. `left` and `right` hold the child nodes, and an absent child is `null`. A tree is its root node, or `null` when the tree is empty.\n\nWrite two functions.\n\n`treeSize(root)` returns how many nodes the tree holds. `treeSize(null)` is 0.\n\n`treeHeight(root)` returns the number of edges on the longest path from the root down to a leaf. A single node has height 0, because there is no edge below it. An empty tree has height -1, which is what makes a leaf work out to `1 + Math.max(-1, -1)`.\n\nA tree can also be a chain — a root whose only child has one child, and so on. A chain of five nodes has size 5 and height 4.\n\nInputs are finite, acyclic binary trees with at most 128 nodes, one parent per non-root node and ordinary data fields; values are finite Numbers. Preserve every node, link, own property, descriptor and prototype; no marker fields or node replacements. Read-only inputs may be frozen. Target: O(n) time per function, where n is the number of nodes under constant-cost field and Number operations. The recursive approach uses O(h + 1) auxiliary stack on a nonempty tree of edge-height h; empty input is constant work.',
        contract: [
          'Leave every node, link, own property, descriptor and prototype unchanged; do not replace nodes or add marker fields.',
          'Height counts edges, not nodes: one node is height 0 and the empty tree is height -1.',
          'Both functions accept `null` as the whole tree and meet it again at every absent child.',
          'Handle a lopsided tree: the taller of the two subtrees decides the height.',
        ],
        starter: `const treeSize = root => {

};

const treeHeight = root => {

};

// Scratch pad — change this before submitting.
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
          'A node is a plain object `{ value, left, right }`, an absent child is `null`, and a tree is its root node or `null` when empty.\n\nWrite four functions, each returning an array of values in the order it visits them.\n\n`inorder(root)` — the whole left subtree, then the node, then the whole right subtree.\n`preorder(root)` — the node, then the left subtree, then the right subtree.\n`postorder(root)` — the left subtree, then the right subtree, then the node.\n`levelOrder(root)` — every node at depth 0, then every node at depth 1, and so on, left to right inside each level.\n\nAll four return `[]` for an empty tree, and all four return a one-element array for a single node. The three depth-first walks fall out of recursion. The simple recursive DFS pattern does not produce level-order. For level-order, use a queue: take the node at the front, record it, and put its children on the back.\n\nInputs are finite, acyclic binary trees with at most 128 nodes, one parent per non-root node and ordinary data fields; values are finite Numbers. Preserve every node, link, own property, descriptor and prototype, including on frozen input. Every invocation must return its own array, without changing arrays returned earlier. Target: O(n) time per traversal, where n is the number of nodes under constant-cost field operations and amortized array append. Every output uses O(n) space; recursive DFS uses O(h + 1) extra stack and the shown head-index queue retains O(n) extra references. Empty input is constant work.',
        contract: [
          'Return a fresh array on every call; preserve earlier outputs and every input node, link, property, descriptor and prototype.',
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

// Scratch pad — change this before submitting.
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
          'A node is a plain object `{ value, left, right }`, an absent child is `null`, and a tree is its root node or `null` when empty. In a binary search tree, every value in a node\'s left subtree is smaller than that node\'s value and every value in its right subtree is not smaller.\n\n`bstInsert(root, value)` puts `value` where the property demands and returns the root of the tree: the root you were handed, or the new node when the tree was empty. A value equal to the node you are standing at goes into the right subtree, never the left — that is this path\'s duplicate policy.\n\n`bstSearch(root, value)` returns the node object holding `value`, or `null` when no node holds it. It has to follow the property: compare, descend into one subtree, and forget the other. The grade rebuilds a balanced 15-node tree out of counted nodes and records how many of them your search touched. The budget is 4, which is the height plus one. Reading every node goes over it even when the answer is right.\n\nInputs are finite, acyclic valid BSTs with ordinary mutable node fields and at most 128 nodes after insertion. Values and queries are finite Numbers, including fractions. Preserve existing node identities, values, properties, descriptors and prototypes. Insert attaches exactly one new leaf at one formerly null link; search changes nothing and returns the first equal node encountered. Target: O(n) time in the worst case for a plain tree, where n is its node count under constant-cost field operations and comparisons. The more precise nonempty bound is O(h + 1), with edge-height h; there is no balancing guarantee. The loop uses O(1) extra space apart from the new node; allowed recursion uses O(h + 1) stack. Empty input is constant work.',
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

// Scratch pad — change this before submitting.
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
            label: 'Search meets the sampled path budget',
            critical: true,
            weight: 2,
            detail:
              'The probe rebuilt a balanced 15-node tree out of counted nodes and recorded how many of them your search touched. The budget is 4 — the height plus one. Walking the whole tree, or collecting the values before looking, touches all 15 and fails this fixture even when the returned node is correct. These bounded probes do not prove an arbitrary algorithm uses one path on every input.',
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
