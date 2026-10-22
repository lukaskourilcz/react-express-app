/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D06_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d06-l1",
    "title": "Base case, recursive case, termination",
    "summary": "The two halves of a recursive definition, what makes the base case reachable, and what an engine does when it never is.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Functions: recursion",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A recursive function answers a problem by calling itself on a smaller version of the same problem. Two parts make that work. The base case answers an input directly, without asking again. The recursive case shrinks the input and hands it on. As with a loop, every accepted input must make progress toward a stopping condition. The examples below use ordinary calls that retain their waiting frames."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const sumTo = n => {\n  if (n === 0) return 0;      // base case: answered without another call\n  return n + sumTo(n - 1);    // recursive case: a smaller n, handed on\n};",
        "caption": "The two halves, for a nonnegative integer n small enough for the engine stack and exact Number arithmetic."
      },
      {
        "kind": "prose",
        "body": "The base case is the smallest input you can answer on the spot. Counting down to zero, it is 0. Walking a linked list, it is the empty list. Adding up a tree, it is the empty subtree. Pick it first, because the recursive case only has to reach it, not replace it."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// No base case at all: every call makes another one.\nconst sumToA = n => n + sumToA(n - 1);\n\n// A base case most inputs step straight over.\nconst sumToB = n => {\n  if (n === 0) return 0;\n  return n + sumToB(n - 2);\n};",
        "caption": "Two ways to lose termination: no stopping point, and a stopping point the step jumps past."
      },
      {
        "kind": "prose",
        "body": "`sumToB(10)` is fine: 10, 8, 6, 4, 2, 0, and the base case catches it. `sumToB(7)` goes 7, 5, 3, 1, -1, -3 and never equals 0. Writing a base case is not the same as reaching it, and termination is a claim about every input the function accepts, not about the one you tried."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Neither broken version hangs quietly. Each call in flight takes a frame on the call stack, the frames pile up, and the engine gives up: V8 throws a RangeError reading \"Maximum call stack size exceeded\", SpiderMonkey reports \"too much recursion\". The depth at which that happens is an engine detail, not a language guarantee, so it is a symptom to recognise rather than a limit to design against."
      },
      {
        "kind": "table",
        "caption": "Four recursive shapes and how each one ends.",
        "headers": [
          "Shape",
          "What the code does",
          "How it ends"
        ],
        "rows": [
          [
            "No base case",
            "Every call makes another call",
            "Frames pile up until the engine reports stack exhaustion"
          ],
          [
            "A base case the step jumps over",
            "Subtracting 2 from an odd n never lands on 0",
            "The same stack-exhaustion failure for inputs that miss; large terminating inputs can also exhaust the stack"
          ],
          [
            "A recursive case that does not shrink",
            "The call passes on the input it was given, unchanged",
            "The input never approaches the base case; without tail-call elimination, frames accumulate until stack exhaustion"
          ],
          [
            "A reachable base case",
            "For the bounded nonnegative integers in this example, subtracting 1 reaches 0",
            "The deepest call returns first, and the answer travels back up"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "To argue that a recursion terminates, name a quantity that drops on every call and cannot drop forever. For `sumTo` it is n itself, which falls by one and is caught at 0. For a list it is the number of nodes still ahead. If you cannot name that quantity, you do not yet have a termination argument."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const sumList = head => {\n  if (head === null) return 0;\n  return head.value + sumList(head.next);\n};",
        "caption": "The same two halves over a linked list: the empty list answers directly, and `head.next` is always one node shorter."
      },
      {
        "kind": "prose",
        "body": "For a finite, acyclic list ending in null, `head.next` removes the first node from the remaining walk, so the count falls by one per call. A list of n nodes therefore makes n calls that hold a node, plus one final call that receives `null` and returns 0: n + 1 calls in total, and that count is what the next lesson prices."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "One base case is enough. Stopping early with `if (head.next === null) return head.value;` also produces the right sum, but it writes the addition twice, adds a second place to get the empty list wrong, and stops one call short of the definition. Keep the empty list as the only stopping point."
      },
      {
        "kind": "prose",
        "body": "When you write the recursive case, assume the call on the smaller input already returns the right answer and decide only how to combine it with the piece in your hand. That assumption is what makes recursive code short. The base case is what makes it true."
      }
    ]
  },
  {
    "id": "dsa-v1-d06-l2",
    "title": "What recursion costs",
    "summary": "Time from the number of calls, space from the deepest point of the stack, and the loop that does the same work without one.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "MDN — Call stack",
        "url": "https://developer.mozilla.org/en-US/docs/Glossary/Call_stack",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — RangeError: too much recursion",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "Harvard CS50x — Algorithms notes",
        "url": "https://cs50.harvard.edu/x/notes/3/",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A recursion has two prices and they are read off two different counts. Time adds up the work in all calls; when each does constant work, counting calls is enough. Space comes from how many calls are open at the deepest point. A loop usually collapses the second number to a constant while leaving the first alone, which is the whole reason the rewrite is worth knowing."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const sumList = head => {\n  if (head === null) return 0;\n  return head.value + sumList(head.next);\n};",
        "caption": "One node per call, a fixed amount of work inside each: n + 1 calls for n nodes."
      },
      {
        "kind": "prose",
        "body": "Time first. A call that holds a node compares `head` against `null`, reads `head.value`, and makes one addition and one call; the final call compares and stops. Under the unit-cost model this path uses, that is a fixed number of steps whatever the list holds. Multiply by n + 1 calls and the running time is O(n), the same class as a loop over the same nodes."
      },
      {
        "kind": "prose",
        "body": "Space is the half that differs. A call waiting on another call cannot be thrown away: its frame still holds the parameter, the locals and the point to resume at. The frames accumulate on the way down and come off on the way back, so the memory bill is set by the deepest point. For this function that is n + 1 frames, which is O(n) auxiliary space even though the body allocates nothing you can see."
      },
      {
        "kind": "trace",
        "caption": "Summing 3 → 1 → 4. Cells run bottom to top, so the rightmost cell is the call currently running.",
        "trace": {
          "shape": "stack",
          "frames": [
            {
              "cells": [
                "sumList(3→1→4)"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "The first call receives the whole list. Its head holds 3, so it cannot return until it knows the sum of everything after it.",
              "counter": {
                "label": "Frames open",
                "value": 1
              }
            },
            {
              "cells": [
                "sumList(3→1→4)",
                "sumList(1→4)"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "active"
                }
              ],
              "note": "It calls itself on `head.next`. The first frame stays open with an addition pending, and the second frame starts on the shorter list.",
              "counter": {
                "label": "Frames open",
                "value": 2
              }
            },
            {
              "cells": [
                "sumList(3→1→4)",
                "sumList(1→4)",
                "sumList(4)"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "active"
                }
              ],
              "note": "A third call takes the last node. Three frames are now open and none of them has produced a number yet.",
              "counter": {
                "label": "Frames open",
                "value": 3
              }
            },
            {
              "cells": [
                "sumList(3→1→4)",
                "sumList(1→4)",
                "sumList(4)",
                "sumList(null)"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "active"
                }
              ],
              "note": "The fourth call receives `null`. This is the base case: it returns 0 immediately and makes no further call, which is the deepest the stack gets.",
              "counter": {
                "label": "Frames open",
                "value": 4
              }
            },
            {
              "cells": [
                "sumList(3→1→4)",
                "sumList(1→4)",
                "sumList(4)"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "settled"
                }
              ],
              "note": "The base-case frame is gone. `sumList(4)` was waiting on that 0, adds its own 4, and returns 4.",
              "counter": {
                "label": "Frames open",
                "value": 3
              }
            },
            {
              "cells": [
                "sumList(3→1→4)",
                "sumList(1→4)"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "settled"
                }
              ],
              "note": "`sumList(1→4)` had 4 pending. It adds its own 1 and returns 5 to the frame below it.",
              "counter": {
                "label": "Frames open",
                "value": 2
              }
            },
            {
              "cells": [
                "sumList(3→1→4)"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                }
              ],
              "note": "The first frame adds its 3 to the 5 it was handed and returns 8, the answer the caller asked for.",
              "counter": {
                "label": "Frames open",
                "value": 1
              }
            },
            {
              "cells": [],
              "note": "The stack is empty again. Three nodes cost four calls, and four frames were open at once at the deepest point: linear time and linear stack space.",
              "counter": {
                "label": "Frames open",
                "value": 0
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Read the first half of that trace and you have the descent; read the second half and you have the unwinding. Nothing returns early. Each frame finishes the addition it had pending only after the frame above it hands back a number, which is why the answer appears in the reverse of the order the calls were made."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const sumListLoop = head => {\n  let total = 0;\n  let node = head;\n  while (node !== null) {\n    total += node.value;\n    node = node.next;\n  }\n  return total;\n};",
        "caption": "The same traversal in one frame: a total and a walking reference, whatever the length."
      },
      {
        "kind": "table",
        "caption": "The same sum, written two ways.",
        "headers": [
          "Question",
          "Recursive",
          "Iterative"
        ],
        "rows": [
          [
            "Time",
            "O(n): n + 1 calls, constant work in each",
            "O(n): one pass, constant work per node"
          ],
          [
            "Auxiliary space",
            "O(n): one open frame per node still waiting",
            "O(1): a total and one reference"
          ],
          [
            "Where the state lives",
            "In the frames the engine is holding for you",
            "In the two variables you declared"
          ],
          [
            "Resource limits",
            "Available stack depth as well as data and running time",
            "Available data memory and running time; no frame per node"
          ]
        ]
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "The stack limit is real and it is not a number to code against. It depends on the engine, on how large each frame is and on what was already on the stack when your function started, so the same recursion can survive on one runtime and throw on another. There is no portable safe recursion-depth cutoff. Proper tail calls are in the language specification, but most engines never shipped them, so writing the call in tail position does not reliably save the frame."
      },
      {
        "kind": "prose",
        "body": "Factorial is the standard case where the two costs get confused. The loop runs n - 1 times for n of 2 or more, and the recursion makes n + 1 calls, so under the unit-cost model the running time is linear in n either way. The value it returns grows factorially. How fast the answer grows and how fast the work grows are separate questions, and here the answers are nowhere near each other."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const factorial = n => {\n  let product = 1;\n  for (let i = 2; i <= n; i += 1) product *= i;\n  return product;\n};",
        "caption": "Nineteen multiplications produce 20!, which is 2432902008176640000. The step count is linear; only the result is factorial."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "The unit-cost model is carrying weight in that claim. Each multiplication counts as one step because a `Number` is a fixed-width double. 18! is 6402373705728000, the last factorial below `Number.MAX_SAFE_INTEGER` (9007199254740991); 19! and 20! are past that mark and still come out exactly, while 23! comes back wrong. Compute with arbitrary-precision integers instead and the multiplications themselves grow with the digit count, so the linear step count stops being the whole story."
      },
      {
        "kind": "prose",
        "body": "Choose with the input shape and runtime in mind. A balanced binary tree with a million nodes needs only about twenty frames for a depth-first walk; a skewed tree can need a frame per node. Even shallow recursion uses stack space, so check the actual runtime rather than promising a universally safe depth. A loop fits work whose depth would follow the length of the input, which is every list traversal in this path. Converting a list recursion into a loop costs two variables and buys back the whole stack."
      }
    ]
  }
];
