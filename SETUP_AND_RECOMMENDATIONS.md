# DevQuiz — Setup & Recommendations

> Historical setup notes. Use [`client/.env.example`](./client/.env.example) and
> [`docs/launch-runbook.md`](./docs/launch-runbook.md) for the current StudyShark
> + devShark deployment, admin authorization, support, AI, and migration contract.

A practical, current guide to (1) what you need to make the **website** fully
operational and (2) prioritized **performance / scalability / reliability**
improvements from a full pass over the app.

> This complements the exhaustive `LAUNCH.md` (a one-time launch audit). This doc
> reflects the **current** state of the repo after the latest changes
> (importance system, three new learning paths, DB migrations applied,
> `/dev` password set to `autobus`). Where `LAUNCH.md` and this doc overlap, this
> one is newer.

---

## 0. Current state (what's already done)

- **Question bank:** 3,110 questions. 15 learning paths including the new
  **AI & LLMs**, **React Hook Form + Zod**, and **Cool Stuff** paths.
- **Importance system:** every question has a resolved importance (1–10); the
  quiz is importance-weighted; `/dev` can edit scores, bulk-hide fillers, and
  shows flag counts.
- **Database:** base schema + migrations `002`–`014` are applied to the live
  Supabase project (verified), `user_streak` (012) created, and Realtime enabled
  for the multiplayer tables. Re-verify anytime with the query in §3.3.
- **`/dev` password:** default is now `autobus` (was `react123`). **Override it
  in production** with the `DEV_PASSWORD` env var (see §1).

---

## 1. Environment variables

Auth is **Supabase Auth (Google OAuth)** — there is no Auth0 despite some stale
README mentions.

