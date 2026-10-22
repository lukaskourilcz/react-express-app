/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D08_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d08-l1",
    "title": "Two quadratic sorts, and what stable means",
    "summary": "Selection sort against insertion sort: the same growth class, a very different comparison count, and only one of them stable.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
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
        "body": "A sort rearranges a collection so that a comparison function agrees with the order it ends up in. Every sort in this module takes that function as an argument: `compare(a, b)` returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Assume the comparator consistently orders the values, returns finite results, and does not mutate them. Routing comparisons through it lets one routine sort numbers, strings or records. We count comparator calls and reference moves as unit operations on ordinary dense arrays; an expensive comparator adds its own cost."
      },
      {
        "kind": "prose",
        "body": "Selection sort works the way most people sort a hand of cards they cannot fan out: look through everything that is left, find the smallest, put it at the front, repeat on what remains. After k passes the first k positions hold the k smallest elements and never move again."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const selectionSort = (values, compare) => {\n  for (let start = 0; start < values.length - 1; start += 1) {\n    let smallest = start;\n\n    for (let index = start + 1; index < values.length; index += 1) {\n      if (compare(values[index], values[smallest]) < 0) smallest = index;\n    }\n\n    if (smallest !== start) {\n      [values[start], values[smallest]] = [values[smallest], values[start]];\n    }\n  }\n\n  return values;\n};",
        "caption": "Selection sort: one scan per position, tracking the index of the smallest element seen so far."
      },
      {
        "kind": "trace",
        "caption": "Selection sort on four elements: six comparisons, which is 4 × 3 / 2.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "4",
                "2",
                "7",
                "1"
              ],
              "note": "The array before the first pass. No position is settled yet.",
              "counter": {
                "label": "Comparisons",
                "value": 0
              }
            },
            {
              "cells": [
                "4",
                "2",
                "7",
                "1"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                },
                {
                  "index": 1,
                  "role": "compare"
                },
                {
                  "index": 2,
                  "role": "compare"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "Pass one fills position 0. It compares every one of the three elements to its right against the smallest found so far and settles on 1. Three comparisons.",
              "counter": {
                "label": "Comparisons",
                "value": 3
              }
            },
            {
              "cells": [
                "1",
                "2",
                "7",
                "4"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                }
              ],
              "note": "1 swaps into position 0, and 4 takes the place 1 came from. Position 0 is settled and never moves again.",
              "counter": {
                "label": "Comparisons",
                "value": 3
              }
            },
            {
              "cells": [
                "1",
                "2",
                "7",
                "4"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "active"
                },
                {
                  "index": 2,
                  "role": "compare"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "Pass two fills position 1. It compares 7 and then 4 against 2 and keeps 2. Two comparisons, and no swap is needed.",
              "counter": {
                "label": "Comparisons",
                "value": 5
              }
            },
            {
              "cells": [
                "1",
                "2",
                "7",
                "4"
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
                  "role": "active"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "Pass three fills position 2. It compares 4 against 7 and finds 4 smaller. One comparison.",
              "counter": {
                "label": "Comparisons",
                "value": 6
              }
            },
            {
              "cells": [
                "1",
                "2",
                "4",
                "7"
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
              "note": "4 and 7 swap, which leaves the last position correct without a pass of its own. Six comparisons for four elements: 3 + 2 + 1.",
              "counter": {
                "label": "Comparisons",
                "value": 6
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Count those passes for a general n and you get (n-1) + (n-2) + … + 1, which is n(n-1)/2. For eight elements that is 28. The number never changes, because neither loop bound depends on a comparator result: the inner loop always runs to the end of the array, and no comparison can cut a pass short. Selection sort spends 28 comparisons on an already-sorted array of eight, on a reversed one, and on eight copies of the same value. Moves are a separate cost, and selection sort is lopsided about the two: n(n-1)/2 comparisons but at most max(0, n - 1) swaps, one per pass. When moving an element is expensive and comparing two is cheap, that trade is the reason to reach for it."
      },
      {
        "kind": "prose",
        "body": "Insertion sort grows a sorted prefix instead. Positions 0 through i-1 are already in order; take the element at i, walk left past everything greater than it, and drop it into the gap. The elements it walks past each shift one place right to make room."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const insertionSort = (values, compare) => {\n  for (let i = 1; i < values.length; i += 1) {\n    const current = values[i];\n    let j = i - 1;\n\n    while (j >= 0 && compare(values[j], current) > 0) {\n      values[j + 1] = values[j];\n      j -= 1;\n    }\n\n    values[j + 1] = current;\n  }\n\n  return values;\n};",
        "caption": "Insertion sort: the `j >= 0` guard comes first, so the comparator is never asked about an element that is not there."
      },
      {
        "kind": "prose",
        "body": "Here the comparator result does control the loop. On a nonempty already-sorted array the very first comparison of each pass fails, the shift loop never runs, and the whole sort costs n-1 comparisons — 7 for eight elements. On strictly descending values every pass walks the entire prefix, giving 1 + 2 + … + (n-1) = n(n-1)/2, back to 28. Same growth class as selection sort in the worst case, linear in the best."
      },
      {
        "kind": "table",
        "caption": "Comparisons on eight elements, counted by hand rather than timed.",
        "headers": [
          "Input",
          "Selection sort",
          "Insertion sort",
          "Bubble sort with an early exit"
        ],
        "rows": [
          [
            "Already sorted",
            "28",
            "7",
            "7"
          ],
          [
            "Reversed",
            "28",
            "28",
            "28"
          ],
          [
            "Random order",
            "28",
            "Between 7 and 28",
            "Between 7 and 28"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "A sort is stable when elements the comparator calls equal come out in the order they went in. Sort a list of orders by customer, then sort the result by date, and a stable second sort leaves each date grouped by customer. An unstable second sort can reverse equal-date rows; a compound-key comparison is another way to preserve both ordering requirements."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const scores = [\n  { name: 'Ada', points: 7 },\n  { name: 'Ben', points: 5 },\n  { name: 'Cleo', points: 7 },\n];\n\n// compare only looks at points, so Ada and Cleo are equal to it.\nconst byPoints = (a, b) => a.points - b.points;\n\n// A stable sort gives Ben, Ada, Cleo. An unstable one may give Ben, Cleo, Ada.",
        "caption": "Stability is only visible when the comparator reports a tie."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Insertion sort is stable as written above, because `compare(values[j], current) > 0` stops at the first element that is not strictly greater, so an equal element is never walked past. Change that `> 0` to `>= 0` and the sort still returns the right values in the right order but is no longer stable. Selection sort is unstable for a different reason: its swap throws a distant element into the gap, over the top of equal elements in between."
      },
      {
        "kind": "trace",
        "caption": "Bubble sort on the same four elements: neighbours only, and the largest element settles at the end of each pass.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "4",
                "2",
                "7",
                "1"
              ],
              "note": "The array before the first pass. Bubble sort only ever compares neighbours.",
              "counter": {
                "label": "Comparisons",
                "value": 0
              }
            },
            {
              "cells": [
                "4",
                "2",
                "7",
                "1"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "compare"
                },
                {
                  "index": 1,
                  "role": "compare"
                }
              ],
              "note": "Compare the neighbours at positions 0 and 1. 4 is greater than 2, so the pair swaps.",
              "counter": {
                "label": "Comparisons",
                "value": 1
              }
            },
            {
              "cells": [
                "2",
                "4",
                "7",
                "1"
              ],
              "marks": [
                {
                  "index": 1,
                  "role": "compare"
                },
                {
                  "index": 2,
                  "role": "compare"
                }
              ],
              "note": "After the swap, compare 4 and 7. They are already in order, so nothing moves.",
              "counter": {
                "label": "Comparisons",
                "value": 2
              }
            },
            {
              "cells": [
                "2",
                "4",
                "7",
                "1"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "compare"
                },
                {
                  "index": 3,
                  "role": "compare"
                }
              ],
              "note": "Compare 7 and 1. 7 is greater, so they swap and 7 reaches the last position.",
              "counter": {
                "label": "Comparisons",
                "value": 3
              }
            },
            {
              "cells": [
                "2",
                "4",
                "1",
                "7"
              ],
              "marks": [
                {
                  "index": 3,
                  "role": "settled"
                }
              ],
              "note": "The first pass is over after three comparisons. The largest element has reached the end, so the next pass can stop one place earlier.",
              "counter": {
                "label": "Comparisons",
                "value": 3
              }
            },
            {
              "cells": [
                "2",
                "1",
                "4",
                "7"
              ],
              "marks": [
                {
                  "index": 2,
                  "role": "settled"
                },
                {
                  "index": 3,
                  "role": "settled"
                }
              ],
              "note": "The second pass compares 2 with 4 and leaves them alone, then compares 4 with 1 and swaps. Two more comparisons, and 4 settles beside 7.",
              "counter": {
                "label": "Comparisons",
                "value": 5
              }
            },
            {
              "cells": [
                "1",
                "2",
                "4",
                "7"
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
              "note": "The third pass compares 2 with 1 and swaps them. Six comparisons in total, the same 4 × 3 / 2 that selection sort spent on this array.",
              "counter": {
                "label": "Comparisons",
                "value": 6
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Bubble sort is here to be read, not written. The strict-greater adjacent-swap form is stable and works in place. Each inverted pair needs one swap, normally two array writes; insertion sort removes the same inversion with one right shift, then writes each saved element into its final gap. Those final placements matter: on nonempty sorted input the shown insertion sort still writes n - 1 slots, while an early-exit bubble pass makes no swaps. Bubble sort does not universally make more writes on every input. Nothing in this path asks you to implement it. The two you will write are selection sort and insertion sort, both O(n²) in the worst case and both using O(1) auxiliary space."
      }
    ]
  },
  {
    "id": "dsa-v1-d08-l2",
    "title": "Merge sort: divide, merge, and the cost of the buffer",
    "summary": "Why splitting to single elements and merging back costs O(n log n), and what the linear buffer buys.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Array.prototype.slice",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Merge sort rests on one observation: two arrays that are each already sorted can be combined into one sorted array in a single pass, without ever looking backwards. So split the input in half, sort each half the same way, and merge the two results. An array of one element is sorted already, which ends the recursion."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const mergeSort = (values, compare) => {\n  if (values.length < 2) return values.slice();\n\n  const middle = Math.floor(values.length / 2);\n  const left = mergeSort(values.slice(0, middle), compare);\n  const right = mergeSort(values.slice(middle), compare);\n\n  return merge(left, right, compare);\n};",
        "caption": "The divide half. slice copies the split runs; merge outputs and recursive frames also need storage."
      },
      {
        "kind": "prose",
        "body": "The merge is the part that does the work. Keep an index into each sorted run. Compare the two front elements, move the smaller one to the output, advance that index, and repeat. When one run empties, everything left in the other run is already in order and gets appended without a single further comparison."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const merge = (left, right, compare) => {\n  const out = [];\n  let i = 0;\n  let j = 0;\n\n  while (i < left.length && j < right.length) {\n    if (compare(left[i], right[j]) <= 0) out.push(left[i++]);\n    else out.push(right[j++]);\n  }\n\n  while (i < left.length) out.push(left[i++]);\n  while (j < right.length) out.push(right[j++]);\n\n  return out;\n};",
        "caption": "One comparison per element moved out of the contested region, and none after a run empties."
      },
      {
        "kind": "trace",
        "caption": "Merging two sorted runs of three: five comparisons, and the last element crosses for free.",
        "trace": {
          "shape": "array",
          "frames": [
            {
              "cells": [
                "2",
                "5",
                "8",
                "1",
                "4",
                "9"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "active"
                },
                {
                  "index": 3,
                  "role": "active"
                }
              ],
              "note": "Two runs that are each already sorted: positions 0 to 2 hold 2, 5, 8 and positions 3 to 5 hold 1, 4, 9. The output starts empty and both fronts are ready.",
              "counter": {
                "label": "Comparisons",
                "value": 0
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "1",
                "4",
                "9"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "compare"
                },
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "compare"
                }
              ],
              "note": "Compare the fronts 2 and 1. The right one is smaller, so 1 moves to the output and the right run advances. Output so far: 1.",
              "counter": {
                "label": "Comparisons",
                "value": 1
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "1",
                "4",
                "9"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "compare"
                },
                {
                  "index": 3,
                  "role": "settled"
                },
                {
                  "index": 4,
                  "role": "compare"
                }
              ],
              "note": "Compare 2 and 4. The left one is smaller, so 2 moves out and the left run advances. Output so far: 1, 2.",
              "counter": {
                "label": "Comparisons",
                "value": 2
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "1",
                "4",
                "9"
              ],
              "marks": [
                {
                  "index": 0,
                  "role": "settled"
                },
                {
                  "index": 1,
                  "role": "compare"
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
                  "index": 5,
                  "role": "compare"
                }
              ],
              "note": "Compare 5 and 4. The right one wins this time. Output so far: 1, 2, 4.",
              "counter": {
                "label": "Comparisons",
                "value": 3
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "1",
                "4",
                "9"
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
                  "role": "compare"
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
                  "index": 5,
                  "role": "compare"
                }
              ],
              "note": "Compare 5 and 9. The left one wins. Output so far: 1, 2, 4, 5.",
              "counter": {
                "label": "Comparisons",
                "value": 4
              }
            },
            {
              "cells": [
                "2",
                "5",
                "8",
                "1",
                "4",
                "9"
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
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 5,
                  "role": "compare"
                }
              ],
              "note": "Compare 8 and 9. The left one wins and the left run is now empty. Output so far: 1, 2, 4, 5, 8.",
              "counter": {
                "label": "Comparisons",
                "value": 5
              }
            },
            {
              "cells": [
                "1",
                "2",
                "4",
                "5",
                "8",
                "9"
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
                },
                {
                  "index": 4,
                  "role": "settled"
                },
                {
                  "index": 5,
                  "role": "settled"
                }
              ],
              "note": "With the left run empty, 9 is appended without another comparison. Six elements merged in five comparisons, which is the most a merge of two runs of three can cost.",
              "counter": {
                "label": "Comparisons",
                "value": 5
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "For a combined length n > 0, merging two runs costs at most n - 1 comparisons; two empty runs need zero. The nonempty bound holds because every comparison sends exactly one element to the output and the last one arrives for free. That bound is what makes the level argument work."
      },
      {
        "kind": "prose",
        "body": "Lay the recursion out by level instead of by call. Level one merges pairs of single elements, level two merges pairs of runs of two, level three merges the two halves. Across each level, merges write all eight elements to their outputs. Comparisons and slice copying also add linear work at that level, so its total cost is O(n) under the unit-cost model. The only question left is how many levels there are."
      },
      {
        "kind": "table",
        "caption": "Merge sort on eight elements, counted level by level.",
        "headers": [
          "Level",
          "Merges performed",
          "Elements written by merges",
          "Comparisons at most"
        ],
        "rows": [
          [
            "1",
            "Four merges of 1 + 1",
            "8",
            "4"
          ],
          [
            "2",
            "Two merges of 2 + 2",
            "8",
            "6"
          ],
          [
            "3",
            "One merge of 4 + 4",
            "8",
            "7"
          ],
          [
            "Total",
            "Three levels",
            "24",
            "17"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "Eight halves to four, four to two, two to one: three halvings, so three levels of merging. That is log₂ 8. Each level costs at most n comparisons and there are log₂ n of them, giving O(n log n). Doubling to sixteen doubles the elements processed at each existing level and adds another level. The n log n model grows more slowly than n²; actual finishing time still depends on input size, constants and available resources."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "The 17 in that table is an upper bound, not a fixed count. On an already-sorted array of eight the same merge sort spends only 12 comparisons, because each merge exhausts one run early and appends the rest for free. Selection sort has no equivalent: its 28 is the same number on every input."
      },
      {
        "kind": "prose",
        "body": "The buffer is the bill. Each merge writes into a fresh array, so the shown sequential merge sort has O(n) peak additional live element references beyond the input — the version above allocates it through `slice` and `push`. The O(log n) recursive frames are smaller in growth than that live buffer. Total allocations across all levels are O(n log n), a different quantity from peak live space; physical garbage-collection timing is not measured here. Selection sort and insertion sort need O(1) auxiliary space, and that is the trade you are making."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Stability lives in one character. `compare(left[i], right[j]) <= 0` takes from the left run when the comparator reports a tie, which keeps equal elements in their original relative order because everything in the left run came first. Write `< 0` instead and the right element wins ties, so equal items from opposite runs can change relative order."
      },
      {
        "kind": "prose",
        "body": "Common quicksort forms partition in place, but also need a recursion or explicit stack. Random-pivot or suitable random-input analysis gives expected O(n log n) comparisons; bad pivots can give O(n²). The usual swapping form is not stable; this path traces and implements merge sort only."
      },
      {
        "kind": "prose",
        "body": "Which to reach for, then. Insertion sort can suit short or nearly sorted arrays; some production sorting algorithms use it for small runs. Merge sort offers a better worst-case growth class when extra storage is affordable. Selection sort trades fixed quadratic comparisons for few swaps. Choose using the actual data, comparator cost and memory budget rather than a universal timing claim."
      }
    ]
  }
];
