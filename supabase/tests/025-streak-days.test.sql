-- The streak counts UTC days with verified learning, driven here by quizzes
-- (migration 048 adds Learn, coding and the Challenge). The next day adds one, the
-- same day adds nothing, up to two missed days are bridged by the month's two
-- streak protections, a raised shield covers the days it spans, and a longer
-- gap starts the streak again at one.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_next  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000251';
  v_gap2  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000252';
  v_gap3  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000253';
  v_guard CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000254';
  v_streak INTEGER;
  v_longest INTEGER;
  v_remaining INTEGER;
BEGIN
  INSERT INTO public.user_stats (user_id, total_quizzes, total_correct, total_questions, current_streak, longest_streak, last_quiz_date)
  VALUES (v_next,  5, 5, 5, 5, 5, v_today - 1),
         (v_gap2,  5, 5, 5, 5, 5, v_today - 3),
         (v_gap3,  5, 5, 5, 5, 9, v_today - 4),
         (v_guard, 5, 5, 5, 5, 5, v_today - 2);

  -- Yesterday, then today: one more day.
  PERFORM public.record_verified_quiz_result_v2(v_next, 'streakattempt0000001', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak, longest_streak INTO v_streak, v_longest FROM public.user_stats WHERE user_id = v_next;
  ASSERT v_streak = 6 AND v_longest = 6, format('the next day extends the streak to 6/6, got %s/%s', v_streak, v_longest);
  -- A second quiz the same day does not count the day twice.
  PERFORM public.record_verified_quiz_result_v2(v_next, 'streakattempt0000002', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_next;
  ASSERT v_streak = 6, format('the same day counts once, got %s', v_streak);

  -- Two missed days: both protections are spent and the streak goes on.
  PERFORM public.record_verified_quiz_result_v2(v_gap2, 'streakattempt0000003', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_gap2;
  SELECT remaining INTO v_remaining FROM public.user_streak_freezes WHERE user_id = v_gap2;
  ASSERT v_streak = 6, format('two missed days are bridged, got a streak of %s', v_streak);
  ASSERT v_remaining = 0, format('bridging two days spends both protections, %s left', v_remaining);

  -- Three missed days: more than the two protections cover, so it restarts
  -- and spends nothing; the longest streak is kept.
  PERFORM public.record_verified_quiz_result_v2(v_gap3, 'streakattempt0000004', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak, longest_streak INTO v_streak, v_longest FROM public.user_stats WHERE user_id = v_gap3;
  SELECT remaining INTO v_remaining FROM public.user_streak_freezes WHERE user_id = v_gap3;
  ASSERT v_streak = 1, format('three missed days restart the streak at 1, got %s', v_streak);
  ASSERT v_longest = 9, format('a restart keeps the longest streak, got %s', v_longest);
  ASSERT COALESCE(v_remaining, 2) = 2, format('a restart spends no protection, %s left', v_remaining);

  -- A shield raised yesterday covers yesterday: nothing missed, nothing spent
  -- beyond the one protection the shield itself cost.
  PERFORM public.activate_streak_shield(v_guard);
  UPDATE public.user_streak_freezes SET shield_until = NOW() + INTERVAL '24 hours' WHERE user_id = v_guard;
  PERFORM public.record_verified_quiz_result_v2(v_guard, 'streakattempt0000005', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_guard;
  SELECT remaining INTO v_remaining FROM public.user_streak_freezes WHERE user_id = v_guard;
  ASSERT v_streak = 6, format('a day under the shield is not missed, got a streak of %s', v_streak);
  ASSERT v_remaining = 1, format('only the shield spent a protection, %s left', v_remaining);
END;
$$;
