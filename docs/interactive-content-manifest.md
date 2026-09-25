# Interactive and alternative-format content: what exists, and what does not

Four formats were added alongside the ordinary "write this function" task, each
answering a different complaint about a catalogue made only of implementation
exercises. This document is the coverage record for all four. It is deliberately
explicit about gaps: a partial rollout described as complete is worse than a
partial rollout. Section 5 records the Easy, Medium and Hard label that every
format shares.

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

**The debugging paths (#225).** Fifteen more `debug`-format tasks come as
three short paths on the Coding home: Log it right, Trace the state, and
Edges and inputs. Each level starts from code that runs and is wrong, names
the misconception as a `pitfall`, and opens its hint ladder with the console
technique that shows the bug. The content test proves that the code each
level starts from fails that level's own checks, and requires the three
paths and at least four standalone tasks. The levels, the console both
runners share and the retired café-orders project are described in
[the evolving-challenges page](evolving-challenges.md#the-debugging-paths).

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

## 5. Difficulty labels (#224)

Every challenge in the index carries Easy, Medium or Hard, whatever its
format. `difficultyOf` in `shared/coding-catalog.ts` derives the label, and
`npm run build:coding-index` writes it into `shared/coding-index.ts`, so the
browser reads it without a task body.

| Challenge | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Standalone task, by tier | 1 Foundations, 2 Fluency | 3 Combine | 4 Interview, 5 Capstones |
| Five-level path, by level | 1–2 | 3–4 | 5 |
| Ten-stage project, by stage | 1–3 | 4–7 | 8–10 |
| Twelve-stage FullStack app, by stage | 1–4 | 5–9 | 10–12 |

Every stage and level is tier 2, which is why they read their position. A task
may carry an authored `difficulty` where the derived label would mislead.
`npm run test:coding` refuses an Easy task at tier 3 or above and a Hard task
at tier 1 or 2, requires a band for every path length in use, checks that each
summary in the index carries the label its task resolves to, and prints the
count per label. The label opens, locks and pays nothing: `tierUnlocked`,
`CODING_TASK_XP` and the coding badges read the tier, and `npm run
test:launch` fails if the ladder starts reading the label.

Learners read it as text on the Coding home's next challenge, in the workbench
and design-runner headers, on saved challenges in Collection, on Today's review
cards and in a project's stage list. A track page lists Easy, Medium and Hard
in that order with the tier name as a sub-heading, and its difficulty filter
offers the three labels (`?difficulty=easy`; an old `?tier=` link opens on the
matching label).

**Technique coverage.** `npm run test:coding` also prints a matrix per section
track: each `focus` tag on a Medium standalone challenge, and how many Easy
ones carry it (`scripts/coding-coverage.ts`). The target is three Easy
challenges per tag, so a learner who passes the Easy band has met every
technique the Medium band combines. The Algorithms wave, the last Easy wave of
#226, closed the last five gaps and set `COVERAGE_ENFORCED`, so the run now
fails on a gap: a new Medium challenge needs three Easy challenges behind each
of its tags. A probe in the test proves that removing an Easy challenge opens a
gap, and taking the Algorithms wave out of `EASY_BAND` fails the run with the
five gaps it closed.

**Gaps.** The coverage matrix is the gap list: #226 authors Easy challenges
against it, one track per wave.

The table records each wave as it landed; the matrix that `npm run test:coding`
prints is the live count.

| Wave | Challenges | Tags it brought to three or more Easy | Short tags after it |
| --- | --- | --- | --- |
| JavaScript A (`js-easy2-*`) | 30 | flat, for-in, promises, recursion, timers, callbacks, higher-order, nested-loops, two-pointer | JavaScript none of its 17; TypeScript 17, React 11, Algorithms 5 |
| JavaScript B (`js-easy3-*`) | 30 | none were short; recursion, nested-loops and for-in rose from 3 to 5, flat and timers from 3 to 4, promises and async-await by 2 each | JavaScript none of its 17, fewest 4 Easy; TypeScript 17, React 11, Algorithms 5 |
| JavaScript C (`js-easy4-*`) | 30 | none were short; callbacks, two-pointer, flat and timers rose from 4 to 6, and higher-order, nested-loops, push, for-in, recursion and slice from 5 to 6 | JavaScript none of its 17, fewest 6 Easy; TypeScript 17, React 11, Algorithms 5 |
| TypeScript A (`ts-easy2-*`) | 25 | all 17 short tags: utility-types, constraints, destructuring, map-set and two-pointer from 0 to 3; filter, keyof, map, spread, while, sort, strings and type-guards from 1 to 3, reduce to 4; readonly from 2 to 5, literal-types and record to 4 | JavaScript none; TypeScript none of its 24, fewest 3 Easy; React 11, Algorithms 5 |
| TypeScript B (`ts-easy3-*`) | 25 | none were short; the fourteen tags at 3 rose to 5 or more: utility-types and spread to 7, filter and strings to 6, the other ten to 5; record, generics and tuples rose to 7 | JavaScript none; TypeScript none of its 24, fewest 5 Easy; React 11, Algorithms 5 |
| React A (`react-easy2-*`) | 20 | all 11 short tags: custom-hook, pagination, abort, accessibility, splice, useContext and useRef from 0 to 3; effect-cleanup from 1 to 4, timers and slice from 1 to 3, derived-state from 2 to 3 | JavaScript, TypeScript and React none; React fewest 3 Easy of its 18; Algorithms 5 |
| React B (`react-easy3-*`) | 20 | none were short; the ten tags at 3 rose to 6: useRef, useContext, custom-hook, timers, pagination, slice, abort, accessibility, derived-state and splice; effect-cleanup and useEffect from 4 to 5 | JavaScript, TypeScript and React none; React fewest 5 Easy of its 18; Algorithms 5 |
| Algorithms A (`alg-easy2-*`) | 20 | all 5 short tags: recursion and for-of from 0 to 5, objects from 1 to 6, sort and while from 1 to 5; map-set rose to 8, two-pointer and for to 7, strings to 6 | none in any track; fewest Easy on a Medium tag: JavaScript 6, TypeScript 5, React 5, Algorithms 5 |

JavaScript B also covers techniques the Coding home lists but no Medium
challenge uses yet, so the matrix leaves them out. Regex went from 0 Easy
challenges to 3, JSON from 0 to 2 and sort from 1 to 3. Concat, join and
forEach got their first Easy challenge, and includes, indexOf, findIndex and
every one more each.

JavaScript C works the same list further. Fetch had no Easy challenge and now
has two; both hand the learner a `request` function that behaves like `fetch`,
because the grader has no network. Pop, do...while and forEach went from 1 Easy
challenge to 3, JSON from 2 to 4, and unshift, concat and join from 1 to 2.
Shift, some, find, includes, indexOf, findIndex and default parameters
(`functions`) went from 2 to 3.

TypeScript A grades each challenge twice, like the rest of the track: the
runtime checks run in the QuickJS sandbox, and the compiler runs the type
checks. In several challenges the type is the exercise. The learner declares a
`Pick`, an `Exclude`, a `Record<keyof Contact, string>`, a readonly `Note` or a
type predicate, and a type check that assigns to it or reads through it passes
only when the declaration is right. Hidden type checks (`hiddenTypeTests`)
close the gaps the visible ones leave, such as a `Weekday` that still allows
Saturday.

TypeScript B thickens the rows the first wave left at three. Four utility types
had no Easy challenge before it: `Omit`, `Extract`, `Required` and
`ReturnType`. Two keyof challenges teach indexed access: a setting read back as
`Settings[K]`, and an update whose `value: Product[K]` refuses a price written
as text. Two sorting details matter for authors. QuickJS compares strings in
`localeCompare` by code point where the browser follows the locale, so the
case-insensitive sort asks for `<` and `>` on lower-cased titles. A comparator
that never returns 0 can keep a short tie in order in one engine and break it
in the other. The two sorting challenges hide a longer tie (eight equal scores,
and eight titles in two case groups), and the server grader breaks on those
too.

React A is graded by Testing Library suites, like every React challenge, and
brings hidden checks to React. A JavaScript or TypeScript challenge hides extra
calls; a React one hides extra test cases in `hiddenSuite`, beside its
solutions on the server (`lib/coding/react-hidden.ts`). The browser's Run
button runs the visible suite. Submit runs both, and the hidden cases come back
as a count, never with their names or errors. Several suites import a named
export as well as `App`, so a check can render the piece the technique lives
in: `Badge` under a provider of its own, or a hook inside a probe component.
The hidden cases catch a value that is right only at mount, a hard-coded page
count, a seed array spliced in place, a listener or interval left behind, and
an aborted request whose rejection nobody handles.

Three things came up while proving the wave against wrong answers. A test that
watches `clearInterval` also sees the calls `waitFor` makes, so the countdown
records the ids its own component starts and checks only those. A probe that
passes a new array literal on every render turns a hook written with
`useEffect` and `useState` into a loop that never yields, so the probes keep
their arrays outside the component. And a promise rejection that nobody
handles, such as an aborted `fetch` with no `catch`, ended the whole Node
process, so the learner read "The React runner could not start". The browser
only logs such a rejection. `lib/coding/react-runner.ts` now does the same while
a suite runs, and "Only the latest search" checks for the rejection in both
runners.

React B thickens the ten rows the first wave left at three, with techniques the
Medium challenges combine: a ref that keeps the latest draft for a timeout,
focus handed back to the button that opened a form, a `useTheme` hook that
throws when its provider is missing, a timeout that aborts a slow request, and
one `AbortController` signal that cancels two requests or removes two
listeners. Two findings matter for authors. React empties `ref.current` when a
component unmounts, so a mousedown listener that `useOutsideClick` leaves
behind stays quiet in a click test; that hidden case watches the listeners on
`document` and `window` instead, and accepts one removed through an aborted
signal. And a harness that drives `/sandbox/index.html` in Chromium needs the
workbench frame's `allow-forms` flag beside `allow-scripts`: without it a
click on a submit button submits nothing, and every form challenge fails in the
browser while it passes on the server.

Algorithms A is twenty interview warm-ups in plain JavaScript, and each prompt
ends with the cost an interviewer listens for, like the rest of the track.
Recursion covers Euclid's `gcd`, a Fibonacci memo, every binary string of a
length, a mirrored tree and a root-to-leaf path sum. Two checks hold the
learner to the technique. The Fibonacci check reads the `memo` Map the learner
passes down, and a hidden `fib(70)` times out without one. "First broken build"
hands over an `isBroken` callback that counts its calls, and 1,000 builds allow
11 checks, so a linear scan fails. The ids keep the `alg-` prefix, because
`isCodingTaskId` and the garden paths accept no other for the track.

Two points for authors. A product that can come out as 0 or -0 is a trap:
`Math.max(0, -0)` gives 0, an `if (a > b)` comparison can hand back -0,
`deepEqual` tells them apart with `Object.is`, and the results table prints 0
for both. The largest-product checks avoid zeros for that reason. And
`npm run test:coding` now runs each Algorithms starter against its checks, as
it already did for JavaScript. Every existing Algorithms starter, path levels
included, already failed its checks.

A wave is one file per track under `lib/coding/tasks/easy-<track>-<wave>.ts`,
its solutions under the same name in `lib/coding/solutions/`, and one line in
`EASY_BAND` in `lib/coding/catalog.ts`. `npm run test:coding` holds each of its
challenges to the Easy-band contract:

- It is standalone, issued, and Easy by its tier (1 or 2).
- It practises one technique: at most two `focus` tags.
- It fits in ten minutes and is graded by its tests.
- Its hint ladder has a hint and at least two method steps, then ends on the
  documentation page of its first tag.
- It carries at least three hidden checks: calls for JavaScript and
  TypeScript, test cases in `hiddenSuite` for React.
- Its reference, junior and senior solutions pass, and its starter fails.
- It never enters a Learn level's quota. The quota takes a level's first tasks
  in catalogue order, and a new tier 1 challenge would push out the one the
  level has always asked for.

The waves are English only, with no Czech overlay.

## What none of these change

None of the four awards XP, completes a level, or opens anything. A puzzle pass
is ordering evidence; an example is exploration; a comparison is reading; a
debugging task is an ordinary task graded by its tests exactly like any other.
Progression comes from the graph in `shared/progression.ts` and from
server-verified evidence, and nothing in this document touches either.
