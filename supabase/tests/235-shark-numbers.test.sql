CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
DO $$
DECLARE dsn TEXT := 'host=127.0.0.1 port=' || current_setting('port') || ' dbname=' || current_database() || ' user=' || current_user;
  a JSONB; b JSONB; c JSONB; stamp TEXT := replace(gen_random_uuid()::TEXT, '-', '');
  ia TEXT := 'guest:racea' || stamp; ib TEXT := 'guest:raceb' || stamp;
BEGIN
  PERFORM extensions.dblink_connect('names_a', dsn);
  PERFORM extensions.dblink_connect('names_b', dsn);
  PERFORM extensions.dblink_exec('names_a', 'BEGIN');
  SELECT r::JSONB INTO a FROM extensions.dblink('names_a', format('SELECT public.allocate_shark_name(%L, %L)::TEXT', ia, 'sleepySharkie')) AS t(r TEXT);
  PERFORM extensions.dblink_send_query('names_b', format('SELECT public.allocate_shark_name(%L, %L)::TEXT', ib, 'sleepySharkie'));
  PERFORM extensions.dblink_exec('names_a', 'COMMIT');
  SELECT r::JSONB INTO b FROM extensions.dblink_get_result('names_b') AS t(r TEXT);
  PERFORM * FROM extensions.dblink_get_result('names_b') AS t(r TEXT);
  ASSERT (b->>'ordinal')::BIGINT = (a->>'ordinal')::BIGINT + 1;
  ASSERT b->>'handle' <> a->>'handle';
  SELECT r::JSONB INTO c FROM extensions.dblink('names_b', format('SELECT public.allocate_shark_name(%L, %L)::TEXT', ia, 'hungryFin')) AS t(r TEXT);
  ASSERT c = a;
  PERFORM extensions.dblink_exec('names_a', format('DELETE FROM public.shark_name_allocations WHERE identity_key IN (%L,%L)', ia, ib));
  PERFORM extensions.dblink_disconnect('names_a');
  PERFORM extensions.dblink_disconnect('names_b');
END; $$;

-- Identity retries, global numbering, namespace collisions and deletion.
DO $$
DECLARE a JSONB; b JSONB; g JSONB; n BIGINT; before_number BIGINT;
BEGIN
  SELECT next_number INTO before_number FROM public.shark_name_counter WHERE singleton;
  a := public.allocate_shark_name('user:sql-number-a', 'sleepySharkie', 'sql-number-a');
  b := public.allocate_shark_name('user:sql-number-b', 'sleepySharkie', 'sql-number-b');
  g := public.allocate_shark_name('guest:sqlnumberguest0001', 'sleepySharkie');
  ASSERT a->>'ordinal' = before_number::TEXT;
  ASSERT (b->>'ordinal')::BIGINT = before_number + 1;
  ASSERT (g->>'ordinal')::BIGINT = before_number + 2;
  ASSERT jsonb_typeof(a->'ordinal') = 'string';
  ASSERT a->>'handle' <> b->>'handle' AND b->>'handle' <> g->>'handle';
  ASSERT public.allocate_shark_name('user:sql-number-a', 'hungryFin', 'sql-number-a') = a;
  ASSERT public.allocate_shark_name('guest:sqlnumberguest0001', 'hungryFin') = g;
  ASSERT (SELECT next_number FROM public.shark_name_counter WHERE singleton) = before_number + 3;
  a := public.allocate_shark_name('user:sql-number-a', 'hungryFin', 'sql-number-a', TRUE);
  ASSERT a->>'ordinal' = before_number::TEXT;
  ASSERT a->>'handle' = 'hungryFin' || before_number::TEXT;
  ASSERT public.allocate_shark_name('user:sql-number-a', 'hungryFin', 'sql-number-a', TRUE) = a;
  BEGIN
    PERFORM public.allocate_shark_name('user:sql-number-a', 'saltyShark', 'sql-number-a', TRUE);
    RAISE EXCEPTION 'expected cooldown';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM = 'handle_cooldown'; END;
  BEGIN
    PERFORM public.set_user_handle('sql-number-c', upper(g->>'handle'));
    RAISE EXCEPTION 'expected case collision';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM = 'handle_taken'; END;
  BEGIN
    UPDATE public.shark_name_allocations SET ordinal = ordinal + 1000 WHERE user_id = 'sql-number-a';
    RAISE EXCEPTION 'expected immutable number';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM = 'immutable_shark_number'; END;
  DELETE FROM public.user_handles WHERE user_id = 'sql-number-a';
  ASSERT NOT EXISTS(SELECT 1 FROM public.shark_name_allocations WHERE user_id = 'sql-number-a');
  b := public.allocate_shark_name('user:sql-number-d', 'sleepySharkie', 'sql-number-d');
  ASSERT (b->>'ordinal')::BIGINT = before_number + 3;
  UPDATE public.shark_name_counter SET next_number = 9007199254740993 WHERE singleton;
  b := public.allocate_shark_name('guest:sqlnumberguest0002', 'sharkSoHungryItAteTheMenu');
  ASSERT b->>'ordinal' = '9007199254740993';
  ASSERT length(b->>'handle') <= 32 AND right(b->>'handle', 16) = '9007199254740993';
  SET CONSTRAINTS ALL IMMEDIATE;
END; $$;

