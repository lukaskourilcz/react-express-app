-- A learner's name and photo reach a public board only after they switch
-- them on (migration 049). Without that, every board lists their result with
-- a NULL name and a NULL picture, and so does the 30-day line marked as the
-- viewer's own. Switching the flag changes every board at once, and a later
-- quiz result leaves it as the learner set it. The results come in through
-- the real write path: verified quiz results, one of them a daily challenge.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today  CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_ada    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000110';
  v_bo     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000111';
  v_ada_photo CONSTANT TEXT := 'https://lh3.googleusercontent.com/a/ada';
  v_bo_photo  CONSTANT TEXT := 'https://lh3.googleusercontent.com/a/bo';
  v_flag     BOOLEAN;
  v_nullable TEXT;
  v_default  TEXT;
  v_boards   TEXT;
  v_expected TEXT;
  v_viewer   TEXT;
BEGIN
  SELECT is_nullable, column_default INTO v_nullable, v_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'user_stats' AND column_name = 'show_on_leaderboards';
  ASSERT v_nullable = 'NO' AND v_default = 'false',
    format('show_on_leaderboards is NOT NULL DEFAULT FALSE, got nullable=%s default=%s', v_nullable, v_default);

  -- Both play today's daily challenge; Ada gets one more right.
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_ada, p_attempt_id => 'consentattempt000110', p_correct => 8, p_total => 10,
    p_breakdown => '{"javascript":{"correct":8,"total":10}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Ada Lovelace', p_picture => v_ada_photo,
    p_daily_date => v_today, p_duration_ms => 90000);
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_bo, p_attempt_id => 'consentattempt000111', p_correct => 7, p_total => 10,
    p_breakdown => '{"javascript":{"correct":7,"total":10}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Bo Private', p_picture => v_bo_photo,
    p_daily_date => v_today, p_duration_ms => 60000);

  SELECT show_on_leaderboards INTO v_flag FROM public.user_stats WHERE user_id = v_bo;
  ASSERT v_flag IS FALSE, format('a new learner starts hidden, got %s', v_flag);

  -- Ada switches it on, as op=leaderboard-visibility does.
  UPDATE public.user_stats SET show_on_leaderboards = TRUE WHERE user_id = v_ada;

  -- Every public board, best result first: name/picture, "-" for NULL.
  SELECT concat_ws(' | ',
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY correct DESC)
         FROM public.window_leaderboard(30, 100, NULL, 5, NULL)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY total_correct DESC)
         FROM public.subject_leaderboard(ARRAY['javascript', 'typescript'], 100)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY total_correct DESC)
         FROM public.category_leaderboard('javascript', 50, 5)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY correct DESC)
         FROM public.daily_leaderboard_v2(v_today, 'webdev', 50)))
    INTO v_boards;
  v_expected := format('Ada Lovelace/%1$s, -/-', v_ada_photo);
  v_expected := concat_ws(' | ', v_expected, v_expected, v_expected, v_expected);
  ASSERT v_boards = v_expected,
    format('only the learner who switched it on is named, on all four boards; expected %s, got %s', v_expected, v_boards);

  -- Bo's own line on the 30-day board is marked as his and still unnamed:
  -- he sees what everybody else sees.
  SELECT COALESCE(display_name, '-') || '/' || COALESCE(picture, '-') INTO v_viewer
    FROM public.window_leaderboard(30, 100, NULL, 5, v_bo) WHERE is_viewer;
  ASSERT v_viewer = '-/-', format('the viewer''s own row follows the same rule, got %s', v_viewer);

  -- Both switch: Bo on, Ada off. A later result does not switch Bo back.
  UPDATE public.user_stats SET show_on_leaderboards = NOT show_on_leaderboards WHERE user_id IN (v_ada, v_bo);
  PERFORM public.record_verified_quiz_result_v2(
    p_user_id => v_bo, p_attempt_id => 'consentattempt000112', p_correct => 1, p_total => 1,
    p_breakdown => '{"typescript":{"correct":1,"total":1}}', p_outcomes => NULL, p_subject => 'webdev',
    p_quest_xp => 0, p_name => 'Bo Private', p_picture => v_bo_photo);
  SELECT show_on_leaderboards INTO v_flag FROM public.user_stats WHERE user_id = v_bo;
  ASSERT v_flag IS TRUE, format('a quiz result keeps the learner''s choice, got %s', v_flag);

  SELECT concat_ws(' | ',
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY correct DESC)
         FROM public.window_leaderboard(30, 100, 'javascript', 5, NULL)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY total_correct DESC)
         FROM public.subject_leaderboard(ARRAY['javascript'], 100)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY total_correct DESC)
         FROM public.category_leaderboard('javascript', 50, 5)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY correct DESC)
         FROM public.daily_leaderboard_v2(v_today, 'webdev', 50)))
    INTO v_boards;
  v_expected := format('-/-, Bo Private/%1$s', v_bo_photo);
  v_expected := concat_ws(' | ', v_expected, v_expected, v_expected, v_expected);
  ASSERT v_boards = v_expected,
    format('switching the flag changes every board; expected %s, got %s', v_expected, v_boards);

  -- Switched on with no stored name, the row keeps the photo and leaves the
  -- label to the client.
  UPDATE public.user_stats SET name = '   ' WHERE user_id = v_bo;
  SELECT COALESCE(display_name, '-') || '/' || COALESCE(picture, '-') INTO v_viewer
    FROM public.category_leaderboard('javascript', 50, 5) WHERE picture IS NOT NULL;
  ASSERT v_viewer = format('-/%s', v_bo_photo), format('a blank name is no name, got %s', v_viewer);
END;
$$;
