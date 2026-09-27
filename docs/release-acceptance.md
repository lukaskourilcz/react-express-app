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

*25 September 2026:* the paragraph above describes the product of 9 September.
The owner made devShark freemium on 25 September 2026: `shared/tiers.ts` now
decides what each account may start, and the shop still gates no learning.
Spreadshop sells the merchandise for cash, and coins redeem it for Premium
accounts; cash checkout in this app stays off.

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

## 2026-09-25 — the freemium steps without a section of their own (D0, D1, D4 to D7)

D2, D3, D8, D8b, D9, INT and CLEAN have sections above. This one records the rest from the step reports of the lane sessions: lane A ran D0 to D3, D8, D8b and D9 on `wip/dev-lane-a`, lane B ran D4 to D7 on `wip/dev-lane-b`, and INT merged both. Each result is the command's exit code on that lane's head at the end of the step.

### D0 (#219): the protected invariant

`CLAUDE.md`, `AGENTS.md`, the header of `shared/rewards.ts` and `docs/product-architecture.md` ("Tiers and billing") state the freemium rule (`a0a9843`, `438e724`). The permission classifier of that session refused three edits (the product-context skill, the design auditor, the implement-screen command); `4dded3d` made them before INT.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run test:launch` | exit 0 each |
| `git diff --check e668c67 HEAD` | exit 0 |
| D0's acceptance grep over `CLAUDE.md`, `AGENTS.md`, `shared/rewards.ts` and `.claude/` | one match at the end of D0 (the product-context skill, line 18); no match after `4dded3d` (exit 1, run by INT) |

Not run: the build, the responsive sweep and the audits; D0 changed documentation and comments only.

### D1 (#220): tiers, the 402 locks and manual grants

`shared/tiers.ts`, migration 039 (three tables, one private live-grant helper and the service-role routines around it), `lib/access.ts` with a 402 at every call site that starts content, `op=entitlement`, admin `op=entitlements`, and the client locks and upgrade sheet. At the time 70 of 480 coding tasks were free; INT re-picked 104 of 695.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run test:launch`, `npm run test:paths`, `npm run test:coding-auth` | exit 0 each |
| `npm run test:coding` | exit 0; 480 tasks, index fresh |
| `npm run test:client` | exit 0; 9 files, 69 tests (8 new) |
| `npm run build`, `npm run check:bundle` | exit 0; 207,057 of 243,000 gzip bytes |
| `npm run check:responsive` at 360, 390, 768 and 1280, light and dark | exit 0; 128 probes each, 0 issues |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, `git diff --check` | exit 0 each |
| Migration 039 on Postgres 16 from the 001–038 chain | applied twice with `ON_ERROR_STOP=1`, exit 0 both times; the rolled-back exercise covered grant and regrant, revoke, an expired promotion, a provider grant from active through `past_due` in and past the seven-day grace to canceled, a sticky revoke, a manual revoke that leaves provider grants, owner conflicts, a duplicate event, a customer link and its conflict, a past `validUntil` refused, owner-only reads, refused writes for `authenticated` and `anon`, and deletion; nothing left after rollback |
| Real `api/quiz/roadmap.ts`, `api/user/[op].ts` and `api/admin/[op].ts` through a PostgREST/Auth stand-in | 37/37: 402 `premium_required` with the right `kind` and `ref` from every locked call site, 200 for open content, cleared content of a lapsed account, a paused path and guest previews; a manual grant opens the same account without a restart and a revoke closes it again |
| Chromium, a free account signed in, 360 and 1280, light and dark | 15 Premium nodes on React parts 2 and 3 read "…, Premium" with `aria-disabled`; Enter opens the sheet with the price and VAT; 75 Premium rows on the JavaScript track; the locked task page and stage notes; the plan line reads "Free". The 360 px map label crowding it showed was fixed in `23d7bd3` |

### D4 (#223): the 30-day leaderboard

Migration 040 dates every verified answer in `user_activity_days`, `window_leaderboard` ranks the last 30 days, and the rebuilt `/leaderboard` opens on that board.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run test:launch`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:client` | exit 0; 8 files, 71 tests |
| `npm run build`, `npm run build:storybook` | exit 0 each |
| `npm run test:browser` (Storybook and the local preview) | exit 0; 13 passed. An earlier run failed once on `evolving.spec.ts` after a partial build had dropped `dist/sandbox`; after a full build the spec passed twice alone and in the suite |
| An axe sweep of every leaderboard story in dark mode at 360 and 1280 | 10 tests, 0 violations |
| `npm run check:responsive -- --routes /leaderboard` at 360, 390, 768 and 1280, light and dark | exit 0 each |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, `git diff --check e668c67..HEAD` | exit 0 each |
| Migration 040 on Postgres 16 from the 001–038 chain | applied twice, exit 0; the rolled-back exercise: a quiz receipt counts once, a daily retry adds nothing, a Learn answer counts once and an anonymous one not at all, a challenge run counts once and a zero-XP run not at all, the 30-day edge, the category filter, the five-answer minimum, ties sharing a rank, `friend_list` ordered by correct answers, eight definer routines for `service_role` only, owner-only reads and erasure |

Not done in D4: the country flag on each row (an owner decision in `NEEDED.md`), a pinned own row on All time and Today, and folding the erasure into `delete_user_data` (INT did that in 044).

### D5 (#224): Easy, Medium and Hard

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run test:launch`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:coding` | exit 0; 480 tasks: 257 Easy, 142 Medium, 81 Hard |
| The coverage matrix with enforcement switched on (`CODING_COVERAGE_ENFORCED=1`) | exit 1 as intended, 42 Easy-band gaps; D7 closed them and switched enforcement on |
| `npm run test:client` | exit 0; 9 files, 80 tests |
| `npm run build` | exit 0 |
| `npm run check:responsive` over seven coding routes at 360 and 1280, light and dark | exit 0; 14 probes each, 0 issues |
| `tests/browser/evolving.spec.ts` and `public.spec.ts` | exit 1 on the first run (the dark React harness case timed out at a load average near 7 on 4 CPUs), then `evolving.spec.ts` alone exit 0 twice |
| A one-off axe pass over `/coding`, a track, a Hard stage and a task page, 360 and 1280, light and dark | 0 violations |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, `git diff --check` | exit 0 each |

Not run: `tests/browser/storybook.spec.ts` (no Storybook build; D5 changed no story), so `npm run test:browser` as a whole did not run.

### D6 (#225): the debugging paths

| Check | Result |
| --- | --- |
| `npm run test:coding` | exit 0; 495 tasks, every solution proven; 262 Easy, 151 Medium, 82 Hard |
| `npm run typecheck:api`, `npm run test:launch`, `npm run test:grading-integrity`, `npm run test:paths` | exit 0 each |
| `npm run test:client` | exit 0; 10 files, 93 tests (10 new) |
| `npm run build`, `npm run check:bundle`, `npm run check:unused`, `npm run check:security` | exit 0 each; 204,176 of 243,000 gzip bytes |
| `npm run check:responsive` over `/coding` and Log it right level 1 at 360 and 1280, light and dark | exit 0; 4 probes each, 0 issues |
| The shared console in a real Chromium worker and in the QuickJS sandbox | the same table, groups and counts in both |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, `git diff --check` | exit 0 each |

Not run: `npm run test:browser` (no browser spec covers these screens). Found and left for later: the Console could show the inputs of hidden checks after Submit; CLEAN fixed it in `ed5ce6f`.

### D7 (#226): the Easy band doubled

Eight waves on `wip/dev-lane-b`, each checked on its own head. In every wave `npm run test:coding`, `npm run build:coding-index`, `npm run typecheck:api`, `npm run test:launch`, `npm run test:client` (10 files, 93 tests), `npm run build`, `npm run check:bundle`, `npm run test:grading-integrity`, `npm run test:coding-auth`, `npm run check:unused`, both production audits and `git diff --check` exited 0, and a planted break of the content contract exited 1 as intended.

| Wave | Commits | Tasks after it | Also |
| --- | --- | --- | --- |
| JavaScript 1 | `8c69515`, `797037e`, `6c603f0` | 525 (292 Easy) | one content contract for every Easy wave |
| JavaScript 2 | `8dc24c7`, `ead21fb` | 555 (322 Easy) | |
| JavaScript 3 | `da7241d`, `230fc80` | 585 (352 Easy) | |
| TypeScript 1 | `fb202df`, `4f8be82` | 610 (377 Easy) | the enforcement preview listed no TypeScript gap |
| TypeScript 2 | `1f2cea8`, `e94e5f9` | 635 (402 Easy) | |
| React 1 | `a16e547`, `d3b9002`, `8ca2b4e` | 655 | React challenges gain hidden cases; two `test:launch` bites exit 1 as intended |
| React 2 | `d1caa9a`, `04759e0` | 675 | |
| Algorithms | `ac200a5`, `143d1d2`, `77e6285` | 695 (462 Easy, 151 Medium, 82 Hard) | coverage enforced; removing the wave exits 1; a one-off run of 103 wrong answers and 10 correct alternatives against the 20 starters exits 0 |

Not run in the waves: `npm run check:responsive` and `npm run test:browser` (no layout, component or story changed; React 1 added one `<small>` to the results summary), `npm run build:curation-registry` (`CODING_TASKS_AUDITED` is false), and `npm run test:react-isolation` for the React waves (it needs Vercel Sandbox credentials).

A ninth wave, twenty-five Medium and Hard JavaScript challenges (`af8df50`, `3933db9`, `5f08ecd`, 720 tasks), sits on `wip/dev-c`. Its checks exit 0 there; once, between two of ten complete runs of its one-off wrong-answer harness, QuickJS aborted on a GC assertion and the process exited before its summary. It is not merged into this integration branch, whose index holds 695 tasks. MERGE-C merged it on 2026-09-26 with the two waves that followed it; see the section after this one.

## 2026-09-25 — the freemium sweep (D10, #230)

What changed: the files that still called devShark free now describe the free tier and Premium, and the history documents keep their words with a line dated 25 September 2026. The brand system's rule, the design thesis, three September plans, the UX audit, the visual QA checklist, the runbook, the growth notes and one paragraph above were swept; `README.md` states both tiers in one paragraph; `about-project.md` makes its Stripe row true; `monetization.md` records Premium as the decision with the handoff's fee arithmetic; `scaling.md` adds Stripe's fees and the base cost of a merchandise redemption. `NEEDED.md` carries each owner item of the handoff's section 11 and of every step report once. `HANDOFF.md` was already gone (CLEAN, `acb91fa`). In code:

- The quiz prompt that asked for voluntary support after every tenth good quiz is gone with its module; `test:launch` now fails if any client file links to `/support`.
- The Rewards fairness note said no purchase changes streaks, while the same page sells a streak protection; it now says what a protection changes. The `quiz.support*` values (unrendered, kept for the Czech parity rule), the Rewards subtitle and the comments in `Shop.tsx`, `lib/topic-grants.ts` and migration 035 (a dated note; the SQL is unchanged) say the same.
- The landing printed "2,487 questions", a count set on 3 September. The bank holds 2,447 authored questions; the audit's gate withholds 154 and the three retired sections hold 319 that the server refuses to deliver, which leaves 1,974. `questionCount` is 1,974 and `test:launch` recomputes it.

Local evidence, on `2abfd35` (the commit after it adds this section only):

