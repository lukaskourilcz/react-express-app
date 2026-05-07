# AGENTS.md

> Orientation for any AI agent (or human) picking up this repo cold.
> If you have time to read one file, read this one. Deep-dives in `docs/`.

---

## What this is

**DevQuiz** — a web-development quiz app. 500+ multiple-choice questions across
HTML, CSS, JS, TS, React, Node.js, Git, and meta categories. Three clients,
one backend.

| Surface | Where | Status |
| --- | --- | --- |
| Web app (React + Vite + MUI) | `client/` | Production |
| Vercel serverless API | `api/` | Production |
| Supabase (Postgres + Realtime) | `supabase-schema*.sql` | Production |
| Mobile app (Flutter, iOS + Android + web) | `mobile/` | Source-only — `flutter create` to scaffold native projects |

There is **no** React Native. The mobile target is Flutter; see
`docs/frontend-mobile.md` for the rationale.

---

## Tech stack at a glance

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  client/  React │   │  mobile/ Flutter│   │  Auth0 (SaaS)   │
│  18 + Vite + MUI│   │  3.19+          │   │                 │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         │  HTTPS (apiFetch)   │  HTTPS (http pkg)   │  OAuth
         ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│  api/  Vercel serverless functions (TypeScript, Node)        │
│  Dynamic routes:  api/play/[action].ts, api/user/[op].ts     │
│  7 functions total - Hobby plan cap is 12                    │
└──────────────────────────┬───────────────────────────────────┘
                           │  supabase-js
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase: Postgres + RLS + RPCs + Realtime broadcast        │
│  Schema: supabase-schema.sql + migrations 002-006            │
└──────────────────────────────────────────────────────────────┘
```

---

## Repo layout

```
react-express-app/
├── AGENTS.md                  ← you are here
├── README.md                  ← quickstart for humans
├── docs/                      ← deep-dives by topic
│   ├── architecture.md
│   ├── api.md
│   ├── schema.md
│   ├── frontend-web.md
│   ├── frontend-mobile.md
│   ├── auth.md
│   └── operations.md
│
├── client/                    ← React web app
│   ├── src/
│   │   ├── App.tsx            ← routing + chrome
│   │   ├── main.tsx           ← root, ErrorBoundary, Auth0Provider
│   │   ├── theme/             ← MuiTheme.ts, ColorModeContext.tsx
│   │   ├── components/        ← Quiz, Profile, Leaderboard, Play, CodeSandbox, …
│   │   └── lib/               ← api, supabase, achievements, bookmarks, settings, play
│   ├── vite.config.ts         ← manualChunks for React/MUI/Auth0/Supabase
│   └── package.json
│
├── api/                       ← Vercel serverless functions
│   ├── leaderboard.ts
│   ├── quiz/
│   │   ├── daily.ts           ← /api/quiz/daily   (deterministic per UTC date)
│   │   ├── questions.ts       ← /api/quiz/questions
│   │   ├── report.ts          ← /api/quiz/report
│   │   └── submit.ts          ← /api/quiz/submit
│   ├── play/
│   │   └── [action].ts        ← /api/play/{create,join,state,control,answer,distribution,heartbeat}
│   └── user/
│       └── [op].ts            ← /api/user/{stats,category-stats}
│
├── lib/                       ← Shared modules NOT deployed as functions
│   ├── quiz-data.ts           ← question bank (~6.4k lines) + HMAC session
│   └── play-helpers.ts        ← supabase client + match code generation
│
├── mobile/                    ← Flutter app (iOS + Android + web)
│   ├── pubspec.yaml
│   ├── lib/                   ← Dart sources (mirrors web feature set)
│   ├── assets/sandbox_runner.html
│   └── ios/Runner/Info.plist.template
│
├── supabase-schema.sql        ← Migration 001 (initial)
├── supabase-schema-002.sql    ← RLS lockdown + atomic counter RPC
├── supabase-schema-003.sql    ← Question reports + daily attempts
├── supabase-schema-004.sql    ← Matches + leaderboard RPCs
├── supabase-schema-005.sql    ← Per-category stats + speed bonus + histograms
├── supabase-schema-006.sql    ← Heartbeat column + tunable category leaderboard
│
├── vercel.json                ← Function maxDuration, security headers, CSP
└── .claude/
    ├── agents/                ← Specialised reviewer agents (UX, a11y, perf, …)
    └── skills/                ← Orchestrators (full-app-audit, plan-feature, …)
