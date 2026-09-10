# Release acceptance matrix

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

**The item-level content audit has run in part.** Every one of the 2,128
served devShark questions has been read; 848 have completed both readings and
are recorded in the ledger, and the gate enforces CSS, JavaScript and
TypeScript as complete categories. 84 items are retired and 1 quarantined, so
they are withheld from every delivery surface. The other eleven active topics
are reviewed but not yet landed and are served as before, with no claim.
`docs/audit/devshark-content-audit.md` reports what was found and what remains;
`docs/curation-claims.md` records what the product may say.

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