| Check | Result |
| --- | --- |
| The #230 acceptance grep over every Markdown file | three lines: the dated history lines in `docs/design/brand-system.md` and `docs/design/design-thesis.md`, and line 389 of `SECOND-HANDOFF-25-9-2026.md`, the dated handoff that orders this sweep and names the old heading |
| `npm run typecheck:api` | exit 0 |
| `npm run test:launch` | exit 0; with a planted `navigate('/support')` in `Quiz.tsx` exit 1, and with `questionCount` back at 2487 exit 1 |
| `npm run build`, `npm run check:bundle` | exit 0; 218,282 of 243,000 gzip bytes |
| `npm run check:public` | exit 0; 13 URLs |
| `npm run check:security`, `npm run check:unused`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:client` | exit 0; 18 files, 181 tests |
| `npm run check:responsive` over `/`, `/quiz`, `/shop` and `/premium` at 360, 390, 768 and 1280, light and dark (vite preview, `--block-external`) | exit 0; 16 probes each, 0 issues |
| Headless Chromium on the preview | the landing stat reads "1,974 questions"; `/shop` shows the new subtitle and fairness note |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0; 0 vulnerabilities |
| `git diff --check`, and over `94102c6..2abfd35` | exit 0 each |
| `needed_lint.py` (the own-dashboard marker parser) over `NEEDED.md` | 75 open, 20 ticked, 0 violations |
| The month settlement of 041 against 040's real table: Postgres 16, `rea_base` plus 039 to 044 in order (exit 0 each), then a rolled-back exercise | exit 0: 040's upsert sums two writes for one day; the open month reports `open`; August settles once with ranks Q (Premium, 300 coins), P (Premium, 200) and F (free, nothing), an account under five answers is left out, and a second call answers `already`; 044's erasure leaves rank 1 as `deleted-account` and no row of the erased account in 040's table or the ledger. D8 had proved this only against a stand-in table |

Not run for D10: `npm run test:coding`, `npm run test:paths`, `npm run test:billing` and `npm run test:browser`; D10 changed no coding content, path, billing code or story. The markdown checkup covered the four root files and the documents above; CLEAN's whole-repository pass of the same day stands for the rest.

## 2026-09-25 — freemium checks that could not run here

Every row below is **not run**, and each has an owner item in `NEEDED.md`.

| Check | Why it could not run | What runs it |
| --- | --- | --- |
| Migrations 039 to 044 in production, and their rolled-back exercises there | the steps may not write to production | the owner, through the Supabase connector, in the order 039, 040, 041, 042, 043, 044 |
| Every signed-in flow against production: the locks and a manual grant, Rewards and coins, an invitation, the fulfilment queue, the 30-day board, the debugging paths | production has 001–038 only and no test account session exists here | the owner's checks in `NEEDED.md` |
| A Stripe test-clock simulation, fixtures captured with `stripe trigger`, Checkout's rendering of the consent and order-button text, Managed Payments approval, the Customer Portal, and real webhook delivery through Vercel's raw-body replay | no Stripe account exists; the webhook tests use fixtures written from the API reference | the owner's Stripe sandbox |
| A live call to Spreadshop's Public Shop API, and a real sample order | no API key and no shop yet | the owner's Spreadshop account |
| A Google sign-up carrying an invite code through the OAuth redirect | the browser check restored a session instead of running Google's consent screen | production |
| `npm run test:react-isolation` | needs Vercel Sandbox credentials and a snapshot id | CI or a machine with those credentials |
| `npm run build:curation-registry` for coding tasks | `CODING_TASKS_AUDITED` is false, so coding tasks are outside the audit's scope | a coding audit |
| Sentry receiving a browser error after the CSP change | needs a deploy | the owner, after the next deploy |
| The lawyer's review of the Terms, the privacy policy, the checkout wording and the public cancel page | legal advice | the owner's lawyer |

## 2026-09-26 — the Medium and Hard waves merged (MERGE-C, #226)

What changed: `wip/dev-c` is merged into the integration branch (`0a72de1`). It carries the three Medium and Hard waves of #226: JavaScript A (`js-mh-*`, 15 Medium and 10 Hard), TypeScript A (`ts-mh-*`, 6 and 4) with React A (`react-mh-*`, 9 Medium, 4 Hard and 2 tier 5 capstones), and Algorithms A (`alg-mh-*`, 8 and 7) with JavaScript B (`js-mh2-*`, 10 Medium). On top of the merge:

- `shared/coding-index.ts` was regenerated rather than merged by hand: 770 tasks.
- The free coding set was re-picked (`5fcf196`). The waves added 75 tasks and no Easy one, so the share had fallen to 104 of 770 (13.5 %). Twelve Easy standalone tasks joined `FREE_CODING_TASK_IDS`, each on a technique the new challenges combine most and the free set had least of. 116 of 770 tasks are free, 15.1 %; every earlier pick stays.
- README, `about-project.md` and the architecture restate the counts from the index (`8e9c789`).
- `NEEDED.md` takes the lane's three items into the D4 to D7 block: the extended tier-ladder decision, a preview check of the two slowest React challenges, and the React timer item.

Where #226 ended: 549 standalone tasks, which is the issue's "about 550". The Easy standalone challenges of the four section tracks went from 73, 26, 33 and 11 to 163 (JavaScript), 76 (TypeScript), 73 (React) and 31 (Algorithms), exactly the +90, +50, +40 and +20 it asked for. The Medium and Hard waves added 75. Coverage is enforced and passes in all four tracks with no short tag. The fewest Easy challenges behind a tag on a Medium challenge is 3 in JavaScript, TypeScript and React, and 5 in Algorithms.

Local evidence:

| Check | Result |
| --- | --- |
| `npm run build:coding-index` | exit 0; 770 tasks. Regenerated after the merge and again after the re-pick |
| `npm run test:coding`, three full runs (the tree of `8e9c789`, then `8e9c789` twice) | exit 0 each, 4 min 2 s, 4 min 9 s and 4 min 2 s. 770 tasks: JavaScript 316, TypeScript 156, React 183, system design 45, Algorithms 70; Easy 462, Medium 199, Hard 109. The matrix: JavaScript 163 Easy, 41 Medium, 38 tags; TypeScript 76, 22, 25; React 73, 26, 20; Algorithms 31, 18, 9; 0 short. The React timer check that failed five of eight runs on the lane did not fail here |
| Coverage bite: one Easy challenge taken out of its task file, with `CODING_ONLY='^zzz' CODING_SKIP_INDEX=1` | exit 1 in each track. JavaScript without `js-easy3-form-complete`: `every` has 2 Easy, and `js-mh-sudoku-check`, `js-mh-deep-equal` and `js-mh-match-route` fail the band check. TypeScript without `ts-chunk-a-list`: `slice`, and `ts-mh-page-after-cursor`. React without `react-easy3-dispatch-through-context`: `useReducer`, and `react-mh-basket-context`. Algorithms has at least five Easy challenges behind every tag, so three had to go (`alg-easy2-binary-strings`, `alg-easy2-mirror-tree`, `alg-easy2-path-sum`): `recursion`, and six `alg-mh-*` challenges. Each file was restored with `git checkout`; the tree was clean after each |
| One-off count check: every task count in README, `about-project.md` and the architecture against the index | exit 0; 8 of 8 statements match |
| `npm run typecheck:api` | exit 0, after the merge and on the final head |
| `npm run test:launch` | exit 0, after the merge (104 free), after the re-pick and on the final head |
| `npm run build` | exit 0 (the existing warning about chunks over 500 kB) |
| `npm run check:bundle` | exit 0; 218,390 of 243,000 gzip bytes |
| `npm run test:client` | exit 0; 18 files, 181 tests |
| `npm run test:coding-auth`, `npm run test:grading-integrity`, `npm run test:paths`, `npm run check:unused` | exit 0 each |
| `git diff --check` | clean, for the tree and for `214c2f4..HEAD` |

Not run: `npm run test:react-isolation` (needs Vercel Sandbox credentials; the two slowest new React suites have an owner check in `NEEDED.md`), `npm run build:curation-registry` (`CODING_TASKS_AUDITED` is false), `npm run check:responsive` and `npm run test:browser` (no layout, component or story changed), and the dependency audits (no dependency changed).

## 2026-09-26 — the review's fixes (FIX, #219 to #235)

What changed: three reviewers read `origin/main...HEAD` for integrity, data and product defects, verifiers kept 24 findings, and this step fixed each one. A container restart stopped the first run after twelve commits (`5c7cc5f` to `5d95c77`); the resumed run checked each of them against its finding and test, then did the rest. Every code finding has a test; each test this run added was checked to fail without its fix.

| Finding | What was wrong | Fixed in | Proven by |
| --- | --- | --- | --- |
| integrity-1 (high) | the public cancel endpoint refunded, cancelled and revoked for anyone who knew a subscriber's email | `fce0b21`, `f2b3370`, `eea07fd` | `test:billing` (anonymous request makes no Stripe call and answers the same either way; the emailed link acts once, expires, survives an outage; three links an hour; a signed-in owner acts at once); client tests of the page; the SQL exercise below; the privacy policy names what the page keeps |
| integrity-2 (high) | the 14-day refund was measured per subscription, so withdrawing and subscribing again restarted it | `fce0b21` | `test:billing` "the voluntary refund is taken once per account"; SQL exercise |
| integrity-3 (medium) | a refund, dispute or withdrawal kept milestone coins, doubled coins and unsent redemptions | `fce0b21`; the retroactive payout is an owner decision (`2f5b530`) | `test:billing` (refund, dispute, fraud warning, withdrawal; a failing routine is retried); SQL exercise |
| integrity-4 (high) | a request without a token skipped every Premium gate | `5d95c77`, `bace111` | `test:launch` (a guest gets 402 for a Premium level, part test, topic, task, stage two, and for coding-submit and coding-reveal with a guest session) |
| integrity-5 (medium) | replaying a passed Learn level added unlimited correct answers to the 30-day board | `ba86a6e` | `test:launch`; SQL exercise |
| integrity-6 (low) | two accounts could invite each other at the same moment | `ab83766` | two-session race below |
| integrity-7 (low) | any subscription on a linked customer opened Premium | `fce0b21` | `test:billing` "only a subscription that bills a devShark Premium price opens Premium" |
| data-1 (high), data-2 (medium) | PostgREST's PGRST202 did not read as a missing routine, so no fallback before 039 and 040 fired | `5c7cc5f`, `f2bcc09`, `8475898` | `test:launch`, `test:billing`, and the new `test:fallbacks` (the real leaderboard, challenge and tier gate against a PGRST202 stand-in; fails with the old matcher) |
| data-3 (medium) | re-running 041 after 042 dropped the `referral` ledger reason | `78fb5e5` | `test:launch`; 041 and 042 re-applied below |
| data-4 (low) | 044 applied early broke every deletion, and 040 without 044 left erased accounts' dated answers | `6418441`, `2f5b530` | `test:launch`; the production-shape run below |
| product-1 (high) | merging locked the owner out, and NEEDED.md's two escapes did not work | `2f5b530` | the first item of NEEDED.md's D1 block |
| product-3 (medium) | the grace window counted from a period end Stripe has already moved on | `fce0b21`, `1a6e5d4` | `test:billing` "past_due keeps Premium for seven days from the failed renewal"; SQL exercise |
| product-4 (medium) | deleting a paid account did not say it ends Premium without a refund | `325d053` | client test |
| product-5 (medium) | the withdrawal page promised an immediate end it gives only within 14 days | `f2b3370` | client test |
| product-6 (medium) | Premium was sold with merchandise that ships closed | `555f203` | `test:launch` |
| product-7 (medium) | the docs understated what a guest could use | `5d95c77` | `test:launch`, client tests |
| product-8 (medium) | the privacy policy said people wrote the hints by hand | `555f203` | `test:launch` |
| product-9, product-11 (low) | owner checks and the Stripe setup left steps out | `2f5b530` | NEEDED.md |
| product-10 (low) | Manage billing only for a winning provider grant | `fce0b21`, `bf7319d` | client tests; SQL exercise |
| product-12 (low) | the success page kept promising checks after the last one | `bd9d2ba` | client test |
| product-13 (low) | a loading plan marked every coding row Premium | `5d95c77` | client test |
| product-14 (low) | "Change the email" dropped focus to the body | `f2b3370`, `e4c782d` | client test |

Also: `about-project.md` uses "## Tech stack" and "## Third-party libraries" like the other repositories (`ec3f594`); NEEDED.md asks for the Vercel plan decision before `BILLING_ENABLED=true` (`2f5b530`); the architecture, README, runbook and UX audit describe the new billing behaviour (`1a6e5d4`, `0373b40`); CI now runs `test:billing` and `test:fallbacks` (`f2bcc09`); the React timer item of #226 is done (`d53f4ce`, `a7befdc`); `isRpcMissing` counts Postgres's 42883 only when it names a function (`8475898`); the cancel page's client test waits for its focus move (`e4c782d`); and the preview's fetch stub serves the photos the load-more challenge asks for (`705cff7`).

### Migration proof (local Postgres 16, template `rea_base` = the Supabase shim + 001–038)

The restart had also reset the local cluster, so `rea_base` was rebuilt first: the shim, Supabase's default privileges for `anon`, `authenticated` and `service_role`, then 001 to 038 with `ON_ERROR_STOP=1`, exit 0 each.

| Check | Result |
| --- | --- |
| A: 039, 040, 041, 042, 043, 044 applied in order, the six again, then 041, 042 and 041 once more | exit 0, all 15 |
| Rolled-back exercise on A (`BEGIN … ROLLBACK`, one script) | exit 0, 61 PASS lines, nothing left after rollback. past_due counts from `past_due_since` (8 days: free although the period ends in 25; 3 days: Premium, `inGrace`; a later retry and an unknown start keep the first value; a paid renewal clears it; the four- and seven-argument drafts are gone). The summary's `billingAccount` and `subscriptionLive` under a longer complimentary grant and after a subscription ended. The refund taken once per account. Cancellation links: only the hash, the typed address, the action and the times stored; three an hour per address, case-insensitive; review uses nothing; a link is used once; handed back after an outage; expired and unknown links do nothing; rows a day past expiry purged. `revoke_premium_benefits`: nothing while the grant is live; after the revoke, the redemption placed while Premium is refunded in coins and the older one stays; 100 milestone and 20 doubled coins debited once; nothing while another grant keeps Premium; coins already spent stay spent and the debit stops at 0. Learn answers: none dated on a passed level; one per question and UTC day across attempts; yesterday's answer does not block today; a guest's never. All eight ledger reasons after the re-runs, and a `referral` line accepted. Twelve new or restated routines are SECURITY DEFINER with an empty `search_path` and `service_role`-only execute; `billing_cancel_requests` has RLS, no policy, no browser grant and no account or token column |
| B, production's shape (014's check dropped): 040, then 044 | 040 exit 0; 044 exit 3, "migration 044 needs 035 and 039 to 042 first; missing: entitlement_grants, billing_customers, billing_checkout_consents, token_xp_credits, token_month_settlements, referral_codes, referrals", and `delete_user_data` is still 033's |
| B: then 039, 040, 041, 042, 043, 044 | exit 0 each; one `question_edits_importance_check` |
| B: a dated answer of an erased account and of a live one, then 044 twice | the orphan's row deleted, the live account's kept; the second run changes nothing |
| C: two sessions offering each other's invite code at once (committed scratch database) | "recorded" and "self", one row. The same race on the 042 before `ab83766`: "recorded" twice, two rows |
| `test:billing`'s 30 checks against Postgres holding 039–044 twice, through a PostgREST/Auth stand-in that runs each call as SQL | passed; 8 links (2 used) and 2 voluntary refunds recorded by the real routines |

The scratch databases were dropped. No PostgREST binary was on the machine after the restart, so the 30-check run used the harness stand-in of D1 and D2 instead of PostgREST 12.2.12.

### The React timer checks (#226)

| Check | Result |
| --- | --- |
| Stress probe (blocks the event loop for a random 0–N ms every 40 ms), suites before the change | autosave and countdown at 70 ms: 5 failing cases in 90 runs; countdown alone at 120 ms: 14 in 120 (correct solutions read -1); every timer-using React suite at 70 ms, 1,215 runs: 2 (autosave, search); search, notices, carousel and export at 120 ms: 26 in 60 |
| Same probe, the six converted suites | 0 failing cases in 90 runs at 70 ms and 0 in 90 at 120 ms |
| A wrong solution for each converted check | caught, 7 of 7 (a wait that does not restart, an interval kept to the end, one that never stops, no debounce, a click that does not restart the slide, the next question after 50 ms, index keys) |
| `CODING_ONLY` run of the six tasks (reference, junior and senior against visible and hidden cases; starters still fail) | exit 0 |
| Five consecutive full `npm run test:coding` runs on `d53f4ce` | exit 0 each; 217, 215, 219, 216 and 216 s; 770 tasks |

### Release contract on the final head

All on `705cff7`, the last code commit; the commit that records this section changes documentation only. Every command below was run, and the exit code is its own.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0. New here: a guest's coding-submit and coding-reveal refused with 402; the privacy policy's sentences on the cancellation page and the purge behind them; an operator error is not a missing routine; the load-more solution pages to the end through the preview's fetch stub |
| `npm run test:coding-auth`, `npm run test:grading-integrity`, `npm run test:paths` | exit 0 each |
| `npm run test:coding` | exit 0; 770 tasks (JavaScript 316, TypeScript 156, React 183, system design 45, Algorithms 70; Easy 462, Medium 199, Hard 109), 216 s. With the five runs on `d53f4ce` and one on `0373b40` (217 s), seven full runs in a row passed |
| `npm run test:billing` | exit 0; 30 checks |
| `npm run test:fallbacks` (new) | exit 0 |
| `npm run test:client` | exit 0; 19 files, 193 tests |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `npm run build` (with CI's `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev`), `npm run check:public`, `npm run check:bundle` | exit 0 each; 13 public URLs; 219,540 of 243,000 gzip bytes; the existing warning about chunks over 500 kB |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0 each; 0 vulnerabilities |
| `git diff --check`, and `git diff --check 5ebdad7..HEAD` | clean |
| `npm run check:responsive -- --block-external` against `vite preview` on :4173, `CHROME_BIN` = Chromium 141 from `/opt/pw-browsers/chromium-1228` | exit 0 on the build of `705cff7` (and on `0373b40`'s): 238 probes (34 routes × 7 widths, 360 to 1440), 0 with issues, 0 unprobed |
| The same with `RESPONSIVE_THEME=dark` over `/premium/cancel`, `/premium/success`, `/premium`, `/profile`, `/privacy`, `/terms`, `/coding`, `/coding/javascript`, `/coding/react`, `/learn`, `/roadmap` and `/today` at 360, 390, 768 and 1280 | exit 0: 48 probes, 0 with issues, 0 unprobed |
| `npm run test:harness` (every React suite in the built sandbox in Chromium, as CI's browser step runs it) | exit 1 on `0373b40`: `react-mh-load-more`'s preview threw "next is not iterable", because the fetch stub answered `/api/photos` with its weather object (a defect of the #226 wave, not of this step; fixed in `705cff7`). exit 0 on `705cff7`: 196 assertions, which include the five visible suites that now run on the hand-moved clock |
| `npm run test:browser` for `public.spec.ts`, `evolving.spec.ts` and `segmented.spec.ts` against the same preview (`CHROME_BIN` as above) | exit 0 each; 5, 2 and 4 passed |

### Production order for 039 to 044

In one sitting, before the branch reaches `main`, in the Supabase SQL editor:

1. `supabase-schema-039.sql` — entitlements and billing, with the review's section 6.
2. `supabase-schema-040.sql` — the 30-day board. It needs nothing from 039.
3. `supabase-schema-041.sql` — coins. It calls 039's `is_premium` and must come before 042.
4. `supabase-schema-042.sql` — invitations. It uses 041's `token_account_key`.
5. `supabase-schema-043.sql` — merchandise caps and the hoodie. It needs only 028 and 035.
6. `supabase-schema-044.sql` — one erasure routine and 014's importance check. It refuses to run until 035 and 039 to 042 exist, and deletes dated answers that deletions left behind in the meantime.

Then give the owner's account an open-ended manual grant (`select public.grant_manual_entitlement(...)`, NEEDED.md), and only then merge. Re-running any file is safe: each was applied twice above, and 041 and 042 only add ledger reasons.

Not verified here: production (the steps may not write to it), anything against Stripe or Resend, the lawyer's review of the emailed confirmation under § 312k BGB, and PostgREST 12.2.12 itself after the restart. Each has an owner item in `NEEDED.md` or is listed under "freemium checks that could not run here".

## 2026-09-26 — Premium vouchers (VOUCHER)

What changed: Stripe stays off (`BILLING_ENABLED` unset), and a signed-in learner can now enter a voucher code on `/premium` that opens Premium for the account. The owner creates the codes in `/dev` → Vouchers. Migration 045 holds the codes as SHA-256 hashes with their first four characters, the redemptions, and five service-role routines; a redemption writes a `promo` grant that 039's `is_premium` already counts. Twelve handlers remain: `op=voucher` is a branch of `api/user/[op].ts` and `op=vouchers` of `api/admin/[op].ts`.

| Commit | What |
| --- | --- |
| `e95ac9d` | Migration 045: `premium_vouchers`, `premium_voucher_redemptions`, the four routines and their private JSON helper, `delete_user_data` restated (044's body, then the redemptions and an erased admin's vouchers); the erasure contract reads the guard of whichever migration restates the routine last |
| `4d6c6e1` | `op=voucher` (signed in, five attempts an hour per account and ten per address, one answer for every refused code, 409 only for "already redeemed", 503 `voucher_unavailable` before 045) and `op=vouchers` (admin only: create with a random or custom code shown once, list, revoke); launch contracts and `test:fallbacks` |
| `f0e5a63` | The plan line names a voucher grant: "Premium from a voucher, until …" |
| `ca81301` | "Have a voucher?" on `/premium`, first while checkout is off, with every state and a client test |
| `1b00d59` | The upgrade sheet offers "Redeem a voucher" while checkout is off |
| `cc01e33` | `/dev` → Vouchers: the form, the code once with a copy button, the list with revoke |
| `8bdb1d3` | The Terms and the privacy policy: how a voucher works, what a redemption stores |
| `daad647` | The voucher form uses Astryx's own field labels (found in the browser check below) |
| `47bd47b` | Astryx's `--color-on-accent` follows the theme's `--brand-on-accent`, so an Astryx primary button in dark mode reads at 6.69:1 instead of 2.77:1, on every screen (found by the axe pass below) |
| `5bb53d8` | The architecture, `shared/tiers.ts`, the README and the UX audit describe vouchers |

This record and the VOUCHER block of `NEEDED.md` are the last commit and change documentation only.

### Migration 045 proof (local Postgres 16, template `rea_base` = the Supabase shim with Supabase's default privileges + 001–038)

Before the proof, the local 039–044 chain was compared with production by read-only queries: the definitions of `delete_user_data`, `is_premium` and `entitlement_summary` hash the same (`00d58b4b…`, `44223388…`, `75141b52…`), and so does a fingerprint of the columns, defaults, constraints, policies and RLS flags of the tables 045 touches or erases (`e52b75f2…`). Production's default privileges grant EXECUTE on new functions to `anon` and `authenticated`, as the template does, so the revokes below are tested against the grants they remove. Production runs Postgres 17.6 and the proof ran on 16.13: the three definitions above hash the same on both, and 045 uses only plain DDL, PL/pgSQL, a row lock and core functions.

| Check | Result |
| --- | --- |
| 045 alone on 001–038 | exit 3, "migration 045 needs 035 and 039 to 042 first; missing: entitlement_grants, …", and nothing created |
| 039, 040, 041, 042, 043, 044, 045 in order, then 045 again | exit 0 each; the catalog fingerprint of the voucher objects (routine definitions and ACLs, columns, constraints, indexes, table ACLs, RLS) is the same before and after the second run |
| Hash cross-check | `sha256sum` and Postgres's `sha256()` agree on `K7Q2ABCD1234`; `test:launch` pins the same value for `voucherHash` |
| Rolled-back exercise (`BEGIN … ROLLBACK`, one script) | exit 0, 100 PASS, 0 FAIL, nothing left after the rollback. A 30-day redemption opens Premium (`is_premium` true, `entitlement_summary` source `promo` with the same end), one active promo grant noted "Voucher K7Q2", one redemption row, count 1. The same account again: "already", no grant and no use added; the table's key refuses a second row. Unknown, expired (moved past its date, and at its exact date), used-up and revoked codes answer the same "invalid". An open-ended voucher: no end, three uses hold at three, the table refuses a count above the maximum. A revoke keeps its first time, stops new redemptions and leaves the Premium already opened. The grant past its `valid_until` opens nothing. The list carries no hash. `delete_user_data` removes the redemption and the grant and keeps the voucher's count, anonymises an erased admin's vouchers, and 039's `delete_entitlement_data` still works through the cascade. `anon`, `authenticated` and a role holding only PUBLIC's rights are refused every routine and every read or write of both tables; `service_role` runs them. All six routines are SECURITY DEFINER with an empty `search_path` and `service_role`-only EXECUTE; both tables have RLS, no policy and no browser grant |
| R1: the last use, two accounts (committed scratch database) | session A redeems and holds its transaction for 2 s; session B, started 0.5 s later, waited 1,507 ms on A's row lock and was refused; 1 of 1 used, 1 redemption, 1 grant |
| R2: one account, two sessions at the same instant | "redeemed" and "already"; 1 use, 1 grant |
| R3: twelve accounts at the same instant, three uses | 3 redeemed, 9 refused; 3 of 3 used, 3 redemptions, 3 promo grants, 3 accounts Premium |

### The real handlers against Postgres

A scratch PostgREST/Auth stand-in ran the calls as SQL against a database holding 001–045; it answers a missing routine the way PostgREST 12 does (PGRST202, "Could not find the function … in the schema cache").

| Check | Result |
| --- | --- |
| End to end through `api/admin/[op].ts`, `api/user/[op].ts` and `api/quiz/roadmap.ts` | 36 checks passed, on `daad647` and again on `5bb53d8`. The admin creates a code; the database holds its SHA-256 and the admin's id, and a full `pg_dump` contains the code nowhere. A free learner gets 402 on a Premium challenge, redeems the code typed in lower case with spaced dashes, reads Premium from a promo grant with the right end, and opens the challenge without a restart. Again: 409. Another learner: 400 `voucher_invalid`, word for word the answer to an unknown or malformed code; a guest: 401. A custom campaign code is normalised, a duplicate refused with 409, an open-ended redemption reads no end, the list shows no hash, a revoke refuses the next learner and keeps the earlier one Premium. A learner is refused the admin route (403). The sixth attempt in an hour answers 429. Deleting the account erases the redemption and the grant and keeps the voucher's count. 49 log lines and 28 database requests, none carrying a code |
| The client build signed in, Chromium 141, light and dark at 360, 390, 768 and 1280 px | 88 cells: signed out, the form with focus, a refused code, a redemption (the plan line above updates in place), the Profile's plan line, too many attempts, the upgrade sheet from a Premium challenge, the landing on `/premium#voucher` with the caret in the field, and `/dev` → Vouchers (form, new code, list with long notes). No horizontal overflow, every control of the section at least 44 px on touch, no page or console error. The screenshots were reviewed; the form's hand-made labels were heavier than Astryx's, fixed in `daad647` and checked again. Run again on `5bb53d8`: 88 cells, 0 with an issue |
| axe-core 4.13 (WCAG 2.1 A and AA) over the same states, light and dark at 390 and 1280 px | 44 cells. On `daad647`, 17 had a finding, each `color-contrast` on an Astryx primary button in dark mode: white on the `#4caf50` accent, 2.77:1. `/premium/cancel` showed the same failure before this branch, so the fix went into the theme (`47bd47b`) rather than the voucher form. On `5bb53d8`: 0 with a finding |

### Release contract on the final head

