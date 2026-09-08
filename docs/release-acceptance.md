# Release acceptance matrix

What was verified for the modernization epic, what was not, and why. Every row
is pass, fail or **not run** — never "should be fine". A row that could not be
checked in this environment says so and names what would check it.

Recorded on 2026-09-08, against the branch `claude/resolve-open-issues-xnr0lv`.

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

**No item-level content audit has run.** The review registry is empty and every
learner-facing claim resolves to "not reviewed yet". That is #176, which is out
of scope here, and `docs/curation-claims.md` records exactly what the product
may and may not say until it runs.

## Not run in this environment, and what would run it

This container has no Supabase project, no `vercel dev` and no browser session,
so everything below is honestly **not run** rather than assumed:

| Check | What it needs |
| --- | --- |
| Guest → sign in → diagnostic → practical pass → resume → capstone | A preview deployment with Supabase configured |
| Migrations 026–030 applied against a real database | A controlled window and a verified backup (`docs/backup-restore.md`) |
| RLS behaviour on the new tables | A live database; the policies are written and reviewed, but reviewing SQL is not running it |
| Payment webhook replay | A configured payment provider in test mode |
| Account switching and deletion end to end | Two real accounts |
| Rollback (disable the feature, retain the data) | The same preview environment |
| Signed-in responsive layout | A signed-in browser session — the sweep renders signed out |

These are the owner's deployment checks, and each already has an entry in
`NEEDED.md` with an owner and an estimate. **None of them is claimed as passing
here.** An unchecked box in an issue is not evidence, and neither is this
document: it records what the commands actually printed.

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
