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

**The Medium and Hard waves.** Every Easy wave has landed, and #226 now adds
challenges that combine what the Easy band teaches. A wave is one file per
track under `lib/coding/tasks/medium-hard-<track>-<wave>.ts`, its solutions
under the same name, and one line in `MEDIUM_HARD_BAND` in
`lib/coding/catalog.ts`. `npm run test:coding` holds each challenge to this
contract:

- It is standalone, issued, and reads Medium (tier 3) or Hard (tier 4, or 5
  for a React capstone) from its tier, with no authored difficulty.
- It combines two to four `focus` tags, and each tag is on at least three Easy
  challenges of the same track. The coverage matrix already holds every Medium
  challenge to that; this check holds the Hard ones of the waves to it too.
- It takes longer than ten minutes and at most 45, and is graded by its tests.
- Its hint ladder has a hint, at least three method steps and a skeleton, then
  ends on the documentation page of its first tag.
- It has at least five visible checks and four hidden ones.
- Its reference, junior and senior solutions pass, and its starter fails.
- It never enters a Learn level's quota. The quota takes a level's first tasks
  in catalogue order, so without the skip JavaScript A would change eight
  Learn levels; level 22 would ask for three of its challenges instead of its
  own two tasks.

JavaScript A (`js-mh-*`) is 15 Medium and 10 Hard challenges. The Medium ones
fill a template with a `replace` callback, sort version numbers, read a quoted
CSV line, split a download into lines across chunks, undo and redo, limit
requests in a sliding window, curry a function, read a grid in a spiral, paint
a region, check a sudoku, build a comment thread, share costs, compare deeply,
upload in batches and let only the newest call answer. The Hard ones settle
debts, diff two versions of a file, trace a word through a grid, list every
arrangement of some letters, justify text, match a URL to a route, diff two
settings objects, write JSON that survives a loop, batch requests into one and
share one request between callers. The wave took the JavaScript matrix from 17
tags on Medium challenges to 29, none of them short; every, pop, regex, shift
and sort have three Easy challenges each, the minimum. The Hard challenges add
two tags no Medium one uses: some, with three Easy challenges, and json, with
four.

Four points for authors:

- Where more than one answer is right, a check can test a property instead of
  one answer. A diff check counts the kept lines and rebuilds both versions
  from the edit, so any longest common subsequence passes. Where a check does
  need one answer, the prompt states the rule that picks it: the removal before
  the addition, the order a word search tries its neighbours, the greedy rule
  that settles debts.
- A hidden check on a large input holds the learner to the technique. A diff
  of two 60-line files and the arrangements of ten letters finish at once with
  a table and with pruning, and brute force runs past the grader's CPU
  deadline.
- `undefined` inside an expected value belongs in a hidden check only. Visible
  checks travel to the browser as JSON, which writes it as `null`.
- The Node runner starts every call at once, so each async check builds its own
  loader, limiter or history inside its call and shares nothing with the
  others.

TypeScript A (`ts-mh-*`) is 6 Medium and 4 Hard challenges, and the first
TypeScript challenges at tier 4. The Medium ones apply discounts told apart by
a union tag, with a `never` check for a kind nobody handled; hand out the page
after a cursor; group chat messages into bubbles by sender; check a form whose
rules are typed per field through a mapped type; sort commit subjects into
release notes behind a type guard; and fill in the missing days of a chart. The
Hard ones print a text table whose formats receive each column's own type, pick
an order from three warehouses, import tab-separated rows through a schema of
parsers typed with `ReturnType`, and apply a formatter's edits given against
the original text. Each one has visible and hidden type tests beside its
runtime checks. The wave took the TypeScript matrix from 24 tags on Medium
challenges to 25, none of them short: slice joins, with three Easy challenges.
The Hard challenges add one tag no Medium one uses, optional, with three.

