# MANUAL_STEPS — owner walkthrough

Each step is owner-only (accounts, credentials, licensing, or a physical smoke test). Do them in order of **importance**: `[imp:5]` blocks a safe public launch. Where the step ends with **→ tell me** you can hand a fact back to me and I can continue from there.

Supabase project ref: `rvlybcjdpafwyeuojvhl`
Vercel projects: StudyShark at `https://studyshark-app.vercel.app`, devShark at `https://devshark.app`

Resolved on 2026-07-28 (do not repeat): migration 024 applied, Google OAuth enabled and working, Supabase Auth Site URL + Redirect URLs allowlist fixed, Upstash Redis provisioned and wired, admin ACL env vars set on both projects, Sentry + PostHog live on both projects with EU regions and privacy-forward defaults, Supabase leaked-password protection enabled. Admin-ACL end-to-end verification and legal/privacy review were dropped from this tracked list by owner decision; see "Recorded decisions (2026-07-28)" in `NEEDED.md` for context on both.

---

## imp:4 — production reliability

### 1. Signed-in production smoke test (NEEDED)

Run it in **EN and CS**, on **desktop and a phone**, signed in with a fresh account:

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

### 2. External `/api/health` monitor (NEEDED #19)

Pick one:
- **Uptime Robot** (free, 5-min intervals): add HTTP monitors for both `/api/health` URLs, alert on non-200.
- **Better Stack**, **Cronitor**, or any tool you already use.

Notify channel: email works; Slack/Telegram integration is optional.

### 3. Verified backups + restore drill (NEEDED #21)

Follow `docs/backup-restore.md`. Choose your RPO/RTO (e.g. "≤ 24h data loss, ≤ 1h restore") and record them at the top of that file. Do one restore drill into a Supabase branch database (not production) to confirm the runbook works end-to-end.

### 4. Confirm Sentry + PostHog capture no PII (NEEDED #22)

Both are already wired with privacy-forward defaults:
- **Sentry**: EU region (Germany DSN), `sendDefaultPii: false`, 10% trace sampling, no Session Replay.
- **PostHog**: EU Cloud, reverse-proxied through same-origin `/ingest`, `respect_dnt: true`, `person_profiles: 'identified_only'`, no autocapture of sensitive fields.

Reproduce one client error (e.g. throw from the console in prod) and one routine pageview signed in, then inspect the received events in each dashboard. Confirm no submitted answer, no answer proof, no auth token, and no email appears in the payload. If any does, tell me which field and I'll add a scrub.

→ **tell me** the result. If clean, I'll clear this from NEEDED.md.

---

## imp:3 — brand / launch assets

### 5. Rebrand the Google consent screen (currently reads "to continue to rvlybcjdpafwyeuojvhl.supabase.co")

The domain string on Google's "Sign in — to continue to X" screen comes from the OAuth callback host, which is Supabase's default `<ref>.supabase.co`. Two ways to change it:

**Quick fix — brand the consent screen (free, does not change the domain line but improves the top of the screen):**
Google Cloud Console → APIs & Services → OAuth consent screen → Edit App:
- App name: `devShark` (or `StudyShark`, whichever is your primary brand)
- User support email: your gmail
- App logo: upload the same asset used in step 7
- Application home page: `https://devshark.app`
- Application privacy policy: link to your privacy page once written
- Application terms of service: link to your terms page once written
- Authorized domains: add `devshark.app` and `studyshark-app.vercel.app`

Save. The screen now reads "Sign in to devShark" at the top; the "to continue to …supabase.co" line stays because that's the callback host.

**Full fix — Supabase Custom Domain (paid, changes the domain line):**
Requires Supabase Pro tier or higher. Custom Domains lets you serve Supabase Auth from `auth.devshark.app` (CNAME to Supabase). Once configured:
1. Supabase → Project Settings → Custom Domains → add `auth.devshark.app`
2. Add the DNS CNAME record Supabase gives you (usually to your registrar)
3. Wait for verification (SSL takes ~10 min)
4. In Google Cloud Console → OAuth Client → Authorized redirect URIs, add `https://auth.devshark.app/auth/v1/callback`
5. Google now shows "to continue to auth.devshark.app"

