# MANUAL_STEPS — owner walkthrough

Each step is owner-only (accounts, credentials, legal, licensing, or a physical smoke test). Do them in order of **importance**: `[imp:5]` blocks a safe public launch. Where the step ends with **→ tell me** you can hand a fact back to me and I can continue from there.

Supabase project ref: `rvlybcjdpafwyeuojvhl`
Vercel projects: StudyShark at `https://studyshark-app.vercel.app`, devShark at `https://devshark.app`

---

## imp:5 — production launch prerequisites

### 1. Apply migration 024 (NEEDED #9) — **can be delegated to me once Supabase MCP is authenticated**

If you'd rather do it by hand: open Supabase Studio → SQL Editor → paste the contents of `supabase/supabase-schema-024.sql` → Run. It is additive and idempotent. Then hit `https://studyshark-app.vercel.app/api/health` and `https://devshark.app/api/health` — both must return 200 and the response should no longer say `migration_required`.

→ **tell me** when the MCP is authenticated (`claude /mcp` in a regular terminal) and I'll do it and verify.

### 2. Authorize production admins (NEEDED #10)

Two options; pick one:

**Option A — env var (fastest).** Vercel → each project → Settings → Environment Variables. Add `ADMIN_EMAILS` = comma-separated list of admin emails. Set on **Production** + **Preview**. Redeploy each project (Vercel → Deployments → ⋯ → Redeploy).

**Option B — Supabase metadata (best for changing admins later).** Supabase → Authentication → Users → find each admin → Edit user → set `app_metadata` to `{"role":"admin"}`. No redeploy needed.

**Verify:** log in with an admin account → `/dev` loads. Log in with a non-admin account → `/dev` returns 403.

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

### 4. Legal / privacy review (NEEDED #13)