All on `5bb53d8`, the last commit before this record; the record changes documentation only. Every command below was run, and the exit code is its own.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0. New here: 045's tables, grants and routines, no column for the plain code, the redeem routine's lock and order, and 045's `delete_user_data` starting with 044's body; the code format, the generator's spread and a pinned hash; both handlers against a fake database (one answer for every refused code, 409 only for a second redemption, 429 on the sixth try per account and the eleventh per address, 503 before 045); the real admin route's 401 and 403; no log line with a code; the client's request and copy; the legal sentences |
| `npm run test:coding-auth`, `npm run test:grading-integrity`, `npm run test:paths` | exit 0 each |
| `npm run test:coding` | exit 0; 770 tasks, 218 s |
| `npm run test:billing` | exit 0; 30 checks |
| `npm run test:fallbacks` | exit 0. New here: before 045 a redemption answers 503 `voucher_unavailable`, `/dev` → Vouchers answers 503 `migration_required`, and the plan, the learning paths and the tier gate keep answering |
| `npm run test:client` | exit 0; 21 files, 220 tests (27 new: 19 in `voucher.test.tsx`, 8 in `dev-vouchers.test.tsx`) |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `npm run build` (with CI's `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev`), `npm run check:public`, `npm run check:bundle` | exit 0 each; 13 public URLs; 221,047 of 243,000 gzip bytes; the existing warning about chunks over 500 kB |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0 each; 0 vulnerabilities |
| `git diff --check 4022afd..HEAD` | clean |
| `npm run check:responsive -- --block-external` against `vite preview` on :4173, `CHROME_BIN` = Chromium 141 from `/opt/pw-browsers/chromium-1228`, over `/premium`, `/profile`, `/dev`, `/terms`, `/privacy`, `/premium/cancel`, `/premium/success`, a coding challenge and `/learn` | exit 0: 63 probes (9 routes × 7 widths, 360 to 1440), 0 with issues, 0 unprobed |
| The same with `RESPONSIVE_THEME=dark` at 360, 390, 768 and 1280 | exit 0: 36 probes, 0 with issues, 0 unprobed |
| CI's two sweeps: `/`, `/quiz`, `/topics/javascript-closures` and `/cs/topics/javascript-closures` at 360 to 1440, then `RESPONSIVE_THEME=dark RESPONSIVE_LOCALE=cs` over `/` and `/cs/topics/javascript-closures` at 390, 768 and 1280 | exit 0 each: 28 and 6 probes, 0 with issues |
| `npm run test:browser` for `public.spec.ts`, `evolving.spec.ts` and `segmented.spec.ts` | exit 0 each; 5, 2 and 4 passed |
| `npm run test:harness` | exit 0; 196 assertions |
| `npm run audit:performance` (Lighthouse on `/`, lab values, not field data) | exit 0; mobile: performance 0.85, accessibility 1, best practices 0.96, SEO 1; desktop: 0.99, 1, 0.96, 1 |
| `npm run build:storybook`, then `storybook.spec.ts` against the Storybook dev server, as CI's last step runs them | exit 0 each; 6 passed |
| The end-to-end run, the 88-cell sweep and the axe pass above | exit 0 each |

Each commit on its own: the worktree was detached at each of the ten commits from `e95ac9d` to `5bb53d8` in order, and `npm run typecheck:api`, `npm run typecheck:tooling --prefix client`, `npm run test:launch`, `npm run test:fallbacks` and `npm run test:client` exited 0 at every one.

### Production order for 045

1. In the Supabase SQL editor, run `supabase/supabase-schema-045.sql` (md5 `9e5750618d6586ba153bb31f6b7bbec9`). It needs 039 to 044, which production has had since 2026-09-26, and running it twice changes nothing.
2. Run this check. It returns one row: `t`, `t`, `5`, `t`, `t`, `0`, `t`, then `2358b9e7c57afb3eafc4af76e9e0c9f4`, `2a82520c9cd0e3845839b7703924444e` and `dc95d11afc6d30267f577cf5e359de48`, the hashes a local database with 039 to 045 gives. Then open the security advisor.

   ```sql
   SELECT to_regclass('public.premium_vouchers') IS NOT NULL AS vouchers_table,
          to_regclass('public.premium_voucher_redemptions') IS NOT NULL AS redemptions_table,
          (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname IN ('premium_voucher_json', 'create_premium_voucher', 'list_premium_vouchers',
                                'revoke_premium_voucher', 'redeem_premium_voucher')) AS voucher_routines,
          (SELECT bool_and(p.prosecdef
                           AND p.proconfig = ARRAY['search_path=""']
                           AND has_function_privilege('service_role', p.oid, 'EXECUTE')
                           AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                           AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
             FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname IN ('premium_voucher_json', 'create_premium_voucher', 'list_premium_vouchers',
                                'revoke_premium_voucher', 'redeem_premium_voucher', 'delete_user_data')) AS routines_service_role_only,
          (SELECT bool_and(c.relrowsecurity) FROM pg_class c
            WHERE c.oid IN ('public.premium_vouchers'::regclass, 'public.premium_voucher_redemptions'::regclass)) AS rls_on,
          (SELECT count(*) FROM pg_policies
            WHERE schemaname = 'public' AND tablename IN ('premium_vouchers', 'premium_voucher_redemptions')) AS policies,
          (SELECT bool_and(NOT has_table_privilege(r, t, 'SELECT') AND NOT has_table_privilege(r, t, 'INSERT')
                           AND NOT has_table_privilege(r, t, 'UPDATE') AND NOT has_table_privilege(r, t, 'DELETE'))
             FROM unnest(ARRAY['anon', 'authenticated']) AS r,
                  unnest(ARRAY['public.premium_vouchers', 'public.premium_voucher_redemptions']) AS t) AS no_browser_grant,
          md5(pg_get_functiondef('public.delete_user_data(text)'::regprocedure)) AS delete_user_data_md5,
          md5(pg_get_functiondef('public.redeem_premium_voucher(text,text)'::regprocedure)) AS redeem_md5,
          md5(pg_get_functiondef('public.create_premium_voucher(text,text,text,integer,integer,timestamptz,text)'::regprocedure)) AS create_md5;
   ```

3. Merge. Until the deploy, nothing calls the new routines; after it, `/premium` and `/dev` → Vouchers use them.
4. Create vouchers in `/dev` → Vouchers (NEEDED.md). A voucher needed before the deploy can come from the SQL editor instead: this statement draws a random twelve-character code, stores only its hash and first four characters, and shows the code once, in its own result. Edit the note, the days (`NULL` for no end) and the uses first.

   ```sql
   WITH c AS (
     SELECT string_agg(
              substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ', 1 + (get_byte(r.b, i) & 31), 1),
              '' ORDER BY i) AS code
     FROM (SELECT sha256(convert_to(gen_random_uuid()::text, 'UTF8')) AS b) AS r,
          generate_series(0, 11) AS i
   )
   SELECT substr(c.code, 1, 4) || '-' || substr(c.code, 5, 4) || '-' || substr(c.code, 9, 4) AS code_shown_once,
          public.create_premium_voucher(
            encode(sha256(convert_to(c.code, 'UTF8')), 'hex'),
            left(c.code, 4),
            'First voucher: <who it is for>',
            30,    -- Premium days, counted from the redemption; NULL = no end
            1,     -- how many accounts may redeem it
            NULL,  -- last moment it can be redeemed, or NULL
            NULL)  -- created_by: NULL, or the admin's account id
          AS voucher
   FROM c;
   ```

   An empty `voucher` column means the code already existed; run it again. On a local database with 039 to 045 it returned `K156-F7BT-06EM` and the voucher's row; that code, typed as `k156 f7bt–06em` with spaces around it and put through `normalizeVoucherCode` and `voucherHash`, redeemed a 30-day promo grant noted "Voucher K156".

Not verified here: production (this step may not write to it), PostgREST 12.2.12 itself (the stand-in answers a missing routine as it does), Upstash's sliding window (the checks ran the in-memory bucket; production maps five and ten tries onto a 3,600-second window), and a real Google sign-in. The NEEDED.md item "Check a voucher end to end on production after 045" runs the real stack, sign-in included.

## 2026-09-26 — three `[owner:ai]` items: the erasure loop and migration 046, the retired support settings, Classroom rate limits

What changed: account deletion calls `delete_user_data` alone, and migration 046 drops the four erasure routines that 044 folded into it; the `SUPPORT_ENABLED` flag, the `support` block of the game settings and its `/dev` fields are gone; and the Classroom rate-limit fix of `fa884b7` (`claude/elegant-cori-h9cdgb`) now runs on this tree's `user:<id>` identities, ported by hand. Twelve handlers remain. This step applied no migration outside local scratch databases.

| Commit | What |
| --- | --- |
| `6c3ec0b` | `deleteAccount` calls `delete_user_data` alone. The launch-contract lines that asserted the loop become stricter ones: every statement of the four routines is in the newest `delete_user_data`, the deletion makes one RPC call, and no file under `api/`, `lib/`, `shared/` or `client/src/` names the four |
| `f555ccc` | Migration 046 and its guard; `erasureContracts()` holds 046 to that shape; `test:fallbacks` deletes an account through the real handler while the four answer PGRST202 |
| `a4bf1fd` | `docs/product-architecture.md`: account erasure is one routine, and 046 follows the deploy |
| `84f1407` | The retired support settings removed, with `retiredSupportContracts()` and `client/tests/dev-settings.test.tsx` |
| `d9b40d4` | Classroom rate limits, ported from `fa884b7`, with its five contract assertions adapted |
| `a7315f1` | `NEEDED.md`: the three items ticked, the owner step for 046, a follow-up for the Classroom state reads |
| `1f459f9` | `test:fallbacks` checks the deletion's order: `delete_user_data`, then the sign-in identity, nothing else |
| `f9fe47b` | README and `docs/launch-runbook.md` name migrations through 046; a wording fix in `NEEDED.md` |

This record is the last commit and changes documentation only.

### The four routines inside 045's `delete_user_data`

045's `delete_user_data` (`supabase/supabase-schema-045.sql:321`) holds every statement of the four routines word for word:

| Routine | Its statements | The same statements in 045's `delete_user_data` |
| --- | --- | --- |
| `delete_entitlement_data` | `039:514–516`: `entitlement_grants`, `billing_customers`, `billing_checkout_consents` | `045:402–404` |
| `delete_user_activity_days` | `040:810`: `user_activity_days` | `045:407` |
| `delete_coin_data` | `041:649`: `token_xp_credits`; `041:650–659`: the settled month's `deleted-account` rewrite | `045:411`, `045:412–421` |
| `delete_referral_data` | `042:318–320`: `referral_codes`, the account's own `referrals` row, `deleted-account` as the inviter | `045:425–427` |

044 held the same lines (`044:163–188`), and 045 restated 044's body unchanged before adding the voucher lines. No later migration redefines any of the four. Run inside `delete_user_data` or after it, they leave the same rows, and after it they find nothing to delete or rewrite; the rolled-back exercise below checks that. `erasureContracts()` now reads the four bodies out of 039 to 042 and fails when one of their statements is missing from the newest `delete_user_data`.

In the migrations the four names appear only in their own definitions and grants, in comments of 040 and 044, and in 046. In code only `scripts/test-launch-contracts.ts` names them, to check them; nothing under `api/`, `lib/`, `shared/` or `client/src/` does after `6c3ec0b`.

### Migration 046 proof (local Postgres 16.13, template `rea_base` = the Supabase shim with Supabase's default privileges + 001–038)

`supabase/supabase-schema-046.sql`, md5 `566a74a85a6dec85ef63d946e2b0ceb1`, every file run with `ON_ERROR_STOP=1` on fresh scratch databases.

| Check | Result |
| --- | --- |
| A: 039, 040, 041, 042, 043, 044, 045 in order | exit 0 each. `delete_user_data` hashes `2358b9e7c57afb3eafc4af76e9e0c9f4`, the value the production check for 045 expects |
| A, before 046: what else names or depends on the four | no other routine's source names one, `pg_depend` holds nothing on them, and no policy, view or column default names them |
| A, before 046, rolled back: an account seeded across the eight tables the four touch and the voucher tables, `delete_user_data`, then the four routines | exit 0, 4 PASS: `delete_user_activity_days` deletes 0 rows, and the four together change no row of the ten tables |
| A: 046, then 046 again | exit 0 both times; the second run prints four "does not exist, skipping" notices. The four are gone. `delete_user_data`, the other 107 public routines (definitions and grants), every table (columns, constraints, grants, RLS) and every policy fingerprint the same before 046, after it and after the second run |
| A, after 046, rolled back: accounts A, B and C (a friend A invited) seeded, then `delete_user_data(A)` | exit 0, 28 PASS, 0 FAIL. Each of the four answers `undefined_function` (42883). A's three grants (manual, provider, the voucher's promo), billing link, consent, dated rows, XP credit, invite code and own referral row are gone; the settled month keeps A's rank as `deleted-account` in its place; the friend A invited keeps the referral under `deleted-account`; A's redemption is gone and the voucher keeps its count of 2 without A as its creator; B's rows are unchanged; no text column in the public schema holds A's id; nothing left after the rollback |
| B: 039 to 044 without 045, then 046 | exit 3, "migration 046 needs 045 first; missing: premium_vouchers, premium_voucher_redemptions, delete_user_data erasing premium_voucher_redemptions". The four stay and the catalog fingerprint is unchanged |
| C1: 039 to 045, then 044 again (the body loses 045's line), then 046 | exit 3, "missing: delete_user_data erasing premium_voucher_redemptions"; the four stay |
| C2: 045 again, plus a routine that calls `delete_coin_data`, then 046 | exit 3, "migration 046 drops routines that proof_caller(text) still call"; the four stay |
| C3: a `cron.job` table whose job names `delete_referral_data`, then 046 | exit 3, "migration 046 drops routines that the cron jobs proof-referrals still call"; the four stay |
| C4: that job removed and an unrelated one kept, then 046 twice | exit 0 both times; the four are gone |
| `test:fallbacks`, after 046's shape (the four answer PGRST202, `delete_user_data` answers) | the real handler answers 200 after two calls and no others: `delete_user_data`, then the Auth deletion of the sign-in identity. The handler before `6c3ec0b` fails that check, and so does one that deletes the identity first. The old handler still answers 200 there, because it skips a routine PostgREST reports missing, so a 046 run before the deploy would not break a deletion; the order below does not rely on that |

The proof ends by dropping its scratch databases. Production runs 17.6. 046 uses a `DO` block, catalog reads, `to_regclass`, `to_regprocedure`, a regular expression and `DROP FUNCTION IF EXISTS`, and when 045 went to production its objects, `delete_user_data` among them, matched this local chain by fingerprint (`NEEDED.md`).

### Production order for 046

1. Merge, and wait until Vercel shows the deployment that contains `6c3ec0b` ("Stop calling the four erasure routines after delete_user_data") as production. Until then the deployed code calls the four routines on every account deletion.
2. In the Supabase SQL editor, run `supabase/supabase-schema-046.sql` (md5 `566a74a85a6dec85ef63d946e2b0ceb1`). A refusal changes nothing: "needs 045 first" means 045's tables or its `delete_user_data` are missing, and "still call" names the routine or cron job to fix first.
3. Run this check. It returns one row, `0`, `2358b9e7c57afb3eafc4af76e9e0c9f4`, `t`, as a local database with 039 to 046 does. Then open the security advisor.

   ```sql
   SELECT (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname IN ('delete_entitlement_data', 'delete_user_activity_days',
                                'delete_coin_data', 'delete_referral_data')) AS dropped_routines_left,
          md5(pg_get_functiondef('public.delete_user_data(text)'::regprocedure)) AS delete_user_data_md5,
          (SELECT p.prosecdef
                  AND p.proconfig = ARRAY['search_path=""']
                  AND has_function_privilege('service_role', p.oid, 'EXECUTE')
                  AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
                  AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
             FROM pg_proc p WHERE p.oid = 'public.delete_user_data(text)'::regprocedure) AS delete_user_data_service_role_only;
   ```

4. Optional: sign up a throwaway account, delete it from the Profile, and confirm the request answers 200.

Applied on 2026-09-26, after `8a045a5` (containing `6c3ec0b`) was production (`dpl_J4DZYmf9XdGCcErxyvdjLBS9BLy7`): before the file, production held the four routines, `delete_user_data` hashed to `2358b9e7c57afb3eafc4af76e9e0c9f4` and nothing else named them; the file ran in one transaction through the Supabase connector; the check above returned `0 | 2358b9e7c57afb3eafc4af76e9e0c9f4 | t`; the security advisor lists INFO notices only (RLS on without a policy, on the service-role-only tables). Step 4 was not run: it needs a throwaway Google account.

### The retired support settings

`normalizeSettings` builds its result from the fields it knows, so it drops a stored row's `support` key on read, and `saveGameSettings` writes that result, so the next save from `/dev` stores the row without it. A `/dev` tab opened before the deploy runs the old form, which reads `settings.support` and fails until it is reloaded.

| Check | Result |
| --- | --- |
| `retiredSupportContracts()` in `npm run test:launch` | a row with the old block reads the same as one without it and saves without it; the real `/api/settings` handler answers without `support`; the seven files that held the flag, the block or the fields keep none of them; no file under `api/`, `lib/`, `shared/` or `client/src/` reads the switch |
| `client/tests/dev-settings.test.tsx` | `/dev` → Settings loads current settings, and settings that still carry the block, shows no support field, and saves every section except `support` |
| Mutations (each file restored from `01fdfc9` in turn, or a stray read planted) | all 8 fail: the old `lib/settings-store.ts`, `api/settings.ts`, `DevSettings.tsx` (contract, and the client test, where the old form throws on the new response), `client/.env.example`, `README.md` and `gameConfig.ts`, and a `process.env.SUPPORT_ENABLED` read added to `lib/billing/config.ts` |

### Classroom rate limits (ported from `fa884b7`)

| Play action | Before, per address | After |
| --- | --- | --- |
| create | 5 a minute | 20 per address, then 5 per account |
| join | 12 | 48 per address, then 12 per account |
| state | 60 | 600 per address, then 60 per account, or 60 per address signed out |
| control, answer, heartbeat | 30 | 200 per address, then 30 per account |
| distribution (the classroom host's) | no limit | 90 per account |

The other 31 entries of `RATE_LIMITS` are unchanged, compared entry by entry with `01fdfc9`'s.

Reconciled with this tree: identities keep D2's scheme, `${key}:${identity ?? ip}` with `user:<id>`, so no existing bucket key changes. `fa884b7` kept the namespaces apart with `u:` and `ip:` prefixes; here `clientIp` moves an address that starts with `user:` (a client-set header where no proxy overwrites it) to `ip:user:…`, which keeps the same guarantee. One deliberate difference: `fa884b7` charged the host's distribution reads to the 60-a-minute state bucket. The presenter polls distribution every 1.5 s beside its own state reads, and a simulated round through the real limiter (30 pupils and the host on one address, Realtime up, ten questions 30 s apart) refused 40.3 % of the host's state reads and 15.0 % of its distribution polls that way; with distribution in its own bucket, none.

The five assertions of `fa884b7`, adapted, run as eleven groups; a scratch harness ran each on its own against the unported files and the port:

| Group | Unported (`01fdfc9`) | Port | Targeted mutation run through `npm run test:launch`, caught by this group |
| --- | --- | --- | --- |
| 1a two accounts on one address keep separate budgets | pass: D2 already keys by identity | pass | address-only keys, as before D2 |
| 1b an account is bounded once its budget is spent | pass, same reason | pass | identity buckets that never run dry |
| 2a namespaces never meet, even for a `user:` header | fail | pass | `clientIp` without the `ip:` move |
| 2b every identity passed anywhere is `user:<verified id>` | pass: the old handler passes none | pass | a bare `sub` in `join` |
| 3 account limits equal the pre-split values; distribution has its own bucket, sized from `Play.tsx`'s poll | fail | pass | `playJoinPerUser` at 13; distribution on the state key; a 500 ms presenter poll |
| 4a the address buckets hold 32 seats (capacity) | fail | pass | `playState` at 400 |
| 4b a class of 32 joins, polls a minute and answers through both tiers | fail at seat 13 | pass | none needed |
| 4c one account stops at 12 joins while the address has room | fail | pass | none needed |
| 5a each action takes its account token with `user:<verified subject>` | fail | pass | the identity unwired from `state` |
| 5b the signed-out `state` branch keeps its own address bucket | fail | pass | the branch removed |
| 5c each action takes its token after verifying the caller and before any read | fail | pass | `join`'s token moved after its match read |

The unported pair of files, run through `npm run test:launch` as a whole, stops at the bundle: `lib/rate-limit.ts` exports no `SHARED_NETWORK_SEATS`. `fa884b7`'s own two negative tests, loosening `playJoinPerUser` and unwiring the identity argument, both fail the ported contract.

Classroom answers still outrun the state bucket while Realtime is up. Every answer broadcasts `match_updated` on a channel with `broadcast.self = true`, and every client reads state once per broadcast, about 930 reads per question for a class of 30. The same simulation refused 6,134 of the class's 9,610 state reads (63.8 %) at the 600-a-minute address bucket, against 9,252 (96.3 %) with the unported limits; with Realtime down and every client on the 4 s poll, the case `fa884b7` sized for, it refused none of 2,635. `NEEDED.md` has the follow-up: coalesce those reads in `Play.tsx`.

### Release contract on the final head

All on `f9fe47b`, which adds documentation only to `1f459f9`; this record changes documentation only. I ran every command below, and each exit code is its own.

| Check | Result |
| --- | --- |
| The same list on `01fdfc9` (`origin/main` when the step began), before any change | exit 0 each, 13 of 13; 22 client test files, 226 tests; 221,068 of 243,000 gzip bytes |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0. New here: the erasure lines of `6c3ec0b` and `f555ccc`, `retiredSupportContracts()`, and the eleven Classroom groups |
| `npm run test:fallbacks` | exit 0. New here: after 046, a deletion calls `delete_user_data` alone |
| `npm run test:client` | exit 0; 23 files, 228 tests (2 new in `dev-settings.test.tsx`) |
| `npm run test:billing` | exit 0; 30 checks |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build`, `npm run check:bundle` | exit 0 each; 220,965 of 243,000 gzip bytes, 103 fewer than on `01fdfc9`; the existing warning about chunks over 500 kB |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0 each; 0 vulnerabilities |
| `git diff --check origin/main..HEAD`, `git diff --check 01fdfc9..HEAD` | clean |
| Each commit on its own | the worktree detached at each commit from `6c3ec0b` to `a7315f1` in order: `npm run typecheck:api`, `npm run test:launch`, `npm run test:fallbacks`, `npm run typecheck:tooling --prefix client` and `npm run test:client` exit 0 at every one. At `1f459f9`, `npm run test:fallbacks` and `npm run typecheck:api` exit 0; `f9fe47b` is the head above |

`origin/main` moved to `2e6b8ba` during the step (a CI change to two browser specs this branch does not touch); `git merge-tree` merges the branch into it without a conflict. Not run: `npm run check:responsive` and the browser suites. The one screen that changed is `/dev` → Settings, which the responsive sweep would render signed out, without the form; `client/tests/dev-settings.test.tsx` renders it.

Not verified here: production (this step may not write to it), PostgREST 12.2.12 itself (the fallbacks stand-in answers a missing routine as it does), Upstash's sliding window (the checks ran the in-memory bucket), a real classroom on one school network, and the Vercel project's environment (whether `SUPPORT_ENABLED` is still set there).

## 2026-09-26 — a click draws the next page once (GLITCH)

The owner reported that clicking Coding "always" showed a glitch and then rerendered, and asked for the same check on the other sections.

What a click did, measured frame by frame in Chromium on devshark.app at `4f93988` as a signed-out visitor, and on a local build of the same commit with a signed-in Premium account simulated by a fake session and API fixtures answering after 250ms:

1. 30 to 60ms after the click the page went empty and the footer rose into view.
2. 200ms later the route loader appeared.
3. The next page drew no sooner than about 330ms after the click, even with every chunk in the HTTP cache, and 400 to 900ms from a cold cache.
4. Signed in, Coding then drew a second time: the new-run form became the run card, "0 of 222 passed" became "2 of 222 passed", the next-challenge placeholder became a title, and the page lost 255px. Today, Learn, Roadmap and Rewards redrew the same way once their data arrived.

Causes:

- In `client/src/App.tsx` the route `Suspense` boundary sat inside the `m.div` keyed by `location.pathname` (lines 640 to 651 at `4f93988`). Each navigation mounted a fresh boundary, and React shows a fresh boundary's fallback at once, even inside the router's transition. `RouteLoader` drew nothing for 200ms and then the loader, and the empty route box kept `flex: 1 0 auto`, which pulled the footer up. After a fallback, React reveals the content no sooner than 300ms later: the floor under step 3.
- `/coding` waited longest because `CodingSection.tsx` imported the task workbench (CodeMirror and the test runner) statically: 32 chunks, 259KB gzipped, against 115KB for Learn, the next heaviest section.
- Pages drew defaults before their data. `ChallengeRunPlanner` shows the form while the open run loads, the Coding counts read zero until progress arrives, `CodingTrackScreen` and Roadmap show a full loader until the plan or the structure loads, Today and Learn show skeletons, and on Rewards the test-mode notice arrived after the page and pushed the wallet down 64px (a layout shift of 0.03).
- The Coding paths list measured its five rows after paint: it drew at its 460px fallback, then grew to 591px (927px at 390px wide).
- `/collection` opens on a lazily loaded Flashcards inside its own boundary, so once navigation stopped blanking the page it showed a loader in its body for a beat.

| Commit | What |
| --- | --- |
| `99fdf58` | The route boundary moves outside the keyed route box, so the router's transition keeps the current page until the next one can render; the fallback shows only for the first page of a visit. The nav marks the destination at once, the waiting page carries `aria-busy` and fades to 0.55 opacity after 200ms (in one step with reduced motion), and each new path opens at the top of `<main>` |
| `d8f239c` | `lib/routePreload.ts`: every lazy route has one loader, registered with its paths; a mouse resting on a link for 65ms, a focus, a touch or a press starts it |
| `2810215` | `lib/routeData.ts`: `useFirstData` holds a page's first render until the named reads are cached, for 1.2s at most and not at all offline; `readOnce` answers from the cache and fetches a missing read once, without the retry delay. The Coding home, track list and FullStack use it, and the paths list measures before paint |
| `5419ea2` | Today, Learn, Roadmap and Rewards hold their first render for the structure, the plan, the catalogue and the account's coins, orders and invite |
| `fb98724` | The workbench loads beside the task instead of with the section: `/coding` now waits for 14 chunks, 43KB gzipped. The lists fetch it when the browser is idle, a task link preloads it, and a failed load shows the existing error with Try again |
| `38aeb7c` | `tests/browser/navigation.spec.ts` holds every chunk back for 600ms and records each frame of eight section visits and a phone drawer visit; it fails on `4f93988` and passes here. CI runs it |
| `cd56c46` | Merge of `origin/main` at `2e6b8ba`; the one conflict, in `quality.yml`, keeps both browser specs |
| `6d59a96` | Collection imports Flashcards (2KB gzipped) directly |
| `4dfec56`, `0402391` | This record and the navigation rule in `DESIGN_RULES.md` §8 |
| `7ee97e5` | The Rewards and merchandise tests take the render result from `act` itself; `npm run typecheck:tooling`, which covers the tests, had failed on their helper with TS2322 twice |
| `938c29c` | Merge of `origin/main` at `47a7ee2` (the three `[owner:ai]` items); the one conflict, at the end of this file, keeps both sections |

The loader, the empty page and the footer jump were the same on every section, so the measurements below are medians of the first visit to each section in a fresh page load, at 1280 and 390px, light and dark (signed in: light only). "Empty frames" count animation frames whose route box held nothing; "content states" count the distinct texts the new page showed in the 3 seconds after the click. The last column is when the new page first drew: before, after the empty beat and the loader; after, when the old page gave way to the complete new one.

Production, `4f93988`, signed out, cold cache (the section's chunks from the network):

| Section | Empty frames | Loader frames | Footer in view on an empty page (frames) | Roots drawn | Content states | New page drawn (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `/coding` | 13 | 36 | 48 | 2 | 1 | 860 |
| `/today` | 13 | 11 | 25 | 2 | 2 | 439 |
| `/quiz` | 13 | 23 | 36 | 2 | 1 | 642 |
| `/learn` | 13 | 26 | 39 | 2 | 2 | 715 |
| `/challenge` | 13 | 17 | 30 | 2 | 2 | 550 |
| `/play` | 13 | 16 | 29 | 2 | 1 | 511 |
| `/collection` | 12 | 11 | 23 | 2 | 2 | 403 |
| `/roadmap` | 13 | 40 | 52 | 3 | 2 | 920 |
| `/leaderboard` | 13 | 11 | 24 | 2 | 2 | 437 |
| `/premium` | 13 | 14 | 27 | 2 | 1 | 478 |
| `/shop` | 13 | 11 | 24 | 2 | 2 | 445 |
| `/` | 12 | 6 | 18 | 2 | 1 | 327 |

With the chunks in the HTTP cache the pattern held: 12 or 13 empty frames, 5 or 6 loader frames and the new page at 328 to 383ms on every section. A second visit in the same page load, with the chunk already loaded, drew at once with no empty frame: only first visits glitched.

Local build, signed out, before → after (the API forwarded to devshark.app, so the data waits include that round trip):

| Section | Empty frames | Loader frames | Footer in view on an empty page | Roots drawn | Content states | New page drawn (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `/coding` | 13 → 0 | 5 → 0 | 18 → 0 | 2 → 1 | 1 → 1 | 375 → 117 |
| `/today` | 12 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 2 → 1 | 330 → 152 |
| `/quiz` | 13 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 1 → 1 | 343 → 103 |
| `/learn` | 13 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 2 → 1 | 343 → 367 |
| `/challenge` | 13 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 2 → 2 | 348 → 114 |
| `/play` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 1 → 1 | 332 → 90 |
| `/collection` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 1 → 1 | 337 → 102 |
| `/roadmap` | 12 → 0 | 12 → 0 | 25 → 0 | 3 → 1 | 2 → 2 | 471 → 210 |
| `/leaderboard` | 12 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 2 → 2 | 342 → 63 |
| `/premium` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 1 → 1 | 349 → 99 |
| `/shop` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 2 → 1 | 350 → 734 |
| `/` | 12 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 1 → 1 | 326 → 134 |

Local build, signed in with Premium (fixtures after 250ms), before → after:

| Section | Empty frames | Loader frames | Footer in view on an empty page | Roots drawn | Content states | New page drawn (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `/coding` | 12 → 0 | 5 → 0 | 17 → 0 | 2 → 1 | 2 → 1 | 437 → 470 |
| `/today` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 3 → 2 | 343 → 615 |
| `/quiz` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 1 → 1 | 354 → 177 |
| `/learn` | 13 → 0 | 5 → 0 | 18 → 0 | 2 → 1 | 2 → 1 | 350 → 475 |
| `/challenge` | 13 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 2 → 2 | 339 → 98 |
| `/play` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 1 → 1 | 350 → 126 |
| `/collection` | 13 → 0 | 6 → 0 | 18 → 0 | 2 → 1 | 2 → 2 | 366 → 104 |
| `/roadmap` | 13 → 0 | 25 → 0 | 38 → 0 | 3 → 1 | 2 → 2 | 684 → 598 |
| `/leaderboard` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 2 → 2 | 351 → 90 |
| `/premium` | 13 → 0 | 6 → 0 | 19 → 0 | 2 → 1 | 2 → 3 | 370 → 135 |
| `/shop` | 13 → 0 | 5 → 0 | 18 → 0 | 2 → 1 | 4 → 1 | 357 → 1139 |
| `/` | 13 → 0 | 5 → 0 | 18 → 0 | 2 → 1 | 1 → 1 | 327 → 181 |

The pages that now wait for their data draw later than their first paint used to, and finish no later: the signed-in Coding page used to be complete 710 to 770ms after the click, after two draws, and now at 470ms, after one. Rewards waits longest here because its catalogue came from devshark.app through a slow proxy; the wait never passes 1.2s. While a page waits, its predecessor stays, marked busy, and fades back after 200ms.

Still drawn in two steps after this change, each a page's own loading state rather than the navigation:

- ~~`/leaderboard`: the skeleton, then the board once it loads.~~ HOLDS, below, closed it.
- ~~`/challenge`: the best-effort leaderboard line fills in; no layout shift.~~ HOLDS, below, closed it.
- ~~`/roadmap`: the optional-paths section (a lazy `PathDiscovery`) arrives below the fold.~~ HOLDS, below, closed it.
- ~~`/today`, signed in: the concept, run, due-coding and path sections load under the plan.~~ HOLDS, below, closed it.
- ~~`/premium`, signed in with Premium: the plan arrives after the page and adds "Your plan" above the plans; the page redraws twice and grows 180px. Its tests (`premium-page`, `voucher`) would need an awaited mount to hold it with `useFirstData`.~~ HOLDS, below, closed it.
- `/collection`, signed in: the saved cards. The fixtures did not answer the flashcards read, so this one is not measured. HOLDS, below, measured it: the cards still arrive after the page.
- The route box still fades in from opacity 0 over 140ms, with each page's `ss-pop` on top, so the first frame after the swap is almost empty. That entrance is the existing design.
- A chunk that fails to load still replaces the whole app with the root error screen. It happened once on devshark.app during the measurements, when the proxy aborted `objectWithoutPropertiesLoose-*.js`.

Checks on `938c29c`, the second merge, covering every step of `quality.yml` that needs no secret:

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 and exit 0. The tooling typecheck failed on `4dfec56` with two TS2322 in the Shop test helper that `5419ea2` added; `7ee97e5` fixes it |
| `npm run test:launch` | exit 0; the twelve-function budget holds |
| `test:coding-auth`, `test:grading-integrity`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks` | exit 0 each |
| `npm run test:client` | exit 0; 24 files, 238 tests, 10 of them new in `route-loading.test.tsx` |
| `npm run check:unused`, `npm run check:security` | exit 0 and exit 0 |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build`, then `check:public` and `check:bundle` | exit 0 three times; 13 public URLs; 221,847 of 243,000 gzip bytes (`4f93988` built the same way: 221,047) |
| `npm audit --omit=dev`, root and client | exit 0 twice; 0 vulnerabilities |
| Browser specs `navigation`, `public`, `evolving`, `segmented`, `on-accent` against `vite preview` | exit 0 each; 2, 5, 2, 4 and 12 passed |
| `npm run check:responsive` with CI's routes and widths, light, then dark with `RESPONSIVE_LOCALE=cs` | exit 0 twice; 28 and 6 probes, no issues |
| `npm run check:responsive -- --routes` the twelve sections plus `/coding/javascript`, `/coding/javascript/js-double-numbers` and `/coding/fullstack` `--widths 360,390,768,1280 --block-external`, light and dark | exit 0 twice; 60 probes each, no issues |
| `npm run test:harness` | exit 0; 196 assertions in Chromium |
| `npm run audit:performance` with `CHROME_PATH` set to the local Chromium | exit 0; performance 0.58 on the phone profile and 0.98 on desktop, lab numbers that swing with the first-load shift below |
| `git diff --check`, the worktree and `origin/main` against `HEAD` | exit 0 twice |
| Each of the six commits before the first merge, checked out alone: client `tsc -b` and `vitest run` | exit 0 each; 220, 225, 230, 230, 230 and 230 tests. `tsc -b` leaves the tests out, so it missed the helper's typing |

Not run: the Storybook build and its spec. No story imports a module this change touches.

Lighthouse found a layout shift on the first load of the landing page that predates this change: the whole `<main>` moves by almost a viewport. Against `vite preview`, `origin/main` at `2e6b8ba` scored a CLS of 0.979 in two of three desktop runs and 0.959 in all three phone runs. This branch (`7ee97e5`, then `938c29c`) scored 0.979 in two of five desktop runs and 0.959 in one of five phone runs; every other run stayed at 0.066 or below. Its cause is untraced. It happens before any navigation, so this change does not address it.

Not verified: this change on devshark.app (not deployed), a real Supabase session (the signed-in runs used a fake session and fixtures), and physical phones. The measurement harness stayed out of the repository; `tests/browser/navigation.spec.ts` is the regression check that remains.

## 2026-09-26 — Supabase on demand (BUNDLE)

What changed: a first visit no longer downloads `@supabase/supabase-js`. `client/src/lib/supabaseClient.ts` imports the library once, the first time one of these holds: a session is stored under supabase-js's default key (`sb-<first label of the project host>-auth-token`), the URL carries an OAuth return (`access_token`, `error`, `error_description` or `error_code`, or a PKCE `code` whose verifier this browser stored), the visitor starts a sign-in, or another tab signs in. A stored session and an OAuth return start the download while the module evaluates, before React renders. A visitor with none of those is signed out from the first render and downloads nothing: `AuthProvider` starts with `isLoading` false, `apiFetch` sends no token, and the language and track writers and the match channel skip the account. The key stays supabase-js's default, so every stored session still restores. No server file changed; twelve handlers remain.

| Commit | What |
| --- | --- |
| `b0f9abe` | `lib/supabaseClient.ts` loads the client on demand; `auth.tsx`, `api.ts`, `trackPref.ts`, `languagePref.ts`, `realtime.ts` and `supabase.ts` use it. The boot deadline (8 s) and the token timeout (4 s) now include the download. `AuthProvider` reports a `SIGNED_IN` only after `INITIAL_SESSION`: supabase-js announces a restored session as `SIGNED_IN` while it initializes, the eager client did so before the provider subscribed, and a client loaded on demand can attach the provider first |
| `0bf926e` | `client/tests/supabase-lazy.test.tsx` (19 tests) and `client/tests/supabase-session-key.test.ts` (6, against the real supabase-js 2.110) |
| `4c27225` | `tests/browser/lazy-auth.spec.ts`; the Product quality workflow builds with the placeholder Supabase project from `docs/quality/bundle-budget.json`, as `check:bundle` does, and runs the spec in the browser checks |
| `f528b7d` | `docs/quality/bundle-budget.json` and `docs/quality/README.md` record the measurement and say who downloads the library; the comment in `scripts/check-bundle.mjs` follows |

This record is the last commit and changes documentation only.

### The first visit

`npm run check:bundle` (the production-shaped build), gzip bytes of each initial request of `index.html`:

| Request | `332ce69` | `f528b7d` |
| --- | --- | --- |
| entry script | 110,788 | 111,447 |
| `react` | 56,849 | 56,849 |
| `supabase` (the library) | 54,881 | not requested |
| stylesheet | 25,056 | 25,056 |
| `router` | 18,064 | 18,064 |
| `tanstack` | 12,139 | 12,139 |
| Total | 277,777 in 6 files, 34,777 over the 243,000 budget | 223,555 in 5 files, 19,445 under |

The library is now a lazy chunk (`supabase-B5YuwSPF.js`, 55,304 gzip bytes); the built `index.html` names no `supabase-*` file. A dynamically imported chunk keeps all of supabase-js's exports, 423 bytes more than the static chunk, and the loader adds 659 bytes to the entry, so a signed-in visitor downloads 1,082 bytes more than before, and the library arrives one fetch after the entry instead of beside it. A second chunk also starts with `supabase-`: the app's own `lib/supabase.ts` API calls, about 400 gzip bytes, which `/learn` and `/quiz` load before and after this change. The browser spec tells the two apart by the `GoTrueClient` string in the library's body.

### Evidence

| Check | On `332ce69`'s code | On `f528b7d` |
| --- | --- | --- |
| The two new client test files, copied into a checkout of `332ce69`, each test run alone | 17 failed, 8 passed. The signed-out and sign-in cases fail because the first render is `loading` and supabase-js loads at module evaluation; the three tests that hold the download time out, because the old static import waits for the library before anything runs; a failed download fails the whole module; the key tests fail because `sessionKeyFor` does not exist. The 8 that pass are the stored-session restore, its token, sign-out, the preference refresh, the match channel, the OAuth error return and PKCE, which must behave the same before and after. Run as one file, 22 fail, because a timed-out test's import resolves during the next test | 25 passed, alone and as files |
| `tests/browser/lazy-auth.spec.ts` against `vite preview`, both builds with the placeholder Supabase project, Chromium 141 | 3 failed, 2 passed: `/`, `/learn` and the sign-in click each find `supabase-BEHl1rMg.js` requested at page load; the stored session and the OAuth return pass | 5 passed |

The browser spec plants a well-formed fake session through `addInitScript` and answers `**/auth/v1/**` locally, so nothing reaches Supabase. A signed-out visit to `/` or `/learn` requests no library chunk, contacts no Supabase host and never shows the account skeleton. With the stored session the chunk is requested, the account menu appears, and no sign-in is reported. The sign-in click downloads the chunk and leaves for `/auth/v1/authorize?provider=google`. The OAuth return makes supabase-js call `GET /auth/v1/user`, store the session under the default key, clear the fragment, and `/api/user/authevent` receives one report with the token.

I broke each rule in `lib/supabaseClient.ts` and `AuthProvider` on purpose, one at a time, and `supabase-lazy.test.tsx` failed every time: reporting every `SIGNED_IN` (2 tests failed), ignoring the stored session (8), starting the provider in `loading` (3), loading on any `?code=` (1), letting the token path load without a session (1), dropping the other-tab watch (1), attaching waiting subscribers 50 ms after the client is created (2), and dropping the import at module evaluation (2).

### Release contract on the final head

All on `f528b7d`; this record changes documentation only. I ran every command below, and each exit code is its own.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch`, `npm run test:fallbacks` | exit 0 each |
| `npm run test:client` | exit 0; 25 files, 253 tests (25 new) |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build`, then `npm run check:public` | exit 0 each; the build emits the library as a lazy chunk |
| The workflow's build step as committed: the Supabase placeholders from `docs/quality/bundle-budget.json`, then `npm run build && npm run check:public && npm run check:bundle` | exit 0; 223,555 of 243,000 gzip bytes |
| `npm audit --omit=dev`, `npm audit --omit=dev --prefix client` | exit 0 each; 0 vulnerabilities |
| `public.spec.ts`, `evolving.spec.ts`, `segmented.spec.ts`, `on-accent.spec.ts`, `lazy-auth.spec.ts` against `vite preview` of that build on :4473, `CHROME_BIN=/opt/pw-browsers/chromium` | exit 0 each; 5, 2, 4, 12 and 5 passed |
| `npm run check:responsive -- --routes /,/quiz,/learn,/today,/roadmap,/profile --widths 360,390,768,1280 --block-external`, light, then with `RESPONSIVE_THEME=dark` | exit 0 each; 24 probes, 0 with issues, 0 unprobed |
| `git diff --check origin/main..HEAD`, `git diff --check 332ce69..HEAD` | clean |
| Each commit on its own | the worktree detached at `b0f9abe`, `0bf926e`, `4c27225` and `f528b7d` in order: `npm run typecheck:api`, `npm run typecheck:tooling --prefix client`, `npm run test:launch`, `npm run test:fallbacks` and `npm run test:client` exit 0 at every one (228 client tests at `b0f9abe`, 253 after) |

`origin/main` moved to `b74d7ae` (GLITCH) during the step. `git merge-tree` finds one conflict, in `.github/workflows/quality.yml`, where both sides add a spec after `on-accent.spec.ts`; keep both lines. This record will meet GLITCH's record at the end of this file the same way. A scratch copy of `b74d7ae` with this branch's changes applied and both lines kept passed `npm run typecheck:api`, `npm run typecheck:tooling --prefix client`, `npm run test:launch`, `npm run test:client` (26 files, 263 tests) and the workflow's build step (224,479 of 243,000 gzip bytes), and the six browser specs of the merged workflow, `navigation.spec.ts` among them, passed against its preview.

One report changes on purpose. With the eager client, a signed-out tab that stayed open while the learner signed in elsewhere heard that tab's broadcast and posted its own `/api/user/authevent`. That tab now has no client; it restores the session from storage through the `storage` event and posts nothing, and the tab that signed in still reports.

On main and in production: the merge commit `7b4bc8f` passed every step of the Product quality workflow, locally and in CI (run 61), and `check:bundle` read 224,479 of 243,000 gzip bytes in five requests in both. Vercel deployed that commit to devshark.app (`dpl_2dNcA8f6ugbUbybWikA8tk2zgjUS`). Measured the way `check:bundle` measures, the `/assets/` requests that `index.html` starts, each gzipped with Node's `gzipSync`, devshark.app then served 224,511 gzip bytes in five requests; before the deploy it served 278,773 in six, supabase-js among them. The 32 bytes between CI and production are all in the entry script (112,347 against 112,315), which carries production's real Supabase, Sentry and PostHog values where the check has placeholders of the same length. The library chunk `supabase-B5YuwSPF.js` answers 200 for the visitors who need it.

Not verified here: a real Google sign-in and a real Supabase project (the OAuth return and the stored session ran against supabase-js 2.110 with Auth answered locally); a token refresh near expiry, which stays supabase-js's own; two real browser tabs (the cross-tab sign-in ran in the client test with a dispatched `storage` event); Lighthouse.

## 2026-09-26 — a page that fails to load keeps the shell (ERRBOUND)

The owner reported that a page chunk that fails to load reaches the only error boundary, around the whole app in `client/src/main.tsx`: the header, the nav and the footer go, and the learner sees "Something went wrong" with Try again and Reload page. It happened on devshark.app on 2026-09-26 during the GLITCH measurements, when the proxy aborted `objectWithoutPropertiesLoose-*.js` during a first click on Coding (at `4f93988`, when Coding still imported the task workbench) and the whole app went about 1.4s after the click.

On `b74d7ae` and on `7b4bc8f`, a chunk that failed:

1. replaced the app with the root screen. Four of the checks in `tests/browser/route-errors.spec.ts` fail on builds of both commits, with the root screen on the page;
2. left a Try again that could not bring the page back. React.lazy keeps a rejected load for good, so rendering the app again threw the same error without calling the loader. Only Reload page helped.

### What devshark.app answers for a missing chunk

`curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://devshark.app/assets/does-not-exist-0000.js` prints `200 text/html; charset=utf-8`. The catch-all rewrite in `vercel.json` does not exclude `assets/`, so a missing hashed file gets `index.html`, and the `/assets/(.*)` header rule adds `cache-control: public, max-age=31536000, immutable` and `x-content-type-options: nosniff` to it. A module script refuses `text/html`, so after a deploy a stale chunk fails the way a dropped request does. The browser may keep that HTML under the chunk's URL for a year, so no retry in place can fetch the file; a reload works, because the new `index.html` names new files. `vite preview` also answers a missing asset with `200 text/html`, which the browser spec relies on. This step leaves `vercel.json` alone (see the hand-off below).

A deploy during this step showed the case live. At 20:45 UTC devshark.app served the entry `main-Ctu2GPhq.js`; after `7b4bc8f` went out it served `main-sb7BNA-6.js`, and the previous build's `main-Ctu2GPhq.js` and `CodingSection-DVDpGXcJ.js` then answered `200 text/html`. `objectWithoutPropertiesLoose-Cv5OCJ0e.js`, unchanged between the two builds, still answered JavaScript. A tab still running the earlier build would get the root screen on its first click on Coding; the spec shows that failure on local builds of `b74d7ae` and `7b4bc8f`.

### Does a second `import()` ask the network again?

Measured in Chromium 141.0.7390.37, the Chromium in `/opt/pw-browsers`, with a local server that fails one module request once and counts every request (a scratch harness, not committed). In every row the first `import()` rejected with `TypeError: Failed to fetch dynamically imported module:` and the page chunk's URL, also when the chunk it imports failed.

| The failure | The page chunk fails | A chunk the page imports fails | The same, after a `<link rel="modulepreload">` of that chunk |
| --- | --- | --- | --- |
| Network error: two resets in a row, a body cut short, or Playwright's `route.abort` | the second `import()` rejects at once, with no request | the same | the same |
| HTTP 404 | the same | the same | the same |
| `200 text/html` under `nosniff`, as devshark.app answers | the same | the same | the same |
| After `location.reload()` | loads; both chunks requested | loads | loads |

A single reset never reached the page: Chromium repeated the GET on a new connection and the import succeeded.

The other browsers, from primary sources; Firefox and Safari are not installed here, and `playwright install` is off limits:

- The standard: [whatwg/html#6768](https://github.com/whatwg/html/issues/6768) asked that a failed dynamic import not stay cached. [whatwg/html#10327](https://github.com/whatwg/html/pull/10327), "Don't cache HTTP errors in the module map", merged 2026-07-15, stops caching network errors, HTTP error statuses and MIME type mismatches. Parse errors stay cached, and imports running in parallel still share one fetch.
- Chromium: [issue 534781954](https://issues.chromium.org/issues/534781954). [CL 8102202](https://chromium-review.googlesource.com/c/chromium/src/+/8102202), "Do not cache failed module imports", landed behind the `ModuleMapDoNotCacheFailedFetch` flag at main@{#1695318} on 2026-09-10, and [CL 8403905](https://chromium-review.googlesource.com/c/chromium/src/+/8403905) turned the flag on at main@{#1701404} on 2026-09-19. Chrome 155 branched at #1697595 (chromiumdash), so 155 (stable 2026-10-06) ships the flag off, and 156 (branch 2026-09-28, stable 2026-10-20) is the first with it on. The [Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/lG4iYotq5EA/m/fNtZZbo-BQAJ) named 155, and Gerrit lists no merge of the enabling CL to the 155 branch. Chrome 154, stable since 2026-09-22, keeps the failure, as Chromium 141 does above.
- Firefox: [bug 2055211](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211), fixed in Firefox 155, released 2026-09-01. Its [release notes](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/155): "A module that fails to load because of a network error or an incorrect MIME type is no longer cached as a failure, so importing the same module specifier again can succeed once the server recovers", for static and dynamic imports alike. Firefox 154, older releases and ESR keep the failure.
- Safari: [WebKit bug 319492](https://bugs.webkit.org/show_bug.cgi?id=319492), fixed on 2026-08-19 as 319474@main ([WebKit PR 69559](https://github.com/WebKit/WebKit/pull/69559)). [Safari Technology Preview 252](https://webkit.org/blog/18304/release-notes-for-safari-technology-preview-252/) (2026-09-11) covers 319252@main to 320112@main, so it has the fix, though its notes do not mention it. [Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) rewrote the module loader and says nothing about failed fetches. I found no Safari release with the change, so Safari counts as keeping the failure.
- [MDN browser-compat-data#30304](https://github.com/mdn/browser-compat-data/issues/30304) tracks the compatibility entry.

So Try again first renders the page again in place, which is enough in Firefox 155 and Chrome 156 and later, and reloads the current address when the same failure comes straight back: in Chrome up to 155, in Safari, in older Firefox, and after every stale deploy on devshark.app.

### Vite's `vite:preloadError`

Vite 6.4.3's preload helper (`preload()` in `client/node_modules/vite/dist/node/chunks/dep-Dm0c1Wj2.js`) dispatches `vite:preloadError` on `window` for each dependency stylesheet that fails and for the rejection of the dynamic import itself. It does not wait for a JavaScript `modulepreload` link, so that failure arrives through the import. `preventDefault()` makes the helper swallow the error, and the import resolves to `undefined`. The helper also remembers every dependency it added, so it never adds a failed stylesheet link again. The intent preloads of `lib/routePreload.ts` go through the same helper, so a pointer resting on a link during a network blip fires the event. The listener in `lib/routeRecovery.ts` therefore only remembers which errors were chunk failures. It never reloads and never calls `preventDefault()`.

### How the page comes back

| Situation | What happens |
| --- | --- |
| A page chunk, or a chunk the page imports, fails on a visit | While the current page (or, on the first page of a visit, the loader) stays on screen, `lazyPage` fetches `/` with `cache: 'no-store'` and compares its entry script with the page's. Another entry means a newer build, and the tab reloads: at most once a minute per tab (a `sessionStorage` stamp), and not at all when storage throws. Otherwise the panel shows in the route box: "Something went wrong", "Network error. Check your connection and try again.", Try again |
| Try again | The page renders again in a transition, with a fresh lazy component, so the panel stays until the page can draw. When the same failure comes straight back and the server answers, the address reloads; the learner's press reloads even within the minute |
| Offline (`navigator.onLine === false`) | No check and no reload; the panel waits. The `online` event renders the page again and, if that fails, reloads once, within the same budget |
| A page's stylesheet fails | Try again and the `online` event reload, since the page would otherwise draw unstyled |
| The nav while the panel shows | Each path mounts a fresh boundary, so another page opens without a retry; the failed page is asked for afresh on the next visit |
| A page throws | The root screen's text and both of its buttons, inside the shell |
| A preload on hover fails | Nothing: `routePreload` swallows it, and the listener only remembers the error |
| supabase-js fails on a sign-in click | The button says "Sign-in failed. Please try again."; no reload, no route panel |

The boundary reports each failed chunk once per page load through `reportError` (Sentry, when a DSN is set) with the component stack and `chunkLoad: true`; the message names the chunk's URL and nothing personal. A preload started by a hover never reaches it. A page that throws is reported every time, as the root boundary does.

`RouteErrorBoundary` sits inside the route `Suspense` and inside the `m.div` keyed by the path, around `<Routes>`. Outside the `Suspense`, catching would unmount it, and the remounted `Suspense` would show its fallback at once: the blank beat GLITCH removed. Inside the keyed box each path mounts a fresh boundary, so leaving a failed page needs no retry, and the router's transition keeps the panel until the next page can draw. The boundary renders no element of its own, so the route box stays the wrapper's first child, which `navigation.spec.ts` samples.

The panel is the root screen's card (`ErrorPanel`), announced as an alert, with `aria-busy` while it checks or reloads. A navigation still moves focus to `<main>` 230ms after the page changes, and the next Tab reaches Try again. When the page that held focus disappears without a navigation, focus moves to the card. Try again uses Astryx's interruptible loading state, so it stays enabled and keeps focus through a retry that fails. An active quiz hides the chrome, and a failure brings it back.

| Commit | What |
| --- | --- |
| `7481302` | `ErrorPanel`: the root screen's card, shared; its buttons now wrap at a narrow width |
| `899719d` | `lib/routeRecovery.ts`: which errors are chunk failures, the reload and its guard, the build check, `lazyPage` and `renewFailedPages`, with unit tests |
| `08a509d` | `RouteErrorBoundary`, its place in `App.tsx`, the listener in `main.tsx`, and the boundary's unit tests (14 in `client/tests/route-errors.test.tsx`) |
| `8ea86c3` | `tests/browser/route-errors.spec.ts`; the "Browser checks" step runs it after `navigation.spec.ts` |
| `f496fe1` | Merge of `origin/main` at `7b4bc8f` (Supabase on demand). The one conflict, in `quality.yml`, keeps both specs, `lazy-auth.spec.ts` first |
| `b7358e2` | The browser spec drops the supabase-js chunk on a sign-in click |
| `4b99f11` | This record, a rule in `DESIGN_RULES.md` §8 and P1.9 in `docs/design/product-ux-audit.md` |
| `10c9e3e` | Merge of `origin/main` at `d2d9085` (documentation only: the bundle record for `7b4bc8f`). The one conflict, at the end of this file, keeps main's lines first, then this section |
| this commit | The live stale deploy above, and the checks on the second merge |

### Evidence

| Check | Result |
| --- | --- |
| `tests/browser/route-errors.spec.ts` against `vite preview` of this branch, built as CI builds (the placeholder Supabase project from `docs/quality/bundle-budget.json`), Chromium 141 | 6 passed. The page chunk, the imported chunk and the offline test each came back by a reload, the path Chromium 141 takes; the second sign-in click after a failed supabase-js download made no request and failed again |
| The same spec against builds of `b74d7ae` (five tests then) and `7b4bc8f` | 4 failed on each: the page chunk, the imported chunk, offline and the newer build, each with the root screen in place of the app. The hover and supabase-js tests pass there too, because they guard against a reload that neither commit makes |
| The hover test against a build that reloads on every `vite:preloadError`, the handler Vite's documentation suggests | fails: the hover reloads the page |
| 13 mutations of `routeRecovery.ts` and `RouteErrorBoundary.tsx`, one at a time, against `client/tests/route-errors.test.tsx` | each fails at least one test: no renewal (5 fail), `preventDefault()` in the listener (1), a reload offline (1), no cooldown (3), an automatic reload without storage (1), a build check offline (1), no `online` listener (2), the learner's press on the cooldown (1), a reload on every visit the server answers (3), a stylesheet failure rendered again (1), no report dedupe (1), the build comparison inverted (1), no build check before the error (1) |
| The panel at 360, 390, 768 and 1280px, light and dark, after a dropped Coding chunk | header and footer in place, no horizontal overflow; focus on `<main>`, then Tab reaches Try again; Try again 86×44 with a touch pointer and 86×32 with a mouse, the root screen's Astryx size |
| `npm run check:bundle`, both builds made as CI makes them | 226,027 of 243,000 gzip bytes; `7b4bc8f` measures 224,479, so the recovery code adds 1,548 to the entry |

### Release contract on the final head

The code is that of `b7358e2`; the commits after it change documentation only. I ran every command below, and each exit code is its own. Browser runs used `CHROME_BIN=/opt/pw-browsers/chromium` and `vite preview` on port 4511. After the second merge (`10c9e3e`, which brings a new `docs/quality/bundle-budget.json`), `npm run check:bundle` ran again: exit 0, 226,027 gzip bytes.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0; the twelve-function budget holds |
| `npm run test:client` | exit 0; 27 files, 277 tests (14 new in `route-errors.test.tsx`) |
| `test:coding-auth`, `test:grading-integrity`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks` | exit 0 each |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build` | exit 0 |
| The workflow's build step: the Supabase placeholders, then `npm run build`, `npm run check:public`, `npm run check:bundle` | exit 0 each; 13 public URLs; 226,027 of 243,000 gzip bytes |
| `npm audit --omit=dev`, root and client | exit 0 each; 0 vulnerabilities |
| Browser specs `route-errors`, `navigation`, `public`, `lazy-auth`, `evolving`, `segmented`, `on-accent` against that build | exit 0 each; 6, 2, 5, 5, 2, 4 and 12 passed |
| `npm run check:responsive -- --routes /,/coding --widths 360,390,768,1280`, light, then with `RESPONSIVE_THEME=dark` | exit 0 each; 8 probes, 0 with issues |
| `npm run test:harness` | exit 0; 196 assertions in Chromium |
| Each commit before the merge on its own (`7481302`, `899719d`, `08a509d`, `8ea86c3`, from `git archive`): client `tsc -b`, the tooling typecheck, `vitest run` | exit 0 at every one; 238, 243, 252 and 252 tests |
| `git diff --check`, `git diff --check origin/main...HEAD` | clean |

Not run: the Storybook build and its spec, since no story imports a module this change touches, and Lighthouse.

### Hand-off

Found on the way and left alone, because the request did not cover them:

- `vercel.json`: the catch-all rewrite serves `index.html` for a missing `/assets/` file, and the assets header rule marks that answer `immutable` for a year. Excluding `assets/` from the rewrite would turn a missing chunk into a 404 that no cache keeps.
- supabase-js since `7b4bc8f`: `loadSupabase()` forgets a failed download, but Chromium up to 155 keeps the failed module fetch. Measured here: after one dropped download, a second sign-in click makes no request and shows "Sign-in failed. Please try again." again, until a reload. The sign-in path needs its own fallback in those browsers; this change does not reload for it.
- The Coding task screen's own Try again for the workbench (`useWorkbench` in `CodingSection.tsx`) calls `loadWorkbench()` again, which fails the same way in those browsers.
- `AuthButton` in the header and `UpgradeSheet` are lazy chunks outside the route boundary, so their failure still reaches the root screen.
- Lazy parts inside pages (Today's four sections, `PathDiscovery`, `FriendsPanel`, the code highlighter, `PathRewardClaim`, the Learn workbench) use `React.lazy`. A failure there shows the route panel, and Try again gets them back only through the reload.

Not verified: Firefox and Safari, whose rows come from the sources above; the in-place path in a real browser, since Chromium 141 always takes the reload (the unit tests cover it); a real deploy (the spec fakes one by answering the chunk with `index.html` and `/` with another entry script); Sentry, which has no DSN here (the unit tests check the calls to `reportError`); devshark.app, where this is not deployed; physical phones and screen readers (the alert role and the focus order were checked through Playwright's role queries and the focused element).

## 2026-09-26 — the first load of a page holds still (CLS)

The owner asked me to find and remove the layout shift on devShark's first page load, and to add a check that fails if it comes back. Lighthouse named `<main id="main-content">` as the only shifting node and scored 0.979 on the desktop preset (1350×940) and 0.959 on the phone profile (412×823), in some runs and not in others. GLITCH recorded it above with its cause untraced.

### What moved

I recorded `layout-shift` entries with a `PerformanceObserver` (`buffered: true`) on cold loads of `/` from a `vite preview` of `7b4bc8f`, in Playwright's Chromium 141 at Lighthouse's two sizes. Each load had one entry, 0.9793 on the desktop and 0.9592 on the phone, with these sources (`previousRect` → `currentRect`, CSS pixels):

| Node | Desktop, 1350×940 | Phone, 412×823 |
| --- | --- | --- |
| `main#main-content` | top 73, height 867 → top 57, height 883 | top 73, height 750 → top 61, height 762 |
| `footer.ss-brand-footer` | 1000×69 at top 787 → out of view | 376×137 at top 614 → out of view |
| The header's slots | left slot and nav up 8px, right slot down 4px and 9px wider | left slot up 6px, right slot 9px wider and 12px shorter |

`<main>` moved 16px on the desktop and 12px on the phone. Two changes shared one frame:

1. The header shrank from 73 to 57px (61px with a touch pointer). The account widget is a lazy chunk, and its `Suspense` placeholder was a 56px square, the height of the avatar row and of the widget's loading skeleton, so the toolbar stood 72px tall under it. A signed-out visitor's widget is the 32px "Log in" button (44px with a coarse pointer), and the toolbar settled at 56px (60px). Since `7b4bc8f` a visitor with no stored session is signed out from the first render, yet the header drew the placeholder until the chunk arrived. Before `7b4bc8f`, `AuthProvider` started in `loading`, so the placeholder and then the widget's 56px loading skeleton held the header at 73px; a build of `2e6b8ba`, where the owner first measured the shift, drops from 73 to 57px the same way.
2. The footer fell out of view. Until the first page's chunk arrived, the route `Suspense` showed its fallback, a box that fills the content area, and the footer sat under it at the bottom of the first viewport. The landing page then pushed it from 787 to 3,417px (614 to 5,347px on the phone).

A frame's score is the area that moving nodes covered before and after, as a share of the viewport, times the longest move as a share of the viewport's larger side, capped at 1. `<main>` and the header slots covered 97.9% of the desktop viewport and 95.9% of the phone's; the footer moved farther than either side is long, so the distance factor was 1. Apart, the header change scores 0.012 on the desktop (0.014 on the phone) and the footer's move 0.054 (0.152).

### Why it came and went

- React 19 reveals a `Suspense` boundary's content no sooner than 300ms after the boundary showed its fallback (`FALLBACK_THROTTLE_MS` in react-dom 19.2.7) and commits every retry that resolved in the meantime together. When the account widget and the landing page both arrived within that window, as they did on a quick local load, the header and the footer moved in one frame: 0.979. When the page came later, the two moves fell into separate frames, 0.012 and 0.054, which is the 0.066 of the runs that missed it. Holding every lazy chunk for 800ms split them every time.
- Under phone emulation Chromium flagged the shift as recent input. A saved Lighthouse trace of `3a8cf13` holds a `LayoutShift` event of 0.9592 at 634ms with `had_recent_input: true` and `last_input_timestamp` at 102ms, the time of the first viewport event, which the emulation causes. Lighthouse keeps a flagged shift only within 500ms of that event, so it dropped this one and scored the run 0 while the page moved. A shift that landed a little earlier, or late enough to go unflagged, counted. Lighthouse's `--throttling-method=devtools` applies real CPU and network throttling, which moves the shifts past both windows.

The same mechanism hit the first load of every page: each drew its footer under the loader, and each signed-out header shrank.

### The fix

| Commit | What |
| --- | --- |
| `2805907` | `SignInButton` holds the signed-out "Log in" button and its failure toast, and ships in the entry. The header renders it whenever `useAuth()` reports no user and nothing loading, which it knows at the first render. The lazy `AuthButton` and its 56px placeholder stay for a stored session or a sign-in in progress, where the placeholder, the skeleton and the avatar row all stand 56px tall; its own signed-out branch renders `SignInButton`. A signed-out first visit no longer requests the `AuthButton` chunk, nor the wallet read (`GET /api/user/[op]?op=wallet`) the widget sent without a session |
| `b05c3c9` | `BrandFooter` renders inside the route `Suspense`, after the keyed route box, so it arrives with the first page and never sits under the loader. A navigation keeps both, as before |
| `28b9ab7` | `tests/browser/first-load.spec.ts`, which the "Browser checks" step runs |
| `a264cea` | Merge of `origin/main` at `d2d9085` (documentation only) |
| `d902d8c` | The first-frame rule in `DESIGN_RULES.md` §8 |
| `b4747a0` | Merge of `origin/main` at `3a8cf13` (ERRBOUND). Three conflicts, each resolved by keeping both sides, main's first: the spec list in `quality.yml`, the two rules in §8, and the comment above the route `Suspense` in `App.tsx`. The code merged without conflict: `RouteErrorBoundary` wraps the routes inside the keyed box, and the footer follows the box inside the `Suspense`, outside `RouteErrorBoundary` |
| `6624e8a` | This record |
| `fec41e4` | The CLS item in `NEEDED.md`, marked done |
| `a659c59` | Merge of `origin/main` at `f4e7cbb`, which changes `scripts/test-harness.ts` only; no conflict |
| this commit | The checks on `a659c59` |

Nothing hides the page or waits for the load event. The skip link, the route focus, the loader for a slow first page, reduced motion, both themes and the waterline clearance work as before, and the final layout of `/` is identical: header 57px (61px on the phone), `<main>` from there down, footer at 3,417px (5,347px). ERRBOUND's hand-off lists a failed `AuthButton` chunk as reaching the root screen; a signed-out visitor no longer requests that chunk, and a session still does.

### The regression check

`tests/browser/first-load.spec.ts` loads `/` cold at Lighthouse's desktop size and its phone size (touch, 1.75 device pixel ratio). It lets the entry script and its preloads through and holds every other chunk for 800ms, so the shell draws alone before the page, whatever the machine's speed. It records each animation frame and every `layout-shift` entry, the input-flagged ones included, and checks that the header's height and `<main>`'s top never change, that no frame shows the footer without the page, that neither `<main>`, the header nor the footer is among the moved nodes, and that the entries add up to less than 0.01. The mechanism checks are soft, so a failure names each one that came back.

| Build | Result |
| --- | --- |
| `3a8cf13`, built as CI builds it (the placeholder Supabase project) and as the owner measured | 2 failed, twice: header 73 then 57px (61px on the phone), `<main>`'s top the same, 63 to 65 frames with a footer and no page, `<main>` and the footer among the moved nodes, 0.066 and 0.166 of shift |
| `7b4bc8f` | 2 failed, the same checks |
| The header change alone (`2805907`, on `7b4bc8f`) | 2 failed, on the footer checks only: 45 and 54 frames, 0.054 and 0.152 of shift |
| `b4747a0`, both builds | 2 passed each |
| `b4747a0`, CI's build, `--repeat-each=5` | 10 passed |
| A scratch copy of the spec that adds 4x or 6x CPU throttling, `--repeat-each=2` | `3a8cf13`: 4 failed at each rate; `b4747a0`: 4 passed at each rate |

### Evidence

Lighthouse 13.4.1 against `vite preview` of builds made with `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build`, `CHROME_PATH=/opt/pw-browsers/chromium`, performance category only. "Phone" is Lighthouse's default profile.

| Build | Profile | CLS, run by run |
| --- | --- | --- |
| `3a8cf13` (`origin/main`) | desktop (`--preset=desktop`) | 0.979, 0.979, 0.979, 0.979, 0.979 |
| `3a8cf13` | phone | 0, 0, 0, 0, 0. A sixth run, saved with its trace, is the one described above: the shift happened and Lighthouse dropped it |
| `3a8cf13`, again with the container quieter | desktop; phone | 0.979, 0.979, 0.979, 0.979, 0.979; 0, 0.959, 0, 0, 0.959 |
| `3a8cf13` | phone, `--throttling-method=devtools` | 0.152, 0.152, 0.166, 0.152, 0.152 |
| `b4747a0` | desktop | 0, 0, 0, 0, 0 |
| `b4747a0` | phone | 0, 0, 0, 0, 0 |
| `b4747a0` | phone, `--throttling-method=devtools` | 0, 0, 0, 0, 0 |
| `a659c59`, the final head | desktop; phone; phone with `--throttling-method=devtools` | 0, 0, 0, 0, 0; 0, 0, 0, 0, 0; 0, 0, 0, 0, 0 |
| `7b4bc8f`, before either merge | desktop; phone | 0.979, 0.979, 0.979; 0, 0, 0.959 |
| `b05c3c9`, before either merge | desktop; phone | 0, 0; 0, 0 |

No "after" run lists a node in Lighthouse's `layout-shifts` audit. `origin/main` moved to `f4e7cbb` during the step; it changes only `scripts/test-harness.ts`, and its build is byte for byte that of `3a8cf13` (`diff -rq` of the two `dist` folders), so the `3a8cf13` rows are also its numbers.

The first load of other pages, from CI's builds of both commits, every `layout-shift` entry counted (input-flagged ones too), the API answering 503, one cold load each in Playwright's Chromium 141, the desktop at full speed and the phone with 4x CPU throttling:

| Page | `3a8cf13` desktop | `3a8cf13` phone | `b4747a0` desktop | `b4747a0` phone |
| --- | --- | --- | --- | --- |
| `/` | 0.979 | 0.959 | 0 | 0 |
| `/learn` | 0.013 | 0.119 | 0.001 | 0 |
| `/quiz` | 0.057 | 0.600 | 0 | 0 |
| `/today` | 0.012 | 0.052 | 0.0004 | 0.038 |
| `/coding` | 0.979 | 0.959 | 0 | 0 |
| `/leaderboard` | 0.053 | 0.422 | 0.004 | 0.050 |
| `/premium` | 0.980 | 0.959 | 0.0004 | 0 |
| `/topics/javascript-closures` | 0.823 | 0.959 | 0 | 0 |

What remains on `/today` and `/leaderboard` is the footer moving as the page grows after its first draw; GLITCH lists both among the pages that draw in two steps.

A signed-in visitor on CI's builds, with a well-formed fake session planted and Auth answered locally, every entry counted:

| Build | Desktop | Desktop, chunks held 800ms | Phone | Phone, chunks held 800ms |
| --- | --- | --- | --- | --- |
| `3a8cf13` | 0.088 | 0.059 | 0.152 | 0.152 |
| `b4747a0` | 0.004 | 0.004 | 0 | 0 |

The header stood 73px in every frame for a session, before and after. The 0.004 left on the desktop is the nav re-centring when the account widget, wider than the 56px placeholder, replaces it.

`npm run check:bundle`: 226,027 gzip bytes on `3a8cf13` and 226,147 on `b4747a0`, 120 more, all in the entry script, which now carries `SignInButton`. Before the ERRBOUND merge the same change measured 106 bytes (224,479 on `7b4bc8f`, 224,585 on `a264cea`).

### Release contract on the final head

I ran every command below on `a659c59`, and each exit code is its own. Its two builds, the owner's and CI's, are byte for byte those of `b4747a0`, where the other measurements above ran. Browser runs used `CHROME_BIN=/opt/pw-browsers/chromium` and `vite preview` on ports 4541 to 4549.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0; the twelve-function budget holds |
| `npm run test:client` | exit 0; 27 files, 277 tests |
| `test:coding-auth`, `test:grading-integrity`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks` | exit 0 each |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build` | exit 0 |
| The workflow's build step: the Supabase placeholders, then `npm run build` and `npm run check:public`; `npm run check:bundle` | exit 0 each; 13 public URLs; 226,147 of 243,000 gzip bytes |
| `npm audit --omit=dev`, root and client | exit 0 each; 0 vulnerabilities |
| Browser specs `first-load`, `navigation`, `public`, `lazy-auth`, `route-errors`, `evolving`, `segmented`, `on-accent` against CI's build | exit 0 each; 2, 2, 5, 5, 6, 2, 4 and 12 passed |
| `first-load.spec.ts` with `--repeat-each=5` against CI's build, and once against the owner's build | exit 0 each; 10 and 2 passed |
| `npm run check:responsive` on CI's routes (`/`, `/quiz`, `/topics/javascript-closures`, `/cs/topics/javascript-closures`) at 360, 390, 430, 768, 1024, 1280 and 1440, light, then with `RESPONSIVE_THEME=dark`; then CI's dark Czech sweep | exit 0 each; 28, 28 and 6 probes, 0 with issues |
| `npm run check:responsive` on `/` and twelve section routes at 360, 390, 768 and 1280, light and dark | exit 0 each; 52 probes, 0 with issues |
| `npm run test:harness`, as `f4e7cbb` changed it | exit 0; 196 assertions in Chromium |
| Each commit of this branch on its own (`2805907`, `b05c3c9`, `28b9ab7`, `d902d8c`): client `tsc -b`, the tooling typecheck, `vitest run` | exit 0 at every one; 263 tests each |
| `git diff --check`, `git diff --check origin/main...HEAD` | clean |

On `a264cea`, before the ERRBOUND merge, `evolving.spec.ts` failed once, in its dark run: the React test ran and reported 0 of 1 passing ("Unable to find a label with the text of: Email"). It passed 2 of 2 on `b4747a0`, and 8 of 8 on each of `3a8cf13` and `b4747a0` with `--repeat-each=4`, so I could not reproduce it. The spec exercises the coding workbench, which this change does not touch.

Not run: the Storybook build and its spec; no story imports a module this change touches.

Not verified: devshark.app, where this is not deployed; Firefox and Safari; physical phones; a real Supabase session (the signed-in runs planted a fake one). Lighthouse ran on a container that other sessions shared, so its timings varied; CLS does not depend on them beyond the timing windows described above.

## 2026-09-27 — the five pages GLITCH left drawing twice (HOLDS)

GLITCH ended with a list of pages that still drew in two steps after a click. The owner asked for five of them to draw once: `/premium` signed in with Premium, `/leaderboard`, `/challenge`, `/today` signed in, and `/roadmap`. Each now holds its first render with `useFirstData` for the reads that decide what it shows, at most 1.2s and not at all offline, and the sections that keep chunks of their own load inside the same hold. While a page waits, the previous page stays on screen, marked busy, as GLITCH set up.

| Commit | What |
| --- | --- |
| `b5738f7` | `lib/routeData.ts`: `lazyPart`, a section kept out of its page's chunk whose code the page's hold can load, so it draws in the same frame as the page. A part the hold did not wait for loads on mount and draws nothing until it arrives, as `Suspense fallback={null}` did. `useFirstData` also skips the wait when the query client reports no connection, because the client pauses its reads then. `client/tests/firstDraw.ts` reads the document when a page's heading first appears |
| `e689c25` | `/premium` holds for `entitlementQuery(user.id)` when signed in; a visitor waits for nothing. The signed-in Premium and voucher tests mount inside an awaited `act` |
| `6233f06` | `leaderboardQuery(request)` in `lib/queries.ts` gives the hook and the prefetch one set of options, so their keys cannot drift. `/leaderboard` holds for `{ period: '30d', category: null, viewer }` |
| `c5518f0` | `challengeLeaderboardQuery(subject)`. `/challenge` holds for its board, which is best-effort: a failed read draws the page with its own notice |
| `063d256` | Today's four signed-in sections become `lazyPart`s. Signed in, the hold loads their code with the concepts due, the open run, the coding progress, the enrollments and, for each active enrollment, its progress and the path catalogue. The sections and the hold share `conceptDueQuery` and the learning-path query options |
| `61dc75e` | `useLoc` moves from `ActivityViews` to `paths/localized.ts`. `PathDiscovery` imported it, and with it the editor and the test runner |
| `72d1385` | `/roadmap` loads `PathDiscovery` as a `lazyPart` inside its hold, with the catalogue and, signed in, the enrollments |
| `3eb32a8` | Merge of `origin/main` at `7b4bc8f` (Supabase on demand); no file changed on both sides |
| `c9c6796` | Merge of `origin/main` at `3a8cf13` (ERRBOUND); no file changed on both sides |
| `cce099b` | A part's fallback is ERRBOUND's `lazyPage` instead of `React.lazy`: when a part's chunk fails, the route boundary's Try again asks for it afresh, and a newer build on the server reloads before the error shows. This settles Today's sections and `PathDiscovery` in ERRBOUND's hand-off |
| `7f251d9` | Today imports the run's and the coding progress's query options inside the hold, signed in only, so a visitor does not download them |
| `ca7d990` | Merge of `origin/main` at `f4e7cbb` (`scripts/test-harness.ts` only); no conflict |
| `312f910` | Merge of `origin/main` at `346a824` (CLS: the signed-out sign-in button with the shell, the footer inside the route `Suspense`); no file changed on both sides |
| this commit | This record, the rule in `DESIGN_RULES.md` §8 and a line in `docs/design/product-ux-audit.md` |

### The sections stay lazy

Gzip bytes outside the initial bundle, from the measurement builds below:

| Chunks | `346a824` | `312f910` |
| --- | --- | --- |
| `/today`, what every visitor loads | 48,059 | 48,619 |
| Today's four sections on top, signed in only | 13,901 | 14,197 |
| `/roadmap` | 35,142 | 35,437 |
| `PathDiscovery` on top | 189,646 | 4,257 |
| `/profile`, whose paths card also imported `useLoc` | 238,402 | 53,465 |
| `/premium`, `/leaderboard`, `/challenge` | 26,581, 18,782, 33,922 | 27,233, 19,119, 34,273 |

A visitor to `/today` downloads 560 bytes more, the hold and `lazyPart`, and never the sections. `PathDiscovery` used to pull the task editor and its 174,283-byte test runner through `useLoc`; now it is 802 bytes and a stylesheet, so the roadmap can wait for it. `/premium`, `/leaderboard` and `/challenge` each load `lib/routeData.ts` now, 337 to 652 bytes. `npm run check:bundle`, which measures the initial requests of a production-shaped build, reads 226,188 of 243,000 gzip bytes on `312f910` and 226,147 on `346a824`. The 41 bytes are export bindings: the entry exports four more names to the lazy chunks, and the TanStack chunk exports `onlineManager`, which `useFirstData` now reads. At `b74d7ae`, the base this work started from, the check as it stood then read 221,847, as CI did.

### The offline board

`/leaderboard` keeps its offline path. The screen stores the last board it loaded in `localStorage` (`devshark:leaderboard:v1:<period>:<category>`, without the learner's own line) and shows it, marked stale, when a read fails on the network or the query client pauses it. Offline, `useFirstData` does not wait. A failed prefetch leaves the screen to its own read, which lands on the same stored board. Three tests in `leaderboard.test.tsx` cover a network failure, a paused query client and an empty store. `useFirstData` asks the query client too: `navigator.onLine` stays true while the client is paused, and the screen would otherwise have waited out the whole 1.2s.

### Measured before and after

The GLITCH harness, copied to `.holds-evidence/` and never committed, with four changes. Every public read is fetched from devshark.app once, stored and replayed. Every API answer, signed in or not, waits 250ms. The 30-day board and the Challenge board answer populated fixtures, because production's were empty. And the two builds are served side by side on two ports and measured visit by visit, the order alternating, so load from the other sessions on this machine falls on both. Two earlier runs, on a busier machine, had put about 30ms on a signed-out `/premium` visit, which waits for nothing; its visits then ranged from 102 to 345ms, against 81 to 131ms in the run below. The signed-in account holds Premium from a voucher, an open challenge run, three concepts due, an active DSA Foundations enrollment, its own line on the 30-day board and two saved cards. Both builds are `vite build` with `VITE_SUPABASE_URL` naming their own port, so supabase-js restores the fake session from storage.

Before is `origin/main` at `346a824`, after is `312f910`, the same client code as `7f251d9` with main's first-load fix merged. Each row is the first visit to the section in a fresh page load, clicked from `/` once it settled, at 1280 and 390px, in three rounds: light and dark signed out (12 visits for each build and section), light signed in (6). Times are medians; roots and content states are the most any visit showed.

Signed out, before → after:

| Section | Empty frames | Loader frames | Footer in view on an empty page | Roots drawn | Content states | New page drawn (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `/premium` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 1 → 1 | 90 → 91 |
| `/leaderboard` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 1 | 76 → 345 |
| `/challenge` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 1 | 99 → 364 |
| `/today` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 1 → 1 | 342 → 342 |
| `/roadmap` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 1 | 398 → 408 |

Signed in with Premium, before → after:

| Section | Empty frames | Loader frames | Footer in view on an empty page | Roots drawn | Content states | New page drawn (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `/premium` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 1 | 107 → 374 |
| `/leaderboard` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 1 | 78 → 354 |
| `/challenge` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 1 | 103 → 364 |
| `/today` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 4 → 1 | 376 → 655 |
| `/roadmap` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 3 → 1 | 416 → 422 |
| `/collection` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 2 | 86 → 93 |

A page that waits draws later than its first paint used to, and is complete no later. Median time from the click to the last change in the content area, and the median layout shift after the first draw:

| Section | Last change, signed out (ms) | Last change, signed in (ms) | Layout shift after the first draw, signed in |
| --- | --- | --- | --- |
| `/premium` | 90 → 91 | 373 → 374 | 0.066 → 0 |
| `/leaderboard` | 351 → 345 | 351 → 354 | 0 → 0 |
| `/challenge` | 371 → 364 | 363 → 364 | 0 → 0 |
| `/today` | 342 → 342 | 1,178 → 655 | 0.011 → 0 |
| `/roadmap` | 928 → 408 | 936 → 422 | 0 → 0 |

Signed out, neither build shifted after the first draw. What the second draws were, at 1280px: on `/premium`, "Your plan" arrived above the plans and the page grew from 2,552 to 2,690px (3,346 to 3,502 at 390px). On `/leaderboard` the six-row skeleton became the board, 717 to 1,034px signed in. On `/challenge` the "…" beside the intro became the top five, which at 390px grew the page from 727 to 891px. Signed in, `/today` drew its plan at about 380ms, the review and run sections at about 900ms and the path at about 1,180ms, because the path's next step waits for its enrollment. On `/roadmap` the optional paths arrived at 926ms and grew the page from 2,374 to 3,113px. The roadmap now finishes about half a second sooner, since `PathDiscovery` no longer waits for the test runner.

`/collection` is not one of the five. The fixtures now answer the flashcards read, so it is measured for the first time: the saved cards still arrive after the page.

### Tests

`npm run test:client`: 28 files, 292 tests, 15 of them new. Six are in `client/tests/page-holds.test.tsx`, for `/challenge`, `/today` and `/roadmap`; five in `route-loading.test.tsx`, for the paused query client, `lazyPart` and a failed part retried through the route boundary; two in `premium-page.test.tsx` and two in `leaderboard.test.tsx`. Each first-frame test reads the document when the page's heading first appears (`client/tests/firstDraw.ts`); an awaited `act` runs every commit before it returns, so without it a test cannot tell a page that draws once from one that redraws.

A test of a page that holds mounts inside an awaited `act`, and each mount gets a history entry with a key of its own. A router inside a root that suspends mints a new random key on every retry, the hold then starts a new wait each time, and React gives up after 100 attempts. A hold that also loads code can outlast the `act`, so the page tests import the sections' modules in `beforeAll` and then await the page's heading. With the five page components put back to `origin/main`'s, the seven first-frame tests fail and the other 28 tests in those files pass. With `React.lazy` in place of `lazyPage` in `lazyPart`, the retry test fails.

### Release contract on the final head

All on `312f910`, the code of this record's commit. I ran every command below, and each exit code is its own. Browser runs used `CHROME_BIN=/opt/pw-browsers/chromium`.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0; the twelve-function budget holds |
| `npm run test:client` | exit 0; 28 files, 292 tests |
| `test:coding-auth`, `test:grading-integrity`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks` | exit 0 each |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build` | exit 0 |
| `npm run check:bundle` | exit 0; 226,188 of 243,000 gzip bytes (`346a824`: 226,147, exit 0) |
| The workflow's build step: the Supabase placeholders, then `npm run build` and `npm run check:public` | exit 0 each; 13 public URLs |
| `npm audit --omit=dev`, root and client | exit 0 each; 0 vulnerabilities |
| Browser specs `navigation`, `public`, `segmented`, `on-accent`, `evolving`, `lazy-auth`, `route-errors` and `first-load` against `vite preview` of that build on :4523 | exit 0 each; 2, 5, 4, 12, 2, 5, 6 and 2 passed |
| `npm run check:responsive -- --base-url http://localhost:4523 --routes /premium,/leaderboard,/challenge,/today,/roadmap --block-external`, light, then with `RESPONSIVE_THEME=dark` | exit 0 each; 35 probes, the five routes at 360, 390, 430, 768, 1024, 1280 and 1440px, 0 with issues |
| `npm run test:harness` | exit 0; 196 assertions in Chromium |
| `npm run build:storybook --prefix client`, then `tests/browser/storybook.spec.ts` against the static build on :4524 and against `storybook dev` on :4525, as CI runs it | exit 0 each; 6 passed each time |
| Each code commit on its own: client `tsc -b`, `npm run typecheck:tooling --prefix client`, `vitest run` | exit 0 at every one: `b5738f7` to `72d1385` checked out in order (242, 244, 246, 248, 250, 250 and 252 tests), `cce099b` and `7f251d9` from `git archive` (292 each) |
| `git diff --check`, `git diff --check origin/main...HEAD` | clean |

Not verified: devshark.app (not deployed), a real Supabase session (the signed-in runs used a fake session and fixtures), Firefox, Safari and physical phones.

### Hand-off

- A direct load of a signed-in page. Since `7b4bc8f` supabase-js downloads when a session is stored, and `AuthProvider` reports no user until it has restored the session. A page that mounts before then holds for a visitor's reads and draws the account's data when it arrives, as before this change. Holding for the session restore as well would close that.
- `/collection`, signed in: the saved cards arrive after the page.
- The other lazy parts inside pages that ERRBOUND listed (`FriendsPanel`, the code highlighter, `PathRewardClaim`, the Learn workbench) still use `React.lazy`.

## 2026-09-27 — the four gaps ERRBOUND left open (HARDEN)

The owner asked me to close four gaps from ERRBOUND's hand-off, each with a test that fails on the old behaviour: devshark.app answered a missing chunk with `index.html` under a year-long cache; after one failed supabase-js download no sign-in press could work without a reload; the Coding workbench's own Try again hit the same wall; and the lazy parts of the shell took a failure to the root error screen.

| Gap | The change | The test |
| --- | --- | --- |
| The SPA rewrite caught `/assets/`, and the assets header rule marked the `index.html` it served `public, max-age=31536000, immutable` | A path under `/assets/` or `/sandbox/assets/` with no file behind it answers 404 with `Cache-Control: no-store`. Only a file that exists gets the year-long cache | `vercelRoutingContracts()` in `scripts/vercel-routing-contract.ts`, which `npm run test:launch` runs |
| Chromium up to 155 and Safari answer a second import of a failed module from memory | A second press that meets the same chunk failure reloads the page; the next document finishes that sign-in and returns to the page that asked | 7 tests in `client/tests/supabase-lazy.test.tsx` and 1 in `route-errors.test.tsx`; in `lazy-auth.spec.ts`, "a second sign-in press after a failed download reloads…" |
| The workbench's Try again imported the failed chunk again | The press reloads when the same chunk failure comes straight back | 3 tests in `client/tests/coding-workbench-retry.test.tsx`; in `route-errors.spec.ts`, "the Coding workbench that fails to load…" |
| `AuthButton` and `UpgradeSheet` were `React.lazy` chunks outside the route boundary | Each is a `lazyShellPart` inside a `ShellPartBoundary`. The header keeps a retry in the account widget's 56px row; a sheet that fails closes with a toast | 6 tests in `client/tests/shell-parts.test.tsx`; two tests in `route-errors.spec.ts` |

### A missing file under `/assets/`

I probed devshark.app with `curl` on 2026-09-26 at 22:57 UTC and on 2026-09-27 at 08:31 UTC and got the same answers both times:

| Path | Status | Type | `cache-control` |
| --- | --- | --- | --- |
| `/assets/does-not-exist-0000.js` | 200 | `text/html` | `public, max-age=31536000, immutable`; the first probe also got `x-vercel-cache: HIT` and `age: 4798` |
| `/assets/coding-worker/does-not-exist-0000.js` | 200 | `text/html` | the same, with the worker's CSP |
| `/sandbox/assets/does-not-exist-0000.js` | 404 | `text/plain` | `public, max-age=31536000, immutable` |
| `/sandbox/does-not-exist.html`, `/topics/does-not-exist-zz` | 404 | `text/plain` | `public, max-age=0, must-revalidate` |

The third row settles whether Vercel's header rules reach a 404. `/sandbox/` sits outside the SPA rewrite, so that path gets Vercel's own 404, and the `/sandbox/assets/(.*)` rule still marks it immutable for a year. Vercel's CDN caches a 404 as it caches a 200, unless `Cache-Control` carries `private`, `no-cache` or `no-store` ([CDN cache, cacheable response criteria](https://vercel.com/docs/caching/cdn-cache#cacheable-response-criteria)).

What Chromium 141 keeps, measured with a local server that counts requests, one fresh browser context per answer, twice with the same numbers (a scratch harness, not committed):

| Answer for a chunk that is gone | Requests: first visit, after a navigation, after a reload | The file comes back, the page reloads |
| --- | --- | --- |
| 200 `text/html`, `nosniff`, `immutable`, as devshark.app answers today | 1, 1, 1: the browser reuses the stored HTML | fails, with no request |
| 404, `nosniff`, `immutable`: dropping `assets/` from the rewrite alone | 1, 2, 3 | loads |
| 404, `immutable`, no `nosniff` | 1, 1, 1 | fails, with no request |
| 404, `nosniff`, `public, max-age=0, must-revalidate` | 1, 2, 3 | loads |
| 404, `nosniff`, `no-store`: this change | 1, 2, 3 | loads |

So a browser that met today's answer once keeps the chunk broken after a rollback brings the file back. Whether Chromium reuses a stored 404 depends on the other headers; `no-store` keeps it out of the browser and out of Vercel's CDN whatever they are.

`vercel.json`'s `headers` cannot tell a missing file from one that exists. `@vercel/routing-utils` 6.6.0, the version Vercel CLI 60.1.3 bundles for `vercel build`, compiles each `headers` rule into a `continue` route ahead of `{ "handle": "filesystem" }` (`getTransformedRoutes`), which is how a rule reaches the 404. `has` and `missing` match the request only ([vercel.json, `has` and `missing`](https://vercel.com/docs/project-configuration/vercel-json#conditional-matching-with-has-and-missing)). The Build Output API splits routing into phases: routes after `{ "handle": "filesystem" }` run when the filesystem misses, and routes after `{ "handle": "hit" }` when it hits ([Build Output configuration, handler route](https://vercel.com/docs/build-output-api/configuration#handler-route)). `@vercel/next` 15.0.1 sets `/_next/static`'s immutable `cache-control` in the `hit` phase and answers a missing `/_next/static` file with 404 after a miss, and Nitro gives a missing asset a 404 with `no-store` after the filesystem check ([nitrojs/nitro#4474](https://github.com/nitrojs/nitro/pull/4474), merged 2026-09-03). `vercel.json` keeps its header rules in `routes` now:

| Phase | Routes |
| --- | --- |
| Before the filesystem check | The app's security headers on every path but the worker and the sandbox; `triage-verdicts.json`'s day-long cache; the worker's CSP, `nosniff` and CORP; the sandbox's CSP, `nosniff`, referrer policy and CORS; CORS on `/assets/`. No year-long cache |
| The filesystem missed | `^/(?:sandbox/)?assets/.*$` answers 404 with `Cache-Control: no-store` before any rewrite; then the ten rewrites, whose SPA fallback now leaves `assets/` alone |
| The filesystem hit | `^/(?:sandbox/)?assets/.*$` gets `public, max-age=31536000, immutable` |

A `headers` property would land after these routes, in the `hit` phase (`mergeRoutes` files each user route under the last `handle` above it), and reach existing files only. `handle` is a deprecated route property that the schema still accepts ([vercel.json, deprecated route properties](https://vercel.com/docs/project-configuration/vercel-json#deprecated-route-properties)).

`routes` next to `rewrites`: `@vercel/routing-utils` up to 5.3.3 (2026-02-13) refused the pair with "If `rewrites`, `redirects`, `headers`, `cleanUrls` or `trailingSlash` are used, then `routes` cannot be present." 6.0.0 (2026-02-26) and every later release accept it, CLI 60.1.3 declares 6.6.0, and the documentation says "You can use `routes` alongside `rewrites`, `redirects`, `headers`, `cleanUrls`, and `trailingSlash`" ([vercel.json, routes](https://vercel.com/docs/project-configuration/vercel-json#routes)). The preview build of `820fb64` accepted it (below). Should an older builder ever refuse it, a routes-only variant, with the rewrites compiled into the filesystem phase after the 404 rule, passes 5.3.3 and 6.6.0 alike and merges into the same routes.

`scripts/vercel-routing-contract.ts` checks: no `headers` property; the phases, in order; header-only `continue` routes before the filesystem check and after a hit; no `Cache-Control` before the filesystem check on an asset path; the 404 rule first after a miss, with `no-store` and no destination; no rewrite that catches `/assets/`, `/assets/coding-worker/` or `/sandbox/assets/`; the SPA fallback still serving `/`, `/coding`, a task, `/assets` and `/profile`; the year-long cache for hashed files only; the worker's and the sandbox's own headers. It turns each rewrite source into a pattern as routing-utils does (path-to-regexp 6), and the two agree on 11 sources and 27 paths.

### Sign-in after a failed download

`loadSupabase()` now remembers a failed download (`supabaseLoadFailed()`). When a press fails with a chunk error after an earlier failure in the same document, `auth.tsx` writes a mark to `sessionStorage` (`devshark:auth-resume`, valid for 60 seconds) beside the return path and reloads through `reloadOnPress`, which reloads only while the browser is online and `/` answers. The next document reads the mark once, as its modules load; with no session stored, it starts the sign-in without a press, and Google returns the learner to the page that asked.

| Situation | What happens |
| --- | --- |
| First press, the download fails | "Sign-in failed. Please try again.", as before; nothing reloads |
| Second press, the same failure | the page reloads, leaves for Google, and comes back to the page that asked |
| Offline, or `/` does not answer | no reload; the press fails and forgets the return path |
| The reload is refused (a leave-page prompt) | the press fails after 4 seconds and forgets the return path |
| The download failed in the background (a stored session's restore) | no reload; the first press after it reloads |
| A mark older than 60 seconds, or dated in the future | dropped with the return path; nothing downloads |
| The carried-over sign-in fails again | the shell says "Sign-in failed. Please try again." and reloads nothing |

Since `346a824` the header's "Log in" is `SignInButton`, which calls the same `signInWithGoogle`.

### The workbench's Try again

`useWorkbench` in `CodingSection.tsx` reloads through `reloadOnPress` when a retry fails with a chunk error. The button stays busy (`aria-busy`, `aria-disabled`) until the new document arrives, or for 4 seconds when the reload is refused, and ignores presses meanwhile. A task's first load, which nobody pressed for, never reloads. The change sits in the lazy `CodingSection` chunk.

### Shell parts

`lazyShellPart` in `lib/routeRecovery.ts` renews a failed part as `lazyPage` does, but never checks the build or reloads on its own: the shell loads these parts without a press. `ShellPartBoundary` sits inside the part's `Suspense`, reports a failed chunk once through `reportBoundaryError`, and draws the part's fallback. Its retry renders the part again in a transition, moves focus into the part when it draws if the retry had focus, and reloads through `reloadOnPress` when the same chunk failure comes straight back. A part that throws is rendered again and nothing more. HOLDS added a `lazyPart` to `lib/routeData.ts` for sections inside a page, which fail with their page; the shell's helper became `lazyShellPart` in the merge that followed.

- The account widget. Since `346a824` the header loads it for a session only. Its retry reads "Try again", with the accessible name "Account did not load. Try again", and stands centred in the widget's 56px row. Measured with a stored session at 360, 390, 768 and 1280px, light and dark, mouse and touch: 86×32 with a mouse, 86×44 with a touch pointer; the header stays 73px with the retry and with the widget; no horizontal overflow; Shift+Tab from `<main>` reaches it, and it shows a 2px solid accent ring (rgb(45, 122, 45) light, rgb(76, 175, 80) dark).
- The upgrade sheet. A sheet whose code fails closes, and the host says "Network error. Check your connection and try again." in a toast, or "Something went wrong. Please try again." when the sheet throws. The next request asks for the sheet again.

React Query's devtools, the one other lazy component outside the route boundary, load in development only. Motion's features chunk is no component; see the hand-off.

### Evidence

"Old code" means builds of `3a8cf13` (ERRBOUND, this branch's base) made as CI makes them, or the unit tests with the change reverted in a copy of the branch. Chromium 141.

| Check | Old code | This branch |
| --- | --- | --- |
| `npm run test:launch` with `3a8cf13`'s `vercel.json` | exit 1: "vercel.json keeps its header rules in `routes`…" | exit 0 |
| `supabase-lazy.test.tsx` with `auth.tsx`, `authReturn.ts` and `supabaseClient.ts` reverted | 6 of the 7 new tests fail; the seventh guards a case the old code handled too | 26 pass |
| `lazy-auth.spec.ts`, the second press | times out: the press sends no request and fails again | passes; annotation "reloaded, and the next document signed in" |
| `coding-workbench-retry.test.tsx` with `CodingSection.tsx` reverted | 2 of 3 fail; the in-place retry passes on both | 3 pass |
| `route-errors.spec.ts`, the workbench | fails: "Could not load this task." and its Try again stay | passes; reloaded the address |
| `shell-parts.test.tsx` with `UpgradeSheetHost.tsx` reverted | the sheet's test fails; the five boundary tests cover a new component | 6 pass |
| `route-errors.spec.ts`, the account test: signed out on `3a8cf13`, with a session on `346a824` | fails: the root screen ("Something went wrong", "The page hit an unexpected error. Reloading usually fixes it.") replaces the app | passes; reloaded the address |
| The same test on `a13a6e1`, the merge of `346a824` before the retry got its row | fails: the header measures 57px with the retry and 73px with the widget | passes |
| `route-errors.spec.ts`, the upgrade sheet, on `3a8cf13` | fails: the root screen replaces the app | passes |
| The other 12 tests of `route-errors.spec.ts` and `lazy-auth.spec.ts` on `3a8cf13` | pass | pass |

Eleven mutations of `vercel.json`, one at a time, each fail the contract: the old rewrite, the immutable cache before the filesystem check, no 404 rule, a 404 without `no-store`, a 404 rewritten to `index.html`, the header rules back in `headers`, the worker's CSP gone, the sandbox's CORS gone, the hashed files' cache gone, a header rule that ends routing, and `3a8cf13`'s file.

`npm run check:bundle`: 226,984 of 243,000 gzip bytes on this branch, 226,188 on `origin/main` at `3e670be` and 226,027 on `3a8cf13`. The 796 bytes over `3e670be` all sit in the entry script: `reloadOnPress`, `lazyShellPart`, `ShellPartBoundary`, the account retry, the sign-in resume and the sheet's toast load with the shell they guard.

### Release contract on the final head

All on `820fb64`, the code of this record's commit, after merging `origin/main` at `3e670be`. I ran every command below, and each exit code is its own. Browser runs used `CHROME_BIN=/opt/pw-browsers/chromium` and `vite preview` on port 4581.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:launch` | exit 0; the twelve-function budget holds, and `api/` is unchanged since `3a8cf13` |
| `npm run test:client` | exit 0; 30 files, 309 tests |
| `test:coding-auth`, `test:grading-integrity`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks` | exit 0 each |
| `npm run check:unused`, `npm run check:security` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build` | exit 0 |
| The workflow's build step: the Supabase placeholders, then `npm run build`, `npm run check:public` and `npm run check:bundle` | exit 0 each; 13 public URLs; 226,984 of 243,000 gzip bytes |
| `npm audit --omit=dev`, root and client | exit 0 each; 0 vulnerabilities |
| Browser specs `public`, `evolving`, `segmented`, `on-accent`, `navigation`, `lazy-auth`, `route-errors` and `first-load` against that build | exit 0 each; 5, 2, 4, 12, 2, 6, 10 and 2 passed |
| `npm run check:responsive` on CI's routes at 360, 390, 430, 768, 1024, 1280 and 1440, then CI's dark Czech sweep | exit 0 each; 28 and 6 probes, 0 with issues |
| `npm run check:responsive` on `/coding`, `/premium`, `/coding/javascript/js-double-numbers`, `/today` and `/roadmap` at 360, 390, 768 and 1280, light, then with `RESPONSIVE_THEME=dark` | exit 0 each; 20 probes, 0 with issues |
| `npm run test:harness`, from a copy that binds ports 4583 and 4584 in place of a random one | exit 0; 196 assertions in Chromium |
| Browser specs typechecked with a scratch `tsconfig` over `tests/browser/*.ts`; the tooling typecheck does not cover them | exit 0 |
| Each code commit on its own (`6451c61`, `1df08ee`, `0864dc5`, `10d46eb`, `1da47bd`, from `git archive`): client `tsc -b`, the tooling typecheck, `vitest run`, `test:launch` | exit 0 at every one; 277, 285, 288, 294 and 294 tests |
| `git diff --check`, `git diff --check origin/main...HEAD` | clean |

Not run: the Storybook build and its spec, since no story imports a module this change touches, and Lighthouse.

### The Vercel preview

`vite preview` answers a missing asset with `200 text/html`, so only a deployment shows what `vercel.json` does. The lead deployed `820fb64` as a preview on 2026-09-27 (`dpl_j3qvQV8zsLhVcYvkfAYLxSk7uzHp`, READY): Vercel built it with `routes` beside `rewrites`. Measured by the lead through a share link:

| Request | Answer |
| --- | --- |
| An existing `/assets/main-*.js` | 200, `public, max-age=31536000, immutable` |
| A missing `/assets/*.js`, and a missing `/assets/*.css` | 404, `no-store` |
| `/sandbox/index.html` | 200, the sandbox's CSP, no `X-Frame-Options: DENY` |
| A missing `/sandbox/assets/*.js` | 404, `no-store`; devshark.app sends the year-long `immutable` today |
| An existing `/sandbox/assets/index-*.js` | 200, `immutable` |
| `/assets/coding-worker/ts-compiler-*.js` | 200, `immutable`, the worker's CSP, `Cross-Origin-Resource-Policy: same-origin` |
| `/` | the app's CSP and `X-Frame-Options: DENY` |
| `/learn`, `/coding`, `/topics/javascript-closures`, `/robots.txt` | 200 |
| `/api/health` | 200, JSON |
| `/ingest/static/array.js` (the PostHog proxy) | 200, JavaScript |

That report does not cover a missing file under `/assets/coding-worker/` (404 with `no-store` and the worker's headers, by the same rule), `/assets/` (404) and `/assets` (the SPA's `index.html`), a repeated 404 staying out of the CDN cache, `/triage-verdicts.json`'s day-long cache, or `node scripts/check-security.mjs --url=<preview URL>`.

### Commits

| Commit | What |
| --- | --- |
| `6451c61` | `vercel.json` in routing phases; `scripts/vercel-routing-contract.ts`; `check-security.mjs` and the launch contracts read the header rules from `routes`; the newer-build spec answers a removed chunk with that 404 too |
| `1df08ee` | The second sign-in press reloads, and the next document finishes the sign-in (`auth.tsx`, `authReturn.ts`, `supabaseClient.ts`, `reloadOnPress` in `routeRecovery.ts`) |
| `0864dc5` | The workbench's Try again reloads when the failure comes back |
| `10d46eb` | `lazyShellPart` (then `lazyPart`), `ShellPartBoundary`, the account retry and the sheet's toast |
| `c1008c0` | Merge of `origin/main` at `f4e7cbb`, which changes `scripts/test-harness.ts` only; no conflict |
| `a13a6e1` | Merge of `origin/main` at `346a824` (CLS). One conflict, in `App.tsx`: main's `user \|\| authLoading` branch kept, the boundary inside its `Suspense` around `AuthButton` |
| `1da47bd` | The account retry keeps the widget's 56px row; the account test signs in; `tests/browser/fake-session.ts` holds the session helpers both specs use |
| `d7ad848` | The rule in `DESIGN_RULES.md` §8 |
| `6584f1c` | Merge of `origin/main` at `3e670be` (HOLDS); no conflict |
| `820fb64` | The shell's helper renamed `lazyShellPart`, apart from `routeData`'s `lazyPart` |
| this commit | This record |

### Hand-off

- The preview rows the lead's report does not cover (see above), and devshark.app once this is deployed.
- The upgrade sheet in a browser that remembers failed module fetches. Measured in Chromium 141: after one failed download, a second 402 in the same document asks for the sheet again, the browser answers from memory without a request, and the toast shows again; a reload opens the sheet. A 402 from a page's own read opens the sheet as often as a press does, so the host never reloads for it.
- Motion's features chunk (`lib/motion.tsx`, `LazyMotion` in strict mode). Measured on this branch's build: with that chunk dropped, the route box stays at opacity 0 on `/` and after a navigation to `/quiz`, the header shows, and the page reports `TypeError: Failed to fetch dynamically imported module`. No boundary sees it, since nothing throws during render.
- The lazy parts inside pages that still use `React.lazy` (HOLDS lists them).
- Vercel's Skew Protection ([docs](https://vercel.com/docs/skew-protection)) keeps an old deployment's files reachable for a tab still running it, through a `__vdpl` cookie, an `x-deployment-id` header or a `dpl` query; a static Vite build would need one of those wired in, and it is a project setting, so I left it alone.

Not verified by me: `vercel.json` on Vercel, which the lead checked on the preview; devshark.app, where this is not deployed; Firefox and Safari; a real Google sign-in (the specs answer Supabase locally, with a fake session where one is needed); Sentry, which has no DSN here; physical phones and screen readers.

## Instagram profile and MarketingShark source bridge — 2026-09-27

The canonical Instagram URL now points to `@devshark.app`, shared by Profile and Rewards.
BoardlessAI owns source imports, generation, approval and credentials; this app adds no API
handler or AI feature. See `docs/marketing-social-bridge.md` and issue #237.

Node 22 validation: API type checking, launch contracts, production build and responsive
checking passed (238 probes, zero issues or unprobed routes). Both production dependency
audits reported zero vulnerabilities. `git diff --check` passed. Meta OAuth and professional
account conversion remain pending; these checks do not establish a live publishing connection.

## 2026-09-27 — one state read in flight per match client (COALESCE)

A Classroom answer broadcasts `match_updated` on a channel with `broadcast.self = true`, and each client read `/api/play/state` once per broadcast. With 30 learners on one address that came to about 930 reads per question against a bucket of 600 a minute (NEEDED.md). The server bucket stays as it is. Each client now keeps at most one read in flight and follows a burst with one trailing read.

`coalesceReads` in `client/src/lib/realtime.ts` wraps a read. A request with nothing in flight starts a read. A request during a read queues the trailing read, or joins it when one is already queued, and that read starts once the current one settles, so it always fetches the state after the last broadcast. A failed read still lets the trailing read start; `PlayMatch` counts the failure as before. `PlayMatch` makes one reader per match inside the Realtime effect, and every refresh goes through it: the two broadcasts, the healing and fallback polls, the submit resync and Try again. The effect's cleanup cancels the reader, so a queued trailing read never starts, and a flag stops a read still in flight for the old match from setting state after unmount or a change of match.

| Commit | What |
| --- | --- |
| `8573b0b` | `coalesceReads` and the `PlayMatch` wiring |
| `93d7490` | `client/tests/play-coalesce.test.tsx` |
| this commit | This record and the NEEDED.md item |

### Evidence

| Check | Old `Play.tsx` | This branch |
| --- | --- | --- |
| `play-coalesce.test.tsx`, four `coalesceReads` tests: one request reads once, 30 requests during a read add one trailing read, a failed read keeps the trailing read, cancel stops it | pass (the helper is new) | pass |
| The same file, `PlayMatch` with a stub channel: one broadcast reads once | pass | pass |
| 30 broadcasts during a read: one read in flight, then one trailing read | fails: 30 reads | pass |
| Three broadcasts, then unmount before the read settles: no trailing read | fails: 3 reads | pass |

### Checks on the final head

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:client` | exit 1 three times on a machine with a load average near 30: every failure was a 5 s test timeout in files this change does not touch (1, then 17, then 31 of 316). `npm run test:client -- --maxWorkers=2`: exit 0; 31 files, 316 tests |
| `npm run test:launch`, `npm run check:unused` | exit 0 each; knip reports no new finding |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build` | exit 0 |
| `git diff --check` | clean |

Not verified: a real Supabase Realtime channel and a class-sized burst against the server bucket; the tests stub the channel and the API. No test observes a stale write after unmount directly, since React 19 does not warn about one; the guard is read from the code.

## 2026-09-27 — `evolving.spec.ts` waits for the editor and the focus (SETTLE)

NEEDED.md asked why `tests/browser/evolving.spec.ts` failed about one run in five on `main`, and whether a learner who types right after the editor appears can lose that text. A learner cannot. The spec raced two things a person never races: CodeMirror's own focus handling, and the route focus that `App.tsx` moves to `<main>` 230 ms after every change of path. The fix sits in the spec; the product code is unchanged.

### What I measured

I copied the spec into a scratch file that logged, from the page and from the sandbox frame: every `.cm-editor` added or removed (a `MutationObserver`), the editor's text every 5 ms, `selectionchange`, `beforeinput` with the selection it met, `focusin` and `focusout` in both documents, and the `/App.js` each Run posted to the harness. About 280 runs against a `vite preview` of this branch's build, Chromium 141, with other sessions holding the machine's load average between 10 and 27 on 8 CPUs.

- **The editor never remounts.** Each run added `.cm-editor` once, at load, and removed nothing when the viewport went from 360 to 1440 px. `CodingWorkbench` keeps the editor pane mounted under `hidden` on a narrow screen, as its comment says.
- **Late data resets nothing.** In the four failing runs of this kind, the harness received 896 characters: the 773-character solution, then the 90-character starter untouched after it. A reset would have left the starter alone.
- **The typing went in at the caret.** In a passing run, `beforeinput` met a selection of 94 characters, the whole starter. In the failing runs it met a collapsed one; in the one failing run that also logged focus events, 11 ms after `.cm-content` took the focus. Playwright's `fill` focuses the element and then selects its contents with a DOM range. CodeMirror answers a focus with an update 10 ms later (`updateForFocusChange` in `@codemirror/view`) that forces its own selection, the caret at 0, into the page. On a busy main thread right after the resize, that update ran before CodeMirror read the `selectionchange`, so the solution landed in front of the starter. The harness got both `App` components, and the suite failed with "Unable to find a label with the text of: Email", which is what the starter's empty `<main />` gives.
- **A second failure hid behind the first.** Three runs failed later, on "Email accepted" in the stage-2 preview, with the preview showing "Invalid email" over an empty field. The logs show the frame's input taking the focus, then `<main>` in the parent taking it 7 ms later, 237 ms after Next. The typed address went to the parent page and Enter submitted an empty field. That is the 230 ms route focus in `App.tsx`; the spec clicks Run, Preview and fills within it.

A person does neither. A click or a key in the editor goes through CodeMirror's own handlers, which set its selection before any text arrives, and nobody types into a preview within 230 ms of pressing Next.

### The spec

| Commit | What |
| --- | --- |
| `9da8cee` | Focus `.cm-content`, wait for CodeMirror's `cm-focused` class, fill, and check that the starter's `return <main />` is gone before Run |
| `a69d340` | Wait for `#main-content` to hold the focus after the first load and after Next |
| `8631bc8` | Wait for the editor to be visible before `focus()`, which does not wait for the resize to unhide the pane. The first 20-repeat run of the two commits above failed once there |
| this commit | This record and the NEEDED.md tick |

### Repeat counts

Each run covers the light and the dark test, so `--repeat-each=20` is 40 runs.

| Spec | `--repeat-each` | Result |
| --- | --- | --- |
| `origin/main` (`391ca34`), the first run of the session | 20 | exit 0; 40 passed |
| `origin/main` (`391ca34`), load average near 20 | 40 | exit 1; 3 failed, 77 passed, all three on "Email accepted" |
| The instrumented copy, before any fix | about 200 runs over six batches | 4 failed on the editor, 2 on the preview |
| The instrumented copy with `9da8cee` only | 73 runs | 1 failed, on the preview |
| `9da8cee` and `a69d340` | 20 | 1 failed, 39 passed; `cm-focused` never came, fixed in `8631bc8` |
| `8631bc8` | 20 | exit 0; 40 passed |
| `8631bc8` | 40 | exit 0; 80 passed |
| `8631bc8`, a second time | 40 | exit 0; 80 passed |

### Checks

| Check | Result |
| --- | --- |
| `VITE_PRODUCT=devshark VITE_LOCK_SUBJECT=webdev npm run build` with the Supabase values from `docs/quality/bundle-budget.json` | exit 0; the client code did not change after it |
| `npm run typecheck:tooling --prefix client` | exit 0 |
| `npm run test:client` | exit 0; 30 files, 309 tests. A first run at a load average near 20, with a browser batch beside it, hit eight 5-second timeouts; the second run, alone, passed |
| `npm run check:unused` | exit 0; no new finding |
| `git diff --check` | clean |

Not verified by me: Firefox and Safari, CI's runner, and the route focus's 230 ms window for a keyboard user on a slow phone.

## 2026-09-27 — a part that fails to load keeps its page (CHUNKS)

HARDEN's hand-off left three gaps, and NEEDED.md carried them as one `[owner:ai]` item:

1. `PathRewardClaim`, the Learn workbench, `FriendsPanel` and the code highlighter used `React.lazy` with no boundary of their own. A failed chunk sent the whole page to the route error panel, and React.lazy kept the failure.
2. In Chromium up to 155 and in Safari, a second failure of the upgrade sheet repeated the toast without a request.
3. When Motion's features chunk failed, the route box stayed at opacity 0 under a working header.

| Gap | The change | The test |
| --- | --- | --- |
| The four parts | Each is a `lazyShellPart` inside a `ShellPartBoundary`, the pair HARDEN built for the account widget and the sheet. The workbench, the friends tab and the reward draw `ErrorRetry` in their place: "Could not load this task.", "Your friends did not load." or "Could not check this path's reward.", with Retry. A code block falls back to the plain `<pre>` it already drew while loading, and the next block asks again | 2 tests in `client/tests/in-page-parts.test.tsx`; in `route-errors.spec.ts`, "the friends tab's code fails to load…" |
| The sheet's second failure | When the sheet's code fails a second time in one document on a press, the host marks `devshark:upgrade-resume` in `sessionStorage` (kind and ref, valid for 60 seconds) and reloads through `reloadOnPress`. The next document opens the sheet from the mark. A 402 from the API client carries `fromResponse` and never reloads. Offline, with `/` unanswered, or with the reload refused, the toast shows as before | 4 new tests in `client/tests/shell-parts.test.tsx`; in `route-errors.spec.ts`, "a second press for the upgrade sheet…" |
| Motion | `loadMotionFeatures` catches the failure, sets `<html data-motion="off">`, reports it once with `chunkLoad: true`, and leaves LazyMotion's load pending. `lib/motion.tsx` gives every `m` element `data-m`, and one rule in `app-shell.css` shows those elements at opacity 1 with no transform. `:where()` keeps the rule at one attribute's weight, so the route box's busy fade still wins | 3 tests in `client/tests/motion-fallback.test.tsx`; in `route-errors.spec.ts`, two Motion cases, reduced and full motion |

### Choices

- I reused `lazyShellPart` and `ShellPartBoundary` rather than `lazyPart`. `lazyPart` fails with its page by design: the page's hold loads its code. These four parts load after the page draws, so they should fail alone. `ShellPartBoundary` also brings the reload on a repeated press, so the retry works in Chromium 153 too.
- The fallbacks reuse `ErrorRetry`, which now takes `busy` so its button keeps focus while a press reloads.
- A code block gets no Retry. The plain text shows the whole snippet, and a Retry beside every snippet on a page would be noise.
- The reward's fallback shows on every enrolled path, finished or not, because the page cannot know which paths have a reward until the chunk loads. Its copy says the check failed and promises no reward.
- The Motion rule depends on one fact: every `m` element in the app (the route box, three toasts, `MotionItem`, `MotionPop`) enters to full opacity and no transform. DESIGN_RULES §8 says so now.
- The Vite build's PurgeCSS pass dropped the rule the first time, because `dataset.motion` never spells `data-motion` in the bundle. `data-motion` joins the safelist, and the build now fails if the rule goes missing.

### Evidence

"Old code" means a build of `origin/main` at `391ca34`, this branch's base, made as CI makes it, or the new unit tests copied onto that tree. Chromium 153.0.8010.12 (Playwright 1.63.0), which still remembers failed module fetches.

| Check | Old code | This branch |
| --- | --- | --- |
| `route-errors.spec.ts`, the friends tab | fails: the route panel ("Something went wrong") replaces the profile | passes; annotation "reloaded the address" |
| `route-errors.spec.ts`, the sheet's second press | fails: no dialog after the press | passes; annotation "reloaded the address, and the next document opened the sheet" |
| `route-errors.spec.ts`, Motion, reduced and full motion | both fail: the route box's opacity stays "0" | both pass: opacity "1" on `/` and after a navigation to `/quiz`, transform `none`, no reload |
| `in-page-parts.test.tsx` | the code-block test fails; the generic part test passes, since it builds the boundary itself | 2 pass |
| `motion-fallback.test.tsx` | 3 fail | 3 pass |
| `shell-parts.test.tsx`, the 4 new sheet tests | 3 fail; "never reloads for a 402 nobody pressed for" passes, since the old code never reloaded | 10 pass |

In the sheet's browser case, the reloaded task page answers 402 again, so the API client opens the sheet in the next document as well as the mark. The mark's part alone is proven by the unit test, where nothing answers 402.

`npm run check:bundle`: 227,116 of 243,000 gzip bytes on this branch, 226,554 on `391ca34`. The 562 extra bytes sit in the entry script and its stylesheet: the `m` wrapper, `loadMotionFeatures`, the CSS rule, and the sheet's mark and reload.

### Checks on the final head

All on `59ce547`, the code of this record's commit, in the worktree `ds-wt-chunks`. I ran every command below, and each exit code is its own.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:client` | exit 0; 32 files, 318 tests |
| `npm run test:launch` | exit 0; the twelve-function budget holds |
| `npm run check:unused` | exit 0; knip reports no new finding |
| The workflow's build step: the Supabase placeholders, then `npm run build`, `npm run check:public` and `npm run check:bundle` | exit 0 each; 13 public URLs; 227,116 of 243,000 gzip bytes |
| Browser specs `route-errors`, `navigation`, `lazy-auth` and `first-load` against `vite preview` of that build on :4721 | exit 0 each; 14, 2, 6 and 2 passed |
| `git diff --check origin/main...HEAD` | clean |

Not run: the other browser specs, `check:responsive`, the audits and Storybook. The branch changes nothing under `api/`, `lib/` or `shared/`, and leaves `vercel.json` alone.

### Commits

| Commit | What |
| --- | --- |
| `3f2f6f1` | The four parts become `lazyShellPart`s inside `ShellPartBoundary`; `ErrorRetry` takes `busy`; two English keys |
| `f025478` | The sheet's second failure on a press reloads, and the next document opens the sheet |
| `7dad4b7` | `loadMotionFeatures`, `data-m`, and the `app-shell.css` rule |
| `fdc6f7c` | The rule survives PurgeCSS, and the build checks for it |
| `93d89f1` | Four browser cases in `route-errors.spec.ts` |
| `59ce547` | The Motion cases check opacity before the marker, so the old code fails on what a learner sees |
| this commit | DESIGN_RULES §8, this record, NEEDED.md |

### Hand-off

- Safari and Firefox. Only Chromium 153 ran here. The sheet's reload rests on the same `reloadOnPress` the sign-in uses, and Safari's module-map behaviour comes from HARDEN's sources, not from a Safari run.
- The Learn workbench and a path's reward in a browser. Their unit coverage is the shared boundary; reaching either on a page needs roadmap or enrollment data that the specs do not fake yet.
- Motion stays off for the rest of a document after its chunk fails. Nothing retries it; the next page load does.

## 2026-09-27 — the rest draws in one step (DRAW)

NEEDED.md's `[owner:ai]` item "Draw the rest in one step" named three things that still moved after the first draw: `/today` and `/leaderboard` growing (0.05 or less), a signed-in desktop header re-centring its nav (0.004), and a signed-in `/collection` drawing its saved cards after the page.

| What moved | Why | The change |
| --- | --- | --- |
| `/today`, `/leaderboard` | When a held read failed, the page's own query asked again on mount (TanStack's `retryOnMount`). The page drew its skeleton, and the same error replaced it about a second later, after the retry. The footer moved each time | `HELD_READ` in `lib/routeData.ts` (`retryOnMount: false`), spread into the page's own copy of a held read: the roadmap structure and, through `useLocks(…, { held: true })`, the plan on Today; the board on the leaderboard. The hold's attempt stands for the mount's, so the error draws with the page. Retry buttons, a changed key and the next visit's hold still ask again |
| The signed-in desktop header | The toolbar's grid centres the nav between its side columns. The widget replaced a 56px placeholder at 224px ("Test Learner"), so every nav link moved 84px at 1350px | The widget sits in `.ss-account-slot`: at least 60px wide from 1024px (the avatar, with a ring) and 240px from 1280px (the button's `max-width`). A signed-out header has no slot |
| `/collection`, signed in | Nothing held the page, so it drew `LoadingScreen` in its body and the cards replaced it | `useFirstData` holds the page for the open tab's read (`flashcardsQuery(subject)`, new in `lib/queries.ts`, or `bookmarksQuery`), with `HELD_READ` on both hooks. On a direct load the session is still being restored when the page mounts, so the hold waits for `getSupabaseSession()` too and reads only if a session comes back. A visitor waits for nothing |

### Measured before and after

A scratch Playwright script, never committed, loads each page cold in Chromium 153.0.8010.12 and adds up every `layout-shift` entry a `PerformanceObserver` reports, input-flagged ones included. "Desktop" is 1350×940 at full speed, "phone" 412×823 at a 1.75 device pixel ratio with 4× CPU throttling, the profiles of the CLS record. The API answers 503 (the CLS record's condition) or, for `/collection` and the header, fixtures 250ms late: three saved cards, a free plan and 503 for the rest. Signed in means the fake session of `tests/browser/fake-session.ts`, with Auth answered locally. Before is `aeb7da8`, this branch's base, after is `65cb2d0`, both built with the Supabase placeholders and served side by side by `vite preview` (:4782 and :4781). Two runs of each; they agreed to the fourth decimal.

| Page | Visitor, API | Desktop, before → after | Phone, before → after |
| --- | --- | --- | --- |
| `/today` | signed out, 503 | 0.0004 → 0 | 0.0378 → 0 |
| `/today` | signed in, 503 | 0.0054 → 0 | 0.0386 → 0 |
| `/leaderboard` | signed out, 503 | 0.0043 → 0 | 0.0502 → 0 |
| `/leaderboard` | signed in, 503 | 0.0105 → 0 | 0.0502 → 0 |
| `/collection` | signed in, fixtures | 0.0052 → 0 | 0.0504 → 0 |
| `/` | signed in, fixtures | 0.0041 → 0 | 0 → 0 |

On the desktop the signed-in rows include the header's 0.0041. Before, the first nav link stood at 351.9px and moved to 268.0px when the widget arrived; after, it stands at 259.9px from the first frame. With a 29-character name it stands at 259.9px too. Signed out, it stands at the same place on both builds at each of 1024, 1100, 1279, 1280, 1350, 1440 and 1920px (347.6px at 1350px). Before, `/collection` drew two states, the loader and then the cards; after, the cards are in its first frame. A click from `/` to each page, desktop, 503 and fixtures, signed in and out, recorded 0 non-input shift after the first draw on the new build; before, the 503 visits recorded 0.0004 to 0.0064.

The signed-in desktop nav now starts 8px further left at 1350px than the widget left it before (259.9 against 268.0px), because the slot reserves the widget's widest box. At 1280px with the long name the nav's `scrollWidth` equals its `clientWidth` (690px): no link is clipped.

`npm run check:bundle`: 227,155 of 243,000 gzip bytes, 39 more than the base's 227,116, in the entry's script and stylesheet (the slot's rule and the plan's `held` option).

### Tests

`tests/browser/first-load.spec.ts` gains three cases at both of its profiles, recording each frame and every `layout-shift` entry with its chunks held 800ms as before: `/today` and `/leaderboard` with every read failing, and a signed-in `/collection` whose cards answer 400ms late. Each page must keep the route box's height from its first frame and record no entry at all; the collection must show its card in every frame of the page, and on the desktop the first nav link must not move. Against the base build 5 of the 6 cases failed; the phone's collection case passed there until the cards were made to answer late, and then failed too. On the final build all 8 cases passed, and 24 of 24 with `--repeat-each=3`.

### Checks on the final head

On `65cb2d0`, the code of this record's commit, in the worktree `ds-wt-onestep`. I ran every command below, and each exit code is its own.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:client` | exit 0; 32 files, 318 tests |
| `npm run check:unused` | exit 0; knip reports no new finding |
| The workflow's build step: the Supabase placeholders, then `npm run build`, `npm run check:public` and `npm run check:bundle` | exit 0 each; 13 public URLs; 227,155 of 243,000 gzip bytes |
| Browser specs `first-load`, `navigation`, `route-errors`, `lazy-auth` and `public` against `vite preview` of that build on :4781 | exit 0 each; 8, 2, 14, 6 and 5 passed |
| `npm run check:responsive -- --base-url http://localhost:4781 --routes /,/today,/leaderboard --widths 390,1280` | exit 0; 6 probes, 0 with issues |
| `git diff --check` | clean |

Not run: the other browser specs, `test:launch`, the audits and Storybook. The branch changes nothing under `api/`, `lib/` or `shared/`.

### Commits

| Commit | What |
| --- | --- |
| `76b6e6e` | `.ss-account-slot` in the header |
| `f695976` | `HELD_READ`; Today and the leaderboard use it. It also carries `flashcardsQuery` and `useFlashcards`'s `held` option, which the next commit uses |
| `a3b4461` | `/collection` holds for the open tab |
| `6ad1b57` | The three cases in `first-load.spec.ts` |
| `65cb2d0` | DESIGN_RULES §8 |
| this commit | This record and NEEDED.md |

### Hand-off

- A slow read still draws twice: past the 1.2s cap the page draws its loading state, as HOLDS set up.
- `/cards` shows the same flashcards as `/collection` and does not hold for them.
- Today's four signed-in sections keep their own queries without `HELD_READ`, so a section whose read failed in the hold asks again on mount. The signed-in 503 runs recorded no shift from them on either build; I did not run them with data that fills a section after a retry.
- Not verified: devshark.app (not deployed), a real Supabase session, Firefox, Safari and physical phones.

## 2026-09-27 — `public.spec.ts` waits for the route fade (FADE)

The full gate failed once on `public.spec.ts`: axe read the Czech guide's "Procvičit v kvízu" button at 4.3:1, white `#fefefe` on `#438843`, where the tokens give `#ffffff` on `#2d7a2d`. A probe logged `.ss-route` mid-way through Motion's opacity entrance, between 0.08 and 0.5, in every run when axe started. Motion keeps opacity fades under reduced motion, so the page was right and the spec measured too early. The spec now waits for the finite animations on the article and its ancestors to finish, as `on-accent.spec.ts` already does.

| Build | `--repeat-each` | Before | After |
| --- | --- | --- | --- |
| `origin/main` at `3bedbbc` | 10 | 7 of 50 failed | 50 passed |
| This session's merged head | 10, then 20 | 5 of 50 failed | 100 passed |

## 2026-09-27 — accent text on its tint, a reachable levels strip, whole-route axe (PORT)

Three commits from `claude/elegant-cori-h9cdgb`, ported by hand to main at `035d853`: `9abf34a`, `1751a2c` and `d0e78e1`. SubjectPicker, `Sharkira.css`, `/sprint`, the Czech key and the other subjects' accents are gone from main or out of scope, so they stay out.

### Contrast

`client/src/lib/contrast.ts` derives `--brand-accent-on-soft`: the accent's hue, with lightness stepped until the text clears 4.5:1 on its own 12% tint over the worst surface of the mode. `ColorModeContext` writes it and `reset.css` carries the same values for the first paint. `--brand-accent` keeps its hex.

| Mode | Surface under the tint | Before, `--brand-accent` | After, `--brand-accent-on-soft` |
| --- | --- | --- | --- |
| light | card `#ffffff` | `#2d7a2d` 4.54:1 | `#2a712a` 5.11:1 |
| light | body `#f3f6f5` | 4.19:1 | 4.72:1 |
| light | muted `#edf2f1` | 4.06:1 | 4.57:1 |
| dark | worst of four surfaces | `#4caf50` 5.14:1 | `#4caf50` unchanged, 5.14:1 |

These are the unit suite's numbers (`client/tests/contrast.test.ts`, 11 tests). In the browser at 390px, the Home chip "Learn path · quizzes · flashcards" painted `rgb(42, 113, 42)` on `rgba(45, 122, 45, 0.12)` over a white panel in light mode, and `rgb(76, 175, 80)` over `#101c24` in dark mode.

The token replaces the plain accent where main paints accent text or a glyph on the tint: the active nav link, Home's topic tick, chip and level nodes, the sample-question chip, the quiz pills, the Deep End mode-card icon and tick, the current stage node, the identity settings hover, the typing-racer badge, the profile advisor tile and two dev-console states. The Roadmap level node paints a per-topic colour on the tint, not the brand accent, and I left it alone.

### Levels strip

`PathStrip` in `LandingKit.tsx` wraps Home's roadmap-preview strip: `tabIndex={0}`, `role="region"`, and the name `home.pathRegion` ("Learn path for JavaScript" on the default topic). `.ss-scroll-strip` draws the focus ring inset. At 390px in both modes, Tab then ArrowRight scrolled the focused strip 40px and `:focus-visible` matched.

### Axe over whole routes

`tests/browser/routes-axe.spec.ts` scans `/profile`, `/today`, `/leaderboard` and `/challenge` unscoped, with the WCAG 2.2 AA tags, at 390 and 1280px in light and dark mode. The original held dark mode to `/profile` because of two older dark failures; on main all four routes pass in dark, so the spec scans them all. The Quality workflow runs it after `first-load.spec.ts`.

With this branch's client changes reversed onto a fresh build, the spec failed 4 of 4: `scrollable-region-focusable [serious]` on `section[aria-label="Inside JavaScript"] > div:nth-child(5)` at 390px in both modes, no `--brand-accent-on-soft` on the chip, and no `.ss-scroll-strip`. axe did not flag the chip on main, because on a white card it measures 4.54:1; the failing surfaces are body and muted.

### Checks on the final head

In the worktree `ds-wt-port`, preview on :4821. I ran each command below.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| `npm run test:client` | exit 0; 34 files, 336 tests |
| `npm run check:unused` | exit 0; no new finding |
| Build with the Supabase placeholders, then `npm run check:public` and `npm run check:bundle` | exit 0 each; 13 public URLs; 228,035 of 243,000 gzip bytes |
| Browser specs `public`, `on-accent`, `first-load`, `routes-axe` | exit 0 each; 5, 14, 8 and 4 passed |
| `npm run check:responsive -- --base-url http://localhost:4821 --routes / --widths 360,768,1280` | exit 0; 3 probes, 0 with issues |
| `git diff --check` | clean |

Not run: the other browser specs, `test:launch`, the audits and Storybook. Not verified: signed-in routes, Firefox, Safari and physical phones.

## BRAND-V9

Branch `claude/brand-v9`, 2026-09-27. The owner's V9 kit sits in `client/public/brand/v9/`; the rules are in `docs/brand/brand-guidelines.md`.

- **Geometry.** `BrandLogo` in the header, rasterised at 1200 px next to `devshark-logo-compact-green.svg` in Chromium: 0 differing pixels of 95,919 inked. `SharkFin` and the share card read the same paths from `brandGeometry.ts`.
- **Header.** At 390 px the 22 px logo keeps 16 px to the menu button, 98 px to the Log in button and 19 px above and below. The 20 px menu logo keeps 16 px padding. Both links are named "devShark home". Colour: `rgb(45, 122, 45)` light, `rgb(76, 175, 80)` dark.
- **Spelling.** `document.body.innerText` on `/`, light and dark at 390 and 1280 px, contains no `DevShark` or `DEVSHARK`.
- **Icons.** `/`, `/premium` and the topic pages carry `favicon.ico`, `favicon-32.png`, `favicon.svg` (light) and `favicon-white.svg` (dark), `apple-touch-icon.png`, the manifest and `og-image.png`. Every icon URL and every manifest icon answered 200. The manifest reads name `devShark`, theme `#2D7A2D`, background `#F3F6F1`.
- **Fonts.** A first visit loads `manrope-latin-wght-normal` and `inter-latin-wght-normal` and no other font file.
- **Screenshots** (local, git-ignored `artifacts/brand-v9/`): header light and dark at 390 and 1280 px, the menu at 390 px, the route loader, the footer ocean, the icon sheet, the share card and the logo comparison.

| Check | Result |
| --- | --- |
| `npm run typecheck:api`, `npm run typecheck:tooling --prefix client` | exit 0 each |
| Build with the Supabase placeholders, `npm run check:public`, `npm run check:bundle` | exit 0 each; 13 public URLs; 230,937 of 243,000 gzip bytes |
| `npm run test:launch` | exit 0 |
| `npm run test:client` | exit 0; 34 files, 336 tests |
| `npm run check:unused` | exit 0; no new finding |
| Browser specs `public`, `navigation`, `first-load`, `on-accent`, `routes-axe` against the preview on :4901 | exit 0 each; 5, 2, 8, 14 and 4 passed |
| `git diff --check` | clean |

Not run: Storybook (no story changed), `check:responsive`, the dependency audits. Not verified: real browser tabs showing the dark-theme favicon, an installed PWA, link previews on social platforms, Firefox, Safari and physical phones.