Not worth doing pre-launch unless the current Supabase-domain string is a real blocker.

### 6. Custom StudyShark domain (NEEDED #26)

If you want one instead of the current `studyshark-app.vercel.app`:
1. Buy / point the DNS at Vercel.
2. Vercel → StudyShark project → Settings → Domains → add domain.
3. Update `VITE_STUDYSHARK_URL` env var on **both** Vercel projects.
4. Add the new origin + `/auth/v1/callback` to Google OAuth authorized redirects and to the Supabase Auth Redirect URLs list.
5. Redeploy both.
6. Verify cross-links in the shared footer point at the new domain.

### 7. Replace placeholder icons + social artwork (NEEDED #27)

Files to swap: `client/public/icon.svg`, `client/public/apple-touch-icon.png`, `client/public/pwa-*.png`, `client/public/og-image.png`. Use **licensed** Shark-family assets (I cannot generate these without confirmed rights per CLAUDE.md).

Verify: `/` on both domains → view page source → `og:image` resolves; iOS "Add to Home Screen" preview looks right; Chrome install prompt icon looks right.

→ **tell me** the licensed source and I can drop them in + verify metadata.

### 8. Compare committed portfolio preview to live devShark (NEEDED #36)

Open `media/preview-poster.png` (in the repo) and `https://devshark.app` (live) side by side. Confirm they match. If they don't, re-record per `.claude/skills/preview-video/SKILL.md` — specifically, make sure `VITE_LOCK_SUBJECT=webdev` is set before capture; without it the client silently renders the StudyShark landing under devShark branding.

→ **tell me** the outcome. If mismatched I can re-record from a local run.

### 9. Voluntary support toggle (NEEDED #40)

Set `SUPPORT_ENABLED=true` on both projects, then use `/dev` to enter provider URLs, target, amount covered, cost breakdown, update date, and public-thanks policy. Support has no effect on access or ranking — that constraint is server-owned. Make sure your legal/terms page reflects the third-party providers before this ships publicly.

---

## imp:2 — tooling / optional features

### 10. Install RTK (NEEDED #58)

At home (not from the sandbox — sandbox can't reach the RTK release host):

```sh
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
rtk init --global
```

Then follow `rtk --help` for the per-repo enable command. → **tell me** what enabling it changes in the repo and I can review.

### 11. Enable Vercel Web Analytics (NEEDED #59)

Vercel → each project → Analytics → **Enable Web Analytics**. Nothing else to change; the client already sends signals if the project has analytics on. This makes OwnDashboard's project Overview show visitors + page views.

---

## imp:1 — after usage grows

### 12. Monthly scaling review (NEEDED #46)

Once traffic is meaningful (>1k daily active), reread `scaling.md` monthly. Watch Supabase compute utilization; add retention/partitioning for event tables before they get big; redesign multiplayer fan-out before large classrooms or high concurrent-room counts.

---

## What I need from you to keep unblocking things

1. Tell me the outcome of step 1 (production smoke test), step 4 (Sentry + PostHog PII inspection), and step 8 (poster vs. live).
2. Decide steps 5 (consent-screen upgrade path) and 6 (custom domain), and provide licensed assets for step 7 if you want me to install them.

Say "look into the desktop CLS" (or the mobile LCP) and I can profile the landing route from the Lighthouse baseline in `docs/perf/lighthouse-baseline-2026-07-28/` and propose fixes — those aren't owner-only, they're just not on this list because they're implementation work.

AI features (post-answer explanations, Sharkira Socratic hints) are intentionally not on this list — no paid model API is provisioned. Client wiring stays in the repo so they can be turned on later without new plumbing. Admin-ACL end-to-end verification and legal/privacy review are also off this list per owner decision; see NEEDED.md.
