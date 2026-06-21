# DevQuiz — Setup & Recommendations

A practical, current guide to (1) what you need to make the **website** fully
operational, (2) how to set up the **iOS** app for launch, and (3) prioritized
**performance / scalability / reliability** improvements from a full pass over
the app.

> This complements the exhaustive `LAUNCH.md` (a one-time launch audit). This doc
> reflects the **current** state of the repo after the latest changes
> (importance system, three new learning paths, iOS parity, DB migrations applied,
> `/dev` password set to `autobus`). Where `LAUNCH.md` and this doc overlap, this
> one is newer.

---

## 0. Current state (what's already done)

- **Question bank:** 3,110 questions. 15 learning paths including the new
  **AI & LLMs**, **React Hook Form + Zod**, and **Cool Stuff** paths.
- **Importance system:** every question has a resolved importance (1–10); the
  quiz (web + the mobile online path + the mobile offline fallback) is
  importance-weighted; `/dev` can edit scores, bulk-hide fillers, and shows flag
  counts.
- **Database:** base schema + migrations `002`–`014` are applied to the live
  Supabase project (verified), `user_streak` (012) created, and Realtime enabled
  for the multiplayer tables. Re-verify anytime with the query in §3.3.
- **iOS parity:** the mobile app now knows all 15 topics + their labels/colors,
  and its offline bundle (`mobile/src/data/offline-data.ts`) was regenerated.
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

### 1.2 Mobile (Expo / EAS)

Read in `mobile/src/lib/config.ts` from `EXPO_PUBLIC_*` env or `app.json` →
`expo.extra`:

| Variable / field | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `extra.supabaseUrl` | Supabase URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `extra.supabaseAnonKey` | Supabase anon key (currently **empty** in `app.json` — fill it). |
| `EXPO_PUBLIC_API_BASE_URL` / `extra.apiBaseUrl` | Your deployed Vercel URL (e.g. `https://devquiz.vercel.app`). Empty today → all network calls fail until set. |

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
Regenerate the mobile offline bundle and re-run integrity checks:
```bash
npx ts-node scripts/validate-roadmap.ts          # bank/level integrity
npx ts-node scripts/generate-mobile-offline.ts   # rewrites mobile/src/data/offline-data.ts
npx ts-node scripts/test-offline-data.ts         # offline bundle integrity
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

## 5. iOS launch

The mobile app (Expo SDK 52 / RN 0.76) is feature-complete and offline-capable;
the gap to the App Store is mostly assets, identifiers, and credentials. Full
checklist is in `LAUNCH.md` §C — the essentials:

1. **Apple Developer Program** ($99/yr); note the Team ID.
2. **Real bundle ID** — replace `com.yourcompany.devquiz` in `mobile/app.json`
   (bundle id + App Group) and the widget target files.
3. **Fill config:** `app.json` → `extra.supabaseAnonKey` + `extra.apiBaseUrl`
   (your Vercel URL), or the `EXPO_PUBLIC_*` equivalents for the EAS `production`
   profile; and `eas.json` submit creds (`appleId`, `ascAppId`, `appleTeamId`).
4. **Assets:** 1024×1024 marketing icon, `icon.png`, `splash.png`,
   `adaptive-icon.png`; configure `expo-splash-screen`.
5. **Sign in with Apple** — required by App Store Guideline 4.8 since Google login
   is offered. Add `expo-apple-authentication` + a button in `AccountScreen.tsx` +
   `supabase.auth.signInWithIdToken({ provider: 'apple', … })`.
6. **Privacy manifest** (`PrivacyInfo.xcprivacy`) and
   `ITSAppUsesNonExemptEncryption: false`, `CFBundleLocalizations: ["en","cs"]`.
7. **Widget:** either implement the missing `DevquizWidgetModule.swift` or remove
   `mobile/modules/devquiz-widget/` before an EAS production build.
8. **Add Supabase OAuth redirect** `devquiz://auth-callback` to Supabase Auth +
   Google OAuth client.
9. **Regenerate the offline bundle** (§3.4) so the shipped app includes the latest
   questions/paths, then `eas build -p ios --profile production` → TestFlight →
   submit.

> **Parity note:** the `/dev` console features (editable importance, bulk-hide,
> flag triage) are owner/admin web-only and intentionally have no mobile UI. The
> mobile **online** quiz already gets importance-weighting from the server, and
> the **offline** fallback now mirrors it locally. Mobile has no user-facing
> "report question" feature — that's a pre-existing gap worth adding if you want
> full parity (a single POST to `api/quiz/report`).

---

## 6. Suggested "next 1–2 days" order

1. Set a strong `DEV_PASSWORD`; confirm all prod env vars (§1).
2. Prism light build + immutable asset caching (§4.1.1, §4.1.5) — biggest, safest
   perf win.
3. Rate-limit the report + mutating endpoints (§4.2.2).
4. `reportCounts` + XP atomic RPCs (§4.2.3–4).
5. `play/state` resilience + per-route error boundaries + health 503 (§4.3).
6. iOS: bundle ID, assets, Sign in with Apple, EAS creds (§5).
