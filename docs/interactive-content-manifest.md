# Interactive and alternative-format content: what exists, and what does not

Four formats were added alongside the ordinary "write this function" task, each
answering a different complaint about a catalogue made only of implementation
exercises. This document is the coverage record for all four. It is deliberately
explicit about gaps: a partial rollout described as complete is worse than a
partial rollout.

Every count here is enforced by a test, not asserted by hand. `npm run
test:coding` proves the coding-side manifests and `npm run test:paths` proves
the lesson content, so a claim in this file that stops being true fails a check
before it reaches a learner.

## 1. Approach comparisons (#158)

Two or three original solutions to a task the learner has already passed, each
with its cost in time and space, what it assumes, and what it gives up.

**Source:** `lib/coding/approaches.ts` (server-only). **Gate:** the recorded
verdict — passing opens it, and reading the reference solution after giving up
does not.

| Task | Approaches | Contrast the pair is teaching |
| --- | --- | --- |
| `js-double-numbers` | 2 | Declaring the result vs. walking the indices |
| `js-sum-array` | 2 | `reduce` with an initial value vs. a running total |
| `js-reverse-string` | 2 | Code points vs. UTF-16 units — the shorter one is also the more correct one |
| `js-palindrome` | 2 | Comparing with the reverse vs. two pointers that stop early |
| `js-word-count` | 2 | A frequency map vs. sort-then-count-runs |

**Gaps.** JavaScript only. TypeScript, React and the DSA catalogue have none
yet, and the tab does not appear for a task without an authored comparison
rather than opening on an empty panel.

## 2. Code-ordering puzzles (#154)

What a phone or tablet gets in place of an editor. Arranging authored lines
demonstrates that the learner knows the shape of a solution; it is recorded as
ordering evidence in its own table and never as a code pass.

**Source:** `lib/coding/puzzles.ts` (server-only; lines are shuffled per
request, accepted orders never leave the server).

| Task | Lines | Accepted orders | Competencies |
| --- | --- | --- | --- |
| `js-reverse-string` | 5 | 1 | sequence, api-usage |
| `js-sum-array` | 7 | 1 | sequence, control-flow |
| `js-count-vowels` | 8 | 2 | sequence, control-flow, api-usage |
| `js-word-count` | 8 | 2 | sequence, api-usage |
| `js-largest-number` | 8 | 1 | sequence, control-flow, edge-handling |
| `js-palindrome` | 11 | 4 | sequence, control-flow, edge-handling |

More than one accepted order is normal: independent declarations can swap, and
insisting on one canonical answer would teach a rule that does not exist.

**Gaps.** JavaScript only, and only tier 1–2. A task without a puzzle shows the
"waiting for a bigger screen" state on a narrow viewport, keeps the draft, and
completes nothing — that state is the honest answer, not a placeholder for a
puzzle we have not written.

## 3. Debugging tasks (#163)

Tasks that start from code that runs and is wrong. Reading someone else's
intent and forming a theory about the difference is a different skill from
writing code that is not there yet, and most working days contain more of it.

**Source:** `lib/coding/tasks/javascript-debug.ts`, repairs in
`lib/coding/solutions/javascript-debug.ts`. The content test runs each broken
starter against the task's own visible tests and requires it to fail, so the
format cannot become a label on a task that was never broken.

| Task | Level | The misconception it is built around |
| --- | --- | --- |
| `js-debug-average` | 3 | The empty case divides by zero — the edge, not the logic |
| `js-debug-tally` | 6 | Writing a constant where the previous value should be read back |
| `js-debug-remove-item` | 8 | Mutating the caller's array and returning it |
| `js-debug-first-match` | 10 | Not stopping once the first match is found |

Each carries an authored failure hint keyed to the category the run will
produce, so the feedback names the misconception rather than a line number.

**Gaps.** JavaScript only. TypeScript (narrowing that looks right and is not)
and React (stale closures, missing dependencies) are the obvious next sets, and
neither exists yet. The format filter still offers "Find the bug" on every
track, which is correct: it returns nothing on tracks with no debugging tasks,
and an empty result is honest.

## 4. Interactive lesson examples (#162)

Snippets inside a lesson that the learner can change and run. Exploration, and
labelled as such under every one: nothing is graded, nothing is recorded, and
running one proves nothing about mastery. They run in the same bounded, isolated
worker the Run button uses — never in the page, never on the server. On a narrow
screen the editor is not offered; the snippet stays readable and runnable, which
is the same policy a coding task follows.

**Source:** `kind: 'example'` sections in `lib/learning-paths/content/dsa/`.

| Lesson | What the learner can change |
| --- | --- |
| D01 — counting work | A step counter across two passes: double the input, watch the count double |
| D02 — arrays and mutation | The same doubling done in place and by copying, printing what happened to the caller's array |
| D04 — stacks | A stack driven far enough to reach the empty case, and what `pop` should answer there |
| D07 — search | Binary search with its comparisons counted; unsort the list and watch the answer stop being trustworthy |

**Gaps.** DSA lessons only, and four of the eighteen. The FDE lessons have none:
their material is architectural rather than executable, and a runnable snippet
would have to be invented to fill a quota rather than because it explains
something. JavaScript, TypeScript and React have no lessons of this kind at all
— their teaching lives in Learn levels, which use the question format rather
than the lesson format, so extending this there is a larger piece of work than
authoring more examples.

## What none of these change

None of the four awards XP, completes a level, or opens anything. A puzzle pass
is ordering evidence; an example is exploration; a comparison is reading; a
debugging task is an ordinary task graded by its tests exactly like any other.
Progression comes from the graph in `shared/progression.ts` and from
server-verified evidence, and nothing in this document touches either.
