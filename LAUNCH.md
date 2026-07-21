# DevQuiz — Launch Plan

> Historical audit snapshot. The implemented ecosystem release and current
> operator procedure are documented in [`docs/launch-runbook.md`](./docs/launch-runbook.md).
> Do not use the old password, HMAC, or outstanding-work statements below as
> current production configuration.

Status as of 2026-06-20. Web target: Vercel + Supabase.

---

## Executive Summary

DevQuiz is functionally complete and the happy paths work end-to-end. **The web build is clean, all 10 public tables have RLS enabled, the test scripts (`test-leveling`, `validate-roadmap`, `test-roadmap-endpoint`) pass, and no secrets leak to the client bundles.** That's the floor. The gap to production is concentrated in two buckets:

1. **Two critical security holes** — the `/dev` admin panel ships with a literal default password `'react123'` documented in the README, and the daily-quiz session token is replayable for an hour to inflate stats / leaderboard rank.
2. **Missing operational guardrails** — no error tracking, no rate limiting, an always-200 health endpoint, no CI gate, JWT validated by an outbound `auth.getUser` round-trip on every protected request, no per-route error boundaries.

The Supabase database also has one P0 of its own: `supabase-schema-009.sql` (`question_edits` + `app_settings`) is **not applied live** — I confirmed via SQL that both tables are missing — so the `/dev` admin console's persistence layer is broken in prod (writes silently no-op).

### Go / No-Go

- **Web**: **No-Go today.** ~1 day of focused work clears the P0 list (admin password, daily-stat replay, apply migrations 009/010, fix `WITH CHECK (true)` on `question_reports`, upgrade react-router-dom, wire Sentry, fix health endpoint, parallelize sequential awaits, cache CDN assets). Re-evaluate after that pass.

The build itself is healthy (largest gzipped chunk: `prism` 226 KB, deferred). Bundle work is P1, not P0.

---

## Prioritized Findings

Severity legend: **P0** = blocks launch · **P1** = ship-but-fix-soon · **P2** = backlog · **polish** = nice-to-have.

### Web / API — P0

1. **Admin panel ships with default password `'react123'`** — `lib/admin-auth.ts:12` (`const DEV_PASSWORD = process.env.DEV_PASSWORD || 'react123';`) and the README documents the default three times (lines 75, 79, 245). The admin API exposes answer keys and question CRUD. → Require `DEV_PASSWORD` at boot when `VERCEL_ENV === 'production'` (mirror the `SESSION_SECRET` pattern); remove the literal default; strip the value from the README.

2. **Daily-quiz session token is replayable → stat / leaderboard inflation** — `api/quiz/submit.ts` + `api/user/[op].ts:172`. The signed HMAC session token from `/api/quiz/daily` is valid for 1 hour; nothing prevents submitting the same token N times. `record_quiz_result` makes streak idempotent (date-keyed) but **not** `total_quizzes` / `total_correct` / `total_questions` — they increment each call. → Track consumption server-side via a `jti` in the session token (or `daily_attempts.session_id UNIQUE`) and reject second submissions inside the RPC.

3. **`auth.getUser(token)` on every protected request** — `lib/auth.ts:56` calls Supabase Auth over the network to validate every JWT. At any meaningful load this trips Supabase Auth rate limits and adds 50–150 ms per call. → Verify Supabase HS256 JWT signature locally with `jose` (already a dependency); fall back to `getUser` only when claims are missing.

4. **XP write is a non-atomic read-modify-write race** — `api/user/[op].ts:60-67`. Concurrent tabs / phone + web each read the same stale `quest_xp`, compute `Math.max`, and overwrite. → Move to a one-statement RPC: `UPDATE user_xp SET quest_xp = GREATEST(quest_xp, p_incoming) WHERE user_id = p_user_id`.

5. **Sequential awaits on the hot quiz path** — `api/quiz/questions.ts:42` (`getGameSettings`) then `:79` (`getEffectiveQuestions`) are independent but awaited serially. → `await Promise.all([...])`. Saves a full DB round-trip on every cache miss.

