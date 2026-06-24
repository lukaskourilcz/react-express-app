# DevQuiz

Developer-knowledge quiz & learning app: 15 topic paths, importance-weighted quizzes, daily challenges, real-time multiplayer, leaderboards, XP — web (React) + iOS (Expo).

> Scope note: this document is derived from the repository's actual code, package manifests, `vercel.json`, the Supabase schema files (`supabase-schema*.sql`), `.env.example` files, `mobile/app.json` / `eas.json`, and the project's own `SETUP_AND_RECOMMENDATIONS.md` / `LAUNCH.md`. Costs reflect the public pricing of the tiers the project is actually configured for. The live Supabase/Vercel billing dashboards were not reachable from this environment (their MCP servers need interactive auth), so dollar figures for paid tiers are the providers' list prices, not invoice readbacks.

---

## Tech stack & current costs

### Hosting & serverless — Vercel
- **What / used for:** Hosts the static React/Vite client (`client/dist`) on Vercel's edge CDN and runs the entire backend as serverless functions under `api/` (12 TypeScript handlers: quiz, play/multiplayer, leaderboard, user, admin, flashcards, settings, health). `vercel.json` sets security headers, SPA rewrites, and `maxDuration: 10`s per function. This is the single most important piece of infra.
- **Plan/tier:** **Vercel Hobby** (free).
- **Current monthly cost:** **$0**.
- **Limitations on this tier:**
  - **Non-commercial use only** (Hobby ToS) — a real/monetized product must move to Pro.
  - **12 Serverless Functions per deployment** — the app sits *exactly* at 12/12 (`api/` has 12 handlers; several are multi-op fans like `api/play/[action].ts`, `api/admin/[op].ts`, and `quiz/submit` even folds the report endpoint in via `?resource=report`). **You cannot add another endpoint without Pro** or merging into a catch-all.
  - Function `maxDuration` capped at 10s (configured to 10).
  - ~100 GB/month included bandwidth; cold starts on infrequently-hit functions (made worse here by a ~2 MB static question bank that is re-parsed on each cold start — see scaling notes).

### Database, Auth & Realtime — Supabase
- **What / used for:** The backend-as-a-service for everything stateful.
  - **Postgres** — ~16 tables (`user_stats`, `user_category_stats`, `daily_attempts`, `question_reports`, `matches` / `match_participants` / `match_answers`, `flashcards`, `question_edits`, `app_settings`, `roadmap_progress`, `user_streak`, `user_xp`, `auth_events`, `challenge_scores`) plus ~8 RPCs (`record_quiz_result`, `record_category_stats`, `global_leaderboard`, `category_leaderboard`, `daily_leaderboard`, `match_scoreboard`, `match_question_distribution`, …) and RLS. Schema = base + migrations `002`–`019`.
  - **Supabase Auth** — Google OAuth (confirmed in `client/.env.example` and `lib/auth.ts`; there is **no Auth0**). API verifies caller JWTs with the anon key and uses the service-role key to bypass RLS after verifying the subject.
  - **Realtime** — broadcast channels for live multiplayer (`client/src/lib/realtime.ts`); table replication enabled for the `match*` tables.
- **Plan/tier:** **Supabase Free**.
- **Current monthly cost:** **$0**.
- **Limitations on this tier:**
  - **Project auto-pauses after 7 days of inactivity** (must be manually resumed) — the single biggest "gotcha" for a low-traffic project.
  - 500 MB database, ~5 GB egress/month, 1 GB file storage.
  - Auth: 50,000 monthly active users (MAU) included.
  - Realtime: ~200 concurrent connections, ~2M messages/month.
  - Shared/nano compute; **no daily backups**; max 2 active projects per org.

### Error & performance monitoring — Sentry
- **What / used for:** `@sentry/react` is wired in the client (`client/src/lib/sentry.ts`, initialised in `main.tsx`) for error capture + browser performance tracing at `tracesSampleRate: 0.1`.
- **Plan/tier:** **Opt-in / Developer (free)** — it only activates when `VITE_SENTRY_DSN` is set at build time; without a DSN the SDK is tree-shaken out entirely. No DSN is committed, so it is effectively **off in this repo today**.
- **Current monthly cost:** **$0** (inactive; the free Developer tier — ~5,000 errors/month, 1 user, 30-day retention — would also cost $0 at current traffic if enabled).
- **Limitations on this tier:** 5k errors + limited performance units/month, single seat, short retention. Note: enabling Sentry adds a non-essential third-party that crosses the cookie/consent line for EU users (called out in `SETUP_AND_RECOMMENDATIONS.md` §6.2).

