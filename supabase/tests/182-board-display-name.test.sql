-- The name on a public board follows the learner's choice for friends
-- (migration 055). With "Show my name and photo on leaderboards" off, a row
-- has no name and no photo ("Learner"), whatever else is set. With it on, the
-- row shows the sharkname, or the Google name when the learner chose that; a
-- learner with no sharkname keeps the Google name they consented to under
-- 049; and an email/password account, which has no Google name, appears by
-- its sharkname. The photo still follows the leaderboard switch alone. All
-- four boards and board_display_name() agree.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  -- Ordered by result, best first, so each board reads in this order.
  v_shark   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000187';  -- sharkname, consent on
  v_named   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000188';  -- chose own name, consent on
  v_email   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000189';  -- email account, sharkname, consent on
  v_nohdl   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000190';  -- no sharkname, consent on
  v_hidden  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000191';  -- chose own name, consent off
  v_photo   CONSTANT TEXT := 'https://lh3.googleusercontent.com/a/';
  v_ids     TEXT[];
  v_id      TEXT;
  v_n       INTEGER := 0;
  v_expected TEXT;
  v_boards  TEXT;
  v_name    TEXT;
BEGIN
  v_ids := ARRAY[v_shark, v_named, v_email, v_nohdl, v_hidden];
  FOREACH v_id IN ARRAY v_ids LOOP
    v_n := v_n + 1;
    -- 10 answers each, fewer right the further down the list.
    PERFORM public.add_activity_day(v_id, v_today, 'javascript', 11 - v_n, 10);
    INSERT INTO public.daily_attempts (user_id, challenge_date, subject, correct, total, duration_ms)
    VALUES (v_id, v_today, 'webdev', 11 - v_n, 10, 60000);
  END LOOP;

  INSERT INTO public.user_stats (user_id, name, picture, show_on_leaderboards) VALUES
    (v_shark,  'Sam Shark',    v_photo || 'sam',  TRUE),
    (v_named,  'Nora Named',   v_photo || 'nora', TRUE),
    (v_email,  NULL,           NULL,              TRUE),
    (v_nohdl,  'Noel Nohandle', v_photo || 'noel', TRUE),
    (v_hidden, 'Hana Hidden',  v_photo || 'hana', FALSE);
  PERFORM public.set_user_handle(v_shark, 'thirsty-sharkie-182');
  PERFORM public.set_user_handle(v_named, 'el-tiburon-loco-182');
  PERFORM public.set_user_handle(v_email, 'fin-de-fiesta-182');
  PERFORM public.set_user_handle(v_hidden, 'mucho-chomp-shark-182');
  PERFORM public.set_friend_display(v_named, TRUE, NULL);
  PERFORM public.set_friend_display(v_hidden, TRUE, TRUE);
  -- The email account asks for its "real name"; it has none, so the
  -- sharkname still shows.
  PERFORM public.set_friend_display(v_email, TRUE, NULL);

  v_expected := format(
    'thirsty-sharkie-182/%1$ssam, Nora Named/%1$snora, fin-de-fiesta-182/-, Noel Nohandle/%1$snoel, -/-',
    v_photo);

  SELECT concat_ws(' | ',
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY correct DESC)
         FROM public.window_leaderboard(30, 100, NULL, 5, NULL)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY total_correct DESC)
         FROM public.subject_leaderboard(ARRAY['javascript'], 100)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY total_correct DESC)
         FROM public.category_leaderboard('javascript', 50, 5)),
      (SELECT string_agg(COALESCE(display_name, '-') || '/' || COALESCE(picture, '-'), ', ' ORDER BY correct DESC)
         FROM public.daily_leaderboard_v2(v_today, 'webdev', 50)))
    INTO v_boards;
  ASSERT v_boards = concat_ws(' | ', v_expected, v_expected, v_expected, v_expected),
    format('every board names learners by the same rule; expected %s on each, got %s', v_expected, v_boards);

  -- The helper G4's monthly board reads, row by row.
  ASSERT public.board_display_name(v_shark) = 'thirsty-sharkie-182', 'sharkname by default';
  ASSERT public.board_display_name(v_named) = 'Nora Named', 'the Google name when chosen';
  ASSERT public.board_display_name(v_email) = 'fin-de-fiesta-182', 'an email account by its sharkname';
  ASSERT public.board_display_name(v_nohdl) = 'Noel Nohandle', 'no sharkname: the consented name';
  ASSERT public.board_display_name(v_hidden) IS NULL, 'consent off: no name, whatever else is chosen';
  ASSERT public.board_display_name('aaaaaaaa-0000-4000-8000-000000000192') IS NULL, 'no stats row: no name';

  -- Switching the name choice back moves every board at once; the photo
  -- stays where the leaderboard switch put it.
  PERFORM public.set_friend_display(v_named, FALSE, NULL);
  SELECT COALESCE(display_name, '-') || '/' || COALESCE(picture, '-') INTO v_name
    FROM public.window_leaderboard(30, 100, NULL, 5, v_named) WHERE is_viewer;
  ASSERT v_name = format('el-tiburon-loco-182/%snora', v_photo),
    format('back to the sharkname, the photo unchanged; got %s', v_name);

  -- And consent off hides the row again, sharkname and photo both.
  UPDATE public.user_stats SET show_on_leaderboards = FALSE WHERE user_id = v_email;
  SELECT COALESCE(display_name, '-') INTO v_name
    FROM public.subject_leaderboard(ARRAY['javascript'], 100) WHERE total_correct = 8;
  ASSERT v_name = '-', format('switching consent off hides the sharkname too; got %s', v_name);

  ASSERT NOT has_function_privilege('authenticated', 'public.board_display_name(text)', 'EXECUTE'),
    'board_display_name is service-role only';
END;
$$;
