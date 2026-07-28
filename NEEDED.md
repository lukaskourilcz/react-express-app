# NEEDED — owner actions

The repository implementation is complete for the current web brief. This file lists only work that requires your accounts, credentials, legal decisions, production data, or external services. Importance uses `[imp:1–5]`; `[imp:5]` blocks a safe public launch.

Production database migrations through `supabase/supabase-schema-024.sql` were applied and verified on 2026-07-28. The two production Vercel projects, product scopes, canonical cross-links, Supabase credentials, and session secrets are configured; both `/api/health` probes report `database: ok`, `serviceRole: ok`, and `rateLimiter: configured` (Upstash Redis distributed rate limiting is live). Sentry error monitoring and PostHog analytics (EU cloud, reverse-proxied) are configured with privacy-forward defaults; admin ACL (`ADMIN_EMAILS`, `OWNER_EMAIL`) is set on both projects; Supabase leaked-password protection is on.

## Before production launch

- [ ] **Verify admin ACL end-to-end.** `ADMIN_EMAILS=kouril.lukas@gmail.com` is set on both projects × Production + Preview. Sign in with that account and confirm `/dev` loads; sign in with a second account and confirm `/dev` returns 403. `[imp:5]` `[owner:me]` `[time:15m]` `[kind:deploy]`
- [ ] **Complete legal/privacy review.** Add the real controller/operator identity and contact, retention periods, lawful bases, processor/transfer disclosures, age policy, analytics consent behavior, and Czech terms. Sentry and PostHog are now live in production; the disclosure text must name them (processor, region, retention) before the terms page is truthful. Keep support disabled until the disclosure matches production. `[imp:5]` `[owner:me]` `[time:2h]` `[kind:legal]`
- [ ] **Run the signed-in production smoke test** in English/Czech and desktop/mobile: Learn completion, Quiz replay rejection, Daily/Challenge idempotency, Flashcards, two-session Play/Classroom, leaderboards, `/dev`, deletion, and the daily-habit additions — the Today queue and its once-per-day Shark Card pack grant, a level going cleared→mastered over separate days, a streak freeze bridging a missed school day, badge sync, the read-only advisor, adaptive placement (including the "I don't know yet" option), and the devShark typing racer. `[imp:4]` `[owner:me]` `[time:1h]` `[kind:deploy]`

## Production reliability

- [ ] **Monitor `/api/health` externally** and alert on non-2xx. The probe now verifies public DB access, service-role access to migration 023, and reports whether distributed rate limiting is configured. `[imp:4]` `[owner:me]` `[time:1h]` `[kind:deploy]`
- [ ] **Schedule `select public.purge_expired_learning_data();`** daily with Supabase Cron or an equivalent owner job; choose and document retention periods before changing its defaults. `[imp:4]` `[owner:me]` `[time:30m]` `[kind:decision]`
- [ ] **Configure verified backups and a restore drill** using `docs/backup-restore.md`; record the recovery point/time objectives you accept. `[imp:4]` `[owner:me]` `[time:1h]` `[kind:deploy]`
- [ ] **Confirm Sentry + PostHog capture no PII in production.** Both are configured with EU regions, `sendDefaultPii: false` (Sentry), and `respect_dnt` + `identified_only` + reverse-proxied `/ingest` (PostHog). Reproduce a client error and a routine pageview signed in, then inspect the payloads in each dashboard — no submitted answer, answer proof, token, or email should be present. `[imp:3]` `[owner:me]` `[time:1h]` `[kind:legal]`

## Brand and launch assets

- [ ] **Attach your preferred custom StudyShark domain, if wanted.** StudyShark is live at `https://studyshark-app.vercel.app`; devShark remains at `https://devshark.app`. After adding a custom domain, update `VITE_STUDYSHARK_URL` on both projects plus OAuth origins/callbacks, then redeploy both. `[imp:3]` `[owner:me]` `[time:1h]` `[kind:deploy]`
- [ ] **Replace placeholder icons and social artwork** (`client/public/icon.svg`, Apple/PWA icons, and `og-image.png`) with final licensed Shark-family assets and verify metadata on both domains. `[imp:3]` `[owner:me]` `[time:2h]` `[kind:legal]`
- [ ] **Run Lighthouse/PageSpeed on both deployed products** at mobile and desktop widths; save the baseline Core Web Vitals before making traffic-driven optimization decisions. `[imp:2]` `[owner:me]` `[time:1h]` `[kind:deploy]`

## Portfolio thumbnail (2026-07-27)

The devShark thumbnail on lukaskouril.dev was re-recorded from the redesigned
landing page. It had to be captured from a locally-run client, because the
deployed site was unreachable from the session that produced it.

- [ ] **Compare the committed preview against the live site** — open `media/preview-poster.png` next to devshark.app and confirm the local build matched production. devShark is a locked deployment of the shared client, so a capture taken without `VITE_LOCK_SUBJECT=webdev` silently renders StudyShark's landing page under devShark branding; the procedure and the check are in `.claude/skills/preview-video/SKILL.md`. `[imp:3]` `[owner:me]` `[time:20m]` `[kind:content]`

## Optional features

- [ ] **Voluntary support:** set `SUPPORT_ENABLED=true` only after legal/accounting review, then enter truthful provider URLs, target, amount covered, cost breakdown, update date, and public-thanks policy through `/dev`. Support remains unrelated to access or ranking. `[imp:3]` `[owner:me]` `[time:2h]` `[kind:legal]`

