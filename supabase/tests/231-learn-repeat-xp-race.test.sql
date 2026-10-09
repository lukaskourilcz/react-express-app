-- Two replays of one Learn level completing at once pay its XP once
-- (migration 060). They run on two more connections to this database
-- (dblink), so each commits on its own: the first holds its transaction open
-- after paying, the second is seen waiting on a lock, and once the first
-- commits the second finds the step paid within the hour. CI and the
-- documented container use the password `postgres`; set
-- devshark.test_password for another. Everything the two connections commit
-- is erased at the end with delete_user_data.
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002311';
  v_dsn TEXT := format('host=%s port=%s dbname=%s user=%s password=%s',
    COALESCE(host(inet_server_addr()), 'localhost'), inet_server_port(), current_database(), current_user,
    COALESCE(NULLIF(current_setting('devshark.test_password', TRUE), ''), 'postgres'));
  v_pid INTEGER;
  v_a JSONB;
  v_b JSONB;
  v_waited BOOLEAN := FALSE;
  v_awards INTEGER;
  v_xp BIGINT;
  v_month BIGINT;
  v_answer CONSTANT TEXT := 'SELECT public.record_roadmap_answer_v2(%L, %L, ''q1'', 1, 1, ''webdev'', ''css'', ''level'', 2, 1, 100)::TEXT';
BEGIN
  PERFORM extensions.dblink_connect('learn_race_a', v_dsn);
  PERFORM extensions.dblink_connect('learn_race_b', v_dsn);
  SELECT pid INTO v_pid FROM extensions.dblink('learn_race_b', 'SELECT pg_backend_pid()') AS t(pid INTEGER);

  -- Level css/2, passed two hours ago; two replays answered and ready.
  PERFORM * FROM extensions.dblink('learn_race_a', format(v_answer, 'learnrace0000000001', v_user)) AS t(r TEXT);
  PERFORM * FROM extensions.dblink('learn_race_a',
    format('SELECT public.complete_verified_roadmap_attempt_v2(%L, %L)::TEXT', v_user, 'learnrace0000000001')) AS t(r TEXT);
  PERFORM extensions.dblink_exec('learn_race_a',
    format('UPDATE public.user_learn_step_xp SET last_xp_at = NOW() - INTERVAL ''2 hours'' WHERE user_id = %L', v_user));
  PERFORM * FROM extensions.dblink('learn_race_a', format(v_answer, 'learnrace0000000002', v_user)) AS t(r TEXT);
  PERFORM * FROM extensions.dblink('learn_race_a', format(v_answer, 'learnrace0000000003', v_user)) AS t(r TEXT);

  PERFORM extensions.dblink_exec('learn_race_a', 'BEGIN');
  SELECT r::JSONB INTO v_a FROM extensions.dblink('learn_race_a',
    format('SELECT public.complete_verified_roadmap_attempt_v2(%L, %L)::TEXT', v_user, 'learnrace0000000002')) AS t(r TEXT);
  PERFORM extensions.dblink_send_query('learn_race_b',
    format('SELECT public.complete_verified_roadmap_attempt_v2(%L, %L)::TEXT', v_user, 'learnrace0000000003'));
  FOR i IN 1..100 LOOP
    SELECT wait_event_type = 'Lock' INTO v_waited FROM pg_stat_activity WHERE pid = v_pid;
    EXIT WHEN v_waited;
    PERFORM pg_sleep(0.05);
  END LOOP;
  ASSERT v_waited, 'the second completion never waited on the first';
  PERFORM extensions.dblink_exec('learn_race_a', 'COMMIT');
  SELECT r::JSONB INTO v_b FROM extensions.dblink_get_result('learn_race_b') AS t(r TEXT);
  PERFORM * FROM extensions.dblink_get_result('learn_race_b') AS t(r TEXT);

  SELECT a, b, c, d INTO v_awards, v_xp, v_month, v_pid FROM extensions.dblink('learn_race_a', format(
    'SELECT (SELECT COUNT(*)::INT FROM public.verified_activity_awards WHERE user_id = %1$L),
            (SELECT quest_xp FROM public.user_xp WHERE user_id = %1$L),
            (SELECT SUM(xp) FROM public.user_xp_days WHERE user_id = %1$L),
            (SELECT repeats FROM public.user_learn_step_xp WHERE user_id = %1$L)', v_user))
    AS t(a INTEGER, b BIGINT, c BIGINT, d INTEGER);
  PERFORM * FROM extensions.dblink('learn_race_a', format('SELECT public.delete_user_data(%L)::TEXT', v_user)) AS t(r TEXT);
  PERFORM extensions.dblink_disconnect('learn_race_a');
  PERFORM extensions.dblink_disconnect('learn_race_b');

  ASSERT (v_a #>> '{repeatXp,xp}')::INT = 50, format('the first replay pays: %s', v_a);
  ASSERT (v_b ->> 'applied')::BOOLEAN AND (v_b #>> '{repeatXp,xp}')::INT = 0 AND v_b #>> '{repeatXp,withheld}' = 'cooldown',
    format('the second, completed at the same moment, pays nothing: %s', v_b);
  ASSERT v_awards = 1 AND v_xp = 50 AND v_pid = 1, format('one award, 50 XP, one repeat: %s, %s, %s', v_awards, v_xp, v_pid);
  ASSERT v_month = 100, format('the month holds the first pass and one repeat: %s', v_month);
END;
$$;
