# API reference

All endpoints live under `/api/*` and are deployed as Vercel serverless
functions. Total: **7 functions** (Hobby plan cap is 12).

## Conventions

- Content type: `application/json` request and response.
- Errors: `4xx` / `5xx` return `{ "error": { "code": string, "message": string } }`.
- Auth: most endpoints accept `auth0_id` in body or query. **JWT verification
  is a TODO** — the API currently trusts the supplied identifier. RLS provides
  the compensating control once Supabase third-party auth is configured.
- Logging: each handler emits one JSON log line per request via `console.log`.
- Caching: read-only static-shaped endpoints set `Cache-Control` headers
  (`s-maxage`, `stale-while-revalidate`).

---

## `GET /api/quiz/questions`

Fetches a quiz session.

**Query params**:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `count` | int | 10 | Clamped 1-50 |
| `difficulty` | enum | `zero-to-hero` | `basics` / `easy` / `zero-to-hero` / `advanced` / `mixed` |
| `categories` | string | (all) | Comma-separated category values |

**Response 200**:
```json
{
  "sessionId": "<base64url>.<base64url>",
  "questions": [
    { "id", "tags", "introduction", "question",
      "options": [string], "category", "difficulty" }
  ]
}
```

The `sessionId` is an HMAC-SHA256 signed token containing the per-question
correct-answer indices, scoped to a 1-hour TTL. The client sends it back to
`/api/quiz/submit` for grading.

**Errors**: `400 bad_request` (invalid difficulty / categories), `404 no_questions` (filters too narrow), `405`.

---

## `POST /api/quiz/submit`

Grades a quiz session.

**Request body**:
```json
{ "sessionId": "<token from /api/quiz/questions>",
  "answers": { "<questionId>": <selectedIndex>, ... } }
```

**Response 200**:
```json
{
  "totalQuestions": 10,
  "correctAnswers": 7,
  "percentage": 70,
  "results": [
    { "questionId", "selectedIndex", "correctAnswer",
      "isCorrect", "explanation" }
  ]
}
```

Server recomputes correctness from the HMAC-signed session — clients cannot
fabricate scores by editing the request body.

**Errors**: `400 invalid_session` (expired or tampered token), `400 bad_request`, `413 too_many_answers` (>50), `405`.

---

## `GET /api/quiz/daily`

Today's challenge — 5 deterministically-selected questions per UTC date.

**Query params**:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `date` | YYYY-MM-DD | today UTC | For testing past dates |

**Response 200**:
```json
{ "date": "2026-05-07", "sessionId": "...", "questions": [...] }
```

