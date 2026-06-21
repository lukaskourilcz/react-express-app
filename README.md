# DevQuiz

A web-development quiz application that tests your knowledge of React, JavaScript, TypeScript, Node.js, HTML, CSS, Git, and more. **800 hand-curated questions** spanning beginner to expert. Solo practice, daily challenges, live multiplayer matches, classroom mode, and leaderboards.

> Stack: React 18 + Vite + MUI on the client, Vercel serverless functions in TypeScript on the backend, Supabase Postgres for persistence, Auth0 for identity.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Auth0 setup](#auth0-setup)
- [API reference](#api-reference)
- [Quiz data](#quiz-data)
- [Security model](#security-model)
- [Reliability & observability](#reliability--observability)
- [Performance notes](#performance-notes)
- [Accessibility](#accessibility)
- [Deployment](#deployment)
- [Roadmap / known gaps](#roadmap--known-gaps)

---

## Features

### Solo quiz
- **800 questions** across 10 categories (React, JavaScript, TypeScript, Node.js, HTML, CSS, Git, code-snippets, custom/real-world, dev-world).
- Pick your **categories**, **question count** (5/10/15/20/30/50), and **difficulty band** (easy / medium / hard / mixed / progressive).
- **Server-side answer key** — the correct answer never reaches the client until after submit. Answers are HMAC-signed in a session token, so the server can verify what was actually generated for the user.
- **Per-question option shuffle** at request time; the answer key is rewritten to match the shuffled order.
- **Detailed review** screen with explanations, tags, and per-question result.
- **Practice mode** — quiz without writing to your stats.
- **Keyboard shortcuts** — `1`–`9` to pick an option, arrow keys to navigate, Enter to advance/submit.
- **Skeleton loading** that mirrors the question card to avoid layout shift.
- **Report a question** — flag inaccuracies (wrong answer, typo, outdated info, etc.).

### Daily challenge
- One **deterministic 5-question set per UTC date**, same for every user, drawn from each difficulty bucket.
- The same date always produces the same questions and option order (seeded shuffle), so daily leaderboards are comparable.
- Cached privately for 5 minutes per browser; no CDN-level caching to avoid leaking the signed answer-key token.

### Live multiplayer & classroom
- **Multiplayer (free-for-all)** — every player races to answer. Score = correctness × speed bonus.
- **Head-to-head (host + one player)** — the host runs the questions and does not score; only the player locks in and earns points. The moment that player answers, the match auto-advances to the next question for everyone (the host never has to click *Next*).
- **Configurable per-question time limit** — the host picks 15s / 30s / **1 min (default)** / 2 min / 5 min, or **No limit** when creating the match.
- **Classroom** — host advances each question manually, sees a live answer distribution histogram per question.
- **6-character match codes** in Crockford base32 (no `I`/`L`/`O`/`U`) so they're easy to read aloud.
- Real-time updates over **Supabase Realtime** with a 4-second polling fallback if the WebSocket fails.
- **Host heartbeats** every few seconds; matches without a heartbeat for 5 minutes auto-finish.
- **Speed bonus** is computed server-side from the question-start timestamp with a 1s ping-grace window, so client clock skew can't game the scoreboard.

### Leaderboards
- **Global all-time** (by total correct).
- **Daily** (by correct/total/duration on the daily challenge).
- **Per-category** (by accuracy, min-attempts threshold to filter noise).
- 60s edge cache + 5-min stale-while-revalidate for low DB pressure.

### Profile & stats
- Total quizzes, total correct, accuracy, current/longest streak.
- **UTC-anchored streaks** computed atomically in Postgres (no client timezone drift).
- **Bookmarks** for questions you want to revisit (stored in `localStorage`).
- **Achievements** for first quiz, 10/50 quizzes, 3/7/30-day streaks, 70%/90% accuracy, perfect quiz, 5 bookmarks.

### Abbreviations glossary
- A searchable **reference of 90+ dev abbreviations** (`npx`, `cat`, `grep`, `gcl`, `psql`, `CORS`, `JWT`, `a11y`, …) grouped by topic: CLI commands & tools, Git aliases, web & networking, data & APIs, frontend & rendering, and general jargon.
- Lives at `/abbreviations` (lazy-loaded) with a live filter across term, expansion, and description.

### Admin console (`/dev`)
- A password-gated console at **`/dev`** (password from `DEV_PASSWORD`, default `react123`) with no app chrome.
- **Questions** — every question grouped by category, searchable by text / tag / id, with **edit**, **hide** (restorable soft-delete), **revert**, and **create**. Edits are stored as *overrides* in Supabase (`question_edits`) and merged onto the static bank at serve time, so the live quiz reflects changes within seconds. If the DB is unavailable the app falls back to the static bank unchanged.
- **Bilingual editing** — the question editor has **English** and **Čeština** tabs, so each question's Czech translation (question, options, intro, explanation) can be edited per-question. cs options stay parallel to the English options so answer grading remains correct; blank cs fields fall back to English.
- **Settings** — edit quiz/daily/play counts, time limits, option lists, feature toggles (daily / multiplayer / leaderboard / flashcards), and owner email. Stored in `app_settings`; the backend reads them when serving questions and the client hides disabled features via the public `/api/settings` endpoint.
- **Security note:** the gate is a single shared password and the admin API exposes answer keys — set a strong `DEV_PASSWORD` in production.

### App-wide
- **Light / dark mode** toggle persisted to `localStorage`.
- **Skip-to-content** link and proper `<main>` focus management on route change.
- **Sound effects** (correct/incorrect/complete) — opt-in.
- **Auth0 sign-in** with Google/email; profile data flows to Supabase.

---

## Tech stack

### Client
- **React 18** with concurrent features and Suspense (`React.lazy` for every non-default route).
- **Vite 5** + **TypeScript 5**.
- **MUI 5** (Material UI) with a custom theme (`client/src/theme/MuiTheme.ts`).
- **React Router v7**.
- **Auth0 React SDK** (`@auth0/auth0-react`) with localStorage cache + refresh tokens.
- **Supabase client** (read-only, via API layer).
- **react-syntax-highlighter** (lazy) for code blocks.

### Backend
- **Vercel serverless functions** (`api/**/*.ts`) using `@vercel/node`.
- **Supabase Postgres** for all persistence.
- **Supabase Realtime** for live match channels.
- **`jose`** for Auth0 JWT verification (JWKS pulled lazily, cached across warm invocations).
- HMAC-signed session tokens (`node:crypto`) for the answer-key proof.

### Hosting
- **Vercel** for the SPA + serverless functions.
- **Supabase** for the database, RLS-enforced; PostgREST + Realtime + Auth (we use Auth0 instead of Supabase Auth).

---

## Architecture

```
┌────────────────────────┐         ┌──────────────────────────┐
│  Browser (React + MUI) │ ───────▶│ Vercel serverless (api/*)│
│   - Auth0 login        │  HTTPS  │   - JWT verify (jose)    │
│   - apiFetch Bearer    │         │   - Validate + sanitize  │
└─────────┬──────────────┘         │   - Supabase service key │
          │                        └────────┬─────────────────┘
          │ WebSocket                       │
          │ (Realtime)                      │ Postgres + RPC
          ▼                                 ▼
┌────────────────────────┐         ┌──────────────────────────┐
│  Supabase Realtime     │◀────────│  Supabase Postgres       │
│  (match channels)      │ pg_notify│   - user_stats           │
└────────────────────────┘         │   - matches              │
                                   │   - match_participants   │
                                   │   - match_answers        │
                                   │   - user_category_stats  │
                                   │   - daily_attempts       │
                                   │   - question_reports     │
                                   └──────────────────────────┘
```

**Design principles:**

1. **Server is the source of truth.** The client never knows the correct answer for an unanswered question. Answers travel through an HMAC-signed session token created by `/api/quiz/questions` and verified on submit.
2. **All identity through Auth0 JWT.** Every protected endpoint reads `Authorization: Bearer <token>`, verifies it against Auth0's JWKS, and uses the verified `sub` claim. Client-supplied `auth0_id` is ignored in production.
3. **Atomic mutations via Postgres RPCs.** Streak/score updates and match-state transitions use server-side functions with row locks, not read-modify-write at the API layer.
4. **Graceful degradation.** Realtime falls back to polling; Auth0 missing → app still runs in anonymous mode; Supabase missing → API returns 503 with a clear error code.

---

## Repository layout

```
react-express-app/
├── api/                          # Vercel serverless functions
│   ├── health.ts                 #   GET  liveness probe
│   ├── leaderboard.ts            #   GET  global / daily / category leaderboards
│   ├── play/[action].ts          #   POST create | join | control | answer | heartbeat
│   │                             #   GET  state | distribution
│   ├── quiz/
│   │   ├── daily.ts              #   GET  daily challenge questions + session
│   │   ├── questions.ts          #   GET  N random questions + session token
│   │   ├── submit.ts             #   POST verify answers via session token
│   │   └── report.ts             #   POST flag a question
│   └── user/[op].ts              #   GET/POST profile + stats; POST category-stats
│
├── lib/                          # Shared server-side helpers (importable from api/*)
│   ├── auth.ts                   #   Auth0 JWT verifier (jose)
│   ├── play-helpers.ts           #   Supabase client + match-code generator
│   └── quiz-data.ts              #   800 questions + HMAC session encode/decode
│
├── client/                       # Vite + React SPA
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/           # Quiz, Play, Profile, Leaderboard,
│   │   │                         # AuthButton, CodeBlock, ReportDialog, ErrorBoundary
│   │   ├── lib/                  # api, supabase, play, achievements, bookmarks,
│   │   │                         # settings, realtime, AuthBridge
│   │   ├── theme/                # MUI theme + ColorMode context
│   │   └── types/quiz.ts
│   └── vite.config.ts            # manualChunks for vendor splitting
│
├── supabase-schema.sql           # Baseline: user_stats table + JWT-scoped RLS
├── supabase-schema-002.sql       # Atomic record_quiz_result RPC
├── supabase-schema-003.sql       # question_reports + daily_attempts tables
├── supabase-schema-004.sql       # matches + match_participants + match_answers + leaderboards
├── supabase-schema-005.sql       # category leaderboards + match distribution
├── supabase-schema-006.sql       # match heartbeat + configurable category threshold
├── supabase-schema-007.sql       # Hardened RLS + revoke anon writes + match_answers uniqueness
│
├── vercel.json                   # Function config + security headers + CSP
└── package.json
```

---

## Local development

### Prerequisites
- **Node.js 20+** (LTS recommended).
- **Vercel CLI** for the dev server: `npm i -g vercel`.
- A **Supabase** project (free tier is plenty).
- An **Auth0** tenant (free tier is plenty).

### One-time setup
```bash
git clone <this-repo>
cd react-express-app
npm run install:all   # installs root + client deps
```

Create `.env.local` at the repo root (see [Environment variables](#environment-variables)).

Apply the database migrations (see [Database setup](#database-setup)).

### Run
```bash
npm run dev           # vercel dev — serves both client and api/* on :3000
```

The Vite dev server is started by `vercel dev` so HMR works, plus the `api/*` routes are available at `/api/*` exactly as in production.

If you only need the client (no API), `cd client && npm run dev` works too.

### Build
```bash
npm run build         # tsc -b && vite build, output in client/dist
```

---

## Environment variables

All env vars are read by Vercel functions at request time and by Vite at build time. The `VITE_` prefix exposes a variable to the client bundle.

| Variable | Required | Where | Purpose |
|---|---|---|---|
| `VITE_AUTH0_DOMAIN` | yes | client + server | Auth0 tenant domain, e.g. `dev-xxx.us.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | yes | client | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | yes (prod) | client + server | Auth0 API audience for access tokens (required for JWT verification) |
| `AUTH0_DOMAIN` | alt | server | Same as `VITE_AUTH0_DOMAIN` if you prefer a non-`VITE_` server-side var |
| `AUTH0_AUDIENCE` | alt | server | Same as `VITE_AUTH0_AUDIENCE` |
| `VITE_SUPABASE_URL` | yes | client + server | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | client + server | Supabase anon key (RLS-restricted) |
| `SUPABASE_URL` | alt | server | Non-`VITE_` server-side fallback |
| `SUPABASE_ANON_KEY` | alt | server | Non-`VITE_` server-side fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended | server | Used by API routes to bypass RLS for trusted writes (optional but recommended) |
| `SESSION_SECRET` | **required in prod** | server | HMAC key for quiz-session tokens; the server refuses to start in prod if unset |
| `DEV_PASSWORD` | recommended | server | Password gating the `/dev` admin console and `/api/admin`. Defaults to `react123` — **set a strong value in production**, since the admin API exposes question answer keys. |
| `OWNER_EMAIL` | optional | server | Default email allowed to see private categories (also editable from `/dev` → Settings). |

In dev, if `AUTH0_DOMAIN` is unset, the server logs a warning and falls back to trusting client-supplied `auth0_id` so local development isn't blocked. In production this fallback is disabled and unauthenticated requests get a `401 missing_token`.

---

## Database setup

Apply the SQL files **in order** in the Supabase SQL Editor:

```
supabase-schema.sql        # baseline: user_stats table + RLS
supabase-schema-002.sql    # record_quiz_result RPC + indexes
supabase-schema-003.sql    # question_reports + daily_attempts
supabase-schema-004.sql    # matches + leaderboards
supabase-schema-005.sql    # category leaderboards + match distribution
supabase-schema-006.sql    # heartbeat column + adjustable thresholds
supabase-schema-007.sql    # revoke anon EXECUTE on write RPCs, hardened RLS
supabase-schema-008.sql    # per-user flashcards
supabase-schema-009.sql    # /dev admin: question_edits overrides + app_settings
supabase-schema-010.sql    # /dev admin: per-question Czech (cs) translation columns
```

> Migration 009 is optional for the public app — the quiz falls back to the
> static question bank and built-in defaults without it — but it is **required
> for `/dev` edits and settings to persist.**

Each migration is idempotent (`CREATE … IF NOT EXISTS`, `DROP POLICY IF EXISTS`, guarded `DO $$` blocks), so re-running is safe.

Enable **Realtime** on the `matches`, `match_participants`, and `match_answers` tables (Supabase Studio → Database → Replication).

> **Important:** without migration 007, the schema ships with `record_quiz_result` / `record_category_stats` callable by `anon` — meaning anyone can inflate any user's stats via the anon Supabase key. Always apply 007 before going to production.

### Tables

- **`user_stats`** — one row per Auth0 user: profile + lifetime counters + streak + UTC `last_quiz_date`.
- **`user_category_stats`** — per-(user, category) accuracy for category leaderboards.
- **`daily_attempts`** — one row per (user, date) for the daily challenge result.
- **`matches`** — live games: code, mode, host, status, full question payload (JSONB), heartbeat timestamp.
- **`match_participants`** — (match_id, auth0_sub) memberships.
- **`match_answers`** — per-(match, user, question_idx) answer with speed bonus; unique constraint for idempotent retries.
- **`question_reports`** — flagged questions for triage.

### Key RPCs

- `record_quiz_result(p_auth0_id, p_correct, p_total)` — atomic counter + streak update with `FOR UPDATE`.
- `record_category_stats(p_auth0_id, p_breakdown)` — per-category accuracy upsert.
- `match_scoreboard(p_match_id)` — per-player aggregate for a live match.
- `match_question_distribution(p_match_id, p_question_idx)` — per-option vote count, host-only.
- `global_leaderboard(p_limit)` / `daily_leaderboard(p_date, p_limit)` / `category_leaderboard(p_category, p_limit, p_min_attempts)`.

---

## Auth0 setup

1. Create a **Single Page Application** in Auth0.
2. Set **Allowed Callback URLs** and **Allowed Logout URLs** to your dev and prod origins (e.g. `http://localhost:3000`, `https://your-app.vercel.app`).
3. Set **Allowed Web Origins** to the same.
4. Create an **API** in Auth0 (e.g. `https://devquiz/api`). Note the identifier — this is your `VITE_AUTH0_AUDIENCE`.
5. (Optional but recommended) In Supabase → Settings → Auth → JWT, paste the Auth0 JWKS URL so `auth.jwt() ->> 'sub'` inside RLS returns the Auth0 user id.

The client always requests an access token for that audience (`getAccessTokenSilently`). The token's `sub` claim is what every protected endpoint uses as the canonical user id.

---

## API reference

All endpoints return JSON. Errors come back as:

```json
{ "error": { "code": "string", "message": "human-readable" } }
```

Protected endpoints require `Authorization: Bearer <auth0_access_token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | none | Liveness + Supabase reachability |
| `GET` | `/api/quiz/questions?category=&difficulty=&count=` | none | Get N shuffled questions + signed session token. Cache: `private, no-store`. |
| `GET` | `/api/quiz/daily?date=YYYY-MM-DD` | none | Daily challenge for the date (default today). Cache: `private, max-age=300`. `?date=` restricted to ±30 days. |
| `POST` | `/api/quiz/submit` | none (session-bound) | Body: `{ sessionId, answers: { [questionId]: index } }` — verifies via HMAC. Returns per-question results + explanations. |
| `POST` | `/api/quiz/report` | optional | Body: `{ question_id, reason, detail? }` — flag a question. If authed, `reporter_sub` comes from the token. |
| `GET` | `/api/user/stats` | required | Current user's stats row. |
| `POST` | `/api/user/stats` | required | Body either profile fields or `{ quiz_result: { correct, total } }`. The `auth0_id` is taken from the verified JWT. |
| `POST` | `/api/user/category-stats` | required | Body: `{ by_category: { html: {correct,total}, ... } }`. |
| `GET` | `/api/leaderboard?period=global|daily|category&...` | none | Public leaderboards. 60s edge cache. |
| `POST` | `/api/play/create` | required | Body: `{ host_name, mode, count, categories }`. Returns match code. |
| `POST` | `/api/play/join` | required | Body: `{ code, display_name }`. |
| `GET` | `/api/play/state?code=…` | optional | Public state; correct-answer fields stripped unless you're the host or the match is finished. |
| `POST` | `/api/play/control` | required (host only) | Body: `{ code, action: start|advance|finish }`. Conditional UPDATE prevents double-advance. |
| `POST` | `/api/play/answer` | required | Body: `{ code, question_idx, selected_idx, duration_ms, client_received_at }`. Server computes speed bonus. Upsert on `(match_id, auth0_sub, question_idx)` so retries replace. |
| `POST` | `/api/play/heartbeat` | required (host only) | Body: `{ code }`. Keeps the match from auto-finishing as stale. |
| `GET` | `/api/play/distribution?code=&q=` | required (host only) | Per-option vote count for question `q`. |
| `GET` | `/api/settings` | none | Public, read-only game config (count/time options, feature flags). 15s edge cache. |
| `GET` | `/api/admin/questions` | dev password | All questions (with answer keys) + their override source. |
| `POST` | `/api/admin/save` | dev password | Create or edit a question (override). |
| `POST` | `/api/admin/delete` | dev password | Body: `{ id, deleted }` — hide/restore a base question or delete a custom one. |
| `POST` | `/api/admin/reset` | dev password | Drop a question's override, reverting it to the static original. |
| `GET` / `POST` | `/api/admin/settings` | dev password | Read / save the full game settings. |

Admin endpoints are gated by the `x-dev-password` header (checked against `DEV_PASSWORD`), not the Auth0 token.

All Supabase calls are wrapped in a 5-second timeout so a hung Postgres can't burn the full 10-second Vercel function slot.

---

## Quiz data

- **Single source of truth:** `lib/quiz-data.ts` — an exported `Question[]` literal with **800 entries** plus the HMAC `encodeSession` / `decodeSession` helpers and `secureShuffle`.
- Each question has: `id`, `tags`, `introduction`, `question` (Markdown-style with optional fenced code blocks), `options` (4 strings), `correctAnswer` (index), `category`, `explanation`, `difficulty` (1–5).
- Categories: `react` (154), `javascript` (209), `typescript` (59), `nodejs` (75), `html` (75), `css` (81), `git` (60), `code-snippets` (56), `custom` (30), `dev-world` (1).
- The API loads the file once per cold start; submit uses `Map<questionId, Question>` for O(1) lookup.
- Session tokens are `base64url(JSON.stringify({ questions, iat, exp })) + "." + base64url(HMAC-SHA256(payload, SESSION_SECRET))` with a 1-hour TTL.

---

## Security model

| Layer | Control |
|---|---|
| **Identity** | Every protected endpoint verifies the Auth0 access token via JWKS (`jose`). The `sub` claim is the canonical user id. |
| **Quiz answer integrity** | Correct answers never leave the server before submit. Sessions are HMAC-SHA256-signed; the secret rejects tampered payloads in constant time (`timingSafeEqual`). |
| **RLS** | `user_stats` policies require `auth0_id = auth.jwt() ->> 'sub'`. Write RPCs are revoked from `anon` (migration 007). |
| **CORS** | Default Vercel same-origin; API is on the same domain as the SPA. |
| **CSP** | Strict `default-src 'self'` with allowlisted `connect-src` (Supabase). No `unsafe-eval`/`wasm-unsafe-eval` needed. |
| **Headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, HSTS with preload. |
| **Input validation** | Every body field is type-checked and bounded. Categories are allowlisted. Picture URLs must be `https://`. |
| **Rate limiting** | Not enabled at the app layer; relies on Vercel's platform limits. Adding Upstash + `@upstash/ratelimit` is the recommended next step. |
| **Daily challenge cache** | `private, max-age=300` (no CDN sharing) so the embedded session token isn't a replay token across users. |

---

## Reliability & observability

- **Timeouts** — every Supabase call in the API is wrapped in `withTimeout(p, 5000)`. A hung DB returns `504 upstream_timeout` instead of the 10s function ceiling.
- **Idempotent answer writes** — `match_answers` has a unique key on `(match_id, auth0_sub, question_idx)`; the API upserts with `onConflict` so retries replace, not duplicate.
- **Conditional state transitions** — `control()` updates `matches` only if `(status, current_index)` haven't changed since the read, returning `409 stale_state` on concurrent host clicks.
- **Stale-match auto-finish** — `state()` flips `running → finished` if `last_heartbeat_at` is more than 5 minutes old.
- **Structured logs** — `console.log(JSON.stringify({ ts, route, ...event }))` from every handler so Vercel's log explorer is queryable.
- **Realtime → polling fallback** — `Play.tsx` polls every 4 s if Realtime hasn't pushed an update.
- **Client `apiFetch`** has a 15s overall timeout, AbortController support, and structured `ApiError` exceptions consumed by `friendlyError()`.
- **`ErrorBoundary`** wraps the app shell; unhandled component errors render a polite recovery screen instead of a blank page.
- **`/api/health`** for uptime monitors — returns 200 with `{ ok, supabase: 'ok'|'down'|'unconfigured', ts }`.

Gaps to be aware of (intentional, not currently wired):
- No third-party error aggregation (Sentry). All errors are visible only in Vercel logs.
- No rate limiting.
- No client-side retry/backoff (`apiFetch` fails once and surfaces to the user).

---

## Performance notes

Build output snapshot (gzip):

| Chunk | Gzip | Notes |
|---|---|---|
| `index.js` | ~6 KB | App shell |
| `react` | ~0.1 KB | (re-exports only; React itself in vendor) |
| `mui` | ~86 KB | MUI core + emotion |
| `router` | ~56 KB | React Router v7 |
| `auth0` | ~7 KB | Auth0 SDK |
| `prism` | ~229 KB | **Lazy** — only loads when a code-fenced question renders |

Other optimizations in place:
- **Route-level code splitting** via `React.lazy` for every page (Quiz, Profile, Leaderboard, Play).
- **Per-vendor `manualChunks`** in `vite.config.ts`.
- **Post-quiz stat writes parallelised** with `Promise.allSettled`.
- **O(1) question lookup** in `/api/quiz/submit` via a precomputed `Map`.
- **Concurrent Supabase reads** in `/api/play/state` (`Promise.all` for participants + scoreboard).

Open follow-ups (not yet done):
- Replace `react-syntax-highlighter` (228 KB gzip lazy) with `shiki` or `prism-react-renderer` (~10–30 KB).
- Move the Google Fonts CSS `preload as="style"` to a direct `preload as="font"` for the LCP weight.

---

## Accessibility

- **Skip-to-content** link as the first focusable element.
- `<main>` focused on every route change so screen reader users hear the new page.
- All icon-only buttons have `aria-label`s.
- Toggle groups (game mode, language picker, leaderboard period, etc.) have `aria-label` and per-button labels.
- Quiz options use real `<RadioGroup>` / `<Radio>` semantics with `aria-labelledby` pointing to the question.
- Difficulty and question-count pickers use `aria-pressed` buttons (not invalid `<button role="radio">`).
- `ReportDialog` has a proper `<FormControl>` + `<FormLabel>` for the radio group and a labeled textarea (not placeholder-only).
- Loading spinners use `role="status"` + visually-hidden text.
- Color contrast verified against AA at all default font sizes (some category-chip combinations require special handling — see `DARK_TEXT_CATEGORIES` in `MuiTheme.ts`).
- `prefers-reduced-motion` is respected by MUI transitions.

---

## Deployment

The repo is a Vercel project out of the box.

1. Connect the GitHub repo to Vercel.
2. Set every variable from the [Environment variables](#environment-variables) table in **Project Settings → Environment Variables** for the `production` (and `preview`) environments.
3. Push to `main` — Vercel runs the build defined in `vercel.json`: `cd client && npm install && npm run build`, output `client/dist`.
4. `api/*.ts` files are auto-detected as serverless functions with `maxDuration: 10`.
5. Apply the SQL migrations in Supabase (see [Database setup](#database-setup)).
6. Verify `/api/health` returns 200 and `{ supabase: 'ok' }`.

---

## Roadmap / known gaps

These are flagged in the codebase from a production-readiness audit and are not currently wired:

- **Rate limiting** — needs Upstash KV or Vercel Edge Middleware.
- **Error aggregation** — drop in Sentry for the client and a structured logger that ships to Logtail/Datadog for the API.
- **Lighter syntax highlighter** — swap `react-syntax-highlighter` for `shiki` or `prism-react-renderer` to save ~200 KB gzip lazy.
- **Strip explanations from live match payload** — `matches.questions` JSONB includes explanations, which inflates `state` polling egress. Strip them until the match is finished.

---

## License

Not currently licensed for redistribution. All quiz content is hand-curated; please do not scrape `lib/quiz-data.ts`.

---

## Acknowledgements

- The **800-question dataset** was curated and double-audited by a multi-agent review pipeline; every `correctAnswer` was independently re-verified.
- UI components are built on **Material UI** with a custom green-on-paper brand theme.
- Live match infrastructure rides on **Supabase Realtime**.
