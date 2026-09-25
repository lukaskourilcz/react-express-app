# Release acceptance matrix

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


## 2026-09-18 — workbench rework, junior/senior solutions, the debugging path, challenge runs

What changed: Results lists every check before the first run and scrolls after eight rows; each evolving stage leads with its own checks; the keyboard guide draws real keycaps; earlier stage briefs read as context; Hint and Solution explain themselves in Astryx tooltips instead of a helper line; focus mode is gone and the save star sits in the toolbar. Every graded code task carries a junior and a senior solution, proven by the content contract and shown in a Solution tab after a verified pass. A fourteenth evolving project, the debugging path, teaches tracing-before-fixing with `console.log` across ten stages. Challenge runs (migration 037) let a signed-in learner shape a run — track, count, order — and start it now or plan it for a date and time. Two fixes were carried over from the stale modernization branch (PR #185): puzzle line ids are now presentation ids translated inside the sealed session, and the payment webhook checks the amount and currency against the order and ignores a stale failure on a paid order.

Local evidence, all executed on the merged head:

| Check | Result |
| --- | --- |
| `npm run typecheck:api` | pass |
| `npm run test:coding` | pass — 395 tasks (javascript 150, typescript 84, react 116, system-design 45); reference, junior and senior solutions proven against visible and hidden checks; Czech parity; debug-format starters fail their own tests; presented puzzle ids never sort into an accepted order (1 min 41 s) |
| `npm run test:launch` | pass — adds challenge-run queue and schedule assertions and the webhook decision table |
| `npm run test:paths` | pass |
| `npm run test:client` | pass — 7 files, 43 tests |
| `npm run build` | pass (React runner, client, sandbox page) |
| `npm run test:harness` | pass — 129 assertions against the built sandbox in Chromium |
| `npm run check:responsive` (devShark build, `/`, `/today`, `/coding`, `/coding/javascript`, `/coding/react`, three task pages, `/coding/fullstack`, `/coding/review`) | pass — 70 probes, 0 issues |
| `npm audit --omit=dev` (root and client) | 0 vulnerabilities |
| `git diff --check` | clean |

Screenshots taken with a mocked API (light and dark, English and Czech, 1440 and 390 px): the idle Results rows, the capped list, the keycaps and both tooltips, the previous-requirements block, the Solution tab, the debugging path on the Coding home, the run planner in its form, planned and active states, the planned-run card on Today, and the run line on a task page. Not exercised here, and listed in `NEEDED.md`: the account-bound flow end to end (plan a run, start it from Today, pass a queued task) and the Solution tab on a return visit. Migration 037 was applied to production later the same day through the Supabase connector: structure, privileges and a rolled-back functional exercise verified, re-application a no-op, advisor unchanged.

## 2026-09-21 — the Algorithms track, and comment-free solution boards

What changed: the Coding section lists a fourth track, `algorithms` — twenty-five interview problems in plain JavaScript, from Two sum to a promise pool and an exponential-backoff retry. It grades, awards XP and enters the review ladder like any other track, but it carries its own topic so no challenge can be drawn into a Learn level's quota, and it is unladdered, so every tier is open from the start. Widening the track union named three places where a question had been answered inline; each became one predicate (`hasLearnLevel`, `UNLADDERED_TRACKS`, the parser choice inside `formatCode`). Separately, the junior and senior boards shown after a verified pass no longer carry their authoring comments: 313 senior boards and 18 junior ones opened with a note that buried the code underneath it. Migration 038 widens the two track constraints and the two routines that record a verdict and a reveal.

Local evidence, all executed on the merged head:

| Check | Result |
| --- | --- |
| `npm run typecheck:api` | pass |
| `npm run test:coding` | pass — 420 tasks (javascript 150, typescript 84, react 116, system-design 45, algorithms 25); reference, junior and senior solutions proven against visible and hidden checks and the production QuickJS grader; Czech parity; every shipped board asserted comment-free |
| `npm run test:launch` | pass — 12-function budget unchanged at twelve handlers |
| `npm run test:paths` | pass |
| `npm run test:client` | pass — 7 files, 43 tests |
| `npm run build` | pass (React runner, client, sandbox page) |
| `npm run test:harness` | pass — 129 assertions against the built sandbox in Chromium |
| `npm run check:responsive` (devShark build, full route list including `/coding/algorithms` and a task page, 7 widths) | pass — 231 probes, 0 issues |
| `npm run check:responsive` (devShark build, Czech + dark, the four Algorithms routes) | pass — 28 probes, 0 issues |
| `npm audit --omit=dev` (root and client) | 0 vulnerabilities |
| `git diff --check` | clean |

Rendered and asserted in Chromium against the devShark preview, English and Czech: the Coding home lists the track with its blurb and "0 of 25 passed"; `/coding/algorithms` lists all twenty-five under four tier headings (Foundations, Fluency, Combine, Interview / Základy, Jistota, Kombinace, Pohovor) with nothing locked, every row linking into the track, and no row claiming a Learn level.

Not exercised here, and listed in `NEEDED.md`: anything account-bound, since no Supabase project is reachable from the build container — a recorded pass on an Algorithms challenge, and the Solution tab showing the two stripped boards after that pass. Migration 038 has not been applied to production; until it is, a signed-in pass on an Algorithms challenge is graded correctly and then refused by `record_coding_verdict`.

## 2026-09-21 — English only, wider challenge coverage, migration 038 applied

What changed, after the Algorithms track landed earlier the same day:

- **English only.** `ENABLED_LANGS` in the client's LanguageContext lists what the build ships. While it holds one entry the footer and profile language buttons do not render, a stored preference, a browser preference and a prerendered locale are all ignored, `setLang` refuses a language the build does not carry, and the lazy Czech chunk is never requested. Nothing Czech is deleted: the dictionary is now `Partial`, the launch contract no longer demands a Czech string for every English key, and the coding content contract checks Czech parity only under `CODING_REQUIRE_CS=1`. CLAUDE.md, AGENTS.md, the skills, the agents and the commands no longer ask for Czech copy or EN/CS parity.
- **Every Algorithms challenge now shows 10 to 12 visible checks**, up from five or six. The additions are the cases the first pass left to hidden checks or missed: a size that is negative and one that is fractional, a rotation of two whole turns, tabs as whitespace, a priority of 10 against 9, an empty array between two values, `undefined` returned unchanged by a deep clone, a route the long way round a cycle, a pool limit of one that must never overlap.
- **Migration 038 applied to production.**

Three of the new checks failed on first run, which is what they were for:

| Failure | Cause | Fix |
| --- | --- | --- |
| `reverseWords("\tone\ttwo\t")` | The junior reading split on a single space, so a tab-separated line came back as one word. A real defect in a shipped board, invisible to the old tests. | Split on whitespace, keeping the longhand filter and reverse. |
| `deepClone(undefined)` | The check expected `null`; the function returns `undefined`, as the brief says it should. | Corrected the expectation. |
| `retryWithBackoff` elapsed time | `elapsed >= 100` against a 100 ms timer sits exactly on the boundary, and a real timer may fire a fraction early. | Banded each wait so it separates no wait from one wait from two, without hugging the edge. |

Local evidence, all executed on the merged head:

| Check | Result |
| --- | --- |
| `npm run typecheck:api` | pass |
| `npm run test:coding` | pass — 420 tasks; run three times for the timing-sensitive async checks, stable each time |
| `npm run test:launch` | pass — 12-function budget unchanged |
| `npm run test:client` | pass — 7 files, 43 tests |
| `npm run build` | pass (React runner, client, sandbox page) |
| `npm run check:responsive` (devShark build, full route list, 7 widths) | pass — 231 probes, 0 issues |
| `git diff --check` | clean |

Verified in Chromium against a devShark build: a visitor with a stored `cs` preference on a cs-CZ browser gets `<html lang="en">` and English throughout, `/`, `/coding` and `/profile` render no language control between them, and the Czech chunk is never fetched.

Migration 038 was applied to production (`rvlybcjdpafwyeuojvhl`) through the Supabase connector: both track checks admit `algorithms` with exactly one check per table, both routines remain SECURITY DEFINER with an empty `search_path` and `service_role`-only execute, and a rolled-back exercise recorded an `algorithms` verdict and reveal, confirmed both rows carried the new track, and confirmed an unknown track is still refused. No probe rows survived and the advisor reports only the pre-existing RLS notices.

Not exercised here: anything account-bound, since no Supabase project is reachable from the build container. The prerendered Czech topic guides at `/cs/topics/:slug` still render and are still indexed; what to do about them is an owner decision in `NEEDED.md`.

## 2026-09-24 — Algorithms submits, a quieter quiz, drafts on Run, the fin in the water

What changed:

- **Algorithms submits no longer expire.** `decodeCodingSession` checked a sealed session's track against its own list of four tracks, and the Algorithms track never joined that list. Every Algorithms session therefore decoded to nothing, and every Submit answered `invalid_session`, which the workbench shows as "This session expired. Reload the task and submit again." The decoder and the coding handlers now read the track list from `shared/coding-catalog`, and the launch contract seals and opens a session on every track. Replaying the reference solution to `alg-two-sum` through the real handler returned HTTP 400 `invalid_session` before the fix and 200 `passed` after it; `alg-promise-pool`, `alg-retry-backoff` and `js-double-numbers` also pass. A session still expires after three hours, and signing out mid-task still invalidates it; both are intended.
- **Quiz.** The rotating coaching line ("Before choosing, name the behavior or requirement being tested", and four others) is gone, with its strings and the `RotatingTip` component. The keyboard tip no longer shows under a coarse pointer or below 600px. The hint popover no longer carries the design system's hidden "Close popover" button, which a tap revealed and which then hid itself instead of the hint. A visible × icon button now closes the hint, and it measures 44×44 on touch. The popover is aligned to the end of its trigger and capped at `min(320px, 100% − 16px)`, so it stays on screen at 360px.
- **Drafts.** The coding workbench no longer saves while the learner types or when they leave, and it says nothing about saving. Run and Submit hand the current code to the draft store: the device, and the account when signed in. Edits made after the last Run or Submit are not kept.
- **Results height.** From 1024px up, the output pane takes the editor's height and its checks scroll inside it, so Run and Submit sit directly under the editor. At 1280px the panes of `alg-deep-clone` went from 1035px to 538px and those of `alg-two-sum` from 804px to 538px; `js-double-numbers` stayed at 538px. The same held at 1024px and 1440px, with the last check still reachable by scrolling the pane.
- **The fin mark.** `SharkFin` sweeps back to a hooked tip, and its base is cut into a wave, so the fin sits in the water. The wave's mean height stays on the old base line, so fins placed on waterlines still sit on them. `client/public/favicon.svg` repeats the same paths.
- **Docs.** The visual QA matrix and the brand voice no longer ask for Czech.

Local evidence, all executed on the branch head:

| Check | Result |
| --- | --- |
| `npm run typecheck:api` | pass |
| `npm run test:coding` | pass — 440 tasks (javascript 170, typescript 84, react 116, system-design 45, algorithms 25) |
| `npm run test:launch` | pass — includes the new every-track session round trip; 12-function budget unchanged |
| `npm run test:paths` | pass |
| `npm run test:client` | pass — 7 files, 45 tests; the draft test now checks that typing and leaving save nothing and that Run and Submit save the current code |
| `npm run build` (devShark) | pass (React runner, client, sandbox page) |
| `npm run test:harness` | pass — 129 assertions against the built sandbox in Chromium |
| `npm run check:responsive` | pass — 231 probes, 0 issues |
| `npm audit --omit=dev` (root and client) | 0 vulnerabilities |
| `git diff --check` | clean |

Rendered in Chromium against a devShark build, with the API mocked from real handler payloads: the quiz at 1280, 768, 390 and 360px, with and without touch (no coaching line, keyboard tip only with a fine pointer, hint popover on screen, × closes it); the workbench at 1024, 1280 and 1440px (Run directly under the editor); the header fin in light and dark at 1280px and on a phone, and the favicon at 16 to 48px.

Not exercised here: anything account-bound, since no Supabase project is reachable from the build container. A signed-in Algorithms pass and the account copy of a draft are listed in `NEEDED.md`.

## 2026-09-24 — devShark alone: StudyShark moves to its own repository

What changed (#211, #213, #216):

- **This repository builds devShark only.** `client/product-catalog.ts` holds one entry. `resolveCatalogProductId` returns devShark when no product is set and throws when `VITE_PRODUCT` or `VITE_LOCK_SUBJECT` names anything else, and the message names `lukaskourilcz/studyshark`. The StudyShark Vercel project built this same code, so its builds now fail and its last deployment keeps serving until the owner removes it (#214).
- **Removed:** the six general subjects' 158 bank files with their Czech overlays, and their slices of the shared tables and unions; the subject picker, `/subjects`, the subject glyphs and switcher; the family rows of the footer; the Profile link to StudyShark; the AI wiring devShark never switched on (`lib/ai-provider.ts`, Sharkira, the `hint` and `explanation` resources, the AI settings block); 425 keys from each dictionary. In all, 170 files deleted and about 58,500 lines.
- **Kept:** the `webdev` subject key everything is stored under, the compatibility storage keys (`studyshark:*`), every applied migration and the database's seven-subject checks. The production database still holds StudyShark's rows; what happens to them is #215.
- **Fixed on the way:** `typecheck:tooling` had failed CI on every push since 2026-09-18, on a React verdict fixture without `solutions`. The home page's comparison table and founder note said "StudyShark" on devShark; they say devShark. The Czech guides at `/cs/topics/:slug` hydrate into the English interface, so their article now carries `lang="cs"`; a screen reader had been reading them with an English voice.
- **CI** runs one devShark job. The launch contracts run in `webdev` scope and assert that StudyShark, geoShark and a geography lock are refused.
- **Documentation, skills, agents and commands** describe devShark alone, with one line saying where StudyShark went.
- **StudyShark** lives in `lukaskourilcz/studyshark`: private, deployed nowhere, started from a snapshot of `d71150c`. #195, #196, #198 and #199 moved there as studyshark#1 to #4.

Local evidence, all executed on the branch head:

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | pass |
| `npm run test:launch` | pass — twelve handlers; StudyShark, geoShark and a geography lock refused |
| `npm run test:coding-auth`, `test:grading-integrity`, `test:coding`, `test:paths` | pass |
| `npm run test:client` | pass — 7 files, 45 tests |
| `npm run check:unused`, `npm run check:security` | pass |
| `npm run build` (devShark), `check:public`, `check:bundle` | pass — 11 public URLs |
| `npm audit --omit=dev` (root and client) | 0 vulnerabilities |
| `tests/browser/public.spec.ts`, `tests/browser/evolving.spec.ts` | pass — 7 tests |
| `npm run check:responsive` (the two CI sweeps) | pass — 28 and 6 probes, 0 issues |
| `npm run check:responsive` (full route list, 7 widths) | pass — 224 probes, 0 issues; seven fewer than before because `/subjects` is gone |
| `npm run test:harness` | pass — 129 assertions |
| `npm run audit:performance` | runs; mobile 0.91, desktop 0.75 with CLS 0.98 (the open desktop-CLS item in `NEEDED.md`) |
| `npm run build:storybook`, `tests/browser/storybook.spec.ts` | pass — 5 tests |
| Browser pass over `/`, `/learn`, `/quiz`, `/coding`, `/roadmap`, `/today`, `/profile`, `/leaderboard`, `/play` at 1280 and 390 px, light and dark | pass — 36 checks: devShark title, `lang="en"`, no other product named, no overflow, no page errors |
| Before/after: the `d71150c` devShark build beside this one, 20 routes at 1280 and 390 px, signed out | 34 of 40 pairs identical in text, headings, footer placement and width. The home page, and `/profile`, which sends a signed-out visitor home, name devShark instead of StudyShark in the comparison table and the founder note. `/typing` differs only in its randomly drawn snippet. No page errors on either build |
| `VITE_PRODUCT=studyshark npm run build` | fails as intended when Vite loads its config, before any client output is written: "This repository builds devShark only, but the environment asks for product "studyshark" and subject lock "". StudyShark lives in lukaskourilcz/studyshark." |
| `git diff --check` | clean |

Not exercised here: anything account-bound, since no Supabase project is reachable from the build container, and nothing on Vercel, since the Vercel connector needs re-authorizing.

## 2026-09-25 — StudyShark off Vercel and out of the database

At the owner's request StudyShark runs nowhere.

- **Vercel.** The `studyshark-app` project is paused; `https://studyshark-app.vercel.app/` and its `/api/health` answer 503 `DEPLOYMENT_PAUSED`. It had no custom domain. The connector can pause a project but not delete one, so deletion is an owner step in #214. Before it, the StudyShark URL has to leave the Supabase Auth redirect list, because a deleted project's `vercel.app` subdomain can be claimed by anyone.
- **Supabase.** A scan of every public table for StudyShark subjects, question ids and the product name found two sets of rows. The first was three multiplayer matches from July, stored as `webdev`, whose question lists held StudyShark questions: one all capitals, two mixed from before questions were scoped by subject. Deleting them removed five participants and eleven answers by cascade. The second was eight anonymous geography Learn attempts, with their 32 answers. Both sets were deleted from production and from the `devshark-recovery-20260915` copy. The same scan finds nothing afterwards in either project. No account held StudyShark rows, and none was deleted: production has two accounts.
- **Unchanged.** devShark's own rows: 5 matches, 8 Learn attempts, 59 question-history rows, 60 coding awards and 12 progress rows. `/api/health` reports the database, service role and rate limiter healthy, and `/learn` answers 200. The schema's subject checks still list the six StudyShark subjects; the API's subject scope refuses them.
- **StudyShark repository.** Its CI workflow is deleted at the owner's request; the checks run locally only.

## 2026-09-25 — the Challenge and the daily set load again

What was broken: on 2026-09-08 (`a132ba6`) Testing, Abbreviations and Code Snippets were retired as sections, and the server began refusing a retired category in any request for questions. One retired category gets the whole request refused with 400 `invalid_subject_scope`. The Challenge and the daily set built their requests from the full category catalogue, which keeps the retired sections so that old rows still resolve. From then on every challenge board, challenge run and daily set on devShark failed: the board said "Today's board could not be loaded", and "Enter the challenge" could not load a batch. Replayed against production, the client's 19-category list got 400 on all three requests. The 16 categories the server still serves got 200: 25 challenge questions, 5 daily questions and the board.

What changed:

- `shared/subject-catalog.ts` gains `deliveryCategories(subject)`: the catalogue without its retired sections. The server's default scope and the client's requests for questions both use it.
- The Challenge, for its batch and its board, and the daily set send `deliveryCategoriesForSubject`.
- The Quiz restores a saved or linked category only if the server still serves it. An old setup, or an old link naming a retired section, no longer gets the quiz refused.
- The challenge board is validated as a read. A browser still running the old bundle gets its board back as soon as this deploys; its runs recover on the next reload.
- A client test replays the three requests through the server's own check; it failed 3 of 3 against the old client. The launch contract asserts that the delivery list is requestable and that the full catalogue is not.
- The relaxed-pace option on the Challenge intro is its natural height. It borrowed the track-card flex basis, which in a column made it a 220px box with empty space under the text.

Local evidence, all executed on the branch head:

| Check | Result |
| --- | --- |
| Every CI step: types, launch contracts, coding auth, grading integrity, coding content, paths, client tests, unused, security, devShark build, public HTML, bundle, both audits | pass; client tests 8 files, 48 tests; coding content 440 tasks |
| `client/tests/delivery-scope.test.ts` against the old client | fails 3 of 3, as it should |
| Built client in Chromium with every `GET /api` replayed against production | board loads ("No one has set a score yet"), a run shows a question with four options, the daily set shows its questions |
| `npm run check:responsive` on `/challenge` and `/quiz`, 7 widths, then dark at 360, 390 and 1280 | 14 and 3 probes, 0 issues |
| `git diff --check` | clean |

## 2026-09-25 — the Custom paths join the sections, and every section gets its own

The owner asked for the Custom category to be split into JavaScript, TypeScript, React, Algorithms and FullStack, with no path longer than five levels: a Map path first, then a Set path, then a new path that uses Map and Set together, and the Custom category gone.

What changed:

- `shared/evolving.ts` drops the `custom` category and gains short paths: five levels (`<path id>-1` to `-5`), no checkpoints, each level one function or feature added to the same code, with every earlier check run again.
- JavaScript lists five: Map basics, Set basics, Map and Set together (new), Objects and grouping, and Lookups and crawling. The two ten-step Custom paths were split into the first, second, fourth and fifth. Three of their levels are new (`difference`, `duplicates`, `crawlDepths`); three small Custom steps were folded in or dropped (`countsToPairs` into `topK`, `firstUnique`, `totalRuns`).
- New paths: two in TypeScript (Generic collection helpers; Unions and narrowing), two in React (State and lists; Effects and loading), two in Algorithms (Two pointers and windows; Stacks and queues), and a link shortener in FullStack that goes from a JavaScript input check through a typed API to a React client.
- Each section page lists its paths between the header and the challenge list, and the FullStack screen puts the link shortener first. The Coding home loses the Custom block; its gallery keeps the ten longer projects. Short paths read "Level 2 of 5" where the longer projects read "Stage".
- The FullStack React scaffold is appended at each path's own first React stage. Before, the first FullStack app's index was used for every app.
- Progress on the removed `js-custom-*` stages, which existed for a day, no longer maps to a task. XP already earned stays.

Local evidence, all executed on the branch head:

| Check | Result |
| --- | --- |
| Every CI step: types (API and tooling), launch contracts, coding auth, grading integrity, coding content, paths, client tests, unused, security, devShark build, public HTML, bundle, both audits | pass; coding content 480 tasks, every solution proven; client tests 8 files, 61 tests; initial JS and CSS 203,781 gzip bytes of 243,000; 0 vulnerabilities in both audits |
| Mutation check: 21 broken variants of reference solutions (a missing stale-answer guard, a missing JSON header, a duplicate guest still added, operands swapped, and so on) | 18 caught at once; two gaps closed with new visible checks (`twoSum([1, 1, 5], 6)`, a search with one unknown word); the last variant (`<` for `<=` in the sliding maximum) is still correct |
| Reference solutions run in the browser's own runners on 17 levels from every kind of path (JavaScript, TypeScript, Algorithms, React, FullStack) | all pass; the first run failed Effects and loading level 5 (6 of 8) because the title effect lands a moment after the list, fixed by waiting for the title |
| React levels in the browser, reference, junior and senior, three runs each (State and lists 5, Effects and loading 4 and 5, Link shortener 4 and 5) | all pass every run |
| Built client in Chromium: `/coding`, the four section pages and `/coding/fullstack`, light and dark, 1280 and 390 | no Custom block; section paths in the requested order between the header and the filters; "0 of 5 levels completed"; the Link shortener first on FullStack; no overflow, no page errors |
| Browser specs `public` and `evolving`, the harness check, Storybook, Lighthouse | pass; harness 141 assertions; Storybook 5 of 5; performance 0.86 mobile and 0.99 desktop, accessibility 1 |
| `npm run check:responsive` on the CI routes at 7 widths and in dark Czech, then on `/coding`, the four sections and `/coding/fullstack` at 7 widths and in dark at 360, 390 and 1280 | 28, 6, 42 and 9 probes, 0 issues |
| `git diff --check` | clean |

In production after the deploy of `5f865a0`, whose "Product quality" run passed on GitHub:

| Check | Result |
| --- | --- |
| `GET /api/quiz/roadmap?resource=coding-task` for new levels in every section, and for `js-custom-mapset-1` | 200 for the new levels; 404 for the Custom id |
| Anonymous submit of the reference solution to level 1 of a JavaScript, TypeScript, Algorithms, React and FullStack path (graded, never recorded) | all passed; React levels 1 of both React paths went through the isolated grader in about 5 s |
| The same for a level above 1 | refused as designed: a signed-out visitor gets `locked: "evolving"` and no session |
| Chromium on the deployed pages, with every GET replayed through curl | `/coding` has no Custom block; each section lists its paths in the requested order; the Link shortener leads FullStack; `js-path-mapset-1` loads as "Level 1 of 5"; no page errors |

## 2026-09-25 — billing with Stripe (D2, #221)

What changed: Premium can be sold once the owner's Stripe account exists. Checkout, the Customer Portal, the signed webhook and the public cancellation page are `op=` branches of `api/user/[op].ts` (`lib/billing/`), so the handler count stays at twelve. `/premium/success` and `/premium/cancel` ship in the client, with `PremiumCheckoutButton` for the `/premium` page (#222), "Manage billing" on the Profile plan line and "Cancel Premium" in the footer's legal links. Migration 039 gained section 5 (the consent table and four routines). Everything stays behind `BILLING_ENABLED`, off by default, and no test reaches Stripe. The design is in `docs/product-architecture.md` under "Tiers and billing".

Local evidence, all executed on the lane branch head:

| Check | Result |
| --- | --- |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0; adds the billing structure: off by default, the canonical origin, four ops inside the twelve handlers, the webhook outside the limiter, no Stripe script or CSP host, no billing file touching learning, score or wallet data |
| `npm run test:billing` | exit 0; 24 checks over the nine fixture event types signed with `stripe.webhooks.generateTestHeaderString` |
| The same 24 checks against Postgres 16 with migrations 001 to 039, through a local PostgREST stand-in | passed; the real `is_premium`, upsert, event and consent routines |
| Migration 039 on Postgres 16 | applied twice from scratch and twice over the D1 copy, exit 0 each; the D1 and D2 rolled-back exercises pass, nothing left after rollback |
| `npm run test:client` | exit 0; 10 files, 86 tests (17 new in `client/tests/billing.test.tsx`) |
| `npm run build`, `npm run check:bundle` | exit 0; 209,176 of 243,000 gzip bytes |
| `npm run check:security` | exit 0; `vercel.json` unchanged |
| `npm run check:public`, `npm run check:unused` | exit 0 |
| `npm run check:responsive` at 360, 390, 768 and 1280, light and dark, with `/premium/success` and `/premium/cancel` added to the inventory | exit 0; 136 probes each, 0 issues |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities (`stripe` 22.6.2 has no dependencies) |
| `git diff --check` | clean |
| Chromium, 360 and 1280, light and dark, the real handlers against the local database and a fake Stripe | the cancel page's form, email error, confirmation (focus on its heading) and receipt, generic for another address and exact for the signed-in owner; the success page done, pending, expired (two checkout buttons with the price) and signed out; Manage billing on the plan line; the footer link; no page errors and no horizontal overflow |

Billing simulation, run locally rather than in Stripe: `npm run test:billing` moves one subscription through `invoice.payment_failed` with the live subscription `past_due` and its period three days past (Premium stays, the plan line's `inGrace` is true), then eight days past (Free), then `customer.subscription.deleted` (canceled). The run with a Stripe test clock against a sandbox needs the owner's account and is listed in `NEEDED.md`. So are the fixture payloads: they were written from Stripe's API reference for `2026-08-26.dahlia`, not captured, because no account exists yet.

Not verified here: anything against Stripe itself (Checkout's rendering of the consent and the order-button text, Managed Payments approval, the portal configuration, real webhook delivery through Vercel's raw-body replay), and production. Each is an owner item in `NEEDED.md`.

## 2026-09-25 — public copy, `/premium` and the legal pages (D3, #222)

What changed: the landing stops saying devShark is free. The hero reads "Free to start", the `$0` stat became the three free topics, and the pledge, the footer line, the plan table (Free against Premium, without the AI and bilingual rows) and the founder note carry the handoff's section 4.1 copy. `/premium` shows both plans with "VAT included", the renewal, the waiver sentence and the 14-day refund beside the buttons, what Premium opens, the plan table and six questions; Premium sits next to Leaderboard in the header's icon group, and `/support` redirects to it. The Terms and the privacy policy were rewritten for Premium, Stripe and Link, and Spreadshop. The trader's details render from `TRADER` in `client/product-catalog.ts` only when set, and none is set yet. The build prerenders `/premium` and `/premium/cancel`, which the sitemap now lists (13 URLs).

Local evidence, all executed on the lane branch head:

| Check | Result |
| --- | --- |
| `grep -rn "free forever\|Free forever\|is free\|zdarma" client/src --include=*.ts --include=*.tsx` | 11 matches, all in the retained `translations.cs.ts` |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0; adds the public copy contracts: no English string promising free, the waiver on `/premium` equal to the one Checkout stores, "VAT included" beside every price, no urgency copy, the routes, rewrites, `noindex` and Premium schema, `TRADER` null or real |
| `npm run test:billing` | exit 0; 24 checks, now with the seller of record in the public settings |
| `npm run test:client` | exit 0; 11 files, 99 tests (13 new in `client/tests/premium-page.test.tsx`) |
| `npm run build`, `npm run check:bundle` | exit 0; 214,735 of 243,000 gzip bytes (209,176 before; the legal copy lives in the English dictionary) |
| `npm run check:public` | exit 0; 13 URLs; `/premium` is a LearningResource with `isAccessibleForFree: false` and both prices as offers with VAT included, the guides keep `true` |
| `npm run check:security`, `npm run check:unused` | exit 0 |
| `npm run check:responsive` over `/`, `/premium`, `/premium/cancel`, `/terms`, `/privacy` at 360, 390, 768 and 1280, light and dark | exit 0; 20 probes each, 0 issues |
| `npm run check:responsive`, every route at 360, 390, 768 and 1024 (the header gained an icon, text fields gained a touch floor) | exit 0; 68 probes each, 0 issues |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check` | clean |
| Chromium, the same five routes and eight width and theme pairs, phones with touch | every link, button and disclosure at least 44px tall on a phone, a focus ring on each text link and question; the Astryx email field is 32px with a mouse, by the same desktop-density rule as the buttons, and 44px on touch; at 360px all three plan-table columns show with no sideways scroll |

Not verified here: production, the Stripe Checkout page itself, and the legal wording, which waits for the owner's lawyer. The trader's name, IČO, registered address and email are owner items in `NEEDED.md`; there is no EU ODR link because the platform closed on 20 July 2025.

## 2026-09-25 — coins (D8, #227)

What changed: the server ledger of migration 028 is the only wallet, and the UI calls it coins. Every verified XP source credits it: quiz and daily results and Biggest Shark Challenge runs as before, plus a Learn level or part test passed for the first time and a coding challenge's first pass. Every account earns 10 % of that XP, Premium earns double at credit time, and one account earns at most 400 coins a day from XP, after the doubling. Premium milestones (streak 7, 30 and 100 days; a finished Learn topic; a finished evolving project or short path; the top three of a finished month) pay once per account. The welcome coins arrive on the first wallet read. The browser no longer awards or shows a `localStorage` balance. `/shop` reads Rewards in the navigation, a free account gets 402 when it redeems merchandise, and "Find devShark elsewhere" links to the profiles in `client/product-catalog.ts` with no reward unless the owner sets `socialVisitGrant`. Migration 041 also restates `record_coding_verdict`: its award id named only the task, so only the first account ever to pass a task received that task's XP.

Local evidence, all executed on the lane branch head:

| Check | Result |
| --- | --- |
| Migration 041 on Postgres 16 (template with the shim and 001–038, then 039) | applied twice with `ON_ERROR_STOP=1`, exit 0 both times |
| Rolled-back exercise of 041 | exit 0: free 100 XP → 10, replay → 0; Premium 100 XP → 20; 1,000 → 200, then 180 at the cap, then 0, recorded with no ledger line; a credit made before 041 is not paid again; milestones streak:7 25, topic:html 100, project 150 once, again → nothing; a free account and a stale streak get progress and no credit; milestones sit outside the cap; the month board reports `no_board` without 040's table, `open` for the current month, settles August once (ranks 1 and 2 Premium paid 300 and 200, rank 3 free paid nothing), `already` on the second call; the social grant pays nothing at 0, 5 once at 5, refuses an unknown platform; two accounts passing the same task both get coding XP; `authenticated` reads only its own credit rows and cannot read settlements, call a credit routine or write the table; all routines SECURITY DEFINER with an empty `search_path` and service_role only; deletion removes the credit rows and anonymises a settlement |
| Real handlers against that database through a PostgREST/Auth stand-in | 34/34: the welcome coins once; a quiz result 10 and its replay nothing; a coding pass 10 % of its XP, a second pass nothing; a first Learn pass 5, a replayed completion and a re-pass nothing; a free redemption 402 `merch-redemption` before the address check; the crown answers 409 and never 402; Premium coding and Learn credits double; a Premium redemption of 100 coins, and a second one refused `out_of_stock` with nothing charged under a cap of one; a 7-day streak pays 25 on the wallet read, once; a free 30-day streak pays nothing; social claims pay nothing at 0 and ignore an amount in the body; any other claim is refused; 5 coins once after the owner sets 5; account deletion removes the ledger and the credit rows |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0; adds the coin contracts: the handoff's rates, replays that credit nothing, service-role-only credit routines that write no learning table, the doubling inside the credit routine with the cap after it, 402 before the address, the browser wallet gone, coins in the copy, no reward for a follow, the four streak-protection bounds |
| `npm run test:billing`, `npm run test:coding-auth` | exit 0 |
| `npm run test:client` | exit 0; 12 files, 111 tests (12 new in `client/tests/rewards.test.tsx`) |
| `npm run build`, `npm run check:bundle`, `npm run check:unused` | exit 0; 215,700 of 243,000 gzip bytes |
| `npm run check:responsive` over `/`, `/shop` and `/profile` at 360, 390, 768 and 1280, light and dark | exit 0; 12 probes each, 0 issues |
| Chromium, `/shop` signed in against the real handlers, free and Premium, 360 and 1280, light and dark | no page errors, no horizontal overflow; How to earn reads "Streak 7 days: 4 of 7", "JavaScript: 21 of 25 levels" and "Expression engine: 3 of 10 stages"; Show all works from the keyboard; a free account's Redeem is focusable, `aria-disabled` and opens the upgrade sheet with "Premium members redeem coins for merchandise."; a Premium account with enough coins reaches the address form with a visible focus ring |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check` | clean |

Not verified here: production and migration 041 there, which are owner items in `NEEDED.md`, and the month settlement against 040's real table, which lives on the other lane (the proof used a table of the same shape from handoff section 5.1).

## 2026-09-25 — invitations (D8b, #228)

What changed: every account has an invite link, `/?ref=<code>`. The browser keeps the code from the link and offers it after sign-in; the server binds it once, and only while the account is at most 48 hours old by the creation time Supabase Auth reported. When the invited friend finishes a first Learn level, both accounts get 100 coins, once. An inviter is paid for at most 20 friends; past that the friend is still paid. Rewards gains "Invite a friend" with the link, a copy button and the counts, and the ledger reads "Referral: a friend finished their first level". Migration 042 adds `referral_codes`, `referrals`, the `referral` ledger reason and four service-role routines.

Local evidence, all executed on the lane branch head:

| Check | Result |
| --- | --- |
| Migration 042 on Postgres 16 (template with the shim and 001–038, then 039 and 041) | applied twice with `ON_ERROR_STOP=1`, exit 0 both times |
| Rolled-back exercise of 042 | exit 0, 59 checks: the reason check keeps `milestone` and `social`; one stable eight-letter code per account; a bind inside the window, a second bind and a move to another inviter refused, the account's own code and a reversed pair refused (`self`), an unknown or malformed code, an account older than 48 hours and a missing creation time bind nothing; `waiting` before a passed level and for a failed one; then 100 to each side, the friend under `referral:<account>` and the inviter under `referral:friend:<random key>` with no trace of the friend's id; a second completion `already`, balances unchanged; no XP, stats, award or XP-credit row written; 21 friends of one inviter: 20 paid, the 21st `capped` and still paid, raising the cap later reopens nothing, a friend's deletion frees no place; `authenticated` and `anon` cannot call any routine or read `referrals`, and read only their own code; deletion removes the code and the account's own row and pays a waiting friend of a deleted inviter (`orphaned`) with nothing for the deleted account |
| Two sessions at once, committed scratch database | the same friend settled twice: `credited` and `already`, 100 each; two friends competing for the inviter's last place under the cap: `credited` and `capped`, the inviter ends at exactly 20 lines |
| Real handlers against that database through a PostgREST/Auth stand-in | 31/31: the link carries a code and counts and no account id; a 5-minute-old account binds an upper-case code, a second bind is `already`; the inviter sees one waiting and nobody's id; own code `self`; a 5-day-old account `closed`, also with a creation time in the body; malformed 400; unknown `unknown`; nothing paid before a level; a first HTML level pays the friend 5 XP coins plus 100 and the inviter 100, with the inviter's wallet showing no friend id; a replayed completion, a re-pass, a second level and a wallet read pay nothing more; an inviter at 20 is not paid while the friend is; grant 0 turns the link off and a claim answers `off`; account deletion of inviter and friend |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0; adds the invitation contracts: the defaults and the clamp, service-role routines with a pinned `search_path`, no browser policy on `referrals`, `credit_referral` writing only ledger tables (the referral row, and the wallet through `credit_tokens`), the replay guard, the passed-level wait, the cap lock, the self check and the window, and the handler against a stand-in (counts without ids, a body creation time or amount ignored, a malformed code reaching no routine); two were mutation-checked to fail when their rule is removed |
| `npm run test:client` | exit 0; 13 files, 127 tests (16 new in `client/tests/referral.test.tsx`) |
| `npm run build`, `npm run check:bundle`, `npm run check:unused` | exit 0; 216,675 of 243,000 gzip bytes |
| `npm run test:billing`, `npm run test:coding-auth` | exit 0 |
| `npm run check:responsive` over `/shop`, `/profile` and `/` at 360, 390, 768 and 1280, light and dark | exit 0; 12 probes each, 0 issues |
| Chromium, the real client build signed in against the real handlers, 360 and 1280, light and dark | no page errors, no overflow; the headings run Your coins, How to earn, Invite a friend, Merchandise; the link field holds `/?ref=<code>`, "Copy link" works from the keyboard with a 3px focus ring and the clipboard holds the link; "3 of 20" and one waiting; nothing in the section under 44px; a new account opening the link signed in sees "Invitation accepted", the address bar loses `ref`, the stored code is cleared and the row names the inviter; its Rewards shows the invited note and a 46px "Go to Learn" |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check` | clean |

Not verified here: production and migration 042 there, which are owner items in `NEEDED.md`, and a real Google sign-up carrying the code through the OAuth redirect (the browser check restored a session instead of running Google's consent screen).

## 2026-09-25 — merchandise through Spreadshop (D9, #229)

What changed: Spreadshop (sprd.net AG) prints, sells and ships devShark merchandise, and the app links out to it without any script, iframe or CSP change. `MERCH_SHOP` in `client/product-catalog.ts` holds the shop's URL and one per item, all null until the owner sets them. Each Rewards tile shows the mockup the build found under `client/public/merch` (none yet), "Buy at the devShark shop" when its URL is set, and a "With coins" group with the coin price and Redeem; the cash price left the tile, and an unconfigured item still reads "Not on sale yet". The hoodie joins the catalogue in the t-shirt sizes. The redemption form takes focus, fills from shipping autofill and says the address goes to sprd.net AG and is deleted with the account. `/dev` gains a Merchandise tab for quotes and coin prices, this month's caps and the fulfilment queue. Spreadshop's own monthly promotion appears when `SPREADSHOP_API_KEY` and `SPREADSHOP_SHOP_ID` are set, read on the server and kept 30 minutes. Migration 043 widens both SKU checks, adds `set_merch_stock`, and restates `advance_merch_order` and `cancel_merch_order` so a claimed learning-path package, which 035 leaves awaiting payment at zero, can be sent without releasing a redemption's reservation.

Local evidence, all executed on the lane branch head:

| Check | Result |
| --- | --- |
| Migration 043 on Postgres 16 (template with the shim and 001–038, then 039, 041 and 042) | applied twice with `ON_ERROR_STOP=1`, exit 0 both times; also exit 0 on the 001–038 template alone, where a hoodie stock row fails the old check before 043 |
| Rolled-back exercise of 043 | exit 0: both checks carry the hoodie; caps set, re-set and refused for a wrong size, an unknown SKU and a negative figure; a hoodie redemption paid 10,000 coins, reserved one unit and left 2,000; a cap below the reserved unit refused (`below_reserved`), the next hoodie refused `out_of_stock` with nothing debited; submitted, then shipped with carrier and tracking, using the unit up; a claimed package submitted and shipped from `awaiting_payment`, using the mug budget and keeping a redemption's reservation; cancelling a second package released nothing; an unpaid cash order refused `order_not_paid`; the three routines definer, empty `search_path`, service role only; `merch_stock` still has RLS and no policy, and a signed-in learner can neither set nor read it |
| Real handlers against that database through a PostgREST/Auth stand-in | 30/30: `op=shop` lists five items with the hoodie in S to XXL, the mug and cap `unconfigured`; a learner cannot set a cap (403); a wrong size refused (400); a free account's hoodie answered 402 `merch-redemption`; a Premium mug answered 409 "That item is not on sale yet" with no coins taken; cash checkout 409; the Premium hoodie redemption paid, debited and reserved, its ledger line a purchase; the picking list shows it with the address and items and no account id, plus the caps; submitted, shipped, and the learner sees the tracking; a claimed package appears marked, a look-alike unpaid cash order does not, and the package ships straight from the queue; `/api/settings` returns `merchPromo: null` without the keys and Spreadshop's offer, fetched once, with them |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0; adds the merchandise contracts: the hoodie's sizes, nothing priced by default, cash checkout off, 043's checks equal to `MERCH_SKUS` and its routines service-role only with no policy or learning table, one https URL slot per SKU in `client/product-catalog.ts` and no Spreadshop URL or API call anywhere in `client/src`, no Spreadshop host in the CSP, mockup file names, the promotion parser (404, expired, malformed, zone-less UTC), the 30-minute cache and no fetch without configuration, and no shop or rewards copy promising a discount; two were mutation-checked to fail when their rule is removed |
| `npm run test:client` | exit 0; 14 files, 141 tests (14 new in `client/tests/merch.test.tsx`) |
| `npm run build`, `npm run check:bundle`, `npm run check:unused` | exit 0; 217,418 of 243,000 gzip bytes |
| `npm run check:security`, `npm run check:public` | exit 0; the security policy is unchanged |
| `npm run test:paths` | exit 0 |
| `npm run check:responsive` over `/shop` and `/dev` at 360, 390, 768 and 1280, light and dark | exit 0; 8 probes each, 0 issues (signed out, without the API) |
| Chromium, a test build with `MERCH_SHOP` filled and two stand-in mockups, signed in against the real handlers, 360 and 1280, light and dark, free and Premium | no page errors, no overflow; five tiles, the two images loaded with alt text and only those two `/merch/` requests; two "Buy at the devShark shop" links, new tab, `noopener noreferrer`, 44px; "Visit the devShark shop"; the promotion and its note; nothing in the section under 44px; Premium: the hoodie opens on a size with units left, Redeem moves focus to "Redeem: Hoodie (L)" in view, autofill `shipping name`, Cancel returns focus to the tile; free: Redeem is `aria-disabled`; the claimed package reads "Claimed, waiting to be sent". The same run as an admin on `/dev?section=merch`: the queue shows the package with its address and the caps table, no overflow |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check` | clean |

Found and fixed during the check: the hoodie tile opened on a size with none left, so Redeem sent a request the cap refuses.

Not verified here: production and migration 043 there, the owner's real Spreadshop URLs and mockups, a live call to Spreadshop's Public Shop API (the parser was fed the documented payload), and a real sample order; all are owner items in `NEEDED.md`.

## 2026-09-25 — the next challenge beside the Coding heading, the brief inside the code pane

The owner asked why reloading `/coding` first showed "Your next challenge: Digit sum" and a second later "Largest number", and asked for that banner to become a small card to the right of the page heading holding only the next challenge and Continue. On a challenge page, the banner above the playground (track, tier, level, name, prompt) was to move into the code container in place of "Your code", with a green first line and no wave, the action buttons at the foot of that container, and the printed keyboard shortcuts removed. Then the footer was to lose "Learning stays free. Optional support never changes access, XP or rankings."

The cause of the swap: the Coding home worked out the next task before the account and its progress had loaded. With no progress every task is open, so it named the first task in the catalogue until the progress request returned.

What changed:

- The next-challenge card waits for the account and the progress. While they load it shows a placeholder and a disabled Continue; if progress fails it says so and offers Try again; otherwise it names the challenge. It sits to the right of the heading and moves under it below 860px. The track line and the due count are gone; the count linked to `/coding/review`, which redirects to `/coding`. The sign-in hint waits for the account too.
- The code pane opens with the green line (track, tier and level, or a path's level, then a rule and the task's name as the page heading), the prompt and the rest of the brief, then the editor, then the action bar. Hints, the skip form, confirmations and errors follow in a pane under the grid, only while they hold something. Below 1024px the puzzle or the pending note carries the brief and the actions.
- The keyboard guide and its keycaps are gone. The shortcuts still work, and the editor's `aria-describedby` points at them.
- The footer line is removed, and its key with it in English and in the retained Czech file, as the launch contract requires of an orphaned Czech key. The same goes for `coding.review.count` and `coding.shortcuts.leave`.

Local evidence, all executed on the branch head:

| Check | Result |
| --- | --- |
| Every CI step: types (API and tooling), launch contracts, coding auth, grading integrity, coding content, paths, client tests, unused, security, devShark build, public HTML, bundle, both audits | pass; coding content 480 tasks; client tests 9 files, 65 tests; initial JS and CSS 203,640 gzip bytes of 243,000; 0 vulnerabilities in both audits |
| New `client/tests/coding-home.test.tsx`: progress loading, the account loading, a visitor, a failed progress request, the card's contents | 4 of 4 pass; while loading the card names no task and Continue is disabled |
| Built client in Chromium with API fixtures: `/coding` and `js-largest-number`, `js-path-map-2`, `ts-path-generics-3`, light and dark, 1440 and 390 | the card beside the heading on desktop and under it on the phone; the green line, the prompt, the editor and the actions in one pane; no "Your code", no keyboard guide, no footer line; no overflow |
| Run, Hint and Skip at 1024, 1180 and 1440 | the action bar is one row at the foot of the pane; the results pane ends level with it; the hint and the skip form open under the grid; Ctrl+Enter still runs; the editor's description reads the shortcuts |
| A puzzle task (`js-sum-array`) at 390 | brief, puzzle and actions in one pane; ids unique; no overflow |
| Browser specs `public` and `evolving`, the harness check, Storybook | pass; harness 141 assertions; Storybook 5 of 5 |
| `npm run check:responsive` on the CI routes at 7 widths and in dark Czech, then `/coding`, `/coding/javascript`, two challenge pages and `/coding/fullstack` at 6 widths, and dark `/coding` and a challenge page at 3 widths | 0 issues (the sweep has no API, so there the challenge pages show their load-error state; the workbench itself is covered by the fixture runs above) |
| Lighthouse on `/` | mobile 0.85, accessibility 1. Desktop varies on one build: 0.99 with CLS 0.066 in two of three repeat runs, 0.75 in the third, where `main#main-content` shifts (CLS 0.98). The July baseline recorded the same shift in production (0.959). This change touches the home page only through the footer line. |
| `git diff --check` | clean |

In production after the deploy of `0910d1e`, whose "Product quality" run passed on GitHub (the run for `9ecaf04` was cancelled by that newer push, which carries the same code):

| Check | Result |
| --- | --- |
| Chromium on devshark.app with every GET replayed through curl, at 1440 and 390, bundle `main-Dkp2Rm6y.js` | 20 of 20 checks pass. The card reads "Your next challenge", the task and Continue, beside the heading on desktop and under it on the phone. The brief line reads "JavaScript · Foundations · Level 6", then "Largest number", in `rgb(45, 122, 45)` with no kicker wave. The brief and the actions sit in the pane that shows. No "Your code", no printed shortcuts. The footer holds Support, How we curate, Privacy, Terms and the two controls. No overflow, no page errors. |
| Signed in | not checked here; the owner step is in `NEEDED.md` |

## 2026-09-25 — the freemium lanes together (INT, #219 to #230)

What changed: one branch now carries both freemium lanes and main. Lane A brings tiers and the 402 locks, Stripe billing, the public Premium copy, coins, invitations and Spreadshop merchandise (D0 to D3, D8, D8b, D9). Lane B brings the 30-day leaderboard, difficulty labels, the debugging paths and the Easy waves (D4 to D7). Main brings the kickoff, the webdev-bank contract and the Coding card and code pane. On top of the merges:
- The free coding set is re-picked for 695 tasks: 75 standalone challenges plus stage one of the 29 projects and paths, 104 tasks or 15.0 %.
- Migration 044 erases an account with one `delete_user_data` and adds the `question_edits` importance check.
- `deleteAccount` calls the four later erasure routines in one loop that tolerates PostgREST's "Could not find the function" answer.
- The Coding home's next-challenge card also waits for the plan.

Local evidence, all executed on the integration branch:

| Check | Result |
| --- | --- |
| Migrations 039 to 044 on Postgres 16 from the 001–038 chain | 039, 040, 041, 042, 043 and 044 applied in order with `ON_ERROR_STOP=1`, then 044 again, exit 0 each. This was done twice: once as the chain leaves `question_edits`, and once with its check dropped first, which is production's shape. The whole 039–044 chain applied a second time over the first database also exits 0. Both databases end with exactly one `question_edits_importance_check` |
| Rolled-back exercise of 044, on both databases | exit 0, identical output. Importance NULL, 1 and 10 are stored; 0 and 11 are refused. `delete_user_data` is a definer with an empty `search_path`, executable by `service_role` only; `authenticated` and `anon` are refused. An account with rows in the 039–042 tables, the wallet, two merchandise orders and two package claims keeps no row under its id anywhere in the catalog, and a second account's rows are unchanged. A settled month keeps the rank as `deleted-account`, and a referral it made keeps the friend under `deleted-account`. Its never-sent order, the order's items and the order's claim are gone. Its order already with Spreadshop is redacted, and that claim reads `deleted-account:<order id>` and still ships through `advance_merch_order`. A second call and the four older routines afterwards delete nothing. Nothing is left after rollback |
| Catalog coverage | every table in the 001–044 schema with an account column is named by `delete_user_data`; in the 001–038 chain, `path_reward_claims` (035) was not |
| The real `api/user/[op].ts` deleting an account through a PostgREST/Auth stand-in that answers a missing routine as PostgREST does | 039 to 044: 200, no row left, the second account unchanged. 039 to 043 without 044: 200, only the two package claims left, which is what 044 adds. 039 and 041 to 043 without 040: 200. The code before this step on that last shape answers 500 after `delete_user_data` has run, because its calls for 040 and 039 did not recognise PGRST202 |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0. Adds `erasureContracts()`: the newest `delete_user_data` keeps 033's tables and erases every table a later migration creates with an account column; a settlement loses the person; the routine stays definer, pinned and service-role only; the importance check is guarded; the API ends billing first, calls `delete_user_data` and then the four later routines, and tolerates a missing one. Three mutations were checked to fail: dropping the 040 line, dropping the 035 lines, and `isRpcMissing` in the loop |
| `npm run test:coding` | exit 0; 695 tasks: JavaScript 281, TypeScript 146, React 168, system design 45, Algorithms 55. Easy 462, Medium 151, Hard 82. Coverage is enforced |
| `npm run test:paths`, `npm run test:grading-integrity`, `npm run test:billing` (24 checks), `npm run test:coding-auth` | exit 0 each |
| `npm run test:client` | exit 0; 18 files, 181 tests. New: the Coding home card waits for a free account's plan and then names a free challenge; the stage list keeps its difficulty runs and draws later stages as Premium that open the sheet; a Premium row sits inside its difficulty band; the code pane's first line carries the difficulty. Each was checked to fail without its merged line |
| `npm run typecheck:tooling --prefix client` | exit 0 |
| `npm run check:security`, `npm run check:unused` | exit 0 |
| `npm run build`, `npm run check:public`, `npm run check:bundle` | exit 0; 13 public URLs; 218,351 of 243,000 gzip bytes |
| `npm run check:responsive` over `/coding`, `/coding/javascript`, a task page, `/leaderboard`, `/shop` and `/premium` at 360, 390, 768 and 1280, light and dark | exit 0; 24 probes each, 0 issues |
| `tests/browser/evolving.spec.ts` against the built preview, light and dark | 2 passed, axe included; the code pane's first line shows the stage, the title "Form wizard · 2" and the Easy badge, and the stage list shows its Easy, Medium and Hard runs |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check` | clean |

Not verified here: production, where migrations 039 to 044 are not applied, and any signed-in check against the real Supabase and Stripe. These are owner items in `NEEDED.md`.

## 2026-09-25 — the cleanup sweep (CLEAN, #231, #234, #235)

What changed: five fixes from the audit report (#231), the markdown sweep (#234) and the dead-code sweep (#235).
- The CSS purge keeps the runtime-composed `lp-state--*`, `lp-criterion--*` and `lp-trace__cell--*` classes, and the build fails if a listed runtime-composed class goes missing.
- The CSP `connect-src` allows `https://*.ingest.de.sentry.io`, so browser errors can reach Sentry.
- Submit returns only the visible checks' console output: `runInSandbox` starts hidden calls after the shown ones settle and cuts the logs there. The learning-path grader uses the same split.
- Every segmented control shows the track through an unselected segment in both themes; the rule lives in Astryx's `astryx-base` layer.
- Stale Markdown is corrected or deleted, `NEEDED.md` carries valid markers on every task, and the exports, scripts and the one file that nothing imports are gone.
- Not ported: the Classroom rate-limit fix `fa884b7` from `claude/elegant-cori-h9cdgb`. `git cherry-pick -n fa884b7` conflicts in `lib/rate-limit.ts` (D2 already added an `identity` argument with another key scheme) and in `scripts/test-launch-contracts.ts`. `NEEDED.md` carries it as an agent task.

Local evidence, all executed on the final tree:

| Check | Result |
| --- | --- |
| Client build without `/^lp-/` in the safelist | exit 1, naming the ten `lp-` modifier classes |
| Client build with it | exit 0; all ten ship in the ActivityViews stylesheet. Of 828 source classes, the 20 still missing from the build are dead CSS no TS or TSX file names |
| `npm run check:security` with the old `vercel.json` | exit 1 on the Sentry ingest assertion; with the new one, exit 0 |
| `npm run test:grading-integrity` | exit 0. New: without a split every log returns; with one, a hidden call prints nothing, whether it settles first or hangs; an anonymous Submit of `js-digit-sum` that logs its argument passes 3 of 3 hidden checks and returns the five visible inputs only. With `shownCalls` removed from `gradeCode` the Submit case fails |
| `npm run test:coding` | exit 0; 695 tasks, every reference solution proven under the split grader |
| `tests/browser/segmented.spec.ts` (`/roadmap`, `/leaderboard`, light and dark, 1280 px) | against the previous build the two `/roadmap` cases fail (unselected segments `rgb(239, 239, 239)` and `rgb(107, 107, 107)`); against this build 4 passed: transparent at rest, Astryx's hover still paints, axe color-contrast clean |
| `tests/browser/segmented.spec.ts`, `evolving.spec.ts`, `public.spec.ts` against the final preview | 11 passed |
| `npm run check:responsive` over `/`, `/quiz`, `/roadmap`, `/leaderboard`, `/premium`, `/coding` at 360, 390, 768 and 1280, light and dark, `--block-external` | exit 0 each; 24 probes, 0 issues |
| `npm run typecheck:api`, `npm run test:launch`, `npm run test:paths`, `npm run test:coding-auth`, `npm run test:billing` (24 checks) | exit 0 each |
| `npm run test:client` | exit 0; 18 files, 181 tests |
| `npm run typecheck:tooling --prefix client`, `npm run check:unused` (1 reviewed finding left) | exit 0 each |
| `npm run build`, `npm run check:public`, `npm run check:bundle` | exit 0; 13 public URLs; 218,305 of 243,000 gzip bytes |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check` | clean, on the tree and on the step's range |

Not verified here: Sentry receiving a real browser event after deploy, and anything signed in.
