-- A streak day is any UTC day with verified learning (migration 048): a quiz,
-- a finished Learn level or part test (passed or not), a passing coding
-- verdict, or a Biggest Shark Challenge run that earned XP. Each source moves
-- the streak once a day, and a replayed receipt moves nothing.
--
-- A test cannot move NOW(), so "the next day" is simulated by moving the
-- learner's last learning day back by one: after a replay the stored day must
-- still be the one the test wrote.

SET LOCAL ROLE service_role;

-- Learn: a finished level extends the streak once a day.
DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001001';
  v_fail    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001002';
  v_new     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001003';
  v_done    BOOLEAN;
  v_streak  INTEGER;
  v_longest INTEGER;
  v_last    DATE;
  v_quizzes INTEGER;
  v_name    TEXT;
BEGIN
  INSERT INTO public.user_stats (user_id, total_quizzes, current_streak, longest_streak, last_quiz_date)
  VALUES (v_user, 3, 5, 5, v_today - 1),
         (v_fail, 3, 5, 5, v_today - 1);

  PERFORM public.record_roadmap_answer_v2('streaklearn000000001', v_user, 'q1', 1, 1, 'webdev', 'html', 'level', 1, 1, 50);
  v_done := public.complete_verified_roadmap_attempt(v_user, 'streaklearn000000001');
  ASSERT v_done IS TRUE, 'the level completes';
  SELECT current_streak, longest_streak, last_quiz_date INTO v_streak, v_longest, v_last
    FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 6 AND v_longest = 6 AND v_last = v_today,
    format('a Learn level on a new day extends the streak to 6/6 today, got %s/%s on %s', v_streak, v_longest, v_last);

  -- A second level the same day: the day is already counted.
  PERFORM public.record_roadmap_answer_v2('streaklearn000000002', v_user, 'q1', 1, 1, 'webdev', 'html', 'level', 2, 1, 50);
  PERFORM public.complete_verified_roadmap_attempt(v_user, 'streaklearn000000002');
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 6, format('a second completion the same day does not count the day twice, got %s', v_streak);

  -- The completed attempt again, as if on the next day: a replay moves nothing.
  UPDATE public.user_stats SET last_quiz_date = v_today - 1 WHERE user_id = v_user;
  v_done := public.complete_verified_roadmap_attempt(v_user, 'streaklearn000000001');
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_done IS FALSE AND v_streak = 6 AND v_last = v_today - 1,
    format('a replayed completion does not advance the streak: %s, %s on %s', v_done, v_streak, v_last);

  -- A failed level still finished every question: it counts as learning.
  PERFORM public.record_roadmap_answer_v2('streaklearn000000003', v_fail, 'q1', 0, 1, 'webdev', 'html', 'level', 1, 1, 50);
  PERFORM public.complete_verified_roadmap_attempt(v_fail, 'streaklearn000000003');
  SELECT current_streak INTO v_streak FROM public.user_stats WHERE user_id = v_fail;
  ASSERT v_streak = 6, format('a failed but finished level extends the streak, got %s', v_streak);

  -- A learner with no stats row yet gets one with zero totals and no profile.
  PERFORM public.record_roadmap_answer_v2('streaklearn000000004', v_new, 'q1', 1, 1, 'webdev', 'css', 'checkpoint', 1, 1, 50);
  PERFORM public.complete_verified_roadmap_attempt(v_new, 'streaklearn000000004');
  SELECT current_streak, total_quizzes, name, last_quiz_date INTO v_streak, v_quizzes, v_name, v_last
    FROM public.user_stats WHERE user_id = v_new;
  ASSERT v_streak = 1 AND v_quizzes = 0 AND v_name IS NULL AND v_last = v_today,
    format('a first part test starts a streak of 1 with zero quizzes and no name: %s, %s, %s, %s', v_streak, v_quizzes, v_name, v_last);
END;
$$;

