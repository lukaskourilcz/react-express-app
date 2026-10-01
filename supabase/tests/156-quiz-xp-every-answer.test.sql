-- Every answer earns XP, repeats included (migration 056, owner decision 5 of
-- 1 Oct 2026). A quiz or daily result pays the receipt's whole XP whatever the
-- learner answered earlier the same UTC day; 052 paid only the questions not
-- answered earlier that day, and 048 scaled the quiz by the fresh share. The
-- daily keeps its minimum of 20 XP, which the receipt's total already holds.
-- The boards do not change: a question still counts once per learner and UTC
-- day in the category stats and the dated activity
-- (102-quiz-question-once-a-day.test.sql).

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
  v_js      RECORD;
  v_answered INTEGER;
BEGIN
  -- Three new questions: 4 + 0 + 8.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'everyanswerxp0000001', 2, 3, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"q2","category":"javascript","isCorrect":false,"xp":0},
      {"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerxp0000001';
  ASSERT v_awarded = 12, format('new questions pay in full: expected 12, got %s', v_awarded);

  -- q1 again (correct, 4) and q4 new (correct, 8): both pay. 052 paid only q4's 8.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'everyanswerxp0000002', 2, 2, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"q4","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerxp0000002';
  ASSERT v_awarded = 12, format('a question answered earlier today still pays its XP: expected 12, got %s', v_awarded);

  -- q5 new but wrong, q3 again and correct: q3's 8. 052 paid nothing.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'everyanswerxp0000003', 1, 2, NULL,
    '[{"questionId":"q5","category":"javascript","isCorrect":false,"xp":0},
      {"questionId":"q3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 8);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerxp0000003';
  ASSERT v_awarded = 8, format('a correct repeat pays: expected 8, got %s', v_awarded);

  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 32, format('the account gains 12 + 12 + 8: expected 32, got %s', v_xp);

  -- The boards still count q1 once today: javascript holds q1, q2 and q5.
  SELECT total_correct, total_questions INTO v_js
    FROM public.user_category_stats WHERE user_id = v_user AND category = 'javascript';
  ASSERT v_js.total_correct = 1 AND v_js.total_questions = 3,
    format('a repeat earns XP and no place: expected javascript 1/3, got %s/%s', v_js.total_correct, v_js.total_questions);
  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 5, format('the 30-day board counts five distinct questions, got %s', v_answered);

  -- The award is the receipt's total, never the sum of its outcomes.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'everyanswerxp0000004', 1, 1, NULL,
    '[{"questionId":"q6","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 5);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerxp0000004';
  ASSERT v_awarded = 5, format('the receipt''s XP is the award: expected 5, got %s', v_awarded);

  -- A receipt without per-question XP (minted before 052) pays its total too.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'everyanswerxp0000005', 1, 1, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true}]',
    'webdev', 6);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerxp0000005';
  ASSERT v_awarded = 6, format('an older receipt pays its total for a repeat: expected 6, got %s', v_awarded);

  -- A daily with one fresh correct answer worth 4 keeps the daily's 20.
  PERFORM public.record_verified_quiz_result_v2(
    v_daily, 'everyanswerdaily0001', 1, 2, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"d2","category":"javascript","isCorrect":false,"xp":0}]',
    'webdev', 20, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerdaily0001';
  ASSERT v_awarded = 20, format('a daily pays at least 20: got %s', v_awarded);

  -- A daily whose every question was answered earlier the same day keeps the
  -- daily's 20 as well. 052 paid it nothing.
  PERFORM public.record_verified_quiz_result_v2(
    v_repeat, 'everyanswerquiz00001', 1, 2, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"d2","category":"javascript","isCorrect":false,"xp":0}]',
    'webdev', 4);
  PERFORM public.record_verified_quiz_result_v2(
    v_repeat, 'everyanswerdaily0002', 1, 2, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"d2","category":"javascript","isCorrect":false,"xp":0}]',
    'webdev', 20, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerdaily0002';
  ASSERT v_awarded = 20, format('a daily of repeated questions keeps the minimum 20: got %s', v_awarded);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_repeat;
  ASSERT v_xp = 24, format('the quiz and the daily both pay: expected 24, got %s', v_xp);

  -- A daily worth more than 20 pays what it is worth.
  PERFORM public.record_verified_quiz_result_v2(
    v_strong, 'everyanswerdaily0003', 4, 4, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"d2","category":"javascript","isCorrect":true,"xp":8},
      {"questionId":"d3","category":"javascript","isCorrect":true,"xp":6},
      {"questionId":"d4","category":"javascript","isCorrect":true,"xp":4}]',
    'webdev', 26, NULL, NULL, NULL, v_today, 60000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'everyanswerdaily0003';
  ASSERT v_awarded = 26, format('a daily above the minimum pays its total: expected 26, got %s', v_awarded);

  -- A replayed receipt still pays nothing more: the attempt is applied once.
  ASSERT NOT public.record_verified_quiz_result_v2(
    v_strong, 'everyanswerdaily0003', 4, 4, NULL,
    '[{"questionId":"d1","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 26, NULL, NULL, NULL, v_today, 60000), 'a replayed attempt is refused';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_strong;
  ASSERT v_xp = 26, format('a replay adds no XP: expected 26, got %s', v_xp);
END;
$$;
