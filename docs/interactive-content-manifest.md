# Interactive and alternative-format content

Four formats sit beside the ordinary "write this function" task: approach comparisons, code-ordering puzzles, debugging tasks and interactive lesson examples. This document records what each covers and where it stops, then the Easy, Medium and Hard label every challenge carries and the contracts the Easy and Medium/Hard bands follow.

The counts here come from the code. `npm run test:coding` enforces the coding-side contracts and prints the live coverage matrix, `npm run test:paths` checks the lesson content, and `npm run content:snapshot` prints the current inventory.

## Catalogue at a glance

`lib/coding/catalog.ts` authors 814 tasks. 769 are issued (`shared/coding-index.ts`): 480 Easy, 189 Medium and 100 Hard, of which 144 are free (`FREE_CODING_TASK_IDS` plus the opening stages of every project and path, `shared/tiers.ts`).

| Track | Issued | Standalone Easy / Medium / Hard | Project and path stages |
| --- | ---: | --- | ---: |
| JavaScript | 316 | 163 / 41 / 18 | 94 |
| TypeScript | 156 | 76 / 22 / 4 | 54 |
| React | 183 | 73 / 26 / 21 | 63 |
| Algorithms | 114 | 52 / 36 / 16 | 10 |

The 45 system-design tasks are authored and hidden: `CODING_SECTION_TRACKS` leaves the track out. Projects and short paths are described in [evolving challenges](evolving-challenges.md).

## 1. Approach comparisons (#158)

Two or three original solutions to a task the learner has already passed, each with its cost in time and space, what it assumes and what it gives up.

**Source:** `lib/coding/approaches.ts` (server-only). **Gate:** the recorded verdict. Passing opens it; reading the reference solution after giving up does not.

| Task | Approaches | Contrast the pair teaches |
| --- | --- | --- |
| `js-double-numbers` | 2 | Declaring the result vs. walking the indices |
| `js-sum-array` | 2 | `reduce` with an initial value vs. a running total |
| `js-reverse-string` | 2 | Code points vs. UTF-16 units; the shorter one is also the more correct one |
| `js-palindrome` | 2 | Comparing with the reverse vs. two pointers that stop early |
| `js-word-count` | 2 | A frequency map vs. sort-then-count-runs |

**Gaps.** JavaScript only. TypeScript, React and Algorithms have none. The tab does not appear for a task without an authored comparison.

## 2. Code-ordering puzzles (#154)

What a phone or tablet gets in place of an editor. Arranging authored lines shows the learner knows the shape of a solution; the server records it as ordering evidence in its own table and never as a code pass.

**Source:** `lib/coding/puzzles.ts` (server-only; lines are shuffled per request, a shuffle that lands on an accepted order is dealt again, and accepted orders never leave the server). A submitted order must hold only the line ids the session issued; anything else, or an order longer than the puzzle cap, answers 400.

| Task | Lines | Accepted orders | Competencies |
| --- | --- | --- | --- |
| `js-reverse-string` | 5 | 1 | sequence, api-usage |
| `js-sum-array` | 7 | 1 | sequence, control-flow |
| `js-count-vowels` | 8 | 5 | sequence, control-flow, api-usage |
| `js-word-count` | 6 | 2 | sequence, api-usage, edge-handling |
| `js-largest-number` | 8 | 6 | sequence, control-flow, edge-handling |
| `js-palindrome` | 11 | 6 | sequence, control-flow, edge-handling |

More than one accepted order is normal: independent declarations can swap, and one canonical answer would teach a rule that does not exist. Every accepted order passes its task's visible and hidden checks, and every order that passes them is accepted: the coding content contract runs the accepted orders and enumerates every arrangement (the function's first and last lines in place, brace-free lines also outside the function) to find a passing one that is missing.

A puzzle never completes its task, so the puzzle screen offers the same "Use the editor on this screen" button as the waiting state below.

