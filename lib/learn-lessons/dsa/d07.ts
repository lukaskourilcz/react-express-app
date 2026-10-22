/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D07_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d07-l1",
    "title": "Linear search, and when it is the right answer",
    "summary": "The search that asks nothing of the data: what it costs, where it stops, and the cases where nothing cheaper applies.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Array.prototype.indexOf",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "A linear search walks the collection from one end and stops at the first element that matches. It needs no sorted order or prepared lookup index. The examples here use dense, stable arrays and constant-cost strict-equality comparisons. That is its whole appeal, and it is why every other search in this path is measured against it."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const linearScan = (values, target) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (values[index] === target) return index;\n  }\n  return -1;\n};",
        "caption": "The whole algorithm: read, compare, return on a match, and -1 when the walk runs out."
      },
      {
        "kind": "example",
        "language": "javascript",
        "code": "const sorted = [1, 4, 7, 9, 12, 15, 21, 30, 44, 51];\n\nconst binarySearch = (values, target) => {\n  let probes = 0;\n  let low = 0;\n  let high = values.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    probes += 1;\n    const value = values[mid];\n    if (value === target) return { index: mid, probes };\n    if (value < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return { index: -1, probes };\n};\n\nconsole.log(\"found 44:\", binarySearch(sorted, 44));\nconsole.log(\"missing 43:\", binarySearch(sorted, 43));",
        "caption": "Binary search over ten sorted values, counting one midpoint probe per iteration, not individual equality/order comparisons.",
        "note": "Double the length of the list and see how little the midpoint-probe count moves. Then unsort it and watch the answer stop being trustworthy."
      },
      {
        "kind": "prose",
        "body": "The `return` inside the loop is doing real work. Without it the scan reads every element on every call, which turns a lucky hit at index 0 into n reads. With it, the cost depends on where the target sits: one read when it is first, n reads when it is last or absent."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Those are three different cost functions on the same routine. The best case is 1 read, the worst case is n reads, and a target that is present at a uniformly random position averages about n/2. For a nonempty array and a uniformly distributed successful target, the mean is exactly (n + 1) / 2 reads. Best-case cost is O(1); both this average and the worst case have tight O(n) growth."
      },
      {
        "kind": "trace",
        "caption": "Scanning six unsorted values for 7, counting each element read.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "12",
                "5",
                "9",
                "5",
                "7",
                "3"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                }
              ],
              "note": "The scan starts at index 0. Nothing has been read yet.",
              "counter": {
                "label": "Reads",
                "value": 0
              }
            },
            {
              "cells": [
                "12",
                "5",
                "9",
                "5",
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
              "note": "Index 0 holds 12, which is not 7, so the scan moves on. One read.",
              "counter": {
                "label": "Reads",
                "value": 1
              }
            },
            {
              "cells": [
                "12",
                "5",
                "9",
                "5",
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
                  "role": "active"
                }
              ],
              "note": "Index 1 holds 5, which is not 7. Two reads.",
              "counter": {
                "label": "Reads",
                "value": 2
              }
            },
            {
              "cells": [
                "12",
                "5",
                "9",
                "5",
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "active"
                }
              ],
              "note": "Index 2 holds 9, which is not 7. Three reads.",
              "counter": {
                "label": "Reads",
                "value": 3
              }
            },
            {
              "cells": [
                "12",
                "5",
                "9",
                "5",
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "active"
                }
              ],
              "note": "Index 3 holds 5, which is not 7 either. Four reads.",
              "counter": {
                "label": "Reads",
                "value": 4
              }
            },
            {
              "cells": [
                "12",
                "5",
                "9",
                "5",
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "settled"
                }
              ],
              "note": "Index 4 holds 7, so the scan returns 4 and never reads index 5. Five reads for a six-element array.",
              "counter": {
                "label": "Reads",
                "value": 5
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Nothing in that walk depended on the values ascending. Move the 7 anywhere and the routine still finds it, at a cost that changes but never breaks. Binary search on unsorted data can miss an existing target, which is the trade the next lesson spells out."
      },
      {
        "kind": "prose",
        "body": "A linear scan is the right answer more often than its reputation suggests. Unsorted data with one lookup coming: sorting first costs more than the scan you were trying to avoid. A handful of elements: constant factors can dominate, so measure before assuming preparation pays off. A predicate rather than an equality test: \"the first order over 500 CZK\" has no sorted key to bisect on unless you built one."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const orders = [{ total: 200 }, { total: 750 }, { total: 900 }];\n\nconst findFirst = (values, matches) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (matches(values[index])) return index;\n  }\n  return -1;\n};\n\nfindFirst(orders, order => order.total > 500);",
        "caption": "The same walk with a predicate. Binary search has no way in here: the array is not ordered by the thing being tested."
      },
      {
        "kind": "prose",
        "body": "Structure matters too. A singly linked list has no index to bisect on, so reaching the middle node already costs a walk of half the list. Without an auxiliary index, a general equality search has a linear worst-case walk, which is why D05 pairs cheap insertion at a known position with expensive lookup."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Recursive \"scan the rest\" implementations often hide a copy. `search(values.slice(1), target)` reads and allocates the whole tail on every step, so an unsuccessful walk copies (n - 1) + (n - 2) + ... + 1 elements: O(n²) copying work. With ordinary waiting frames retaining those tails, peak auxiliary storage can also be O(n²), plus the call stack. An index avoids the tail copies; a loop also avoids the growing stack."
      },
      {
        "kind": "table",
        "caption": "Three ways to answer the same lookup, with the preparation each one needs first.",
        "headers": [
          "Approach",
          "Preparation",
          "Cost per lookup",
          "Where it wins"
        ],
        "rows": [
          [
            "Linear scan",
            "None",
            "O(n) worst case",
            "Unsorted data, few lookups, small arrays, predicate tests"
          ],
          [
            "Sort once, then binary search",
            "O(n log n) sort",
            "O(log n)",
            "Many lookups on stable data, and range or nearest-value queries"
          ],
          [
            "Build a Set, then test membership",
            "O(n) insertions",
            "Expected O(1) in a hash-table model; no fixed ECMAScript time guarantee",
            "Many equality lookups where order is irrelevant"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "`indexOf` and `findIndex` are this scan, written for you. On the dense arrays used here they inspect up to n positions, so they retain linear worst-case scan work when the comparison or predicate has constant cost. indexOf uses strict equality and cannot find NaN. Set uses SameValueZero and can contain NaN, so membership and an indexOf scan are not interchangeable for every value. The exercise below asks you to write the loop because the next lesson takes it apart."
      }
    ]
  },
  {
    "id": "dsa-v1-d07-l2",
    "title": "Binary search: precondition, invariant, interval",
    "summary": "What sorted input buys, the claim the loop keeps true, why duplicates land you mid-run, and when sorting first repays its cost.",
    "estimatedMinutes": 22,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms notes",
        "url": "https://cs50.harvard.edu/x/notes/3/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Array.prototype.sort",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Binary search trades a requirement for a rate. Use a dense, stable array of finite Numbers in nondecreasing order, and a finite Number target, with constant-cost comparisons. Each midpoint probe rules out about half of what remains unless it finds a match. Sixteen elements need at most five probes and a million at most twenty; doubling the maximum length adds about one probe."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "This implementation trusts the sorted-input precondition. It could validate it, but a fresh validation takes a full pass, losing the logarithmic total cost for that call. On unsorted data the search can silently miss an existing value; it may also happen to find one. There is no reliable answer without the precondition."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const binarySearch = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length - 1;\n\n  while (low <= high) {\n    const middle = Math.floor((low + high) / 2);\n    const value = sorted[middle];\n    if (value === target) return middle;\n    if (value < target) low = middle + 1;\n    else high = middle - 1;\n  }\n\n  return -1;\n};",
        "caption": "The inclusive form: `low` and `high` name a closed interval, and the loop runs while that interval holds at least one element."
      },
      {
        "kind": "prose",
        "body": "One sentence makes the whole routine correct: if the target occurs, at least one matching index remains between `low` and `high` inclusive. That claim holds before the first iteration, because the interval is the whole array. Each branch keeps it true. `sorted[middle] < target` means everything at `middle` and below is too small, so moving `low` to `middle + 1` discards indices the target cannot occupy. The mirror case moves `high` to `middle - 1`."
      },
      {
        "kind": "trace",
        "caption": "Finding 47 among sixteen sorted values: four reads, and every discarded index shown greyed out.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "2",
                "5",
                "8",
                "12",
                "16",
                "23",
                "28",
                "31",
                "35",
                "42",
                "47",
                "53",
                "58",
                "61",
                "67",
                "70"
              ],
              "marks": [
                {
                  "index": 7,
                  "role": "compare"
                }
              ],
              "note": "low is 0 and high is 15, so the interval is the whole array. If 47 is present, its index is inside it. The middle index is 7.",
              "counter": {
                "label": "Reads",
                "value": 0
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "12",
                "16",
                "23",
                "28",
                "31",
                "35",
                "42",
                "47",
                "53",
                "58",
                "61",
                "67",
                "70"
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "excluded"
                },
                {
                  "index": 5,
                  "role": "excluded"
                },
                {
                  "index": 6,
                  "role": "excluded"
                },
                {
                  "index": 7,
                  "role": "excluded"
                },
                {
                  "index": 11,
                  "role": "compare"
                }
              ],
              "note": "Index 7 holds 31, which is below 47, so indices 0 to 7 cannot hold it. low becomes 8 and the new middle is index 11. One read.",
              "counter": {
                "label": "Reads",
                "value": 1
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "12",
                "16",
                "23",
                "28",
                "31",
                "35",
                "42",
                "47",
                "53",
                "58",
                "61",
                "67",
                "70"
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "excluded"
                },
                {
                  "index": 5,
                  "role": "excluded"
                },
                {
                  "index": 6,
                  "role": "excluded"
                },
                {
                  "index": 7,
                  "role": "excluded"
                },
                {
                  "index": 11,
                  "role": "excluded"
                },
                {
                  "index": 12,
                  "role": "excluded"
                },
                {
                  "index": 13,
                  "role": "excluded"
                },
                {
                  "index": 14,
                  "role": "excluded"
                },
                {
                  "index": 15,
                  "role": "excluded"
                },
                {
                  "index": 9,
                  "role": "compare"
                }
              ],
              "note": "Index 11 holds 53, which is above 47, so indices 11 to 15 are out. high becomes 10 and the new middle is index 9. Two reads.",
              "counter": {
                "label": "Reads",
                "value": 2
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "12",
                "16",
                "23",
                "28",
                "31",
                "35",
                "42",
                "47",
                "53",
                "58",
                "61",
                "67",
                "70"
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "excluded"
                },
                {
                  "index": 5,
                  "role": "excluded"
                },
                {
                  "index": 6,
                  "role": "excluded"
                },
                {
                  "index": 7,
                  "role": "excluded"
                },
                {
                  "index": 8,
                  "role": "excluded"
                },
                {
                  "index": 9,
                  "role": "excluded"
                },
                {
                  "index": 11,
                  "role": "excluded"
                },
                {
                  "index": 12,
                  "role": "excluded"
                },
                {
                  "index": 13,
                  "role": "excluded"
                },
                {
                  "index": 14,
                  "role": "excluded"
                },
                {
                  "index": 15,
                  "role": "excluded"
                },
                {
                  "index": 10,
                  "role": "compare"
                }
              ],
              "note": "Index 9 holds 42, which is below 47, so index 9 goes too. low becomes 10, high is still 10, and one element is left. Three reads.",
              "counter": {
                "label": "Reads",
                "value": 3
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "12",
                "16",
                "23",
                "28",
                "31",
                "35",
                "42",
                "47",
                "53",
                "58",
                "61",
                "67",
                "70"
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
                  "role": "excluded"
                },
                {
                  "index": 3,
                  "role": "excluded"
                },
                {
                  "index": 4,
                  "role": "excluded"
                },
                {
                  "index": 5,
                  "role": "excluded"
                },
                {
                  "index": 6,
                  "role": "excluded"
                },
                {
                  "index": 7,
                  "role": "excluded"
                },
                {
                  "index": 8,
                  "role": "excluded"
                },
                {
                  "index": 9,
                  "role": "excluded"
                },
                {
                  "index": 11,
                  "role": "excluded"
                },
                {
                  "index": 12,
                  "role": "excluded"
                },
                {
                  "index": 13,
                  "role": "excluded"
                },
                {
                  "index": 14,
                  "role": "excluded"
                },
                {
                  "index": 15,
                  "role": "excluded"
                },
                {
                  "index": 10,
                  "role": "settled"
                }
              ],
              "note": "Index 10 holds 47, so the search returns 10 after four reads. A scan from the left would have read eleven elements.",
              "counter": {
                "label": "Reads",
                "value": 4
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "The loop ends when `low` passes `high`, which means the interval is empty. Combine that with the invariant and the conclusion follows: the target was never in the array, so the routine returns -1. Termination comes free, because every iteration removes the middle element and one of the halves, so the interval strictly shrinks."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "The classic overflow bug in `(low + high) / 2` belongs to fixed-width integer languages, where a large sum wraps around. JavaScript numbers are doubles and stay exact well past any array length the engine allows, so `Math.floor((low + high) / 2)` is safe here. In C or Java you would write `low + (high - low) / 2` instead."
      },
      {
        "kind": "prose",
        "body": "Count midpoint probes, not individual equality/order comparisons. The cached midpoint value is read once per iteration. For n > 0 there are at most ⌊log₂ n⌋ + 1 probes; an empty array takes none. That is 5 for sixteen elements and 20 for a million, and the class is O(log n) for time with O(1) auxiliary space. A recursive version with one retained frame per call uses O(log n) auxiliary stack; tail-call behavior depends on the runtime."
      },
      {
        "kind": "table",
        "caption": "Worst-case reads under the unit-cost model of D01. These are counted operations, never measured milliseconds.",
        "headers": [
          "Elements",
          "Linear scan, worst case",
          "Binary search, worst case"
        ],
        "rows": [
          [
            "16",
            "16",
            "5"
          ],
          [
            "100",
            "100",
            "7"
          ],
          [
            "1 000",
            "1 000",
            "10"
          ],
          [
            "1 000 000",
            "1 000 000",
            "20"
          ],
          [
            "1 000 000 000",
            "1 000 000 000",
            "30"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "Duplicates do not break the search, but they blunt the answer. Given `[2, 4, 4, 4, 4, 7]` and a target of 4, the routine looks at index 2, finds a match and returns it. Index 1 is where the run of fours starts, and index 2 is simply where the halving happened to land. Ask a different array of the same shape and you get a different index inside the run."
      },
      {
        "kind": "prose",
        "body": "The fix is to stop returning on the first match. Use a half-open interval [low, high), starting with low = 0 and high = length, and loop while low < high. If the middle value is below the target, set low = middle + 1; otherwise set high = middle. This interval strictly shrinks and ends at the first position whose element is not below the target, or at length. Check that the resulting index is below length and holds the target before reporting a match. That variant is the third exercise below."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "The sort has to use the same order the search assumes. `[10, 9, 100].sort()` gives `[10, 100, 9]`, because the default comparator compares elements as strings. Numbers need `sort((a, b) => a - b)`, and objects need a comparator on the key you will later search by."
      },
      {
        "kind": "prose",
        "body": "Preprocessing decides which search you should be writing. In the comparison-sort model, preparation takes O(n log n) work before the first binary lookup, while a full scan takes O(n). Across k lookups on stable data the model compares O(n log n + k log n) with O(kn). Ignoring constants and assuming full scans, the crossover is around log n lookups for large n. Big O alone does not predict a measured winner or an exact threshold. Changed data needs its own update or re-sorting strategy; preparation is not automatically free on later queries."
      },
      {
        "kind": "prose",
        "body": "For plain equality lookups a Set or Map often beats both, at expected constant lookup time in a hash-table model, not a fixed ECMAScript or worst-case guarantee. Binary search earns its keep when the order itself is the question: the first record on or after a date, the nearest price below a bid, everything between two keys. A hash table answers none of those."
      }
    ]
  }
];
