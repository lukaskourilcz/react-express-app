# devShark

devShark is a learning platform for web developers: guided Learn paths, quizzes, coding challenges, learning paths and a career roadmap across frontend, backend, databases, DevOps, testing, security, system design and AI.

devShark has been freemium since 25 September 2026. Every signed-in account gets HTML, CSS and JavaScript in full, React levels 1 to 12, stage one of every coding project and short path, and a starter set of challenges (104 of the 695 coding tasks together), plus every quiz, the daily challenge, the Biggest Shark Challenge, multiplayer rooms, flashcards, the typing racer, leaderboards, streaks, friends and the coin shop. Premium costs 3.99 EUR a month or 39.99 EUR a year, VAT included, and opens every Learn topic and coding task, the FDE and DSA learning paths once their switches are on, and redeeming coins for merchandise. `shared/tiers.ts` holds both lists, the server answers locked content with 402, and Premium leaves grading, XP amounts, scores, streaks and rankings alone. Checkout stays off until the owner's Stripe account is connected (`BILLING_ENABLED`).

Production: [devShark](https://devshark.app) deploys from `main` to Vercel, with Supabase for data and identity.

StudyShark, the general-subject product that shared this code, moved to its own repository (`lukaskourilcz/studyshark`) on 2026-09-24. This repository builds devShark only; a build configured for any other product fails.

The web experience uses the Deep End shark identity across the landing page, Learn, Quiz, Challenge, Play, Profile, Flashcards, the career roadmap, dialogs, progress indicators, and the `/dev` control room. It ships in English, with light and dark themes, keyboard navigation, reduced motion, and responsive mobile/desktop layouts. The Czech dictionaries and translations are retained in the repository but are not offered in the UI; `ENABLED_LANGS` in `client/src/i18n/LanguageContext.tsx` is the single switch that brings them back.

Current content: **2,447 authored questions**, of which 1,974 are served (the content audit retired 152 and quarantined 2, and the 319 in the three retired sections stay only so old attempts resolve), and **695 coding tasks** — 281 JavaScript, 146 TypeScript, 168 React, 55 Algorithms and 45 system design; 462 of them Easy, 151 Medium and 82 Hard. The counts come from `shared/coding-index.ts` and include every stage of the evolving projects and every level of the short paths.

## What the app can do

- Guided Learn paths with short levels, checkpoints, adaptive skill checks, prerequisites, saved progress, and server-observed grading — plus spaced mastery (a level goes cleared → mastered over three separate days) and an auto-composed "Today" queue that folds unfinished work, due-for-review levels, and new material into one daily plan.
- Configurable solo quizzes with category, difficulty, and question-count selection; weighted sampling; shuffled answers; bookmarks; question reporting; keyboard controls; and a two-column desktop review.
- A deterministic daily challenge and the timed Biggest Shark Challenge with leaderboards.
- Live free-for-all matches and host-led classroom rooms using Supabase Realtime with polling recovery, server-side timing, and QR sharing.
- 30-day, all-time, daily and per-topic leaderboards; forgiving streaks (two free protections a month, spent on a missed day or in advance as a 48-hour shield); verified XP; ranks; and coins, earned from verified XP and milestones, that buy the crown and streak protections for every account and merchandise for Premium.
- A read-only study advisor that names your weakest areas from your own results, and a touch-typing racer (accuracy-gated, WPM earns stars, private on-device best).
- A Coding section with 695 tasks across JavaScript, TypeScript, React, an Algorithms interview track, and system design: server-graded submissions (QuickJS sandbox, real TypeScript type tests, an isolated Vercel Sandbox for React, sealed design keys), authored hint ladders ending in documentation, three debugging paths that teach the console as a tool, Easy, Medium and Hard labels projected from the tier ladder, coding tasks inside Learn levels, and an optional GitHub garden that commits every passed task to the learner's own repository.
- Two optional learning paths, both graded through the existing server sandbox and both awarding no XP: the **Forward Deployed Engineer** role specialization (customer discovery, integration, bounded AI, evaluation, security, operations, handoff and a staged capstone) that sits on top of the chosen Fullstack/Frontend/Backend track, and **DSA Foundations** (growth classes, arrays, maps, stacks, queues, linked lists, recursion, search, sorting, trees) entered directly with no track, role or XP rank required. Verified checks stay visibly apart from self-reviewed writing, and neither path claims a certification.
- Per-user flashcards with optimistic updates and offline-safe query caching.
- Google sign-in through Supabase Auth, cross-device progress, profile settings, and permanent account deletion.
- Premium billing through Stripe Checkout, the Customer Portal and a public two-step cancellation page; merchandise printed and shipped by Spreadshop (sprd.net AG); and invite links that pay both friends coins once the invited one passes a first Learn level.
- Sentry monitoring and PostHog analytics. Every optional integration is gated and disabled by default. devShark ships no AI feature.
- A role-gated `/dev` control room for question CRUD/overrides, importance tuning, quality and parity checks, report triage, auth logs, feature and coin settings, and the merchandise quotes, monthly caps and fulfilment queue.

Correct answers are not sent with unanswered questions. Quiz and learning sessions use authenticated AES-256-GCM envelopes, submissions are claimed once in Postgres, result receipts are idempotent, and competitive/progression mutations are performed through service-only APIs and atomic database functions.

## Tech stack

| Layer | Current implementation |
|---|---|
| Web client | React 19.2, TypeScript 5.9, Vite 6.4, React Router 7.18 |
| Design and motion | Astryx Design 0.1.6, product CSS tokens, Motion 12 |
| Server state | TanStack Query 5.101 |
| Backend | 12 Vercel Node/TypeScript serverless handlers |
| Data and identity | Supabase Postgres, Auth, Row Level Security, RPCs, Realtime |
| Rate limiting | Upstash Redis when configured; bounded in-memory fallback for local/preview use |
| Payments | Stripe 22 on the server only (Checkout, Billing, Customer Portal), off until `BILLING_ENABLED=true` |
| Observability | Sentry 10 and PostHog, both opt-in |
| Other client capabilities | QR generation, lazy Prism syntax highlighting, Web Share/download fallbacks |

Node.js **22–24** is required. Vercel serves `api/` and the Vite SPA.

## Architecture

```text
React/Vite SPA
  ├─ Supabase Auth session + Realtime room channels
  └─ authenticated /api requests
       └─ 12 Vercel functions
            ├─ product and subject validation
            ├─ request limits, timeouts, structured errors/logs
            ├─ encrypted quiz/learning session verification
            └─ service-role calls to Supabase
                 ├─ RLS-protected tables
                 └─ atomic scoring/progression/leaderboard RPCs
```

Czech translations are loaded only when requested. Static questions are merged with cached `/dev` overrides. The product is always devShark and the subject always `webdev`; `VITE_PRODUCT`/`VITE_LOCK_SUBJECT` may name them, and any other value fails the build.

## Repository map

```text
api/                         12 Vercel handlers
  admin/[op].ts              admin question, report, log, quality, settings operations
  play/[action].ts           create/join/state/control/answer/distribution/heartbeat
  quiz/*.ts                  questions, submit, daily, challenge, roadmap (+ coding tasks)
  user/[op].ts               stats, XP, streaks, auth events, account deletion, coding progress, GitHub garden
client/src/                  React application, design system, stores, i18n
client/src/coding/           coding workbench, editor, runner worker, React harness hook
client/sandbox/              self-hosted React grading iframe
lib/                         server auth, tokens, bank loaders, stores, rate limits
lib/coding/                  coding catalogue, solutions (server-only), sandbox, grading
lib/billing/                 Stripe checkout, portal, webhook, subscription sync, public cancellation
lib/rewards/                 coins, invitations, merchandise orders, the Spreadshop promotion
lib/github-app.ts            GitHub App JWT, installation tokens, garden commits
shared/                      product and subject registry, coding catalogue types and browser index
supabase/supabase-schema*.sql         baseline plus migrations through 044
docs/                        launch, architecture, backup, growth, content sources, coding integration plan
scripts/test-launch-contracts.ts
scripts/test-coding-content.ts        content contract: solutions proven, payloads answer-free, difficulty labels, Easy-band coverage matrix
scripts/test-harness.ts               React sandbox protocol check, driven in a real browser
scripts/import-interview-prepper-progress.ts   one-time owner import
```

## Local development

Prerequisites: Node 22–24, npm, Vercel CLI, and a Supabase project.

```sh
npm run install:all
cp client/.env.example client/.env.local
npm run dev
```

`npm run dev` starts `vercel dev` on port 3000 so the SPA and `/api` routes behave like production. For UI-only work, run `npm run dev --prefix client`.

Before a release:

```sh
npm ci
npm ci --prefix client
npm audit --omit=dev
npm audit --omit=dev --prefix client
npm run typecheck:api
npm run test:launch
npm run build
git diff --check
```

## Required configuration

Copy [client/.env.example](./client/.env.example) and configure secrets in Vercel, never in committed files.

Production requires:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and server equivalents where used.
- `SUPABASE_SERVICE_ROLE_KEY` — server only.
- `SESSION_SECRET` — at least 32 random bytes.
- `VITE_PRODUCT=devshark`, `VITE_LOCK_SUBJECT=webdev`, `PRODUCT_ID=devshark` and `PRODUCT_SUBJECT=webdev` (or leave them unset; they may not name anything else).
- `ADMIN_EMAILS` or Supabase `app_metadata.role=admin` for `/dev`.
- Google OAuth origins and callback URLs for every production domain.
- All migrations through **`supabase/supabase-schema-044.sql`**, in numeric order.

Strongly recommended for a public deployment:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- An external monitor for `GET /api/health`.
- `VITE_SENTRY_DSN` and/or `VITE_PUBLIC_POSTHOG_KEY` only after privacy configuration is approved.

The devShark learning paths are off unless the deployment says otherwise: `LEARNING_PATH_DSA_ENABLED=true` and `LEARNING_PATH_FDE_ENABLED=true` are independent, so either path can open while the other is still being written. A path opens only when its switch is on, its content validates and migration 026 is installed; anything else is previewable and says which of the three is missing.

Selling Premium needs `BILLING_ENABLED=true` plus `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_ANNUAL` and `STRIPE_MANAGED_PAYMENTS`; `NEEDED.md` lists the Stripe steps. `RESEND_API_KEY` (cancellation emails) and `SPREADSHOP_API_KEY` with `SPREADSHOP_SHOP_ID` (the monthly shop promotion) are optional. `SUPPORT_ENABLED` belongs to the retired voluntary-support page and stays false. The GitHub garden needs `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_APP_PRIVATE_KEY` (PEM or base64); without them the profile reports the garden as not enabled.

## API surface

The twelve physical handlers multiplex related operations to stay within the deployment budget:

| Handler | Purpose |
|---|---|
| `/api/quiz/questions` | Standard/review question sessions |
| `/api/quiz/submit` | One-time grading, result proofs, and reports |
| `/api/quiz/daily` | UTC daily session |
| `/api/quiz/challenge` | Challenge batches, scoring, completion, leaderboard |
| `/api/quiz/roadmap` | Structure, attempts, answers, completion, adaptive placement, progress; coding tasks, submissions, reports, and reveals; learning-path catalogue, activity start and submit |
| `/api/play/[action]` | Multiplayer and classroom lifecycle |
| `/api/leaderboard` | 30-day, all-time, daily, and category boards |
| `/api/flashcards` | Flashcard CRUD |
| `/api/user/[op]` | Stats, category stats, XP, streaks, badges, streak freezes, Shark Cards, study advisor, auth events, deletion; the plan (`entitlement`), Stripe checkout, portal, webhook and public cancellation; the coin wallet, shop, orders, invitations and merchandise fulfilment; coding progress and drafts; learning preference, path enrollment, progress and drafts; GitHub garden connection, repository, sync, disconnect |
| `/api/admin/[op]` | Role-gated control-room operations |
| `/api/settings` | Public safe configuration |
| `/api/health` | Database, service-role migration, and limiter readiness |

## Database and operations

Apply `supabase/supabase-schema.sql`, then numbered migrations in order through 044 (each file's header says what it adds; `docs/release-acceptance.md` records how each was verified). Migration 023 adds the one-time submission ledger, subject-scopes multiplayer and flashcards, hardens service-only functions and leaderboard identity, makes roadmap answer recording atomic, enforces complete attempts/prerequisites, adds retention helpers, and adds production indexes. Migration 024 adds the daily-habit backing — spaced-mastery pass tracking inside verified roadmap completion, freeze-aware streaks, server-synced badges, Shark Cards, and a hint cache — additively and idempotently. Migration 025 adds coding progress, attempts, drafts, the per-level coding gate, and the GitHub garden connection and commit queue, with the service-only `record_coding_verdict` and `record_coding_reveal` functions.

`npm run test:harness` drives the built React sandbox in headless Chromium and asserts the postMessage contract the workbench depends on: one `ready`, one `done` per run, tokens that keep a superseded run from settling, compile and render errors reported as such, and the fetch stub answering in place of the network. It needs an existing client build and a Chromium (set `CHROME_BIN` if it is not on a usual path); with no browser available it prints a notice and exits 0.

The one-time import of interview-prepper history is `npm run import:interview-prepper -- --input export.json --user-id <id> [--apply]`; it reads a Firestore export, maps the old challenge ids to devShark task ids, and writes passed tasks and attempts without XP or scheduled reviews.

After deployment, schedule `public.purge_expired_learning_data()` with Supabase Cron or another owner-controlled job. Back up before migrations and follow [docs/backup-restore.md](./docs/backup-restore.md).

Operational instructions are in [docs/launch-runbook.md](./docs/launch-runbook.md). Owner actions only are tracked in [NEEDED.md](./NEEDED.md). Current and projected infrastructure costs are in [scaling.md](./scaling.md).

## Product principles

- `shared/tiers.ts` alone decides what the free tier and Premium open. Premium, coins, cosmetics and merchandise change which content a learner may start, never grading, explanations, XP amounts, scores, ranks or leaderboards; a streak protection changes a streak's day count and nothing else. Until 25 September 2026 this line said all learning was free.
- The server owns answers, scoring, progression, and public identity labels.
- Anonymous local learning remains useful; account-backed competitive and classroom features require sign-in.
- devShark ships no AI feature. Coding hints are authored and end in documentation links.
- Native mobile work is intentionally deferred until the web release is stable.

## Marketing (external, read-only)

devShark is marketed by **marketingShark**, a project inside BoardlessAI
(`lukaskourilcz/quorum`). One meeting a day there picks a single question out of this
repository's bank and writes it up as a five-slide carousel in Czech and again in English,
answer included, with devShark named once at the end.

What that means for this repository, precisely:

- **Nothing here changes.** No handler, catalog, client file or migration is touched by it. The
  question bank is consumed read-only as a pinned snapshot, and the source commit is recorded in
  the snapshot's envelope on the quorum side.
- **The answer is published with the question.** That is the point of the format — the carousel
  gives a reader the real question and the real answer rather than a teaser. The bank already
  lives in a public repository, so nothing becomes public that was not.
- **Which questions have been used is recorded** in `state/marketingshark/ledger.json` in quorum.
  Every question is served once before any repeats.
- **Nothing is posted automatically.** Each carousel is stored as a draft behind an approval
  queue; marketingShark owns no social account and has no publishing path.

### The contract

The importer in quorum reads `lib/webdev-bank.ts` and nothing else. Keep these names and shapes,
or change the importer upstream first.

- **Exports:** `loadWebdevQuestions()` resolves to the question array and
  `loadWebdevTranslations()` to the Czech overlays keyed by question id. The importer loads both
  by name.
- **Question fields:** `id` (a unique string), `introduction`, `question`, `options` (two or more
  strings), `correctAnswer` (an index into `options`), `category`, `explanation`, `difficulty`
  (an integer from 1 to 5) and an optional `importance` (an integer from 1 to 10).
- **Czech overlay:** optional `introduction`, `question`, `options` and `explanation`. Czech
  `options` must match the English array's length, because `correctAnswer` indexes both.
- **Code detection:** the importer marks a question as code when its `question` or
  `introduction` contains a fenced block (```` ``` ````). A question with `snippet` metadata keeps
  its code there.

`npm run test:launch` checks every question and its Czech overlay against this list
(`scripts/webdev-bank-contract.ts`). When it fails, fix the bank. If the contract itself has to
change, change the quorum adapter first and then this test.

marketingShark reads a pinned snapshot, `state/marketingshark/question-banks/devshark.json`,
whose envelope records the source commit and a content hash. A bank change reaches marketing
only after someone re-imports it from a clean checkout on the quorum side and confirms the
result with `--check`:

```sh
pnpm marketingshark:import-bank -- --brand devshark --source ../react-express-app
pnpm marketingshark:import-bank -- --brand devshark --source ../react-express-app --check
```

The importer refuses uncommitted changes under `lib/` and `shared/`. A re-import keeps the ledger
of used questions.
