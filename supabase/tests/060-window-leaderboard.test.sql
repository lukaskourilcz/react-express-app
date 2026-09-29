-- The 30-day board ranks correct answers first and, for the same number
-- correct, fewer answers first. Nobody with fewer than five answers in the
-- window is on it, answers older than the window do not count, and the
-- personal rank agrees with the board. The answers come in through the real
-- write path: verified quiz results.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_eight_ten    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000061';
  v_eight_twelve CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000062';
  v_nine_twenty  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000063';
  v_four_answers CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000064';
  v_edge_inside  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000065';
  v_edge_outside CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000066';
  v_board TEXT;
  v_rank INTEGER;
  v_viewer TEXT;
BEGIN
  PERFORM public.record_verified_quiz_result_v2(v_eight_ten, 'boardattempt00000061', 8, 10,
    '{"javascript":{"correct":8,"total":10}}', NULL, 'webdev', 0, NULL, 'Eight of ten');
  PERFORM public.record_verified_quiz_result_v2(v_eight_twelve, 'boardattempt00000062', 8, 12,
    '{"javascript":{"correct":8,"total":12}}', NULL, 'webdev', 0, NULL, 'Eight of twelve');
  PERFORM public.record_verified_quiz_result_v2(v_nine_twenty, 'boardattempt00000063', 9, 20,
    '{"javascript":{"correct":9,"total":20}}', NULL, 'webdev', 0, NULL, 'Nine of twenty');
  PERFORM public.record_verified_quiz_result_v2(v_four_answers, 'boardattempt00000064', 4, 4,
    '{"javascript":{"correct":4,"total":4}}', NULL, 'webdev', 0, NULL, 'Four answers');
  -- Names show only for learners who switched them on (migration 049).
  UPDATE public.user_stats SET show_on_leaderboards = TRUE
   WHERE user_id IN (v_eight_ten, v_eight_twelve, v_nine_twenty, v_four_answers);

  SELECT string_agg(rank || ':' || display_name, ', ' ORDER BY rank, display_name) INTO v_board
    FROM public.window_leaderboard(30, 100, 'javascript', 5, NULL);
  ASSERT v_board = '1:Nine of twenty, 2:Eight of ten, 3:Eight of twelve',
    format('9/20 ranks 1, 8/10 ranks 2, 8/12 ranks 3, and 4 answers are not enough; got %s', v_board);

  SELECT rank INTO v_rank FROM public.window_leaderboard_rank(v_eight_twelve, 30, 'javascript', 5);
  ASSERT v_rank = 3, format('the personal rank matches the board: expected 3, got %s', v_rank);
  SELECT rank INTO v_rank FROM public.window_leaderboard_rank(v_four_answers, 30, 'javascript', 5);
  ASSERT v_rank IS NULL, format('a learner under five answers has no rank, got %s', v_rank);

  SELECT string_agg(display_name, ', ') INTO v_viewer
    FROM public.window_leaderboard(30, 100, 'javascript', 5, v_eight_ten) WHERE is_viewer;
  ASSERT v_viewer = 'Eight of ten', format('only the viewer''s own line is marked, got %s', v_viewer);

  -- The window: day 30 back is inside a 30-day board (today counts as day 1),
  -- day 31 back is not. Written as the dated rows the board reads.
  PERFORM public.add_activity_day(v_edge_inside,  v_today - 29, 'css', 10, 10);
  PERFORM public.add_activity_day(v_edge_outside, v_today - 30, 'css', 10, 10);
  INSERT INTO public.user_stats (user_id, name, show_on_leaderboards)
    VALUES (v_edge_inside, 'Inside', TRUE), (v_edge_outside, 'Outside', TRUE);
  SELECT string_agg(display_name, ', ' ORDER BY display_name) INTO v_board
    FROM public.window_leaderboard(30, 100, 'css', 5, NULL);
  ASSERT v_board = 'Inside', format('only answers inside the 30 days count, got %s', v_board);
  SELECT string_agg(display_name, ', ' ORDER BY display_name) INTO v_board
    FROM public.window_leaderboard(7, 100, 'css', 5, NULL);
  ASSERT v_board IS NULL, format('neither is inside a 7-day board, got %s', v_board);
END;
$$;
