# StudyShark + devShark

StudyShark is a free, bilingual learning platform for geography, mathematics, history, human biology, chess, and poker. devShark is the separate, web-development-focused product built from the same repository. Product identity, public navigation, question delivery, progression, leaderboards, flashcards, multiplayer rooms, and API access are scoped so StudyShark never exposes the developer bank and devShark never exposes StudyShark subjects.

Production: [StudyShark](https://studyshark-app.vercel.app) hosts all six general subjects on one domain; [devShark](https://devshark.app) is the standalone web-development platform. Both deploy from `main` into separate Vercel projects with independent product scopes and shared Supabase data infrastructure.

The web experience uses the Deep End shark identity across the landing pages, Learn, Quiz, Challenge, Play, Profile, Flashcards, the career roadmap, dialogs, progress indicators, and the `/dev` control room. It supports English and Czech, light and dark themes, keyboard navigation, reduced motion, and responsive mobile/desktop layouts.

Current content: **7,953 authored questions** — 3,633 web development, 1,000 geography, 1,000 mathematics, 1,000 history, 600 chess, 400 human biology, and 320 poker.

## What the app can do

- Guided Learn paths with short levels, checkpoints, adaptive skill checks, prerequisites, saved progress, and server-observed grading — plus spaced mastery (a level goes cleared → mastered over three separate days) and an auto-composed "Today" queue that folds unfinished work, due-for-review levels, and new material into one daily plan.
- Configurable solo quizzes with category, difficulty, and question-count selection; weighted sampling; shuffled answers; an optional Socratic "Sharkira" hint coach; bookmarks; question reporting; keyboard controls; and a two-column desktop review.
- A deterministic daily challenge and the timed Biggest Shark Challenge with subject-specific leaderboards.
- Live free-for-all matches and host-led classroom rooms using Supabase Realtime with polling recovery, server-side timing, QR sharing, and subject-scoped question sets.
- Subject-scoped all-time, daily, and category leaderboards; forgiving streaks (configurable off-days plus two monthly freezes); verified XP; ranks; server-synced badges shown alongside their next goals; collectible cosmetic Shark Cards earned by finishing the Today queue; and a fairness-neutral cosmetic token shop.
- A read-only study advisor that names weakest areas and a suggested week from your own results, and a devShark touch-typing racer (accuracy-gated, WPM earns stars, private on-device best).
- Per-user, per-subject flashcards with optimistic updates and offline-safe query caching.
- Google sign-in through Supabase Auth, cross-device progress, profile settings, language preference, and permanent account deletion.
- Optional voluntary support, post-answer AI explanations, Socratic Sharkira hints, Sentry monitoring, and PostHog analytics. Every optional integration is gated and disabled by default.
- A role-gated `/dev` control room for question CRUD/overrides, EN/CS editing, importance tuning, quality and parity checks, report triage, auth logs, feature settings, support disclosure, and app-context switching.
- Two deployments from one source tree: one multi-subject StudyShark domain and one locked devShark domain, with a central subject/product registry and shared Shark-family footer.

Correct answers are not sent with unanswered questions. Quiz and learning sessions use authenticated AES-256-GCM envelopes, submissions are claimed once in Postgres, result receipts are idempotent, and competitive/progression mutations are performed through service-only APIs and atomic database functions.

## Tech stack

| Layer | Current implementation |
|---|---|
| Web client | React 19.2, TypeScript 5.9, Vite 6.4, React Router 7.18 |
| Design and motion | Astryx Design 0.1.6, subject/product CSS tokens, Motion 12 |
| Server state | TanStack Query 5.101 |
| Backend | 12 Vercel Node/TypeScript serverless handlers |
| Data and identity | Supabase Postgres, Auth, Row Level Security, RPCs, Realtime |
| Rate limiting | Upstash Redis when configured; bounded in-memory fallback for local/preview use |
| Observability | Sentry 10 and PostHog, both opt-in |
| Other client capabilities | QR generation, lazy Prism syntax highlighting, Web Share/download fallbacks |

Node.js **22–24** is required. The production application does not rely on the legacy compiled `server/dist` artifact; Vercel serves `api/` and the Vite SPA.

## Architecture

```text
React/Vite SPA
  ├─ Supabase Auth session + Realtime room channels
  └─ authenticated /api requests
       └─ 12 Vercel functions
            ├─ deployment/subject validation
            ├─ request limits, timeouts, structured errors/logs
            ├─ encrypted quiz/learning session verification
            └─ service-role calls to Supabase
                 ├─ RLS-protected tables
                 └─ atomic scoring/progression/leaderboard RPCs
```

The question bank is split by subject and Czech translations are loaded only when needed. Static questions are merged with cached `/dev` overrides. Public deployments are resolved from `VITE_PRODUCT`/`PRODUCT_ID` and optionally locked with `VITE_LOCK_SUBJECT`/`PRODUCT_SUBJECT`.

## Repository map

```text
api/                         12 Vercel handlers
  admin/[op].ts              admin question, report, log, quality, settings operations
  play/[action].ts           create/join/state/control/answer/distribution/heartbeat
  quiz/*.ts                  questions, submit, daily, challenge, roadmap
  user/[op].ts               stats, XP, streaks, auth events, account deletion
client/src/                  React application, design system, stores, i18n
lib/                         server auth, tokens, bank loaders, stores, rate limits
shared/                      product/subject ownership registry
supabase/supabase-schema*.sql         baseline plus migrations through 024
docs/                        launch, architecture, backup, growth, content sources
scripts/test-launch-contracts.ts
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
- `VITE_PRODUCT` and `PRODUCT_ID`; add the `webdev` subject lock variables only for devShark.
- `VITE_STUDYSHARK_URL` and `VITE_DEVSHARK_URL`; general subject brands use internal StudyShark links.
- `ADMIN_EMAILS` or Supabase `app_metadata.role=admin` for `/dev`.
- Google OAuth origins and callback URLs for every production domain.
- All migrations through **`supabase/supabase-schema-024.sql`**.

Strongly recommended for a public deployment:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- An external monitor for `GET /api/health`.
- `VITE_SENTRY_DSN` and/or `VITE_PUBLIC_POSTHOG_KEY` only after privacy configuration is approved.

Optional support needs both `SUPPORT_ENABLED=true` and enabled, truthful values saved through `/dev`. Optional AI needs `AI_EXPLANATIONS_ENABLED=true`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and a positive `AI_DAILY_GENERATION_LIMIT`.

## API surface

The twelve physical handlers multiplex related operations to stay within the deployment budget:

| Handler | Purpose |
|---|---|
| `/api/quiz/questions` | Standard/review question sessions |
| `/api/quiz/submit` | One-time grading, result proofs, reports, and optional AI explanations and Socratic Sharkira hints |
| `/api/quiz/daily` | UTC daily session |
| `/api/quiz/challenge` | Challenge batches, scoring, completion, leaderboard |
| `/api/quiz/roadmap` | Structure, attempts, answers, completion, adaptive placement, progress |
| `/api/play/[action]` | Multiplayer and classroom lifecycle |
| `/api/leaderboard` | Subject, daily, and category boards |
| `/api/flashcards` | Subject-scoped flashcard CRUD |
| `/api/user/[op]` | Stats, category stats, XP, streaks, badges, streak freezes, Shark Cards, study advisor, auth events, deletion |
| `/api/admin/[op]` | Role-gated control-room operations |
| `/api/settings` | Public safe configuration |
| `/api/health` | Database, service-role migration, and limiter readiness |

## Database and operations

Apply `supabase/supabase-schema.sql`, then numbered migrations in order through 024. Migration 023 adds the one-time submission ledger, subject-scopes multiplayer and flashcards, hardens service-only functions and leaderboard identity, makes roadmap answer recording atomic, enforces complete attempts/prerequisites, adds retention helpers, and adds production indexes. Migration 024 adds the daily-habit backing — spaced-mastery pass tracking inside verified roadmap completion, freeze-aware streaks, server-synced badges, Shark Cards, and the Sharkira hint cache — additively and idempotently.

After deployment, schedule `public.purge_expired_learning_data()` with Supabase Cron or another owner-controlled job. Back up before migrations and follow [docs/backup-restore.md](./docs/backup-restore.md).

Operational instructions are in [docs/launch-runbook.md](./docs/launch-runbook.md). Owner actions only are tracked in [NEEDED.md](./NEEDED.md). Current and projected infrastructure costs are in [scaling.md](./scaling.md).

## Product principles

- Learning, quizzes, explanations, hints, challenges, multiplayer, and progression are free. Support never buys access or rank, and cosmetic Shark Cards, badges, and streak freezes never change access, content, XP, scores, streaks, ranks, or AI availability.
- StudyShark and devShark are separate public contexts even though they share code and infrastructure.
- The server owns answers, scoring, progression, and public identity labels.
- Anonymous local learning remains useful; account-backed competitive and classroom features require sign-in.
- AI is a capped, cached enhancement — post-answer explanations and pre-answer Socratic hints. Curated content stays authoritative, and hints never reveal the answer.
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

Re-importing the bank after it grows is one command on the quorum side and does not disturb which
questions have already been used.
