-- A question pays its XP again once its hour is up (migration 058, owner
-- decision of 9 Oct 2026, amending 056's "every answer earns XP"). A quiz or
-- daily result pays the receipt's XP less the XP of each correct answer whose
-- question paid this account XP less than 60 minutes ago; at 60 minutes it
-- pays again. A wrong answer claims nothing. The daily keeps its minimum of
-- 20, and a daily worth more pays what is left of it. A receipt without
-- per-question XP (minted before 052) is paid as it is. The boards do not
-- change: a question still counts once per learner and UTC day in the
-- category stats and the dated activity (102-quiz-question-once-a-day).
-- The Challenge is 105-challenge-xp-question-cooldown.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001581';
  v_daily   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001582';
  v_strong  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001584';
  v_floor   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001585';
  v_awarded INTEGER;
  v_xp      BIGINT;
  v_js      RECORD;
  v_answered INTEGER;
  v_month   BIGINT;
BEGIN
  -- Three new questions: 4 + 0 + 8.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'questioncooldown0001', 2, 3, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"q2","category":"javascript","isCorrect":false,"xp":0},
      {"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldown0001';
  ASSERT v_awarded = 12, format('new questions pay in full: expected 12, got %s', v_awarded);
  ASSERT (SELECT count(*) FROM public.user_question_xp WHERE user_id = v_user) = 2,
    'the two correct answers start their hour; the wrong one claims nothing';

  -- q1 again at once (4) and q4 new (8): only q4 pays.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'questioncooldown0002', 2, 2, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"q4","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldown0002';
  ASSERT v_awarded = 8, format('a question paid less than an hour ago pays nothing: expected 8, got %s', v_awarded);

  -- q2 was wrong, so it never started an hour: right now, it pays.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'questioncooldown0003', 1, 1, NULL,
    '[{"questionId":"q2","category":"javascript","isCorrect":true,"xp":6}]',
    'webdev', 6);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldown0003';
  ASSERT v_awarded = 6, format('a question answered wrong earlier pays when answered right: expected 6, got %s', v_awarded);

  -- The boundary: 59 minutes is still on cooldown, 60 minutes pays again.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '59 minutes'
   WHERE user_id = v_user AND question_id = 'q3';
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'questioncooldown0004', 1, 1, NULL,
    '[{"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 8);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldown0004';
  ASSERT v_awarded = 0, format('59 minutes after its XP a question pays nothing: got %s', v_awarded);
  ASSERT (SELECT last_xp_at FROM public.user_question_xp WHERE user_id = v_user AND question_id = 'q3') = NOW() - INTERVAL '59 minutes',
    'an answer on cooldown does not restart the hour';
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '60 minutes'
   WHERE user_id = v_user AND question_id = 'q3';
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'questioncooldown0005', 1, 1, NULL,
    '[{"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 8);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldown0005';
  ASSERT v_awarded = 8, format('60 minutes after its XP a question pays again: expected 8, got %s', v_awarded);
  ASSERT (SELECT last_xp_at FROM public.user_question_xp WHERE user_id = v_user AND question_id = 'q3') = NOW(),
    'and starts a new hour';

  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 34, format('the account gains 12 + 8 + 6 + 0 + 8: expected 34, got %s', v_xp);
  SELECT SUM(xp) INTO v_month FROM public.user_xp_days WHERE user_id = v_user;
  ASSERT v_month = 34, format('the month counts what was paid: expected 34, got %s', v_month);

  -- The boards still count a question once a day: javascript holds q1 (right)
  -- and q2 (wrong) from the first quiz, and none of their repeats.
  SELECT total_correct, total_questions INTO v_js
    FROM public.user_category_stats WHERE user_id = v_user AND category = 'javascript';
  ASSERT v_js.total_correct = 1 AND v_js.total_questions = 2,
    format('a repeat earns no place: expected javascript 1/2, got %s/%s', v_js.total_correct, v_js.total_questions);
  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 4, format('the 30-day board counts four distinct questions, got %s', v_answered);

  -- A receipt without per-question XP (minted before 052) is paid as it is.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'questioncooldown0006', 1, 1, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true}]',
    'webdev', 6);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldown0006';
  ASSERT v_awarded = 6, format('an older receipt pays its total: expected 6, got %s', v_awarded);

  -- A daily whose one correct answer is on cooldown keeps the daily's 20.
  PERFORM public.record_verified_quiz_result_v2(
    v_daily, 'questioncooldownq001', 1, 1, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4}]',
    'webdev', 4);
  PERFORM public.record_verified_quiz_result_v2(
    v_daily, 'questioncooldownd001', 1, 2, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"d2","category":"javascript","isCorrect":false,"xp":0}]',
    'webdev', 20, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldownd001';
  ASSERT v_awarded = 20, format('a daily keeps its minimum of 20: got %s', v_awarded);

  -- A daily worth 30, one 8 of it on cooldown: 22. Worth 26 with the same 8
  -- on cooldown: 18, raised to the daily's 20.
  PERFORM public.record_verified_quiz_result_v2(
    v_strong, 'questioncooldownq002', 1, 1, NULL,
    '[{"questionId":"s1","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 8);
  PERFORM public.record_verified_quiz_result_v2(
    v_strong, 'questioncooldownd002', 4, 4, NULL,
    '[{"questionId":"s1","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"s2","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"s3","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"s4","category":"javascript","isCorrect":true,"xp":6}]',
    'webdev', 30, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldownd002';
  ASSERT v_awarded = 22, format('a daily pays what is left above 20: expected 22, got %s', v_awarded);
  PERFORM public.record_verified_quiz_result_v2(
    v_floor, 'questioncooldownq003', 1, 1, NULL,
    '[{"questionId":"s1","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 8);
  PERFORM public.record_verified_quiz_result_v2(
    v_floor, 'questioncooldownd003', 4, 4, NULL,
    '[{"questionId":"s1","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"s5","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"s6","category":"javascript","isCorrect":true,"xp":6},
      {"questionId":"s7","category":"javascript","isCorrect":true,"xp":4}]',
    'webdev', 26, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questioncooldownd003';
  ASSERT v_awarded = 20, format('and never less than 20: got %s', v_awarded);

  -- A replayed receipt still pays nothing more: the attempt is applied once.
  ASSERT NOT public.record_verified_quiz_result_v2(
    v_strong, 'questioncooldownd002', 4, 4, NULL,
    '[{"questionId":"s9","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 30, NULL, NULL, NULL, v_today, 60000), 'a replayed attempt is refused';
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_question_xp WHERE user_id = v_strong AND question_id = 's9'),
    'and claims no question';
END;
$$;
