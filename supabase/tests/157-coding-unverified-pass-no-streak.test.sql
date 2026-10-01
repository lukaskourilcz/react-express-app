-- A coding pass counts as a streak day only when the server verified it
-- (migration 048; review finding TEST-3). A self-reported checklist pass
-- (p_verified FALSE) is recorded but is not a day of verified learning: the
-- streak and the last learning day stay as they were.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001591';
  v_result  JSONB;
  v_streak  INTEGER;
  v_last    DATE;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_user, 5, 5, v_today - 1);

  v_result := public.record_coding_verdict(v_user, 'unverifiedpass00001', 'js-double-numbers', 'javascript', 'passed', FALSE, 0);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND v_result ->> 'status' = 'passed',
    format('the unverified pass is recorded: %s', v_result);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 5 AND v_last = v_today - 1,
    format('an unverified pass moves neither the streak nor the last learning day: %s on %s', v_streak, v_last);

  -- The same task passed and verified: that is a learning day.
  PERFORM public.record_coding_verdict(v_user, 'unverifiedpass00002', 'js-double-numbers', 'javascript', 'passed', TRUE, 0);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 6 AND v_last = v_today, format('a verified pass does: %s on %s', v_streak, v_last);
END;
$$;
