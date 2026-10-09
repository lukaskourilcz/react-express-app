-- Migration 059 (owner decision 10): a coding draft save names the account
-- draft's updated_at its code builds on, and save_coding_draft_v2 refuses to
-- overwrite a draft saved since, from another device or tab. The refusal
-- carries the stored time and never the stored code. save_coding_draft (025),
-- which the code in production calls, keeps working as it did.

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002201';
  v_task CONSTANT TEXT := 'js-digit-sum';
  r JSONB;
  v_first TIMESTAMPTZ;
  v_second TIMESTAMPTZ;
  v_stored TIMESTAMPTZ;
BEGIN
  -- The first save stands whatever base it names: there is nothing to overwrite.
  r := public.save_coding_draft_v2(v_user, v_task, '// first', NULL);
  ASSERT (r ->> 'saved')::BOOLEAN AND r ->> 'conflict' IS NULL, format('a first save was refused: %s', r);
  v_first := (r ->> 'updatedAt')::TIMESTAMPTZ;
  ASSERT v_first = (SELECT updated_at FROM public.coding_drafts WHERE user_id = v_user AND task_id = v_task),
    'a save does not answer with the time it stored';
  ASSERT NOT (r ? 'code'), 'a save answers with code';

  -- Built on the stored time: written, and the time moves forward even
  -- inside one transaction, where NOW() would not.
  r := public.save_coding_draft_v2(v_user, v_task, '// second', v_first);
  ASSERT (r ->> 'saved')::BOOLEAN, format('a save built on the stored time was refused: %s', r);
  v_second := (r ->> 'updatedAt')::TIMESTAMPTZ;
  ASSERT v_second > v_first, format('updated_at did not move forward: %s then %s', v_first, v_second);
  ASSERT (SELECT code FROM public.coding_drafts WHERE user_id = v_user AND task_id = v_task) = '// second',
    'the save was not written';

  -- Built on an older time (another device saved since): refused, nothing
  -- written, and the answer names the stored time without its code.
  r := public.save_coding_draft_v2(v_user, v_task, '// stale tab', v_first);
  ASSERT NOT (r ->> 'saved')::BOOLEAN AND (r ->> 'conflict')::BOOLEAN, format('a stale save was not refused: %s', r);
  ASSERT (r ->> 'updatedAt')::TIMESTAMPTZ = v_second, format('the refusal does not name the stored time: %s', r);
  ASSERT NOT (r ? 'code') AND position('// second' IN r::TEXT) = 0, format('the refusal carries the stored code: %s', r);
  ASSERT (SELECT code FROM public.coding_drafts WHERE user_id = v_user AND task_id = v_task) = '// second',
    'a stale save overwrote the newer draft';

  -- No base (a copy that never saw the account draft) against a stored draft: refused.
  r := public.save_coding_draft_v2(v_user, v_task, '// never saw it', NULL);
  ASSERT (r ->> 'conflict')::BOOLEAN, format('a save without a base overwrote a stored draft: %s', r);

  -- The code the account already holds is no conflict, and writes nothing.
  r := public.save_coding_draft_v2(v_user, v_task, '// second', v_first);
  ASSERT (r ->> 'saved')::BOOLEAN AND (r ->> 'updatedAt')::TIMESTAMPTZ = v_second,
    format('saving the code the account holds was a conflict or moved its time: %s', r);

  -- Forced (Submit recording an evolving stage's code): written over any time.
  r := public.save_coding_draft_v2(v_user, v_task, '// submitted', v_first, TRUE);
  ASSERT (r ->> 'saved')::BOOLEAN AND (r ->> 'updatedAt')::TIMESTAMPTZ > v_second, format('a forced save was refused: %s', r);
  v_stored := (r ->> 'updatedAt')::TIMESTAMPTZ;
  ASSERT (SELECT code FROM public.coding_drafts WHERE user_id = v_user AND task_id = v_task) = '// submitted',
    'the forced save was not written';

  -- The save in production still writes unconditionally, and moves the time,
  -- so a tab built on the time before it is refused.
  PERFORM public.save_coding_draft(v_user, v_task, '// production save');
  ASSERT (SELECT code FROM public.coding_drafts WHERE user_id = v_user AND task_id = v_task) = '// production save',
    'save_coding_draft no longer writes';
  UPDATE public.coding_drafts SET updated_at = v_stored + INTERVAL '1 second' WHERE user_id = v_user AND task_id = v_task;
  r := public.save_coding_draft_v2(v_user, v_task, '// built before it', v_stored);
  ASSERT (r ->> 'conflict')::BOOLEAN, format('a save built before save_coding_draft wrote was not refused: %s', r);

  -- Another account's draft of the same task is its own.
  r := public.save_coding_draft_v2('aaaaaaaa-0000-4000-8000-000000002202', v_task, '// other account', NULL);
  ASSERT (r ->> 'saved')::BOOLEAN, format('another account''s first save was refused: %s', r);

  -- The same checks as save_coding_draft on what is stored.
  BEGIN
    PERFORM public.save_coding_draft_v2(v_user, v_task, repeat('x', 20481), NULL);
    RAISE EXCEPTION 'a draft over 20 kB was stored';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_coding_draft', SQLERRM;
  END;
  BEGIN
    PERFORM public.save_coding_draft_v2(v_user, 'Not A Task', '// x', NULL);
    RAISE EXCEPTION 'a malformed task id was stored';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_coding_draft', SQLERRM;
  END;

  -- Only the server calls it.
  ASSERT has_function_privilege('service_role', 'public.save_coding_draft_v2(text, text, text, timestamptz, boolean)', 'EXECUTE'),
    'the service role cannot save a draft';
  ASSERT NOT has_function_privilege('anon', 'public.save_coding_draft_v2(text, text, text, timestamptz, boolean)', 'EXECUTE')
     AND NOT has_function_privilege('authenticated', 'public.save_coding_draft_v2(text, text, text, timestamptz, boolean)', 'EXECUTE'),
    'a browser role can save a draft';
END;
$$;

-- Two saves at once, built on the same time: exactly one is written. They
-- run on two more connections to this database (dblink), so each commits on
-- its own; the second is sent while the first holds its transaction open,
-- and is seen waiting on the row before the first commits. CI and the
-- documented container use the password `postgres`; set
-- devshark.test_password for another.
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002203';
  v_task CONSTANT TEXT := 'js-sum-array';
  v_dsn TEXT := format('host=%s port=%s dbname=%s user=%s password=%s',
    COALESCE(host(inet_server_addr()), 'localhost'), inet_server_port(), current_database(), current_user,
    COALESCE(NULLIF(current_setting('devshark.test_password', TRUE), ''), 'postgres'));
  v_base TIMESTAMPTZ;
  v_pid INTEGER;
  v_a JSONB;
  v_b JSONB;
  v_code TEXT;
  v_waited BOOLEAN;
BEGIN
  PERFORM extensions.dblink_connect('draft_race_a', v_dsn);
  PERFORM extensions.dblink_connect('draft_race_b', v_dsn);
  SELECT pid INTO v_pid FROM extensions.dblink('draft_race_b', 'SELECT pg_backend_pid()') AS t(pid INTEGER);

  FOR round IN 1..2 LOOP
    IF round = 1 THEN
      -- A draft both tabs loaded.
      SELECT (r::JSONB ->> 'updatedAt')::TIMESTAMPTZ INTO v_base
        FROM extensions.dblink('draft_race_a', format('SELECT public.save_coding_draft_v2(%L, %L, %L, NULL)::TEXT', v_user, v_task, '// loaded')) AS t(r TEXT);
    ELSE
      -- No draft yet: two first saves.
      PERFORM extensions.dblink_exec('draft_race_a', format('DELETE FROM public.coding_drafts WHERE user_id = %L', v_user));
      v_base := NULL;
    END IF;

    PERFORM extensions.dblink_exec('draft_race_a', 'BEGIN');
    SELECT r::JSONB INTO v_a
      FROM extensions.dblink('draft_race_a', format('SELECT public.save_coding_draft_v2(%L, %L, %L, %L)::TEXT', v_user, v_task, '// from tab A', v_base)) AS t(r TEXT);
    PERFORM extensions.dblink_send_query('draft_race_b', format('SELECT public.save_coding_draft_v2(%L, %L, %L, %L)::TEXT', v_user, v_task, '// from tab B', v_base));
    v_waited := FALSE;
    FOR i IN 1..100 LOOP
      SELECT wait_event_type = 'Lock' INTO v_waited FROM pg_stat_activity WHERE pid = v_pid;
      EXIT WHEN v_waited;
      PERFORM pg_sleep(0.05);
    END LOOP;
    ASSERT v_waited, format('round %s: the second save never waited on the first', round);
    PERFORM extensions.dblink_exec('draft_race_a', 'COMMIT');
    SELECT r::JSONB INTO v_b FROM extensions.dblink_get_result('draft_race_b') AS t(r TEXT);
    PERFORM * FROM extensions.dblink_get_result('draft_race_b') AS t(r TEXT);

    ASSERT (v_a ->> 'saved')::BOOLEAN, format('round %s: the first save was refused: %s', round, v_a);
    ASSERT NOT (v_b ->> 'saved')::BOOLEAN AND (v_b ->> 'conflict')::BOOLEAN, format('round %s: both saves were written: %s', round, v_b);
    ASSERT (v_b ->> 'updatedAt') = (v_a ->> 'updatedAt'), format('round %s: the refusal does not name the winner''s time: %s, %s', round, v_a, v_b);
    SELECT code INTO v_code
      FROM extensions.dblink('draft_race_a', format('SELECT code FROM public.coding_drafts WHERE user_id = %L AND task_id = %L', v_user, v_task)) AS t(code TEXT);
    ASSERT v_code = '// from tab A', format('round %s: the stored draft is %s', round, v_code);
  END LOOP;

  PERFORM extensions.dblink_exec('draft_race_a', format('DELETE FROM public.coding_drafts WHERE user_id = %L', v_user));
  PERFORM extensions.dblink_disconnect('draft_race_a');
  PERFORM extensions.dblink_disconnect('draft_race_b');
END;
$$;
