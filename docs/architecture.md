# Architecture

## High-level diagram

```
                         ┌──────────────────┐
                         │  CDN: cloudflare │
                         │  (Vercel edge)   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              │                                       │
   ┌──────────▼──────────┐               ┌────────────▼────────────┐
   │  client/dist/*      │               │  api/**/*.ts            │
   │  React SPA + assets │               │  Vercel Node lambdas    │
   │  (gzip ~143 KB)     │               │  (7 functions, max 10s) │
   └──────────┬──────────┘               └────────────┬────────────┘
              │ /api/*                                │
              └───────────────┬───────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │  Supabase project            │
              │  ├── Postgres (with RLS)     │
              │  ├── Realtime (websocket)    │
              │  └── Auth (third-party JWT)  │
              └──────────────────────────────┘
                              ▲
                              │
                  ┌───────────┴───────────┐
                  │  Auth0 tenant (SaaS)  │
                  │  ├── SPA app          │
                  │  └── Native app (iOS) │
                  └───────────────────────┘

Optional client:
   ┌──────────────────────┐
   │  mobile/  Flutter    │  ─── HTTPS ──→ /api/*
   │  iOS / Android / web │
   └──────────────────────┘
```

## Request flow: take a quiz

```
[Client]                          [Vercel /api/quiz/questions]                          [Supabase]
   │                                          │                                              │
   │ GET /api/quiz/questions?count=10&…       │                                              │
   ├─────────────────────────────────────────►│                                              │
   │                                          │ (no DB call - pure question bank +           │
   │                                          │  HMAC-signed session token)                  │
   │ ◄─── { sessionId, questions[] } ─────────┤                                              │
   │                                          │                                              │
   │ POST /api/quiz/submit                    │                                              │
   ├─────────────────────────────────────────►│                                              │
   │   { sessionId, answers }                 │ Verify HMAC, score against session-locked    │
   │                                          │ correct answers                              │
   │ ◄─── { totalQuestions, correctAnswers,   │                                              │
   │        percentage, results[] } ──────────┤                                              │
   │                                          │                                              │
   │ POST /api/user/stats                     │                                              │
   ├─────────────────────────────────────────►│                                              │
   │   { auth0_id, quiz_result: { … } }       │ rpc('record_quiz_result', …)                 │
   │                                          ├─────────────────────────────────────────────►│
   │                                          │                          atomic UPDATE       │
   │                                          │ ◄────────── updated row ─────────────────────┤
   │ ◄─── { data: UserStats } ─────────────────┤                                              │
```

## Request flow: live multiplayer

Two channels in parallel.

**REST** for source-of-truth state (lobby, advance, answer, scoreboard):

```
host        ▶  POST /api/play/create          ◀  match { code: 'ABC123', mode, … }
host        ▶  POST /api/play/control{start}  ◀  ok
participant ▶  POST /api/play/join            ◀  match
participant ▶  POST /api/play/answer          ◀  { is_correct, speed_bonus }
all         ▶  GET  /api/play/state           ◀  { match, participants, scoreboard }
host(30s)   ▶  POST /api/play/heartbeat       ◀  ok
host        ▶  POST /api/play/control{advance}◀  ok
host        ▶  POST /api/play/control{finish} ◀  ok
```

**Realtime broadcast** for low-latency UI nudges (Supabase Realtime):

```
channel:           match:ABC123
events:            participant_joined, match_updated
direction:         all clients ↔ all clients (no server side; Supabase broadcasts as-is)
fallback:          4-second polling on /api/play/state when Supabase Realtime is unavailable
```

The DB is the source of truth; broadcasts are advisory ("something changed, refetch state").

## Data flow: who writes where

| Table | Written by | Read by |
| --- | --- | --- |
| `user_stats` | `record_quiz_result` RPC (called by `api/user/[op].ts` POST `quiz_result`) | `api/user/[op].ts` GET, `global_leaderboard` RPC |
| `user_category_stats` | `record_category_stats` RPC (called by `api/user/[op].ts` POST `category-stats`) | `category_leaderboard` RPC |
| `daily_attempts` | not yet wired (schema exists for future per-day leaderboard) | `daily_leaderboard` RPC |
| `question_reports` | `api/quiz/report.ts` (insert-only RLS) | none yet (admin tool TBD) |
| `matches` | `api/play/[action].ts` (host only via RLS) | all participants (read-only) |
| `match_participants` | `api/play/[action].ts` (self-insert via RLS) | all participants |
| `match_answers` | `api/play/[action].ts` (self-insert via RLS) | `match_scoreboard` and `match_question_distribution` RPCs |

The web client **does not** write to Supabase directly. It used to (early commits), but the writes are now all gated through `api/`. RLS policies are belt-and-suspenders.

## Why this shape

- **Vercel + Supabase** instead of a single Express monolith: the API surface is small, mostly read-mostly, and Supabase handles most of the operational work (backups, realtime, RLS). Two services beats one boring server here.
- **Dynamic routes (`[action].ts`)** instead of one file per endpoint: Vercel Hobby caps at 12 serverless functions. Without consolidation we'd be at 16+.
- **Question bank in `lib/quiz-data.ts`** (~6 K lines, ~380 KB) instead of a `questions` table: it's effectively static, never user-edited, and shipping it as a tree-shaken module beats a per-request DB query for cold-start cost. The trade-off is a heavier deploy artifact.
- **Three clients (web, Flutter, future)** sharing one API: types are duplicated by design. TypeScript types live in `client/src/types/`; Dart types in `mobile/lib/models/`. A shared types package was considered and rejected — language gap is too wide, and the surface area is small enough to dual-maintain.
- **No GraphQL / no tRPC**: REST is enough, Vercel functions don't need a layer, and the surface area is small.

## Deploy topology

| Component | Where | Build trigger |
| --- | --- | --- |
| Web client | Vercel (auto-deploy on push to main) | `cd client && npm install && npm run build` |
| Vercel functions | Vercel (same deploy as web) | inferred per-file in `api/` |
| Supabase migrations | Manual via SQL editor in Supabase dashboard | None — apply in order, never edit historical files |
| Mobile (Flutter) | Manual build on a Mac via `flutter build ipa` / `apk` | One-time `flutter create` to scaffold |

## Failure modes (and what the user sees)

| Failure | User sees | Mitigation |
| --- | --- | --- |
| Supabase down | Profile won't load; quiz still works (questions are static) | Quiz state machine continues; Profile shows error with Retry |
| Auth0 down | Sign-in fails, app continues in guest mode | Web client try/catches `useAuth0()`; Flutter falls back to guest panel |
| Vercel function timeout (>10s) | API call rejects with timeout; client `apiFetch` shows friendly message | `withTimeout` wrapper inside Supabase calls (5s) keeps cold-start budget safe |
| Migration not applied | API endpoint returns 503 with `rpc_missing`; UI shows "Run supabase-schema-NNN.sql" | Each RPC call catches the missing-function error |
| Host disconnects mid-match | After 5 min, match is auto-finished by lazy cleanup in `state` endpoint | `last_heartbeat_at` column + cleanup on next `state` read |

See `docs/operations.md` for response runbook.