```

---

## Critical files (where to look first)

| Want to … | Read |
| --- | --- |
| Understand routes & nav | `client/src/App.tsx` |
| See how the quiz state machine works | `client/src/components/Quiz.tsx` |
| Add a new API endpoint | `api/quiz/submit.ts` (cleanest example) |
| Understand match dispatch | `api/play/[action].ts` (one file, 7 sub-actions) |
| Add a Supabase table | Pattern in `supabase-schema-004.sql` |
| Trace a DB query | Search for `supabase.from(` in `api/` |
| See the auth seam | `client/src/main.tsx` (Auth0Provider) + `api/user/[op].ts` (TODO) |
| Find feature flags | None — features are unconditional. Use env vars instead. |

---

## Conventions worth knowing

### TypeScript / API
- **Structured errors**: every handler returns `{ error: { code, message } }` for non-2xx, `data` for 2xx.
- **Validation**: defensive — never `as zod`, just hand-rolled type guards (see `isShortString` in `lib/play-helpers.ts`).
- **Logging**: single-line JSON via `console.log(JSON.stringify({ ts, route, ...event }))`.
- **No service role key in any function** — only the anon key. Compensating controls live in RLS policies.
- **Never trust client-supplied counters / scores** — server recomputes from the HMAC-signed session.

### React (web)
- **MUI `sx` props** for styling. No CSS-in-JS libs beyond emotion/MUI. CSS files exist only for `Quiz.css`.
- **Brand color**: `BRAND.green = '#2D7A2D'` (NOT `#339933`, which fails WCAG AA on white).
- **State**: `useState`. No Redux, no Zustand. Cross-component state goes through small lib modules with `addListener`/`removeListener` (see `lib/bookmarks.ts`).
- **Lazy-load every route**: `React.lazy(() => import('./components/X'))` in `App.tsx`.
- **`apiFetch`** (lib/api.ts) — never raw `fetch`. Built-in 15s timeout, structured errors, friendly user-facing messages.

### Flutter (mobile)
- **Mirror the web feature set**, not the React component tree. Dart idioms, not TSX-flavoured Dart.
- **Brand**: `BrandColors.green` in `mobile/lib/theme.dart`.
- **HTTP**: `package:http`, wrapped in `mobile/lib/api/client.dart`.
- **State**: plain `setState` + `ChangeNotifier` for cross-screen state (auth, bookmarks).
- **Build flags via `--dart-define`** for backend URL, Auth0, Supabase keys (see `mobile/README.md`).

### Database / SQL
- **RLS on every table**. The pattern is `auth0_id = auth.jwt() ->> 'sub'`.
- **Atomic counters via RPC** (`record_quiz_result`, `record_category_stats`). Never read-modify-write from the client or API layer.
- **Migrations are append-only** — `002_*.sql`, `003_*.sql`, etc. Never edit a previous migration.

### Commit messages
- Short imperative title.
- Bullet body grouping changes.
- `https://claude.ai/code/session_…` trailer if generated by Claude.
- Never amend, never force-push (unless explicitly asked).

---

## Schema migrations — apply in order

| File | What | Idempotent? |
| --- | --- | --- |
| `supabase-schema.sql` | initial `user_stats` table + open RLS | ❌ (run once) |
| `supabase-schema-002.sql` | tighten RLS, atomic `record_quiz_result` RPC, indexes, `updated_at` trigger | ⚠️ drops 001's policies |
| `supabase-schema-003.sql` | `question_reports`, `daily_attempts` tables | ✅ |
| `supabase-schema-004.sql` | `matches`, `match_participants`, `match_answers`, leaderboard RPCs | ✅ |
| `supabase-schema-005.sql` | `user_category_stats`, speed_bonus column, histogram RPC | ✅ |
| `supabase-schema-006.sql` | `last_heartbeat_at` column, tunable `category_leaderboard` | ✅ |

API code degrades gracefully when an RPC is missing (returns `503 rpc_missing`), but **column-missing errors are not caught** — always apply migrations in order before deploying API changes that depend on them.

---

## External services

| Service | Purpose | What's required |
| --- | --- | --- |
| **Vercel** | Hosting (web build + serverless API) | `SESSION_SECRET` env var, project linked to repo |
| **Supabase** | Postgres, RLS, Realtime broadcast | URL + anon key as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Realtime must be enabled in project settings |
| **Auth0** | Sign-in (SPA + native via mobile) | `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, optional `VITE_AUTH0_AUDIENCE` |
| **Sentry** | Error tracking | Not wired yet — `VITE_SENTRY_DSN` is the planned name |

The web client + Flutter both run in **degraded mode** without these. Auth0 missing → guest mode. Supabase missing → no stats, no leaderboard, no multiplayer realtime (polling only).

---

## Known limits / TODOs

- **Auth0 JWT verification on the server is a TODO** (`api/user/[op].ts` has the comment).
  Today the API trusts `auth0_id` from the request body. Mitigation: tightened RLS policies once
  Supabase third-party auth is configured (migration 002 already includes the policies).
- **No Sentry / error tracking**. Boilerplate documented in `docs/operations.md`.
- **Speed-bonus ping correction** allows up to 1s grace via `client_received_at`. Cheating is bounded but not eliminated.
- **No host-abandonment recovery beyond auto-finish** at 5min via lazy cleanup in `/api/play/state`.
- **Sandbox is iframe-isolated, not cross-origin-isolated**. WASM is sandboxed by being WASM but shares parent origin.

Each is documented further in `docs/operations.md`.

---

## How to add a feature (the well-trodden path)

1. **Schema**: append a new `supabase-schema-NNN.sql`. Include RLS, indexes, RPCs.
2. **API**: add a handler under `api/`. Keep total functions ≤ 12 (Hobby cap). For multi-action features, use a dynamic route (`[action].ts` style).
3. **Types**: shared types live in the consumer (`client/src/types/quiz.ts`, `mobile/lib/models/`). No shared package — TypeScript and Dart types are separate by design.
4. **Web client**: add to `lib/api.ts` if shared, then a component or screen. Lazy-load it in `App.tsx`.
5. **Mobile**: mirror in `mobile/lib/api/` + `mobile/lib/screens/`.
6. **Test**: `cd client && npm run build`. There's no automated test suite (TODO).
7. **Document**: update the relevant doc in `docs/`.

If the feature is large (multiplayer-scale), use the `quiz-feature-architect` subagent in `.claude/agents/quiz-feature-architect.md` first.

---

## Subagents and skills available

In `.claude/agents/`:
- `ux-reviewer`, `accessibility-auditor`, `performance-optimizer`,
  `scalability-auditor`, `security-auditor`, `reliability-auditor`,
  `quiz-feature-architect`

In `.claude/skills/`:
- `full-app-audit` — fans out all six auditors, dedupes and re-ranks
- `security-reliability-sweep` — focused two-lens prod-readiness check
- `ux-sweep` — focused three-lens user-facing polish pass
- `plan-feature` — feature planning via the architect agent

These are project-local; invoke them via the Agent or Skill tool as appropriate.

---

## Documentation index

| Doc | What it covers |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Request/data flow, deployment topology, sequence diagrams |
| [docs/api.md](docs/api.md) | Every endpoint, request/response shapes, error codes |
| [docs/schema.md](docs/schema.md) | Every table, RLS policy, RPC, index, migration order |
| [docs/frontend-web.md](docs/frontend-web.md) | React app: routing, components, state, theme, perf |
| [docs/frontend-mobile.md](docs/frontend-mobile.md) | Flutter app: structure, screens, responsive design, native config |
| [docs/auth.md](docs/auth.md) | Auth0 flow, JWT verification TODO, guest mode, RLS |
| [docs/operations.md](docs/operations.md) | Deploy, migrate, monitor, roll back, common errors |
