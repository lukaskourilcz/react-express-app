SET LOCAL ROLE service_role;
DO $$
DECLARE n BIGINT; a JSONB; b JSONB; named TEXT;
BEGIN
  SELECT next_number INTO n FROM public.shark_name_counter WHERE singleton;
  ASSERT public.save_completed_challenge_score('sqlzeroscore000001', NULL, 'webdev', 0, 'sleepySharkie', '["javascript"]', FALSE) IS NULL;
  ASSERT NOT EXISTS (SELECT 1 FROM public.challenge_scores WHERE run_id = 'sqlzeroscore000001');
  ASSERT NOT EXISTS (SELECT 1 FROM public.shark_name_allocations WHERE identity_key = 'guest:sqlzeroscore000001');
  ASSERT (SELECT next_number FROM public.shark_name_counter WHERE singleton) = n;
  a := public.save_completed_challenge_score('sqlpositivescore001', NULL, 'webdev', 4, 'sleepySharkie', '["javascript","typescript"]', FALSE);
  b := public.save_completed_challenge_score('sqlpositivescore001', NULL, 'webdev', 4, 'hungryFin', '["javascript","typescript"]', FALSE);
  ASSERT a = b;
  ASSERT (SELECT count(*) FROM public.challenge_scores WHERE run_id = 'sqlpositivescore001') = 1;
  ASSERT (SELECT next_number FROM public.shark_name_counter WHERE singleton) = n + 1;
  ASSERT a->'selected_topics' = '["javascript","typescript"]'::JSONB;
  ASSERT a->>'all_topics' = 'false';
  BEGIN
    PERFORM public.save_completed_challenge_score('sqlpositivescore001', NULL, 'webdev', 4, 'sleepySharkie', '["javascript"]', FALSE);
    RAISE EXCEPTION 'expected immutable scope';
  EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM = 'challenge_score_conflict'; END;
  INSERT INTO public.user_stats(user_id,name,picture) VALUES('sql-auto-board-user','Verified Account','https://lh3.googleusercontent.com/a/board');
  named := public.board_display_name('sql-auto-board-user');
  ASSERT named ~ '^[a-z][A-Za-z]+[1-9][0-9]*$';
  PERFORM public.set_friend_display('sql-auto-board-user', TRUE, TRUE);
  ASSERT public.board_display_name('sql-auto-board-user') = named;
  UPDATE public.user_handles SET leaderboard_name_mode='account',leaderboard_account_name='Verified Account' WHERE user_id='sql-auto-board-user';
  ASSERT public.board_display_name('sql-auto-board-user') = 'Verified Account';
  ASSERT (SELECT show_real_name AND show_photo_to_friends FROM public.user_handles WHERE user_id='sql-auto-board-user');
  UPDATE public.user_handles SET leaderboard_name_mode='account',leaderboard_account_name=repeat('A',60) WHERE user_id='sql-auto-board-user';
  a := public.save_completed_challenge_score('sqllongnamescore001','sql-auto-board-user','webdev',9,'hungryFin','["javascript"]',FALSE);
  ASSERT char_length(a->>'name')=60;
  a := public.save_completed_challenge_score('sqlsignedscore0001','sql-auto-board-user','webdev',8,'hungryFin','["javascript"]',TRUE);
  ASSERT a->>'name' = 'Verified Account';
  UPDATE public.user_handles SET leaderboard_name_mode='nickname' WHERE user_id='sql-auto-board-user';
  ASSERT (SELECT name FROM public.challenge_leaderboard('webdev') WHERE id=(a->>'id')::UUID) = named;
  ASSERT NOT (SELECT show_on_leaderboards FROM public.user_stats WHERE user_id='sql-auto-board-user');
  ASSERT (SELECT show_real_name AND show_photo_to_friends FROM public.user_handles WHERE user_id='sql-auto-board-user');
  BEGIN
    UPDATE public.user_handles SET leaderboard_account_name='person@example.com' WHERE user_id='sql-auto-board-user';
    RAISE EXCEPTION 'expected email protection';
  EXCEPTION WHEN check_violation THEN NULL; END;
  ASSERT NOT has_function_privilege('authenticated','public.save_completed_challenge_score(text,text,text,integer,text,jsonb,boolean)','EXECUTE');
END; $$;