AI-driven features (post-answer explanations, Sharkira Socratic hints) are intentionally not listed. The client wiring stays in the repo so they can be enabled later, but no paid model API is provisioned now.

## When usage grows

- [ ] Review [scaling.md](./scaling.md) monthly once traffic is meaningful. Upgrade Supabase compute before sustained saturation, add retention/partitioning for event tables, and redesign multiplayer fan-out before large classrooms or high concurrent-room counts. `[imp:1]` `[owner:me]` `[time:20m]` `[kind:setup]`

Native iOS/Android work remains intentionally deferred; it is not a missing item for this web release.

## Recorded decisions (2026-07-28)

- **`claude/favicon-sharkfin-q3z4ot` deleted** — Expo-only branch; mobile app was shut down. PR #91 closed, remote branch removed.
- **`react-router-dom` 7.18.1 kept** — advisories GHSA-qwww-vcr4-c8h2 and RSC-mode CSRF bypass are RSC-mode only. This app is a Vite SPA with no server components (no `renderToPipeableStream`, `react-server-dom`, `createStaticHandler`, or `@react-router/server` usage). Advisories do not apply; no downgrade needed.
- **Upstash Redis provisioned** — `calm-spider-187203.upstash.io` (EU). `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set on both projects × Production + Preview. Distributed rate limiting active on next deploy.
- **Admin ACL wired** — `ADMIN_EMAILS=kouril.lukas@gmail.com` and `OWNER_EMAIL=kouril.lukas@gmail.com` set on both projects × Production + Preview. Owner still needs to log in and verify `/dev` gates (moved to the launch-prerequisites list).
- **Sentry live** — DSN set on both projects × Production + Preview. EU region (Germany). SDK is DSN-gated + lazy-loaded, `sendDefaultPii: false`, 10% trace sampling, no Session Replay.
- **PostHog live** — `phc_…` project key set on both projects × Production + Preview. EU Cloud, reverse-proxied through the same-origin `/ingest` path (`vercel.json` rewrites), `respect_dnt: true`, `person_profiles: 'identified_only'`, no autocapture of sensitive fields.
- **Supabase leaked-password protection enabled** — Auth advisor no longer flags the WARN.
- **`studyshark-app` Preview-env parity fixed** — added the 4 shared credentials (`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) that were previously Production-only, so preview deploys of StudyShark now work.
- **Sharkira hint UI hidden and AI features shelved** — `false &&` gate in `client/src/components/Quiz.tsx` `sharkiraEligible` hides the entry point; no paid model API key is configured. Both AI explanations and Sharkira hints are intentionally not on the open todo list. Backend wiring, translations, request path, and `question_hints` cache table stay in place so they can be reactivated later without new plumbing.
- **`.claude/settings.local.json` untracked and gitignored** — per-machine Bash-permission allowlist stays local; the tracked copy was removed from history-going-forward.
- **35 stale `claude/*` branches cleaned up** — 24 fully-merged branches deleted directly; 11 with unique commits reviewed as draft PRs #92–#102, all closed by the owner as superseded and their branches deleted. Zero `claude/*` branches remain on the remote.
- **Repo audited for public visibility** — no committed secrets in HEAD or history (no service-role key, session secret, Upstash token, OpenAI key, or Sentry auth token has ever been in the repo). Personal email and Supabase project ref are intentionally left in tracked files: the email is already the public git-author, and the project ref is already exposed in the deployed JS bundle by design.
- **Migration 024 applied** — `schema_024_daily_habit_freeze_badges_cards` recorded at `20260728211046`. Six new tables live (`user_streak_config`, `user_streak_freezes`, `user_badges`, `user_cards`, `daily_queue_completions`, `question_hints`), the freeze-aware `record_verified_quiz_result_v2` and spaced-mastery `complete_verified_roadmap_attempt` bodies replaced, `delete_user_data` extended to cover the new tables. Both `/api/health` return HTTP 200 with `rateLimiter: configured`.
- **Supabase Auth redirect allowlist fixed** — Site URL set to `https://devshark.app`; Redirect URLs list includes both product domains and `http://localhost:5173/**`. Signing in on either product now lands the user back on the same domain (the client's `redirectTo: window.location.origin` is respected).
- **Google OAuth enabled** — provider is configured in Supabase Authentication → Providers and sign-in works end-to-end. The Google consent screen currently reads "to continue to rvlybcjdpafwyeuojvhl.supabase.co" because Google shows the domain of the redirect_uri, which is Supabase's callback host. Changing that string to `devshark.app` needs a Supabase Custom Domain (paid tier), documented separately below.

## Developer tooling

- [ ] **Install and initialize RTK (`rtk-ai/rtk`)** — RTK could not be set up from the Claude Code web session because its GitHub download host is outside the session's network allowlist (`github.com/rtk-ai/rtk` and its release binaries return HTTP 403). Set it up locally at home with the commands below, then enable it for this repository following `rtk --help` / the RTK docs (the exact per-repo command isn't documented here because the tool wouldn't install in the sandbox). `[imp:2]` `[owner:me]` `[time:20m]` `[kind:setup]`
- [ ] **Enable Vercel Web Analytics for this project** — turn on Web Analytics in the Vercel project so OwnDashboard's project Overview shows visitors and page views (it reads them via the Vercel API, matched by this repository). `[imp:2]` `[owner:me]` `[time:15m]` `[kind:setup]`

```sh
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
rtk init --global
```