Cacheable: `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.

---

## `POST /api/quiz/report`

Reports a question for review.

**Request body**:
```json
{
  "question_id": "<id>",
  "reason": "incorrect-answer | unclear | typo | outdated | duplicate | other",
  "detail": "optional, ≤1000 chars",
  "reporter_sub": "optional auth0 sub"
}
```

**Response 200**: `{ "ok": true }`

Inserts into `question_reports`. Only the project owner (service role) can
SELECT — there's no admin UI yet.

---

## `GET /api/user/stats`

Get a user's stats.

**Query params**: `auth0_id` (required, ≤256 chars).

**Response 200**:
```json
{ "data": { /* UserStats */ } | null }
```

`null` means no row yet (first-time user). Schema in `docs/schema.md`.

---

## `POST /api/user/stats`

Two modes depending on body shape.

### Mode A: profile upsert
```json
{ "auth0_id": "...", "email": "...", "name": "...", "picture": "..." }
```

Atomic upsert via `ON CONFLICT (auth0_id)`. Returns the row.

### Mode B: quiz result
```json
{ "auth0_id": "...", "quiz_result": { "correct": 7, "total": 10 } }
```

Calls the `record_quiz_result` RPC which atomically increments counters and
recomputes streaks server-side (timezone-correct UTC date math).

**Errors**: `400 bad_request`, `503 not_configured`, `503 rpc_missing` if migration 002 not applied (degrades with `data: null`, `warning: rpc_missing`).

---

## `GET /api/user/cards` and `POST /api/user/cards`

Memory-card deck sync (under `api/user/[op].ts` with `op=cards`).

### GET
**Query**: `auth0_id` (required).
**Response 200**: `{ data: ServerCard[] }` where each row mirrors `user_cards`
columns. Returns `{ data: [], warning: "table_missing" }` if migration 007
hasn't been applied yet (graceful degradation — the local-only deck still
works).

### POST
**Body**:
```json
{
  "auth0_id": "...",
  "cards": [{
    "question_id", "question", "options", "correct_index",
    "explanation", "category", "added_at",
    "right_streak", "wrong_count",
    "due_at", "last_reviewed_at", "updated_at"
  }, …]
}
```
Atomic full-deck replacement via `replace_user_cards` RPC. Cap: 1000 cards.
Returns `{ ok: true, count }` or `{ ok: true, warning: "rpc_missing" }` if
migration 007 isn't applied.

The client treats local storage as the source of truth and pushes the full
deck on a 1.5s debounce after every mutation. Conflict resolution is
last-write-wins on `updated_at`.

## `POST /api/user/category-stats`

Records per-category breakdown after a quiz. Used to power category leaderboards.

**Request body**:
```json
{
  "auth0_id": "...",
  "by_category": {
    "javascript": { "correct": 3, "total": 5 },
    "react":      { "correct": 2, "total": 5 }
  }
}
```

Calls `record_category_stats` RPC. Defensive validation drops invalid categories silently rather than failing the whole request.

---

## `GET /api/leaderboard`

Three modes via `period` query param.

### `period=global`
Lifetime leaderboard via `global_leaderboard` RPC.
```json
{ "period": "global", "entries": [
  { "display_name", "picture", "total_correct",
    "total_quizzes", "longest_streak", "current_streak" }
]}
```
Cache: `s-maxage=60, stale-while-revalidate=300`.

### `period=daily&date=YYYY-MM-DD`
Per-day leaderboard via `daily_leaderboard` RPC.
```json
{ "period": "daily", "date": "...", "entries": [
  { "display_name", "picture", "correct", "total",
    "duration_ms", "attempted_at" }
]}
```

### `period=category&category=<value>&min_attempts=<int>`
Category-scoped leaderboard via `category_leaderboard` RPC.
```json
{ "period": "category", "category": "javascript", "min_attempts": 5,
  "entries": [
    { "display_name", "picture", "total_correct",
      "total_questions", "accuracy_pct" }
]}
```

`min_attempts` defaults to 5, capped at 100.

**Errors**: `400 bad_request`, `503 rpc_missing` if migration 005 not applied.

---

## `POST /api/play/[action]` and `GET /api/play/[action]`

Single dispatcher file `api/play/[action].ts` covers all multiplayer actions
via Vercel dynamic route. The `[action]` segment becomes `req.query.action`.

### `action=create` (POST)
**Body**: `{ host_sub, host_name, mode: "multiplayer"|"classroom", count: int, categories: string[] }`
**Returns**: `{ id, code, mode, host_sub, host_name, status }` — `code` is a 6-char Crockford-base32 string.

### `action=join` (POST)
**Body**: `{ code, auth0_sub, display_name }`
**Returns**: full match state (with `correct_index` stripped from questions for non-host).

### `action=state` (GET)
**Query**: `code`, optional `auth0_sub`.
**Returns**:
```json
{ "match": Match,
  "participants": [Participant],
  "scoreboard": [{ "auth0_sub","display_name","correct","score","total_ms" }] }
```
**Side effect**: lazily auto-finishes ghost matches (no host heartbeat for >5 min).

### `action=control` (POST, host-only)
**Body**: `{ code, host_sub, action: "start"|"advance"|"finish" }`

### `action=answer` (POST)
**Body**: `{ code, auth0_sub, question_idx, selected_idx, duration_ms, client_received_at? }`
**Returns**: `{ ok: true, is_correct, speed_bonus }`
- Server uses `question_started_at` as the authoritative timer.
- `client_received_at` allows a bounded ping-correction grace (≤1s).

### `action=distribution` (GET, host-only)
**Query**: `code`, `q` (question index), `auth0_sub` (must match host).
**Returns**: `{ buckets: [{ selected_idx, count, correct }] }`. Used by the classroom histogram.

### `action=heartbeat` (POST, host-only)
**Body**: `{ code, host_sub }` — sets `last_heartbeat_at = NOW()`.

---

## Response cache map

| Endpoint | `Cache-Control` |
| --- | --- |
| `/api/quiz/questions` | `private, no-store` (per-request shuffle) |
| `/api/quiz/submit` | (no header) |
| `/api/quiz/daily` | `public, s-maxage=300, stale-while-revalidate=86400` |
| `/api/quiz/report` | (no header) |
| `/api/user/[op]` | (no header) |
| `/api/leaderboard` | `public, s-maxage=60, stale-while-revalidate=300` |
| `/api/play/[action]` | `no-store` (state changes constantly) |

---

## Adding a new endpoint

1. Decide whether it fits an existing dispatcher (`api/play/[action].ts` or `api/user/[op].ts`). Adding a sub-action there costs zero functions.
2. If it doesn't fit, add a top-level file in `api/` — but check the function count first (`find api -name "*.ts" | wc -l` should stay ≤ 11 leaving room).
3. Mirror the conventions: structured errors via `jsonError`, JSON log line, defensive validation.
4. Update `docs/api.md` (this file).
