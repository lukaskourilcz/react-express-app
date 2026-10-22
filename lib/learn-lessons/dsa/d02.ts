/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D02_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d02-l1",
    "title": "Indexing, traversal and what a change costs",
    "summary": "Reading by position, walking the whole array, changing it in place against building a new one, and the real price of push, pop, shift, unshift, slice and splice.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "MDN — Array",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Array.prototype.splice",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "An array is a numbered row of slots, and the number is the address. `values[3]` goes straight to the fourth slot without looking at the three in front of it, so reading or writing one element counts as a single step under this path’s cost model. Every technique in this module leans on that one property."
      },
      {
        "kind": "prose",
        "body": "Traversal is the other half. `for…of` binds each element in turn, an index loop gives you the position as well, and both visit n elements in n steps. Take the index loop whenever the position matters: comparing neighbours, writing back into the array, or walking in from both ends."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// Element only.\nfor (const value of values) total += value;\n\n// Element and position, so you can look at the neighbour.\nfor (let i = 1; i < values.length; i += 1) {\n  if (values[i] > values[i - 1]) rises += 1;\n}\n\n// Back to front, so removing an element does not skip the next one.\nfor (let i = values.length - 1; i >= 0; i -= 1) {\n  if (values[i] === 0) values.splice(i, 1);\n}",
        "caption": "Three traversals of the same array: element only, element with position, and back to front."
      },
      {
        "kind": "prose",
        "body": "There are two ways to change an array, and they promise the caller different things. Writing `values[i] = next` changes the array the caller is still holding. For ordinary dense arrays and callbacks without mutation, map, filter, slice and spreading construct a new outer array. They copy references, not nested objects; a callback can still mutate data if you write it that way. After the first kind of call the caller’s variable points at different data; after the second kind it does not."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// In place: the caller's array changes, and the same array comes back.\nconst doubleInPlace = values => {\n  for (let i = 0; i < values.length; i += 1) values[i] = values[i] * 2;\n  return values;\n};\n\n// Copying: the input is untouched and a second array of the same length appears.\nconst doubled = values => values.map(value => value * 2);",
        "caption": "Two routines that print the same numbers and make opposite promises about the input."
      },
      {
        "kind": "example",
        "language": "javascript",
        "code": "const source = [1, 2, 3];\n\nconst doubleInPlace = values => {\n  for (let i = 0; i < values.length; i += 1) values[i] = values[i] * 2;\n  return values;\n};\nconst doubled = values => values.map(value => value * 2);\n\nconst copy = doubled(source);\nconsole.log(\"after copying, source is\", source);\n\nconst same = doubleInPlace(source);\nconsole.log(\"after in place, source is\", source);\nconsole.log(\"and the returned array is the same object:\", same === source);",
        "caption": "The same doubling done both ways, printing what happens to the array that was passed in.",
        "note": "Reorder the two calls and see how the second one starts from what the first left behind."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Name which one you wrote. `sortInPlace` and `sortedCopy` cost nothing to type and save every later reader from opening the body. Mutation does not determine the return type: reverse and sort return the same array, pop returns the removed value, and push returns the new length. Document the return value as well as the mutation."
      },
      {
        "kind": "prose",
        "body": "Where you change the array decides what the change costs. `push` and `pop` work at the end, where no other element has to move. In the dense-array model, shift and unshift at the front move the remaining entries to different indices. Real engines may use other representations; the table describes the stated model, not a JavaScript timing guarantee."
      },
      {
        "kind": "table",
        "caption": "What each operation costs on an array of n elements, under the unit-cost model this path uses.",
        "headers": [
          "Operation",
          "Cost",
          "Why"
        ],
        "rows": [
          [
            "`push(value)`",
            "Amortized O(1)",
            "Writes one slot past the end; the occasional resize is spread over many pushes"
          ],
          [
            "`pop()`",
            "O(1)",
            "Drops the last slot, so nothing else changes index"
          ],
          [
            "`shift()`",
            "O(n)",
            "Every remaining element moves down one index"
          ],
          [
            "`unshift(value)`",
            "O(n)",
            "Every existing element moves up one index to free slot 0"
          ],
          [
            "`slice(from, to)`",
            "O(k) for the k elements copied",
            "Allocates a new array and copies the range into it"
          ],
          [
            "`splice(i, count)`",
            "O(1 + k + t)",
            "Copies k removed entries and moves a tail of t entries when its positions change"
          ],
          [
            "`indexOf(value)`",
            "O(n)",
            "Scans from the front until something matches"
          ],
          [
            "`concat(other)` / `[...values]`",
            "O(n + m) / O(n)",
            "Copy n entries plus the m entries of other / copy only the n input entries"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "The linear ones deserve a closer look, because the call site hides the work. `queue.shift()` is a short call and up to n − 1 moves in this model. Nothing in the syntax hints at that, which is why it slips into loops that then run in quadratic time."
      },
      {
        "kind": "trace",
        "caption": "Removing the first element of a five-element array: four elements move so that one can leave.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "a",
                "b",
                "c",
                "d",
                "e"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "Five elements. `shift` has to remove the one at index 0, which means every later element must end up one index lower.",
              "counter": {
                "label": "Writes",
                "value": 0
              }
            },
            {
              "cells": [
                "b",
                "b",
                "c",
                "d",
                "e"
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
              "note": "\"b\" is copied from index 1 down into index 0. One write, and the copy still sitting at index 1 is now stale.",
              "counter": {
                "label": "Writes",
                "value": 1
              }
            },
            {
              "cells": [
                "b",
                "c",
                "c",
                "d",
                "e"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 2,
                  "role": "active"
                }
              ],
              "note": "\"c\" moves from index 2 into index 1. Two writes.",
              "counter": {
                "label": "Writes",
                "value": 2
              }
            },
            {
              "cells": [
                "b",
                "c",
                "d",
                "d",
                "e"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "settled"
                },
                {
                  "index": 3,
                  "role": "active"
                }
              ],
              "note": "\"d\" moves from index 3 into index 2. Three writes.",
              "counter": {
                "label": "Writes",
                "value": 3
              }
            },
            {
              "cells": [
                "b",
                "c",
                "d",
                "e",
                "e"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "active"
                }
              ],
              "note": "\"e\" moves from index 4 into index 3. Four writes, and the tail slot is now a duplicate.",
              "counter": {
                "label": "Writes",
                "value": 4
              }
            },
            {
              "cells": [
                "b",
                "c",
                "d",
                "e"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 2,
                  "role": "settled"
                },
                {
                  "index": 3,
                  "role": "settled"
                }
              ],
              "note": "The duplicate slot is dropped and the length falls to four. One removal cost four moves, so `shift` on an n-element array does about n writes.",
              "counter": {
                "label": "Writes",
                "value": 4
              }
            }
          ]
        }
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Under this dense-array cost model, draining a queue with `while (queue.length > 0) out.push(queue.shift())` costs O(n²). The first shift moves n − 1 elements, the next moves n − 2, and the sum of that run is about n²/2. Keep a head index and walk it forward instead, or drain from the end with `pop` when the order does not matter."
      },
      {
        "kind": "prose",
        "body": "Strings cannot be changed in place at all. Assigning to `text[0]` throws in strict mode and does nothing in sloppy mode, and every method that looks like an edit — `slice`, `replace`, `toUpperCase` — returns a new string and leaves the original alone. If concatenation copies the entire accumulated text each time, a character-building loop costs quadratic total copying. Engines can defer copying through internal representations, so += alone does not prove that cost. Collecting fragments and joining them makes the output-construction work explicit."
      },
      {
        "kind": "prose",
        "body": "Reading a string is cheap, though. For the ASCII exercise, indexing returns one code unit and length gives the input size. These are constant-sized operations in our model; an engine may still create temporary string values. That is why the palindrome check in the next lesson gets constant auxiliary space without trying."
      },
      {
        "kind": "prose",
        "body": "One caveat carries over from D01. A JavaScript array is an object with a length and numeric keys, and engines pick among several internal representations depending on what you put in it. Counting an index read as one step is a teaching model that holds well for the dense numeric arrays this module uses; it is not a promise about memory layout."
      }
    ]
  },
  {
    "id": "dsa-v1-d02-l2",
    "title": "Two pointers, and where the space goes",
    "summary": "The ends-inward walk, the read-and-write compaction, and the auxiliary-space difference between changing an array and returning a new one.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Array.prototype.reverse",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — String",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Two pointers is one idea wearing two shapes. Keep two indices into the same sequence and move each monotonically in its chosen direction. When a justified rule discards candidates without losing a valid answer, some pair problems can be solved in one pass."
      },
      {
        "kind": "prose",
        "body": "The first shape starts at the ends and works inward: `left` at 0, `right` at `length - 1`, both moving toward each other until they meet. Reversing an array, checking a palindrome and finding a pair with a given sum in a sorted array all fit it."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// Ends inward on an ascending array: is there a pair adding up to target?\nconst hasPairSum = (sorted, target) => {\n  let left = 0;\n  let right = sorted.length - 1;\n\n  while (left < right) {\n    const sum = sorted[left] + sorted[right];\n    if (sum === target) return true;\n    if (sum < target) left += 1;\n    else right -= 1;\n  }\n\n  return false;\n};",
        "caption": "Each step discards one index for good, so at most n − 1 steps replace the n(n − 1)/2 pairs a double loop would visit."
      },
      {
        "kind": "prose",
        "body": "Assume ascending finite Numbers, finite pair sums and a finite target, compared using JavaScript Number arithmetic. The sorted order is what makes that elimination legal. When the sum is too small, the smallest remaining element cannot be part of any remaining pair that reaches the target, so raising `left` throws away nothing useful. When the sum is too large, the same argument applies to `right`. Take the sorting away and the walk stops being correct."
      },
      {
        "kind": "trace",
        "caption": "Checking \"level\" from both ends: five characters, two comparisons.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "l",
                "e",
                "v",
                "e",
                "l"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                },
                {
                  "index": 4,
                  "role": "active"
                }
              ],
              "note": "`left` starts at index 0 and `right` at index 4, the two ends of \"level\". Nothing has been compared yet.",
              "counter": {
                "label": "Comparisons",
                "value": 0
              }
            },
            {
              "cells": [
                "l",
                "e",
                "v",
                "e",
                "l"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "compare"
                },
                {
                  "index": 4,
                  "role": "compare"
                }
              ],
              "note": "Compare \"l\" against \"l\". They match, so `left` moves to 1 and `right` moves to 3.",
              "counter": {
                "label": "Comparisons",
                "value": 1
              }
            },
            {
              "cells": [
                "l",
                "e",
                "v",
                "e",
                "l"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "compare"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "Compare \"e\" against \"e\". They match too, so `left` moves to 2 and `right` moves to 2.",
              "counter": {
                "label": "Comparisons",
                "value": 2
              }
            },
            {
              "cells": [
                "l",
                "e",
                "v",
                "e",
                "l"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "settled"
                },
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 2,
                  "role": "excluded"
                }
              ],
              "note": "`left` and `right` have met at index 2. A lone middle character has nothing to be compared against, so the loop ends and the answer is true: five characters took two comparisons.",
              "counter": {
                "label": "Comparisons",
                "value": 2
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "The loop body runs about n/2 times, and n/2 is a constant multiple of n, so the growth class is O(n). Halving the iteration count is worth having on a real input and does not move the routine into a smaller family."
      },
      {
        "kind": "prose",
        "body": "The second shape puts both pointers at the front and lets one run ahead of the other. The read pointer visits every element; the write pointer only advances when an element has earned a place in the result. Dropping duplicates, dropping zeros, keeping whatever passes a test — that whole group of problems is this one shape."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// Read runs ahead; write lags behind and marks the end of the kept prefix.\nconst removeZeros = values => {\n  let write = 0;\n\n  for (let read = 0; read < values.length; read += 1) {\n    if (values[read] !== 0) {\n      values[write] = values[read];\n      write += 1;\n    }\n  }\n\n  return write;\n};",
        "caption": "Compaction in place: the answer is how far the write pointer got, not a new array."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Only the slots below the returned length mean anything afterwards. `removeZeros([0, 4, 0, 5])` returns 2 and leaves the array holding `[4, 5, 0, 5]`, where the trailing `0` and the second `5` are leftovers nobody cleaned up. Write that into the function’s contract, and never read past the length it handed you."
      },
      {
        "kind": "table",
        "caption": "The same job done two ways, and what each way costs the caller.",
        "headers": [
          "Question",
          "Changed in place",
          "Returned as a new array"
        ],
        "rows": [
          [
            "Auxiliary space",
            "O(1): a couple of indices and one held value",
            "O(n): a second array as long as the input"
          ],
          [
            "The array the caller passed",
            "Holds the new contents",
            "Untouched"
          ],
          [
            "Anyone else holding that array",
            "Sees the change, asked for or not",
            "Sees nothing"
          ],
          [
            "What comes back",
            "The same array, or a count",
            "The new array"
          ],
          [
            "When to reach for it",
            "Large inputs, one clear owner, a documented mutation",
            "Shared data, undo, anything read concurrently"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "The stored input contributes O(n) space in this model. Total space must also include output and auxiliary allocations; a routine that builds a quadratic-sized structure can use O(n²) total space. Auxiliary space is the number that separates these two columns: the ends-inward reverse allocates two indices and one held value and stays at O(1) whatever n is, while spreading the array into a copy and reversing that allocates a full second array."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "A function that changes its argument has an effect its signature never shows. Give it a name that admits it, document what the array looks like when it returns, and decide on purpose whether to hand back the array, a count, or nothing at all."
      },
      {
        "kind": "prose",
        "body": "Strings force the choice for you. You cannot reverse one in place, so an ends-inward walk over a string is read-only: two indices, `text[left]`, `text[right]`, no allocation, O(1) auxiliary space. Reversing a copy and comparing is correct too, and it allocates one character array, reversed in place, and a new string on the way to the same boolean."
      }
    ]
  }
];