### 1.1 Vercel project (server / API)

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL (`https://<ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | ✅ | Anon key — used to verify caller JWTs. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Server-only.** Lets the API bypass RLS after verifying the caller. Never expose to the client. |
| `SESSION_SECRET` | ✅ (prod) | ≥32-byte random string; HMAC-signs quiz session tokens. The function **throws at boot** in production if missing. |
| `VITE_SUPABASE_URL` | ✅ | Same URL, baked into the client bundle at build time. |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Same anon key, for the browser Supabase client. |
| `DEV_PASSWORD` | ⚠️ strongly recommended | Gates the `/dev` admin console (answer keys + CRUD). Defaults to `autobus`; **set a strong value in prod.** |
| `OWNER_EMAIL` | optional | Email whose private categories (custom/apt) are visible; defaults to `kouril.lukas@gmail.com`. |

Generate a session secret with: `openssl rand -base64 48`.

---

## 2. Web setup (Vercel)

1. **Create the Supabase project** (§3) and a **Google OAuth** provider:
   Supabase → Authentication → Providers → Google; add your site URL + the
   `…/auth/callback` redirect to both Supabase and the Google Cloud OAuth client.
2. **Import the repo into Vercel.** Build is driven by `vercel.json`:
   - build command `cd client && npm install && npm run build`, output
     `client/dist`, SPA rewrites + API routes already configured.
   - Security headers (CSP, HSTS, X-Frame-Options, etc.) are set there too.
3. **Add the env vars** from §1.1 to all environments.
4. **Deploy.** Then smoke-test: sign in, take a quiz, open `/dev` (password from
   `DEV_PASSWORD`), check a daily challenge and a multiplayer match.
5. **Function limit:** the app is built for Vercel **Hobby's 12-function cap** and
   sits exactly at it (`api/` has 12 handlers, several are multi-op fans like
   `api/admin/[op].ts`, `api/play/[action].ts`). Any new endpoint requires Pro or
   merging into an existing catch-all — see §4.2.

---

## 3. Database setup (Supabase / Postgres)

### 3.1 Fresh project
Run, in order, in the SQL Editor: `supabase-schema.sql` (base), then
`supabase-schema-002.sql` … `supabase-schema-014.sql`. They are idempotent-ish
(use `IF NOT EXISTS`) but **order matters** (e.g. 010/014 add columns to the
`question_edits` table created in 009).

### 3.2 What each migration adds (quick map)
- **base**: `user_stats` + RLS. • **002**: atomic `record_quiz_result`, indexes.
- **003**: `question_reports`, `daily_attempts`. • **004**: multiplayer
  (`matches`, `match_participants`, `match_answers`) + leaderboard RPCs.
- **005**: per-category stats + match timing. • **006**: heartbeat + leaderboard
  threshold. • **007**: RLS hardening. • **008**: `flashcards`.
- **009**: `question_edits` + `app_settings` (the `/dev` console). • **010**:
  Czech (`cs_*`) override columns. • **011**: `roadmap_progress`.
- **012**: `user_streak`. • **013**: `user_xp`. • **014**:
  `question_edits.importance` (editable importance scores).

### 3.3 Verify a deployment matches the repo
Paste the query in this repo's chat history (the "DB setup check" — checks every
table, key column, function, RLS flag, Realtime publication, and the
`match_answers` unique constraint). Every row should read `✅ ok`. Also enable
**Realtime** for `matches`, `match_participants`, `match_answers` (Database →
Replication / `supabase_realtime` publication) or live multiplayer won't update.

### 3.4 After changing questions/roadmap
Re-run the integrity check:
```bash
npx ts-node scripts/validate-roadmap.ts          # bank/level integrity
```

---

## 4. Recommendations

Severity: **High** = do before scaling/launch · **Med** = soon · **Low** =
backlog. File references included. Items already in `LAUNCH.md` are marked ↩.

### 4.1 Performance (frontend)

1. **High — Prism ships all ~594 languages.** `client/src/components/CodeBlock.tsx`
   imports `react-syntax-highlighter/.../prism` (≈964 KB raw / ~280 KB gzip). The
   bank only uses ~8 languages (js, ts, jsx, tsx, css, html, bash, json). Switch
   to `prism-light` and `registerLanguage` those → **~200 KB gzip saved**. ↩
2. **High — guard the server-only data boundary.** `lib/quiz-data.ts` (~178 KB
   gzip), `lib/quiz-data.cs.ts`, and `lib/roadmap-questions-*.ts` are server-only
   and correctly never imported from `client/src` today — but one stray import
   would silently bloat the bundle by >145 KB. Add a Vite `resolve.alias` that
   stubs `lib/quiz-data*` for the client build to make the boundary enforced, not
   conventional.
3. **Med — split `Play.tsx`.** `client/src/App.tsx` lazy-imports it twice (landing
   + match) from one 1,000-line module. Split into `PlayLanding`/`PlayMatch` so the
   landing page doesn't pull in the Realtime match code.
4. **Med — memoize hot recomputations.** `Quiz.tsx` rebuilds
   `categoryProgressBackground(questions.map(...))` on every keystroke; wrap in
   `useMemo([questions])`. `handleSubmit`/keydown effects re-create on every answer
   because `questions`/`answers` are in deps — hold them in refs.
5. **Med — explicit Prism chunk + immutable asset caching.** Add `prism` to
   `manualChunks` in `client/vite.config.ts`, and add
   `Cache-Control: public, max-age=31536000, immutable` for `/assets/(.*)` in
   `vercel.json` (hashed filenames make this safe; repeat visits stop re-validating
   ~20 chunks). ↩
6. **Low — font + memo polish.** Preload the actual Roboto `.woff2` (not the CSS)
   in `client/index.html`; add `React.memo`/`useMemo` to `Profile.tsx`
   (`computeAchievements` runs every render). Lower `chunkSizeWarningLimit` once
   Prism is fixed so CI surfaces regressions.

### 4.2 Scalability (API / DB)

1. **High — static bank re-parsed on every cold start.** ~2 MB of JS literals
   (`lib/quiz-data*.ts` + roadmap files) parse on each new serverless instance;
   the in-memory caches (`questions-store.ts`, `settings-store.ts`, 15 s TTL) only
   help warm instances. Emit a build-time JSON asset and `require()` it
   pre-parsed; lazy-load `quiz-data.cs.ts` only when `lang=cs`.
2. **High — no rate limiting anywhere.** `api/quiz/report.ts` accepts anonymous
   POSTs; nothing throttles `quiz/*`, `user/*`, `play/*`, `admin/*`. Add
   `@upstash/ratelimit` keyed by IP (and by user sub for authed routes); the
   anonymous report endpoint is the most urgent. ↩
3. **High — `reportCounts()` pulls up to 5,000 rows and counts in JS**
   (`lib/reports-store.ts`), on every `/dev` questions load (alongside a full
   `question_edits` scan). Replace with a `GROUP BY` RPC returning
   `(question_id, count)`.
4. **High — XP update is a non-atomic read-modify-write** (`api/user/[op].ts`).
   Two tabs can clobber each other. Move to a one-statement RPC
   (`SET quest_xp = GREATEST(quest_xp, $1)`) or `ON CONFLICT … GREATEST(...)`. ↩
5. **Med — multiplayer is HTTP polling.** `api/play/[action].ts` `state` runs 2–4
   DB queries per poll; a 30-student room ≈ 120 queries/s. Use Supabase **Realtime**
   subscriptions client-side (the tables are already in the publication) and/or
   `Cache-Control: s-maxage=1` on the state response.
6. **Med — `question_edits` full scan + no secondary index.** `loadOverrides()`
   does `select('*')`; add an index on `(deleted, is_custom)` and filter to the
   rows actually needed; add a `LIMIT`. ↩
7. **Med — at the 12-function ceiling.** Document it; pre-create a generic
   `api/[resource]/[action].ts` catch-all or move to Vercel Pro before adding
   endpoints.
8. **Med — `global_leaderboard` secondary sort isn't fully indexed.** Add a
   composite partial index `(total_correct DESC, longest_streak DESC) WHERE
   total_quizzes > 0`; the endpoint already CDN-caches 60 s.
9. **Low — `matches.questions` JSONB loaded in full on every answer/state/join.**
   Select only the needed slice (or store IDs and resolve from the in-memory bank).

### 4.3 Reliability

1. **High — `play/state` tears down on a missing RPC.** The participants +
   `match_scoreboard` `Promise.all` (`api/play/[action].ts`) 504s entirely if the
   scoreboard RPC is absent, unlike the leaderboard/distribution paths. Use
   `Promise.allSettled` + an `isRpcMissing` fallback returning `scoreboard: []`.
2. **High — unchecked DB errors in `play/join` and `play/answer`.** The
   participant upsert (join) and participant-count query (answer auto-advance)
   don't check `error`; a hiccup leaves a player "joined" but absent, or stalls a
   head-to-head match. Destructure and handle `error`.
3. **Med — observability gap on the importance write.** The best-effort importance
   update in `lib/questions-store.ts` (`saveQuestion`) routes failures to an
   **empty** `log_importance_skip()` — silent even post-migration. Make it a
   structured `console.warn`, and consider folding `importance` into the main
   `upsert` now that migration 014 is applied (collapses 3 round-trips to ~1,
   under the 10 s function budget).
4. **Med — per-route error boundaries.** Only the root is wrapped
   (`client/src/main.tsx`); a crash in `<Quiz>`/`<PlayMatch>`/`<Roadmap>` blows
   away the whole shell and in-progress state. Wrap each route in `App.tsx`. ↩
5. **Med — health endpoint always 200.** `api/health.ts` checks Supabase but
   returns `200 {ok:true}` even when it's down; return `503` so uptime monitors
   detect outages. ↩
6. **Low — silent sync drift.** `client/src/lib/roadmap.ts` swallows the
   progress push-back error; log it so device/server divergence is visible.

**Already solid (keep):** the static-data fallback (`getEffectiveQuestions`,
`getGameSettings`, `useGameConfig` all fall back to in-code defaults when the DB
is down), the consistent `withTimeout` guard on every Supabase call, structured
JSON logging on the main paths, and the race-safe `play/control` conditional
update.

### 4.4 Security (highlights — see `LAUNCH.md` for the full list)

- **Set a strong `DEV_PASSWORD`** in prod (default is now `autobus`, not the old
  `react123`).
- **Daily session-token replay** can inflate stats (`api/quiz/submit.ts` +
  `record_quiz_result`): add a `jti`/`daily_attempts.session_id UNIQUE`. ↩
- **`question_reports` anon INSERT** (`WITH CHECK (true)`): revoke direct anon
  insert; the server path uses the service role. ↩
- **Verify Supabase JWTs locally** with `jose` instead of an `auth.getUser`
  round-trip per request (`lib/auth.ts`). ↩
- **Upgrade `react-router-dom`** (CVEs noted in `LAUNCH.md`). ↩

---

## 6. Compliance & legal (website)

> General engineering guidance, **not legal advice** — confirm specifics for your
> jurisdiction(s). DevQuiz collects: account **email** + display name/avatar (via
> Google), **quiz results/progress**, and a Supabase **user id**. It runs **no
> ads and no cross-site tracking** today.

### 6.2 Website — privacy, cookies, terms

- **Privacy policy — required, do it first.** GDPR, CCPA, *and* Google's OAuth
  terms each require one. It's the single artifact Google and EU/UK law all
  demand.
- **Cookie consent banner — how important, honestly?** For **DevQuiz as built
  today, a consent banner is _not legally required_.** The only browser storage is
  the **Supabase auth session in `localStorage`**, which is *strictly necessary*
  for login and therefore **exempt** from prior-consent rules (GDPR/ePrivacy). You
  must still **describe** that storage in the privacy/cookie policy.
  - ⚠️ **It becomes mandatory the moment you add anything non-essential** —
    analytics (Vercel Analytics, PostHog, GA), cookie-setting error trackers,
    embeds, ad pixels. Several §4 recommendations (Sentry/analytics) cross that
    line. For EU/UK users you'd then have to **block those scripts until opt-in**
    (true consent management), not just display a banner, and keep an auditable
    consent record (localStorage-only isn't enough). Enforcement is real — CNIL
    issued €325M and €150M cookie fines in a single day in 2025.
  - **Bottom line:** ship a **privacy policy now**; add a real **consent banner
    only when you introduce non-essential tracking.**
- **Terms of Service — recommended.** You have accounts, public display names and
  leaderboards (user content); ToS sets acceptable-use and limits liability.
- **Data-subject rights (GDPR/CCPA).** Offer account **deletion** (and ideally
  data **export**). Build deletion once → it satisfies GDPR/CCPA erasure (6.3).
- **Google OAuth consent screen.** Configure in Google Cloud (app name, logo,
  **privacy-policy + terms URLs**, authorized domains) and **publish** it (out of
  "Testing"). Basic `email`/`profile` scopes are non-sensitive, so you avoid
  Google's heavyweight security assessment.
- **Children (COPPA / UK Age-Appropriate Design).** An education app can attract
  minors: don't knowingly collect from under-13s, set an honest age rating, say so
  in the policy. Note some **US app-store age-verification laws land in 2026.**

### 6.3 The one code gap this reveals: in-app account deletion

Required by **GDPR/CCPA**, currently missing. Build once, expose on the web
(Profile):

1. An authed delete op on `api/user/[op].ts` (no new Vercel function) that, for the
   verified user, removes their rows (`user_stats`, `user_category_stats`,
   `flashcards`, `roadmap_progress`, `user_streak`, `user_xp`, `daily_attempts`,
   `match_*`, `auth_events`) then deletes the auth user via
   `supabase.auth.admin.deleteUser(sub)`.
2. A confirm dialog in the web Profile.

> Tip: generate a privacy policy + ToS with a reputable tool (Termly / iubenda /
> TermsFeed), host them as two static routes, and make sure they list Supabase,
> Google sign-in, and exactly what you store.

**Sources:** [GDPR.eu cookies](https://gdpr.eu/cookies/).

---

## 7. Suggested "next 1–2 days" order

1. **Privacy policy + ToS live, and in-app account deletion** — required by
   GDPR/CCPA (§6). Highest-leverage compliance item.
2. Set a strong `DEV_PASSWORD`; confirm all prod env vars (§1).
3. Prism light build + immutable asset caching (§4.1.1, §4.1.5) — biggest, safest
   perf win.
4. Rate-limit the report + mutating endpoints (§4.2.2).
5. `reportCounts` + XP atomic RPCs (§4.2.3–4).
6. `play/state` resilience + per-route error boundaries + health 503 (§4.3).
