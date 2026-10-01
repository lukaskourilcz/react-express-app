-- A second shield keeps the first one's days (migration 052, review finding
-- RANK-1). Every shielded UTC date is kept in user_streak_freezes.shield_days
-- for 40 days. shield_until holds only the latest shield, and until 052 it
-- was the only record, so raising a second shield after the first had ended
-- turned the first one's two days into missed days and ended the streak.

SET LOCAL ROLE service_role;

-- The reviewer's two scenarios, through the real routines.
DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month   CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_second  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001501';
  v_back    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001502';
  v_granted BOOLEAN;
  v_left    INTEGER;
  v_days    DATE[];
  v_streak  INTEGER;
BEGIN
  -- Learnt two days ago and raised a shield then (a row from before 052:
  -- only shield_until, which ended at 00:00 today). Still away today, the
  -- learner raises a second shield with the last protection, then learns.
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_second, 20, 20, v_today - 2);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  VALUES (v_second, v_month, 1, to_jsonb(ARRAY[TO_CHAR(v_today - 2, 'YYYY-MM-DD')]), v_today::TIMESTAMP AT TIME ZONE 'UTC');

  SELECT s.granted, s.remaining INTO v_granted, v_left
    FROM public.activate_streak_shield(v_second) AS s;
  ASSERT v_granted AND v_left = 0, format('the second shield is raised: %s, %s left', v_granted, v_left);

  v_streak := public.advance_verified_streak(v_second);
  ASSERT v_streak = 21, format('learning under the second shield keeps the streak: expected 21, got %s', v_streak);
  SELECT shield_days INTO v_days FROM public.user_streak_freezes WHERE user_id = v_second;
  ASSERT v_days = ARRAY[v_today - 2, v_today - 1, v_today, v_today + 1],
    format('both shields'' days are kept: %s', v_days);

  -- Back after two shields raised back to back, four and two days ago: the
  -- row as the second activation leaves it. No protection is left and none
  -- is needed.
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_back, 20, 20, v_today - 4);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until, shield_days)
  VALUES (v_back, v_month, 0,
          to_jsonb(ARRAY[TO_CHAR(v_today - 4, 'YYYY-MM-DD'), TO_CHAR(v_today - 2, 'YYYY-MM-DD')]),
          v_today::TIMESTAMP AT TIME ZONE 'UTC',
          ARRAY[v_today - 4, v_today - 3, v_today - 2, v_today - 1]);
  PERFORM public.record_verified_quiz_result_v2(v_back, 'shielddays0000000001', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_back;
  SELECT remaining INTO v_left FROM public.user_streak_freezes WHERE user_id = v_back;
  ASSERT v_streak = 21 AND v_left = 0,
    format('four shielded days bridge the gap and spend nothing: streak %s, %s left', v_streak, v_left);
END;
$$;

-- What a shield stores: today and tomorrow added, sorted and distinct, and
-- nothing older than 40 days kept.
DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month   CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001511';
  v_granted BOOLEAN;
  v_outcome TEXT;
  v_days    DATE[];
  v_stored  DATE[];
BEGIN
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_days)
  VALUES (v_user, v_month, 2, '[]'::jsonb, ARRAY[v_today - 50, v_today - 41, v_today - 40, v_today - 12, v_today - 11]);

  SELECT s.granted, s.outcome, s.shield_days INTO v_granted, v_outcome, v_days
    FROM public.activate_streak_shield(v_user) AS s;
  SELECT shield_days INTO v_stored FROM public.user_streak_freezes WHERE user_id = v_user;
  ASSERT v_granted AND v_outcome = 'granted', format('the shield is raised: %s, %s', v_granted, v_outcome);
  ASSERT v_stored = ARRAY[v_today - 40, v_today - 12, v_today - 11, v_today, v_today + 1],
    format('40 days are kept and today and tomorrow added: %s', v_stored);
  ASSERT v_days = v_stored, format('and the routine returns them: %s', v_days);

  -- A second request while it runs changes nothing.
  SELECT s.granted, s.outcome, s.shield_days INTO v_granted, v_outcome, v_days
    FROM public.activate_streak_shield(v_user) AS s;
  ASSERT NOT v_granted AND v_outcome = 'running' AND v_days = v_stored,
    format('a running shield is returned as it is: %s, %s, %s', v_granted, v_outcome, v_days);
END;
$$;

-- Friends see the same streak, however long the chain of shields.
DO $$
DECLARE
  v_today  CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month  CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_me     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001521';
  v_chain  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001522';
  v_long   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001523';
  v_gap    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001524';
  v_streak INTEGER;
BEGIN
  PERFORM public.set_user_handle(v_me, 'me-150');
  PERFORM public.set_user_handle(v_chain, 'chain-150');
  PERFORM public.set_user_handle(v_long, 'long-150');
  PERFORM public.set_user_handle(v_gap, 'gap-150');
  PERFORM public.request_friend(v_me, 'chain-150');
  PERFORM public.respond_friend(v_chain, 'me-150', TRUE);
  PERFORM public.request_friend(v_me, 'long-150');
  PERFORM public.respond_friend(v_long, 'me-150', TRUE);
  PERFORM public.request_friend(v_me, 'gap-150');
  PERFORM public.respond_friend(v_gap, 'me-150', TRUE);

  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_chain, 9, 9, v_today - 4), (v_long, 9, 9, v_today - 9), (v_gap, 9, 9, v_today - 5);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until, shield_days)
  VALUES (v_chain, v_month, 0, '[]'::jsonb, v_today::TIMESTAMP AT TIME ZONE 'UTC',
          ARRAY[v_today - 4, v_today - 3, v_today - 2, v_today - 1]),
         -- Eight days, four shields back to back: longer than the six days
         -- friend_list used to cut off at.
         (v_long, v_month, 0, '[]'::jsonb, v_today::TIMESTAMP AT TIME ZONE 'UTC',
          ARRAY(SELECT (v_today - n)::DATE FROM generate_series(1, 8) AS n ORDER BY 1)),
         -- A hole in the chain with nothing left to pay for it.
         (v_gap, v_month, 0, '[]'::jsonb, v_today::TIMESTAMP AT TIME ZONE 'UTC',
          ARRAY[v_today - 4, v_today - 2, v_today - 1]);

  SELECT current_streak INTO v_streak FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'chain-150';
  ASSERT v_streak = 9, format('two shields back to back keep a friend''s streak: expected 9, got %s', v_streak);
  SELECT current_streak INTO v_streak FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'long-150';
  ASSERT v_streak = 9, format('eight shielded days keep it too: expected 9, got %s', v_streak);
  SELECT current_streak INTO v_streak FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'gap-150';
  ASSERT v_streak = 0, format('an unshielded day with no protection left ends it: expected 0, got %s', v_streak);

  -- And the friend's next learning day agrees.
  v_streak := public.advance_verified_streak(v_long);
  ASSERT v_streak = 10, format('the long chain carries the streak on: expected 10, got %s', v_streak);
END;
$$;
