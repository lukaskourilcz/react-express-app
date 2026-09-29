-- A quiz pays each fresh question its own XP (migration 052, review finding
-- QUIZ-3). From 052 every receipt outcome carries its question's XP (2 + 2 ×
-- difficulty when correct, 0 when not), and the routine pays the sum over the
-- questions not answered earlier the same UTC day. 048 scaled the whole quiz
-- by the fresh share instead, so a repeat still paid part of the quiz and a
-- fresh correct answer was underpaid. A daily challenge with a fresh correct
-- answer still pays at least 20 XP. Receipts without per-question XP keep the
-- share formula (102-quiz-question-once-a-day.test.sql).

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001581';
  v_daily   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001582';
  v_repeat  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001583';
  v_strong  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001584';
  v_awarded INTEGER;
  v_xp      BIGINT;
BEGIN
  -- Three new questions: 4 + 0 + 8.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'perquestionxp0000001', 2, 3, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"q2","category":"javascript","isCorrect":false,"xp":0},
      {"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestionxp0000001';
  ASSERT v_awarded = 12, format('new questions pay in full: expected 12, got %s', v_awarded);

  -- q1 again (correct, 4) and q4 new (correct, 8): q4 pays its 8. The share
  -- formula paid floor(12 × 1 / 2) = 6.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'perquestionxp0000002', 2, 2, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"q4","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestionxp0000002';
  ASSERT v_awarded = 8, format('a fresh correct answer pays its own XP: expected 8, got %s', v_awarded);

  -- q5 new but wrong, q3 again and correct: nothing. The share formula paid 4.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'perquestionxp0000003', 1, 2, NULL,
    '[{"questionId":"q5","category":"javascript","isCorrect":false,"xp":0},
      {"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 8);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestionxp0000003';
  ASSERT v_awarded = 0, format('a repeated question pays nothing: expected 0, got %s', v_awarded);

  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 20, format('the account gains 12 + 8 + 0: expected 20, got %s', v_xp);

  -- Never more than the receipt's own total.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'perquestionxp0000004', 1, 1, NULL,
    '[{"questionId":"q6","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 5);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestionxp0000004';
  ASSERT v_awarded = 5, format('the sum is capped at the receipt''s XP: expected 5, got %s', v_awarded);

  -- A daily with one fresh correct answer worth 4 keeps the daily's 20.
  PERFORM public.record_verified_quiz_result_v2(
    v_daily, 'perquestiondaily0001', 1, 2, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"d2","category":"javascript","isCorrect":false,"xp":0}]',
    'webdev', 20, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestiondaily0001';
  ASSERT v_awarded = 20, format('a daily with a fresh correct answer pays at least 20: got %s', v_awarded);

  -- A daily whose only correct answer was already answered today: its fresh
  -- answer is wrong, so it pays nothing. The share formula paid 10.
  PERFORM public.record_verified_quiz_result_v2(
    v_repeat, 'perquestionquiz00001', 1, 1, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4}]',
    'webdev', 4);
  PERFORM public.record_verified_quiz_result_v2(
    v_repeat, 'perquestiondaily0002', 1, 2, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"d2","category":"javascript","isCorrect":false,"xp":0}]',
    'webdev', 20, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestiondaily0002';
  ASSERT v_awarded = 0, format('a daily with no fresh correct answer pays its fresh XP, 0: got %s', v_awarded);

  -- A daily worth more than 20 pays what it is worth.
  PERFORM public.record_verified_quiz_result_v2(
    v_strong, 'perquestiondaily0003', 4, 4, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"d2","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"d3","category":"javascript","isCorrect":true,"xp":6},
      {"questionId":"d4","category":"javascript","isCorrect":true,"xp":4}]',
    'webdev', 26, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'perquestiondaily0003';
  ASSERT v_awarded = 26, format('a daily above the minimum pays its sum: expected 26, got %s', v_awarded);
END;
$$;
