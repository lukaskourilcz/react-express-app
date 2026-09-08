# DSA Foundations: standalone learning path

Added 8 September 2026 following the owner's expanded request. This plan complements [FDE research](fde-learning-path-research.md) and uses the [shared path implementation](fde-implementation-plan.md). It is a focused skill path, not a job specialization or fourth engineering track.

## Outcome and entry

A learner who passes can explain common growth rates, choose an appropriate basic data structure, implement foundational searches/sorts/tree operations, and analyze time and auxiliary space for the work they wrote. The course establishes assessed foundations; continued practice is needed for retention. It excludes advanced algorithms and makes no universal mastery guarantee.

Entry requirement: variables, functions, conditionals, loops, arrays and basic JavaScript. Provide a short optional check with targeted links to existing lessons. Do not require full Frontend/Backend/Fullstack completion, FDE enrollment, HTML/CSS, an XP rank or a framework.

Expose **DSA Foundations** under focused learning paths in Learn/Roadmap and a direct `/roadmap/paths/dsa-foundations` route. Guests preview; sign-in saves assessed progress. Choosing it does not overwrite the learner's base track or FDE specialization, and both paths may be active. The career flow still starts with Fullstack, Frontend, Backend and then optional FDE.

## Research and existing content

[Harvard CS50's algorithms unit](https://cs50.harvard.edu/x/weeks/3/) includes linear/binary search, bubble/selection/merge sorting, asymptotic notation and recursion. Its [data structures notes](https://cs50.harvard.edu/x/notes/5/) cover queues, stacks, linked lists, trees and hash tables. [MIT's binary-tree lecture](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-6-binary-trees-part-1/) supports foundational terminology, navigation and operations. These are scope references, not courses to reproduce wholesale. Original JS/TS examples and exercises will be authored with attribution links. Sources checked 8 September 2026; Harvard is the 2026 course and MIT is Spring 2020 material.

Repository baseline already has a 15-level `dsa` topic (`lib/roadmap.ts`, `lib/roadmap-questions-dsa.ts`) covering complexity through heaps/graphs, and a separate `algorithms` topic whose outline is largely arithmetic/combinatorics/logic. Do not equate either entire topic with this requested foundation path. Existing DSA includes Dijkstra/topological-sort questions; these are outside this path's required inventory and remain available elsewhere.

Reusable coding candidates include `js-binary-search` (currently JavaScript level 25/tier 3), `js-queue-with-shift` and `js-swap-stack-top` in `lib/coding/tasks/javascript-loops.ts`. Audit semantics, clarity and tests before linking. The shift exercise demonstrates FIFO behavior, not constant-time dequeue; the new performance lesson must make that difference explicit. Do not require reaching ordinary tier 3 to attempt binary search within this path, and do not globally unlock unrelated coding tiers.

## Complexity coverage

| Growth class | What learners must explain and recognize |
|---|---|
| O(1), constant | Fixed number of accesses or operations under a stated model; not literally identical wall-clock duration |
| O(log n), logarithmic | Repeated halving/doubling, binary search on sorted random-access input; identify the shrinking search interval |
| O(n), linear | One traversal; sequential linear passes still linear; distinguish input length from numeric input value |
| O(n log n), linearithmic | Merge sort's work per level across logarithmically many levels, using a trace rather than a recurrence proof |
| O(n²), quadratic | Nested work over the same n-sized input, selection/insertion worst cases; triangular loops still quadratic |
| O(n³), cubic | Recognition of three n-sized nested dimensions; no advanced algorithm required |
| O(2^n), exponential | Trace a small two-way choice expansion; understand why it becomes infeasible, without implementing advanced search |
| O(n!), factorial | Recognize permutation growth for very small n; contrast with exponential; no permutation solver required |

Teach Big O as an asymptotic upper bound and ask for the tightest supported class in single-answer questions. Worst/average/best case describe which running-cost function is being analyzed; Big O does not itself mean worst case. Briefly distinguish Theta as a tight bound and Omega as a lower bound without proof-heavy exercises.

