/** D05 — Singly linked lists.
 *
 * A structure whose nodes have no positional index. A node is
 * `{ value, next }`, the tail's `next` is `null`, and the list is its head
 * node or `null`. Everything the module teaches follows from that: a walk is
 * the only way in, so searching costs a visit per node, while rewiring a link
 * you already hold costs two assignments.
 *
 * The reversal exercise is graded on method. Its harness records the identity
 * of the node objects handed in and compares them with the nodes of the
 * returned list, so a solution that collects the values and builds a fresh
 * list fails even when the values come out in the right order. That is a
 * bounded contract about these inputs, never a proof about arbitrary code. */

import type { ModuleSource } from '../../types';

/** Builders and readers shared by the visible and hidden assertions of every
 * exercise in this module. The grader captures them in a private scope and
 * exports immutable bindings. Both walks stop after a fixed number of nodes: a submission that
 * accidentally builds a cycle then fails an assertion instead of burning the
 * whole run's deadline. */
const LIST_PROBE = `
var __LIST_LIMIT = 256;
var __build = function (values) {
  var head = null;
  for (var i = values.length - 1; i >= 0; i -= 1) head = { value: values[i], next: head };
  return head;
};
var __toArray = function (head) {
  var out = [];
  var node = head;
  while (node && out.length < __LIST_LIMIT) {
    out[out.length] = node.value;
    node = node.next;
  }
  return out;
};
var __chain = function (head) {
  var out = [];
  var node = head;
  while (node && out.length < __LIST_LIMIT) {
    out[out.length] = node;
    node = node.next;
  }
  return out;
};
var __sameStoredValue = function (left, right) {
  if (left !== right) return left !== left && right !== right;
  return left !== 0 || 1 / left === 1 / right;
};
var __snapshot = function (head) {
  var nodes = __chain(head), values = [], links = [];
  for (var i = 0; i < nodes.length; i += 1) {
    values[i] = nodes[i].value;
    links[i] = nodes[i].next;
  }
  return { nodes: nodes, values: values, links: links };
};
var __unchanged = function (snapshot, linksToo) {
  for (var i = 0; i < snapshot.nodes.length; i += 1) {
    var node = snapshot.nodes[i];
    if (!__sameStoredValue(node.value, snapshot.values[i])) return false;
    if (__probe.keys(node).length !== 2) return false;
    if (linksToo && node.next !== snapshot.links[i]) return false;
  }
  return true;
};
`.trim();

/** Records the node objects of a freshly built list, runs the learner's
 * reversal on it and reports whether the returned list is made of the same
 * objects in the opposite order. Object identity is the observation, so
 * rebuilding from the values is visible without reading the source. */
const NODE_IDENTITY_PROBE = `${LIST_PROBE}
var __reusesNodes = function (values, run) {
  var head = __build(values);
  var before = __chain(head);
  var after = __chain(run(head));
  if (after.length !== before.length) return false;
  if (after.length && after[after.length - 1].next !== null) return false;
  for (var i = 0; i < after.length; i += 1) {
    if (after[i] !== before[before.length - 1 - i]) return false;
  }
  return true;
};`;