6. **`play/answer` chain runs up to 6 sequential DB calls under a 10 s ceiling** — `api/play/[action].ts:409-545` + `vercel.json:7` (`maxDuration: 10`). Classroom matches with 20+ simultaneous answers stack into 504s. → Parallelize the independent calls; replace the 2-player `match_participants` COUNT with a counter stored on the match row; lift `maxDuration` to 25 (Hobby) / 60 (Pro) for the play routes only.

7. **No rate limiting on any endpoint** — `api/quiz/report.ts`, `api/user/[op].ts`, `api/play/[action].ts`, `api/admin/[op].ts`. Anonymous report spam, leaderboard scraping, admin brute-force, match-creation abuse all open. → Vercel Edge Middleware + Upstash sliding-window for mutating routes; minimum: require auth on `quiz/report`.

8. **`question_reports` INSERT policy is `WITH CHECK (true)`** — `supabase-schema-003.sql:20-22`. Anyone with the anon key can `POST /rest/v1/question_reports` and flood the table without going through `/api/quiz/report`. → `REVOKE INSERT ON public.question_reports FROM anon, authenticated` + `DROP POLICY report_insert_any`; service-role server path still works (defense-in-depth, zero UX impact).

9. **react-router-dom 7.13.0 has 5 CVEs** — `client/package.json:18`. RSC RCE (GHSA-49rj-9fvp-4h2h, not exploitable in SPA mode), CSRF (GHSA-84g9-w2xq-vcv6), XSS (GHSA-8646-j5j9-6r82, GHSA-f22v-gfqf-p8f3), open redirect (GHSA-2j2x-hqr9-3h42). → `npm i react-router-dom@^7.15.1` in `client/`.

10. **No error tracking anywhere** — `client/src/main.tsx` and `api/*` have no Sentry / PostHog / equivalent. `client/src/components/ErrorBoundary.tsx:20-21` logs to `console.error`. Production crashes are invisible. → Add `@sentry/react` + `@sentry/node` (or PostHog) and wire `componentDidCatch` + unhandled rejection.

11. **`api/health.ts` always returns HTTP 200 even when Supabase is down** — `api/health.ts:27-32` checks Supabase but the response is always `200 { ok: true }`. Any uptime monitor will report green during a DB outage. → Return 503 with `ok: false` when `supabaseStatus === 'down'`.

12. **Missing `Cache-Control: immutable` on hashed asset paths** — `vercel.json` has no `/assets/(.*)` headers entry. Repeat visits re-validate all 20 chunks. → Add `Cache-Control: public, max-age=31536000, immutable` for `/assets/(.*)`.

13. **`window.confirm` for quiz abandon — blocked on iOS Safari PWA** — `client/src/components/Quiz.tsx:355`. Returns `false` silently in standalone mode; the exit button becomes inoperable. The string is also hardcoded English. → Replace with a MUI `<Dialog>` using `t()`.

14. **Untranslated raw strings on user-visible CTAs** — `Quiz.tsx:355` (exit confirm), `Play.tsx:319` (Join button shows raw `'…'`), `AuthButton.tsx:22` (`'Sign-in failed. Please try again.'`). Czech users see English. → Use existing translation keys (`t('play.joining')`, `t('error.generic')`).

15. **Silent blank screen on bad `currentQuestion`** — `client/src/components/Quiz.tsx:931` returns `null` when `currentQuestion` is undefined (reachable if `sessionStorage` restores an out-of-range index). → Render the error state instead.

### Web / API — P1

