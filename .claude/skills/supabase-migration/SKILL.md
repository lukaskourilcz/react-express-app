---
name: supabase-migration
description: Author, test and record a numbered schema migration. Use for any change under `supabase/`.
---

# Supabase Migration

A schema change ships as one new numbered file, one SQL behaviour test, a deploy item in `NEEDED.md` and a line in the product architecture. Production gets the file before the code that needs it merges. Each rule below names the file it comes from.

## 1. Pick the number

1. List `supabase/supabase-schema-*.sql` and take the highest number plus one, padded to three digits. After 065 the next file is `supabase/supabase-schema-066.sql`. Source: `scripts/test-sql.mjs`, step 3, which stops with "Migrations must be numbered 002, 003, … without gaps or duplicates".
2. Fetch `origin/main` before you commit and look again. When another branch merged the same number first, renumber your file while nobody has applied it. Source: the same check in `scripts/test-sql.mjs`.
3. Never edit a file production has applied, including to make a check pass; write a forward migration. Source: `.claude/commands/release-validate.md`, step 6, and `docs/product-architecture.md`, "Compatibility and rollback". `scripts/test-launch-contracts.ts` also reads old files by name (`erasureContracts`, `monthlyXpContracts`), so an edit to an applied file changes what the contracts prove.

## 2. Write the file

Copy the shape of `supabase/supabase-schema-065.sql` and the headers of 059 and 060:

```sql
-- Migration NNN: <what it adds, in one sentence>. Apply after migration <MMM>.
-- Safe to re-run; the whole file is one transaction. Compatible with the code
-- in production (<short sha>): <which routines that code calls keep their
-- name, arguments, body and grants>.
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.<routine it builds on>(<arg types>)') IS NULL THEN
    RAISE EXCEPTION 'migration NNN needs migration MMM first';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.<table> (...);
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.<table> FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.<routine>(<args>)
RETURNS <type> LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  ...
END;
$$;
REVOKE ALL ON FUNCTION public.<routine>(<arg types>) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.<routine>(<arg types>) TO service_role;
COMMIT;
```

- The header says what the file adds, what it needs and why the running code survives it. Sources: the headers of `supabase/supabase-schema-059.sql` and `supabase/supabase-schema-060.sql`; `docs/launch-runbook.md`, "Database rollout", step 9 ("each file's header says what it adds and needs").
- `BEGIN;` and `COMMIT;` wrap the whole file. Source: `supabase/supabase-schema-065.sql`.
- A `DO` guard refuses to run before the objects the file builds on exist. Source: `supabase/supabase-schema-060.sql`, the block that raises "migration 060 needs migrations 056 and 058 first".
- Every statement survives a second run: `IF NOT EXISTS` on tables, columns and indexes, `CREATE OR REPLACE` on routines, `DROP POLICY IF EXISTS` before `CREATE POLICY`. Sources: `supabase/supabase-schema-065.sql` (`ADD COLUMN IF NOT EXISTS`), `supabase/supabase-schema-063.sql` (`CREATE TABLE IF NOT EXISTS`); `docs/release-acceptance.md`, "045 again", which proves a re-run leaves the catalog fingerprint unchanged.
- Every table has row level security on and no browser grant beyond what a policy needs. Every `SECURITY DEFINER` routine pins `search_path` to an empty string and only `service_role` may execute it. Sources: `supabase/tests/010-schema-security.test.sql`, which fails the suite otherwise; `supabase/supabase-schema-063.sql`, lines 20 to 23; `AGENTS.md` ("Keep Supabase/RLS/service-role isolation").
- Write `SET search_path = ''` with spaces. The launch contracts match that spelling for the routines they pin. Source: `scripts/test-launch-contracts.ts`, `erasureContracts` (`/SECURITY DEFINER\s+SET search_path = ''/`).
- A new table with an account column (`user_id`, `invitee_user_id`, `referrer_user_id`) needs a restated `delete_user_data` that erases it, whose guard checks the table exists, and a seeded row in `supabase/tests/080-delete-user-data.test.sql`. Sources: `scripts/test-launch-contracts.ts`, `erasureContracts`; the header of `supabase/tests/080-delete-user-data.test.sql`; `docs/product-architecture.md`, "Account erasure".
- When you restate a routine the launch contracts pin by file, move the pinned file name in the same commit. Source: `scripts/test-launch-contracts.ts`, `monthlyXpContracts` (`assert.equal(learn.file, 'supabase-schema-062.sql', …)`).

## 3. Keep the running code working

Production applies the migration while the previous code still serves traffic, and `main` can deploy before the migration lands. Source: the header of `supabase/supabase-schema-059.sql`; the header of `scripts/test-migration-fallbacks.ts`.

1. Keep every routine the production code calls: same name, arguments, result and grants. Change behaviour through a new routine with a `_v2` (or `_v3`) suffix. Sources: the headers of `supabase/supabase-schema-059.sql` (`save_coding_draft_v2`) and `supabase/supabase-schema-060.sql` (`complete_verified_roadmap_attempt_v2`, `record_verified_quiz_result_v3`).
2. Call the new routine first. When `isRpcMissing(error)` is true, call the previous one. When both are missing, answer 503 `migration_required`. Sources: `lib/http.ts`, `isRpcMissing`; `api/quiz/roadmap.ts`, the `complete_verified_roadmap_attempt_v2` call; `api/user/[op].ts`, the `record_verified_quiz_result_v3` call; `lib/coding/handlers.ts`, `storeDraft`.
3. Add the fallback case to `scripts/test-migration-fallbacks.ts`: its stand-in answers PGRST202 for any routine missing from `INSTALLED`, as PostgREST 12 does. Source: the header and `INSTALLED` in `scripts/test-migration-fallbacks.ts`.