### Fonts — Google Fonts
- **What / used for:** Roboto, loaded via `<link>` to `fonts.googleapis.com` / `fonts.gstatic.com` in `client/index.html` (allow-listed in the CSP).
- **Plan/tier:** Public free CDN.
- **Current monthly cost:** **$0**.
- **Limitations:** None relevant (third-party request; could be self-hosted to tighten privacy/CSP).

### Source control & CI — GitHub
- **What / used for:** Repository hosting (`lukaskourilcz/react-express-app`); Vercel deploys from it. No GitHub Actions workflows are present in the repo (no `.github/workflows`).
- **Plan/tier:** Free.
- **Current monthly cost:** **$0**.
- **Limitations:** None relevant at this scale.

### Mobile — Expo / EAS (not yet shipped)
- **What / used for:** `mobile/` is an Expo SDK 52 / React Native 0.76 app (expo-router, offline question bundle, a native iOS widget target) that talks to the **same** Vercel API + Supabase project. `eas.json` defines EAS Build/Submit profiles.
- **Plan/tier:** **Expo EAS Free** — and currently dormant: `mobile/app.json` still has the placeholder bundle id `com.yourcompany.devquiz`, an **empty** `supabaseAnonKey`, and an **empty** `apiBaseUrl`, so the app isn't built/released.
- **Current monthly cost:** **$0** (no production builds are running).
- **Limitations / future cost (only when iOS launches):** EAS Free has limited build concurrency/quota; the EAS Production plan is **~$99/month** if you want priority CI builds (pay-as-you-go also exists). Shipping to the App Store additionally requires the **Apple Developer Program at $99/year (~$8.25/month)**.

### In code but **not** a paid dependency (verified, to avoid false assumptions)
- No LLM/AI API (OpenAI/Anthropic/etc.), no Stripe/payments, no email provider (SendGrid/Resend), no Redis/Upstash, no S3/cloud storage, no analytics (PostHog/GA), no Pusher/Ably. All such keyword hits in the repo are **quiz question content** (`lib/roadmap-questions-*.ts`), not integrations. Upstash/rate-limiting appears only as a *future recommendation*, not wired in.
- Significant client libraries bundled (no per-service cost, but they drive bundle size → bandwidth): MUI 5 + Emotion, TanStack React Query 5, react-router-dom 7, and `react-syntax-highlighter` (Prism, which currently ships ~280 KB gzip of languages — flagged for trimming).

---

## Total current cost

**≈ $0 / month.**

Every production component is on a free tier: Vercel Hobby ($0) + Supabase Free ($0) + Sentry inactive/free ($0) + Google Fonts ($0) + GitHub ($0). Mobile incurs nothing because it hasn't been built/released.

**Usage assumptions behind that $0:** this is a pre-launch / single-developer project with very light traffic — on the order of the owner plus a handful of testers. Concretely that means: well under Supabase Free's 500 MB DB (the ~2 MB question bank lives in **code**, not the DB; the DB only holds small per-user rows + match/report records — kilobytes to low single-digit MB), a few GB/month of Vercel bandwidth at most, far below 50k Auth MAU and 200 concurrent Realtime connections, and well under Sentry's 5k errors. The practical risk at this level isn't a bill — it's **Supabase Free pausing the project after 7 idle days** and **Vercel Hobby's non-commercial clause**.

---

## Scaling — options & costs

Per stack component that becomes a bottleneck:

### Vercel (hosting + serverless)
- **Why it's a bottleneck:** the 12-function cap is already hit; Hobby forbids commercial use; 10s duration cap; no team seats; cold starts.
- **Options:**
  - **Upgrade to Vercel Pro — ~$20/month per member.** Lifts to ~1,000 functions, longer durations (up to 60s default / 300s configurable), commercial use, 1 TB-class included bandwidth then usage-based, observability. This is the natural next step.
  - **Vercel Enterprise** — custom (typically $thousands/mo); only relevant much later.
  - **Self-host the API** (e.g., a single Express/Fastify container on Fly.io / Railway / Render, ~$5–$25/month). The shared `lib/` is already framework-agnostic, but you'd lose Vercel's zero-config CDN + preview deploys and take on ops. Sidesteps the 12-function cap entirely.
  - **Keep static hosting cheap regardless:** the client is just static assets — Cloudflare Pages / Netlify free tiers ($0) could serve it if the API moved elsewhere.

### Supabase (DB + Auth + Realtime)
- **Why it's a bottleneck:** Free auto-pauses, has no backups, shared compute, 5 GB egress, 200 concurrent Realtime — all of which the multiplayer polling pattern pressures first.
- **Options:**
  - **Upgrade to Supabase Pro — ~$25/month** (includes $10 compute credit). No auto-pause, daily backups (7-day PITR-capable with add-on), 8 GB DB + larger egress (~250 GB), 100k Auth MAU, ~500 concurrent Realtime + ~5M messages.
  - **Compute add-ons** on top of Pro when CPU/connections bind: Small ~$15/mo, Medium ~$60/mo, Large ~$110/mo (and up). Needed only if query volume (e.g., heavy multiplayer) saturates shared/nano compute.
  - **Read replicas** — Supabase add-on (~$100+/mo per replica, region-dependent); a *later* lever for read-heavy leaderboard/stats traffic, not needed at 100 users.
  - **Alternative Postgres** (Neon, RDS, self-hosted) — possible but you'd lose integrated Auth + Realtime + RLS tooling and have to re-implement them; not worth it until very large scale.

### Realtime / multiplayer transport
- **Why it's a bottleneck:** multiplayer currently **polls** (`client/src/components/Play.tsx` `POLL_FALLBACK_MS = 4000`; mobile `PlayScreen.tsx` polls every 2000 ms), and `api/play/[action].ts` runs 2–4 DB queries per poll (`no-store`). This multiplies DB load with every concurrent player.
- **Options:**
  - **Switch to Supabase Realtime subscriptions** for match state (tables are already in the publication) — **$0 extra** on the current plan, removes most poll queries. Highest-leverage change.
  - **Add `Cache-Control: s-maxage=1`** to the `play/state` response so Vercel's CDN absorbs duplicate polls — **$0**.
  - **Move ephemeral match state to Redis** (Upstash) — free tier (~10k commands/day) to ~$0.20/100k commands; also doubles as the rate-limit store.

### Caching / rate limiting (currently absent)
- **Why:** no app-layer rate limiting anywhere; the anonymous `question_reports` insert and all mutating routes are unthrottled.
- **Options:** **Upstash Redis + `@upstash/ratelimit`** — **$0** on the free tier, ~$0–$10/month pay-as-you-go at modest scale. Alternatively Vercel Edge Middleware/KV (KV usage-priced).

### Error monitoring
- **Options:** stay on **Sentry Developer (free, $0)** until ~5k errors/month; **Sentry Team ~$26/month** (50k errors, multiple seats) beyond that. Vercel's own Observability/Web Analytics is an alternative add-on.

### Mobile (when launched)
- **Apple Developer $99/year (~$8.25/mo)** is mandatory for App Store; **EAS Free** covers occasional builds, **EAS Production ~$99/month** if you need frequent priority CI. Android adds a one-time $25 Play Console fee.

---

## At 100 active users

Assume **100 regularly-active users** (say ~100 daily-active), each doing a few solo quizzes, viewing leaderboards, syncing roadmap progress, and occasionally joining a live multiplayer match.