Explain constants/dominant terms, O(n+m) for independent inputs, O(nm) for cross-products, and why nested loops are not automatically quadratic when bounds differ. Include auxiliary vs total space, recursion stack depth, copying/slicing cost, and preprocessing cost (sorting once before repeated searches). Log bases differ by a constant factor; use base 2 for trace counts.

State the computational assumptions: conceptual array indexing; dynamic-array growth amortization at an intuitive level; expected hash-table operations vs worst collision behavior; a basic unbalanced BST costs O(h), potentially O(n), not guaranteed O(log n). JS Map is an implementation abstraction, not a universal worst-case constant-time guarantee. Do not describe JS arrays as guaranteed contiguous C arrays. Array shift/unshift/copying cannot be treated as free in teaching examples.

## Curriculum and minimum inventory

Nine modules each have **2 lessons, 4 scenario/trace checks and 3 coding exercises**, followed by a 3-exercise final assessment: **18 lessons, 36 checks and 30 coding exercises** total. Reused tasks count once and need an approved mapping. Counts are planned authoring targets, not current UI claims. Suggested workload: 25–40 hours, to calibrate in a pilot.

| ID | Module | Three coding exercises | Completion evidence |
|---|---|---|---|
| D01 | Big O, growth and space | Linear accumulator; halving counter; compare counted single-pass vs pairwise routines | Correct code plus growth/time/space classification on fresh snippets |
| D02 | Arrays and strings | Reverse an array in place; two-pointer palindrome on explicitly ASCII inputs; remove duplicates from a sorted array | Empty/single/duplicate cases, mutation contract and space explanation |
| D03 | Hash maps and sets | Frequency map; first unique value; intersection using a set | Operation tradeoffs, duplicate handling, expected vs worst case |
| D04 | Stacks and queues | Stack API; queue with a head index; balanced brackets | LIFO/FIFO traces, underflow and amortized-cost discussion for chosen representation |
| D05 | Singly linked lists | Prepend and find; delete first matching node; reverse a list | Head/tail/null handling, pointer trace, O(n) search vs O(1) insertion with known location |
| D06 | Recursion foundations | Recursive sum over a linked list; factorial with small bounded input; iterative equivalent of a recursive countdown | Base case, termination, stack depth and time vs space. Factorial function is linear-time in the unit-cost teaching model, not factorial-time. |
| D07 | Linear and binary search | Linear search; iterative binary search; lower-bound/first-occurrence binary search | Sorted-input precondition, interval invariants, missing target/duplicates and complexity |
| D08 | Basic sorting | Selection sort; insertion sort; merge sort | Trace bubble sort in lessons; implement listed three; discuss stable vs unstable, in-place vs auxiliary space and best/worst cases |
| D09 | Trees and binary search trees | Tree height/count; DFS traversals plus level-order traversal; BST search and insert | Root/leaf/depth/height; binary tree vs BST; skewed vs balanced shape; duplicate policy; O(h) operations and traversal costs |
| D10 | Foundation assessment | Implement a searchable sorted record index; repair a queue-backed tree traversal; choose/implement frequency indexing for repeated lookup | Correctness, fresh complexity questions and data-structure tradeoffs; all three exercise gates required |

For combined operations, provide small clear function signatures and independent feedback; keep each exercise within existing runtime limits. Record immutable IDs such as `dsa-v1-D07-binary-search`; a reference to existing `js-binary-search` must preserve its ordinary task identity and prevent duplicate rewards.

Tree scope: basic binary trees/BSTs, insert/search, in/pre/postorder DFS and level-order BFS. Balanced vs skewed is conceptual; no AVL/red-black rotations, B-trees or advanced deletion cases required. Heaps/tries/graphs, Dijkstra/A*, shortest paths, union-find, advanced dynamic programming, backtracking, greedy proofs and competition algorithms are excluded from required completion. Quicksort may be a brief comparison only; it is not a required implementation. Exponential/factorial complexity recognition does not add advanced algorithm exercises.

