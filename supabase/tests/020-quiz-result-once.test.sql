-- A graded quiz attempt counts once. The server may retry the same submission
-- (network retry, second tab), and record_verified_quiz_result_v2 must then
-- return false and change nothing: no second XP, stats, dated answers or
-- question history. A daily challenge can be retried to improve the board,
-- but only the first result of the day pays XP and stats.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000020';
  v_breakdown CONSTANT JSONB := '{"javascript":{"correct":5,"total":6},"css":{"correct":3,"total":4}}';
  v_outcomes CONSTANT JSONB := '[{"questionId":"q1","category":"javascript","isCorrect":true},{"questionId":"q2","category":"css","isCorrect":false}]';
  v_applied BOOLEAN;
  v_xp BIGINT;
  v_xp_webdev BIGINT;
  v_quizzes INTEGER;
  v_correct INTEGER;
  v_answered INTEGER;
  v_seen INTEGER;
  v_daily_correct INTEGER;
BEGIN
  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'quizattempt000000001', 8, 10, v_breakdown, v_outcomes, 'webdev', 80);
  ASSERT v_applied IS TRUE, 'the first submission of an attempt is applied';

  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'quizattempt000000001', 8, 10, v_breakdown, v_outcomes, 'webdev', 80);
  ASSERT v_applied IS FALSE, 'the same attempt submitted again is a replay';

  SELECT quest_xp, (quest_xp_by_subject ->> 'webdev')::BIGINT INTO v_xp, v_xp_webdev
    FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 80, format('quest_xp rises once: expected 80, got %s', v_xp);
  ASSERT v_xp_webdev = 80, format('the subject XP rises once: expected 80, got %s', v_xp_webdev);

  SELECT total_quizzes, total_correct INTO v_quizzes, v_correct
    FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_quizzes = 1 AND v_correct = 8,
    format('stats count the attempt once: expected 1 quiz / 8 correct, got %s / %s', v_quizzes, v_correct);

  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 10, format('the dated answers behind the 30-day board count once: expected 10, got %s', v_answered);

  SELECT SUM(times_seen)::INT INTO v_seen FROM public.user_question_history WHERE user_id = v_user;
  ASSERT v_seen = 2, format('question history counts each question once: expected 2, got %s', v_seen);

  -- A new attempt is new work and counts.
  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'quizattempt000000002', 5, 10, '{"javascript":{"correct":5,"total":10}}', NULL, 'webdev', 50);
  ASSERT v_applied IS TRUE, 'a different attempt is applied';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 130, format('a second attempt adds its own XP: expected 130, got %s', v_xp);

  -- The daily challenge: the first verified result of the day pays and is
  -- what the Today board shows; a later receipt for the same day changes
  -- neither (migration 047).
  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'dailyattempt00000001', 3, 5, NULL, NULL, 'webdev', 30,
    NULL, NULL, NULL, (NOW() AT TIME ZONE 'UTC')::DATE, 60000);
  ASSERT v_applied IS TRUE, 'the first daily result of the day is applied';
  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'dailyattempt00000002', 5, 5, NULL, NULL, 'webdev', 50,
    NULL, NULL, NULL, (NOW() AT TIME ZONE 'UTC')::DATE, 50000);
  ASSERT v_applied IS FALSE, 'a daily retry is not applied as new work';

  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 160, format('a daily retry pays no XP: expected 160, got %s', v_xp);
  SELECT total_quizzes INTO v_quizzes FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_quizzes = 3, format('a daily retry adds no quiz to the stats: expected 3, got %s', v_quizzes);
  SELECT correct INTO v_daily_correct FROM public.daily_attempts
   WHERE user_id = v_user AND challenge_date = (NOW() AT TIME ZONE 'UTC')::DATE AND subject = 'webdev';
  ASSERT v_daily_correct = 3, format('the first result is what the daily board shows: expected 3, got %s', v_daily_correct);
END;
$$;
