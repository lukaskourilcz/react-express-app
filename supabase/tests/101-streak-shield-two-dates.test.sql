-- Protections and the shield work for every kind of learning day, through
-- advance_verified_streak (migration 048). A shield covers exactly two UTC
-- dates: the one it was raised on and the next. Raised at 00:01 on a Monday it
-- covers Monday and Tuesday and not Wednesday, although its 48 hours run
-- into Wednesday.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month   CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_gap     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001101';
  v_bare    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001102';
  v_spare   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001103';
  v_late    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001104';
  v_both    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001105';
  -- "Monday" is three days ago, the learner's last day the day before it.
  v_monday  CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE - 3;
  v_streak  INTEGER;
  v_left    INTEGER;
  v_used    JSONB;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_gap,   5, 5, v_today - 3),
         (v_bare,  5, 5, v_monday - 1),
         (v_spare, 5, 5, v_monday - 1),
         (v_late,  5, 5, v_monday - 1),
         (v_both,  5, 5, v_monday - 1);

  -- Two missed days, a coding pass today: both protections bridge them.
  PERFORM public.record_coding_verdict(v_gap, 'shieldcoding0001', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_gap;
  SELECT remaining, used INTO v_left, v_used FROM public.user_streak_freezes WHERE user_id = v_gap;
  ASSERT v_streak = 6 AND v_left = 0, format('two missed days are bridged by both protections: %s, %s left', v_streak, v_left);
  ASSERT v_used @> to_jsonb(ARRAY[TO_CHAR(v_today - 2, 'YYYY-MM-DD'), TO_CHAR(v_today - 1, 'YYYY-MM-DD')]),
    format('the bridged days are the missed ones: %s', v_used);

  -- A shield raised at 00:01 on Monday: its row as a pre-048 shield stores it,
  -- 48 hours on. Monday and Tuesday are covered; Wednesday (yesterday) is not,
  -- and with no protection left the streak starts again.
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  VALUES (v_bare,  v_month, 0, '[]'::jsonb, (v_monday::TIMESTAMP + INTERVAL '1 minute' + INTERVAL '48 hours') AT TIME ZONE 'UTC'),
         (v_spare, v_month, 1, '[]'::jsonb, (v_monday::TIMESTAMP + INTERVAL '1 minute' + INTERVAL '48 hours') AT TIME ZONE 'UTC'),
         (v_late,  v_month, 0, '[]'::jsonb, (v_monday::TIMESTAMP + INTERVAL '23 hours 59 minutes' + INTERVAL '48 hours') AT TIME ZONE 'UTC'),
         -- A shield raised on Tuesday covers Tuesday and Wednesday; Monday
         -- needs the one protection left.
         (v_both,  v_month, 1, '[]'::jsonb, ((v_monday + 1)::TIMESTAMP + INTERVAL '10 hours' + INTERVAL '48 hours') AT TIME ZONE 'UTC');

  PERFORM public.record_challenge_completion(v_bare, 'shieldchallenge00001', 'webdev', 10);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_bare;
  ASSERT v_streak = 1, format('the third date is not covered: the streak starts again, got %s', v_streak);

  PERFORM public.record_roadmap_answer_v2('shieldlearn000000001', v_spare, 'q1', 1, 1, 'webdev', 'html', 'level', 1, 1, 50);
  PERFORM public.complete_verified_roadmap_attempt(v_spare, 'shieldlearn000000001');
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_spare;
  SELECT remaining, used INTO v_left, v_used FROM public.user_streak_freezes WHERE user_id = v_spare;
  ASSERT v_streak = 6 AND v_left = 0, format('one protection pays for Wednesday: %s, %s left', v_streak, v_left);
  ASSERT v_used = to_jsonb(ARRAY[TO_CHAR(v_today - 1, 'YYYY-MM-DD')]),
    format('only Wednesday was bridged; Monday and Tuesday were the shield''s: %s', v_used);

  -- Raised at 23:59 on Monday: still Monday and Tuesday only.
  PERFORM public.record_verified_quiz_result_v2(v_late, 'shieldquiz0000000001', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_late;
  ASSERT v_streak = 1, format('a shield raised late on Monday does not cover Wednesday, got %s', v_streak);

  PERFORM public.record_coding_verdict(v_both, 'shieldcoding0002', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_both;
  SELECT used INTO v_used FROM public.user_streak_freezes WHERE user_id = v_both;
  ASSERT v_streak = 6 AND v_used = to_jsonb(ARRAY[TO_CHAR(v_monday, 'YYYY-MM-DD')]),
    format('a Tuesday shield covers Tuesday and Wednesday, Monday takes a protection: %s, %s', v_streak, v_used);
END;
$$;

-- A shield raised now ends when tomorrow ends (UTC), so the time the Profile
-- shows as left is the time it covers. A shield counts as running only while
-- it covers today.
DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month   CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001111';
  v_old     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001112';
  v_granted BOOLEAN;
  v_until   TIMESTAMPTZ;
  v_left    INTEGER;
BEGIN
  SELECT s.granted, s.shield_until, s.remaining INTO v_granted, v_until, v_left
    FROM public.activate_streak_shield(v_user) AS s;
  ASSERT v_granted AND v_left = 1, format('a shield is raised for one protection: %s, %s left', v_granted, v_left);
  ASSERT v_until = (v_today + 2)::TIMESTAMP AT TIME ZONE 'UTC',
    format('it runs to 00:00 UTC the day after tomorrow, got %s', v_until);
  ASSERT ((v_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE = v_today,
    'and 48 hours before its end is the day it was raised';

  SELECT s.granted, s.remaining INTO v_granted, v_left FROM public.activate_streak_shield(v_user) AS s;
  ASSERT NOT v_granted AND v_left = 1, format('a second request while it runs spends nothing: %s, %s left', v_granted, v_left);

  -- Raised at 23:59 two days ago the pre-048 way: its 48 hours run into today
  -- but it covers only the two days before, so a new shield can be raised.
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  VALUES (v_old, v_month, 1, '[]'::jsonb, ((v_today - 2)::TIMESTAMP + INTERVAL '23 hours 59 minutes' + INTERVAL '48 hours') AT TIME ZONE 'UTC');
  SELECT s.granted, s.shield_until, s.remaining INTO v_granted, v_until, v_left FROM public.activate_streak_shield(v_old) AS s;
  ASSERT v_granted AND v_left = 0 AND v_until = (v_today + 2)::TIMESTAMP AT TIME ZONE 'UTC',
    format('a shield that no longer covers today does not block a new one: %s, %s left, until %s', v_granted, v_left, v_until);
END;
$$;

-- Friends see the same live streak, and "active today" means a day of any
-- verified learning.
DO $$
DECLARE
  v_today  CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month  CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_monday CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE - 3;
  v_me     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001121';
  v_bare   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001122';
  v_spare  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001123';
  v_coder  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001124';
  v_streak INTEGER;
  v_active BOOLEAN;
BEGIN
  PERFORM public.set_user_handle(v_me, 'me-101');
  PERFORM public.set_user_handle(v_bare, 'bare-101');
  PERFORM public.set_user_handle(v_spare, 'spare-101');
  PERFORM public.set_user_handle(v_coder, 'coder-101');
  PERFORM public.request_friend(v_me, 'bare-101');
  PERFORM public.respond_friend(v_bare, 'me-101', TRUE);
  PERFORM public.request_friend(v_me, 'spare-101');
  PERFORM public.respond_friend(v_spare, 'me-101', TRUE);
  PERFORM public.request_friend(v_me, 'coder-101');
  PERFORM public.respond_friend(v_coder, 'me-101', TRUE);

  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_bare, 9, 9, v_monday - 1), (v_spare, 9, 9, v_monday - 1);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  VALUES (v_bare,  v_month, 0, '[]'::jsonb, (v_monday::TIMESTAMP + INTERVAL '1 minute' + INTERVAL '48 hours') AT TIME ZONE 'UTC'),
         (v_spare, v_month, 1, '[]'::jsonb, (v_monday::TIMESTAMP + INTERVAL '1 minute' + INTERVAL '48 hours') AT TIME ZONE 'UTC');

  SELECT current_streak INTO v_streak FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'bare-101';
  ASSERT v_streak = 0, format('a friend''s shield leaves Wednesday uncovered: shows 0, got %s', v_streak);
  SELECT current_streak INTO v_streak FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'spare-101';
  ASSERT v_streak = 9, format('with a protection left for Wednesday it shows 9, got %s', v_streak);

  -- A coding pass today: learnt today, streak 1.
  PERFORM public.record_coding_verdict(v_coder, 'friendcoding0001', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  SELECT current_streak, active_today INTO v_streak, v_active
    FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'coder-101';
  ASSERT v_streak = 1 AND v_active IS TRUE, format('a friend who passed a coding task today is active today: %s, %s', v_streak, v_active);
  SELECT active_today INTO v_active FROM public.friend_list(v_me, ARRAY['javascript']) WHERE handle = 'spare-101';
  ASSERT v_active IS FALSE, 'a friend who has not learnt today is not active today';
END;
$$;