React A (`react-mh-*`) is 9 Medium challenges, 4 Hard ones at tier 4 and 2
capstones at tier 5, beside the track's ten checklist capstones. The Medium
ones share a basket through context and a reducer, load photos page by page,
sort a table by any column with `aria-sort`, show notices that dismiss
themselves, turn typed text into tags, select all or some messages with an
indeterminate box, bind keyboard shortcuts through a hook that keeps the newest
handler in a ref, rename a file in place and hand the focus back, and ask about
an export job until it is done. The Hard ones build a menu button and a city
combobox the way the ARIA Authoring Practices describe them, a sign-up form
that shows an error once its field has been left, and a carousel that stops for
the pointer, the focus and its Pause button. The capstones search as you type,
with a debounce, an abort and a cache, and autosave a note one save at a time,
with a last save when the page closes. The wave took the React matrix from 18
tags on Medium challenges to 20, none of them short: useReducer, with three
Easy challenges, and conditional, with four.

Without the quota skip the two waves would change eleven Learn levels, six in
TypeScript and five in React. React level 21 would ask for the basket and the
shortcut challenges instead of the useFetch and useLocalStorage hooks, and
TypeScript level 15 would drop `ts-write-reduce` for the cursor page.

Six more points for authors:

- A React starter must not leave a timer or listener running once the suite
  unmounts it. The first carousel starter started a `setInterval` with no
  cleanup: every proof passed, and then `npm run test:coding` never exited,
  because the interval kept Node alive. The starter now clears its interval and
  is still wrong in the ways the checks look for.
- A check that means "this notice" must pick one that is not also the oldest.
  The first notices suite only ever dismissed the oldest notice, so a list that
  removed the oldest on every Dismiss and every timeout passed it. The visible
  check now dismisses the newer one.
- A hidden case that watches timers filters by the delay the prompt names (300
  ms for the notices, 200 ms for the carousel), so Testing Library's own waits
  never count, and patches both `globalThis` and `window`, because a component
  may call either. `timersClearedOnUnmount` in the React A solutions builds that
  case.
- In production a React submission runs in a microVM whose whole command,
  loading jsdom and React included, has 10 seconds
  (`lib/coding/react-isolated.ts`). The slowest suite before this wave took 3.2
  seconds against its reference solution in the Node runner. The first drafts of four React A suites took 3.4
  to 5.9, so their prompts now name shorter delays (a 100 ms debounce, a 150 ms
  autosave wait, 200 ms slides, 300 ms notices) and say that a real app would
  wait longer. A check that a timer has already fired may wait on a real
  timer: a later timer never fires before an earlier one. A check that a timer
  has not fired yet runs on `FAKE_CLOCK` (`lib/coding/tasks/easy-react-a.ts`)
  instead, because no real margin survives a busy machine; see "A timer check
  that fails in the long content run" below.
- Each type test is one line appended to the answer, so two type tests that
  declare the same name collide. A destructured `__value` and a later
  `const __value` in one list failed with "Cannot redeclare" before either could
  test anything. Give every type-test variable a name of its own.
- An `<input type="email">` strips the spaces around its value, as HTML's value
  sanitization requires, so jsdom hands the change handler a trimmed email. With
  that field type a check cannot tell a solution that trims from one that does
  not; the sign-up checks accept both.

Algorithms A (`alg-mh-*`) is the track's first Medium and Hard wave: 8 Medium
and 7 Hard challenges. The Medium ones find every triple that adds up to zero,
count the meeting rooms a day needs, search a rotated list, remove the nth node
from the end of a linked list, count the stretches of account movements that
add up to a target, list every balanced string of brackets, check a binary
search tree, and pay an amount in the fewest coins where the largest coin first
goes wrong. The Hard ones measure the rain trapped between walls, find the
fastest route between stations with Dijkstra's method, find the longest rising
run of scores in O(n log n), write a tree as text and read it back, find the
smallest window of a text that holds every letter, merge contacts that share an
email, and split a text into dictionary words. Only nine tags have three Easy
Algorithms challenges behind them (map-set, two-pointer, for, objects, strings,
for-of, sort, while and recursion), and the wave uses no other. It took the
Algorithms matrix from 10 Medium challenges to 18, still on those 9 tags, none
short; the fewest Easy challenges behind a tag is still 5. The ids keep the
`alg-` prefix, like the Easy wave.