## 4. Test it

1. Add one `supabase/tests/NNN-<topic>.test.sql`. Test files keep their own sequence, apart from the migration numbers: take the next number after the highest (`237-path-coding-reward.test.sql` tests migration 065, so the next is 238). Source: the file list in `supabase/tests/`.
2. Write the checks as `ASSERT` statements inside `DO $$ … $$;` blocks. Add `SET LOCAL ROLE service_role;` first when the server calls the routines. `scripts/test-sql.mjs` wraps each file in `BEGIN` and `ROLLBACK` and turns on `plpgsql.check_asserts`, so a test leaves no rows behind. Sources: `scripts/test-sql.mjs`, step 4 and `psql()`; `supabase/tests/237-path-coding-reward.test.sql`.
3. `supabase/tests/known-failures.txt` only shrinks. Never add a line to hide a new failure; fix the SQL. A listed file that starts passing fails the suite until you remove its line. Source: the header of `supabase/tests/known-failures.txt`; `scripts/test-sql.mjs`, the `FIXED` branch.
4. Run the suite on an empty database. The script refuses a database with tables in `public`, so start a fresh container for every run. Source: the header of `scripts/test-sql.mjs`; `.github/workflows/quality.yml`, job `sql`, which uses the same image.

   ```sh
   docker run -d --name devshark-sql -p 54339:5432 -e POSTGRES_PASSWORD=postgres supabase/postgres:17.6.1.171
   until docker exec devshark-sql pg_isready -U postgres -h 127.0.0.1; do sleep 2; done
   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54339/postgres npm run test:sql
   psql postgres://postgres:postgres@127.0.0.1:54339/postgres -X -v ON_ERROR_STOP=1 -f supabase/supabase-schema-NNN.sql
   docker rm -f devshark-sql
   ```

   The `psql` line applies the new file a second time on the built database and proves it safe to re-run. `npm run test:sql` needs `psql` on `PATH`.

## 5. Record it

1. Add an unticked deploy item to `NEEDED.md` in the shared marker format, with the wording the earlier items used:

   ```md
   - [ ] **Apply migration NNN before the <feature> deploy** — `supabase/supabase-schema-NNN.sql` (<what it adds>). Apply it after MMM; the code in production keeps working with it applied, and the new code needs it. [imp:4] [owner:me] [time:5m] [kind:deploy]
   ```

   Sources: `NEEDED.md`, items "Apply migration 055 before the sharkname deploy" and "Apply migration 056 before the XP and classroom deploy"; `CLAUDE.md`, "Session routine & markdown conventions", for the markers.
2. Add a sentence that names the migration to the section of `docs/product-architecture.md` that owns the behaviour. Source: `docs/product-architecture.md`, "Learning and Challenge updates, 13 October 2026" ("… in one transaction (migration 065)") and "Account erasure".
3. When someone applies it, tick the item and add the date and the pull request it preceded. Source: `NEEDED.md`, "Apply migration 055 …" ("Applied to production on 8 Oct 2026, before #323 deployed").

## 6. Apply it to production

The owner, or an agent the owner authorised for that migration, applies it to production before the pull request that needs it merges. Do not apply a migration on your own initiative. Sources: `NEEDED.md`, "Launch audit, 29 Sep 2026" ("Migrations 048-051 were applied to production before that code deployed") and "Apply migrations 061–065 before the dependent release"; `CLAUDE.md`, "Git workflow" (`main` merges only with `verify` and `sql` green).

1. Take and verify a backup first. Source: `docs/launch-runbook.md`, "Database rollout", step 1; `docs/backup-restore.md`.
2. Compare the project's applied migrations with the repository before you assume a file is live or missing. Source: `NEEDED.md`, "Apply migration 060 before deploying" ("Production inspection on 13 October confirmed 060 already installed").
3. Apply the file in full through the Supabase SQL editor or the Supabase connector's `apply_migration`. When the connector fails on a large file, follow [references/apply-large-migration.md](references/apply-large-migration.md).
4. Prove production matches a fresh build of the repository by fingerprint. Source: `docs/release-acceptance.md`, the 045 proof ("matched the local chain by fingerprint"); `NEEDED.md`, "Apply migrations 058 and 059 …" ("production then matched a fresh build of the repository").

## Validation

| Command | What it proves |
|---|---|
| `DATABASE_URL=<empty Postgres> npm run test:sql` | The base schema and every numbered file apply in order on `supabase/postgres:17.6.1.171`, and every `supabase/tests/*.test.sql` passes or fails with its listed known text (`scripts/test-sql.mjs`). |
| `psql <same URL> -X -v ON_ERROR_STOP=1 -f supabase/supabase-schema-NNN.sql` | The new file re-runs cleanly on the database it already built. |
| `npm run test:fallbacks` | Each handler that names a fallback still answers when a routine is missing and PostgREST says PGRST202 (`scripts/test-migration-fallbacks.ts`). |
| `npm run typecheck:api` | The handlers that call the new routines still type-check. |
| `npm run test:launch` | The SQL-reading contracts hold: erasure coverage, the pinned newest definitions, definer `search_path` (`scripts/test-launch-contracts.ts`). |
| `git diff --check` | No whitespace errors in the new files. |

Report each command as pass, fail or not run, with the test-file summary line `test:sql` prints. Hand the finished migration to the `migration-reviewer` agent (`.claude/agents/migration-reviewer.md`) before you open the pull request.
