/** A private project check with per-domain gates (#496).
 *
 * The final check of the retired DSA Foundations path, copied verbatim from
 * main d3dc3a33 when E5 removed the path: ten questions, two in each of five
 * domains, purpose 'project'. No path registers it. scripts/test-learning-paths.ts
 * grades it to keep the domain pass rule and the withheld key of a failed
 * project check under test, since no published check has domains today. */
import type { MergedActivity } from '../../lib/learning-paths/types';

export const DOMAIN_PROJECT_CHECK: MergedActivity = {
  "id": "dsa-v1-d10-final-checks",
  "kind": "check",
  "purpose": "project",
  "verification": "machine_verified",
  "title": "Final checks across five domains",
  "summary": "Ten questions across the foundation topics: two on growth and space, two on structures, two on searching, two on sorting and two on trees. You need 80% overall, and each domain needs at least one of its two questions right, so a strong sorting score cannot cover two missed tree questions. Retry as often as you like.",
  "competencies": [
    "complexity",
    "arrays-strings",
    "maps-sets",
    "searching",
    "sorting",
    "trees"
  ],
  "estimatedMinutes": 30,
  "passThreshold": 0.8,
  "domains": [
    "complexity",
    "structures",
    "searching",
    "sorting",
    "trees"
  ],
  "questions": [
    {
      "id": "dsa-v1-d10-q1",
      "prompt": "The independent dense arrays `spans` and `notes` have lengths n and m. Each span has ordinary finite-number start/end fields. Count field access, comparison and fixed-size pair creation as constant work, and append as amortized constant work. What is the tightest running-time growth class of `report`?",
      "context": {
        "language": "javascript",
        "code": "const report = (spans, notes) => {\n  const out = [];\n\n  for (let i = 0; i < spans.length; i += 1) {\n    for (let j = i + 1; j < spans.length; j += 1) {\n      if (spans[i].end > spans[j].start) out.push([i, j]);\n    }\n  }\n\n  for (const note of notes) out.push(note);\n\n  return out;\n};"
      },
      "options": [
        "O(n² + m)",
        "O(n²)",
        "O(n²m)",
        "O(nm)"
      ],
      "correct": 0,
      "explanation": "The inner loop starts at `i + 1`, so the pair loop runs n(n-1)/2 times. Half of n² is a constant multiple of n², so a triangular loop is still the quadratic family. The notes loop is separate and runs m times, and a sequential loop over an unrelated input adds instead of multiplying, which gives O(n² + m). Dropping the m assumes m never outgrows n², and nothing in the question says that. O(n²m) would be the answer if the notes loop sat inside the pair loop. O(nm) misreads the inner bound, which walks spans rather than notes.",
      "domain": "complexity",
      "competencies": [
        "complexity"
      ]
    },
    {
      "id": "dsa-v1-d10-q2",
      "prompt": "For an ordinary dense array of length n, what is the peak additional storage of `buildRuns`, including its returned arrays? Count array slots/references under the usual amortized array-storage model; input elements are not deep-copied.",
      "context": {
        "language": "javascript",
        "code": "const buildRuns = values => {\n  const runs = [];\n  let current = [];\n\n  for (const value of values) {\n    if (current.length > 0 && current[current.length - 1] !== value) {\n      runs.push(current);\n      current = [];\n    }\n    current.push(value);\n  }\n\n  if (current.length > 0) runs.push(current);\n  return runs;\n};"
      },
      "options": [
        "O(n) — the run arrays hold one entry per input element between them",
        "O(1) — `runs` and `current` are the only two things declared, whatever the input size",
        "O(n²) — a run array is created for every element and each one can grow to the length of the input",
        "O(k), where k is the number of distinct values, which does not depend on n"
      ],
      "correct": 0,
      "explanation": "The returned arrays count here; some conventions exclude output from auxiliary space, which is not the measure asked for. Every element is pushed into exactly one run array, so the run arrays hold n entries between them, and there are at most n of them. Counting declarations is not counting memory: `runs` and `current` are two names for structures that both grow with the input. Nothing copies the input once per element, so the total never reaches n². And the distinct-value count does not bound it either: `[1, 2, 1, 2, 1, 2]` has two distinct values and six runs.",
      "domain": "complexity",
      "competencies": [
        "complexity",
        "arrays-strings"
      ]
    },
    {
      "id": "dsa-v1-d10-q3",
      "prompt": "Each distinct string request id is registered once with its handler. Ids arrive as strings, some of them plain digit strings like `\"12\"` and `\"305\"`. The code looks a handler up by id on every request, and once a minute walks every entry in the order the handlers were registered. Under the usual expected-constant hash-lookup model, which structure fits these requirements, and why?",
      "options": [
        "A `Map`: it associates ids with handlers and iterates in registration order, including numeric-looking keys.",
        "A plain object: property access is expected constant and the keys come back in the order they were assigned.",
        "A `Set` of ids: membership is expected constant and iteration follows insertion order.",
        "An array of `[id, handler]` pairs: it preserves registration order exactly and a lookup is one indexed read."
      ],
      "correct": 0,
      "explanation": "A Map answers both requirements: expected constant lookup in the stated hash model, and insertion-order iteration for keys of any shape. JavaScript requires average sublinear access, not a universal O(1) implementation guarantee. A plain object reorders keys that look like array indices, so `\"12\"` and `\"305\"` iterate first and in ascending numeric order, ahead of everything registered before them. Its prototype also already answers to names like `\"toString\"`, so a lookup can hand back a function nobody registered. A Set stores membership only, and there is nowhere in it to put the handler. An array of pairs keeps the order, but a lookup has to walk it, which is O(n) per request rather than expected constant.",
      "domain": "structures",
      "competencies": [
        "maps-sets"
      ]
    },
    {
      "id": "dsa-v1-d10-q4",
      "prompt": "This checker receives a string containing only parentheses. Which input makes it return `true` for unbalanced text?",
      "context": {
        "language": "javascript",
        "code": "const balanced = text => {\n  const open = [];\n\n  for (const ch of text) {\n    if (ch === '(') open.push(ch);\n    else if (ch === ')') open.pop();\n  }\n\n  return open.length === 0;\n};"
      },
      "options": [
        "`\"())\"`",
        "`\")(\"`",
        "`\"(()\"`",
        "`\"()()\"`"
      ],
      "correct": 0,
      "explanation": "On `\"())\"` the stack holds one `(`, the first `)` empties it, and the second `)` pops an empty array. `Array.prototype.pop` returns `undefined` and leaves the length at 0, so the function reports balance for text that has none. `\")(\"` ends with the `(` still on the stack, so it returns false, which happens to be the right answer. `\"(()\"` never pops that first `(` at all, because nothing in the loop removes it without a `)`, so the length is 1 and the answer is false. `\"()()\"` really is balanced, so `true` is correct there. The repair is to return false the moment a `)` arrives with the stack empty.",
      "domain": "structures",
      "competencies": [
        "arrays-strings"
      ]
    },
    {
      "id": "dsa-v1-d10-q5",
      "prompt": "The input is an ordinary dense array of ascending finite Numbers and the target is finite. This closed-interval search can return -1 for a present target. Which defect causes that missed match?",
      "context": {
        "language": "javascript",
        "code": "const search = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length - 1;\n\n  while (low < high) {\n    const middle = Math.floor((low + high) / 2);\n    if (sorted[middle] === target) return middle;\n    if (sorted[middle] < target) low = middle + 1;\n    else high = middle - 1;\n  }\n\n  return -1;\n};"
      },
      "options": [
        "The loop condition leaves a one-element interval unexamined: the loop ends as soon as `low` reaches `high`, and that index is never probed.",
        "`Math.floor` rounds the middle index down, so the last index of an even-length array is never probed.",
        "`high` starts at `sorted.length - 1`, which is one short: the interval has to run up to `sorted.length`.",
        "The equality test runs before the ordering test, so the search returns whichever match it meets first rather than the leftmost one."
      ],
      "correct": 0,
      "explanation": "With `low < high` the loop exits while `low === high`, and that surviving index is never read. `search([2], 2)` never enters the loop and returns -1; `search([1, 3, 5, 7], 7)` narrows to index 3 and then quits. Changing the condition to `low <= high` fixes it. Rounding down is correct for a closed interval, because the middle only has to land inside `[low, high]`, and it always does. `high = sorted.length - 1` is right for a closed interval; `sorted.length` belongs to the half-open variant, which pairs with `low < high` and `high = middle`. Returning the first equal value encountered can differ from returning the leftmost match, but either is a valid match here; that does not explain a -1 result for a present value.",
      "domain": "searching",
      "competencies": [
        "searching"
      ]
    },
    {
      "id": "dsa-v1-d10-q6",
      "prompt": "A dense ascending array holds the distinct Numbers 1 through 1000000. Use the taught closed-interval binary search: floor the midpoint, read its value once, and exclude that midpoint when moving a bound. Over absent finite targets, what is the maximum number of midpoint reads?",
      "options": [
        "20",
        "1,000,000",
        "1,000",
        "6"
      ],
      "correct": 0,
      "explanation": "For this midpoint convention, the longest unsuccessful path takes floor(log₂ n) + 1 probes. Each probe discards the midpoint and leaves at most half the previous candidate count, so after k probes at most n / 2ᵏ candidates remain. 2¹⁹ = 524,288 is below a million and 2²⁰ = 1,048,576 is above it, so 20 probes are enough and 19 are not. 1,000,000 is what a linear scan reads. 1,000 is the square root of a million, and nothing in a binary search shrinks an interval that way. 6 is log₁₀ 1,000,000, which counts divisions by ten: changing the base only changes a constant factor in the growth class, but the probe count itself comes from halving, so it is base 2.",
      "domain": "searching",
      "competencies": [
        "searching",
        "complexity"
      ]
    },
    {
      "id": "dsa-v1-d10-q7",
      "prompt": "Using this path’s exact sorting implementations, which method can leave the caller’s array `[5, 3, 8, 1, 9, 2]` as `[1, 3, 5, 8, 9, 2]` between completed passes?",
      "options": [
        "Insertion sort: a sorted processed prefix with the untouched tail.",
        "Selection sort: the globally smallest values are placed at the front.",
        "Merge sort: sorted halves are written back into the caller’s array.",
        "Bubble sort: the largest remaining value moves to the far right."
      ],
      "correct": 0,
      "explanation": "The shown insertion sort grows a sorted prefix out of the elements it has already passed and never looks ahead. This question identifies a state of the taught implementations; a snapshot alone cannot prove which arbitrary program produced it. `[1, 3, 5, 8, 9]` is exactly `{5, 3, 8, 1, 9}` reordered, and the 2 is still in the position it started in. Selection sort places globally smallest values from the front, so after two passes the array would begin `1, 2`; the 2 has not moved, so it is not that. The merge sort in this path builds new arrays and returns them rather than writing back into the input, and `[1, 3, 5, 8, 9]` is not a merge of the sorted halves `[3, 5, 8]` and `[1, 2, 9]` either. Bubble sort ends each pass with the largest remaining element at the far right, and here the 9 sits at index 4 with the 2 behind it.",
      "domain": "sorting",
      "competencies": [
        "sorting"
      ]
    },
    {
      "id": "dsa-v1-d10-q8",
      "prompt": "For a dense mutable array of records with string names, a team replaces this path’s fresh-output `mergeSort(rows, byName)` with `rows.sort(byName)`. Which behavior is guaranteed to change? The two blocks show alternative call sites.",
      "context": {
        "language": "javascript",
        "code": "const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);\n\n// before: returns a new array and leaves rows alone\n{\n  const sorted = mergeSort(rows, byName);\n}\n\n// after\n{\n  const sorted = rows.sort(byName);\n}"
      },
      "options": [
        "`sorted` aliases `rows`; merge sort returned a separate array.",
        "Ties can now come out in a different order, because `Array.prototype.sort` makes no stability guarantee.",
        "The comparison count drops below n log n, because the engine sorts without comparing elements.",
        "Auxiliary space falls to O(1), because a built-in sort is required to sort in place."
      ],
      "correct": 0,
      "explanation": "`Array.prototype.sort` sorts the array it is called on and returns that same array, so every other reference to `rows` sees the new order. That aliasing can affect other callers, even if the input happened to be sorted already. Stability is not it: the language has required `sort` to be stable since ES2019, so rows with equal names keep their relative order, exactly as the merge sort did. Sorting arbitrary distinct values by comparisons has a worst-case Ω(n log n) lower bound; particular inputs can need less work. The comparator is still used. The language does not prescribe the sorting algorithm or a constant auxiliary-space bound; mutating the input does not imply constant extra memory.",
      "domain": "sorting",
      "competencies": [
        "sorting",
        "complexity"
      ]
    },
    {
      "id": "dsa-v1-d10-q9",
      "prompt": "A binary tree is written as a level-order listing in which every slot is counted and a missing node is `null`, so the children of index i sit at 2i + 1 and 2i + 2. The listing is `[5, 3, 8, null, 4, 7, null]`. What does an inorder traversal return?",
      "options": [
        "[3, 4, 5, 7, 8]",
        "[5, 3, 8, 4, 7]",
        "[5, 3, 4, 8, 7]",
        "[4, 3, 7, 8, 5]"
      ],
      "correct": 0,
      "explanation": "The listing describes 5 at the root, 3 on the left with a right child 4, and 8 on the right with a left child 7. Inorder visits the whole left subtree, then the node, then the whole right subtree: 3, 4, then 5, then 7, 8. This tree also satisfies the search property, so the ascending result is the confirmation. `[5, 3, 8, 4, 7]` is the listing itself with the nulls removed, which is the level-order walk. `[5, 3, 4, 8, 7]` is the preorder walk, which starts at the root. `[4, 3, 7, 8, 5]` is the postorder walk, which ends at it.",
      "domain": "trees",
      "competencies": [
        "trees"
      ]
    },
    {
      "id": "dsa-v1-d10-q10",
      "prompt": "Two functions look for a finite Number in a finite, nonempty binary tree with ordinary numeric fields. One follows the plain BST ordering rule; the other must search an arbitrary tree with no ordering rule. With n nodes and edge-height h, what are the worst-case visited-node bounds?",
      "options": [
        "BST: at most h + 1; arbitrary tree: up to n.",
        "Both: at most h + 1, regardless of shape or ordering.",
        "BST: at most log₂ n + 1; arbitrary tree: up to n.",
        "Both: exactly n, regardless of height or ordering."
      ],
      "correct": 0,
      "explanation": "An unsuccessful comparison with a BST node rules out one subtree, so the walk follows one root-to-leaf path and reads at most h + 1 nodes, whether it finds the value or runs off the bottom. With no ordering rule there is nothing to discard, and absence is only settled once every node has been checked. A single-path h + 1 bound does not hold for an arbitrary tree. Replacing h with log₂ n assumes balance: a plain BST can be a chain with h = n - 1. Conversely, a short BST can settle absence without visiting all n nodes. The h + 1 bound is an upper bound, not an exact count for every query.",
      "domain": "trees",
      "competencies": [
        "trees",
        "complexity"
      ]
    }
  ]
};