JavaScript B (`js-mh2-*`) is 10 Medium challenges: colour the letters of a
word-game guess with repeated letters, build a table of contents from Markdown
headings, read a log of JSON lines, print a folder tree the way `tree` does,
score a bowling card, keep a leaderboard through a closure, check role
permissions with inheritance and wildcards, take one step of the Game of Life,
find the best block of seats in a cinema, and show results in order as their
promises settle. JavaScript A left eleven tags with three or more Easy
challenges on no Medium challenge, and this wave puts nine of them on one:
json, filter, indexOf, findIndex, splice, some, includes, forEach and
functions. It took the JavaScript matrix from 31 Medium challenges and 29 tags
to 41 and 38, none short. Eleven tags now have exactly three Easy challenges
behind them, and find and do-while are still on no Medium challenge.

Both waves were proven against wrong answers as well as right ones: 69
plausible wrong answers to the Algorithms challenges and 47 to the JavaScript
ones went through the QuickJS grader against the visible and hidden checks
together. All were rejected, 21 and 8 of them by the hidden checks only. That
battery found two gaps the solution proofs could not. A scorecard with no
ten-frame limit passed every check until a hidden one gave a tenth-frame strike
two ordinary bonus rolls. And a recursive answer to "Remove the nth node from
the end" overflowed the stack on the hidden 5,000-node list while the prompt
did not say recursion was out; the prompt now says so.

Five points for authors:

- Size a brute-force check from the grader's speed. QuickJS runs about ten
  million simple loop steps a second here (1e7 additions took 0.9 seconds, and
  1e8 ran into the 2.5-second deadline), and that deadline covers the visible
  and hidden checks together. A hidden check that rejects brute force needs a
  brute-force cost well above 25 million steps and a reference cost in the
  hundreds of thousands: 800 numbers for three-sum, 20,000 amounts or scores,
  50,000 walls or characters, 11 pairs of brackets. Every reference solution of
  both waves ran all its checks in the grader in under 150 ms.
- The grader's stack holds about 2,000 simple frames: a recursion 2,000 deep
  passes, and one 5,000 deep overflows. A hidden check deeper than that turns
  every recursive answer into a stack overflow, so the prompt must say that
  recursion is out. The deep checks that should accept recursion stay far under
  it: a 300-node tree and a chain of 300 contacts.
- A check can count what a solution reads. The rotated-search check puts its
  65,536 values behind a `Proxy` that counts index reads and allows 200, so a
  linear scan fails and a binary search passes, however many values it reads
  per step.
- A check that rejects a promise on purpose marks it handled
  (`settled.catch(() => {})`). The untouched starter of "Show results in order
  as they arrive" attaches no handler, and the unhandled rejection ended the
  whole Node content run, although the QuickJS grader ignores it. The checks'
  `later` helper marks its own rejections handled.
- The -0 trap that Algorithms A describes reaches three-sum. An answer that
  computes the third value as `-(a + b)` returns `[0, -0, 0]` for three zeros,
  which `Object.is` rejects while the results table prints `[0,0,0]`. The
  prompt's two-pointer method pushes the list's own values and avoids it. And
  since QuickJS compares strings in `localeCompare` by code unit, as `sort()`
  does, no hidden check can tell the two apart: the folder tree asks for
  `sort()`'s default order and accepts both.