- **Quiz mid-session uses `sessionStorage`** — `client/src/components/Quiz.tsx:133`. Tab crash / process kill loses state. → `localStorage` with a 24 h TTL.
- **No per-route React error boundaries** — `client/src/App.tsx:239-250`. A crash inside `<Quiz>` blows away the whole shell. → Wrap each `<Route element>` in its own `ErrorBoundary` (especially `<PlayMatch>`).
- **Match host can vanish from `lobby` indefinitely** — `api/play/[action].ts:270-283` only auto-finishes `running` matches; `lobby` matches with a missing heartbeat keep guests on a permanent spinner. → Extend the stale check to `lobby`.
- **`play/state` leaks `correct_index`** — `api/play/[action].ts:299-303` skips sanitization once `status === 'finished'` and the endpoint uses `tryAuth`, not `requireAuth`. Anyone with the code gets the answer key. → After finish, only unmask for verified participants.
- **`record_category_stats` callable by anon if 007 not re-applied** — `supabase-schema-005.sql:69` GRANTs to anon; `supabase-schema-007.sql:34` REVOKEs. Order is load-bearing. → Move the `auth.uid()` check inside the function body so correctness doesn't depend on GRANT state.
- **`SECURITY DEFINER` leaderboards leak email local-part** — `supabase-schema-004.sql:118,146`, `005.sql:32`, `006.sql:32`. `COALESCE(name, split_part(email,'@',1), 'Anonymous')` exposes email prefixes of users with no display name. → `COALESCE(name, 'Anonymous')`.
- **24 RLS policies re-evaluate `auth.uid()` per row** — confirmed by Supabase performance advisor across `user_stats`, `daily_attempts`, `matches`, `match_participants`, `match_answers`, `user_category_stats`, `flashcards`, `roadmap_progress`, `user_xp`. → Apply the rewritten policy block from the DB section below as `supabase-schema-014.sql`.
- **Duplicate index on `match_answers`** — `match_answers_match_sub_qidx_uniq` shadows the PK. → `DROP INDEX public.match_answers_match_sub_qidx_uniq`.
- **Missing CHECK constraints** — `match_answers.duration_ms`, `match_answers.speed_bonus`, `daily_attempts.correct/total`, `matches.questions` (no JSONB size guard). Hostile clients can post negatives / huge values to skew totals. → Add CHECKs as documented in the DB section.
- **`user_stats.total_*` columns lack NOT NULL** — base `supabase-schema.sql` defaults to 0 but allows explicit NULL → downstream arithmetic crashes. → `ALTER COLUMN ... SET NOT NULL`.
- **Streak is timezone-blind** — `record_quiz_result` computes "today" in UTC. A user in UTC+12 quizzing at 11 PM local credits the next UTC day, breaking streaks. → Accept client local date, validate `±1 day` of server UTC.
- **Idempotency: quiz result POST has no submission ID** — `api/user/[op].ts:172`. Network retry on a flaky connection = double-counted quiz. → Add `submission_id UUID`, track in a small table.
- **`question_edits` SELECT has no LIMIT** — `lib/questions-store.ts:140`. Grows O(edits). → Add `LIMIT` + `deleted = false`.
- **No service worker / PWA caching** — initial load eats ~229 KB gzip critical path every cold visit. → `vite-plugin-pwa` with `NetworkFirst` for `/api/quiz/*`, `CacheFirst` for `/assets/*`.
- **Prism bundle includes ~200 languages** — `client/src/components/CodeBlock.tsx:6` imports the full Prism build (638 KB / 226 KB gzip). → Swap to `prism-light` and register the 6–8 languages actually used. ~160 KB gzip savings.
- **MUI 5 unchecked Radio contrast `#bdbdbd` on white ≈ 1.5:1** — `client/src/theme/MuiTheme.ts:125`. WCAG 1.4.11 fail. → Darken to `#767676`.
- **XP toast white text on `#7be24a` gradient ≈ 2.2:1** — `client/src/components/XpToaster.tsx:88-89`. WCAG 1.4.3 fail. → Darken the light stop or switch text to `#1a3300`.
- **Timer with `aria-live="polite"` fires every 250 ms** — `client/src/components/Play.tsx:798`. Screen readers either spam or drop announcements. → Remove `aria-live` from the ticker; announce only on thresholds (10s, 5s, 0s) via a hidden live region.
- **`html[lang]` is static `"en"`** — `client/index.html:2`. Switching to Czech doesn't update `lang`. → Set `document.documentElement.lang` in `LanguageContext.setLang`.
- **`outline: 'none'` on programmatic-focus targets** — `client/src/App.tsx:235`, `Quiz.tsx:747`. Suppresses keyboard focus ring. → Suppress only `:focus`, not `:focus-visible`.
- **Roadmap tabs missing paired `role="tabpanel"`** — `client/src/components/Roadmap.tsx:364-390`. → Add `<div role="tabpanel" id="roadmap-panel-{topic}" aria-labelledby="roadmap-tab-{topic}">`.

