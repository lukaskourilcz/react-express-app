/** Reviewed DSA reading, shared by Learn and the transitional path (#494). */
import type { LessonSource } from '../types';

export const DSA_D01_LESSONS: LessonSource[] = [
  {
    "id": "dsa-v1-d01-l1",
    "title": "Counting work, not seconds",
    "summary": "What a growth class claims, why the tightest one is the useful answer, and where best, average and worst fit in.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Algorithms",
        "url": "https://cs50.harvard.edu/x/weeks/3/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "NIST — Big O definition",
        "url": "https://xlinux.nist.gov/dads/HTML/bigOnotation.html",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "Cornell CS 2110 — Analyzing complexity",
        "url": "https://courses.cs.cornell.edu/courses/cs2110/2026fa/lectures/lec05/",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Loops and iteration",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration",
        "reviewedOn": "2026-09-08"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Timing a function tells you about your laptop. Counting its steps tells you about the function. Big O is the second thing: a claim about how the number of steps grows as the input gets larger, with the machine deliberately left out of it."
      },
      {
        "kind": "prose",
        "body": "Write O(f(n)) and you are claiming that beyond some input size, the real cost stays below a constant multiple of f(n). It is an upper bound, and it is a bound on the cost function you chose to analyse. That second half is the part people drop, and it is why \"O(n²) is the worst case\" is a sentence with two different ideas glued together."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Best, average and worst name *which* cost function you are describing — the cheapest input of that size, the typical one, the most expensive one. Big O then bounds whichever of those you picked. You can write an upper bound on the best case perfectly happily; it just says less."
      },
      {
        "kind": "prose",
        "body": "A linear-time routine also has an O(n²) upper bound, but that bound is looser than the O(n) one we can give. In this path, a question asking for the growth class wants the tightest supported class under the stated cost model."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const sumAndMax = values => {\n  let total = 0;\n  for (const value of values) total += value;\n\n  let largest = values[0];\n  for (const value of values) if (value > largest) largest = value;\n\n  return { total, largest };\n};",
        "caption": "Two loops, one after the other: 2n steps, which is still the linear family."
      },
      {
        "kind": "example",
        "language": "javascript",
        "code": "// Count the steps rather than timing them.\nlet steps = 0;\nconst sumAndMax = values => {\n  let total = 0;\n  for (const value of values) { steps++; total += value; }\n\n  let largest = values[0];\n  for (const value of values) { steps++; if (value > largest) largest = value; }\n\n  return { total, largest };\n};\n\nsumAndMax([3, 9, 4, 1, 7]);\nconsole.log(\"n = 5 costs\", steps, \"steps\");\n\n// Change the list below and watch the count follow it.\nsteps = 0;\nsumAndMax([3, 9, 4, 1, 7, 2, 8, 6, 5, 0]);\nconsole.log(\"n = 10 costs\", steps, \"steps\");",
        "caption": "Two passes over the same list, with the steps counted rather than timed.",
        "note": "Double the input and the count doubles: that is what linear means. Change the lists and see whether it keeps holding."
      },
      {
        "kind": "prose",
        "body": "Two sequential passes cost 2n steps, and 2n is a constant multiple of n, so the class is O(n). Constants and lower-order terms fall away because they stop mattering as n grows: n² + 500n + 9000 is O(n²), and for a large enough n the 500n is a rounding error next to the n²."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "Dropping constants describes growth, not elapsed time. In the equal-cost-step model, two full passes do about twice the work of one. Actual speed also depends on the operations, input and runtime."
      },
      {
        "kind": "prose",
        "body": "Nesting is where the families change. A loop inside a loop over the same n-sized input visits about n² pairs. But nesting alone does not make something quadratic — what matters is how many times the inner body actually runs."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const crossPairs = (rows, columns) => {\n  const out = [];\n  for (const row of rows) {\n    for (const column of columns) out.push(row + column);\n  }\n  return out;\n};",
        "caption": "For n rows and m columns, the body runs nm times. With constant-cost addition and append, running time is O(nm)."
      },
      {
        "kind": "prose",
        "body": "For constant-cost loop bodies, nested traversals over independent collections of sizes n and m take O(nm) work. Sequential traversals take O(n + m). Keep both dimensions when their sizes can vary independently."
      },
      {
        "kind": "table",
        "caption": "The eight families this path asks you to recognise, with the shape that produces each.",
        "headers": [
          "Class",
          "What produces it",
          "Example"
        ],
        "rows": [
          [
            "O(1)",
            "A fixed number of steps, whatever the input size",
            "Reading `values[0]`"
          ],
          [
            "O(log n)",
            "Repeated halving or doubling",
            "Binary search on a sorted array"
          ],
          [
            "O(n)",
            "One traversal of the input",
            "Summing every element"
          ],
          [
            "O(n log n)",
            "Logarithmically many levels, linear work per level",
            "Merge sort"
          ],
          [
            "O(n²)",
            "Every pair of an n-sized input",
            "Selection sort"
          ],
          [
            "O(n³)",
            "Three n-sized nested dimensions",
            "Naive matrix multiplication"
          ],
          [
            "O(2ⁿ)",
            "A two-way choice at every one of n steps",
            "Visiting subset-choice states, excluding the cost of copying each output"
          ],
          [
            "O(n!)",
            "Every ordering of n items",
            "Visiting permutation states, excluding the cost of copying each output"
          ]
        ]
      },
      {
        "kind": "prose",
        "body": "The last two are recognition targets. A binary choice at each of 40 positions creates about a trillion possible combinations. You can recognize that growth without implementing a subset enumerator."
      },
      {
        "kind": "trace",
        "caption": "Halving 16 down to 1: four steps, which is why repeated halving is the logarithmic family.",
        "trace": {
          "shape": "counter",
          "frames": [
            {
              "cells": [
                "16"
              ],
              "note": "Start at 16. No halving has happened yet.",
              "counter": {
                "label": "Halvings",
                "value": 0
              }
            },
            {
              "cells": [
                "8"
              ],
              "note": "16 halves to 8. One step.",
              "counter": {
                "label": "Halvings",
                "value": 1
              }
            },
            {
              "cells": [
                "4"
              ],
              "note": "8 halves to 4. Two steps.",
              "counter": {
                "label": "Halvings",
                "value": 2
              }
            },
            {
              "cells": [
                "2"
              ],
              "note": "4 halves to 2. Three steps.",
              "counter": {
                "label": "Halvings",
                "value": 3
              }
            },
            {
              "cells": [
                "1"
              ],
              "note": "2 halves to 1, and the halving stops. Four steps for sixteen elements — that is log₂ 16.",
              "counter": {
                "label": "Halvings",
                "value": 4
              }
            }
          ]
        }
      },
      {
        "kind": "prose",
        "body": "Doubling the input adds one step, not twice as many. That is the whole appeal of the logarithmic family, and why sorting once so you can binary search repeatedly is often worth it."
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Log bases differ by a constant factor, so O(log₂ n) and O(log₁₀ n) are the same class and both are written O(log n). This path counts halvings, so its traces use base 2."
      },
      {
        "kind": "prose",
        "body": "Two neighbours are worth naming once. Θ (Theta) is a tight bound — an upper *and* a lower bound of the same family, so the cost really does grow like that. Ω (Omega) is a lower bound: the cost is at least this. This path asks for O throughout and asks for the tightest one, which is close enough to Θ for the code you will meet here."
      }
    ]
  },
  {
    "id": "dsa-v1-d01-l2",
    "title": "Space, and the cost model you assumed",
    "summary": "Auxiliary space against total space, the memory a recursion stack borrows, and what \"one step\" was taken to mean.",
    "estimatedMinutes": 20,
    "sources": [
      {
        "label": "Harvard CS50x — Data structures notes",
        "url": "https://cs50.harvard.edu/x/notes/5/",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Array.prototype.slice",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice",
        "reviewedOn": "2026-09-08"
      },
      {
        "label": "MDN — Array.prototype.sort",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
        "reviewedOn": "2026-10-14"
      },
      {
        "label": "MDN — Map",
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map",
        "reviewedOn": "2026-10-14"
      }
    ],
    "sections": [
      {
        "kind": "prose",
        "body": "Time is one answer; space is a second, separate one. Two routines that both run in O(n) can differ completely in what they allocate, and on a large input that difference is the one that fails."
      },
      {
        "kind": "prose",
        "body": "Total space counts the input too. Auxiliary space counts only what the routine allocates on top of it. Both are legitimate answers, so the useful habit is saying which you mean: \"linear time, constant auxiliary space\" leaves nothing to guess."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "// Constant auxiliary space: one accumulator, whatever the input size.\nconst total = values => {\n  let sum = 0;\n  for (const value of values) sum += value;\n  return sum;\n};\n\n// Linear auxiliary space: a second array as long as the first.\nconst doubled = values => values.map(value => value * 2);",
        "caption": "Same linear time, different auxiliary space."
      },
      {
        "kind": "prose",
        "body": "Copying can add work and memory. `slice`, `map`, `filter`, `concat` and array spread produce new arrays. Copying a list of roughly n elements on each of n loop iterations takes quadratic copying work; one such copy takes linear work."
      },
      {
        "kind": "callout",
        "tone": "warning",
        "body": "In this path’s array model, `shift` and `unshift` take linear work to change later indexed positions. Count them as linear operations; a short method name does not imply constant work."
      },
      {
        "kind": "prose",
        "body": "Recursion borrows space without allocating anything you can see. Every call in flight keeps a frame on the call stack, so a chain n calls deep needs O(n) stack space even if the function body allocates nothing at all. A loop doing the same work needs none of it."
      },
      {
        "kind": "code",
        "language": "javascript",
        "code": "const countDown = n => {\n  if (n <= 0) return 0;\n  return 1 + countDown(n - 1);\n};",
        "caption": "Linear time and linear stack space: n frames are open before the first one returns."
      },
      {
        "kind": "prose",
        "body": "Preprocessing can pay for later queries. A comparison sort such as merge sort costs O(n log n) in the worst case; later binary searches cost O(log n) each. Compare the sorting cost plus the expected queries with repeated linear scans. JavaScript does not promise one particular complexity for its built-in sort."
      },
      {
        "kind": "prose",
        "body": "All of this rests on a cost model: an assumption about what counts as one step. This path uses the usual teaching model — reading or writing one array slot, comparing two numbers, doing one arithmetic operation are each one step. Say so when you quote a class, because the model is what makes the number meaningful."
      },
      {
        "kind": "table",
        "caption": "The assumptions this path makes, and what they are not promising.",
        "headers": [
          "Assumption",
          "What it means here",
          "What it does not claim"
        ],
        "rows": [
          [
            "Array indexing is one step",
            "Reading `values[i]` counts as a single operation",
            "That a JavaScript array is a contiguous C array; engines use several representations"
          ],
          [
            "Appending amortises to one step",
            "A long run of `push` calls averages out to constant work each",
            "That any individual `push` is constant — the occasional resize is not"
          ],
          [
            "Hash-table operations use expected constant work",
            "This model assumes `get`, `set` and `has` average out to constant work",
            "A guarantee for every JavaScript engine; Map and Set require average sublinear access, not a particular representation"
          ],
          [
            "A basic BST costs O(h)",
            "Search and insert follow one root-to-leaf path of height h",
            "That h is log n — an unbalanced tree can be a chain, making h equal n"
          ]
        ]
      },
      {
        "kind": "callout",
        "tone": "note",
        "body": "Numeric input has a second trap. A loop that runs `n` times is linear in the *value* of n, but n is written in about log n digits, so measured against its input size the routine is exponential. This path stays with the unit-cost model and small inputs, and says so where it matters."
      }
    ]
  }
];
