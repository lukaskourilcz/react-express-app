# Shark ecosystem launch runbook

This is the operational source of truth for the current web launch. `LAUNCH.md`
is a historical audit and may describe issues that have since been resolved.

## Release contract

- The repository must contain exactly 12 files below `api/` so the Vercel Hobby
  function budget is not exceeded.
- StudyShark contains geography, mathematics, history, biology, chess, and
  poker. It never serves `webdev` categories or public developer-topic pages.
- devShark is the same web codebase deployed with a locked `webdev` scope. It
  never serves a StudyShark subject.
- Support is optional and disabled by default. No learning flow, score, feature,
  or account action is conditioned on payment.
- AI explanations are optional, post-answer only, and absent unless all four
  server gates (`AI_EXPLANATIONS_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
  `AI_DAILY_GENERATION_LIMIT`) are present. The database enforces the UTC-day
  generation ceiling atomically. Curated answers remain authoritative.
- Native mobile apps are out of scope for this release.

## Deployment matrix

| Setting | StudyShark | devShark |
|---|---|---|
| `VITE_PRODUCT` | `studyshark` | `devshark` |
| `PRODUCT_ID` | `studyshark` | `devshark` |
| `VITE_LOCK_SUBJECT` | unset | `webdev` |
| `PRODUCT_SUBJECT` | unset | `webdev` |
| Canonical URL | `VITE_STUDYSHARK_URL` | `VITE_DEVSHARK_URL` |

Set `VITE_STUDYSHARK_URL` and `VITE_DEVSHARK_URL` on both deployments. General
subject brands are internal StudyShark links and have no separate deployment or
URL. Configure the same Supabase project only if shared accounts and progress
are intended. Product scope is still enforced independently by every
question-producing API.

## Required production environment

Use `client/.env.example` as the complete key list. At minimum configure the
Supabase URL, anon key, service-role key, a random `SESSION_SECRET` of at least
32 characters, product identity, canonical URLs, and `ADMIN_EMAILS` (or an
`admin` app-metadata role). Configure Upstash for distributed rate limiting.
Never expose service, OpenAI, or Upstash credentials through a `VITE_` key.

Google OAuth must allow both production origins and their callback URLs.
Supabase Realtime must be enabled for multiplayer Broadcast channels. The app
automatically uses a short polling fallback while Realtime is disconnected and
a slow healing poll while connected.

## Database rollout

1. Take and verify a backup using `docs/backup-restore.md`.
2. Apply migrations 001–020 if the environment does not already contain them.
3. Apply `supabase-schema-021.sql`, `supabase-schema-022.sql`,
   `supabase-schema-023.sql`, then `supabase-schema-024.sql`, in one
   controlled release window.
4. Confirm `quiz_attempts`, `question_explanations`, `user_question_history`,
   `verified_activity_awards`, `roadmap_attempts`, `roadmap_attempt_answers`,
   `verified_skill_checks`,
   `question_quality_suggestions`, `ai_generation_budget`, and
   `quiz_submissions` exist. Confirm the migration-024 tables
   `user_streak_config`, `user_streak_freezes`, `user_badges`, `user_cards`,
   `daily_queue_completions`, and `question_hints` exist. Confirm `matches` and
   `flashcards` have a valid `subject` column.
5. Confirm `record_verified_quiz_result_v2`, `record_verified_activity_xp`,
   `complete_verified_roadmap_attempt`, `apply_verified_skill_check`, `daily_leaderboard_v2`,
   `claim_ai_generation_budget`, `claim_quiz_submission`,
   `record_roadmap_answer`, `purge_expired_learning_data`,
   `refresh_streak_freezes`, `sync_user_badges`, `grant_daily_queue_cards`, and
   `delete_user_data` exist.
6. Confirm browser roles cannot mutate protected stats, multiplayer answer-key,
   reports, flashcard, roadmap, streak, or XP tables directly.

Migrations 021–023 are idempotent. Legacy daily/challenge rows are assigned
to `webdev`; no existing progress is deleted. Do not casually restore removed browser write
policies during rollback: they are the controls that prevent client-authored
scores and answer-key access.

## Preflight

Run from the repository root:

```sh
npm ci
npm ci --prefix client
npm audit --omit=dev
npm audit --omit=dev --prefix client
npm run typecheck:api
npm run test:launch
npm run build
git diff --check
```

`test:launch` verifies product resolution, scope isolation, token
confidentiality/tamper detection, rate limiting, the health contract, and the
12-function budget. The Vite build also creates metadata-specific static HTML
shells for only the public topic pages allowed on that deployment.

## Preview smoke test

Test in English and Czech, desktop and a narrow mobile viewport:

1. Open Home, Subject Picker, Learn, Quiz, Flashcards, Play, Profile, Support,
   Privacy, and Terms. Verify header/footer branding and keyboard focus.
2. On StudyShark, verify no developer subject/topic appears. On devShark,
   verify no geography, math, history, biology, chess, or poker question appears.
3. Complete a quiz. Refresh and confirm subject-scoped XP/stats increment once.
   Re-submit the same receipt and confirm totals do not increment again. Start
   “Review weak areas” and confirm only the active subject is selected.
4. Confirm review answers use the two-column desktop grid, readable status
   colors, and optional AI only after grading.
5. Create and join a multiplayer room in two sessions. Test start, answer,
   reconnect, finish, and a Realtime-disconnected fallback.
6. Complete a Daily and a Challenge run. Confirm each leaderboard is scoped to
   the active subject and repeated completion cannot award XP twice.
7. Sign into `/dev` as an allowed admin and confirm a normal user is rejected.
8. Delete a disposable account and verify auth identity plus owned rows are gone.
9. Request `/api/health`; production must return 200 only when its public
   database check and service-role migration-023 check succeed. Confirm the
   response reports distributed rate limiting as configured and alert on 503.
10. If Support is enabled, verify the public target, costs, received amount,
    carry, provider, and separate StudyShark/devShark explanation are truthful.

## Release and observation

Merge or push only after preflight and preview smoke tests pass. Watch Vercel
function errors/latency, `/api/health`, Supabase database/realtime health,
rate-limit 429 volume, login failures, quiz submit failures, multiplayer
reconnects, and account deletion errors for at least 30 minutes. Never include
access tokens, emails, answer tokens, or submitted answer text in logs.

## Rollback

For a client/API regression, roll Vercel back to the prior known-good deployment
and keep migrations 021–023 in place. The schema changes are backward-compatible,
while its revoked policies are security-critical. If an older release depends
on a removed direct browser write, forward-fix that release or deploy the
current API; do not reopen the table as an emergency shortcut.

For a database regression, stop writes, preserve logs and the current database,
then restore the verified pre-migration backup into a separate project first.
Validate row counts and smoke tests there before changing production DNS/env.
Record the incident timeline, affected operations, recovery point, and follow-up
control. See `docs/backup-restore.md` for the exact restoration sequence.

## Legal and privacy launch gate

The in-app Privacy and Terms pages are implementation-ready templates, not a
substitute for jurisdiction-specific legal review. Before public launch, the
operator must confirm controller identity/contact, lawful bases, retention,
processors, international transfers, age policy, analytics consent behavior,
and the support provider’s terms. Keep optional analytics and AI off until the
published disclosure matches their actual configuration.