## Teach, practice, verify

Each module follows explanation → deterministic trace → guided implementation → independent variant → time/space reasoning → later review. Use exact data-based traces with play/pause/step/reset and textual alternatives: array accesses, stack/queue changes, sorting comparisons and tree traversal. No generated images for algorithm state. Small-input growth tables label operation counts as a model, not measured runtime.

Code runs through the existing server-authoritative JS/TS sandbox with Run/output/console/hints. JavaScript first, optional TypeScript versions with equivalent requirements; no new language track or paid AI. The path adapter bypasses only irrelevant legacy task-tier gates for enrolled path activities.

Require functional hidden tests plus separate objective complexity/trace answers. Where meaningful, instrument an author-supplied comparator/access API to count operations on the specified abstraction; validate that all accesses occur through it. Counts support a bounded task contract, not a proof of arbitrary-program Big O. Do not use wall-clock microbenchmarks or source-string matching as the only grade. A written complexity claim alone cannot certify the algorithm.

When an exercise specifically teaches a sorting/searching method, its prompt states allowed operations; design the task interface/trace checks so a built-in sort or linear scan cannot pass the intended method assessment. Enforce restrictions through a reviewed sandbox/task contract and safe validation, not a brittle keyword blacklist. Equivalent correct algorithms within the stated contract are accepted.

Every coding task needs empty/single-element, duplicate, already sorted/reversed, missing target and applicable negative-value tests. Lists/trees include null, skewed and deep-but-bounded fixtures. Numeric examples use safe integer ranges; explain the simplified cost model instead of running enormous exponentials/factorials. Hash-table questions distinguish normal assumptions from adversarial cases.

Module pass requires all required code tasks plus at least 80% on the module's scenario checks, with retry and feedback. Final assessment separately checks Big O/growth, data structures, searching, sorting and trees; each domain needs at least 80%, and all three final coding exercises must pass. No strong sorting score can hide missing tree knowledge. Thresholds are pilot assumptions, versioned with the rubric. No literal promise to guarantee understanding forever.

Completion records identify verified code and objective reasoning. A follow-up review queue reinforces weaker topics; repeat questions are not enough for final assessment, which uses fresh variants. Previously completed quiz levels may inform recommendations, but cannot grant new coding/complexity requirements without matching verified evidence.

## Implementation and release

Use the shared `LearningPathId` and manifest kind from the FDE plan: `dsa-foundations` is `skill_path`; `fde` is `role_specialization`. Reuse `learning_path_*` storage, `learning-path-*` API dispatch and existing coding runtimes. DSA enrollment has nullable base-track context and does not change `devquiz_learning_preference_v1.specialization`. Keep role IDs restricted to FDE.

A path-neutral client workspace can be shared below separate role/skill entry routes. Per-path availability/version flags let DSA launch without waiting for FDE content. Today deduplicates reused tasks and can resume either active path. Preserve legacy question IDs/levels/checkpoints/XP, ordinary coding tiers, StudyShark isolation and all old progress. New path completion is separate, with no new XP in v1.

Existing DSA questions need targeted correctness/tone review before reuse; do not blindly import all levels or mirror their simple distractors. Sources and EN/CS overlays belong in the manifest/content quality workflow. Deterministic diagrams need keyboard operation, reduced motion, textual descriptions and zoom/reflow at 360–1440px.

Proposed work packages: independent DSA epic; path entry/catalog/progress; Big O/complexity content and checks; basic structures plus coding; searching/sorting plus traces and coding; trees/final assessment plus readiness verification. These depend on the common contracts/storage/API/runtime adapter, not FDE customer or AI modules. See the issue index in the shared plan.

DSA release gates add method-assessment bypass attempts, complexity misconceptions, all growth classes, independent-input costs, balanced/skewed BST cases, falsified client scores, legacy progress preservation, EN/CS parity, and separate FDE/DSA enrollment/disable behavior. Run the shared repository release suite and relevant coding/harness checks. No application changes or execution tests are claimed by this planning document.
