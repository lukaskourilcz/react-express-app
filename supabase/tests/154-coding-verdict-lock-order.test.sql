-- A coding verdict inside a Learn level takes the attempt row's lock before
-- the learner's user_stats lock (migration 052, review finding SEC-6).
--
-- complete_verified_roadmap_attempt locks the roadmap_attempts row FOR UPDATE
-- and then, in advance_verified_streak, the user_stats row. The verdict's
-- roadmap_attempt_coding insert takes a KEY SHARE lock on the same attempt
-- row through its foreign key. Until 052 the verdict advanced the streak
-- first, locking user_stats, and wrote that row last, so a verdict and the
-- level's completion arriving together could each hold the lock the other
-- waited for: Postgres aborted one with "deadlock detected".
--
-- The suite runs one session per file, so it cannot race two transactions
-- (dblink needs a password for a role that is not a superuser, and the
-- suite's role is not one). What decides the deadlock is the order in which
-- the verdict reaches the two tables, and triggers record exactly that: the
-- first write to user_stats is the INSERT ... ON CONFLICT that
-- advance_verified_streak runs right before its SELECT ... FOR UPDATE. The
-- triggers and their log exist only inside this rolled-back transaction.

CREATE TEMP TABLE lock_order_log (seq SERIAL PRIMARY KEY, target TEXT NOT NULL);

CREATE FUNCTION public.test_154_log_touch() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO pg_temp.lock_order_log (target) VALUES (TG_TABLE_NAME);
  RETURN NEW;
END;
$$;
CREATE TRIGGER test_154_user_stats BEFORE INSERT OR UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.test_154_log_touch();
CREATE TRIGGER test_154_attempt_coding BEFORE INSERT OR UPDATE ON public.roadmap_attempt_coding
  FOR EACH ROW EXECUTE FUNCTION public.test_154_log_touch();

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001561';
  v_attempt CONSTANT TEXT := 'lockorderattempt0001';
  v_order   TEXT[];
  v_streak  INTEGER;
  v_passed  BOOLEAN;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_user, 3, 3, v_today - 1);
  -- A Learn level with a coding task: the attempt row the verdict points at.
  PERFORM public.record_roadmap_answer_v2(v_attempt, v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 50);
  DELETE FROM pg_temp.lock_order_log;

  PERFORM public.record_coding_verdict(
    v_user, 'lockordercoding00001', 'js-double-numbers', 'javascript', 'passed', TRUE, 20,
    'webdev', v_attempt
  );

  SELECT array_agg(target ORDER BY seq) INTO v_order FROM pg_temp.lock_order_log;
  ASSERT v_order[1] = 'roadmap_attempt_coding',
    format('the verdict reaches the attempt row before user_stats, as the completion does: %s', v_order);
  ASSERT 'user_stats' = ANY(v_order), format('and still counts the streak day: %s', v_order);

  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_user;
  SELECT passed INTO v_passed FROM public.roadmap_attempt_coding WHERE attempt_id = v_attempt AND task_id = 'js-double-numbers';
  ASSERT v_streak = 4 AND v_passed, format('the pass is recorded for the level and the day counts: %s, %s', v_streak, v_passed);

  -- The completion that follows passes the level on that verdict.
  ASSERT public.complete_verified_roadmap_attempt(v_user, v_attempt, '["js-double-numbers"]'::jsonb),
    'the level completes';
  SELECT (data #>> '{javascript,levels,1,passed}')::BOOLEAN INTO v_passed FROM public.roadmap_progress WHERE user_id = v_user;
  ASSERT v_passed, 'with the coding task passed';
END;
$$;
