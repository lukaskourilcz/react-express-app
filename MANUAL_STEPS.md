# MANUAL_STEPS — owner walkthrough

Each step is owner-only (accounts, credentials, legal, licensing, or a physical smoke test). Do them in order of **importance**: `[imp:5]` blocks a safe public launch. Where the step ends with **→ tell me** you can hand a fact back to me and I can continue from there.

Supabase project ref: `rvlybcjdpafwyeuojvhl`
Vercel projects: StudyShark at `https://studyshark-app.vercel.app`, devShark at `https://devshark.app`

Resolved on 2026-07-28 (do not repeat): Upstash Redis provisioned and wired, admin ACL env vars set on both projects, Sentry + PostHog live on both projects with EU regions and privacy-forward defaults, Supabase leaked-password protection enabled. See the "Recorded decisions (2026-07-28)" section in `NEEDED.md` for the full list.

---

## imp:5 — production launch prerequisites

### 1. Apply migration 024 (NEEDED #9) — **can be delegated to me: Supabase MCP is authenticated**

If you'd rather do it by hand: open Supabase Studio → SQL Editor → paste the contents of `supabase/supabase-schema-024.sql` → Run. It is additive and idempotent. Then hit `https://studyshark-app.vercel.app/api/health` and `https://devshark.app/api/health` — both must return 200 and the response should no longer say `migration_required`.

→ **tell me** "apply 024" and I'll do it through the MCP and verify both `/api/health` responses.

### 2. Verify admin ACL end-to-end (NEEDED, launch prerequisites)

Env vars are already set: `ADMIN_EMAILS=kouril.lukas@gmail.com` and `OWNER_EMAIL=kouril.lukas@gmail.com` on both projects × Production + Preview. Redeployment is not required (next deploy picks them up; the current deploy may still be pre-set).

Sign in with `kouril.lukas@gmail.com` on one product → `/dev` should load. Sign in with any other Google account on the same product → `/dev` should return 403. Repeat on the other product.

If you want a second admin, add their email to `ADMIN_EMAILS` (comma-separated) or set their Supabase user `app_metadata.role = "admin"`.

### 3. Configure Google OAuth (NEEDED #11)

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web application).

Add these **Authorized JavaScript origins**:
- `https://studyshark-app.vercel.app`
- `https://devshark.app`
- your local dev origin if you use one (e.g. `http://localhost:5173`)
- any preview origins you want to support (Vercel preview URLs are per-deploy, so decide whether to whitelist)