**Gaps.** JavaScript tier 1 and 2 only. A task without a puzzle opens in the "waiting for a bigger screen" state below 1024 CSS px (phones, portrait tablets, a desktop at 200% zoom). That state keeps the draft and completes nothing. Its "Use the editor on this screen" button opens the normal editor with Run and Submit, and the choice holds for every task until the browser session ends. The server grades that code like code from any other screen, so a Learn level whose coding task is required can be finished on a phone.

## 3. Debugging tasks (#163)

Tasks that start from code that runs and is wrong. Reading someone else's intent and forming a theory about the difference is a different skill from writing missing code.

**Sources:** `lib/coding/tasks/javascript-debug.ts` and its solutions in `lib/coding/solutions/javascript-debug.ts`. The content test runs each broken starter against the task's visible tests and requires it to fail, so the format cannot label a task that was never broken.

| Task | Level | The misconception it is built around |
| --- | --- | --- |
| `js-debug-average` | 3 | The empty case divides by zero: the edge, not the logic |
| `js-debug-tally` | 6 | Writing a constant where the previous value should be read back |
| `js-debug-remove-item` | 8 | Mutating the caller's array and returning it |
| `js-debug-first-match` | 10 | Not stopping once the first match is found |

Each carries an authored failure hint keyed to the category the run produces, so the feedback names the misconception instead of a line number.

