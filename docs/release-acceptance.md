# Release acceptance matrix

## Puzzle sprint — 2026-09-16

The three-minute mode from [#195](https://github.com/lukaskourilcz/react-express-app/issues/195),
on `/sprint` for chessShark and mathShark. It adds no physical handler: the run
token carries `mode: 'sprint'` and the endpoints are `resource=sprint`,
`resource=sprint-board` and `resource=sprint-complete` on
`api/quiz/challenge.ts`.

| Check | Result |
|---|---|
| `npm run typecheck:api` | PASS |
| `npm run test:launch` | PASS — includes the new sprint block: the combo curve pays at exactly 5/12/20/30, a wrong answer costs ten seconds and empties the combo, an answer graded after the deadline is dropped, a repeated proof is one answer, the replayed score is clamped, and each mode refuses the other's run token |
| `npm run test:client` | PASS — 11 files, 72 tests, including four new sprint tests (board, board-not-migrated, board retry, and a full run scored from the server) |
| `npm run test:grading-integrity` | PASS — 11 checks |
| `npm run check:security` | PASS |
| `npm run check:unused` | PASS — no new findings |
| `git diff --check` | PASS |
| `npm run check:responsive -- --routes /sprint` | NOT RUN — no Chrome/Chromium binary in this container. `/sprint` was added to `DEFAULT_ROUTES` so the next sweep covers it |
| Signed-in run: XP banked once, board row written | NOT RUN — no Supabase project is reachable here; needs a preview deployment |

Migration `supabase/supabase-schema-042.sql` is committed and not applied. Until
it is, the sprint runs and scores normally, the sprint board answers
`migration_required`, and the proof-completeness check degrades to accepting the
proofs it was handed — the same limitation the classic run has always had.

## Challenge launch audit — 2026-09-15

Status: **not yet approved for production launch**. The fixes in
[PR #192](https://github.com/lukaskourilcz/react-express-app/pull/192) were merged
to main as `541941e`, with the devShark production deployment READY.
All 13 evolving/full-stack projects now contain 136 smaller cumulative stages;
existing completion and drafts are retained. React restart/submit/results,
QuickJS expectations, account-bound sessions and accessible workbench controls
were repaired. Server React execution now uses disposable isolated VMs.

| Check | Result |
|---|---|
| Catalogue references, including actual QuickJS | PASS — 385 tasks |
| Built React iframe suites/protocol | PASS — 129 assertions |
| Client regressions and all-project draft transitions | PASS — 42 tests |
| devShark browser flow, EN/CS and light/dark | PASS — 9 checks |
| StudyShark public browser coverage | PASS — 5 checks |
| Responsive layout | PASS — 93 local StudyShark + 63 devShark dark/CS probes; production sweep and settled recheck recorded in report |
| Types, launch contracts, learning paths, public HTML, bundle budget | PASS |
| Full GitHub CI for both products, including browser/component/performance checks | PASS — `a0e332a`, run 35025211720 |
| Production dependency audits | PASS — zero vulnerabilities |
| Live database idempotency, retained pass, isolated drafts | PASS — synthetic transaction rolled back |
| Real isolated VM forms, storage, network/credential isolation, loop termination | PASS — 6 integration checks |
| Deployed API submissions (first stage of every project) | PASS — 13/13 on `a0e332a`, including the OIDC-backed React VM runner |
| Two-account API/browser flow, permissions, draft separation and deletion | PASS — disposable users; multiplayer/Classroom completed, reconnect/reload recovered |
| Bounded React concurrency | PASS — 10/10 at maximum concurrency 3; p50 5.767 s, p95/max 14.933 s; launch-capacity acceptance still OPEN |
| Recovery | OPEN — RPO 24h/RTO 1h accepted; latest observed backup ~19h old; restore credential handoff pending |
| Alert delivery and physical-device acceptance | NOT RUN — #190 |
| Hostile submission verdict integrity | QuickJS regression PASS; React OPEN — #191; VM isolation alone does not resolve this |

The mobile workbench still requires a larger screen for editing, as before.
See the [hardening follow-up](./launch-hardening-2026-09-16.md) and [full audit](./launch-audit-2026-09-15.md)
for exact scope, live-account changes, preview evidence and outstanding gates,
and [operations](./react-grading-operations.md) for snapshot maintenance.

## Keyboard shortcut keycaps — 2026-09-15

The right-aligned shortcut guide uses inline SVG keycaps for Control, Enter,
Shift, Escape and Tab. Run and Submit chords share the first row; Escape then
Tab occupies the second row. The SVGs are decorative and the group exposes the
complete existing EN/CS instruction to assistive technology. The exit label is
localized in both dictionaries. No keyboard handlers changed.

Production build, API types, launch contracts, nine workbench tests, both
production dependency audits (zero vulnerabilities), and diff checks passed.
Responsive checking remains blocked by missing Chrome/Chromium; live visual
verification remains outstanding.

## Compact failure feedback — 2026-09-15

Automatic failure feedback (including “Nothing came back”) now sits below the
verdict at the bottom of the Results board, visible only on the Results tab.
The compact treatment uses 0.8rem type, 8px/10px padding, tight line spacing,
and a sentence-case label. Explicitly requested hints remain below the toolbar.
EN/CS text and the accessible status announcement are retained. Commands use
a fixed 12px gap with no space-between distribution. The toolbar no longer
shows the solution hint-count availability message.

Production build, nine workbench tests, API types, launch contracts, both production dependency
audits (zero vulnerabilities), and diff checks passed. Local responsive checking
could not run without Chrome/Chromium; live visual verification is outstanding.

## Workbench command spacing and guidance — 2026-09-15

Desktop commands share one left-aligned row, including Focus and Report.
The command column receives at least two thirds of the available row width
with larger gaps; contextual hint guidance and keyboard instructions occupy
the right-aligned text column. Narrow layouts wrap controls to avoid overflow.
Existing EN/CS guidance and hint accessibility relationships are retained.

Production build, API/tooling types, launch contracts, 15 targeted client tests, diff checks, and both
production dependency audits passed (zero vulnerabilities). Responsive checking
is blocked by missing Chrome/Chromium; narrow/zoom/light/dark visual acceptance
has not been established for this spacing change.

## Evolving stage code handoff — 2026-09-15

The workbench sends the exact submitted snapshot to the route. Evolving drafts
remain available locally after saving/passing, and the next stage falls back to
the previous local draft if the server has no draft. Existing next-stage local
and account drafts retain priority. Inactive task cache entries are discarded
rather than initializing the editor from a stale response.

Six route regression checks cover JS/TS/React advancement, successful autosave,
next-stage cache eviction, preservation of existing local/account drafts, and
the FullStack API-to-React scaffold transition. These and nine workbench checks
passed (15 tests). Production build, API/tooling types, launch contracts and both production
dependency audits and diff checks passed (zero vulnerabilities). Responsive checking could not
run because Chrome/Chromium is unavailable. Authenticated live cross-device
advancement has not been verified. No layout, translations, schema or grading
rules changed.

## Workbench layout, hints and calculator feedback repair — 2026-09-15

The full-width brief now precedes a shared editor/results grid row. Both panes
stretch to the same height and scroll with the page. Removing sticky positioning
prevents results from overlaying the controls; explicitly hidden panes remain
hidden despite the flex display rule. Hints start at zero on every mount rather
than restoring old localStorage counts. Regression checks verify closed hints,
one-click reveal, reset, and sibling editor/results placement.

The reported stage-1 hidden check requires a valid sum without spaces. The
prompt already allows optional whitespace. Two labeled visible tests now cover
unspaced and mixed-spacing input, and hidden-check failures have EN/CS explanatory
text. Server sandbox regressions prove that valid addition passes all visible
and hidden cases while space-dependent tokenization fails publicly.

Production build, API and tooling types, launch contracts, 18 client tests,
all 323 task content/reference-solution contracts, both production dependency
audits (zero vulnerabilities), and diff checks passed. Local responsive checking
remains blocked by missing Chrome/Chromium.

Production verification confirmed the repaired calculator passes 6/6 visible
and 1/1 hidden checks on the server. Browser geometry confirmed equal-height
editor/results panes, controls below both, no horizontal overflow and zero
revealed hints on entry. CI's unused-code gate found the two orphaned Shark
Cards client files from the earlier removal; removing them restores both the
unused-code and security gates without changing the application bundle.

## Activity-only application scrollbars — 2026-09-15

Native scrollbar tracks and idle thumbs are transparent across the app. A
single delegated listener set reveals the nearest scrollable container during
pointer movement, scrolling or scrolling-key input, then hides its thumb after
1.1 seconds idle. Dragging keeps it visible. The implementation batches pointer
work with requestAnimationFrame and disposes listeners/timers during hot reload.
Chromium/WebKit use 4px bars; Firefox uses native thin bars. High-contrast mode
keeps a visible thumb, and reduced-motion mode removes its color transition.
Coding and roadmap-specific scrollbar overrides were removed.

Production build, API typecheck, launch contracts, both production dependency
audits (zero vulnerabilities), and diff checks passed. Local responsive
verification remains blocked by missing Chrome/Chromium.

## Waterline variation and themed scrolling — 2026-09-15

The evolving list uses a thin rounded scrollbar with shared surface, text and
brand tokens, including WebKit styling. `generateWaterline()` varies wavelength,
amplitude, direction, phase and speed once per mounted component. Coding track
waves opt into zero, one or two decorative fins, with separated positions,
varied sizes, opacity and gentle movement that stays in the water. Progress
fill remains accurate and its clip no longer drifts with the wave. Quiz and
typing retain their endpoint markers.

Hover fins never start above the button. Dives now move diagonally downward;
all vertical offsets stay at or below the bottom baseline. Reduced-motion
rules continue to freeze the decorative movement.

Production build, API typecheck, launch contracts, 18 client tests, both
production dependency audits (zero vulnerabilities) and diff checks passed.
Local responsive verification is blocked by missing Chrome/Chromium.

## Five-row evolving challenge list — 2026-09-15

Lists longer than five projects now scroll internally. A ResizeObserver measures
the first five rows so the viewport follows translated text, zoom, font loading
and narrow layouts. The named region is keyboard-focusable with a visible focus
ring; native scrolling also brings tabbed Continue buttons into view. Shorter
lists, including the three FullStack projects, retain their natural height.

Production build, API typecheck, launch contracts, both production dependency
audits (zero vulnerabilities), and diff checks passed. The local responsive
command remains blocked by missing Chrome/Chromium.

## Coding discovery and production hover fix — 2026-09-15

The live Continue button reproduced `:hover = true` with fin opacity still zero.
PurgeCSS removed its compound activation selector despite the class safelist.
Flat hover/focus selectors and a narrowly scoped safelist retain it; the production build
fails if a fin stylesheet loses its hover activation rule. Swimming fins stop
inside the button instead of exiting its clipped area.

Coding discovery now uses a featured next challenge, a compact track directory,
numbered evolving-project rows with stage meters, a distinct FullStack feature,
and divided technique lists. EN/CS copy stays paired. Mobbin references reviewed:
[Coursera resume hierarchy](https://mobbin.com/screens/18683325-d982-4756-b06e-4ed52c933b06),
[Codecademy skills density](https://mobbin.com/screens/597bbefb-e6cf-401c-abc6-47789b29e5b7),
and [Uxcel learning hierarchy](https://mobbin.com/screens/519c99ca-f49e-4509-b6db-57a74154d859).
These informed layout only; no external artwork was copied.

Production build (including the hover-retention gate), API typecheck, launch contracts, 18 client tests and both production dependency
audits passed (zero vulnerabilities). Local responsive execution remains
blocked by missing Chrome/Chromium.

The initial CI run exposed existing test-only TypeScript errors in coding-actions:
missing `initialCode` props and unsupported `exact` options on RTL role queries.
The follow-up supplies null drafts and uses RTL's default exact name matching.
Tooling typecheck and all 18 client tests pass after this correction.

## Coding controls and randomized fins — 2026-09-15

Stage links now appear in Resources. The compact, full-width action bar uses
Hint / Next hint, Solution and Focus labels in both locales. Collection no
longer exposes Shark Cards. Shared `generateFinHover`, `FinButton` and `SwimCta`
assign stable random fin motion, shade, size, direction and speed, with keyboard
focus support and static reduced-motion decoration.

Verified: API typecheck, launch contracts, 18 client tests, production build,
both production dependency audits (zero vulnerabilities), and diff whitespace
checks. The live homepage's fade and swim effects were inspected in a remote
browser as the animation reference. Local responsive verification remains
blocked by missing Chrome/Chromium; the changed UI has not been visually
verified in a local browser.

## Evolving / FullStack update — 2026-09-15

This update expands the original ten projects to five stages each and adds
three eight-stage FullStack apps at `/coding/fullstack`. All 74 stages have
individual EN/CS descriptions and targeted references. Prior requirements
remain available; legacy IDs and saved progress are preserved. Help controls
move below the 480px-minimum desktop editor, with an ordered revealed-hint list.

| Gate | Result |
| --- | --- |
| API TypeScript check | Pass |
| Production app and isolated sandbox builds | Pass |
| Launch contracts | Pass, including twelve API handlers and answer isolation |
| Coding content contract | Pass: 323 reference solutions; starters rejected; cumulative stage checks; EN/CS parity; answer-free payloads |
| Client tests | Pass: 16 tests, including toolbar placement, hint/reset state, TSX formatting and FullStack draft/track transitions |
| Unused-code regression check | Pass: no new findings |
| Both production dependency audits | Pass: zero vulnerabilities |
| Whitespace validation | Pass |
| Responsive/visual browser sweep | Blocked: `check:responsive` exits because no Chrome/Chromium binary is installed |
| Authenticated cross-device draft/completion acceptance | Not run: local tests prove transition logic, not live account synchronization |

FullStack API requests execute the learner's own handler through the shared
network-free adapter. This is an in-memory teaching environment, not a deployed
backend or a production-auth/database exercise. TypeScript stages 2–4 are
compiler-checked; React stages transpile TSX and test API/UI behavior. No new
tables, migrations, database permissions or external network access were added.
React review preserved semantic controls, accessible names, effect cleanup,
stable IDs, derived view state and narrow-layout access to learning actions.

## Earlier modernization acceptance

What was verified for the modernization epic, what was not, and why. Every row
is pass, fail or **not run** — never "should be fine". A row that could not be
checked in this environment says so and names what would check it.

Recorded on 2026-09-08 against `ccee58b`, and extended on 2026-09-09 after a
full code, design, content and architecture review. Both commits are on `main`.

## Repository gates

| Gate | Result |
| --- | --- |
| `npm run typecheck:api` | **Pass** — clean |
| `cd client && npx tsc -b` | **Pass** — clean |
| `npm run test:launch` | **Pass** — product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, the twelve-handler budget, the progression graph, failure hints, retired sections, curation claims, spaced practice, interleaving, lesson figures, and an unconfigured shop |
| `npm run test:coding` | **Pass** — 249 tasks (javascript 97, typescript 42, react 65, system-design 45), solutions proven, payloads answer-free |
| `npm run test:paths` | **Pass** — dsa-foundations v1 (10 modules, 18 lessons, 36+10 checks, 30 exercises); fde v1 (11 modules, 20 lessons, 40 checks, 17 exercises, 3 artifacts) |
| `npm run build` | **Pass** |
| `npm audit --omit=dev` (root) | **Pass** — 0 vulnerabilities |
| `npm audit --omit=dev --prefix client` | **Pass** — 0 vulnerabilities |
| `git diff --check` | **Pass** — clean |
| `npm run test:harness` | **Pass** — 23 assertions against the built sandbox in Chromium (needs `CHROME_BIN`; it skips itself silently without one) |
| `npm run check:responsive` | **Pass** — see below |
| `npm audit --omit=dev` (both, re-run 2026-09-09) | **Pass** — 0 vulnerabilities |

## Responsive sweep

The sweep renders each route at seven widths (360, 390, 430, 768, 1024, 1280,
1440) against a local `vite preview` build and reports horizontal overflow and
child boxes escaping their parents.

Run over the routes this change touched — `/`, `/quiz`, `/learn`, `/today`,
`/curation`, a coding task and a DSA module — at all seven widths in
light/English: **49 probes, 0 with issues.** No horizontal overflow, no child
escaping its parent, nothing under the ocean footer. The wider default sweep of
all thirty routes exceeds this container's per-command time budget at roughly
thirty seconds a probe; the earlier full-set results are in
`docs/DEEP_END_HANDOFF.md`.

A second pass in **dark theme and Czech** over the four surfaces this change
added or altered (`/`, `/learn`, `/today`, `/curation`) reached **18 probes with
zero issues** — every one of the four at 360, 390, 430 and 768, plus two at
1024 — before it was stopped for time. The three desktop widths are therefore
covered in light/English and not in dark/Czech for these routes; the earlier
full-set dark/Czech results are in `docs/DEEP_END_HANDOFF.md`. Recorded as
partial rather than rounded up.

**Its limit, stated plainly: it renders signed out.** Every graded workspace,
the coding editor beside its brief, the trace player and the review session are
therefore probed as the guest preview, not as the thing a signed-in learner
sees. Confirming those is an owner check, and it is in `NEEDED.md` rather than
counted here.

`/today` and `/curation` were added to the default route list in this change,
because Today gained a review-due card and `/curation` is a new page.

## Epic children

Every row below is implemented and covered by the repository gates above unless
its note says otherwise.

| # | What it delivers | State |
| --- | --- | --- |
| 151 | Versioned learner profile, required at onboarding and editable in Profile | Implemented |
| 152 | One server-side progression graph; start and submit refuse a locked step | Implemented; asserted by `test:launch` |
| 153 | Only eligible paths shown; Roadmap, Today and navigation tailored | Implemented |
| 154 | Code-ordering puzzles for mobile and tablet | Implemented; accepted orders stay server-side |
| 155 | Task resources before hints | Implemented; asserted by `test:launch` |
| 156 | Authored failure hints that name no input or expected value | Implemented; asserted by `test:launch` |
| 157 | Bookmarks and named collections | Implemented (migration 027) |
| 158 | Curated approaches after a verified pass | Implemented |
| 159 | Short practice sessions from time, topic and plan | Implemented |
| 160 | Skip reasons and next steps, no mastery awarded | Implemented |
| 161 | Search and combined filters over eligible challenges | Implemented |
| 162 | Tiny interactive examples in lessons | Implemented (trace player) |
| 163 | Debugging as a discoverable format | Implemented; four authored tasks |
| 164 | Focused, resizable, accessible workspace | Implemented |
| 165 | System Design out of Coding, kept in Learn and FDE | Implemented; asserted by `test:launch` |
| 166 | Sibling-platform promotion off the devShark footer | Implemented; asserted by `test:launch` |
| 167–173 | Merchandise, wallet, orders, payment, fulfilment, crown | Implemented; **commerce ships disabled** — see below |
| 175 | Eight waterline variants with stable per-component selection | Implemented |
| 177 | Abbreviations retired; contextual term help | Implemented; asserted by `test:launch` |
| 178 | Code Snippets retired; snippet format across topics | Implemented; declared metadata now reaches delivery |
| 179 | Testing retired; foundations into General | Implemented; asserted by `test:launch` |
| 180 | HTML condensed to six levels, CSS refocused | Implemented; 96 authored questions |
| 181 | Curation methodology and evidence-bound review claims | Implemented; asserted by `test:launch` |
| 182 | Interleaving of related concepts | Implemented; asserted by `test:launch` |
| 183 | Worked examples and diagrams in Learn lessons | Implemented; asserted by `test:launch` |
| 184 | Spaced practice at concept level | Implemented (migration 030); asserted by `test:launch` |

### FDE (#128) and DSA (#129)

| # | What it delivers | State |
| --- | --- | --- |
| 130 | Shared versioned path contracts | Implemented (`shared/learning-paths.ts`, `shared/learning-path-api.ts`) |
| 131 | Enrollment, attempts, evidence, drafts, progress storage | Implemented (migration 026) |
| 132 | Guarded path APIs inside existing handlers | Implemented; no new physical handler |
| 133 | Graders adapted for path-bound exercises | Implemented; `test:paths` proves every solution |
| 134 | Two-step track and optional FDE selection, safe account sync | Implemented |
| 135 | Overview, module workspace, resumable progress | Implemented |
| 136 | Diagnostics and track-specific bridges | Implemented; advisory only |
| 137–139 | FDE M01–M10 and the staged capstone | Implemented; 20 lessons, 40 checks, 17 exercises, 3 artifacts |
| 140 | Progress in Today and Profile | Implemented |
| 141 | Readiness, reports, privacy-conscious metrics | Implemented (`/dev` → Learning paths) |
| 142 | Positioning and EN/CS UX | Implemented |
| 144, 146–148 | DSA entry plus the ten modules through trees and the assessment | Implemented; 18 lessons, 46 checks, 30 exercises |

## What is deliberately not enabled

**Commerce ships off.** The shop is unconfigured by default: no price is
invented, an incomplete quote is dropped on read, `testMode` defaults on, and
payment is only ever applied through a signed webhook. `test:launch` asserts the
unconfigured state, so a partial configuration cannot quietly start selling.
Free learning does not wait on any of it — the two rollouts are independent, and
nothing in the learning path, the practice session or the reward ladder consults
the shop.

**Learning-path features are behind their own switches.**
`LEARNING_PATH_DSA_ENABLED` and `LEARNING_PATH_FDE_ENABLED` are independent, and
the API refuses both outside the `webdev` scope regardless of the variable.

**The item-level content audit has run over the whole question bank.** All
2,128 served devShark questions have been read twice, rewritten or retired,
translated from the final English, and recorded in the ledger. All sixteen
categories are complete, so the gate withholds any item without a current
passing record rather than serving it with no claim: 1,974 are served on a
recorded review, 152 are retired and 2 quarantined. The 319 items in the
retired sections have each been read once; the unreferenced banks and the
legacy core bank have no delivery path and get a bank-level disposition
instead. The review is model-performed with recorded evidence and the product
says so rather than calling it a human review.
`docs/audit/devshark-content-audit.md` reports what was found and what a human
still has to decide; `docs/curation-claims.md` records what the product may
say.

## Not run in this environment, and what would run it

A Supabase connection was available on 2026-09-09, so the migrations and the
policy checks below moved out of this table and into **Applied and verified**.
The rest still needs a deployment, a signed-in session or a real payment
provider, and is honestly **not run** rather than assumed:

| Check | What it needs |
| --- | --- |
| Guest → sign in → diagnostic → practical pass → resume → capstone | A preview deployment with Supabase configured |
| Payment webhook replay | A configured payment provider in test mode |
| Account switching and deletion end to end | Two real accounts |
| Rollback (disable the feature, retain the data) | The same preview environment |
| Signed-in responsive layout | A signed-in browser session — the sweep renders signed out |

These are the owner's deployment checks, and each already has an entry in
`NEEDED.md` with an owner and an estimate. **None of them is claimed as passing
here.** An unchecked box in an issue is not evidence, and neither is this
document: it records what the commands actually printed.

## Review of 2026-09-09: what it found

A code, design, content and architecture pass over the shipped epic. Everything
below was reproduced before it was fixed, and the fix was measured afterwards.

### Features that ran but did not reach the learner

**Spaced practice selected nothing.** The review handler worked out which
concepts were due, built a due-first pool, and handed it to a ranking that sorts
by its own total order — so the ordering was discarded. Verified with two
learners, one with nothing due and one with two concepts due: byte-identical
ten-question sessions, neither containing a due concept. Slots are now taken out
of the count before the ranking runs, which is the one arrangement the ranking
cannot undo. The contract asserts both halves.

**Hinted answers counted as independent recall.** The submit payload reported
which hint popovers were *open* at submit time. They never are — the popover
light-dismisses on the same click that picks an answer — so `hinted` went out
empty and every hinted answer climbed the interval ladder, which is exactly what
spaced practice exists to see through. The flag is sticky now.

**Levels fed nothing into the ladder.** Only quiz submits recorded a concept
review, and levels are where a devShark learner spends most of their time, so
nothing was ever due for them. Level completion records the same way now.

**The AI topic was unreachable.** Twenty levels and 160 questions, planned only
by the FDE bridge, so every learner who did not take that specialisation was
refused it as "not in your plan". It now closes all three base tracks, and the
contract fails if any deployable topic is planned by no track.

### Design defects

**The theme and language were applied after the bundle rendered.** A learner who
chose dark got a white page until the entry bundle had downloaded, parsed and
rendered — on a phone on a slow connection, a second or more, every cold load.
The document also stayed `lang="en"` while showing Czech, which a screen reader
reads in an English voice. Both are set before first paint now.

The ordering matters as much as the script: a pending stylesheet blocks every
script after it, so with the webfont link first the theme was never applied at
all while `fonts.googleapis.com` was unreachable. Measured in a headless browser
with the entry bundle blocked, so nothing but the bootstrap could have set the
attributes.

**Touch targets.** Measured across nineteen routes at 390px with touch
emulation on: the mobile navigation toggle at 36×36 — the most-tapped control on
a phone and the smallest thing on the page — buttons at 32px tall, segmented
control items at 28px, footer links at 14px. A coarse-pointer floor now brings
every control to 44px; re-measured across twenty-four routes in English and
Czech — 602 interactive elements each — nothing below it, no two clickable
boxes overlapping, and no clipped text without an ellipsis.

Those last two came back empty, so the instrument was checked rather than
believed: injecting two overlapping buttons and one deliberately clipped
sentence into a real page made it report all three. A zero from a measurement
that cannot produce a one is not a result.

**Toasts ignored `prefers-reduced-motion`.** The shared motion primitives each
handle it; the three components with a variant of their own slid and scaled for
everyone. One shared helper now takes the movement out and leaves opacity alone.

**An English phrase inside a Czech figure.** The HTML landmarks figure annotated
`main` with the plain value "one per page". It is a localized note now, and the
figure contract refuses any value carrying whitespace.

### Performance

**Hashed assets were revalidated on every visit.** Production served
`/assets/*` as `max-age=0, must-revalidate`, so a returning visitor made a
conditional request per chunk and got a 304. A content hash in the filename is
what makes a long cache safe; they are `immutable` for a year now, and the entry
documents still revalidate.

Measured on the live deployment: HTML 4.7kB and TTFB 0.39s; the entry bundle
300kB raw, 99kB over Brotli. The initial critical path is roughly 215kB
compressed — entry, React, router, query client and the shell stylesheet.
Routes, both translation tables, the level intros and the in-browser compiler
toolchain are all separate chunks and none is on that path.

**The coverage endpoint costs 18ms** for all 4,320 questions, edge-cached for
60 seconds with a five-minute stale-while-revalidate. Measured rather than
assumed.

**No unbounded or per-row queries were found** in the request paths. Every
learner query is keyed by `user_id` and the aggregates are bounded; the live
multiplayer view uses Realtime with polling only as a fallback.

### Tooling that was reporting more than it knew

**The responsive sweep could stall forever.** A DevTools command had no
deadline, so a wedged renderer left its promise pending and the retry loop
around it could never reach its own clock. One run sat frozen for half an hour
with the process alive. Commands have deadlines now, a route that cannot be
probed is reported as an error rather than skipped silently, a wedged browser is
restarted and the route retried once, and a sweep that failed to look at
something no longer prints "all clear".

**It was also measuring phones with a mouse's stylesheet.** `mobile: true` does
not make `(pointer: coarse)` match; touch emulation does. Every coarse-pointer
rule was invisible to it.

**And the build was deleting the app's overrides of design-system classes.** The
post-build purge keeps class names it can find as literals in the emitted JS,
and Astryx composes its `astryx-*` names at runtime. A rule that worked in `npm
run dev` was gone in production, silently. They are safelisted now, for about
2kB gzipped.

### Content

`npm run audit:devshark-content` flags **158 of 2,423 devShark questions**
(6.5%) where the correct answer is markedly longer and more detailed than its
distractors — the oldest tell in multiple choice. Not fixed here: rewriting them
is the content audit's work (#176), and this records the number so the decision
to run it has one.

EN/CS parity was re-checked mechanically: **2,038 keys each, none missing on
either side.** The 54 identical values are proper nouns, technology names,
format strings and deliberate borrowings ("skill check", declined properly in
the surrounding Czech copy).

## Applied and verified against production (2026-09-09)

| What | Result |
| --- | --- |
| Migrations 026, 027, 028, 029, 030 applied in order | **Pass** — all additive and idempotent, applied after 029 was used as a low-risk smoke test |
| Migration 031 (RLS InitPlan, duplicate index) | **Pass** |
| Row-level security on the eighteen new tables | **Pass** — enabled on every one |
| `learning_path_attempts` and `merch_stock` readable by nobody but the service role | **Pass** — zero policies, zero grants |
| Every new function service-role only | **Pass** |
| No policy re-evaluates `auth.uid()` per row | **Pass** — 0 remaining, down from 18 |
| `question_reports.content_version` exists and is nullable | **Pass** |

Two defects were found while applying them, both now fixed in the migration
files as well as in production:

**027 and 028 left Supabase's default table grants in place.** They granted
`SELECT` without revoking first, so `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE`
remained for `anon` and `authenticated` on twelve tables — the token ledger,
balances, merchandise orders and cosmetic entitlements among them. The policies
masked the first three by matching no rows. `TRUNCATE` takes no rows and so
passes no policy: any signed-in browser session could have emptied a table.

**Eighteen owner-read policies evaluated the caller once per row.** Correct, but
a cost that grows with the table. Wrapped in a scalar subquery it is evaluated
once per query.

## Migration order and rollback

Additive schema first, guarded API second, client third — the order the
implementation plan sets out. Every migration in this change (027, 028, 029,
030) is additive and idempotent, so applying it twice is safe and applying it
early breaks nothing.

Rollback is **disable the feature, retain the data**. There is no
data-destructive schema rollback anywhere in this change: no column is dropped,
no table is renamed, no row is deleted by a migration. Turning a feature off
leaves its rows readable, and turning it back on finds the learner where they
were.

The one place data is deliberately not carried forward is the token wallet: the
old browser-held balances are not converted, because they cannot be audited.
`docs/rewards-launch.md` records why, and the cosmetics already owned stay owned.


## 2026-09-11 — eight free-tool recommendations

Implemented performance reporting and a 243,000-byte initial JS/CSS gzip budget, self-hosted Inter/Manrope, MSW/Vitest failure and recovery tests, reviewed Knip checks, an Astryx Storybook workshop, EN/CS public guide HTML with canonical/sitemap/schema, concrete homepage copy and activation events, shared fluid typography/spacing, and exact-hash document CSP regression checks.

Local evidence at implementation review: API typecheck, launch contracts, coding content, learning paths, nine client tests, tooling typecheck, devShark production build, Storybook build, 11 public URLs, security policy contracts and Knip's three reviewed existing files passed. Initial devShark JS/CSS was 217,926 gzip bytes. Browser execution is blocked by the local environment (`socket() failed: Operation not permitted`), so local Lighthouse, responsive and browser results are not reported as passes. Product quality CI runs the browser matrix and records reports.


Final application source `ef954d1f2414536035d9a6ad88cbaa6a68f53403` passed both product jobs in [quality run 34605485210](https://github.com/lukaskourilcz/react-express-app/actions/runs/34605485210): API/tooling types, launch/coding/path contracts, nine client tests, both builds, public HTML, bundle budget, Knip, security and both production dependency audits. Each product passed five public browser tests, 34 responsive probes with zero issues, and the 23-assertion coding-frame harness; the devShark workshop additionally passed all five browser tests, including axe contrast and keyboard focus restoration. The final initial devShark JS/CSS graph is 217,962 gzip bytes, below the 243,000-byte budget.

The final static-preview Lighthouse run scored mobile 75 / desktop 97 for performance, 100 for accessibility and SEO, and 96 for best practices. Mobile LCP was 3.53 seconds and CLS 0.222; desktop LCP was 0.80 seconds and CLS 0.090. These are individual lab runs without live API credentials, not field measurements or a demonstrated overall performance improvement. Mobile layout shift remains a measured follow-up. Complete reports and browser screenshots are retained in the workflow artifacts for 14 days; baseline and final summaries are committed under `docs/quality/`.

This release changes no database schema, scoring authority, billing or handler count. PostHog account-level funnel setup and Search Console sitemap submission remain documented owner actions. The deployment result is recorded on PR #189 after production verification.

Production verification on the initial merge confirmed both products’ guide HTML, locale metadata and HTTPS/sandbox headers, but exposed a missing-guide soft 404: the broad SPA fallback still matched unknown topic paths. The follow-up excludes `/topics/` and `/cs/topics/` from that fallback; production status verification is recorded on PR #189 after redeployment.

## 2026-09-16 — the streak moment, the seventh day, and two armed protections

Issue [#193](https://github.com/lukaskourilcz/react-express-app/issues/193). Three things, and one of them reverses a recorded decision.

**A moment after a session.** `client/src/lib/streakMoment.ts` is a pure comparison of the stats row before a verified result against the one the server returned; `announceStreak` puts it on the existing XP toast queue, so a gain, a rank-up and a streak arriving together show one after another. It awards nothing — no XP, no tokens, no rank reconciliation — and the launch contract now asserts that by reading the function's own text. When the previous streak is unknown (an unwarmed cache, a replayed offline receipt) it says nothing at all rather than guessing, because a learner on day forty must not be told they have just reached seven.

**The seventh day.** A moment, not a second badge. `streak-7` in `shared/badges.ts` still reads `longest_streak` and still lives in the grid; the milestone reads the streak running now, fires on its first crossing and never again, and is marked on the profile's streak tile as a line rather than a pill. The launch contract asserts both halves of that split.

**"Streak at risk" is in-app and only in-app.** There is no push, email or notification sender anywhere in this repository and adding one would need an external account; the panel on Today is the whole of it. It appears when the last recorded day was exactly yesterday, in UTC, which is how `record_verified_quiz_result_v2` counts days — a local-midnight computation would fire on the wrong evening.

**Two armed protections.** `supabase/supabase-schema-039.sql` adds `shield_slots`, constrained in the schema to 0–2, and rewrites `activate_streak_shield` to extend the window by 48 hours per protection up to two. The ceiling does not move and the launch contract's four bounds are unchanged; a fifth and sixth were added for the arm routine and the moment. Migration 032 deliberately refused a second live shield, and the owner verified that refusal in production on 2026-09-09 — this reverses it, on the issue's request, and `NEEDED.md` says so rather than letting it land quietly.

Local evidence at implementation review: `npm run typecheck:api`, `npm run test:launch`, `npm run test:client` (8 files, 55 tests, 13 of them new), `npm run test:grading-integrity` and `npm run check:security` passed, and the client project typechecks clean under its own `tsc`. `npm run check:responsive` could not run — no Chrome or Chromium binary exists in this container — so no responsive or browser result is claimed. Migration 039 is committed and not applied; no database is reachable from here, and until the owner applies it the API answers `slotsSupported: false` and the second protection is not offered.

## 2026-09-16 — the weekly micro-league and one retention number

Issue [#194](https://github.com/lukaskourilcz/react-express-app/issues/194). A deadline on a ranking that already exists, and the number the deadline is judged by.

**The league ranks what the other boards rank.** `supabase/supabase-schema-038.sql` adds `league_scores`, `league_cohorts`, `league_members` and `league_preferences`, all four with row-level security on, no policy and no grant for a browser role, and six SECURITY DEFINER routines that are service-role only. The score is weekly correct answers with answered as the tie-break. The launch contract reads the league routines' own text and fails if they name `user_xp`, `quest_xp`, `user_badges`, `user_cards`, `token_balances`, `token_ledger`, `cosmetic_entitlements`, `roadmap_progress` or `coding_progress`, or if they read `current_streak` or `longest_streak` — so a tier cannot start being worth something, and this board cannot start ranking by streak, without the gate saying so.

**Scoring is server-owned and written once.** `league_record` is called from `api/user/[op].ts` on the same condition as the verified XP credit that has been there since migration 034: `record_verified_quiz_result_v2` returned `true`, meaning the attempt id was applied for the first time. A replayed submission scores nothing. The counts passed are the receipt's, which the server graded; the contract asserts that nothing from the request body reaches that call. The function deliberately does **not** restate `record_verified_quiz_result_v2` — migration 039 is changing that same body in the same release, and two migrations restating one function is how one of them silently loses.

**Seating is lazy.** No cron, no scheduler, no Sunday job, because nothing in this repository can create one. A learner takes a seat the first time the board is read in a new week, and their tier is computed then from the previous week's finish: top five up, bottom five down, everyone else holds, a first-ever member at tier 1, and only the immediately preceding week carries standing. Thirty seats is a hard ceiling on the column and in the statement that takes a seat; twenty is a fill target that a population too small to fill a room cannot meet, and the migration header says so rather than implying a guarantee.

**The week is ISO/UTC**, Monday 00:00 to Sunday 23:59, matching every other date in the schema. The issue said "reset every Sunday"; a Sunday-start boundary exists nowhere else in this product, so the week ends on Sunday night instead of starting there.

**One number, and it is the operator's.** `daily_return_rate` answers, for each of the last 7, 14 or 30 days, how many of the previous day's learners came back — over quiz submissions, daily attempts, roadmap attempts and coding attempts, capped at 90 days because `purge_expired_learning_data` deletes the older rows. It is served by `api/admin/[op].ts` behind `requireAdmin` and the admin rate limit, rendered as a plain table on `/dev` → Return rate with `priorActive` beside every rate so a 100% over one person cannot read as a finding, and it appears on no reader surface. No chart library was added; none exists here and a sparkline over a handful of learners would draw a trend the data does not contain.

**Twelve handlers, still.** The league rides the `league-` prefix on `api/user/[op].ts` and a new `case` in `api/admin/[op].ts`. No file was added under `api/`.

**The SQL was executed, not only read.** A PostgreSQL 16.13 binary turned out to be available in this container, so the whole chain — `supabase-schema.sql` through 039, with stub `anon`/`authenticated`/`service_role` roles and an `auth.uid()` stub — was applied to an empty database, and 038 was then re-applied to confirm it is idempotent. Against that database: accumulation sums two results into one weekly row and a malformed call raises `invalid_league_result` rather than clamping; seating is idempotent and forty-one learners produce two rooms of thirty and eleven with `member_count` matching the membership rows exactly; a hand-built twenty-person tier-3 cohort promotes ranks 1–5 to tier 4, demotes 16–20 to tier 2 and holds the rest, and the three tiers land in three separate rooms; tier 5 does not promote past 5 and a three-week absence restarts at tier 1; the board returns the caller's room ordered by correct then by fewest answered, marks exactly one row as the caller, and resolves names as handle → provider name → the local part of the address → `Anonymous`; opting out frees the seat, deletes the membership, stops the scoring and empties the board, and rejoining seats the learner again; `delete_user_data` frees the seat and clears all three user-keyed league tables; and the return rate reports 2 prior / 1 returned / 50% for a seeded day, 0 rather than a false 100% for an empty denominator, counts coding attempts as learning, and bounds its window to 1–90 days with a default of 14. `pg_class` and `pg_proc` confirm row-level security on all four tables with no `SELECT`, `INSERT` or `TRUNCATE` for `anon` or `authenticated`, and all seven routines `SECURITY DEFINER` with an empty `search_path` and `EXECUTE` for `service_role` alone.

Local evidence at implementation review: `npm run typecheck:api` (exit 0), `npm run test:launch` (exit 0), `npm run test:client` (9 files, 63 tests, 8 of them the new league suite; exit 0), `npm run test:grading-integrity` (exit 0), `npm run test:paths` (exit 0), `npm run check:security` (exit 0) and `git diff --check` (exit 0) passed, and the client project typechecks clean under its own `tsc -b`. `npm run check:responsive` could not run — still no Chrome or Chromium binary in this container — so no responsive or browser result is claimed for the League tab; its narrow-width behaviour is CSS reviewed and not measured. Migration 038 is committed and not applied to production: nothing here can reach the Supabase project, and until the owner applies it the League tab and the Return rate tab both report `migration_required` and nothing else in the product changes.

## 2026-09-16 — what a package costs, and how many of them

Issue [#203](https://github.com/lukaskourilcz/react-express-app/issues/203). The package a finished learning path earns is the only thing in this product whose cost rises when learners do well, and until now the number leaving in a month was however many of them finished.

**What one costs comes from the quotes, or it is not reported.** `packageCosting` in `shared/rewards.ts` adds the landed cost — blank, print, postage, packaging — of the three items the claim actually puts in the box. It reports `unquoted` and names the missing items while any of the three has no quote, and `mixed_currency` when the quotes disagree about the currency rather than adding three numbers in two currencies. `packageMonthlyCeilingMinor` reports the month's worst case as the cap times that unit cost plus the print-on-demand plan's monthly fee, and reports nothing at all when either half is unanswered. No figure in this model has a default and none of the vendor prices quoted in the issue is in the code.

**The cap is kept in the database, not in front of it.** `supabase/supabase-schema-040.sql` drops the ten-argument `claim_path_reward` from 035 and recreates it with `p_cap INTEGER DEFAULT NULL`; dropping first is what stops a ten-argument call being ambiguous against an eleven-argument one with a default. The month is counted inside the claiming transaction from `path_reward_claims` — the same table the one-time guarantee lives in — under a transaction advisory lock keyed by the month as `YYYYMM`, so two people claiming at once cannot both take the last slot. A full month raises before any write, so the refusal leaves no order, no claim row and no address.

**A full month is not a withdrawn reward.** The claim row is written only on a granted claim, so the completion still stands and the claim can be taken when the month turns over. `PathRewardClaim` says that in both languages instead of showing a button that fails, and `friendlyError` maps `package_cap_reached` to the same sentence.

**It is switched off.** `packagesPerMonth` defaults to `null`, which is undecided rather than unlimited: `packageProgramState` reports `cap_not_set`, and with no cap set the API omits `p_cap` entirely, so a database still on 035 keeps claiming exactly as it did. With a cap set and 040 not applied, a claim refuses with `migration_required` rather than posting uncapped — the cap fails closed, because posting parcels the owner asked to bound, because the thing that bounds them is missing, is the failure it exists to prevent. `NEEDED.md` carries the three owner items: set the number, get the three quotes and pick the plan, apply 040.

**The SQL was executed, not only read.** A PostgreSQL 16.13 binary is available in this container, so the whole chain — `supabase-schema.sql` through 040, with stub `anon`/`authenticated`/`service_role` roles and an `auth.uid()` stub — was applied to an empty database, and 040 was then re-applied to confirm it is idempotent. Against that database: exactly one `claim_path_reward` overload exists afterwards, the eleven-argument one; a ten-argument call still grants, which is the un-capped path unchanged; a second claim by the same learner reports `already` and creates no second order; a cap of 1 with the month's slot taken raises `package_cap_reached` and leaves the claim, order and item counts exactly where they were; a cap of 0 refuses an empty month, because zero is a decision; a cap of 2 lets the second learner through; an unfinished path is still refused before the cap is even consulted; the box holds a sized t-shirt, a mug and a sticker set at zero minor units each; a claim backdated 45 days stops counting against the month and frees the slot; the advisory lock is visible in `pg_locks` as `classid 4711, objid 202609` while a claim is open; and two sessions racing one free slot serialize, the second waiting on that lock and then refusing, leaving exactly one claim. `pg_proc` confirms all three routines `SECURITY DEFINER` with an empty `search_path` and `EXECUTE` for `service_role` alone. The cluster was removed afterwards.

Local evidence at implementation review: `npm run typecheck:api` (exit 0), `npm run test:launch` (exit 0), `npm run test:client` (9 files, 63 tests, exit 0), `npm run test:paths` (exit 0), `npm run check:security` (exit 0) and `git diff --check` (exit 0) passed, and the client project typechecks clean under its own `tsc -p tsconfig.json`. `npm run check:responsive` could not run — no Chrome or Chromium binary in this container — so the cap notice's narrow-width behaviour is CSS reviewed and not measured; it reuses the `lp-notice` and `lp-reward__note` rules the claim form already uses and adds no new element type. Migration 040 is committed and not applied to production.

## 2026-09-16 — leaderboard integrity: attestation and a velocity review list

Issue [#202](https://github.com/lukaskourilcz/react-express-app/issues/202). The boards rank correct answers and accuracy, and the server has owned both for a long time — answers never reach the client before submission, grading happens server-side, and each attempt is claimed once. What none of that establishes is that a browser was ever involved, and rate limits do not establish it either: a script pacing itself under every bucket still posts a run nobody could have read.

**Attestation ships switched off, and that is a state with its own tests.** `lib/turnstile.ts` has three states — `off` with no `TURNSTILE_SECRET_KEY`, `observe` with a secret, `enforce` with `TURNSTILE_ENFORCE=true` — and the shipped default is `off`, where no script is fetched, no element enters the document, no field goes on the wire and nothing is refused. `client/tests/turnstile.test.ts` pins exactly that, because it is the state every learner is on today. The middle state exists so the owner can answer "would enforcing have locked out real people?" without locking any of them out.

**Only the caller's own failure may cost the caller their submission.** `classifySiteverify` splits Cloudflare's `error-codes` into the caller's problems (`invalid-input-response`, `timeout-or-duplicate`) and everything else. A siteverify outage, a timeout, a malformed body, a `success: false` with no reason given, and — the one that matters most — a wrong or missing secret of our own all resolve to `unavailable`, which refuses nothing in either mode. One typo in an environment variable taking every submission in the product down with it is a far larger failure than a bot getting through during an outage.

**Three actions, chosen so the check is asked once per thing worth checking.** `quiz-submit` attests the receipt-bearing grade and is skipped for challenge scope, which grades one answer per request; `challenge-score` attests the single write to the Hall of Fame; `signup` rides the `authevent` report. Sign-in here is Google OAuth, so by the time this server hears about an account it already exists and there is nothing left to refuse — an unattested first-ever sign-in while enforcing is recorded as a flag instead, and the learner keeps their account and every part of the product. The attestation for a quiz runs before the one-time claim is consumed, so a refusal leaves the attempt regradeable rather than burning it.

**The velocity check reads only the server's own clock.** `evaluateVelocity` in `lib/integrity.ts` is pure — no clock, no network, no database — and judges the distance between minting the session envelope (or the challenge run token) and the answers coming back. Its floors: at least eight graded answers, averaging under 700 ms each at 95% accuracy or better, or under 250 ms each at any accuracy. Speed without accuracy is a bored learner clicking through a quiz they have given up on, and the contract asserts that it is *not* flagged. Clock skew across serverless instances clamps to zero rather than inventing a verdict shape the rest of the code cannot read.

**A flag is a note, and the tests are what keep it one.** It deletes no score, edits no XP, moves no rank, hides no board row, tightens no rate limit and blocks no later submission. `scripts/test-launch-contracts.ts` reads `lib/integrity.ts` with its comments stripped and fails if the module names `challenge_scores`, `user_stats`, `user_xp`, `quest_xp`, `user_category_stats` or a leaderboard, and reads `supabase/supabase-schema-041.sql` for the same absence. That restraint is what makes the floors safe to set strictly: a false positive costs the owner ten seconds of reading and costs the learner nothing, because nothing happened to them.

**Erasure reaches the new table through its own function.** `delete_integrity_data` is called from the account-deletion handler straight after `delete_user_data`, rather than as another line inside it. Four migrations in this release restate `delete_user_data` in full, and two of them restating it from different starting points is how one silently loses its addition; an additive function keeps them independent and re-runnable in any order. Its failure fails the deletion, because erasure that quietly skipped a table is worse than an error the owner can see.

**The SQL was executed, not only read.** A PostgreSQL 16.13 binary is available in this container, so the whole chain — `supabase-schema.sql` through 042, with stub `anon`/`authenticated`/`service_role` roles and an `auth.uid()` stub — was applied to an empty database, and 041 was then re-applied to confirm it is idempotent and that the re-apply preserves existing rows. Against that database: a first observation opens one row; a repeat increments `hits` and creates no second row; severity ratchets to `urgent` and never falls back, and a later flag without a subject does not erase the first one's; the hourly count comes from `quiz_submissions` and excludes a three-hour-old row, while an anonymous flag counts 0 because there is no account to count; a `cleared` decision survives four further hits while still counting them, and a merely `reviewed` row re-opens; resolving returns the row and stamps `reviewed_at`, re-opening clears the stamp, an unknown status raises `invalid_status`, and resolving a flag that does not exist returns no rows rather than inventing one; the list filters by status, sorts `urgent` first, returns one row for a zero limit and caps an unbounded one; an unknown signal or surface is refused by the check constraints; recording and confirming a flag leaves `challenge_scores` byte-for-byte unchanged in both row count and total; and erasure removes one account's rows, leaves another account's alone, and leaves the anonymous bucket standing because it is not an account. `pg_class`, `pg_policies` and `pg_proc` confirm row-level security on with no policy at all, no `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` for `anon` or `authenticated`, and all four routines `SECURITY DEFINER` with an empty `search_path` and `EXECUTE` for `service_role` alone. The cluster was removed afterwards.

**The CSP was widened by exactly one host.** `script-src`, `connect-src`, `frame-src` and `child-src` gained `https://challenges.cloudflare.com` and nothing else; no `'unsafe-inline'`, no `'unsafe-eval'`, no wildcard. `npm run check:security` passes. The host is reachable only when `VITE_TURNSTILE_SITE_KEY` is set, so an unconfigured deployment makes no request to it — but the policy allows it permanently, which is a real if small widening for a feature that is off.

Local evidence at implementation review: `npm run typecheck:api` (exit 0), `npm run test:launch` (exit 0), `npm run test:client` (11 files, 72 tests, 5 of them the new Turnstile suite; exit 0), `npm run test:grading-integrity` (exit 0), `npm run check:security` (exit 0) and `git diff --check` (exit 0) passed, and the client project typechecks clean under its own `tsc -p tsconfig.json`. `npm run build` and the Playwright suites were not run here — the orchestrator runs them centrally. `npm run check:responsive` could not run: no Chrome or Chromium binary in this container, so the `/dev` → Board integrity table and the attestation panel are CSS reviewed and not measured; the table reuses the same Astryx `Table` in a horizontally scrollable container that the Return rate and Flags tabs already use.

**Three things are the owner's, and all three are in `NEEDED.md`.** A Cloudflare account and the two keys; applying migration 041; and, separately and later, flipping `TURNSTILE_ENFORCE`. Nothing here creates an account, registers a widget or spends anything, and the free plan's limits quoted in the issue were not re-verified.
