# DevQuiz

A developer-knowledge quiz & learning app covering HTML, CSS, JavaScript, TypeScript, React, Node.js, Next.js, Git, DSA/algorithms, databases, DevOps, security, system design, testing, and AI/LLMs. **~3,100 hand-curated questions** across **15 learning paths**, importance-weighted from beginner to expert. Solo practice, a guided skill roadmap, daily challenges, live multiplayer/classroom matches, flashcards, XP/leveling, and leaderboards — on the web **and** iOS.

> **Stack:** React 18 + Vite + MUI (TanStack Query) on the client · Vercel serverless functions in TypeScript on the backend · Supabase (Postgres + Auth + Realtime) for persistence, identity, and live matches · an Expo (React Native) iOS app sharing the same API. Identity is **Supabase Auth (Google OAuth)**.
>
> 💰 For hosting tiers, current costs, and a scaling analysis, see **[`stack-and-scaling.md`](./stack-and-scaling.md)**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Authentication (Supabase Auth)](#authentication-supabase-auth)
- [API reference](#api-reference)
- [Quiz data & importance](#quiz-data--importance)
- [Mobile app (iOS / Expo)](#mobile-app-ios--expo)
- [Security model](#security-model)
- [Reliability & observability](#reliability--observability)
- [Performance notes](#performance-notes)
- [Accessibility](#accessibility)
- [Internationalization](#internationalization)
- [Deployment](#deployment)
- [Cost & scaling](#cost--scaling)
- [Roadmap / known gaps](#roadmap--known-gaps)

---

## Features

### Solo quiz
- **~3,100 questions** across **15 learning paths** (HTML, CSS, JavaScript, TypeScript, React, Node.js, Next.js, Git, DSA, algorithms, databases, DevOps, security, system design, testing, AI & LLMs, plus general/abbreviations/"cool stuff").
- Pick your **categories**, **question count**, and **difficulty band** — selection is **importance-weighted** so the most consequential questions surface more often.
- **Server-side answer key** — the correct answer never reaches the client until after submit. Answers are HMAC-signed into a session token, so the server verifies exactly what it generated for the user.
- **Per-question option shuffle** at request time; the answer key is rewritten to match the shuffled order.
- **Detailed review** screen with explanations, tags, and per-question results.
- **Practice mode** — quiz without writing to your stats.
- **Keyboard shortcuts** — number keys to pick an option, arrows to navigate, Enter to advance/submit.
- **Report a question** — flag inaccuracies (wrong answer, typo, outdated, unclear, …) or quick "needs-review" red-flags.

### Career / skill roadmap
- A guided **learning roadmap** (`/roadmap`) with topic tracks, levels, and unlocks.
- A **skill-check** assessment that can grant extra topic unlocks; progress + unlocks sync to Supabase (`roadmap_progress`, including a JSONB `extra` for unlocks).

### Daily challenge
- A **deterministic question set per UTC date**, the same for every user, so daily leaderboards are comparable (seeded shuffle).
- Cached privately per browser; no shared CDN caching, to avoid leaking the signed answer-key token.
- A separate **challenge scoreboard** (`challenge_scores`) tracks challenge runs.

### Live multiplayer & classroom
- **Free-for-all** — every player races to answer; score = correctness × speed bonus.
- **Head-to-head (host + one player)** — the host runs the questions and doesn't score; the match auto-advances when the player answers.
- **Classroom** — host advances each question manually and sees a live per-question answer-distribution histogram.
- **Configurable per-question time limit** (or no limit), set by the host at creation.
- **Short, human-readable match codes** (Crockford base32).
- Real-time updates over **Supabase Realtime** broadcast channels, with a **polling fallback** (4 s on web, 2 s on mobile) when the socket isn't available.
- **Host heartbeats**; matches go stale and auto-finish after ~5 minutes without one.
- **Speed bonus** is computed server-side from the question-start timestamp with a 1 s ping-grace window, so client clock skew can't game the scoreboard.

### Flashcards
- Save questions as **per-user flashcards** (`flashcards` table) to revisit later.

### Leaderboards
- **Global all-time** (by total correct), **daily** (by the daily challenge), and **per-category** (by accuracy, with a min-attempts threshold to filter noise).
- 60 s edge cache + 5-minute stale-while-revalidate, so leaderboard traffic barely touches the DB.

### Profile, stats & progression
- Total quizzes, total correct, accuracy, current/longest streak.
- **UTC-anchored streaks** updated atomically in Postgres (no client timezone drift).
- **XP & leveling** (`user_xp`) and **achievements**.
- A simple **shop** for spending earned currency on cosmetic/profile items.
- **Bookmarks** for questions to revisit (client-side).

### Admin console (`/dev`)
- A password-gated console (password from `DEV_PASSWORD`, **default `autobus`** — change it in prod) with no app chrome.
- **Questions** — grouped by category, searchable by text/tag/id, with **edit**, **hide** (restorable soft-delete), **bulk-hide by importance**, **revert**, and **create**. Edits are stored as *overrides* in Supabase (`question_edits`) and merged onto the static bank at serve time; if the DB is unavailable the app falls back to the static bank unchanged.
- **Bilingual editing** — English + Čeština tabs per question (question, options, intro, explanation). Czech options stay parallel to English so grading remains correct; blank Czech fields fall back to English.
- **Importance editing** — set each question's resolved importance (1–10), which drives weighted selection.
- **Reports triage** and an **auth-events log** view.
- **Settings** — edit quiz/daily/play counts, time limits, option lists, feature toggles, and owner email (`app_settings`). The public `/api/settings` endpoint lets the client hide disabled features.
- **Security note:** the gate is a single shared password and the admin API exposes answer keys — set a strong `DEV_PASSWORD` in production.

### App-wide
- **Light / dark mode** persisted locally.
- **Skip-to-content** link and `<main>` focus management on route change.
- **Sentry** error/performance monitoring (opt-in via `VITE_SENTRY_DSN`).
- **Supabase Auth sign-in** with Google; profile data flows into Supabase.

---

## Tech stack

### Client (`client/`)
- **React 18** with Suspense and `React.lazy` for non-default routes.
- **Vite 5** + **TypeScript 5**.
- **MUI 5** (Material UI) + Emotion, with a custom theme (`client/src/theme/MuiTheme.ts`).
- **TanStack React Query 5** for server-state/caching.
- **React Router v7**.
- **`@supabase/supabase-js`** — browser client for the Auth session and Realtime channels.
- **`@sentry/react`** — error + performance monitoring (tree-shaken out when no DSN is set).
- **react-syntax-highlighter** (Prism, lazy) for code blocks.

### Backend (`api/` + `lib/`)
- **Vercel serverless functions** (`api/**/*.ts`) using `@vercel/node` — **12 handlers**, the Vercel Hobby cap.
- **`@supabase/supabase-js`** server-side (anon client for public reads / token verification; service-role client for trusted user-scoped writes after the caller is verified).
- **Supabase Postgres** for all persistence (RLS + atomic RPCs).
- **Supabase Realtime** for live match channels.
- **HMAC-signed session tokens** (`node:crypto`) as the answer-key proof.
- In-memory caches (short TTL) for the question bank and settings on warm instances.

### Mobile (`mobile/`)
- **Expo SDK 52 / React Native 0.76**, **expo-router**, an offline question bundle, and a native iOS widget target. Talks to the same Vercel API and Supabase project.

### Hosting
- **Vercel** for the SPA + serverless functions (edge CDN, security headers, SPA rewrites).
- **Supabase** for Postgres (RLS-enforced), Auth (Google OAuth), and Realtime.

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Web (React + MUI + RQuery) │ ──────▶ │  Vercel serverless (api/*)   │
│  iOS  (Expo / React Native) │  HTTPS  │   - Verify Supabase JWT      │
│   - Supabase Auth (Google)  │  Bearer │     (auth.getUser)           │
│   - apiFetch w/ access token │        │   - Validate + sanitize      │
└─────────┬───────────────────┘         │   - Service-role writes      │
          │                             └─────────┬────────────────────┘
          │ WebSocket (Realtime)                  │ Postgres + RPC
          ▼                                       ▼
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Supabase Realtime          │ ◀────── │  Supabase Postgres + Auth    │
│  (match broadcast channels) │         │   user_stats, user_xp,       │
└─────────────────────────────┘         │   matches/participants/answers│
                                        │   roadmap_progress, flashcards│
                                        │   daily_attempts, challenge_* │
                                        │   question_edits, app_settings│
                                        │   question_reports, auth_events│
                                        └──────────────────────────────┘
```

**Design principles:**

1. **Server is the source of truth.** The client never knows the correct answer for an unanswered question. Answers travel in an HMAC-signed session token created by `/api/quiz/questions` and verified on submit.
2. **All identity through Supabase Auth.** Every protected endpoint reads `Authorization: Bearer <access_token>`, verifies it with `supabase.auth.getUser(jwt)`, and uses the verified user id (`sub`). Client-supplied ids are ignored in production.
3. **Atomic mutations via Postgres RPCs.** Streak/score updates and match-state transitions use server-side functions with row locks, not read-modify-write at the API layer.
4. **Graceful degradation.** Realtime falls back to polling; missing Supabase env → API returns `503` with a clear code; the question bank and settings fall back to in-code defaults when the DB is down.

---

## Repository layout

```
react-express-app/
├── api/                          # Vercel serverless functions (12 handlers)
│   ├── health.ts                 #   GET  liveness + Supabase reachability
│   ├── leaderboard.ts            #   GET  global / daily / category leaderboards
│   ├── settings.ts               #   GET  public game config (feature flags, counts)
│   ├── flashcards.ts             #   per-user flashcards CRUD
│   ├── play/[action].ts          #   create | join | state | control | answer | distribution | heartbeat
│   ├── quiz/
│   │   ├── questions.ts          #   GET  N importance-weighted questions + signed session
│   │   ├── submit.ts             #   POST verify answers (also ?resource=report to flag a question)
│   │   ├── daily.ts              #   GET  daily challenge questions + session
│   │   ├── challenge.ts          #   challenge mode questions / scoreboard
│   │   └── roadmap.ts            #   GET/POST roadmap structure + progress sync
│   ├── user/[op].ts              #   stats | category-stats | xp | streak | profile
│   └── admin/[op].ts             #   questions | save | delete | bulkhide | reset | reports | logs | settings
│
├── lib/                          # Shared server-side helpers (importable from api/*)
│   ├── auth.ts                   #   Supabase access-token verification (auth.getUser)
│   ├── admin-auth.ts             #   x-dev-password gate (DEV_PASSWORD, default 'autobus')
│   ├── http.ts                   #   Supabase clients, JSON errors, logging, withTimeout
│   ├── quiz-data.ts / .cs.ts     #   Question bank + HMAC session encode/decode + localization
│   ├── roadmap-questions-*.ts    #   Per-track question sets that build the bank
│   ├── questions-store.ts        #   Effective bank = static + /dev overrides (cached)
│   ├── settings-store.ts         #   Game settings (cached, with in-code defaults)
│   ├── reports-store.ts / auth-events-store.ts / challenge-store.ts
│   └── importance.ts / roadmap*.ts
│
├── client/                       # Vite + React SPA
│   └── src/
│       ├── components/           # Quiz, Play, Profile, Leaderboard, Roadmap, Flashcards,
│       │                         # Shop, Challenge, dev/* console, ErrorBoundary, …
│       ├── lib/                  # api, supabase, queries (React Query), auth, realtime,
│       │                         # achievements, leveling, xp, tokens, sentry, …
│       ├── i18n/                 # English + Czech translations
│       └── theme/                # MUI theme + ColorMode context
│
├── mobile/                       # Expo SDK 52 / React Native 0.76 iOS app (+ offline bundle, widget)
│
├── supabase-schema.sql           # baseline: user_stats + RLS
├── supabase-schema-0NN.sql       # migrations 002 … 019 (see Database setup)
├── scripts/                      # roadmap validation + mobile offline-bundle generation + tests
├── vercel.json                   # function config + security headers + CSP + SPA rewrites
├── stack-and-scaling.md          # tech stack, current costs, and scaling analysis
└── package.json
```

---

## Local development

### Prerequisites
- **Node.js 20+** (LTS).
- **Vercel CLI** for the dev server: `npm i -g vercel`.
- A **Supabase** project (free tier is plenty) with the **Google** auth provider enabled.

### One-time setup
```bash
git clone <this-repo>
cd react-express-app
npm run install:all     # installs root + client deps
```

Create a `.env` / `.env.local` at the repo root and in `client/` (see [Environment variables](#environment-variables)), then apply the [database migrations](#database-setup).

### Run
```bash
npm run dev             # vercel dev — serves the client and api/* together on :3000
```

`vercel dev` runs Vite (HMR) and exposes the `api/*` routes at `/api/*` exactly as in production. If you only need the client, `cd client && npm run dev` works too.

In dev, if the Supabase env vars are missing, `requireAuth()` logs a warning and falls back to trusting a client-supplied `user_id` so local work isn't blocked. **This fallback is disabled in production** — unauthenticated requests get `401 missing_token` (or `503 auth_not_configured`).

### Build
```bash
npm run build           # cd client && tsc -b && vite build  → client/dist
```

---

## Environment variables

The `VITE_` prefix exposes a variable to the client bundle at build time; the rest are read by Vercel functions at request time.

| Variable | Required | Where | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | client + server | Supabase project URL (`https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | ✅ | client + server | Supabase anon key — browser client + server-side JWT verification. |
| `SUPABASE_URL` | alt | server | Non-`VITE_` server-side fallback. |
| `SUPABASE_ANON_KEY` | alt | server | Non-`VITE_` server-side fallback. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (prod) | server | Lets the API bypass RLS for user-scoped writes **after** verifying the caller. Never expose to the client. |
| `SESSION_SECRET` | ✅ (prod) | server | ≥32-byte random string; HMAC-signs quiz session tokens. Generate with `openssl rand -base64 48`. |
| `DEV_PASSWORD` | ⚠️ recommended | server | Gates the `/dev` console + `/api/admin` (via `x-dev-password`). **Defaults to `autobus` — set a strong value in prod**, the admin API exposes answer keys. |
| `OWNER_EMAIL` | optional | server | Email whose private categories are visible; defaults to `kouril.lukas@gmail.com`. |
| `VITE_SENTRY_DSN` | optional | client | Enables Sentry error/perf monitoring; omit to disable (the SDK is then tree-shaken out). |

**Mobile (`mobile/`)** uses `EXPO_PUBLIC_*` vars (inlined at build) or `app.json` → `expo.extra`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL` (your deployed Vercel URL). Use only public/anon values — never secrets.

> Note: there is **no Auth0** in this project. Identity is handled entirely by Supabase Auth; older Auth0 references have been removed.

---

## Database setup

Apply the SQL files **in order** in the Supabase SQL Editor — `supabase-schema.sql` (baseline) then `supabase-schema-002.sql` … `supabase-schema-019.sql`. They use `IF NOT EXISTS` / guarded blocks so re-running is safe, but **order matters** (later migrations add columns to earlier tables).

Quick map of what each migration adds:

| Migration | Adds |
|---|---|
| base | `user_stats` + RLS |
| 002 | atomic `record_quiz_result` RPC + indexes |
| 003 | `question_reports`, `daily_attempts` |
| 004 | multiplayer (`matches`, `match_participants`, `match_answers`) + leaderboard RPCs |
| 005 | per-category stats + match timing / distribution RPCs |
| 006 | match heartbeat + adjustable leaderboard threshold |
| 007 | **hardened RLS** + revoke anon write RPCs + `match_answers` uniqueness |
| 008 | `flashcards` |
| 009 | `question_edits` overrides + `app_settings` (the `/dev` console) |
| 010 | per-question Czech (`cs_*`) translation columns |
| 011 | `roadmap_progress` |
| 012 | `user_streak` |
| 013 | `user_xp` |
| 014 | editable `question_edits.importance` |
| 015 | `auth_events` (auth log) |
| 016–017 | indexes / RLS / function refinements |
| 018 | `challenge_scores` |
| 019 | `roadmap_progress.extra` JSONB (skill-check unlocks) |

Then enable **Realtime** on `matches`, `match_participants`, and `match_answers` (Supabase Studio → Database → Replication / the `supabase_realtime` publication), or live multiplayer won't update.

> **Important:** without migration 007 the write RPCs are callable by `anon`, meaning anyone with the anon key could inflate stats. Always apply 007 before production.

### Key RPCs
`record_quiz_result` · `record_category_stats` · `global_leaderboard` · `daily_leaderboard` · `category_leaderboard` · `match_scoreboard` · `match_question_distribution`.

---

## Authentication (Supabase Auth)

Identity is **Supabase Auth with the Google provider** (no Auth0, no custom JWT infra):

1. In Supabase → **Authentication → Providers → Google**, enable Google and configure the OAuth client.
2. Add your site URL and the `…/auth/callback` redirect to **both** Supabase and the Google Cloud OAuth client. For the mobile app, also add `devquiz://auth-callback`.
3. The browser client signs in via Supabase and stores the session in `localStorage`; `apiFetch` attaches the access token as a `Bearer` header.
4. On the server, `lib/auth.ts` verifies each token with `supabase.auth.getUser(token)` and uses the returned user id as the canonical subject. After verification, user-scoped writes use the service-role key (bypassing RLS safely because the subject is already trusted).

---

## API reference

All endpoints return JSON; errors come back as `{ "error": { "code": "string", "message": "human-readable" } }`. Protected endpoints require `Authorization: Bearer <supabase_access_token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | none | Liveness + Supabase reachability. |
| `GET` | `/api/quiz/questions?category=&difficulty=&count=` | none | N importance-weighted, shuffled questions + signed session token. `private, no-store`. |
| `POST` | `/api/quiz/submit` | none (session-bound) | `{ sessionId, answers: { [questionId]: index }, lang? }` — verifies via HMAC; returns per-question results + explanations. |
| `POST` | `/api/quiz/submit?resource=report` | optional | `{ question_id, reason, detail? }` — flag a question (the report endpoint is folded in here to stay under the 12-function cap). |
| `GET` | `/api/quiz/daily?date=YYYY-MM-DD` | none | Daily challenge for the date (default today). `private, max-age=300`. |
| `GET`/`POST` | `/api/quiz/challenge` | mixed | Challenge-mode questions / scoreboard. Public reads `s-maxage=15` SWR; writes are auth'd + `no-store`. |
| `GET`/`POST` | `/api/quiz/roadmap` | mixed | Roadmap structure (`public, max-age=60`) and authenticated progress sync (`private, no-store`). |
| `GET`/`POST` | `/api/user/[op]` | required | `stats`, `category-stats`, `xp`, `streak`, profile — subject comes from the verified JWT. |
| `GET` | `/api/leaderboard?period=global\|daily\|category&…` | none | Public leaderboards. `s-maxage=60` + SWR 300. |
| `*` | `/api/flashcards` | required | Manage per-user flashcards. |
| `POST` | `/api/play/[action]` (`create`/`join`/`control`/`answer`/`heartbeat`) | required | Create/join/run a match; server computes the speed bonus and guards against double-advance. |
| `GET` | `/api/play/[action]` (`state`/`distribution`) | optional/host | Match state (answer keys stripped unless host or finished); per-option distribution is host-only. `no-store`. |
| `GET` | `/api/settings` | none | Public read-only game config (counts, time options, feature flags). `s-maxage=15` + SWR. |
| `GET`/`POST` | `/api/admin/[op]` | dev password | `questions`/`save`/`delete`/`bulkhide`/`reset`/`reports`/`logs`/`settings` — gated by `x-dev-password`. |

Every Supabase call is wrapped in a 5-second timeout so a hung Postgres can't burn the full 10-second Vercel function slot.

---

## Quiz data & importance

- **Source of truth:** `lib/quiz-data.ts` (+ `lib/quiz-data.cs.ts` for Czech) and the per-track `lib/roadmap-questions-*.ts` files, assembled into a single bank of **~3,100 questions**.
- Each question has an `id`, `tags`, optional `introduction`, `question` (Markdown with optional fenced code), `options`, `correctAnswer` (index), `category`, `explanation`, a `difficulty`, and a resolved **importance (1–10)**.
- **Importance-weighted selection** is applied on web, the mobile online path, and the mobile offline fallback, so high-value questions appear more often.
- `/dev` edits are stored as **overrides** (`question_edits`) and merged onto the static bank at serve time (cached briefly); the live quiz reflects changes within seconds, and the app falls back to the static bank if the DB is unavailable.
- **Session tokens** are `base64url(payload) + "." + base64url(HMAC-SHA256(payload, SESSION_SECRET))` with a short TTL, carrying the generated questions + answer key so submit can verify without trusting the client.
- The bank lives in **code**, not the database — keep that in mind for cold-start parse cost (see [Performance notes](#performance-notes)).

---

## Mobile app (iOS / Expo)

`mobile/` is an **Expo SDK 52 / React Native 0.76** app (expo-router) that reuses the same Vercel API and Supabase project, with an **offline question bundle** (`mobile/src/data/offline-data.ts`, regenerated by `scripts/generate-mobile-offline.ts`) and a native iOS **widget** target.

It is feature-complete but pre-launch: `mobile/app.json` still has a placeholder bundle id and empty Supabase/API config. App Store prerequisites (Apple Developer Program, Sign in with Apple, privacy manifest, in-app account deletion, real bundle id, EAS submit credentials) are tracked in `SETUP_AND_RECOMMENDATIONS.md` §5–6 and `LAUNCH.md`.

---

## Security model

| Layer | Control |
|---|---|
| **Identity** | Every protected endpoint verifies the Supabase access token via `auth.getUser()`; the returned user id is the canonical subject. Client-supplied ids are ignored in production. |
| **Quiz answer integrity** | Correct answers never leave the server before submit. Sessions are HMAC-SHA256-signed and compared in constant time (`timingSafeEqual`). |
| **RLS** | User rows are RLS-scoped; write RPCs are revoked from `anon` (migration 007). The service-role key is used server-side only, after the caller is verified. |
| **Admin gate** | `/dev` + `/api/admin` require the `x-dev-password` header (`DEV_PASSWORD`), checked in constant time. |
| **CSP** | Strict `default-src 'self'` with allowlisted `connect-src` (Supabase HTTPS + WSS) and Google Fonts; `frame-ancestors 'none'`. |
| **Headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locking down camera/mic/geo/FLoC, HSTS with preload. |
| **Input validation** | Every body field is type-checked and bounded; categories are allowlisted; answer/option counts are capped. |
| **Rate limiting** | ⚠️ **Not yet enabled at the app layer** — the anonymous report insert and mutating routes rely on platform limits. Upstash + `@upstash/ratelimit` is the recommended next step. |

---

## Reliability & observability

- **Timeouts** — every Supabase call is wrapped in `withTimeout(p, 5000)`; a hung DB returns a `504`/`upstream_timeout` instead of hitting the 10 s function ceiling.
- **Idempotent answer writes** — `match_answers` is unique on `(match_id, sub, question_idx)`; the API upserts so retries replace rather than duplicate.
- **Conditional state transitions** — match `control` updates only if `(status, current_index)` are unchanged since the read, avoiding double-advance on concurrent host clicks.
- **Stale-match auto-finish** — `state` flips `running → finished` when the last heartbeat is older than ~5 minutes.
- **Structured logs** — single-line `console.log(JSON.stringify({ ts, route, … }))` from every handler, queryable in Vercel's log explorer.
- **Realtime → polling fallback** — the client falls back to periodic polling when Realtime isn't pushing updates.
- **Error monitoring** — `@sentry/react` is wired in the client (opt-in via `VITE_SENTRY_DSN`, 10% trace sampling). Server handlers currently log to Vercel only.
- **`ErrorBoundary`** wraps the app shell; unhandled component errors render a recovery screen instead of a blank page.
- **`/api/health`** for uptime monitors.

Known gaps (intentional, see roadmap): no app-layer rate limiting; no server-side error aggregation; `/api/health` returns `200` even when Supabase is down (should return `503`).

---

## Performance notes

In place:
- **Route-level code splitting** via `React.lazy` for every page.
- **TanStack Query** caching with generous `staleTime` (30–60 s; roadmap structure 5 min) to minimize refetches.
- **CDN caching** on public reads (leaderboards `s-maxage=60`+SWR; settings/challenge `s-maxage=15`+SWR) so they barely touch the DB.
- **O(1) question lookup** in `/api/quiz/submit` via a precomputed `Map`.
- **Concurrent Supabase reads** in match `state`.
- **In-memory caches** for the question bank and settings on warm serverless instances.

Documented follow-ups (in `SETUP_AND_RECOMMENDATIONS.md`):
- `react-syntax-highlighter` ships ~280 KB gzip of Prism languages though only ~8 are used → switch to `prism-light` + `registerLanguage` (~200 KB gzip saved).
- The ~2 MB question bank is **re-parsed on every cold start** → emit a build-time JSON asset and lazy-load the Czech bank only when `lang=cs`.
- Add `Cache-Control: public, max-age=31536000, immutable` for hashed `/assets/*`.
- Convert the non-atomic XP read-modify-write and the JS-side report counting to RPCs.

---

## Accessibility

- **Skip-to-content** link as the first focusable element; `<main>` focused on each route change.
- Icon-only buttons carry `aria-label`s; toggle groups have group + per-button labels.
- Quiz options use real `<RadioGroup>`/`<Radio>` semantics with `aria-labelledby`.
- Loading states use `role="status"` + visually-hidden text.
- Color contrast targets WCAG AA (special-cased category chips in `MuiTheme.ts`).
- `prefers-reduced-motion` is respected.

---

## Internationalization

The UI and quiz content support **English and Czech**. UI strings live in `client/src/i18n/` (`translations.ts` / `translations.cs.ts`); question content has parallel `cs_*` override columns and `lib/quiz-data.cs.ts`. Czech fields fall back to English when blank, and answer grading always uses the English option order so translations can't desync the answer key.

---

## Deployment

This repo is a Vercel project out of the box.

1. Connect the GitHub repo to Vercel.
2. Set every variable from [Environment variables](#environment-variables) in **Project Settings → Environment Variables** for `production` (and `preview`).
3. Push to `main` — Vercel runs the build from `vercel.json` (`cd client && npm install && npm run build`, output `client/dist`); `api/*.ts` deploy as serverless functions with `maxDuration: 10`.
4. Apply the SQL migrations in Supabase and enable Realtime on the match tables (see [Database setup](#database-setup)).
5. Configure the **Google** auth provider + redirect URLs (see [Authentication](#authentication-supabase-auth)).
6. Verify `/api/health` responds and a sign-in → quiz → leaderboard round-trip works.

> **Hobby-tier note:** the app sits exactly at Vercel Hobby's **12-function** limit, so any new endpoint requires Vercel Pro or merging into an existing catch-all (`[op]`/`[action]`) handler. Details and cost implications in [`stack-and-scaling.md`](./stack-and-scaling.md).

---

## Cost & scaling

Today the app runs on free tiers (Vercel Hobby + Supabase Free + opt-in Sentry) at **≈ $0/month**. The full breakdown — per-service tiers, limits, what breaks first, and the cost/architecture at 100 active users — is in **[`stack-and-scaling.md`](./stack-and-scaling.md)**. The headline bottleneck is multiplayer **polling** pressuring Supabase; moving fully to Realtime subscriptions plus short CDN TTLs buys large headroom before any tier upgrade.

---

## Roadmap / known gaps

Flagged in the codebase / audit docs and not yet wired:

- **Rate limiting** — Upstash + `@upstash/ratelimit` on the anonymous report endpoint and mutating routes.
- **Multiplayer transport** — replace HTTP polling with Supabase Realtime subscriptions (+ `s-maxage=1` on `play/state`).
- **Cold-start cost** — precompile the question bank to JSON; lazy-load the Czech bank.
- **Lighter syntax highlighter** — `prism-light` / `registerLanguage` to save ~200 KB gzip.
- **Atomic writes** — convert XP updates and report counts to RPCs.
- **Health endpoint** — return `503` when Supabase is down so uptime monitors detect outages.
- **iOS launch** — Sign in with Apple, privacy manifest, in-app account deletion, real bundle id + EAS credentials.

---

## License

Not currently licensed for redistribution. All quiz content is hand-curated; please do not scrape the question bank under `lib/`.

---

## Acknowledgements

- The **~3,100-question dataset** is hand-curated and importance-scored across 15 learning paths.
- UI built on **Material UI** with a custom theme.
- Auth, persistence, and live-match infrastructure ride on **Supabase** (Auth + Postgres + Realtime).
