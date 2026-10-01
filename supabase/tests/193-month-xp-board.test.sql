-- The "This month" board (migration 056; api/leaderboard.ts, period=month)
-- ranks one subject's current calendar month (UTC) by XP, with the ranking the
-- settlement pays: equal XP shares a place (1, 1, 3). A learner is named as on
-- every board (board_display_name, 055): nobody until they switch on
-- show_on_leaderboards, then their sharkname, or their Google name without
-- one. The photo follows the switch. The viewer's own row is marked under the
-- same rule, and month_xp_leaderboard_rank gives the viewer's own place, or
-- nothing without XP this month. Last month's XP and another subject's are
-- not on it.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today      CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_last_start CONSTANT DATE := (date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 month')::DATE;
  v_last       CONSTANT TEXT := TO_CHAR(date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 month', 'YYYY-MM');
  v_ada CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001941'; -- named, 500
  v_bo  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001942'; -- not named, 500
  v_cy  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001943'; -- no stats row, 300
  v_di  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001944'; -- XP last month only
  v_board TEXT;
  v_rank  RECORD;
  v_count INTEGER;
BEGIN
  INSERT INTO public.user_stats (user_id, name, picture, show_on_leaderboards) VALUES
    (v_ada, 'Ada Lovelace', 'https://lh3.googleusercontent.com/a/ada', TRUE),
    (v_bo,  'Bo Private',   'https://lh3.googleusercontent.com/a/bo',  FALSE),
    (v_di,  'Di Earlier',   NULL, TRUE);
  INSERT INTO public.user_xp_days (user_id, day, subject, xp) VALUES
    (v_ada, v_today, 'webdev', 500),
    (v_bo,  v_today, 'webdev', 500),
    (v_cy,  v_today, 'webdev', 300),
    (v_cy,  v_today, 'math',   9000),
    (v_di,  v_last_start, 'webdev', 800);

  SELECT string_agg(format('%s:%s:%s:%s:%s', b.rank, COALESCE(b.display_name, '-'), COALESCE(b.picture, '-'), b.xp, b.is_viewer), ' | ' ORDER BY b.n)
    INTO v_board FROM public.month_xp_leaderboard('webdev', 100, v_bo) WITH ORDINALITY AS b(rank, display_name, picture, xp, is_viewer, n);
  ASSERT v_board = '1:Ada Lovelace:https://lh3.googleusercontent.com/a/ada:500:f | 1:-:-:500:t | 3:-:-:300:f',
    format('this month''s XP, ties sharing first, names only when switched on, the viewer marked: %s', v_board);

  SELECT rank, xp INTO v_rank FROM public.month_xp_leaderboard_rank(v_bo, 'webdev');
  ASSERT v_rank.rank = 1 AND v_rank.xp = 500, format('the viewer''s own place: %s', v_rank);
  SELECT count(*) INTO v_count FROM public.month_xp_leaderboard_rank(v_di, 'webdev');
  ASSERT v_count = 0, 'no XP this month, no place';

  -- The board shows what the settlement will pay: the same ranking.
  ASSERT (SELECT string_agg(rank::TEXT, ',' ORDER BY rank, user_id) FROM public.month_xp_ranks('webdev', v_today)) = '1,1,3',
    'one ranking for the board and the settlement';

  -- Another month, named.
  SELECT string_agg(format('%s:%s:%s', rank, display_name, xp), ' ') INTO v_board
    FROM public.month_xp_leaderboard('webdev', 100, NULL, v_last);
  ASSERT v_board = '1:Di Earlier:800', format('last month''s board: %s', v_board);

  -- The limit, and nobody on another subject's board.
  SELECT count(*) INTO v_count FROM public.month_xp_leaderboard('webdev', 2, NULL);
  ASSERT v_count = 2, format('the limit holds: %s', v_count);
  SELECT string_agg(format('%s:%s', rank, xp), ' ') INTO v_board FROM public.month_xp_leaderboard('math', 100, NULL);
  ASSERT v_board = '1:9000', format('a subject''s board is its own: %s', v_board);

  -- A sharkname is the name on the board.
  PERFORM public.set_user_handle(v_ada, 'thirsty-sharkie');
  SELECT display_name INTO v_board FROM public.month_xp_leaderboard('webdev', 100, NULL) WHERE xp = 500 AND display_name IS NOT NULL;
  ASSERT v_board = 'thirsty-sharkie', format('the board shows the sharkname: %s', v_board);

  -- Switching the name off takes it off at once.
  UPDATE public.user_stats SET show_on_leaderboards = FALSE WHERE user_id = v_ada;
  SELECT count(*) INTO v_count FROM public.month_xp_leaderboard('webdev', 100, NULL) WHERE display_name IS NOT NULL OR picture IS NOT NULL;
  ASSERT v_count = 0, 'nobody is named once the switch is off';
END;
$$;

-- For the server only.
RESET ROLE;
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.month_xp_leaderboard(text, integer, text, text)', 'EXECUTE'), 'anon cannot run the board';
  ASSERT NOT has_function_privilege('authenticated', 'public.month_xp_leaderboard_rank(text, text, text)', 'EXECUTE'), 'nor a learner the rank';
  ASSERT NOT has_function_privilege('authenticated', 'public.month_xp_ranks(text, date)', 'EXECUTE'), 'nor the ranking';
  ASSERT has_function_privilege('service_role', 'public.month_xp_leaderboard(text, integer, text, text)', 'EXECUTE'), 'the API runs it';
END;
$$;