**A timer check that fails in the long content run.** On 2026-09-26, five of
eight full runs of `npm run test:coding` failed on one React A check, "typing
is saved 150 ms after the last key" of `react-mh-autosave`, against its junior
solution. One of them also failed a hidden interval check of
`react-easy2-countdown`. The autosave check passes when it runs alone, with
only the React proofs, or with only the JavaScript, TypeScript and Algorithms
proofs, and it fails at the commit before the third wave too, so the third wave
did not cause it. A GC trace of a failing run shows a 64 ms collector pause
near the end of the React proofs, and the check allows 50 ms on each side of a
real 150 ms timer, so a pause there lets the save fire before the check that
expects none. In production each React submission runs in a microVM of its own
(`lib/coding/react-isolated.ts`); the content run and CI (`quality.yml`) run
every suite in one Node process.

The fix (FIX step, 2026-09-26) keeps what each check asserts and takes the
machine's speed out of it. `FAKE_CLOCK` puts `setTimeout`, `clearTimeout`,
`setInterval`, `clearInterval` (on `globalThis` and `window`) and `Date.now` on
a clock the case moves with `clock.tick(ms)`. Each timer that falls due fires
inside `act()`, in time order, so React renders and runs the effects of one
timer before the next fires, as on an idle page, and the real timers come back
when the case ends. A stress probe that blocks the event loop for up to 70 ms
every 40 ms (`docs/release-acceptance.md`, FIX) failed the autosave check in
5 of 90 runs and found the same flaw
in the search. Reading every React suite for a check that expects a timer not
to have fired yet found four more, so the clock now runs all of them: the
autosave's "typing is saved 150 ms after the last key" (a 50 ms margin), the
search's "nothing is asked until the typing stops" (50 ms), the export's "the
next question waits 200 ms after the answer" (100 ms), the carousel's three
visible and four hidden timing checks (70 ms in "a click starts the wait
over"), the notices' two visible and two hidden timing checks (60 ms in the
hidden pair) and the countdown's three hidden checks. Under blocks of 120 ms
the old countdown checks failed with correct solutions too: two ticks ran
before React rendered the first, the count read -1, and it never met 0 again.
A wrong solution for each converted check still fails it (a wait that does
not restart, no debounce, an interval kept to the end, a click that does not
restart the slide, a second question after 50 ms, index keys), and five
consecutive full runs of `npm run test:coding` passed on the change (`d53f4ce`,
215 to 219 s each). The other timer checks only assert that a timer has fired,
or that a cleared timer stays quiet, and a later timer never fires before an
earlier one, so they stay on real time. Running each React proof in a process of its own was the other
option; it would have cost a Node start per suite and still left the checks
to the machine's speed.

**Where #226 ended.** The three Medium and Hard waves reached the integration
branch on 2026-09-26 (MERGE-C). The catalogue holds 770 tasks, 549 of them
standalone. The Easy standalone challenges went from 73 to 163 in JavaScript,
26 to 76 in TypeScript, 33 to 73 in React and 11 to 31 in Algorithms, and the
Medium and Hard waves added 75. Every track passes the coverage contract with no
short tag; the fewest Easy challenges behind a Medium tag is three in
JavaScript, TypeScript and React and five in Algorithms. Taking one Easy
challenge away from a tag at three (`every`, `slice`, `useReducer`), or three
from `recursion` in Algorithms, fails the run on that tag and on every Medium
or Hard challenge that carries it. The free set was re-picked for the larger
catalogue: 116 of 770 tasks, 15.1 % (`FREE_CODING_TASK_IDS` in
`shared/tiers.ts`). Three full content runs on the merged branch passed,
including the autosave check above; the FIX step then moved that check and
the others like it onto the hand-moved clock described above.

## What none of these change

None of the four awards XP, completes a level, or opens anything. A puzzle pass
is ordering evidence; an example is exploration; a comparison is reading; a
debugging task is an ordinary task graded by its tests exactly like any other.
Progression comes from the graph in `shared/progression.ts` and from
server-verified evidence, and nothing in this document touches either.
