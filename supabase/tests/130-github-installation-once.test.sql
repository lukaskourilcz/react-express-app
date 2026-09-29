-- Migration 050: an installation of the devShark GitHub App belongs to one
-- devShark account. A second account can neither insert nor move its own row
-- onto an installation another account holds, the owner can reconnect it, and
-- the migration clears installations already shared by several accounts
-- before it creates the index, however often it runs.

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1
    FROM pg_index AS i
    JOIN pg_class AS c ON c.oid = i.indexrelid
    JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = 'public.github_connections'::regclass
      AND i.indisunique
      AND i.indnatts = 1
      AND a.attname = 'installation_id'
      AND c.relname = 'github_connections_installation_id_key'
  ), 'github_connections has a unique index on installation_id alone';
END;
$$;

DO $$
DECLARE
  v_owner CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001301';
  v_other CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001302';
BEGIN
  INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id)
  VALUES (v_owner, 130001, 'owner-130', 9130001);

  -- A second account inserting the same installation is refused.
  BEGIN
    INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id)
    VALUES (v_other, 130001, 'owner-130', 9130001);
    RAISE EXCEPTION 'a second account connected an installation another account holds';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- The handler writes with an upsert on user_id: a second account's upsert is
  -- refused the same way.
  BEGIN
    INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id)
    VALUES (v_other, 130001, 'owner-130', 9130001)
    ON CONFLICT (user_id) DO UPDATE SET installation_id = EXCLUDED.installation_id;
    RAISE EXCEPTION 'a second account upserted an installation another account holds';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Nor can an account with a connection of its own move it onto the owner's
  -- installation.
  INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id)
  VALUES (v_other, 130002, 'other-130', 9130002);
  BEGIN
    UPDATE public.github_connections SET installation_id = 130001 WHERE user_id = v_other;
    RAISE EXCEPTION 'an account moved its connection onto an installation another account holds';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- The owner reconnecting the same installation is an update of its own row.
  INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id, status)
  VALUES (v_owner, 130001, 'owner-130', 9130001, 'active')
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();

  ASSERT (SELECT count(*) FROM public.github_connections WHERE installation_id = 130001) = 1,
    'installation 130001 is held by one account';
  ASSERT (SELECT user_id FROM public.github_connections WHERE installation_id = 130001) = v_owner,
    'the owner still holds installation 130001';
  ASSERT (SELECT status FROM public.github_connections WHERE user_id = v_owner) = 'active',
    'the owner''s reconnect was saved';
  ASSERT (SELECT installation_id FROM public.github_connections WHERE user_id = v_other) = 130002,
    'the other account keeps its own installation';
END;
$$;

-- A database that already holds a shared installation: without the index,
-- two accounts share installation 130003 while 130004 has one account.
DROP INDEX public.github_connections_installation_id_key;
INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id, updated_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000001303', 130003, 'shared-130', 9130003, NOW() - INTERVAL '2 days'),
  ('aaaaaaaa-0000-4000-8000-000000001304', 130003, 'shared-130', 9130003, NOW()),
  ('aaaaaaaa-0000-4000-8000-000000001305', 130004, 'single-130', 9130004, NOW());

\ir ../supabase-schema-050.sql

DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public.github_connections WHERE installation_id = 130003),
    'a shared installation loses every account, so its owner reconnects through the checked flow';
  ASSERT (SELECT user_id FROM public.github_connections WHERE installation_id = 130004) = 'aaaaaaaa-0000-4000-8000-000000001305',
    'an installation with one account keeps it';
  ASSERT (SELECT count(*) FROM public.github_connections WHERE installation_id IN (130001, 130002)) = 2,
    'connections that were never shared stay';
  ASSERT to_regclass('public.github_connections_installation_id_key') IS NOT NULL,
    'the migration created the index';
END;
$$;

-- Running it again changes nothing and does not fail.
\ir ../supabase-schema-050.sql

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.github_connections WHERE installation_id BETWEEN 130001 AND 130004) = 3,
    'a second run removes nothing';
  BEGIN
    INSERT INTO public.github_connections (user_id, installation_id, account_login, account_id)
    VALUES ('aaaaaaaa-0000-4000-8000-000000001306', 130004, 'single-130', 9130004);
    RAISE EXCEPTION 'the rebuilt index let a second account take installation 130004';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;
