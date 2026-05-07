# Database schema

All tables live in the public schema of a Supabase Postgres instance.
Migrations are append-only SQL files at the repo root, applied in order
in the Supabase SQL editor.

## Migration order

| File | Purpose |
| --- | --- |
| `supabase-schema.sql` | Initial: `user_stats` table + open RLS |
| `supabase-schema-002.sql` | RLS lockdown by `auth0_id`, atomic `record_quiz_result` RPC, indexes, `updated_at` trigger |
| `supabase-schema-003.sql` | `question_reports`, `daily_attempts` |
| `supabase-schema-004.sql` | `matches`, `match_participants`, `match_answers`, leaderboard RPCs |
| `supabase-schema-005.sql` | `user_category_stats`, `match_question_distribution` RPC, `speed_bonus` column, `question_started_at` |
| `supabase-schema-006.sql` | `last_heartbeat_at` column, `category_leaderboard(min_attempts)` |

Apply by pasting each file into the SQL editor and running it. Order matters
(later migrations reference earlier objects).

---

## Tables

### `user_stats` (migration 001)

Single source of truth for a user's lifetime stats.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | `gen_random_uuid()` |
| `auth0_id` | TEXT UNIQUE NOT NULL | Auth0 `sub`, also used as guest-mode pseudo-id (`local|...`) |
| `email`, `name`, `picture` | TEXT | From Auth0 user profile |
| `total_quizzes` | INT | Increments by 1 per submitted quiz |
| `total_correct` | INT | Sum of correct answers across all quizzes |
| `total_questions` | INT | Sum of question counts |
| `current_streak` | INT | Reset to 1 on a non-consecutive day |
| `longest_streak` | INT | `GREATEST(longest, current)` |
| `last_quiz_date` | DATE | UTC date of last submission |
| `created_at`, `updated_at` | TIMESTAMP | `NOW()` defaults; `updated_at` auto-touched by trigger (002) |

Index: `idx_user_stats_auth0_id (auth0_id)`. Plus 002 adds:
- `idx_user_stats_last_quiz_date (last_quiz_date)`
- `idx_user_stats_total_correct (total_correct DESC) WHERE total_quizzes > 0`

### `user_category_stats` (migration 005)

Per-category lifetime breakdown for category leaderboards.

| Column | Type |
| --- | --- |
| `auth0_id` | TEXT |
| `category` | TEXT |
| `total_correct` | INT |
| `total_questions` | INT |
| `updated_at` | TIMESTAMPTZ |

PK: `(auth0_id, category)`.
Index: `idx_user_category_stats_category_correct (category, total_correct DESC) WHERE total_questions > 0`.

### `question_reports` (migration 003)

User-submitted reports about question quality.

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `question_id` | TEXT NOT NULL |
| `reason` | TEXT NOT NULL (one of `incorrect-answer`/`unclear`/`typo`/`outdated`/`duplicate`/`other`) |
| `detail` | TEXT (≤1000 chars enforced at API layer) |
| `reporter_sub` | TEXT (auth0 sub of reporter, optional) |
| `created_at` | TIMESTAMPTZ |

Indexes: `(question_id)`, `(created_at DESC)`.

RLS: anyone authenticated can `INSERT`. No `SELECT` policy by design — only the project-owner service role can read (use the Supabase dashboard or a future admin tool).

### `daily_attempts` (migration 003)

Per-user daily-challenge result. Currently inserted by no endpoint; placeholder for a future feature where the daily challenge tracks who attempted it for a per-day leaderboard.

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `auth0_id` | TEXT |
| `challenge_date` | DATE |
| `correct`, `total` | INT |
| `duration_ms` | INT |
| `created_at` | TIMESTAMPTZ |

Unique: `(auth0_id, challenge_date)` — one attempt per user per day.
Index: `(challenge_date, correct DESC, duration_ms ASC)` for fast leaderboard.

### `matches` (migration 004 + 005 + 006)

Live multiplayer / classroom session.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID PK | |
| `code` | TEXT UNIQUE NOT NULL | 6-char Crockford-base32 (no I/L/O/U) |
| `mode` | TEXT NOT NULL | `multiplayer` or `classroom` |
| `host_sub` | TEXT NOT NULL | Auth0 sub of the host |
| `host_name` | TEXT | Display name |
| `status` | TEXT | `lobby` / `running` / `finished` |
| `questions` | JSONB | Array of `{ id, question, options, correct_index, explanation, category, difficulty }` |
| `current_index` | INT | Index into `questions[]` |
| `started_at`, `ended_at` | TIMESTAMPTZ | Set on `start` / `finish` actions |
| `question_started_at` | TIMESTAMPTZ | Set on each `start` and `advance`. Used for authoritative speed-bonus calculation. (migration 005) |
| `question_duration_s` | INT | Default 30. (migration 005) |
| `last_heartbeat_at` | TIMESTAMPTZ | Updated by `/api/play/heartbeat` and on `control`. Used for ghost-match cleanup. (migration 006) |
| `created_at` | TIMESTAMPTZ | |

Indexes: `(code)`, `(host_sub, created_at DESC)`, `(status, last_heartbeat_at) WHERE status='running'`.