export const DSA_D05: ModuleSource = {
  id: 'dsa-v1-d05',
  title: 'Singly linked lists',
  outcomes: [
    'Build and walk a chain of `{ value, next }` nodes, ending every walk at the `null` in the tail.',
    'Rewire a list in place: prepend a node, unlink the first match, and reverse the links without allocating a second list.',
    'Split the cost of a list operation into the walk that finds the place and the rewiring that changes it.',
  ],
  competencies: ['linked-lists', 'complexity'],
  dependsOn: ['dsa-v1-d04'],
  estimatedMinutes: 115,
  lessons: [
    {
      id: 'dsa-v1-d05-l1',
      title: 'Nodes, references and the missing index',
      summary: 'What a node holds, why the list is just its first node, and what it costs to look something up when you cannot jump.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-10-14' },
        {
          label: 'MDN — Working with objects',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects',
          reviewedOn: '2026-10-14',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A singly linked list is a chain of small objects. Each one — a node — holds a value and a reference to the node after it, and nothing else. There is no surrounding container: the list *is* its first node, called the head, or `null` when the chain is empty.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const tail = { value: 3, next: null };\nconst middle = { value: 2, next: tail };\nconst head = { value: 1, next: middle };\n\n// The whole list is that first node.\n// An empty list is null, not an empty object.\nconst empty = null;',
          caption: 'Three nodes built back to front, because a node needs the one after it to exist already.',
        },
        {
          kind: 'prose',
          body:
            '`next` holds a reference, not a copy. `middle.next` and `tail` name one object, so `tail.value = 30` changes what `middle.next.value` reads. That also settles what `===` means between two node variables: it asks whether they name the same node, which is usually the question you want.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The last node\'s `next` is `null`, and that `null` is the only marker of the end. Leave `next` off a node and it reads `undefined`; a walk that continues while the link is `!== null` then steps one place too far and throws on `undefined.next`. Write `next: null` when you build a tail.',
        },
        {
          kind: 'prose',
          body:
            'Walking is the one primitive the shape gives you. Start a variable at the head, and while it is not `null`, use `node.value` and then reassign `node = node.next`. Every traversal in this module is that loop with a different body.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const length = head => {\n  let count = 0;\n  let node = head;\n  while (node !== null) {\n    count += 1;\n    node = node.next;\n  }\n  return count;\n};',
          caption: 'Counting nodes: one visit each, and the same loop handles the empty list without a special case.',
        },
        {
          kind: 'prose',
          body:
            'This module counts ordinary field reads/writes, comparisons of bounded values and allocation of a small node as constant work. Lists are finite and acyclic, with plain data fields and a null tail; getters, proxies and garbage-collection pauses are outside that model. Arrays use the dense-array model from the previous module, not an engine timing guarantee. Nothing here is indexed: position 900 needs 900 links from the head. The chain does not store its own length or middle.',
        },
        {
          kind: 'trace',
          caption: 'Searching a four-node list for 7: the walk starts at the head and stops when it finds a match.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['4', '1', '7', '3'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The walk starts at the head, which holds 4. That is not 7, so it follows the link to the next node.',
                counter: { label: 'Nodes visited', value: 1 },
              },
              {
                cells: ['4', '1', '7', '3'],
                marks: [{ index: 0, role: 'excluded' }, { index: 1, role: 'active' }],
                note: 'The second node holds 1, still not 7. Two nodes visited, and the first one can never be revisited: the links only point forward.',
                counter: { label: 'Nodes visited', value: 2 },
              },
              {
                cells: ['4', '1', '7', '3'],
                marks: [{ index: 0, role: 'excluded' }, { index: 1, role: 'excluded' }, { index: 2, role: 'settled' }],
                note: 'The third node holds 7. The search returns that node after three visits, and the fourth node is never touched.',
                counter: { label: 'Nodes visited', value: 3 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Three visits found 7. A value that is not in the list costs four visits and then a `null`, and that is the worst case for a list of four nodes: search is O(n) in the number of nodes. Sorting the values first would not rescue it — binary search needs to jump to the middle, and a chain of forward links offers no way to jump.',
        },
        {
          kind: 'table',
          caption: 'Where an array and a singly linked list of n elements differ, under this path\'s cost model.',
          headers: ['Operation', 'Array', 'Singly linked list'],
          rows: [
            ['Read the element at a known index', 'O(1)', 'O(n): you have to walk there'],
            ['Insert at the front', 'O(n): `unshift` moves every later element up one slot', 'O(1): one new node in front of the head'],
            ['Insert after a position you already hold', 'O(n): later elements shift', 'O(1): two assignments'],
            ['Find a value', 'O(n)', 'O(n)'],
            ['Read the length', 'O(1): `length` is stored', 'O(n), unless you keep a count of your own'],
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Equal growth classes do not mean equal speed. A list follows a reference to a separate node at each step; an array uses indexed elements. Both scans are O(n) in this model, but engine layout and allocation costs affect actual time. Big O alone does not say which is faster.',
        },
        {
          kind: 'prose',
          body:
            'A linked list can suit frequent changes at the front or after a known node: an undo chain, a queue that also keeps a tail, or one possible hash-table bucket. It is a poor fit for frequent indexed access. A head-index queue is another option; choose from the operations you need rather than assuming one structure is always faster.',
        },
      ],
    },
    {
      id: 'dsa-v1-d05-l2',
      title: 'Rewiring: prepend, unlink, reverse',
      summary: 'Changing a list means assigning to somebody\'s `next`. The assignment is constant; the walk that reaches the right place is not.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-10-14' },
        {
          label: 'MDN — Memory management',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management',
          reviewedOn: '2026-10-14',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Rewiring changes a node\'s `next` while keeping the existing nodes and their values. Insertion also creates one small node. These are changes to object references, not a promise about physical memory addresses or engine allocation. The walk to reach the right place can dominate the work.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const prepend = (head, value) => ({ value, next: head });\n\nconst list = prepend(prepend(prepend(null, 3), 2), 1);\n// list is 1 -> 2 -> 3 -> null',
          caption: 'Prepending: one new node pointing at the old head, returned as the new head.',
        },
        {
          kind: 'prose',
          body:
            'Under the stated field/allocation model, prepending is O(1) in the number of existing nodes. In the dense-array model, front insertion moves n elements and takes O(n). This compares counted work, not a guaranteed JavaScript engine duration.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const insertAfter = (node, value) => {\n  const inserted = { value, next: node.next };\n  node.next = inserted;\n  return inserted;\n};',
          caption: 'Inserting after a node you already hold: build, link forward, then repoint the node in front.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Save the old forward link before overwriting it. In this example the object literal saves it in `inserted.next`; assigning the existing node\'s link then keeps the rest reachable. Literally moving `node.next = inserted` above the `const` declaration throws because `inserted` has not been initialized. Building a new node with `next: null` and then overwriting the only old link would instead detach the rest.',
        },
        {
          kind: 'prose',
          body:
            'Inserting after a node you hold is O(1). Reaching zero-based position k first takes k links, so insertion there is O(k + 1), with O(n) worst-case work when k grows with a list of n nodes. A fixed small k is still constant. Separate the walk from the rewiring.',
        },
        {
          kind: 'prose',
          body:
            'Deleting splits the same way, with one extra asymmetry. To unlink a node you need the node *before* it, because `next` points forward and there is no route back. A delete by value therefore walks with the previous node in hand and looks one step ahead of itself.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// `previous` is the node in front of the one being dropped.\nprevious.next = previous.next.next;\n\n// The head has nothing in front of it, so removing it\n// means handing the caller a different head.\nconst shorter = head.next;',
          caption: 'Two shapes of removal: one assignment in the middle of the list, a new head at the front of it.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Suppose a list has at least two nodes and no other references to those nodes are kept. After `list = list.next.next`, the first two nodes are unreachable from the program\'s remaining roots and may be reclaimed. The suffix stays reachable through the new head. This does not guarantee when garbage collection runs.',
        },
        {
          kind: 'prose',
          body:
            'Reversing is the same assignment repeated the length of the list. Walk once and point each node at the node you just came from, holding three references as you go: the part already reversed, the node in hand, and the rest you have not touched. The third one is the one people forget — read the forward link into a variable before you overwrite it, or the remainder of the list is unreachable the moment you assign.',
        },
        {
          kind: 'trace',
          caption: 'Reversing 1 → 2 → 3 in place. Each frame shows the reversed part, the node in hand, and the untouched rest.',
          trace: {
            shape: 'array',
            legend: ['Reversed so far', 'Node in hand', 'Rest of the list'],
            frames: [
              {
                cells: ['null', '1', '2 → 3 → null'],
                marks: [{ index: 1, role: 'active' }],
                note: 'Start. Nothing is reversed yet, the node in hand is the head holding 1, and 2 → 3 is still linked the original way.',
                counter: { label: 'Links flipped', value: 0 },
              },
              {
                cells: ['1 → null', '2', '3 → null'],
                marks: [{ index: 0, role: 'settled' }, { index: 1, role: 'active' }],
                note: 'Node 1 now points at null, so it has become the tail. The node in hand moves to 2, and the rest is 3.',
                counter: { label: 'Links flipped', value: 1 },
              },
              {
                cells: ['2 → 1 → null', '3', '—'],
                marks: [{ index: 0, role: 'settled' }, { index: 1, role: 'active' }],
                note: 'Node 2 now points back at node 1. The node in hand moves to 3, and nothing is left after it.',
                counter: { label: 'Links flipped', value: 2 },
              },
              {
                cells: ['3 → 2 → 1 → null', 'null', '—'],
                marks: [{ index: 0, role: 'settled' }, { index: 1, role: 'excluded' }],
                note: 'Node 3 points back at node 2 and the node in hand is null, so the walk stops. Node 3 is the new head, and the same three objects hold the same three values in the opposite order.',
                counter: { label: 'Links flipped', value: 3 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Three links flipped for three nodes: O(n) time, and the three references are all the memory it takes, so O(1) auxiliary space. Copying the values into an array and building a fresh list backwards answers the same request in O(n) time as well, but it allocates an array of n values and n new nodes on top of the input. Anything still holding the old head then points at a list you did not update.',
        },
        {
          kind: 'table',
          caption: 'What each operation in this module costs on a list of n nodes.',
          headers: ['Operation', 'Time', 'Auxiliary space', 'Why'],
          rows: [
            ['Prepend a value', 'O(1)', 'O(1)', 'One new node, one link, no walking'],
            ['Insert after a node you hold', 'O(1)', 'O(1)', 'Two assignments'],
            ['Insert at zero-based position k', 'O(k + 1), O(n) worst case', 'O(1)', 'k links to reach the place, then constant rewiring'],
            ['Find a value', 'O(n)', 'O(1)', 'No index, and an absent value visits every node'],
            ['Delete the first match', 'O(n)', 'O(1)', 'The search dominates; the unlink itself is one assignment'],
            ['Reverse in place', 'O(n)', 'O(1)', 'One pass, three references whatever the length'],
            ['Reverse through an array', 'O(n)', 'O(n)', 'An array of n values, plus n new nodes'],
          ],
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d05-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: nodes, references and the missing index',
      summary: 'Node shape, the head as the whole list, the null tail, and the cost of a lookup without an index.',
      competencies: ['linked-lists'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d05-l1',
    },
    {
      id: 'dsa-v1-d05-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: rewiring, prepend, unlink, reverse',
      summary: 'Constant-time rewiring against the linear walk that reaches it, plus a pointer trace of an in-place reversal.',
      competencies: ['linked-lists', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d05-l2',
    },
    {
      id: 'dsa-v1-d05-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Linked-list checks',
      summary: 'Four questions on search against known-position insert, unreachable nodes, the null tail, and the space bill of two reversals.',
      competencies: ['linked-lists', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d05-q1',
          prompt:
            'A finite, acyclic list holds n plain nodes with bounded values. Count ordinary field operations and one small-node allocation as constant work. You already hold the insertion node; search starts at the head. What are the tightest classes for inserting after that node and worst-case search?',
          options: [
            'Insert O(1), search O(n): the known node needs constant rewiring; an absent value needs a full walk.',
            'Insert O(1), search O(1): neither operation shifts later elements, so neither grows with the list.',
            'Insert O(n), search O(n): both operations must walk from the head, even with the insertion node supplied.',
            'Insert O(n), search O(1): insertion rewrites all later links; search jumps directly to the matching value.',
          ],
          correct: 0,
          explanation:
            'Inserting after a node you hold is two assignments: point the new node at `node.next`, then point `node` at the new node. Nothing after it moves, so it is O(1). The search has no index to exploit and no way to jump, so an absent value visits all n nodes. Claiming O(1) for both confuses "nothing shifts" with "nothing is visited". Claiming O(n) for both forgets that the insert was handed its node and never walks. The last option inverts the two: relinking touches exactly one node, and the search is the half that cannot be shortened.',
          competencies: ['linked-lists', 'complexity'],
        },
        {
          id: 'dsa-v1-d05-q2',
          prompt:
            'A finite list has at least three plain nodes. Its head is the only reference into the list, and there are no other strong references to the first two nodes. After `head = head.next.next`, what is true?',
          options: [
            'The first two nodes become unreachable and may be collected; the suffix is still reachable from the new head.',
            'The first two nodes remain reachable from the third, because each next link also points back to its predecessor.',
            'The first two nodes are immediately freed by the assignment; the suffix survives without any collection delay.',
            'All nodes become unreachable after the assignment, because losing the old head also removes every later link.',
          ],
          correct: 0,
          explanation:
            'Reassigning the variable does not touch a single `next`, so nodes three onwards are exactly as they were — the third node is simply the head now. The two dropped nodes still point forward into the list, but nothing points at *them*, which is what makes them unreachable. `next` is one reference in one direction, so the third node cannot be followed backwards. And unreachable is not the same as freed: the engine reclaims memory on its own schedule, not at the moment of the assignment.',
          competencies: ['linked-lists'],
        },
        {
          id: 'dsa-v1-d05-q3',
          prompt: 'Lists are finite and acyclic, with plain nodes and a null tail. Which input makes `lastValue` throw, and what is the smallest fix?',
          context: {
            language: 'javascript',
            code: 'const lastValue = head => {\n  let node = head;\n  while (node.next !== null) node = node.next;\n  return node.value;\n};',
          },
          options: [
            'An empty list reads null.next before the loop. Handle a null head before reading its next field.',
            'A one-node list leaves node unassigned when the body is skipped. Assign node inside the loop instead.',
            'A two-node list steps beyond the tail and reads null.value. Stop one link earlier in the loop.',
            'No listed input throws because the condition guards the current node. Keep the function unchanged.',
          ],
          correct: 0,
          explanation:
            'With `head === null`, `node` is `null` and evaluating `node.next` throws before the loop body ever runs. A one-node list is fine: `node` was assigned from `head`, the condition is false immediately, and the head\'s value comes back. A two-node list is fine too, because the loop stops with `node` on the tail rather than past it. The condition guards the *next* link, not the node in hand, which is exactly why an empty list slips through it.',
          competencies: ['linked-lists'],
        },
        {
          id: 'dsa-v1-d05-q4',
          prompt:
            'Reverse a finite list of n plain nodes under constant field/allocation work and amortized constant array append. A collects values into an array, then builds a fresh list backwards. B walks once, rewiring with three local references. Which time and auxiliary-space comparison is tightest?',
          options: [
            'Both take O(n) time; A needs O(n) temporary array slots, while B keeps O(1) working references.',
            'Both take O(n) time and O(n) auxiliary space; visiting every node needs one temporary slot per node.',
            'A takes O(n²) time to fill its array, while B takes O(n); both need O(1) working references.',
            'Both take O(n) time and O(1) auxiliary space; A\'s extra references reuse values already stored.',
          ],
          correct: 0,
          explanation:
            'A makes one pass to collect values and one to build the result; B makes one rewiring pass. Both are O(n) under the stated model. Even when output nodes are excluded from auxiliary space, A\'s temporary array holds n entries; B keeps three local references. Touching n nodes does not require n temporary slots. Amortized constant append makes n appends O(n), and references to existing values still occupy array slots.',
          competencies: ['complexity', 'linked-lists'],
        },
      ],
    },
    {
      id: 'dsa-v1-d05-prepend-and-find',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Prepend and find',
      summary: 'Add a node at the front in constant time, and walk the chain to return the first node holding a value.',
      competencies: ['linked-lists', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          'A node is a plain object `{ value, next }`. `next` holds the node after it, and the last node\'s `next` is `null`. A list is its head node, or `null` when the list is empty.\n\nWrite two functions.\n\n`prepend(head, value)` builds one new node holding `value`, points it at the head it was given, and returns it as the new head. `prepend(null, 5)` gives a one-node list. The nodes already in the list keep their identity: `prepend(head, 1).next` is the same object as `head`, not a copy of it.\n\n`find(head, value)` walks from the head and returns the first node whose `value` is strictly equal (`===`) to the one asked for, or `null` when no node holds it. `find(null, 7)` is `null`. When several nodes hold the value, return the first one. Both functions leave existing node values, links and fields unchanged. Inputs are finite, acyclic chains of plain data nodes ending in null; values may be primitive values or object/symbol references. Strict equality means NaN never matches, while -0 and 0 do.\n\nTarget: O(n) time for find, with O(1) prepend and O(1) auxiliary space. n is the number of nodes. Count ordinary field operations, bounded-value comparisons and one small-node allocation as constant work; getters, proxies and engine pauses are outside this model.',
        contract: [
          '`find` returns the node object itself, or `null` — never the value and never an index.',
          '`prepend` links one new node in front of the head it was given; it never copies or rebuilds the rest.',
          'Compare with `===`, so `0` and `false` are different values, and so are `2` and `\'2\'`.',
          'Both functions accept `null` as the head.',
        ],
        starter: `const prepend = (head, value) => {

};

const find = (head, value) => {

};

// Scratch pad — change this before submitting.
const list = prepend(prepend(null, 2), 1);
console.log(find(list, 2));
`,
        skeleton: `const prepend = (head, value) => {
  return /* a new node holding value, pointing at head */;
};

const find = (head, value) => {
  let node = /* start at the head */;

  while (/* there is still a node in hand */) {
    // return it when its value matches
    // otherwise step to the node after it
  }

  return null;
};`,
        hints: [
          'The returned node needs two fields: the supplied value and a reference to the original head. Think about why copying the old head would break the identity check.',
          'Walk with a variable rather than a counter. Start it at `head`; while it is not `null`, compare `node.value`, and otherwise reassign `node = node.next`.',
          'Both functions survive an empty list on their own. `prepend` links a new node at `null`, and `find` never enters its loop, so it falls through to `return null`.',
        ],
        approach: [
          'For `prepend`, build one node whose `next` is the head you were handed.',
          'Return that node: it is the new head, and the old head is now the second node.',
          'For `find`, start a walking variable at the head.',
          'While the walker is not `null`, return it when its value matches with `===`, and otherwise move it to `node.next`.',
          'Return `null` once the walk falls off the end of the chain.',
        ],
        tests: [
          {
            call: '(() => __toArray(prepend(null, 5)))()',
            expected: [5],
            label: 'prepending to an empty list gives a one-node list',
            edge: true,
          },
          { call: '(() => __toArray(prepend(__build([2, 3]), 1)))()', expected: [1, 2, 3] },
          {
            call: '(() => { const head = __build([2, 3]); return prepend(head, 1).next === head; })()',
            expected: true,
            label: 'the old head is linked, not copied',
          },
          {
            call: '(() => { const head = __build([1, 2, 3]); return find(head, 2) === head.next; })()',
            expected: true,
            label: 'find returns the node itself',
          },
          {
            call: '(() => { const head = __build([7, 7]); return find(head, 7) === head; })()',
            expected: true,
            label: 'two nodes hold the value, and the first one comes back',
          },
          { call: 'find(__build([4, 5, 6]), 9)', expected: null, label: 'a value that is absent gives null', edge: true },
          { call: 'find(null, 7)', expected: null, label: 'searching an empty list gives null', edge: true },
        ],
        harness: LIST_PROBE,
      },
    },
    {
      id: 'dsa-v1-d05-delete-first-match',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Delete the first match',
      summary: 'Unlink the first node holding a value, treating the head as the case with nothing in front of it.',
      competencies: ['linked-lists', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'A node is a plain object `{ value, next }`. `next` holds the node after it, and the last node\'s `next` is `null`. A list is its head node, or `null` when the list is empty.\n\nWrite `deleteFirst(head, value)`, which removes the first node whose `value` is strictly equal (`===`) to the one asked for and returns the head of the resulting list.\n\nFour cases have to work. Removing the head returns the second node, because that node is no longer the resulting head. Removing a node in the middle or at the end returns the original head. A value that no node holds returns the list unchanged. `deleteFirst(null, 1)` returns `null`.\n\nOnly the first match goes: `deleteFirst` on 4 → 4 → 4 leaves 4 → 4. Remove the node by rewiring the `next` of the node in front of it; the resulting list uses the surviving original nodes with their original values. Do not move values or change unrelated fields. Inputs are finite, acyclic chains of plain data nodes with a null tail; values may be primitives or object/symbol references. Strict equality means NaN never matches, while -0 and 0 do.\n\nTarget: O(n) time and O(1) auxiliary space, where n is the node count. The goal counts ordinary field operations, bounded-value comparisons and small-node allocation as constant work; it excludes getters, proxies and engine pauses. Checks observe returned identity, values and links on finite fixtures, not arbitrary allocation or complexity.',
        contract: [
          'Return the head of the list after the removal, which differs from the head you were given only when you removed it.',
          'Remove exactly one node: later nodes holding the same value stay where they are.',
          'Rewire the predecessor link; retain surviving original nodes and their values. Do not change unrelated fields or the removed node.',
          'An absent value and an empty list both leave the caller holding what it had.',
        ],
        starter: `const deleteFirst = (head, value) => {

};

// Scratch pad — change this before submitting.
const list = { value: 1, next: { value: 2, next: null } };
console.log(deleteFirst(list, 1));
`,
        skeleton: `const deleteFirst = (head, value) => {
  if (/* the list is empty */) return null;
  if (/* the head itself matches */) return /* the second node */;

  let previous = head;
  while (/* there is a node after previous */) {
    if (/* that node holds the value */) {
      // unlink it by pointing previous past it
      return head;
    }
    previous = /* step forward */;
  }

  return head;
};`,
        hints: [
          'The head is the only node with nothing in front of it, so deal with it first: when `head.value` matches, the new head is `head.next` and there is nothing else to do.',
          'For every other node you need the one *before* the match, because the links only point forward. Walk a `previous` variable and look at `previous.next`.',
          'Keep the predecessor linked to the node after the match. Other callers may still hold the removed node, so changing the list does not mean that object disappears.',
        ],
        approach: [
          'Return `null` straight away when the head is `null`.',
          'When the head itself holds the value, return `head.next` as the new head.',
          'Otherwise walk a `previous` variable for as long as `previous.next` exists.',
          'When `previous.next` holds the value, set `previous.next = previous.next.next` and return the original head.',
          'Return the original head unchanged when the walk reaches the end without a match.',
        ],
        tests: [
          { call: '(() => __toArray(deleteFirst(__build([1, 2, 3]), 1)))()', expected: [2, 3], label: 'removing the head' },
          { call: '(() => __toArray(deleteFirst(__build([1, 2, 3]), 2)))()', expected: [1, 3], label: 'removing a node in the middle' },
          { call: '(() => __toArray(deleteFirst(__build([1, 2, 3]), 3)))()', expected: [1, 2], label: 'removing the last node' },
          {
            call: '(() => __toArray(deleteFirst(__build([1, 2, 3]), 9)))()',
            expected: [1, 2, 3],
            label: 'a value no node holds leaves the list alone',
            edge: true,
          },
          { call: 'deleteFirst(null, 1)', expected: null, label: 'an empty list stays empty', edge: true },
          {
            call: '(() => __toArray(deleteFirst(__build([4, 4, 4]), 4)))()',
            expected: [4, 4],
            label: 'only the first of three equal values goes',
          },
          {
            call: '(() => __toArray(deleteFirst(__build([7]), 7)))()',
            expected: [],
            label: 'removing the only node leaves an empty list',
            edge: true,
          },
        ],
        harness: LIST_PROBE,
      },
    },
    {
      id: 'dsa-v1-d05-reverse-list',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Reverse the links',
      summary: 'Reverse existing links while preserving node/value identity; aim for constant auxiliary space.',
      competencies: ['linked-lists', 'complexity'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'A node is a plain object `{ value, next }`. `next` holds the node after it, and the last node\'s `next` is `null`. A list is its head node, or `null` when the list is empty.\n\nWrite `reverseList(head)`, which reverses the links and returns the new head — the node that used to be last. `reverseList(null)` returns `null`, and a one-node list comes back as that same node with its `next` still `null`. After reversing 1 → 2 → 3 the old head holds 1 and its `next` is `null`.\n\nKeep every original node, its value and any unrelated fields; only its next link changes. Values may include primitives and object/symbol references. Input is a finite, acyclic chain of plain data nodes with a null tail.\n\nTarget: O(n) time and O(1) auxiliary space, where n is the node count. Aim for a fixed number of working references rather than an array or recursion stack that grows with n. Count ordinary field work and bounded values as constant; getters, proxies and engine pauses are excluded. The grade observes finite returned-node identity, value preservation and link order. It does not measure temporary storage or prove the efficiency goal; a fresh list fails identity even if its values look equal.',
        contract: [
          'Reverse by reassigning `next` on the nodes you were given; the list you return must be made of those same node objects.',
          'Do not replace returned nodes or their values, and do not change unrelated fields.',
          'Efficiency goal: O(1) auxiliary space; finite identity checks alone do not measure temporary storage.',
          'An empty list returns `null`; a one-node list returns that node with `next` still `null`.',
        ],
        starter: `const reverseList = head => {

};

// Scratch pad — change this before submitting.
const list = { value: 1, next: { value: 2, next: { value: 3, next: null } } };
console.log(reverseList(list));
`,
        skeleton: `const reverseList = head => {
  let previous = /* nothing is reversed yet */;
  let current = head;

  while (/* there is still a node in hand */) {
    const rest = /* keep the forward link before overwriting it */;
    // point current back at previous
    // move previous and current one step along
  }

  return /* the node the walk finished on */;
};`,
        hints: [
          'Three references are enough: the part already reversed, the node in hand, and the rest of the list. Nothing else grows with the length.',
          'Keep a reference to the unprocessed suffix before changing the current link. Without another saved reference, the next step of the walk would be lost.',
          'The loop ends when the node in hand is `null`. At that point the reversed part is the whole list, and its first node is what you return.',
        ],
        approach: [
          'Start the reversed part at `null` and the node in hand at the head.',
          'While the node in hand is not `null`, save its forward link in a local variable.',
          'Point the node in hand back at the reversed part.',
          'Move the reversed part to the node in hand, and the node in hand to the saved link.',
          'Return the reversed part once the walk ends: it starts at the node that used to be last.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct order, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty list, a one-node list, a two-node list, and that the node that used to be the head now ends the list with `next === null`.',
          },
          {
            id: 'in-place-links',
            label: 'The reversed list reuses the original nodes',
            critical: true,
            weight: 2,
            detail:
              'Finite fixtures compare the returned nodes, their retained values and the final null tail with the original chain. New returned nodes or cloned values fail these observations. This does not measure temporary allocations or establish O(1) auxiliary space.',
          },
        ],
        tests: [
          { call: '(() => __toArray(reverseList(__build([1, 2, 3]))))()', expected: [3, 2, 1] },
          { call: 'reverseList(null)', expected: null, label: 'an empty list reverses to an empty list', edge: true },
          { call: '(() => __toArray(reverseList(__build([9]))))()', expected: [9], label: 'one node is its own reversal', edge: true },
          { call: '(() => __toArray(reverseList(__build([1, 2]))))()', expected: [2, 1], label: 'the smallest real reversal' },
          {
            call: '(() => { const head = reverseList(__build([1, 2, 3])); return head.next.next.next; })()',
            expected: null,
            label: 'the new tail ends in null',
            edge: true,
          },
          {
            call: '__reusesNodes([1, 2, 3, 4], function (head) { return reverseList(head); })',
            expected: true,
            label: 'the reversed list is made of the four nodes handed in',
            criterion: 'in-place-links',
          },
          {
            call: '__reusesNodes([8], function (head) { return reverseList(head); })',
            expected: true,
            label: 'a one-node list returns the node it was given',
            criterion: 'in-place-links',
          },
        ],
        harness: NODE_IDENTITY_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d05-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d05-prepend-and-find', state: 'verified_pass' },
    { activityId: 'dsa-v1-d05-delete-first-match', state: 'verified_pass' },
    { activityId: 'dsa-v1-d05-reverse-list', state: 'verified_pass' },
  ],
};
