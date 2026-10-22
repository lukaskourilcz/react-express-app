# devShark operations runbook

How devShark is deployed, released, watched and rolled back. Release evidence goes in `docs/release-acceptance.md`; owner actions go in `NEEDED.md`.

## Production

| Item | Value |
|---|---|
| Site | https://devshark.app |
| Vercel project | `react-express-app`; deploys from `main` through the Vercel Git integration |
| Function region | `arn1` (`vercel.json`) |
| Node | 24 (CI and the React runner snapshot use Node 24; `package.json` accepts 22 to 24) |
| Supabase project | `rvlybcjdpafwyeuojvhl`, eu-north-1 |
| Schema | every migration through `supabase/supabase-schema-066.sql` |

Preview deployments use the production Supabase project. A preview that writes data writes production rows, so test on a preview with a disposable account and only when the change needs it.

## Release contract

- Exactly twelve physical TypeScript handlers under `api/`.
- The repository builds devShark only, with the `webdev` subject. A build or deployment configured for any other product fails in `resolveCatalogProductId`.
- devShark is freemium. `shared/tiers.ts` decides what every account may start and what needs Premium, and the server answers locked content with 402. Premium changes which content an account may start and nothing else. Checkout stays off until `BILLING_ENABLED=true`; Stripe billing (#221) is not live. `/support` redirects to `/premium`.
- Merchandise is off (`MERCH_ENABLED` in `shared/rewards.ts`); see [rewards](rewards-launch.md).
- devShark ships no AI feature. Coding hints are authored and end in documentation links.
- English only. Native apps are out of scope.

## Deployment identity

| Setting | Value |
|---|---|
| `VITE_PRODUCT` | `devshark` (or unset) |
| `PRODUCT_ID` | `devshark` (or unset) |
| `VITE_LOCK_SUBJECT` | `webdev` (or unset) |
| `PRODUCT_SUBJECT` | `webdev` (or unset) |

Set these for both Production and Preview; Vercel does not copy Production-only variables into previews. Any other value fails the build. Every question-producing API also enforces product scope on its own.

## Environment

`client/.env.example` lists the keys. Production needs at least the Supabase URL, anon key and service-role key, a random `SESSION_SECRET` of at least 32 characters, the product identity above, and `ADMIN_EMAILS` (or an `admin` app-metadata role). Configure Upstash (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) for distributed rate limiting; `/api/health` reports `in-memory-fallback` without it. Never expose the service-role key, `SESSION_SECRET`, the Stripe secrets, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_CLIENT_SECRET`, the Upstash credentials or any other server secret through a `VITE_` key.

Feature switches:

| Variable | Effect |
|---|---|
| `LEARNING_PATH_FDE_ENABLED=true` | Opens the FDE learning path. Unset in Production today, so the path is previewable only. |
| `BILLING_ENABLED=true` | Opens Premium checkout when every Stripe value is present. Off. |
| `REACT_RUNNER_SNAPSHOT_ID` | The Vercel Sandbox snapshot React grading runs on; needed in Production and Preview with Vercel OIDC ([React grading operations](react-grading-operations.md)). |
| `SPREADSHOP_API_KEY`, `SPREADSHOP_SHOP_ID` | Optional Spreadshop promotion note on Rewards. |

No Vercel environment sets `DEVSHARK_MARKETING_EXPORT_SECRET`, so the marketing export endpoint stays inactive.

Sign-in uses Google OAuth and email with a password. Google OAuth must allow `https://devshark.app` and its Supabase callback URL; email sign-in needs the Supabase SMTP and template set-up in `NEEDED.md` and [auth email templates](auth-email-templates.md). Supabase Realtime must be on for multiplayer Broadcast channels; the app falls back to short polling while Realtime is disconnected and keeps a slow healing poll while connected.

## Database rollout

1. Take and verify a backup ([backup and restore](backup-restore.md)).
2. Compare the environment's applied migrations with `supabase/`. A new environment applies `supabase/supabase-schema.sql`, then `supabase-schema-002.sql` through the newest file, in numeric order; `npm run test:sql` builds the schema the same way.
3. Apply a new migration to production before merging the code that needs it, and keep the routines the running code calls until that code is gone (`.claude/skills/supabase-migration/SKILL.md`).
4. Apply one file at a time. Each file wraps itself in `BEGIN` and `COMMIT` and is safe to re-run.
5. After applying, compare the new routines in production with the repository file (for example `md5(prosrc)` of each function) and check their grants: `service_role` only for server routines.
6. Browser roles must not be able to write protected stats, answer keys, reports, flashcards, roadmap, streak, XP or learning-path tables. `supabase/tests/010-schema-security.test.sql` and `158-rls-own-rows-only.test.sql` prove it locally.
7. Record the apply, with the backup it followed, in `docs/release-acceptance.md`.
8. `learning_path_attempts` keeps row level security **on** with **no** SELECT policy or grant for `authenticated`: it holds grading material, and owning a row is not a reason to read it. The other learning-path tables need the owner policy and the matching `GRANT SELECT`.
9. Each file's header says what it adds, what it needs and why the running code survives it. Never edit a file production has applied; write a forward migration.

Do not restore removed browser write policies during a rollback: they are the controls that keep scores and answer keys server-authored.

After deployment, `public.purge_expired_learning_data()` needs a schedule (Supabase Cron or another owner-controlled job).

## Preflight

Run the `verify` job locally before merging: `npm run ci:parity` (`--list` prints the plan, `--only` runs named steps, `--fast` skips the browser specs, the harness test and Storybook, and `--sql` adds the `sql` job against an empty Postgres in `DATABASE_URL`). CI's workflow `.github/workflows/quality.yml` runs the jobs `sql`, `quickjs`, `static`, `tests`, `coding` and `browser`; the aggregator `verify` passes only when the five non-SQL jobs pass, and branch protection requires `verify` and `sql`, for admins too.

The checks that matter most for a release:

- `npm run test:launch`: product resolution, scope isolation, token confidentiality and tamper detection, rate limiting, the health contract, the twelve-handler budget, and the learning-path invariants (the answer-free public manifest, the sealed attempt session, the service-only grading tables, and that no path writes XP or ordinary coding progress).
- `npm run test:paths`: the content validator, then every reference solution against its own visible and hidden assertions in the real sandbox. A task whose reference cannot pass is a task no learner can pass.
- `npm run test:coding`, `npm run test:sql`, `npm run build`, `npm run check:responsive`, both production dependency audits and `git diff --check`.

The Vite build creates metadata-specific static HTML shells for the public topic guides, the daily question pages and every coding task.

## Preview smoke test

In English, at desktop width and a narrow phone width:

1. Open Home, Today, Learn (each section), Quiz, Coding, Collection, Play, Leaderboard, Profile, Rewards, Premium, Privacy and Terms. Check header and footer branding and keyboard focus.
2. Complete a quiz. Refresh and confirm XP and stats increment once; resubmitting the same receipt changes nothing. Start "Review weak areas" and confirm it draws from your own weak categories.
3. Create and join a multiplayer room in two sessions. Test start, answer, reconnect, finish and the Realtime-disconnected fallback.
4. Complete a Daily and a Challenge run. Each leaderboard updates once, and a repeat completion awards no XP.
5. Sign in to `/dev` as an admin and confirm a normal account is refused.
6. Delete a disposable account and confirm the auth identity and owned rows are gone.
7. Request `/api/health`. It answers 200 only when the database check and the service-role check pass, and reports `rateLimiter: configured`; a 503 is an alert.
8. With a free account, and again signed out, confirm React level 13, a Premium coding challenge and the stage after a project's free stages each open the upgrade sheet.
9. With `LEARNING_PATH_FDE_ENABLED` set on the preview, walk the FDE path: read the outline signed out, sign in, start the path, open an activity, submit a wrong and a right answer, close the tab mid-draft and reopen it, then send the same idempotency key twice and confirm the second call replays the stored result. A free account opens the diagnostic and the first module and meets the upgrade sheet after that. A paused path keeps its evidence and leaves the queue, and removing the FDE specialization pauses it without deleting anything.
10. With the switch unset, confirm Learn levels, checkpoints, Coding, Today, Profile, XP and account deletion still work and the path says it is previewable.

## Release and observation

Merge only after preflight and the smoke checks the change needs pass. After the deploy, watch Vercel function errors and latency, `/api/health`, Supabase database and Realtime health, 429 volume, sign-in failures, quiz submit failures, multiplayer reconnects and account deletion errors for at least 30 minutes. Never put access tokens, emails, answer tokens or submitted answers in logs.

Two scheduled workflows watch production:

- `.github/workflows/health.yml` probes `/api/health` four times an hour and fails after two consecutive unhealthy answers.
- `.github/workflows/grading-monitor.yml` grades a reference and a wrong solution for one free JavaScript and one free React task every six hours, anonymously.

GitHub runs scheduled workflows on a best-effort basis (the health workflow ran 6 of 96 times in one day) and emails a failed scheduled run only to the account that last changed its schedule. Until an external uptime monitor exists and failure emails are confirmed (#190), neither workflow is a reliable alert channel.

## Rollback

For a client or API regression, roll Vercel back to the last good deployment. Applied migrations stay: each one keeps the routines older code calls. If an older release depends on a browser write that a migration removed, forward-fix the release; do not reopen the table.

The FDE path's rollback is its switch: unset `LEARNING_PATH_FDE_ENABLED` and the path returns to preview-only while everything else is untouched. Do not drop the `learning_path_*` tables: they hold learner evidence. An older client ignores `devquiz_learning_preference_v1` and reads `devquiz_track`, which every preference save still writes.

For a database regression, stop writes, preserve logs and the current database, then restore the verified backup into a separate project first. Validate row counts and the smoke test there before changing production environment values. Record the timeline, affected operations, recovery point and follow-up control. [Backup and restore](backup-restore.md) has the sequence.

## Legal and privacy

The Privacy and Terms pages are owner-maintained texts, not a substitute for jurisdiction-specific legal review, which `NEEDED.md` tracks. Before Premium checkout or merchandise goes live, the owner confirms the Stripe (Link) terms for Premium and the Spreadshop (sprd.net AG) terms for merchandise. Analytics stays behind the cookie banner, and its disclosure must match the configuration.