Add matching **Authorized redirect URIs** (append `/auth/v1/callback` — Supabase's OAuth callback):
- `https://rvlybcjdpafwyeuojvhl.supabase.co/auth/v1/callback`

Then Supabase → Authentication → Providers → Google → paste the Client ID + Client Secret → Enable → Save.

**Verify:** sign in with a **disposable** Google account on both products, then request account deletion from Profile → Delete Account. Delete the account from Google after.

### 3a. Fix the Supabase Auth redirect allowlist (NEEDED, launch prerequisites)

Symptom: signing in on `devshark.app` lands you on `https://react-express-app-five.vercel.app/#` (or any other Vercel alias of the same project). The client already sets `redirectTo: window.location.origin` in `client/src/lib/auth.tsx`, but Supabase discards that value when the URL isn't in its allowlist, and then uses Site URL as the fallback.

Open `https://supabase.com/dashboard/project/rvlybcjdpafwyeuojvhl/auth/url-configuration`.

Set **Site URL** to:
- `https://devshark.app`

Add to **Redirect URLs**:
- `https://devshark.app`
- `https://devshark.app/**`
- `https://studyshark-app.vercel.app`
- `https://studyshark-app.vercel.app/**`
- `http://localhost:5173/**`

Save. Sign out, sign back in from each product, and confirm you land back on the same domain both times.

### 4. Legal / privacy review (NEEDED #13)

Edit these files with your real details (do not leave placeholder text):
- `client/public/privacy.html` (if that's where privacy lives — search `client/public/` and `client/src/components/legal/` if unsure)
- Anything under `docs/legal/` if present.

Must include: controller/operator identity + contact, retention periods (align with the purge cron below), lawful bases, processor/transfer disclosures, age policy, analytics consent behavior, Czech version.

Sentry and PostHog are now live in production — the disclosure text must name them (processor, region, retention) before the terms page is truthful. Keep support and AI features disabled until this file matches production reality (`SUPPORT_ENABLED`, `AI_EXPLANATIONS_ENABLED`, `AI_HINTS_ENABLED`).

→ **tell me** when it's drafted and I can review for consistency with product behavior + EN/CS parity.

### 5. Signed-in production smoke test (NEEDED #14)

Do this last, after 1–4. Run it in **EN and CS**, on **desktop and a phone**, signed in with a fresh account:

- Learn: complete one path level.
- Quiz: submit a wrong answer, then re-play — should be rejected as a replay.
- Daily challenge: play twice in a row — second attempt should be idempotent (no double XP).
- Flashcards.
- Play + Classroom: run two-session with two browsers.
- Leaderboards render.
- `/dev` accessible as admin, denied as non-admin.
- Account deletion from Profile.
- New from migration 024: Today queue + once-per-day Shark Card pack grant, a level going cleared → mastered across separate days, a streak freeze bridging a missed day, badge sync, read-only advisor, adaptive placement (with "I don't know yet"), devShark typing racer.
- Sharkira hint: currently UI-hidden by design — the affordance should not appear.

→ **tell me** any failure and I'll fix. If everything passes, tell me and I'll clear this from NEEDED.md.

---

## imp:4 — production reliability

### 6. External `/api/health` monitor (NEEDED #19)

Pick one:
- **Uptime Robot** (free, 5-min intervals): add HTTP monitors for both `/api/health` URLs, alert on non-200.
- **Better Stack**, **Cronitor**, or any tool you already use.

Notify channel: email works; Slack/Telegram integration is optional.

### 7. Schedule daily purge (NEEDED #20) — **delegated to me (Supabase MCP is authenticated)**

The retention decision is yours first: how many days should soft-deleted quiz attempts, expired play sessions, etc. survive? Read `supabase/supabase-schema-024.sql` for the current defaults inside `purge_expired_learning_data()`.

→ **tell me** your retention policy (or "use current defaults") and I'll schedule it via pg_cron.

### 8. Verified backups + restore drill (NEEDED #21)

Follow `docs/backup-restore.md`. Choose your RPO/RTO (e.g. "≤ 24h data loss, ≤ 1h restore") and record them at the top of that file. Do one restore drill into a Supabase branch database (not production) to confirm the runbook works end-to-end.

### 9. Confirm Sentry + PostHog capture no PII (NEEDED #22)

Both are already wired with privacy-forward defaults:
- **Sentry**: EU region (Germany DSN), `sendDefaultPii: false`, 10% trace sampling, no Session Replay.
- **PostHog**: EU Cloud, reverse-proxied through same-origin `/ingest`, `respect_dnt: true`, `person_profiles: 'identified_only'`, no autocapture of sensitive fields.

Reproduce one client error (e.g. throw from the console in prod) and one routine pageview signed in, then inspect the received events in each dashboard. Confirm no submitted answer, no answer proof, no auth token, and no email appears in the payload. If any does, tell me which field and I'll add a scrub.

→ **tell me** the result. If clean, I'll clear this from NEEDED.md.

---

## imp:3 — brand / launch assets

### 10. Custom StudyShark domain (NEEDED #26)

If you want one instead of the current `studyshark-app.vercel.app`:
1. Buy / point the DNS at Vercel.
2. Vercel → StudyShark project → Settings → Domains → add domain.
3. Update `VITE_STUDYSHARK_URL` env var on **both** Vercel projects.
4. Add the new origin + `/auth/v1/callback` to Google OAuth (step 3).
5. Redeploy both.
6. Verify cross-links in the shared footer point at the new domain.

### 11. Replace placeholder icons + social artwork (NEEDED #27)

Files to swap: `client/public/icon.svg`, `client/public/apple-touch-icon.png`, `client/public/pwa-*.png`, `client/public/og-image.png`. Use **licensed** Shark-family assets (I cannot generate these without confirmed rights per CLAUDE.md).

Verify: `/` on both domains → view page source → `og:image` resolves; iOS "Add to Home Screen" preview looks right; Chrome install prompt icon looks right.

→ **tell me** the licensed source and I can drop them in + verify metadata.

### 12. Compare committed portfolio preview to live devShark (NEEDED #36)

Open `media/preview-poster.png` (in the repo) and `https://devshark.app` (live) side by side. Confirm they match. If they don't, re-record per `.claude/skills/preview-video/SKILL.md` — specifically, make sure `VITE_LOCK_SUBJECT=webdev` is set before capture; without it the client silently renders the StudyShark landing under devShark branding.

→ **tell me** the outcome. If mismatched I can re-record from a local run.

### 13. Voluntary support toggle (NEEDED #40)

Only after legal/accounting review (step 4). Set `SUPPORT_ENABLED=true` on both projects, then use `/dev` to enter provider URLs, target, amount covered, cost breakdown, update date, and public-thanks policy. Support has no effect on access or ranking — that constraint is server-owned.

---

## imp:2 — tooling / optional features

### 14. AI explanations (NEEDED #41) — optional

Pick provider (OpenAI most likely) and daily spend cap. Set on both projects:
- `AI_EXPLANATIONS_ENABLED=true`
- `OPENAI_API_KEY=…`
- `OPENAI_MODEL=…` (recommend a small model to start — `gpt-4o-mini` or newer equivalent)
- `AI_DAILY_GENERATION_LIMIT=…` (start low, e.g. 100)

Monitor Supabase logs for cached vs generated usage over a week before raising the cap.

### 15. AI Sharkira hints (NEEDED #42) — optional, currently hidden in UI

The entry point is intentionally hidden today: `sharkiraEligible` in `client/src/components/Quiz.tsx` starts with `false &&`. To restore:

1. Drop the leading `false &&` in that expression.
2. Optionally set `AI_HINTS_ENABLED=true` on both projects to add live generation (reuses `OPENAI_API_KEY`, `OPENAI_MODEL`, and `AI_DAILY_GENERATION_LIMIT` — shared budget with #14). When left off, Sharkira degrades to curated question-context hints only.

Hints are cached in `question_hints` (added by migration 024) so live budget is spent once per question. Hints are hidden during placement, daily challenge, and survival Challenge regardless of the toggle.

### 16. Install RTK (NEEDED #58)

At home (not from the sandbox — sandbox can't reach the RTK release host):

```sh
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
rtk init --global
```

Then follow `rtk --help` for the per-repo enable command. → **tell me** what enabling it changes in the repo and I can review.

### 17. Enable Vercel Web Analytics (NEEDED #59)

Vercel → each project → Analytics → **Enable Web Analytics**. Nothing else to change; the client already sends signals if the project has analytics on. This makes OwnDashboard's project Overview show visitors + page views.

---

## imp:1 — after usage grows

### 18. Monthly scaling review (NEEDED #46)

Once traffic is meaningful (>1k daily active), reread `scaling.md` monthly. Watch Supabase compute utilization; add retention/partitioning for event tables before they get big; redesign multiplayer fan-out before large classrooms or high concurrent-room counts.

---

## What I need from you to keep unblocking things

1. Say "apply 024" and I'll do step 1 through the MCP.
2. Decide step 7 retention (or say "use current defaults") and I'll schedule the cron.
3. Tell me the outcome of step 2 (admin ACL login test), step 9 (Sentry + PostHog PII inspection), and step 12 (poster vs. live).
4. Decide steps 10 (custom domain), 14/15 (AI enable), and provide licensed assets for step 11 if you want me to install them.
