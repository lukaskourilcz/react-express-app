# Supabase backup, restore, and recovery drill

This procedure protects the web launch database. Run it before migrations 021/022,
before destructive maintenance, and on a regular schedule appropriate to the
Supabase plan and recovery-point objective.

## Backup

1. Record the source project ref, Postgres version, migration level, UTC start
   time, and person performing the backup.
2. Use Supabase managed backups/PITR when available. In addition, create an
   encrypted logical backup with `supabase db dump` or `pg_dump` using a
   short-lived database credential. Do not commit dumps or credentials.
3. Include schema, functions, triggers, grants/RLS, and data. Auth identities are
   managed in the `auth` schema and require an authorized Supabase recovery path;
   confirm they are included in the selected backup product.
4. Store the encrypted artifact in access-controlled storage separate from the
   production project. Record its SHA-256 checksum and retention date.
5. Capture non-secret Vercel/Supabase configuration separately: product IDs,
   allowed redirect origins, Realtime settings, and enabled feature flags.

## Restore drill

Never test a restore over the production database.

1. Create an isolated recovery project with no public production domain.
2. Restore the managed snapshot or logical dump using the documented Supabase
   restore mechanism for that backup type.
3. Apply only migrations newer than the backup, in numeric order.
4. Compare row counts for user stats, category stats, per-question history,
   roadmap progress/attempts, flashcards, matches, challenge/daily scores,
   verified award/quiz ledgers, explanation caches, AI budget, reports, quality
   suggestions, and settings.
5. Verify functions and privileges, especially `record_verified_quiz_result_v2`,
   `record_verified_activity_xp`, `complete_verified_roadmap_attempt`,
   `apply_verified_skill_check`,
   `claim_ai_generation_budget`, `delete_user_data`, RLS enablement, and revoked
   browser writes from migrations 021/022.
6. Point a private preview deployment at recovery, run `npm run test:launch`,
   then execute the launch smoke test without using real-user credentials.
7. Record recovery time and achieved recovery point. Fix the procedure if
   either misses the declared objective.

## Production recovery

Freeze writes and preserve evidence before acting. Prefer point-in-time recovery
to the instant before corruption. Restore to a separate project, validate it,
then switch server and client Supabase environment values together. Reconfirm
Google OAuth redirects and Realtime. Rotate any credential exposed during the
incident and invalidate affected sessions.

After recovery, verify `/api/health`, quiz receipt idempotency, multiplayer,
admin authorization, and account erasure. Document data loss window, user impact,
notification decision, root cause, and prevention work.