### What that means for *this* app, by the numbers
- **Solo quiz path is cheap.** A quiz completion is **one** `POST /api/quiz/submit` with a batch of ≤50 answers, plus one stats RPC (`record_quiz_result`) and an XP write. Question fetches are cached client-side (React Query `staleTime` 30–60s). Leaderboards/settings/challenge are **CDN-cached** (`s-maxage=60`/`15` with SWR), so 100 users hammering the leaderboard still collapses to ~1 origin hit per minute. Ballpark: ~150–250 API requests/user/day → **~15k–25k function invocations/day (~0.5–0.75M/month)** and a few GB of bandwidth — comfortably inside both Vercel Hobby and Pro envelopes.
- **The first wall you actually hit is plan policy, not raw usage:**
  1. **Vercel Hobby's non-commercial clause + the 12/12 function cap.** With a real userbase you must move to **Pro (~$20/mo)**, and you can't ship any new endpoint until you do (you're at the cap).
  2. **Supabase Free's auto-pause / no-backups / shared compute.** 100 active users keep it awake, but you'll want **Pro (~$25/mo)** for daily backups, no-pause guarantees, more egress, and headroom on Auth MAU + Realtime connections.
- **The first *architectural* thing that breaks is multiplayer DB load.** This is the real bottleneck for this codebase. With polling at 2–4s and 2–4 DB queries per poll, concurrent matches generate **tens of queries/second** (the project's own `SETUP_AND_RECOMMENDATIONS.md` notes a single 30-player room ≈ **120 queries/s**). A few dozen of your 100 users in live matches will saturate Supabase Free's shared pooler/compute and approach the ~200 concurrent-Realtime ceiling long before invocations or bandwidth become an issue. Symptoms: slow/timing-out `play/state`, stale scoreboards, occasional 504s.
- **Secondary slowdowns at 100 users:**
  - **Cold-start latency.** Each new serverless instance re-parses the ~2 MB question bank (`lib/quiz-data*.ts` + roadmap files); under bursty 100-user traffic that's visible TTFB jitter.
  - **`/dev` admin pulls up to 5,000 report rows and counts in JS** (`lib/reports-store.ts`) and does full `question_edits` scans — fine now, sluggish as `question_reports` grows.
  - **Non-atomic XP read-modify-write** (`api/user/[op].ts`) can clobber across tabs/devices once write concurrency rises.
  - **No rate limiting** means 100 users include the buggy/abusive few; the anonymous report insert is the most exposed.

### New estimated monthly cost at 100 users
- **Web only:** Vercel Pro **$20** + Supabase Pro **$25** = **~$45/month**. Add **~$0–$10** if you introduce Upstash for rate-limiting/match-state, and **$0** for Sentry if you stay under the free 5k errors (**+$26** for Team if not). → **roughly $45–$55/month.**
- **If iOS is also live:** add Apple Developer **~$8.25/mo** and EAS (**$0** free tier, or **$99/mo** for heavy CI). → **~$55–$65/month** without EAS Production.

### How the architecture would have to change
1. **Upgrade tiers:** Vercel Hobby → **Pro**; Supabase Free → **Pro** (add a Small compute add-on, ~$15/mo, only if multiplayer load shows up in DB CPU). No read replicas or DB sharding needed at this scale — that's a 1k–10k-user concern; note it for later.
2. **Replace multiplayer polling with Supabase Realtime subscriptions** (tables already in the publication) and add **`s-maxage=1`** CDN caching to `play/state`. This is the single highest-impact change — it removes the dominant source of DB queries. Optionally back ephemeral match state with **Upstash Redis**.
3. **Add rate limiting** (`@upstash/ratelimit`, keyed by IP and by authenticated `sub`) on the report + all mutating routes.
4. **Make hot writes atomic:** convert the XP update to a single `GREATEST(...)` RPC / `ON CONFLICT`, and replace `reportCounts()` JS counting with a `GROUP BY` RPC.
5. **Kill cold-start parse cost:** emit the question bank as a build-time JSON asset and `require()` it pre-parsed; lazy-load the Czech bank only when `lang=cs`.
6. **Trim client bandwidth** (matters once 100 users each pull the bundle): switch Prism to `prism-light` (~200 KB gzip saved) and add `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` (hashed filenames make this safe).
7. **Keep what already scales:** leaderboard/settings/challenge CDN caching, the `withTimeout` guard on every Supabase call, and the in-code fallbacks for when the DB is unavailable — these are already in place and should stay.

> Net: at 100 active users DevQuiz is still a **~$45–$55/month** app. Money is not the constraint — the binding limits are Vercel Hobby's policy/function-cap and, architecturally, the multiplayer **polling** pattern hammering Supabase. Fix the transport (Realtime + short CDN TTL) and you buy a large multiple of headroom before the next tier-up.
