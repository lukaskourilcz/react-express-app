# Applying a large migration through the Supabase connector

Use this only when the owner has authorised you to apply a named migration to production, and the connector's `apply_migration` (or a large `execute_sql`) fails with "Invalid or expired requestState". Small calls still work, so you split the file into small calls.

Origin: the operator procedure that applied 058 and 059 on 9 October 2026 and 060 on 11 October 2026. `NEEDED.md` records the result in the items "Apply migrations 058 and 059 before deploying the draft-conflict code" ("production then matched a fresh build of the repository") and "Apply migration 060 before deploying". This file is the first written copy of the steps in the repository.

## Steps

1. **Read the history first.** Call `list_migrations` and compare it with `supabase/supabase-schema-*.sql`, so you neither skip nor repeat a file. Note how the existing rows name themselves.
2. **Prepare the text.** Remove full-line `--` comments and the file's own `BEGIN;` and `COMMIT;`. Each connector call runs in its own transaction, so the file no longer commits as one unit.
3. **Split into statements.** Cut at the semicolons that end a statement. A routine body between `$$` (or `$tag$`) quotes holds semicolons of its own: keep the whole `CREATE OR REPLACE FUNCTION … $$ … $$;` in one piece.
4. **Group the statements.** Keep each group under about 11 KB once wrapped. End a group only after the `REVOKE` and `GRANT` that follow a new routine or table, so no call leaves an object open to `anon` or `authenticated` between two calls. Put the file's `DO` dependency guard in the first group.
5. **Wrap each group** so the connector receives one short statement:

   ```sql
   DO $wrap$ BEGIN EXECUTE convert_from(decode('<base64 of the group>','base64'),'UTF8'); END $wrap$;
   ```

   One way to produce it from a group file:

   ```sh
   node -e 'const fs=require("fs");const b=Buffer.from(fs.readFileSync(process.argv[1],"utf8")).toString("base64");process.stdout.write("DO $wrap$ BEGIN EXECUTE convert_from(decode(\x27"+b+"\x27,\x27base64\x27),\x27UTF8\x27); END $wrap$;\n")' group-1.sql > group-1.wrapped.sql
   ```

6. **Rehearse locally.** Build a fresh `supabase/postgres:17.6.1.171` container at the state production has (every file before the new one), run the wrapped groups in order with `psql -X -v ON_ERROR_STOP=1 -f`, then compare its fingerprint (below) with a second fresh container built from the repository with the new file applied whole. Apply the groups a second time to prove the re-run is harmless.
7. **Apply in production**, one `execute_sql` call per wrapped group, in order. Stop at the first error and report it; do not improvise a fix in production.
8. **Record the history row by hand**, because `execute_sql` writes none:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('<UTC timestamp, YYYYMMDDHHMMSS>', '<name in the style list_migrations showed>')
   ON CONFLICT (version) DO NOTHING;
   ```

9. **Compare fingerprints** of production and a fresh repository build. They must match before the pull request merges:

   ```sql
   SELECT count(*) AS functions,
          md5(string_agg(p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || coalesce(p.proacl::text, ''),
                         E'\n' ORDER BY p.oid::regprocedure::text)) AS fingerprint
     FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f';
   ```

   Compare the tables the migration touched as well: columns, constraints, policies, grants and `relrowsecurity`. Then run the connector's security advisor (`get_advisors`) and report anything above INFO.
10. **Tick the `NEEDED.md` item** with the date, the history row's version and the fingerprint result.

## What a rehearsal on this repository showed

On 21 October 2026, on a fresh `supabase/postgres:17.6.1.171` container built by `npm run test:sql` (65 schema files), migration 065 stripped of comments, `BEGIN;` and `COMMIT;` (2,510 bytes, 3,426 wrapped) ran through one `DO $wrap$` call. `EXECUTE` accepted the `ALTER TABLE`, the `CREATE OR REPLACE FUNCTION`, the `REVOKE` and the `GRANT` in one string. The function fingerprint above read `135 7e380a7421ed188c1fc55cb29260ab12` before and after, so the wrapped re-run changed nothing.
