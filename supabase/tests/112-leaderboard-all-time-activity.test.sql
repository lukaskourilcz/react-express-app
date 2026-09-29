-- The all-time boards count what the 30-day board counts (migration 049):
-- user_activity_days, with no window. A learner who only answered Learn
-- questions is on them; answers older than 30 days count there and not on the
-- 30-day board; quiz totals that exist only in user_category_stats (history
-- from before migration 040) are not copied in; four answers are not enough;
-- and the rule is the 30-day board's: correct answers, then fewer answers.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today      CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_learn_only CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000116';
  v_quiz       CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000117';
  v_veteran    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000118';
  v_legacy     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000119';
  v_four       CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000120';
  i INTEGER;
  v_board TEXT;
BEGIN
  -- Learn only: a six-question level, five right, through the Learn write path.
  FOR i IN 1..6 LOOP
    PERFORM public.record_roadmap_answer_v2(
      'alltimelearn00000116', v_learn_only, 'q' || i, CASE WHEN i = 6 THEN 0 ELSE 1 END, 1,
      'webdev', 'html', 'level', 1, 6, 50);
  END LOOP;
  -- A quiz: five of eight.
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_quiz, p_attempt_id => 'alltimeattempt000117', p_correct => 5, p_total => 8,
    p_breakdown => '{"html":{"correct":5,"total":8}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Quiz taker');
  -- Nine of twelve, 200 days ago.
  PERFORM public.add_activity_day(v_veteran, v_today - 200, 'html', 9, 12);
  -- Forty of fifty from before dated activity began: only in user_category_stats.
  INSERT INTO public.user_category_stats (user_id, category, total_correct, total_questions)
  VALUES (v_legacy, 'html', 40, 50);
  -- Four answers, all right.
  PERFORM public.add_activity_day(v_four, v_today, 'html', 4, 4);

  INSERT INTO public.user_stats (user_id, name, show_on_leaderboards) VALUES
    (v_learn_only, 'Learn only', TRUE), (v_veteran, 'Veteran', TRUE),
    (v_legacy, 'Legacy', TRUE), (v_four, 'Four answers', TRUE);
  UPDATE public.user_stats SET show_on_leaderboards = TRUE WHERE user_id = v_quiz;

  SELECT string_agg(display_name || ' ' || total_correct || '/' || total_questions, ', ' ORDER BY n) INTO v_board
    FROM public.subject_leaderboard(ARRAY['html', 'css', 'javascript'], 100)
         WITH ORDINALITY AS b(display_name, picture, total_correct, total_questions, accuracy_pct, n);
  ASSERT v_board = 'Veteran 9/12, Learn only 5/6, Quiz taker 5/8',
    format('the all-time board counts Learn and old answers, not pre-040 totals or four answers; got %s', v_board);

  SELECT string_agg(display_name || ' ' || total_correct || '/' || total_questions, ', ' ORDER BY n) INTO v_board
    FROM public.category_leaderboard('html', 50, 5)
         WITH ORDINALITY AS b(display_name, picture, total_correct, total_questions, accuracy_pct, n);
  ASSERT v_board = 'Veteran 9/12, Learn only 5/6, Quiz taker 5/8',
    format('a topic''s all-time board counts the same; got %s', v_board);

  SELECT string_agg(rank || ':' || display_name, ', ' ORDER BY rank) INTO v_board
    FROM public.window_leaderboard(30, 100, 'html', 5, NULL);
  ASSERT v_board = '1:Learn only, 2:Quiz taker',
    format('the 30-day board over the same rows leaves out the 200-day-old answers; got %s', v_board);
END;
$$;