-- Coding: any passing verdict extends the streak; a failed run or a replay
-- does not.
DO $$
DECLARE
  v_today  CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001011';
  v_result JSONB;
  v_streak INTEGER;
  v_last   DATE;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_user, 5, 5, v_today - 1);

  PERFORM public.record_coding_verdict(v_user, 'streakcoding0001', 'js-double-numbers', 'javascript', 'failed', TRUE, 20);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 5 AND v_last = v_today - 1, format('a failed run is not a streak day: %s on %s', v_streak, v_last);

  v_result := public.record_coding_verdict(v_user, 'streakcoding0002', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 6 AND v_last = v_today, format('a coding pass extends the streak: %s on %s (%s)', v_streak, v_last, v_result);

  -- The same verdict again, as if on the next day.
  UPDATE public.user_stats SET last_quiz_date = v_today - 1 WHERE user_id = v_user;
  v_result := public.record_coding_verdict(v_user, 'streakcoding0002', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT (v_result ->> 'applied')::BOOLEAN IS FALSE AND v_streak = 6 AND v_last = v_today - 1,
    format('a replayed verdict does not advance the streak: %s on %s (%s)', v_streak, v_last, v_result);

  -- A review pass of a task passed before is learning too.
  PERFORM public.record_coding_verdict(v_user, 'streakcoding0003', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_streak = 7 AND v_last = v_today, format('a later pass is a streak day as well: %s on %s', v_streak, v_last);
END;
$$;

-- The Biggest Shark Challenge: a run that earned XP extends the streak; a run
-- with none, or the same run again, does not.
DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001021';
  v_applied BOOLEAN;
  v_streak  INTEGER;
  v_last    DATE;
  v_xp      BIGINT;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_user, 5, 5, v_today - 1);

  v_applied := public.record_challenge_completion(v_user, 'streakchallenge00001', 'webdev', 0);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_applied IS FALSE AND v_streak = 5 AND v_last = v_today - 1,
    format('a run that earned no XP is not a streak day: %s, %s on %s', v_applied, v_streak, v_last);

  v_applied := public.record_challenge_completion(v_user, 'streakchallenge00002', 'webdev', 30, '{"javascript":{"correct":3,"total":6}}');
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_applied IS TRUE AND v_streak = 6 AND v_last = v_today,
    format('a completed run extends the streak: %s, %s on %s', v_applied, v_streak, v_last);

  UPDATE public.user_stats SET last_quiz_date = v_today - 1 WHERE user_id = v_user;
  v_applied := public.record_challenge_completion(v_user, 'streakchallenge00002', 'webdev', 30, '{"javascript":{"correct":3,"total":6}}');
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_applied IS FALSE AND v_streak = 6 AND v_last = v_today - 1 AND v_xp = 30,
    format('a replayed run changes nothing: %s, %s on %s, %s XP', v_applied, v_streak, v_last, v_xp);
END;
$$;

-- A quiz receipt replayed on another day moves nothing either, and the
-- routine itself counts a day once.
DO $$
DECLARE
  v_today  CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001031';
  v_applied BOOLEAN;
  v_streak INTEGER;
  v_last   DATE;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_user, 5, 5, v_today - 1);
  PERFORM public.record_verified_quiz_result_v2(v_user, 'streakquiz0000000001', 1, 1, NULL, NULL, 'webdev', 0);
  UPDATE public.user_stats SET last_quiz_date = v_today - 1 WHERE user_id = v_user;
  v_applied := public.record_verified_quiz_result_v2(v_user, 'streakquiz0000000001', 1, 1, NULL, NULL, 'webdev', 0);
  SELECT current_streak, last_quiz_date INTO v_streak, v_last FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_applied IS FALSE AND v_streak = 6 AND v_last = v_today - 1,
    format('a replayed quiz receipt does not advance the streak: %s, %s on %s', v_applied, v_streak, v_last);

  UPDATE public.user_stats SET last_quiz_date = v_today - 1 WHERE user_id = v_user;
  v_streak := public.advance_verified_streak(v_user);
  ASSERT v_streak = 7, format('the routine counts the new day, got %s', v_streak);
  v_streak := public.advance_verified_streak(v_user);
  ASSERT v_streak = 7, format('and not a second time the same day, got %s', v_streak);
END;
$$;

-- Only the service role may count a streak day.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000001041","role":"authenticated"}';
DO $$
BEGIN
  PERFORM public.advance_verified_streak('aaaaaaaa-0000-4000-8000-000000001041');
  RAISE EXCEPTION 'an authenticated session could advance its own streak';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END;
$$;