Edit these files with your real details (do not leave placeholder text):
- `client/public/privacy.html` (if that's where privacy lives — search `client/public/` and `client/src/components/legal/` if unsure)
- Anything under `docs/legal/` if present.

Must include: controller/operator identity + contact, retention periods (align with the purge cron below), lawful bases, processor/transfer disclosures, age policy, analytics consent behavior, Czech version.

Keep support, analytics, replay, and AI **disabled** until this file matches production reality (SUPPORT_ENABLED, PostHog/Sentry, `AI_EXPLANATIONS_ENABLED`, `AI_HINTS_ENABLED`).

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
- New from migration 024: Today queue + once-per-day Shark Card pack grant, a level going cleared → mastered across separate days, a streak freeze bridging a missed day, badge sync, read-only advisor, adaptive placement (with "I don't know yet"), a Sharkira hint (AI off, curated only), devShark typing racer.

→ **tell me** any failure and I'll fix. If everything passes, tell me and I'll clear this from NEEDED.md.

---

## imp:4 — production reliability

### 6. Upstash Redis for distributed rate limiting (NEEDED #18)

Sign up at `https://console.upstash.com` → Create Database → Redis → **choose EU region** (matches user base + privacy) → copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Vercel → both projects → Settings → Environment Variables → add both, Production + Preview → redeploy.

**Verify:** `/api/health` response should now report distributed rate limiting = configured. Hit any rate-limited endpoint quickly (e.g. quiz submit) 20× and confirm the 429s are enforced.

### 7. External `/api/health` monitor (NEEDED #19)

Pick one:
- **Uptime Robot** (free, 5-min intervals): add HTTP monitors for both `/api/health` URLs, alert on non-200.
- **Better Stack**, **Cronitor**, or any tool you already use.

Notify channel: email works; Slack/Telegram integration is optional.

### 8. Schedule daily purge (NEEDED #20) — **delegated to me once MCP is authenticated**

The retention decision is yours first: how many days should soft-deleted quiz attempts, expired play sessions, etc. survive? Read `supabase/supabase-schema-024.sql` for the current defaults inside `purge_expired_learning_data()`.

→ **tell me** your retention policy (or "use current defaults") and I'll schedule it via pg_cron.

### 9. Verified backups + restore drill (NEEDED #21)

Follow `docs/backup-restore.md`. Choose your RPO/RTO (e.g. "≤ 24h data loss, ≤ 1h restore") and record them at the top of that file. Do one restore drill into a Supabase branch database (not production) to confirm the runbook works end-to-end.

### 10. Sentry and/or PostHog (NEEDED #22) — optional

Only enable if you actually want them. If yes:
- Sentry: create project → paste DSN in `SENTRY_DSN` env var → enable EU region → **verify the scrub config** so no tokens, emails, submitted answers, or answer proofs are captured. Add breadcrumb ignore-list for `/api/quiz/*` request/response bodies.
- PostHog: same principle; EU cloud; scrub sensitive properties; capture only non-PII events.

Legal disclosure must match (see step 4).

---

## imp:3 — brand / launch assets

### 11. Custom StudyShark domain (NEEDED #26)

If you want one instead of the current `studyshark-app.vercel.app`:
1. Buy / point the DNS at Vercel.
2. Vercel → StudyShark project → Settings → Domains → add domain.
3. Update `VITE_STUDYSHARK_URL` env var on **both** Vercel projects.
4. Add the new origin + `/auth/v1/callback` to Google OAuth (step 3).
5. Redeploy both.
6. Verify cross-links in the shared footer point at the new domain.

### 12. Replace placeholder icons + social artwork (NEEDED #27)

Files to swap: `client/public/icon.svg`, `client/public/apple-touch-icon.png`, `client/public/pwa-*.png`, `client/public/og-image.png`. Use **licensed** Shark-family assets (I cannot generate these without confirmed rights per CLAUDE.md).

Verify: `/` on both domains → view page source → `og:image` resolves; iOS "Add to Home Screen" preview looks right; Chrome install prompt icon looks right.

→ **tell me** the licensed source and I can drop them in + verify metadata.

### 13. Compare committed portfolio preview to live devShark (NEEDED #36)

Open `media/preview-poster.png` (in the repo) and `https://devshark.app` (live) side by side. Confirm they match. If they don't, re-record per `.claude/skills/preview-video/SKILL.md` — specifically, make sure `VITE_LOCK_SUBJECT=webdev` is set before capture; without it the client silently renders the StudyShark landing under devShark branding.

→ **tell me** the outcome. If mismatched I can re-record from a local run.

### 14. Voluntary support toggle (NEEDED #40)

Only after legal/accounting review. Set `SUPPORT_ENABLED=true` on both projects, then use `/dev` to enter provider URLs, target, amount covered, cost breakdown, update date, and public-thanks policy. Support has no effect on access or ranking — that constraint is server-owned.

---

## imp:2 — tooling / optional features

### 15. AI explanations (NEEDED #41) — optional

Pick provider (OpenAI most likely) and daily spend cap. Set on both projects:
- `AI_EXPLANATIONS_ENABLED=true`
- `OPENAI_API_KEY=…`
- `OPENAI_MODEL=…` (recommend a small model to start — `gpt-4o-mini` or newer equivalent)
- `AI_DAILY_GENERATION_LIMIT=…` (start low, e.g. 100)

Monitor Supabase logs for cached vs generated usage over a week before raising the cap.

### 16. AI Sharkira hints (NEEDED #42) — optional, independent of #15

Same env pattern:
- `AI_HINTS_ENABLED=true`
- Reuses `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_DAILY_GENERATION_LIMIT` (shared budget with #15).

Off is the default. When off, Sharkira degrades to curated question-context hints only. Hints are cached in `question_hints` (added by migration 024) so budget is spent once per question. Hints are hidden during placement, daily challenge, and survival Challenge.

### 17. Install RTK (NEEDED #58)

At home (not from the sandbox — sandbox can't reach the RTK release host):

```sh
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
rtk init --global
```

Then follow `rtk --help` for the per-repo enable command. → **tell me** what enabling it changes in the repo and I can review.

### 18. Enable Vercel Web Analytics (NEEDED #59)

Vercel → each project → Analytics → **Enable Web Analytics**. Nothing else to change; the client already sends signals if the project has analytics on. This makes OwnDashboard's project Overview show visitors + page views.

### 19. Resolve Supabase Auth password warning (NEEDED #12) — **delegated to me once MCP is authenticated**

Only two right answers:
- **A.** Turn on leaked-password protection in Auth settings (keep password sign-ups).
- **B.** Disable password sign-ups entirely; Google OAuth becomes the only login.

→ **tell me** A or B and I'll flip the setting through the MCP.

---

## imp:1 — after usage grows

### 20. Monthly scaling review (NEEDED #46)

Once traffic is meaningful (>1k daily active), reread `scaling.md` monthly. Watch Supabase compute utilization; add retention/partitioning for event tables before they get big; redesign multiplayer fan-out before large classrooms or high concurrent-room counts.

---

## What I need from you to keep unblocking things

1. Authenticate Supabase MCP: run `claude /mcp` in a **regular terminal** (not the IDE), pick supabase, complete OAuth. This unlocks steps 1, 8, 19 for me to do directly.
2. Decide step 19 (A or B) and step 8 retention.
3. Tell me the outcome of step 13 (poster vs. live).
4. Decide steps 11 (custom domain), 15/16 (AI enable), and provide licensed assets for step 12 if you want me to install them.