### Web / API — P2 / polish

- Token expiry mid-session not handled (`client/src/lib/api.ts:23`).
- `Profile.tsx:53-58` GET-then-upsert waterfall on first visit.
- `Leaderboard.tsx:137` uses `key={i}` for real rows (re-uses DOM nodes between tabs).
- `Roadmap.tsx:742` `useEffect` keydown listener has no deps array.
- Match speed-bonus partially trusts client timestamp (`api/play/[action].ts:460-466`).
- `unsafe-inline` in `vercel.json:27` script-src — audit whether actually needed.
- Several dev-time CVEs (`ws@8.19.0` in Vite HMR transitive — not shipped). Run `npm update ws` when convenient.
- The server bundle parses ~1.9 MB of static question data on every Vercel cold start (`lib/quiz-data.ts` 692 KB, `quiz-data.cs.ts` 560 KB, roadmap files ~600 KB) — lazy-load CS + per-topic roadmaps.
- `vercel.json` has no `regions` — colocate with Supabase region.
- Quiz/Roadmap inline hex colors (`#16a34a`, `#dc2626`, `#2e7d32`, `#c62828`) instead of theme tokens; three different greens in the codebase.
- Numerous P2 a11y findings — see audit detail (Play landing missing `aria-pressed`, scoreboard lacks list semantics, CodeBlock Prism path lacks aria-label, Drawer `role="presentation"` collapses landmarks, etc.).

### Database (Supabase) — P0

