# Evolving challenges and Collection

Ten optional projects of ten stages each (five checkpoints and five
milestones) are listed on the Coding home. FullStack adds three
twelve-stage applications. Twelve short paths of five levels each are listed
on the pages of the sections they belong to; see [Short paths](#short-paths).
Three more short paths, the debugging paths, sit on the Coding home above the
projects; see [The debugging paths](#the-debugging-paths).
Each stage has an individual EN/CS brief, targeted official reference links,
and a collapsed list of the prior requirements, drawn smaller and lighter and
numbered by the stage that set them. Tests are cumulative, and each stage
lists its own checks first: the top rows of Results show what the brief just
asked for — the call that goes in and the value that should come out — and
every earlier stage's checks follow, unchanged. Results shows every check
before the first run, with no verdict, so the expected inputs and outputs are
visible from the start; lists longer than eight rows scroll inside their box.
The existing task catalog, browser runners, server graders and hint/reveal
controls handle all stages. JavaScript/TypeScript have hidden edge cases;
TypeScript also has positive and negative compiler assertions. React uses the
existing server Testing Library harness, never a client-supplied pass.

| Track | Project | Stage 1 → Stage 2 → Stage 3 |
| --- | --- | --- |
| JavaScript | Expression engine | Sums → precedence → recursive parsing and invalid input |
| JavaScript | Query pipeline | Filtering → sorting/pagination → projection and distinct records |
| JavaScript | Event bus | Ordered dispatch → unsubscribe/once → reentrancy and fault isolation |
| JavaScript | Dependency planner | DFS order → invalid graphs → parallel execution layers |
| TypeScript | Result pipeline | Typed map → flatMap/errors → fail-fast traversal |
| TypeScript | Typed state store | Generic state → subscriptions → undo/redo history |
| TypeScript | Schema validator | Primitives → recursive objects → arrays/optional/path errors |
| React | Task board | Add/toggle → filter/delete → immutable undo/redo |
| React | Product explorer | Search → sort/page → cross-page selection |
| React | Form wizard | Email validation → reversible steps → consent/submission/reset |

Stages four and five extend each existing project:

| Project | Stage 4 | Stage 5 |
| --- | --- | --- |
| Expression engine | Named variables | Ordered assignment programs |
| Query pipeline | Group aggregation | Stable inner/left joins |
| Event bus | Pause/resume FIFO dispatch | Bounded event replay |
| Dependency planner | Weighted critical path | Incremental rebuild impact |
| Result pipeline | Success/error partition | Recovery and lazy sequences |
| Typed state store | Derived subscriptions/disposal | Atomic transactions/rollback |
| Schema validator | Dynamic record validation | Union branches and tuples |
| Task board | Undoable bulk actions | Stable-ID reordering/history |
| Product explorer | Price facets | Quantities and cart totals |
| Form wizard | Conditional business branch | Validated persistent drafts |

## FullStack

Team task planner, Stockroom manager and Workshop booking each use eight stages:
JavaScript input validation; TypeScript models and immutable transitions;
typed GET/POST API; version-checked PATCH/DELETE; React fetch/loading/retry;
creation form; domain action with conflict recovery; filtered pagination/deletion.
Hours logged, stock sold and seats booked all use server-side non-negative
quantity validation and optimistic concurrency.

The category is separate from the grader track. Stage 1 uses JavaScript,
2–4 use the TypeScript runtime/compiler grader, and 5–8 use the TSX-capable
React behavioral grader. The latter transpiles types; it does not claim a full
React TypeScript compiler check. Links resolve the actual stage track.

The learner writes the API handler and React code. `./localFetch` is a shared,
network-free transport that calls that handler and serializes responses. It
contains no API answers. The default preview runs against the learner's API;
tests also inject it, including modified state, failures and version conflicts.
These are local full-stack exercises, not deployed servers, production auth,
databases, or external-network sandboxes. API data resets per mounted app;
the learner's code and stage completion are saved to their account.

The first React stage appends an empty React scaffold to the preceding typed
API draft; it does not replace the API with a reference solution. Existing
stage drafts always take priority. Legacy stage IDs 1–3 remain unchanged.

## The debugging paths

Three JavaScript paths of five levels in the `debugging` category, listed on
the Coding home above the projects (#225). They teach the skill the other
challenges take for granted: seeing what code does before you change it,
with the console as the tool. Each path is one file of five functions that
already run and are wrong in one way each. Every level repairs one function,
and the checks of the earlier levels run again, as in the other short paths.
The copy is English only, with empty Czech fields.

Every level is a `debug`-format task. Its hint ladder opens with a hint that
names the console technique, then three method steps, then a documentation
link (the level's first reference) before the solution. Each level has
visible and hidden checks and a reference, junior and senior solution. The
reference repairs that level and every earlier one and leaves the later
functions as the starter has them, so a revealed solution never hands over a
later level's answer. `npm run test:coding` proves all three solutions,
rejects each untouched starter, and checks that the code a level starts from
(the starter for level 1, the previous level's reference after that) runs and
fails that level's own checks. Sources: `lib/coding/tasks/paths-debugging.ts`
and `lib/coding/solutions/paths-debugging.ts`.

| Path | Label | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Log it right (`js-path-logging`) | Easy | `basketSummary`: bare logs say nothing; `console.log({ lines, units })` names them | `cheapest`: the index beside the value, then `console.table` | `priceHistory`: an array shared by reference; snapshot with `structuredClone` | `checkout`: `console.group`, `console.count` and `console.time` find `addPoints` called twice | write `debug(label, value)`, which logs and returns; wrap the logs in `bestSeller` with it and fix the sort |
| Trace the state (`js-path-tracing`) | Medium | `weeklyTotals`: a range loop that stops a week early | `makeReminders`: a stale `var` in a loop of callbacks | `largestExpenses`: `sort` reorders the caller's list | `loadReceipts`: `forEach` with async callbacks, then `Promise.all` against `await` in a loop | `withTip`: text from a form glued by `+` turns into `NaN` two calls later |
| Edges and inputs (`js-path-edges`) | Medium, level 5 Hard | `orderTotal`: `reduce` with no start value | `profileLine`: `?.` and `??` in the right places | `stockStatus`: `==` turns a blank field into `0`; `"0"` is truthy | `splitBill`: money in whole cents | `ordersPerDay`: the UTC day of an ISO timestamp with an offset |

The labels are authored per level (`difficulties` in the path's spec),
because the five-level position band would call two levels of Log it right
Medium and a level of Trace the state Hard. Every stage is tier 2, where an
authored Hard is refused, so Edges and inputs authors Medium for levels 1 to
4 and lets level 5 keep its position label, Hard.

The console these levels teach exists in both runners. `shared/coding-console.ts`
holds one source for `log`, `info`, `debug`, `warn`, `error`, `dir`, `trace`,
`assert`, `table`, `group`, `groupCollapsed`, `groupEnd`, `count`,
`countReset`, `time`, `timeLog` and `timeEnd`; the browser worker behind Run
and the QuickJS sandbox behind Submit both build their `console` from it, and
the content contract checks that they print the same lines. `console.table`
draws rows under their index, and a group indents what it holds. The sandbox's
clock is virtual, so `console.time` there reads 0ms for synchronous work.
The hidden check on Log it right level 5 swaps the console's printing methods
for recorders inside the call, so it can assert both halves of the helper's
job: one printed line that names the label and shows the value, and the value
handed back. `console.log(label, value)` and `console.log({ [label]: value })`
both pass it.

### The retired café-orders project

The debugging path of 2026-09-18 (`js-evolving-debug`, ten stages around one
café-orders program) is marked `unlisted` in `shared/evolving.ts`: no list
shows it, and nothing else changes. Its ten stages stay in the catalogue and
the browser index, open from an old link, unlock in order, grade on the
server and keep their drafts and passes, and a saved stage still appears in
Collection. Its tasks and solutions stay in `lib/coding/tasks/evolving-debug.ts`
and `lib/coding/solutions/evolving-debug.ts`. The four standalone repair tasks
(`js-debug-*`) stay on the JavaScript page.

## Short paths

Twelve paths of five levels each, with no checkpoints: every level adds one
function or feature to the same code, and the checks of every earlier level
run again. `shared/evolving.ts` marks them `short`; level ids are
`<path id>-1` to `<path id>-5`. They are listed on their section's own page,
between the section header and its challenge list (the FullStack one leads
the FullStack screen), not on the Coding home, and the UI counts them in
levels ("Level 2 of 5") rather than stages. They replace the Custom
category of 2026-09-24, whose two ten-step paths were split into the first,
second, fourth and fifth JavaScript paths below. The copy is English only,
with empty Czech fields. Each level has a hint, method steps, visible and
hidden checks, references, and reference, junior and senior solutions that
`npm run test:coding` proves. Sources: `lib/coding/tasks/paths-*.ts` and
`lib/coding/solutions/paths-*.ts`.

| Section | Path | Levels 1 → 5 |
| --- | --- | --- |
| JavaScript | Map basics | `countAll` → `mostCommon` → `twoSum` → `topK` → `groupAnagrams` |
| JavaScript | Set basics | `unique` → `common` → `difference` → `firstRepeat` → `duplicates` |
| JavaScript | Map and Set together | `countWords` with stop words → `tagsByUser` (Map of Sets) → `isIsomorphic` → `buildIndex` (inverted index) → `search` |
| JavaScript | Objects and grouping | `countByCategory` → `groupByCategory` → `summarize` → `sortActors` → `topPerCategory` |
| JavaScript | Lookups and crawling | `indexById` → `diffCatalog` → `linksToGraph` → `crawlOrder` (BFS) → `crawlDepths` |
| TypeScript | Generic collection helpers | `groupBy` → `countBy` → `uniqueBy` → `partition` with a type predicate → multi-key `sortBy` |
| TypeScript | Unions and narrowing | `area` over a discriminated union → `perimeter` with `assertNever` → `parseAmount` (`typeof`) → `isShape` guard for `unknown` → `totalArea` |
| React | State and lists | Guest list: add → count and remove → arrived checkboxes → derived filter → duplicate check |
| React | Effects and loading | Load in an effect → error and retry → derived search → loader dependency with a stale-answer guard → tab title kept in step and restored |
| Algorithms | Two pointers and windows | `pairWithSum` → `removeDuplicates` in place → `isSubsequence` → `minWindowSum` → `longestOnes` with k flips |
| Algorithms | Stacks and queues | `simplifyPath` → `evalRPN` → `nextGreater` (monotonic stack) → `decodeString` → `slidingMax` (deque) |
| FullStack | Link shortener | `normalizeLink` (JS) → typed API with GET/POST, 400/409/404 (TS) → visit and DELETE routes (TS) → React list, loading, retry, visits → create form with 409/400 handling |

The Algorithms paths ask problems the section's single challenges do not,
and each level shows about ten checks. The Link shortener follows the
FullStack rules above: level 1 is graded as JavaScript, 2 and 3 by the
TypeScript compiler and runtime, and 4 and 5 by the React suite, whose
prelude re-runs every API check. Its first React level appends its own
scaffold (`LINKS_REACT_SCAFFOLD`), which exports `normalizeLink` and
`createApi`.

## Difficulty

Each stage and level carries Easy, Medium or Hard, and a task page's stage
list sets its numbered stages under those labels. Every stage is tier 2, so
the label comes from the stage's position (`stageDifficulty` in
`shared/coding-catalog.ts`):

| Path | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Five-level short path | 1–2 | 3–4 | 5 |
| Ten-stage project, the retired café-orders project included | 1–3 | 4–7 | 8–10 |
| Twelve-stage FullStack app | 1–4 | 5–9 | 10–12 |

The label unlocks nothing and pays nothing: stages still open in order and earn
the tier-2 first-pass XP. A stage may carry an authored `difficulty` like any
task, and `npm run test:coding` refuses one its tier does not allow, and any
path length without a band. The debugging paths are the ones that author
their labels; see [The debugging paths](#the-debugging-paths). The rule for standalone tasks is in
[the interactive-content manifest](interactive-content-manifest.md#5-difficulty-labels-224).

## Playground layout

The task description spans the full width above the playground. Editor and
results share one stretched grid row and scroll together with the page; the
results panel is never sticky over the action bar. Hints start closed on each
visit and are revealed only through Hint/Next hint, ignoring old saved counts.

Run/Submit/Format/Reset and Hint/Next hint/Solution/Skip share a compact bottom
action bar spanning the playground width. The save star and the report flag
remain right-aligned; there is no focus mode. Revealed hints form an ordered
list after the controls. The editor's desktop minimum height is 480px. Common
learning controls remain reachable for narrow/puzzle layouts. The keyboard
guide draws real keycaps, each with the key's glyph and printed name.
Stage-specific references are part of the existing Resources tab, alongside
technique documentation. Hint labels are "Hint" before the first reveal and
"Next hint" afterwards. When Hint or Solution is unavailable the button stays
focusable and an Astryx tooltip says why (a minute of editing or one failed
run opens hints; the solution opens after half the ladder); nothing is
explained in a helper sentence under the toolbar.

A verified pass opens a Solution tab beside Resources with two more ways to
write the task, labelled juniorDev and seniorDev. Every graded code task
carries both on the server, proven against its visible and hidden checks by
`npm run test:coding`, and they travel only with a passing verdict or, on a
return visit, with a recorded pass.

`generateFinHover` generates a stable per-button fin profile: shade, size,
direction, speed, position and swim/rise/dive/fade/diagonal entrance. Coding
controls and Continue CTAs share this implementation. Mouse hover and keyboard
focus trigger the same decoration, with no movement under reduced motion.

`shared/evolving.ts` owns ordered stage IDs and resume/unlock calculations.
Each stage reuses `coding_progress` and `coding_drafts`, so no new table or
migration is required. Stage issuance checks all preceding server-recorded
passes and submission rechecks prerequisites. Reveals and skips do not advance
the sequence. Signed-out visitors can try stage one; account progress requires
sign-in. A next stage without its own draft starts from the previous stage's
saved code. Submitting persists the exact code before recording a stage pass.
Earlier stages remain revisitable. Each stage earns existing first-pass XP
once through the idempotent grading routine.

Projects are optional: they do not enter Learn quotas, ordinary tier-unlock
denominators, skip suggestions or short practice queues. The final stage is
complete when passed, not when its reference solution is revealed. Cumulative
tests ensure new work cannot discard earlier requirements.

Collection replaces Cards in navigation. `/collection` has Questions and Coding
challenges (devShark only). Shark Cards is no longer a Collection tab. It reuses
account flashcards and coding bookmarks, preserving saved data. `/cards`
continues to open the question deck for compatibility. Coding saves are also
available inside the task. Unavailable saved challenges can still be removed.

Coding review is disabled at the application boundary for old and new accounts:
progress responses contain `nextReviewAt: null` and `due: []`, and practice
selection ignores the legacy scheduling columns. Those columns and the old
SQL routine remain for backward compatibility; their timestamps are inert and
do not schedule any application behavior. Existing passes and XP are retained.
Question/concept spaced practice is unchanged.

Verification: `npm run test:coding` proves all reference solutions, rejects
untouched starters, checks EN/CS parity and answer-free payloads, and asserts
stable stage IDs, sequential unlocks, resume positions and cumulative tests.

Release verification is recorded in `docs/release-acceptance.md`. Live
cross-device persistence and visual layouts require authenticated browser
acceptance; unit/content checks do not establish that acceptance.

Stage handoff retains the exact submitted code in the local draft after a pass
and after successful autosaves. A stage's own local or account draft takes
priority; otherwise the prior stage's local code backs up the server's existing
carry-forward path. The first FullStack React stage appends its scaffold to the
API implementation. Inactive task responses are discarded so a previously
visited stage cannot mount an obsolete starter while its draft refreshes.