### `match_participants` (migration 004)

Who's in each match.

| Column | Type |
| --- | --- |
| `match_id` | UUID FK → matches |
| `auth0_sub` | TEXT |
| `display_name` | TEXT |
| `joined_at` | TIMESTAMPTZ |

PK: `(match_id, auth0_sub)`. Cascading delete from `matches`.

### `match_answers` (migration 004 + 005)

Per-player per-question answer.

| Column | Type | Notes |
| --- | --- | --- |
| `match_id` | UUID | |
| `auth0_sub` | TEXT | |
| `question_id` | TEXT | |
| `question_idx` | INT | Index in `match.questions[]` |
| `selected_idx` | INT | |
| `is_correct` | BOOLEAN | |
| `duration_ms` | INT | Authoritative server-computed |
| `speed_bonus` | INT | 0-50, decays linearly across the question window. (migration 005) |
| `answered_at` | TIMESTAMPTZ | |

PK: `(match_id, auth0_sub, question_idx)`. Index: `(match_id, auth0_sub, is_correct)` for scoreboard rollup.

---

## Row-Level Security

Migration 002 changed all `user_stats` policies from `USING (true)` to per-user
filters. The pattern, used everywhere except where the data is shared by design:

```sql
CREATE POLICY "stats_select_own"
  ON user_stats FOR SELECT
  USING (auth0_id = auth.jwt() ->> 'sub');
```

> **Note**: this policy assumes the JWT carries an Auth0 `sub` claim. That
> requires Supabase to be configured with Auth0 as a third-party JWT provider
> (Project Settings → Auth → Third-party Auth). Until then, all reads/writes
> go through the API layer with the anon key, which bypasses RLS only at the
> service-role boundary (we don't use the service role from API code).

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `user_stats` | own | own | own | (none) |
| `user_category_stats` | own | own | own | (none) |
| `question_reports` | (none) | any auth'd | (none) | (none) |
| `daily_attempts` | own | own | (none) | (none) |
| `matches` | any auth'd (read by code) | self-host | self-host | (none) |
| `match_participants` | any auth'd | self-insert | (none) | cascade |
| `match_answers` | own | self-insert | (none) | cascade |

---

## RPCs (server-side functions)

All `SECURITY DEFINER` and granted to `authenticated`/`anon`.

### `record_quiz_result(auth0_id, correct, total)` → `user_stats`
**Migration 002.** Atomically updates `user_stats` (increments counters, recomputes streak using UTC date math, returns the new row). Replaces a previous read-modify-write pattern that was racy.

### `record_category_stats(auth0_id, breakdown jsonb)` → `void`
**Migration 005.** Atomic upsert into `user_category_stats` for each `{category: {correct, total}}` entry. Validates ranges per-entry — invalid entries are dropped, valid ones still applied.

### `match_scoreboard(match_id)` → table
**Migration 004 (replaced 005).** Aggregates `match_answers` joined to `match_participants`, returns `{auth0_sub, display_name, correct, score, total_ms}` ordered by score DESC, total_ms ASC.

### `match_question_distribution(match_id, question_idx)` → table
**Migration 005.** Returns per-option counts for one question of a match. Used by the classroom histogram.

### `global_leaderboard(limit)` → table
**Migration 004.** Top `limit` users by `total_correct DESC, longest_streak DESC` from `user_stats` where `total_quizzes > 0`. Cap 200.

### `daily_leaderboard(date, limit)` → table
**Migration 004.** Joins `daily_attempts` with `user_stats` for a given UTC date, ordered by `correct DESC, duration_ms ASC`.

### `replace_user_cards(auth0_id, cards jsonb)` → void
**Migration 007.** Atomically replaces the user's deck. Validates per-element
shape and length limits inside the function; bad rows are dropped, good rows
inserted. Capped at 1000 cards per call. Used by the mobile + web sync layers
which push the full local deck on a debounced timer.

### `category_leaderboard(category, limit, min_attempts)` → table
**Migration 005, replaced in 006.** Top users in a single category. `min_attempts` defaults to 5 (capped at 100). Joins `user_category_stats` with `user_stats` for display name + picture.

---

## Adding a migration

1. Pick the next number: `supabase-schema-NNN.sql`.
2. **Never edit a previous file**. Migrations are immutable history.
3. Use `IF NOT EXISTS` / `OR REPLACE` where possible so reapplication is safe.
4. If you change an RPC signature, `DROP FUNCTION old_name(args);` first then `CREATE OR REPLACE`. Don't rely on PostgreSQL's overloading — the API code calls by exact signature.
5. Add to the table at the top of this doc and the Migration order table in `AGENTS.md`.
6. Update any API code that gracefully degrades on `rpc_missing` to remove the fallback once the migration is widely applied.

## Local development

There's no automated migration runner. The Supabase CLI exists (`supabase db push`), but we haven't set it up. For now: paste each `.sql` file into the SQL editor on the Supabase dashboard.

## Observability

- Slow query log: enabled on Supabase by default. Check the dashboard's Database → Query Performance tab.
- Real-time monitor: Database → Reports.
- For the API side, every handler emits one JSON log line per request. Find them in Vercel's function logs.
