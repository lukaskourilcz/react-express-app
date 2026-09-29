-- Today ranks by correct answers only (migration 049). Equal scores arrive
-- next to each other in the order they were recorded, however long each one
-- took, so the Leaderboard screen gives them one shared rank (1, 1, 3). A
-- faster result recorded later does not pass a slower one with the same
-- score, and a lower score stays below both however fast it was. The time is
-- still returned.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_slow    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000113';
  v_fast    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000114';
  v_fastest CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000115';
  v_board TEXT;
  v_ranks TEXT;
BEGIN
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_slow, p_attempt_id => 'todayattempt00000113', p_correct => 5, p_total => 5,
    p_breakdown => '{"css":{"correct":5,"total":5}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Slow and early', p_daily_date => v_today, p_duration_ms => 300000);
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_fast, p_attempt_id => 'todayattempt00000114', p_correct => 5, p_total => 5,
    p_breakdown => '{"css":{"correct":5,"total":5}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Fast and late', p_daily_date => v_today, p_duration_ms => 30000);
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_fastest, p_attempt_id => 'todayattempt00000115', p_correct => 4, p_total => 5,
    p_breakdown => '{"css":{"correct":4,"total":5}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Fastest, one wrong', p_daily_date => v_today, p_duration_ms => 10000);
  UPDATE public.user_stats SET show_on_leaderboards = TRUE WHERE user_id IN (v_slow, v_fast, v_fastest);

  -- One transaction records all three at the same instant; date them the way
  -- the day went: the slow result first, the fast one an hour later.
  UPDATE public.daily_attempts SET created_at = NOW() - INTERVAL '3 hours' WHERE user_id = v_slow;
  UPDATE public.daily_attempts SET created_at = NOW() - INTERVAL '2 hours' WHERE user_id = v_fast;
  UPDATE public.daily_attempts SET created_at = NOW() - INTERVAL '1 hour'  WHERE user_id = v_fastest;

  SELECT string_agg(display_name || ' ' || correct || '/' || total || ' in ' || duration_ms, ', ' ORDER BY n)
    INTO v_board
    FROM public.daily_leaderboard_v2(v_today, 'webdev', 50)
         WITH ORDINALITY AS b(display_name, picture, correct, total, duration_ms, attempted_at, n);
  ASSERT v_board = 'Slow and early 5/5 in 300000, Fast and late 5/5 in 30000, Fastest, one wrong 4/5 in 10000',
    format('correct answers decide, time does not; got %s', v_board);

  -- The screen's numbering: a row with the score of the row above takes its
  -- rank. Equal scores are adjacent, so they share one.
  SELECT string_agg(place::TEXT, ',' ORDER BY n) INTO v_ranks
    FROM (SELECT n, RANK() OVER (ORDER BY correct DESC) AS place
            FROM public.daily_leaderboard_v2(v_today, 'webdev', 50)
                 WITH ORDINALITY AS b(display_name, picture, correct, total, duration_ms, attempted_at, n)) ranked;
  ASSERT v_ranks = '1,1,3', format('equal scores share a rank: expected 1,1,3, got %s', v_ranks);

  -- Recorded the other way round, the order among the equal scores follows
  -- the record, and the faster time still decides nothing.
  UPDATE public.daily_attempts SET created_at = NOW() - INTERVAL '4 hours' WHERE user_id = v_fast;
  SELECT string_agg(display_name, ', ' ORDER BY n) INTO v_board
    FROM public.daily_leaderboard_v2(v_today, 'webdev', 50)
         WITH ORDINALITY AS b(display_name, picture, correct, total, duration_ms, attempted_at, n);
  ASSERT v_board = 'Fast and late, Slow and early, Fastest, one wrong',
    format('equal scores keep the order they were recorded in; got %s', v_board);
END;
$$;
