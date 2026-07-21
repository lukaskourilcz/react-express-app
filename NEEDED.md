# NEEDED — owner actions

The repository implementation is complete for the current web brief. This file lists only work that requires your accounts, credentials, legal decisions, production data, or external services. Importance uses `[imp:1–5]`; `[imp:5]` blocks a safe public launch.

Production database migrations through `supabase-schema-023.sql` were applied and verified on 2026-07-21. The two production Vercel projects, product scopes, canonical cross-links, Supabase credentials, and session secrets are configured; both `/api/health` probes and both Learn scopes were verified on 2026-07-21.

## Before production launch

- [ ] **Authorize production admins** with `ADMIN_EMAILS` or Supabase `app_metadata.role=admin`, then verify `/dev` access with an admin and a non-admin account. Supabase URL/anon/service-role credentials and unique session secrets are already configured on both Vercel projects. `[imp:5]` `[owner:me]`
- [ ] **Configure Google OAuth** for every production and preview origin/callback you intend to support, then test sign-in and account deletion with a disposable account. `[imp:5]` `[owner:me]`
- [ ] **Resolve the Supabase Auth password warning.** If email/password sign-in remains enabled, turn on leaked-password protection in Auth settings; otherwise disable password sign-ups and keep Google OAuth as the supported login method. `[imp:4]` `[owner:me]`
- [ ] **Complete legal/privacy review.** Add the real controller/operator identity and contact, retention periods, lawful bases, processor/transfer disclosures, age policy, analytics consent behavior, and Czech terms. Keep support, analytics, replay, and AI disabled until the disclosure matches production. `[imp:5]` `[owner:me]`
- [ ] **Run the signed-in production smoke test** in English/Czech and desktop/mobile: Learn completion, Quiz replay rejection, Daily/Challenge idempotency, Flashcards, two-session Play/Classroom, leaderboards, `/dev`, and deletion. `[imp:4]` `[owner:me]`

## Production reliability

- [ ] **Create an Upstash Redis database** and set `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN` on both Vercel projects. The in-memory fallback is intentionally not a distributed production control. `[imp:4]` `[owner:me]`
- [ ] **Monitor `/api/health` externally** and alert on non-2xx. The probe now verifies public DB access, service-role access to migration 023, and reports whether distributed rate limiting is configured. `[imp:4]` `[owner:me]`
- [ ] **Schedule `select public.purge_expired_learning_data();`** daily with Supabase Cron or an equivalent owner job; choose and document retention periods before changing its defaults. `[imp:4]` `[owner:me]`
- [ ] **Configure verified backups and a restore drill** using `docs/backup-restore.md`; record the recovery point/time objectives you accept. `[imp:4]` `[owner:me]`
- [ ] **Enable Sentry and/or PostHog only if wanted**, configure the EU/privacy settings, scrub sensitive fields, and verify no token, email, submitted answer, or answer proof is captured. `[imp:3]` `[owner:me]`

## Brand and launch assets

- [ ] **Attach your preferred custom StudyShark domain, if wanted.** StudyShark is live at `https://studyshark-app.vercel.app`; devShark remains at `https://devshark.app`. After adding a custom domain, update `VITE_STUDYSHARK_URL` on both projects plus OAuth origins/callbacks, then redeploy both. `[imp:3]` `[owner:me]`
- [ ] **Replace placeholder icons and social artwork** (`client/public/icon.svg`, Apple/PWA icons, and `og-image.png`) with final licensed Shark-family assets and verify metadata on both domains. `[imp:3]` `[owner:me]`
- [ ] **Run Lighthouse/PageSpeed on both deployed products** at mobile and desktop widths; save the baseline Core Web Vitals before making traffic-driven optimization decisions. `[imp:2]` `[owner:me]`

## Optional features

- [ ] **Voluntary support:** set `SUPPORT_ENABLED=true` only after legal/accounting review, then enter truthful provider URLs, target, amount covered, cost breakdown, update date, and public-thanks policy through `/dev`. Support remains unrelated to access or ranking. `[imp:3]` `[owner:me]`
- [ ] **AI explanations:** choose a provider model and budget, then set `AI_EXPLANATIONS_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `AI_DAILY_GENERATION_LIMIT`. Start with a low daily cap and monitor cached versus generated usage. `[imp:2]` `[owner:me]`

## When usage grows

- [ ] Review [stack-and-scaling.md](./stack-and-scaling.md) monthly once traffic is meaningful. Upgrade Supabase compute before sustained saturation, add retention/partitioning for event tables, and redesign multiplayer fan-out before large classrooms or high concurrent-room counts. `[imp:1]` `[owner:me]`

Native iOS/Android work remains intentionally deferred; it is not a missing item for this web release.