Thirty tasks use the `debug` format in all: the four above, the fifteen levels of the three debugging paths on the Coding home (Log it right, Trace the state, Edges and inputs), the ten stages of the unlisted café-orders project, and `alg-dsa-repair-level-order` among the DSA Foundations tasks. [Evolving challenges](evolving-challenges.md#the-debugging-paths) describes the paths and the console both runners share.

**Gaps.** No TypeScript or React debugging task exists (narrowing that looks right and is not; stale closures and missing dependencies). The "Find the bug" filter appears on every track and returns nothing where a track has none.

## 4. Interactive lesson examples (#162)

Snippets inside a lesson that the learner can change and run. They are exploration, labelled so under every one: nothing is graded or recorded, and running one proves nothing about mastery. They run in the same bounded, isolated worker as the Run button, never in the page and never on the server. On a narrow screen the editor is not offered; the snippet stays readable and runnable, the same policy a coding task follows.

**Source:** `kind: 'example'` sections in `lib/learn-lessons/dsa/`, the readings the DSA Learn levels open with (`lib/learn-lessons/levels.ts`).

| Lesson | What the learner can change |
| --- | --- |
| D01 (counting work) | A step counter across two passes: double the input, watch the count double |
| D02 (arrays and mutation) | The same doubling done in place and by copying, printing what happened to the caller's array |
| D04 (stacks) | A stack driven to the empty case, and what `pop` should answer there |
| D07 (search) | Binary search with its comparisons counted; unsort the list and watch the answer stop being trustworthy |

**Gaps.** Four of the eighteen DSA readings. The DSA Advanced readings and the FDE lessons have none: FDE material is architectural, and a runnable snippet there would be invented to fill a quota. JavaScript, TypeScript and React levels open with questions, not lessons, so examples there would need lessons first.

## 5. Difficulty labels (#224)

Every challenge in the index carries Easy, Medium or Hard, whatever its format. `difficultyOf` in `shared/coding-catalog.ts` derives the label, and `npm run build:coding-index` writes it into `shared/coding-index.ts`, so the browser reads it without a task body.

| Challenge | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Standalone task or project checkpoint, by tier | 1 Foundations, 2 Fluency | 3 Combine | 4 Interview, 5 Capstones |
| Five-level path, by level | 1–2 | 3–4 | 5 |
| Ten-stage project milestone, by stage | 1–3 | 4–7 | 8–10 |
| Twelve-stage FullStack app milestone, by stage | 1–4 | 5–9 | 10–12 |

Every stage and level is tier 2, so milestones and path levels read their position (`STAGE_DIFFICULTY_BANDS`). A checkpoint (`…-start`) is the five-minute step before a milestone and stays that size wherever it sits, so it reads its tier like a standalone task: every checkpoint is Easy. A task may carry an authored `difficulty` where the derived label would mislead.

`npm run test:coding` refuses an Easy task at tier 3 or above and a Hard task at tier 1 or 2, requires a band for every path length in use, checks that each index summary carries the label its task resolves to, and prints the count per label. The label opens, locks and pays nothing: `tierUnlocked`, `CODING_TASK_XP` and the coding badges read the tier, and `npm run test:launch` fails if the ladder starts reading the label.

Learners see the label as text on the Coding home's next challenge, in the workbench and design-runner headers, on saved challenges in Collection and in a project's stage list. A track page lists Easy, Medium and Hard in that order with the tier name as a sub-heading, and its difficulty filter offers the three labels (`?difficulty=easy`; an old `?tier=` link opens on the matching label).

### Technique coverage

`npm run test:coding` prints a matrix per section track: each `focus` tag on a Medium standalone challenge, and how many Easy challenges carry it (`scripts/coding-coverage.ts`). `COVERAGE_ENFORCED` is on and `COVERAGE_MIN_EASY` is 3, so the run fails when a Medium tag has fewer than three Easy challenges behind it: a new Medium challenge needs three Easy challenges for each of its tags, and removing an Easy challenge can open a gap. A probe in the test proves both directions. The printed matrix is the live count and the gap list.

### The Easy band

The Easy band is 200 standalone challenges in eight files: `lib/coding/tasks/easy-<track>-<wave>.ts` for JavaScript a to c, TypeScript a and b, React a and b and Algorithms a, each with solutions under the same name in `lib/coding/solutions/` and one line in `EASY_BAND` in `lib/coding/catalog.ts`. `npm run test:coding` holds each challenge to this contract:

- It is standalone, issued, and Easy by its tier (1 or 2).
- It practises one technique: at most two `focus` tags.
- It fits in ten minutes and is graded by its tests.
- Its hint ladder has a hint and at least two method steps, then ends on the documentation page of its first tag.
- It carries at least three hidden checks: calls for JavaScript and TypeScript, test cases in `hiddenSuite` for React.
- Its reference, junior and senior solutions pass, and its starter fails.
- It never enters a Learn level's quota. The quota takes a level's first tasks in catalogue order, and a new tier 1 challenge would push out the one the level has always asked for.

### The Medium and Hard band

The Medium and Hard band is 75 challenges in five files (`lib/coding/tasks/medium-hard-<track>-<wave>.ts`, solutions under the same name, one line in `MEDIUM_HARD_BAND`): JavaScript a (15 Medium, 10 Hard) and b (10 Medium), TypeScript a (6 Medium, 4 Hard), React a (9 Medium, 4 Hard, 2 capstones at tier 5) and Algorithms a (8 Medium, 7 Hard). `npm run test:coding` holds each one to this contract:

- It is standalone, issued, and reads Medium (tier 3) or Hard (tier 4, or 5 for a React capstone) from its tier, with no authored difficulty.
- It combines two to four `focus` tags, each on at least three Easy challenges of the same track.
- It takes longer than ten minutes and at most 45, and is graded by its tests.
- Its hint ladder has a hint, at least three method steps and a skeleton, then ends on the documentation page of its first tag.
- It has at least five visible checks and four hidden ones.
- Its reference, junior and senior solutions pass, and its starter fails.
- It never enters a Learn level's quota, for the same reason as the Easy band.

The Algorithms track also holds the 29 DSA Foundations tasks (`lib/coding/tasks/dsa.ts`, topic `dsa`, levelled to the DSA Learn topic) and 24 DSA Advanced tasks (`lib/coding/tasks/dsa-advanced.ts`, topic `dsa-advanced`). `DSA_FOUNDATIONS_TASK_IDS` sorts the Foundations tasks ahead of band tasks of the same level and tier.

## Notes for authors

**Grading.** A JavaScript or TypeScript challenge hides extra calls; TypeScript also runs visible and hidden type tests (`hiddenTypeTests`) through the compiler, so a declared `Pick`, `Exclude`, `Record` or type predicate can be the exercise. A React challenge hides extra test cases in `hiddenSuite` beside its solutions (`lib/coding/react-hidden.ts`). Run executes the visible suite in the browser; Submit runs both on the server, and hidden cases come back as a count, never with names or errors.

**Checks that hold the technique.**

- Where more than one answer is right, test a property instead of one answer: a diff check counts the kept lines and rebuilds both versions from the edit, so any longest common subsequence passes. Where a check needs one answer, the prompt states the rule that picks it.
- A hidden check on a large input rejects brute force. QuickJS runs about ten million simple loop steps a second, and the 2.5-second deadline covers visible and hidden checks together, so a brute-force rejection needs a brute-force cost well above 25 million steps and a reference cost in the hundreds of thousands.
- The grader's stack holds about 2,000 simple frames. A hidden check deeper than that turns every recursive answer into a stack overflow, so the prompt must say recursion is out; checks that accept recursion stay far under it.
- A check can count what a solution reads: the rotated-search check puts its values behind a `Proxy` that counts index reads.
- `undefined` inside an expected value belongs in a hidden check only. Visible checks travel to the browser as JSON, which writes it as `null`.
- A product that can come out as 0 or -0 is a trap: `deepEqual` tells them apart with `Object.is`, and the results table prints 0 for both. Avoid zeros there, or make the prompt's method return the list's own values.
- QuickJS compares strings in `localeCompare` by code unit where the browser follows the locale. Ask for `<` and `>` on lower-cased strings, or for `sort()`'s default order, and hide ties long enough that an unstable comparator breaks in both engines.
- Each type test is one line appended to the answer, so two type tests that declare the same name collide. Give every type-test variable its own name.

**Async and timers.**

- The Node runner starts every call at once, so each async check builds its own loader, limiter or history inside its call.
- A check that rejects a promise on purpose marks it handled (`settled.catch(() => {})`). An unhandled rejection in a starter would end the Node content run.
- A React starter must not leave a timer or listener running after the suite unmounts it, or `npm run test:coding` never exits.
- A hidden case that watches timers filters by the delay the prompt names, so Testing Library's own waits never count, and patches both `globalThis` and `window`. `timersClearedOnUnmount` in `lib/coding/solutions/medium-hard-react-a.ts` builds that case.
- A check that a timer has not fired yet runs on `FAKE_CLOCK` (`lib/coding/tasks/easy-react-a.ts`), which moves `setTimeout`, `setInterval`, their clears and `Date.now` with `clock.tick(ms)` and fires each due timer inside `act()`. No real-time margin survives a busy machine. A check that a timer has fired, or that a cleared timer stays quiet, may use real timers.
- A React submission's whole command, jsdom and React included, has 10 seconds in production (`lib/coding/react-isolated.ts`), so prompts name short delays (a 100 ms debounce, 200 ms slides) and say a real app would wait longer.

**Browser details.**

- React empties `ref.current` on unmount, so a listener a hook leaves behind can stay quiet in a click test; watch the listeners on `document` and `window` instead.
- The workbench frame needs `allow-forms` beside `allow-scripts`, or a submit button submits nothing in the browser.
- An `<input type="email">` strips the spaces around its value, so a check cannot tell a solution that trims from one that does not.
- `lib/coding/react-runner.ts` logs an unhandled rejection while a suite runs, as the browser does, instead of ending the process.

**Ids.** Algorithms ids keep the `alg-` prefix, because `isCodingTaskId` and the garden paths accept no other for the track.

## What none of these change

None of the four formats awards XP, completes a level or opens anything. A puzzle pass is ordering evidence, an example is exploration, a comparison is reading, and a debugging task is an ordinary task graded by its tests. Progression comes from the graph in `shared/progression.ts` and from server-verified evidence.
