/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D05_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d05-l1",
    "title": "Nodes, references and the missing index",
    "summary": "What a node holds, why the list is just its first node, and what it costs to look something up when you cannot jump.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Working with objects",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A singly linked list is a chain of small objects. Each one — a node — holds a value and a reference to the node after it, and nothing else. There is no surrounding container: the list *is* its first node, called the head, or `null` when the chain is empty."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const tail = { value: 3, next: null };\nconst middle = { value: 2, next: tail };\nconst head = { value: 1, next: middle };\n\n// The whole list is that first node.\n// An empty list is null, not an empty object.\nconst empty = null;",
        "caption": "Three nodes built back to front, because a node needs the one after it to exist already."
      },
      {
        "kind": "prose",
        "body": "`next` holds a reference, not a copy. `middle.next` and `tail` name one object, so `tail.value = 30` changes what `middle.next.value` reads. That also settles what `===` means between two node variables: it asks whether they name the same node, which is usually the question you want."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "The last node's `next` is `null`, and that `null` is the only marker of the end. Leave `next` off a node and it reads `undefined`; a walk that continues while the link is `!== null` then steps one place too far and throws on `undefined.next`. Write `next: null` when you build a tail."
      },
      {
        "kind": "prose",
        "body": "Walking is the one primitive the shape gives you. Start a variable at the head, and while it is not `null`, use `node.value` and then reassign `node = node.next`. Every traversal in this module is that loop with a different body."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const length = head => {\n  let count = 0;\n  let node = head;\n  while (node !== null) {\n    count += 1;\n    node = node.next;\n  }\n  return count;\n};",
        "caption": "Counting nodes: one visit each, and the same loop handles the empty list without a special case."
      },
      {
        "kind": "prose",
        "body": "This module counts ordinary field reads/writes, comparisons of bounded values and allocation of a small node as constant work. Lists are finite and acyclic, with plain data fields and a null tail; getters, proxies and garbage-collection pauses are outside that model. Arrays use the dense-array model from the previous module, not an engine timing guarantee. Nothing here is indexed: position 900 needs 900 links from the head. The chain does not store its own length or middle."
      },
      {
        "kind": "trace",
        "caption": "Searching a four-node list for 7: the walk starts at the head and stops when it finds a match.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "4",
                "1",
                "7",
                "3"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "The walk starts at the head, which holds 4. That is not 7, so it follows the link to the next node.",
              "counter": {
                "label": "Nodes visited",
                "value": 1
              }
            },
            {
              "cells": [
                "4",
                "1",
                "7",
                "3"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "excluded"
                },
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "The second node holds 1, still not 7. Two nodes visited, and the first one can never be revisited: the links only point forward.",
              "counter": {
                "label": "Nodes visited",
                "value": 2
              }
            },
            {
              "cells": [
                "4",
                "1",
                "7",
                "3"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "excluded"
                },
                {
                  "index": 1,
                  "role": "excluded"
                },
                {
                  "index": 2,
                  "role": "settled"
                }
              ],
              "note": "The third node holds 7. The search returns that node after three visits, and the fourth node is never touched.",
              "counter": {
                "label": "Nodes visited",
                "value": 3
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Three visits found 7. A value that is not in the list costs four visits and then a `null`, and that is the worst case for a list of four nodes: search is O(n) in the number of nodes. Sorting the values first would not rescue it — binary search needs to jump to the middle, and a chain of forward links offers no way to jump."
      },
      {
        "kind": "table",
        "caption": "Where an array and a singly linked list of n elements differ, under this path's cost model.",
        "headers": [
          "Operation",
          "Array",
          "Singly linked list"
        ],
        "rows": [
          [
            "Read the element at a known index",
            "O(1)",
            "O(n): you have to walk there"
          ],
          [
            "Insert at the front",
            "O(n): `unshift` moves every later element up one slot",
            "O(1): one new node in front of the head"
          ],
          [
            "Insert after a position you already hold",
            "O(n): later elements shift",
            "O(1): two assignments"
          ],
          [
            "Find a value",
            "O(n)",
            "O(n)"
          ],
          [
            "Read the length",
            "O(1): `length` is stored",
            "O(n), unless you keep a count of your own"
          ]
        ]
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Equal growth classes do not mean equal speed. A list follows a reference to a separate node at each step; an array uses indexed elements. Both scans are O(n) in this model, but engine layout and allocation costs affect actual time. Big O alone does not say which is faster."
      },
      {
        "kind": "prose",
        "body": "A linked list can suit frequent changes at the front or after a known node: an undo chain, a queue that also keeps a tail, or one possible hash-table bucket. It is a poor fit for frequent indexed access. A head-index queue is another option; choose from the operations you need rather than assuming one structure is always faster."
      }
    ]
  },
  {
    "id": "dsa-v1-d05-l2",
    "title": "Rewiring: prepend, unlink, reverse",
    "summary": "Changing a list means assigning to somebody's `next`. The assignment is constant; the walk that reaches the right place is not.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Memory management",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Rewiring changes a node's `next` while keeping the existing nodes and their values. Insertion also creates one small node. These are changes to object references, not a promise about physical memory addresses or engine allocation. The walk to reach the right place can dominate the work."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const prepend = (head, value) => ({ value, next: head });\n\nconst list = prepend(prepend(prepend(null, 3), 2), 1);\n// list is 1 -> 2 -> 3 -> null",
        "caption": "Prepending: one new node pointing at the old head, returned as the new head."
      },
      {
        "kind": "prose",
        "body": "Under the stated field/allocation model, prepending is O(1) in the number of existing nodes. In the dense-array model, front insertion moves n elements and takes O(n). This compares counted work, not a guaranteed JavaScript engine duration."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const insertAfter = (node, value) => {\n  const inserted = { value, next: node.next };\n  node.next = inserted;\n  return inserted;\n};",
        "caption": "Inserting after a node you already hold: build, link forward, then repoint the node in front."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Save the old forward link before overwriting it. In this example the object literal saves it in `inserted.next`; assigning the existing node's link then keeps the rest reachable. Literally moving `node.next = inserted` above the `const` declaration throws because `inserted` has not been initialized. Building a new node with `next: null` and then overwriting the only old link would instead detach the rest."
      },
      {
        "kind": "prose",
        "body": "Inserting after a node you hold is O(1). Reaching zero-based position k first takes k links, so insertion there is O(k + 1), with O(n) worst-case work when k grows with a list of n nodes. A fixed small k is still constant. Separate the walk from the rewiring."
      },
      {
        "kind": "prose",
        "body": "Deleting splits the same way, with one extra asymmetry. To unlink a node you need the node *before* it, because `next` points forward and there is no route back. A delete by value therefore walks with the previous node in hand and looks one step ahead of itself."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// `previous` is the node in front of the one being dropped.\nprevious.next = previous.next.next;\n\n// The head has nothing in front of it, so removing it\n// means handing the caller a different head.\nconst shorter = head.next;",
        "caption": "Two shapes of removal: one assignment in the middle of the list, a new head at the front of it."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Suppose a list has at least two nodes and no other references to those nodes are kept. After `list = list.next.next`, the first two nodes are unreachable from the program's remaining roots and may be reclaimed. The suffix stays reachable through the new head. This does not guarantee when garbage collection runs."
      },
      {
        "kind": "prose",
        "body": "Reversing is the same assignment repeated the length of the list. Walk once and point each node at the node you just came from, holding three references as you go: the part already reversed, the node in hand, and the rest you have not touched. The third one is the one people forget — read the forward link into a variable before you overwrite it, or the remainder of the list is unreachable the moment you assign."
      },
      {
        "kind": "trace",
        "caption": "Reversing 1 → 2 → 3 in place. Each frame shows the reversed part, the node in hand, and the untouched rest.",
        "trace": {
          "shape": "array",
          "legend": [
            "Reversed so far",
            "Node in hand",
            "Rest of the list"
          ],
          "frames": [
            {
              "cells": [
                "null",
                "1",
                "2 → 3 → null"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "Start. Nothing is reversed yet, the node in hand is the head holding 1, and 2 → 3 is still linked the original way.",
              "counter": {
                "label": "Links flipped",
                "value": 0
              }
            },
            {
              "cells": [
                "1 → null",
                "2",
                "3 → null"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "Node 1 now points at null, so it has become the tail. The node in hand moves to 2, and the rest is 3.",
              "counter": {
                "label": "Links flipped",
                "value": 1
              }
            },
            {
              "cells": [
                "2 → 1 → null",
                "3",
                "—"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "Node 2 now points back at node 1. The node in hand moves to 3, and nothing is left after it.",
              "counter": {
                "label": "Links flipped",
                "value": 2
              }
            },
            {
              "cells": [
                "3 → 2 → 1 → null",
                "null",
                "—"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "excluded"
                }
              ],
              "note": "Node 3 points back at node 2 and the node in hand is null, so the walk stops. Node 3 is the new head, and the same three objects hold the same three values in the opposite order.",
              "counter": {
                "label": "Links flipped",
                "value": 3
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Three links flipped for three nodes: O(n) time, and the three references are all the memory it takes, so O(1) auxiliary space. Copying the values into an array and building a fresh list backwards answers the same request in O(n) time as well, but it allocates an array of n values and n new nodes on top of the input. Anything still holding the old head then points at a list you did not update."
      },
      {
        "kind": "table",
        "caption": "What each operation in this module costs on a list of n nodes.",
        "headers": [
          "Operation",
          "Time",
          "Auxiliary space",
          "Why"
        ],
        "rows": [
          [
            "Prepend a value",
            "O(1)",
            "O(1)",
            "One new node, one link, no walking"
          ],
          [
            "Insert after a node you hold",
            "O(1)",
            "O(1)",
            "Two assignments"
          ],
          [
            "Insert at zero-based position k",
            "O(k + 1), O(n) worst case",
            "O(1)",
            "k links to reach the place, then constant rewiring"
          ],
          [
            "Find a value",
            "O(n)",
            "O(1)",
            "No index, and an absent value visits every node"
          ],
          [
            "Delete the first match",
            "O(n)",
            "O(1)",
            "The search dominates; the unlink itself is one assignment"
          ],
          [
            "Reverse in place",
            "O(n)",
            "O(1)",
            "One pass, three references whatever the length"
          ],
          [
            "Reverse through an array",
            "O(n)",
            "O(n)",
            "An array of n values, plus n new nodes"
          ]
        ]
      }
    ]
  }
];
