/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D09_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d09-l1",
    "title": "Nodes, edges and four ways to walk a tree",
    "summary": "Root, leaf, depth, height and size, then the three depth-first orders and the queue that gives you level-order.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "MIT 6.006 — Binary Trees, Part 1",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-6-binary-trees-part-1/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Array.prototype.shift",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A binary tree is built from nodes shaped `{ value, left, right }`. `left` and `right` hold the child nodes, and an absent child is `null`. One convention carries the whole module: a tree is its root node, and `null` is the empty tree. The examples assume finite, acyclic binary trees: every non-root node has one parent, fields are ordinary data properties and traversals leave them unchanged. Count field access and reference operations as constant work."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "//         8\n//        / \\\n//       3   5\n//      / \\    \\\n//     9   1    6\nconst tree = {\n  value: 8,\n  left: {\n    value: 3,\n    left: { value: 9, left: null, right: null },\n    right: { value: 1, left: null, right: null },\n  },\n  right: {\n    value: 5,\n    left: null,\n    right: { value: 6, left: null, right: null },\n  },\n};",
        "caption": "The example tree for this lesson. The values are in no useful order, which is allowed: this is a binary tree, not yet a search tree."
      },
      {
        "kind": "prose",
        "body": "The node at the top is the root — 8, the only node with no parent. A node's `left` and `right` are its children, and it is their parent. A node with no children is a leaf, so 9, 1 and 6 are the leaves here. Every node is also the root of a subtree: 3 together with 9 and 1 is the left subtree of 8. The size of a tree is how many nodes it holds, which is 6 for this one."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "This path measures height in *edges*, not nodes. The depth of a node is the number of edges from the root down to it, so the root sits at depth 0 and 9 sits at depth 2. The height of a tree is the depth of its deepest node — the longest root-to-leaf path, again in edges. A single node therefore has height 0, and the empty tree has height -1. That -1 is not a trick to memorise: it makes `height(node) = 1 + max(height(left), height(right))` come out at 0 for a leaf, whose two absent children are both empty trees. Plenty of textbooks count nodes instead and put a leaf at height 1, so state which convention you are using before you quote a number."
      },
      {
        "kind": "table",
        "caption": "The vocabulary, checked against the example tree.",
        "headers": [
          "Term",
          "What it counts",
          "On the example tree"
        ],
        "rows": [
          [
            "Root",
            "The one node with no parent",
            "8"
          ],
          [
            "Leaf",
            "A node with no children",
            "9, 1 and 6"
          ],
          [
            "Depth of a node",
            "Edges from the root down to that node",
            "9 is at depth 2; the root is at depth 0"
          ],
          [
            "Height of a tree",
            "Edges on the longest root-to-leaf path",
            "2, along 8 → 3 → 9"
          ],
          [
            "Size",
            "How many nodes the tree holds",
            "6"
          ],
          [
            "Subtree",
            "Any node together with everything below it",
            "3, 9 and 1 are the left subtree of 8"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "Height is the number that predicts cost. For a nonempty tree of edge-height h, a longest root-to-leaf walk visits h + 1 nodes. With constant work per visited node, its cost is O(h + 1), including the height-zero leaf; empty input is constant work. Size tells you how much the tree holds; height tells you how far you have to travel to reach the bottom of it. The two come apart badly: six nodes can sit at height 2, as above, or at height 5 in a chain."
      },
      {
        "kind": "prose",
        "body": "A traversal visits every node exactly once. The depth-first ones go as far down one branch as they can before backing up, and the three of them differ in one thing only: when the node itself is handled, relative to its two subtrees. Preorder handles the node first, inorder handles it between the subtrees, postorder handles it last."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const preorder = (node, out = []) => {\n  if (node === null) return out;\n  out.push(node.value);        // the node, then its subtrees\n  preorder(node.left, out);\n  preorder(node.right, out);\n  return out;\n};\n\nconst inorder = (node, out = []) => {\n  if (node === null) return out;\n  inorder(node.left, out);\n  out.push(node.value);        // the node, between its subtrees\n  inorder(node.right, out);\n  return out;\n};\n\nconst postorder = (node, out = []) => {\n  if (node === null) return out;\n  postorder(node.left, out);\n  postorder(node.right, out);\n  out.push(node.value);        // the node, after its subtrees\n  return out;\n};",
        "caption": "Three functions, one moved line. The `push` sits in a different place in each and nothing else changes."
      },
      {
        "kind": "prose",
        "body": "On the example tree, preorder gives 8, 3, 9, 1, 5, 6; inorder gives 9, 3, 1, 8, 5, 6; postorder gives 9, 1, 3, 6, 5, 8. Which one you want follows from the job. Preorder reaches a parent before its children, which is what copying a tree or writing it out as nested markup needs. Postorder finishes both subtrees before the node, which is useful when parent cleanup depends on completed child work. JavaScript garbage collection does not require a manual parent/child release order. Inorder is the one the next lesson turns on: run it over a binary search tree and the values come out in order."
      },
      {
        "kind": "prose",
        "body": "Level-order visits every node at depth 0, then every node at depth 1, and so on, left to right inside each level. The depth-first recursive functions above do not give that order; their call stacks go down before moving across. A queue will: take a node off the front, record it, put its children on the back. Anything already waiting is closer to the root, so it leaves first, and the levels come out in order without anyone tracking depth."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const levelOrder = root => {\n  if (root === null) return [];\n\n  const out = [];\n  const queue = [root];\n  let head = 0;                     // where the front of the queue sits now\n\n  while (head < queue.length) {\n    const node = queue[head];\n    head += 1;\n    out.push(node.value);\n    if (node.left !== null) queue.push(node.left);\n    if (node.right !== null) queue.push(node.right);\n  }\n\n  return out;\n};",
        "caption": "Level-order with a head index: the array only grows, and a dequeue moves an index instead of shifting every remaining element."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Under the dense-array element-moving model, shift can move every remaining queue entry. Repeating that on a wide tree can make total queue work quadratic; a chain with at most one queued node does not have that worst case. Actual engine timing can differ. The head index above keeps each dequeue at a fixed number of steps, and pays for it by holding the whole array until the walk ends. Same traversal, different cost, and the one-word call is what hides the difference."
      },
      {
        "kind": "trace",
        "caption": "Level-order on the example tree. Frames show the unprocessed queue frontier, not the processed entries retained in the head-index backing array.",
        "trace": {
          "shape": "queue",
          "frames": [
            {
              "cells": [
                "8"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "The queue starts with the root alone. Nothing has been recorded yet, and the front of the queue is 8.",
              "counter": {
                "label": "Nodes recorded",
                "value": 0
              }
            },
            {
              "cells": [
                "3",
                "5"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "8 leaves the front and is recorded. Its children 3 and 5 join the back, left child first. Recorded so far: 8.",
              "counter": {
                "label": "Nodes recorded",
                "value": 1
              }
            },
            {
              "cells": [
                "5",
                "9",
                "1"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "3 leaves and is recorded. Its children 9 and 1 join the back, behind 5, which has been waiting longer. Recorded so far: 8, 3.",
              "counter": {
                "label": "Nodes recorded",
                "value": 2
              }
            },
            {
              "cells": [
                "9",
                "1",
                "6"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "5 leaves and is recorded. It has no left child, so only 6 joins the back. Recorded so far: 8, 3, 5.",
              "counter": {
                "label": "Nodes recorded",
                "value": 3
              }
            },
            {
              "cells": [
                "1",
                "6"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "9 leaves and is recorded. It is a leaf, so nothing joins the back and the queue shrinks. Recorded so far: 8, 3, 5, 9.",
              "counter": {
                "label": "Nodes recorded",
                "value": 4
              }
            },
            {
              "cells": [
                "6"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "1 leaves and is recorded, another leaf. Only 6 is left waiting. Recorded so far: 8, 3, 5, 9, 1.",
              "counter": {
                "label": "Nodes recorded",
                "value": 5
              }
            },
            {
              "cells": [],
              "note": "6 leaves and is recorded. The queue is empty, so the walk stops. The full level-order is 8, 3, 5, 9, 1, 6 — depth 0, then depth 1, then depth 2.",
              "counter": {
                "label": "Nodes recorded",
                "value": 6
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Under the unit-cost model, all four walks do O(n) work and return an O(n) output array. Excluding that output, the recursive walks use O(h + 1) stack for a nonempty tree: logarithmic when balanced and linear on a chain, with engine-dependent depth limits. The shown head-index queue retains every enqueued node until the walk ends, so it uses O(n) references even on a chain. A queue that releases processed entries can instead track the active frontier, bounded by the tree width. Empty input takes constant work."
      }
    ]
  },
  {
    "id": "dsa-v1-d09-l2",
    "title": "The search property, and the height it buys",
    "summary": "What the binary-search-tree rule demands at every node, why search and insert cost O(h + 1), and why h is not log n unless something keeps the tree in shape.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A binary search tree adds one rule to the binary tree. For every node, every value in its left subtree is smaller than that node's value, and every value in its right subtree is not smaller. Use finite numeric values and a finite numeric query under constant-cost comparisons. Two words in that rule do the work: *every* node, and the whole *subtree* rather than the two children hanging directly off it."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "//         8\n//       /   \\\n//      3     10\n//     / \\      \\\n//    1   6      14\n//       / \\     /\n//      4   7   13\nconst bst = {\n  value: 8,\n  left: {\n    value: 3,\n    left: { value: 1, left: null, right: null },\n    right: {\n      value: 6,\n      left: { value: 4, left: null, right: null },\n      right: { value: 7, left: null, right: null },\n    },\n  },\n  right: {\n    value: 10,\n    left: null,\n    right: { value: 14, left: { value: 13, left: null, right: null }, right: null },\n  },\n};",
        "caption": "Nine values at height 3. Everything left of 8 is smaller than 8, everything right of it is larger, and the same holds at 3, at 6, at 10 and at 14."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Checking each node against its own two children is not enough. Take a root of 8 with a left child of 3, and give that 3 a right child of 10. Every parent-child pair passes: 3 is smaller than 8, and 10 is larger than 3. It is still not a search tree, because 10 sits inside the left subtree of 8, where nothing may reach 8. The damage is real rather than theoretical — a search for 10 turns right at root 8 and cannot reach the misplaced value in its left subtree."
      },
      {
        "kind": "prose",
        "body": "Searching starts at the root and compares. Equal, and you are finished. Smaller, and the value can only be in the left subtree, so the entire right subtree is ruled out without a single look inside it. Larger, and the mirror image. Each unsuccessful comparison with a node discards one subtree and moves down one edge, so the walk visits at most h + 1 nodes and ends at a `null` when nothing holds the value."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const bstSearch = (root, target) => {\n  let node = root;\n\n  while (node !== null) {\n    const value = node.value;\n    if (target === value) return node;\n    node = target < value ? node.left : node.right;\n  }\n\n  return null;\n};",
        "caption": "Search as a loop: one cached node value and up to two comparisons per level, with O(1) auxiliary space."
      },
      {
        "kind": "prose",
        "body": "On the tree above, a search for 7 reads 8, turns left to 3, turns right to 6, turns right to 7: four nodes out of nine. A search for 5 reads 8, 3, 6, 4, then finds `null` where 4's right child would be and reports 5 as absent after the same four reads. Neither walk looked at 10, 14 or 13 at all."
      },
      {
        "kind": "trace",
        "caption": "An inorder walk over a seven-node search tree. Cells are the nodes in level order; the label under each cell is the path to it from the root.",
        "trace": {
          "shape": "tree",
          "legend": [
            "root",
            "L",
            "R",
            "L.L",
            "L.R",
            "R.L",
            "R.R"
          ],
          "frames": [
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "note": "The tree before the walk. The root is 5, its left subtree holds 3 with children 2 and 4, and its right subtree holds 8 with children 7 and 9. Nothing has been recorded."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "active"
                }
              ],
              "note": "Inorder handles the left subtree before the node, so the walk goes 5, then 3, then 2 without recording any of them. 2 has no left child, so 2 is recorded first. Recorded: 2."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "2 is finished, so its parent 3 is recorded next. Everything smaller than 3 has already come out. Recorded: 2, 3."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "active"
                }
              ],
              "note": "The right subtree of 3 is the single node 4, which is recorded next. Recorded: 2, 3, 4."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "The whole left subtree of the root is done, so the root 5 is recorded. Everything recorded so far is smaller than 5, because the left subtree holds exactly the values that are. Recorded: 2, 3, 4, 5."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 5,
                  "role": "active"
                }
              ],
              "note": "The walk moves into the right subtree and descends 8, then 7. 7 has no left child, so 7 is recorded. Recorded: 2, 3, 4, 5, 7."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 5,
                  "role": "settled"
                },
                {
                  "index": 2,
                  "role": "active"
                }
              ],
              "note": "7 is finished, so its parent 8 is recorded. Recorded: 2, 3, 4, 5, 7, 8."
            },
            {
              "cells": [
                "5",
                "3",
                "8",
                "2",
                "4",
                "7",
                "9"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 5,
                  "role": "settled"
                },
                {
                  "index": 2,
                  "role": "settled"
                },
                {
                  "index": 6,
                  "role": "active"
                }
              ],
              "note": "9, the right child of 8, is the last node and is recorded. The walk ends with 2, 3, 4, 5, 7, 8, 9 — ascending, which is what the search property buys an inorder walk."
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Inorder emits the whole left subtree before the node and the whole right subtree after it. Everything in the left subtree is smaller and everything in the right subtree is not smaller, so the output is in order around that node — and because the same holds at every node, the whole list is in order. A nondecreasing inorder result is a useful necessary check, but it does not fully validate the duplicate-right policy. A root 5 with left child 5 emits [5,5] and still violates the strict-left rule. Full validation must carry ancestor bounds with the correct strict/inclusive sides."
      },
      {
        "kind": "prose",
        "body": "Search and insert cost O(h + 1) for a nonempty tree under this unit-cost model, because both follow one downward path. The empty-tree cases are constant work. What h actually is depends entirely on shape. A perfectly balanced tree of 15 values has height 3, so no search reads more than 4 nodes. Insert 1 through 15 in ascending order into an empty tree and every value lands to the right of the one before it: the result is a chain of height 14, and a search for 15 reads all 15 nodes. Same values, same property, same code, and either 4 reads or 15 depending only on the order they arrived in."
      },
      {
        "kind": "table",
        "caption": "Fifteen values in a binary search tree, in two shapes.",
        "headers": [
          "Shape",
          "Height h",
          "Nodes the worst search reads",
          "Class in terms of n"
        ],
        "rows": [
          [
            "Perfectly balanced",
            "3",
            "4",
            "O(log n)"
          ],
          [
            "Built by inserting in ascending order",
            "14",
            "15",
            "O(n)"
          ],
          [
            "Anything in between",
            "Between 3 and 14",
            "h + 1",
            "O(h + 1); h depends on shape"
          ]
        ]
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const bstInsert = (root, value) => {\n  if (root === null) return { value, left: null, right: null };\n\n  let node = root;\n  while (true) {\n    if (value < node.value) {\n      if (node.left === null) {\n        node.left = { value, left: null, right: null };\n        return root;\n      }\n      node = node.left;\n    } else {\n      if (node.right === null) {\n        node.right = { value, left: null, right: null };\n        return root;\n      }\n      node = node.right;\n    }\n  }\n};",
        "caption": "Insert walks to the empty spot the value belongs in and hangs a new leaf there. The comparison `value < node.value` sends smaller values left and everything else — larger and equal alike — right."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "This path sends a value equal to the node it is standing at into the right subtree, which is why the rule above says \"not smaller\" rather than \"larger\". Other codebases send equals left, or keep a count on the node instead of adding a second node, and all three are defensible. Pick one and write it down, because search, insert and delete all have to agree on it. With equals on the right, an inorder walk is non-decreasing rather than strictly ascending: two 5s come out next to each other."
      },
      {
        "kind": "prose",
        "body": "Sorted input is the usual way to end up with the chain, and it arrives by accident. Load records already ordered by id and you build a tree with no branching in it at all, so the O(log n) you were counting on is O(n). Balanced variants — AVL and red-black trees — fix that by rotating subtrees back into shape during insert, and they are outside this path. What matters here is that a nonempty plain BST gives you O(h + 1) and nothing in the plain version keeps h small."
      },
      {
        "kind": "prose",
        "body": "For a nonempty tree, search and insert take O(h + 1) time. The loops use O(1) auxiliary space apart from a new inserted node; ordinary recursive forms use O(h + 1) stack. Empty-tree operations are constant work. A full traversal is O(n) whatever the shape, because it visits every node either way. Finding the smallest value is a walk left until `left` is `null`, which is O(h + 1) in the worst case for a nonempty tree; a left chain reaches that bound, while a right chain has its minimum at the root."
      }
    ]
  }
];
