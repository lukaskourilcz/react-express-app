/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D04_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d04-l1",
    "title": "LIFO and FIFO as access disciplines",
    "summary": "Two access orders, traced step by step, with a stated empty-case rule.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Array.prototype.push",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A stack and a queue are abstract data types with different access orders. Both hold a sequence. Both let you add one value and take one back. They differ in exactly one place: which value they are willing to give you."
      },
      {
        "kind": "prose",
        "body": "A stack is last in, first out. You add at one end and you remove from that same end, so the value you get back is always the one you added most recently. Three operations name it: `push` adds, `pop` removes and returns, `peek` reports what `pop` would return without removing it."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const createStack = () => {\n  const items = [];\n  return {\n    push: value => { items.push(value); },\n    pop: () => (items.length === 0 ? null : items.pop()),\n    peek: () => (items.length === 0 ? null : items[items.length - 1]),\n    size: () => items.length,\n  };\n};",
        "caption": "A stack over an array: both `push` and `pop` work on the end, and no other element moves."
      },
      {
        "kind": "example",
        "language": "javascript",
        "code": "const createStack = () => {\n  const items = [];\n  return {\n    push: value => { items.push(value); },\n    pop: () => (items.length === 0 ? null : items.pop()),\n    peek: () => (items.length === 0 ? null : items[items.length - 1]),\n    size: () => items.length,\n  };\n};\n\nconst stack = createStack();\nstack.push(\"a\");\nstack.push(\"b\");\nconsole.log(\"peek\", stack.peek(), \"size\", stack.size());\nconsole.log(\"pop\", stack.pop());\nconsole.log(\"pop\", stack.pop());\nconsole.log(\"pop on empty\", stack.pop());",
        "caption": "The stack from above, driven far enough to reach the empty case.",
        "note": "Change what pop returns when the stack is empty and decide which answer you would rather debug at three in the morning."
      },
      {
        "kind": "trace",
        "caption": "Three pushes then two pops. Cells run bottom to top, so the rightmost cell is the top of the stack.",
        "trace": {
          "shape": "stack",
          "frames": [
            {
              "cells": [
                "A"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "push('A') puts A on an empty stack. It is the only value, so it is also the top."
            },
            {
              "cells": [
                "A",
                "B"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "push('B') puts B above A. B is the top, and A cannot be read again until B leaves."
            },
            {
              "cells": [
                "A",
                "B",
                "C"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "active"
                }
              ],
              "note": "push('C') makes C the top. Three values are held and only one of them is reachable."
            },
            {
              "cells": [
                "A",
                "B",
                "C"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "compare"
                }
              ],
              "note": "peek() reports C and changes nothing: the stack still holds all three values."
            },
            {
              "cells": [
                "A",
                "B"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "pop() removes C and returns it. B is the top again, exactly as it was before C arrived."
            },
            {
              "cells": [
                "A"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "pop() removes B and returns it. A is the top, and one more pop would leave the stack empty."
            }
          ]
        }
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Underflow is reading or removing from an empty stack. Throwing or returning a sentinel can both be sound if the API states its behavior. This module returns `null`, which is ambiguous when `null` is itself a stored value — `size()` is what tells the two apart. Pick one rule and write it down."
      },
      {
        "kind": "prose",
        "body": "A queue is first in, first out. You add at the back and remove from the front, so the value you get back is the one that has waited longest. The operations are `enqueue`, `dequeue` and a reader for the front value."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// The interface, without committing to a representation yet.\nconst queue = createQueue();\nqueue.enqueue('first');\nqueue.enqueue('second');\n\nqueue.dequeue(); // 'first' — it arrived first\nqueue.size();    // 1",
        "caption": "A queue serves in arrival order, whatever it stores its values in."
      },
      {
        "kind": "trace",
        "caption": "Three arrivals, one departure, one more arrival. Cells run front to back, so the leftmost cell leaves next.",
        "trace": {
          "shape": "queue",
          "frames": [
            {
              "cells": [
                "A"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "enqueue('A') puts A at the back of an empty queue, which makes A the front as well."
            },
            {
              "cells": [
                "A",
                "B"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "enqueue('B') puts B behind A. The front is still A, because A arrived first."
            },
            {
              "cells": [
                "A",
                "B",
                "C"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "enqueue('C') puts C at the back. Arrival order and departure order are the same list."
            },
            {
              "cells": [
                "B",
                "C"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "dequeue() removes A and returns it. B has waited longest now, so B becomes the front."
            },
            {
              "cells": [
                "B",
                "C",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "enqueue('D') joins the back while B keeps its place at the front. Arriving never overtakes."
            },
            {
              "cells": [
                "C",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "dequeue() returns B. C leaves next and D after it, in the order the two of them arrived."
            }
          ]
        }
      },
      {
        "kind": "table",
        "caption": "The same two questions asked of both structures.",
        "headers": [
          "Question",
          "Stack",
          "Queue"
        ],
        "rows": [
          [
            "Which end accepts a value",
            "The top, with `push`",
            "The back, with `enqueue`"
          ],
          [
            "Which end gives one back",
            "The top, with `pop`",
            "The front, with `dequeue`"
          ],
          [
            "Which value leaves first",
            "The one added most recently",
            "The one that has waited longest"
          ],
          [
            "Reading without removing",
            "`peek` reports the top",
            "A front reader reports the head"
          ],
          [
            "Where you meet it",
            "Undo history, bracket matching, depth-first traversal",
            "Task queues, buffering, level-order traversal"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "Empty-case behavior must be stated. This module returns null on underflow and provides size to distinguish an empty structure from one storing null. A different API can throw or return undefined if that behavior is documented."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "The restriction is the feature. Once you index into the middle of a stack, you have an array with extra steps, and the reasoning the discipline bought you is gone. That reasoning is what a stack is for: bracket matching is correct because the only opener you can reach is the most recent one, together with the requirement that every closer matches and no opener remains at the end."
      },
      {
        "kind": "prose",
        "body": "Neither structure says anything about memory yet. A stack could sit on an array, a linked list or a fixed block; a queue could sit on any of those or on a ring buffer. The interface fixes which end you touch. The representation fixes what touching it costs, and that is the next lesson."
      }
    ]
  },
  {
    "id": "dsa-v1-d04-l2",
    "title": "What the representation costs",
    "summary": "Amortized constant appends, the linear price of removing from the front, and the memory a head-index queue holds on to.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "MDN — Array.prototype.shift",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "For these costs, assume a dense growable-array model with constant-time indexing, bounded-size values and a capacity that doubles when full. Removing from the end takes constant work; adding there can trigger a linear resize. These are model costs, not universal JavaScript engine timing guarantees."
      },
      {
        "kind": "prose",
        "body": "The one wrinkle is growth. In this model, a growable array holds a block with spare capacity, and when the spare runs out it allocates a larger block and copies everything across. That copy is linear in the current length, so an individual `push` is not constant. Doubling the capacity keeps the copies rare enough that a run of n pushes costs O(n) in total, which is what \"amortized constant\" claims."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Amortized is a statement about a sequence, not about a single call. It says n pushes cost O(n) between them, so the average is constant. It does not say every push is cheap, and in a system where one slow call matters more than the total — a frame budget, an audio callback — the amortized bound alone does not guarantee that deadline."
      },
      {
        "kind": "prose",
        "body": "The front of an array is a different story. In the dense-array model, front removal returns index 0 and moves the survivors down one slot. JavaScript specifies the resulting indexed properties, but an engine can optimize the implementation. Count survivor moves here rather than claiming a universal elapsed-time cost."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// Correct FIFO behavior, and quadratic to drain.\nconst createShiftQueue = () => {\n  const items = [];\n  return {\n    enqueue: value => { items.push(value); },\n    dequeue: () => (items.length === 0 ? null : items.shift()),\n    size: () => items.length,\n  };\n};",
        "caption": "The obvious queue. `enqueue` is amortized constant; `dequeue` moves every remaining element."
      },
      {
        "kind": "trace",
        "caption": "One `shift` on a four-element queue, counting the elements it moves.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "A",
                "B",
                "C",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "The queue holds four values. dequeue() takes A, the element at index 0, and returns it.",
              "counter": {
                "label": "Element moves",
                "value": 0
              }
            },
            {
              "cells": [
                "B",
                "B",
                "C",
                "D"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                },
                {
                  "index": 1,
                  "role": "compare"
                }
              ],
              "note": "B moves from index 1 down to index 0. That is one element moved, and A is now overwritten.",
              "counter": {
                "label": "Element moves",
                "value": 1
              }
            },
            {
              "cells": [
                "B",
                "C",
                "C",
                "D"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "active"
                },
                {
                  "index": 2,
                  "role": "compare"
                }
              ],
              "note": "C moves from index 2 down to index 1. Two elements have moved for one removal.",
              "counter": {
                "label": "Element moves",
                "value": 2
              }
            },
            {
              "cells": [
                "B",
                "C",
                "D",
                "D"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "active"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "D moves from index 3 down to index 2. Three elements have moved, one for each survivor.",
              "counter": {
                "label": "Element moves",
                "value": 3
              }
            },
            {
              "cells": [
                "B",
                "C",
                "D"
              ],
              "note": "The array drops its last slot and the removal is done. Removing one value from a queue of four cost three moves, so this dense-model removal from k values moves k − 1 survivors.",
              "counter": {
                "label": "Element moves",
                "value": 3
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Starting with n values and no later enqueues, the dense model moves n − 1 survivors on the first removal, then n − 2, down to 0. The total is n(n − 1)/2, plus n removals, giving O(n²) drain work. For n = 10,000, that is exactly 49,995,000 survivor moves."
      },
      {
        "kind": "prose",
        "body": "The fix is to stop moving elements. Keep the values where they are and remember where the front is instead: a head index that starts at 0 and only ever goes up. `dequeue` reads the slot the head points at, then adds one to the head. No waiting value moves; the consumed slot can be cleared to release its reference."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const createQueue = () => {\n  const items = [];\n  let head = 0;\n\n  return {\n    enqueue: value => { items.push(value); },\n    dequeue: () => {\n      if (head >= items.length) return null;\n      const value = items[head];\n      items[head] = null; // release the reference, not the slot\n      head += 1;\n      return value;\n    },\n    size: () => items.length - head,\n  };\n};",
        "caption": "A head-index queue: read and clear one slot, then advance the head without moving waiting values."
      },
      {
        "kind": "prose",
        "body": "In the stated model, dequeue and size are constant-time; enqueue is amortized constant-time. `size()` is `items.length - head`, one subtraction. The queue is empty when the head has caught up with the end, which is the condition `dequeue` checks before it reads anything."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "The memory is the honest part. Those slots before the head stay in the array. A queue that has handled a million messages holds a million-slot array even when two values are waiting, because nothing ever removed the first 999,998 slots. Writing `null` into a slot you have read releases the value it pointed at, so it can be collected when no other reference keeps it alive — but the slot itself stays."
      },
      {
        "kind": "prose",
        "body": "Compaction is what actually reclaims it: when the head passes some threshold, copy the live tail into a fresh array and reset the head to 0. One compaction costs O(live + 1), including a new empty container when no values remain. Triggering it when the head reaches half the array length keeps the total copying linear in the number of dequeues, so the amortized cost per dequeue stays constant. A fixed-capacity ring buffer solves the same problem differently, by wrapping the indices around instead of growing."
      },
      {
        "kind": "table",
        "caption": "Costs in the stated dense-array model; n is the number of live values.",
        "headers": [
          "Operation",
          "Array end",
          "Array front",
          "Head-index queue"
        ],
        "rows": [
          [
            "Add one value",
            "Amortized O(1) with `push`",
            "O(n) with `unshift`: every element moves up",
            "Amortized O(1) at the back"
          ],
          [
            "Remove one value",
            "O(1) with `pop`",
            "O(n) with `shift`: every survivor moves down",
            "O(1): read a slot, bump the head"
          ],
          [
            "Report the size",
            "O(1)",
            "O(1)",
            "O(1): length minus head"
          ],
          [
            "Memory held",
            "Live values plus spare capacity",
            "Live values plus spare capacity",
            "Used slots and spare capacity until compaction"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "So there is no free representation, only a choice about which cost you can afford. A short-lived queue can be simple; whether front removal is fast enough needs measurement in the actual workload. A long-lived queue also needs a policy for retained slots, and the head index plus compaction answers each of them separately."
      }
    ]
  }
];