1. **`supabase-schema-009.sql` not applied to live DB** — CONFIRMED via SQL: `SELECT FROM information_schema.tables WHERE table_name IN ('question_edits','app_settings')` returns 0 rows. The `/dev` admin console persistence is silently broken in prod (writes no-op). → Apply 009 + 010 (010 adds `cs_*` columns to `question_edits` and depends on 009).
2. **`question_reports` anon-INSERT** — covered above (P0 #8 under Web).
3. **`record_category_stats` callable by anon** — covered above (P1 under Web).

### Database — P1

- **24 RLS policies use `auth.uid()` directly** — apply the rewrite block below as `supabase-schema-014.sql` (also patch source files at the lines noted so fresh applies are clean: 002:14-25, 003:44-50, 004:56-81, 005:20-31, 008:24-39, 011:26-37, 013:20-31).
- **Duplicate index on `match_answers`** — `DROP INDEX public.match_answers_match_sub_qidx_uniq;`
- **`user_streak` table from `supabase-schema-012.sql` not applied live** — confirm whether the streak garden is meant to sync. Either apply 012 or remove the API path in `api/user/[op].ts:98-127`.
- **Migration tracking drift** — only 5 migrations in `supabase_migrations.schema_migrations`; live tables include 008/011/013 (applied via SQL editor without CLI). → Backfill `schema_migrations` rows so future `supabase db push` doesn't try to re-apply.
- **Missing CHECK / NOT NULL** — see "Web P1" entries above.
- **`matches.questions` is unbounded JSONB read on every state poll** — store only IDs in the match row; fetch content from the in-process cache.

### Database — P2 / polish

- Unused indexes (mostly safe to keep until traffic grows): `idx_user_stats_last_quiz_date`, `idx_question_reports_question_id`, `idx_question_reports_created_at`, `idx_matches_host`, `idx_match_answers_summary`. Keep `idx_user_category_stats_category_correct` — it backs `category_leaderboard`.
- Shadowed indexes: `idx_user_stats_user_id` (covered by UNIQUE), `idx_matches_code` (covered by UNIQUE).
- `user_stats.created_at` / `updated_at` are `TIMESTAMP` (no tz); everything else is `TIMESTAMPTZ`. Cosmetic drift.
- `match_scoreboard` redefined between 004 and 005 with a new return type — re-running 004 after 005 fails (forward-only). Document.
- Leaked-password protection disabled in Supabase Auth (N/A — Google OAuth only).

### Repo Hygiene — P0

1. **README — refreshed ✅** — `README.md` has been rewritten to match the current stack: Supabase Auth (not Auth0), ~3,100 questions across 15 learning paths, the full category set (incl. `dsa` / `algorithms` / `nextjs`), `lib/quiz-data.cs.ts` (Czech), and all SQL migrations through 019. Set a strong `DEV_PASSWORD` in production — the admin gate exposes answer keys.

### Repo Hygiene — P1

- **`.env.example` missing referenced env vars** — `client/.env.example` lacks `OWNER_EMAIL` (used in `lib/settings-store.ts`) and `DEV_PASSWORD` (used in `lib/admin-auth.ts:12`). → Add both.
- **No CI/CD gate** — no `.github/workflows/`. Vercel previews catch build failures but the `scripts/test-*` files only run locally. → Add a workflow running typecheck (root + client), client build, and the test scripts.
- **No root `tsconfig.json`** — `api/**/*.ts` and `lib/**/*.ts` are only typechecked implicitly by Vercel's `@vercel/node` build. → Add `/tsconfig.json` covering them with `strict`, `noUncheckedIndexedAccess`.
- **Root `package.json` lacks `typecheck`, `test`, `lint` scripts** — only has `dev`/`build`/`preview`/`install:all`.
- **TypeScript version drift** — root 5.9.3, client 5.3.3.
- **`client/vite.config.js` is a committed build artifact** — the `.ts` source is the real config. → `git rm` + `.gitignore`.

### Repo Hygiene — P2

- `client/src/lib/supabase.ts` (94 LOC) AND `supabaseClient.ts` (15 LOC) both exist — collapse.
- `server/dist/` exists with stale compiled Express output (no TypeScript source). Dead since the serverless migration. → Delete `server/` entirely (verify nothing references it first).
- `vercel.json` has no `regions` field — defaults to `iad1` only. Colocate with Supabase region.

---

## LAUNCH CHECKLIST

### A. Web / Vercel

1. **Env vars in Vercel project (all environments unless noted)**
   - `SESSION_SECRET` — strong random (≥32 bytes); used by `lib/session.ts`. **Required** (no fallback in prod).
   - `SUPABASE_URL` — Supabase project URL.
   - `SUPABASE_ANON_KEY` — Supabase anon key.
   - `SUPABASE_SERVICE_ROLE_KEY` — **service-side only**; never expose to client.
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — same values, exposed to client bundle (`client/.env.example`).
   - `DEV_PASSWORD` — **strong** password (do not use `react123`). After P0 #1 fix, this becomes mandatory in prod.
   - `OWNER_EMAIL` — admin user email; `lib/settings-store.ts`. Add to `.env.example`.
   - `VERCEL_ENV` — auto-set by Vercel.
   - (Future) `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` once Sentry is wired.
   - (Future) `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` once rate limiting is wired.
2. **Domain** — point production domain at Vercel project; verify HTTPS / HSTS (already present in `vercel.json:25-29`).
3. **`vercel.json`** — add `regions: ["<supabase-region>"]`; add `Cache-Control: public, max-age=31536000, immutable` for `/assets/(.*)`; consider lifting `maxDuration` to 25 for `api/play/*`.
4. **Error monitoring** — Sentry/PostHog DSN + `componentDidCatch` wiring (`client/src/components/ErrorBoundary.tsx`, `api/*`).
5. **Analytics** — confirm whether you want Vercel Web Analytics / PostHog product analytics. Add the Vercel Analytics tag (one line in `App.tsx`).
6. **Health endpoint** — confirm `api/health.ts` returns 503 on DB-down (P0 #11) before pointing your uptime monitor (BetterStack / UptimeRobot / Vercel Monitoring) at `/api/health`.
7. **CI gate** — `.github/workflows/ci.yml` running typecheck + build + the 4 test scripts on PR.

### B. Supabase

Apply in this order, then re-run the security + performance advisors to confirm a clean board.

1. **Apply `supabase-schema-009.sql`** (creates `question_edits` + `app_settings`).
2. **Apply `supabase-schema-010.sql`** (adds `cs_*` columns to `question_edits` — depends on 009).
3. **Decide on `supabase-schema-012.sql`** (`user_streak`): apply if the streak garden is in scope, otherwise remove the API path.
4. **Apply `supabase-schema-014.sql`** (new) — RLS auth.uid() rewrite + `question_reports` REVOKE + duplicate-index drop + CHECK constraints + NOT NULL fills. Sketch:

```sql
BEGIN;

-- 1) RLS auth.uid() initplan rewrite (25 policies across 9 tables) — pure perf, no behavior change.
-- (Full block — see DB audit Section 2 — covers user_stats, daily_attempts, matches,
-- match_participants, match_answers, user_category_stats, flashcards, roadmap_progress, user_xp.)
DROP POLICY IF EXISTS stats_select_own ON user_stats;
CREATE POLICY stats_select_own ON user_stats FOR SELECT
  USING (user_id = (select auth.uid())::text);
-- ... (repeat pattern for all 25 policies — see supabase-schema-014.sql) ...

-- 2) question_reports anon-INSERT lockdown (defense-in-depth; server uses service-role).
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.question_reports FROM anon, authenticated;
DROP POLICY IF EXISTS report_insert_any ON public.question_reports;

-- 3) Duplicate / shadowed indexes.
DROP INDEX IF EXISTS public.match_answers_match_sub_qidx_uniq;
DROP INDEX IF EXISTS public.idx_user_stats_user_id;
DROP INDEX IF EXISTS public.idx_matches_code;

-- 4) Data-integrity CHECKs.
ALTER TABLE match_answers
  ADD CONSTRAINT match_answers_duration_ms_check CHECK (duration_ms BETWEEN 0 AND 600000),
  ADD CONSTRAINT match_answers_speed_bonus_check CHECK (speed_bonus BETWEEN 0 AND 100);
ALTER TABLE daily_attempts
  ADD CONSTRAINT daily_attempts_bounds_check
    CHECK (correct >= 0 AND total > 0 AND correct <= total AND total <= 50);
ALTER TABLE user_stats
  ALTER COLUMN total_quizzes   SET NOT NULL,
  ALTER COLUMN total_correct   SET NOT NULL,
  ALTER COLUMN total_questions SET NOT NULL,
  ALTER COLUMN current_streak  SET NOT NULL,
  ALTER COLUMN longest_streak  SET NOT NULL;

-- 5) Leaderboard PII polish — drop the email-prefix fallback.
-- (Recreate global_leaderboard, daily_leaderboard, category_leaderboard with
-- COALESCE(name, 'Anonymous') instead of COALESCE(name, split_part(email,'@',1), 'Anonymous').)

COMMIT;
```

5. **Backfill migration tracking** so 008/011/013 stop being invisible to `supabase db push`.
6. **Re-run advisors** (`mcp__supabase__get_advisors security/performance`) — expect the RLS warnings and the duplicate-index warning to clear; the 6 SECURITY DEFINER leaderboard RPCs are intentional read-only and can stay (acknowledge in code comments).
7. **Verify** `category_leaderboard` still uses `idx_user_category_stats_category_correct` (`EXPLAIN` after the rewrite).

## Strengths Worth Keeping

- All public tables have RLS enabled (confirmed live).
- Comprehensive skeleton loading states across Quiz, Leaderboard, Profile, Roadmap.
- Full Czech/English parity enforced at the type level (`cs: Record<TranslationKey, string>`) — compiler catches missing keys.
- `prefers-reduced-motion` block in `Roadmap.css` is thorough.
- Skip-to-content link in `App.tsx:128` with correct focus-visible behavior.
- `sessionStorage` quiz persistence survives accidental refresh.
- `XpToaster` queuing logic prevents toast-clobbering on rapid XP gains.
- `MuiFormControlLabel` theme override sets `minHeight: 44` — answer options meet tap-target minimums.
- HSTS, Permissions-Policy, X-Frame-Options, CSP all present in `vercel.json` (with one `unsafe-inline` to revisit).
- `lib/` is import-isolated — `client/src` never reaches into server-side `lib/`.
