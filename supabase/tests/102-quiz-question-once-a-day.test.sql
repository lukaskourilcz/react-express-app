-- A quiz question counts once per learner and UTC day (migration 048), as a
-- Learn question does since 040: answered again the same day it adds nothing
-- to the category stats or the 30-day board, and the quiz's XP shrinks by the
-- share of such questions. The next UTC day it counts again. The quiz itself
-- still counts toward total_quizzes, and the XP actually awarded is kept on
-- the attempt receipt for the coin credit.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001201';
  v_applied  BOOLEAN;
  v_js       RECORD;
  v_css      RECORD;
  v_answered INTEGER;
  v_correct  INTEGER;
  v_xp       BIGINT;
  v_awarded  INTEGER;
  v_quizzes  INTEGER;
  v_seen     INTEGER;
BEGIN
  -- Three new questions: everything counts, the full 30 XP.
  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'oncequiz000000000001', 2, 3,
    '{"javascript":{"correct":1,"total":2},"css":{"correct":1,"total":1}}',
    '[{"questionId":"q1","category":"javascript","isCorrect":true},
      {"questionId":"q2","category":"javascript","isCorrect":false},
      {"questionId":"q3","category":"css","isCorrect":true}]',
    'webdev', 30);
  ASSERT v_applied, 'the first quiz is applied';
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'oncequiz000000000001';
  ASSERT v_awarded = 30, format('a quiz of new questions keeps its XP: expected 30, got %s', v_awarded);

  -- q1 again, answered correctly, and one new question (q4): only q4 counts,
  -- and the XP is floor(20 * 1 / 2) = 10.
  v_applied := public.record_verified_quiz_result_v2(
    v_user, 'oncequiz000000000002', 2, 2,
    '{"javascript":{"correct":1,"total":1},"css":{"correct":1,"total":1}}',
    '[{"questionId":"q1","category":"javascript","isCorrect":true},
      {"questionId":"q4","category":"css","isCorrect":true}]',
    'webdev', 20);
  ASSERT v_applied, 'the second quiz is applied';

  SELECT total_correct, total_questions INTO v_js FROM public.user_category_stats WHERE user_id = v_user AND category = 'javascript';
  SELECT total_correct, total_questions INTO v_css FROM public.user_category_stats WHERE user_id = v_user AND category = 'css';
  ASSERT v_js.total_correct = 1 AND v_js.total_questions = 2,
    format('q1 answered again today adds nothing to its category: expected 1/2, got %s/%s', v_js.total_correct, v_js.total_questions);
  ASSERT v_css.total_correct = 2 AND v_css.total_questions = 2,
    format('the new question counts: expected css 2/2, got %s/%s', v_css.total_correct, v_css.total_questions);

  SELECT SUM(answered)::INT, SUM(correct)::INT INTO v_answered, v_correct FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 4 AND v_correct = 3,
    format('the 30-day board counts q1 once: expected 3 of 4, got %s of %s', v_correct, v_answered);

  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'oncequiz000000000002';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_awarded = 10 AND v_xp = 40,
    format('the XP is scaled by the fresh share: expected 10 (total 40), got %s (total %s)', v_awarded, v_xp);

  SELECT total_quizzes INTO v_quizzes FROM public.user_stats WHERE user_id = v_user;
  ASSERT v_quizzes = 2, format('both quizzes count as quizzes, got %s', v_quizzes);
  SELECT times_seen INTO v_seen FROM public.user_question_history WHERE user_id = v_user AND question_id = 'q1';
  ASSERT v_seen = 2, format('the question history still records both answers, got %s', v_seen);

  -- A quiz made only of questions already answered today: nothing counts, no XP.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'oncequiz000000000003', 2, 2,
    '{"javascript":{"correct":2,"total":2}}',
    '[{"questionId":"q1","category":"javascript","isCorrect":true},
      {"questionId":"q2","category":"javascript","isCorrect":true}]',
    'webdev', 20);
  SELECT total_questions INTO v_js FROM public.user_category_stats WHERE user_id = v_user AND category = 'javascript';
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'oncequiz000000000003';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_js.total_questions = 2 AND v_awarded = 0 AND v_xp = 40,
    format('a repeat of today''s questions adds nothing: %s questions, %s XP (total %s)', v_js.total_questions, v_awarded, v_xp);

  -- The same question twice in one attempt counts once.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'oncequiz000000000004', 2, 2,
    '{"html":{"correct":2,"total":2}}',
    '[{"questionId":"q5","category":"html","isCorrect":true},
      {"questionId":"q5","category":"html","isCorrect":true}]',
    'webdev', 20);
  SELECT total_questions INTO v_answered FROM public.user_category_stats WHERE user_id = v_user AND category = 'html';
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'oncequiz000000000004';
  ASSERT v_answered = 1 AND v_awarded = 10,
    format('a question repeated inside one attempt counts once: %s answered, %s XP', v_answered, v_awarded);

  -- The next UTC day: q1 was last answered yesterday, so it counts again.
  UPDATE public.user_question_history SET last_seen_at = last_seen_at - INTERVAL '1 day' WHERE user_id = v_user;
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'oncequiz000000000005', 1, 1,
    '{"javascript":{"correct":1,"total":1}}',
    '[{"questionId":"q1","category":"javascript","isCorrect":true}]',
    'webdev', 12);
  SELECT total_correct, total_questions INTO v_js FROM public.user_category_stats WHERE user_id = v_user AND category = 'javascript';
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'oncequiz000000000005';
  ASSERT v_js.total_correct = 2 AND v_js.total_questions = 3 AND v_awarded = 12,
    format('a question last answered yesterday counts again: javascript %s/%s, %s XP', v_js.total_correct, v_js.total_questions, v_awarded);

  -- A legacy call without outcomes counts its breakdown and keeps its XP.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'oncequiz000000000006', 1, 1, '{"html":{"correct":1,"total":1}}', NULL, 'webdev', 8);
  SELECT total_questions INTO v_answered FROM public.user_category_stats WHERE user_id = v_user AND category = 'html';
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'oncequiz000000000006';
  ASSERT v_answered = 2 AND v_awarded = 8,
    format('without outcomes the breakdown counts in full: %s html answers, %s XP', v_answered, v_awarded);
END;
$$;
