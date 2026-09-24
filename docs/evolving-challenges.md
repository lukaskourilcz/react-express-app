# Evolving challenges and Collection

Ten optional projects, each with five cumulative stages, are listed on Coding.
FullStack adds three applications with eight stages each, and the debugging
path adds one more project of its own (84 evolving stages in all).
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

## The debugging path

One JavaScript project in its own `debugging` category, listed on the Coding
home above the other projects. It is about the skill every other challenge
assumes: finding out what code actually does before changing it. Every stage
starts from the same café-orders program, which runs and is wrong in four
places; the fifth stage adds the input nobody planned for. The ten stages
follow the rhythm of Cathy Lai's "How I finally learnt to solve coding
interview questions" (the first stage's reference): verify the setup and
write the assumptions down; trace an example by hand and say the roadblock
out loud; validate the logic at its edges; write code in pieces with a
`console.log` between them; and treat the bug you did not plant as ordinary
work. Each stage is a `debug`-format task whose untouched starter fails its own
tests, with a method ladder (Hint, then three steps), hidden checks, and
reference, junior and senior solutions. Source: `lib/coding/tasks/evolving-debug.ts`
and `lib/coding/solutions/evolving-debug.ts`.

| Stage | The step it teaches | What is fixed or written |
| --- | --- | --- |
| 1 | Verify the setup; write the assumptions down | `parseOrder` trims and converts |
| 2 | Trace by hand; say the roadblock out loud | `summarize` keeps one total per item |
| 3 | Validate the logic at the edges | `applyDiscount`: inclusive threshold, whole-number percent, rounding |
| 4 | Write code in pieces, log between them | `trace` returns its value; `report` composes the pieces |
| 5 | Stay calm with the bug you did not plant | `safeReport` reports bad lines instead of throwing |

## The Custom category

Two short JavaScript paths in their own `custom` category, listed first on the
Coding home. They cover the foundations for an algorithm screening interview.
Each path has ten steps: a checkpoint (about 5 minutes) that adds one small
function, then a milestone (about 10 minutes) that builds on it. Every step
keeps the earlier functions and their checks, so the whole category fits into
about two and a half hours. The copy is English only, with empty Czech fields.
Source: `lib/coding/tasks/evolving-custom.ts` and
`lib/coding/solutions/evolving-custom.ts`.

| Stage | Map and Set basics (`js-custom-mapset`) | Objects and grouping (`js-custom-catalog`) |
| --- | --- | --- |
| 1 | `unique`, then `common` | `countByCategory`, then `groupByCategory` |
| 2 | `countAll`, then `mostCommon` | `totalRuns`, then `summarize` |
| 3 | `firstRepeat`, then `twoSum` | `sortActors`, then `topPerCategory` |
| 4 | `countsToPairs`, then `topK` | `indexById`, then `diffCatalog` |
| 5 | `firstUnique`, then `groupAnagrams` | `linksToGraph`, then `crawlOrder` (BFS) |

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
