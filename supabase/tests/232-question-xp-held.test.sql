-- A quiz, daily or Challenge result names the correct answers its question's
-- hour held back, and when the last of them pays again (migration 060), so
-- the learner can be told. The award is 058's, unchanged
-- (156-quiz-xp-question-cooldown, 105-challenge-xp-question-cooldown). A
-- question this result paid is never named, a wrong answer never is, and a
-- replayed result names none. The routines tell a question this result paid
-- by its transaction's NOW(); this file runs in one transaction, so it moves
-- each earlier payment back before the next result.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002321';
  v_result JSONB;
  v_awarded INTEGER;
BEGIN
  -- New questions: nothing held back.
  v_result := public.record_verified_quiz_result_v3(
    v_user, 'questionheld00000001', 2, 3, NULL,
    '[{"questionId":"h1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"h2","category":"javascript","isCorrect":false,"xp":0},
      {"questionId":"h3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND v_result -> 'xpHeld' = 'null'::jsonb,
    format('a result of new questions holds nothing back: %s', v_result);

  -- h1 paid 20 minutes ago and h3 50 minutes ago; h2 was wrong and h4 is new.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '20 minutes' WHERE user_id = v_user AND question_id = 'h1';
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '50 minutes' WHERE user_id = v_user AND question_id = 'h3';
  v_result := public.record_verified_quiz_result_v3(
    v_user, 'questionheld00000002', 4, 5, NULL,
    '[{"questionId":"h1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"h2","category":"javascript","isCorrect":true,"xp":6},
      {"questionId":"h3","category":"css","isCorrect":true,"xp":8},
      {"questionId":"h4","category":"css","isCorrect":true,"xp":8},
      {"questionId":"h5","category":"css","isCorrect":false,"xp":0}]',
    'webdev', 26);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questionheld00000002';
  ASSERT v_awarded = 14, format('058 pays h2 and h4 only: %s', v_awarded);
  ASSERT (v_result #>> '{xpHeld,questions}')::INT = 2
     AND (v_result #>> '{xpHeld,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '40 minutes',
    format('two answers held back, the last opening in 40 minutes: %s', v_result);

  -- The 59/60-minute boundary: at 60 minutes a question pays and is not named.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '59 minutes' WHERE user_id = v_user AND question_id = 'h1';
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '60 minutes' WHERE user_id = v_user AND question_id = 'h3';
  v_result := public.record_verified_quiz_result_v3(
    v_user, 'questionheld00000003', 2, 2, NULL,
    '[{"questionId":"h1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"h3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  ASSERT (v_result #>> '{xpHeld,questions}')::INT = 1
     AND (v_result #>> '{xpHeld,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '1 minute',
    format('59 minutes is held back, 60 is paid: %s', v_result);

  -- A replayed result is not applied and names nothing.
  v_result := public.record_verified_quiz_result_v3(
    v_user, 'questionheld00000003', 2, 2, NULL,
    '[{"questionId":"h1","category":"javascript","isCorrect":true,"xp":4},
      {"questionId":"h3","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 12);
  ASSERT NOT (v_result ->> 'applied')::BOOLEAN AND v_result -> 'xpHeld' = 'null'::jsonb,
    format('a replay: %s', v_result);

  -- A daily keeps its 20 and still names what was held back.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '10 minutes' WHERE user_id = v_user AND question_id = 'h4';
  v_result := public.record_verified_quiz_result_v3(
    v_user, 'questionheld00000004', 1, 1, NULL,
    '[{"questionId":"h4","category":"css","isCorrect":true,"xp":8}]',
    'webdev', 20, NULL, NULL, NULL, (NOW() AT TIME ZONE 'UTC')::DATE, 30000);
  SELECT quest_xp INTO v_awarded FROM public.quiz_attempts WHERE attempt_id = 'questionheld00000004';
  ASSERT v_awarded = 20 AND (v_result #>> '{xpHeld,questions}')::INT = 1,
    format('the daily pays its 20 and names h4: %s, %s', v_awarded, v_result);
END;
$$;

DO $$
DECLARE
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002322';
  v_result JSONB;
BEGIN
  -- New answers: awarded in full, nothing held back.
  v_result := public.record_challenge_completion_v2(v_user, 'heldrun0000000000001', 'webdev', 10, NULL,
    '[{"questionId":"r1","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"r2","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"r3","category":"css","isCorrect":false,"xp":0}]');
  ASSERT (v_result ->> 'awarded')::BOOLEAN AND (v_result ->> 'xp')::INT = 10 AND v_result -> 'xpHeld' = 'null'::jsonb,
    format('a run of new answers: %s', v_result);

  -- r1 again ten minutes later and r4 new: r1 is held back.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '10 minutes' WHERE user_id = v_user;
  v_result := public.record_challenge_completion_v2(v_user, 'heldrun0000000000002', 'webdev', 10, NULL,
    '[{"questionId":"r1","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"r4","category":"css","isCorrect":true,"xp":5}]');
  ASSERT (v_result ->> 'awarded')::BOOLEAN AND (v_result ->> 'xp')::INT = 5
     AND (v_result #>> '{xpHeld,questions}')::INT = 1
     AND (v_result #>> '{xpHeld,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '50 minutes',
    format('one answer held back for 50 minutes more: %s', v_result);

  -- Every right answer inside its hour: no award, and both named.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '5 minutes' WHERE user_id = v_user AND question_id = 'r4';
  v_result := public.record_challenge_completion_v2(v_user, 'heldrun0000000000003', 'webdev', 10, NULL,
    '[{"questionId":"r2","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"r4","category":"css","isCorrect":true,"xp":5},
      {"questionId":"r5","category":"css","isCorrect":false,"xp":0}]');
  ASSERT NOT (v_result ->> 'awarded')::BOOLEAN AND (v_result ->> 'xp')::INT = 0
     AND (v_result #>> '{xpHeld,questions}')::INT = 2
     AND (v_result #>> '{xpHeld,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '55 minutes',
    format('a run held back entirely, the last answer opening in 55 minutes: %s', v_result);

  -- A replayed run names nothing.
  v_result := public.record_challenge_completion_v2(v_user, 'heldrun0000000000002', 'webdev', 10, NULL,
    '[{"questionId":"r1","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"r4","category":"css","isCorrect":true,"xp":5}]');
  ASSERT NOT (v_result ->> 'awarded')::BOOLEAN AND v_result -> 'xpHeld' = 'null'::jsonb,
    format('a replayed run: %s', v_result);

  -- A run before 058's per-answer XP names nothing and is paid as before.
  v_result := public.record_challenge_completion_v2(v_user, 'heldrun0000000000004', 'webdev', 10, NULL,
    '[{"questionId":"r1","category":"javascript","isCorrect":true},
      {"questionId":"r2","category":"javascript","isCorrect":true}]');
  ASSERT (v_result ->> 'awarded')::BOOLEAN AND (v_result ->> 'xp')::INT = 10 AND v_result -> 'xpHeld' = 'null'::jsonb,
    format('a run without per-answer XP: %s', v_result);
END;
$$;

DO $$
BEGIN
  ASSERT NOT has_function_privilege('authenticated', 'public.record_verified_quiz_result_v3(text, text, integer, integer, jsonb, jsonb, text, integer, text, text, text, date, integer)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.record_verified_quiz_result_v3(text, text, integer, integer, jsonb, jsonb, text, integer, text, text, text, date, integer)', 'EXECUTE'),
    'a browser role can record a quiz result';
  ASSERT NOT has_function_privilege('authenticated', 'public.record_challenge_completion_v2(text, text, text, integer, jsonb, jsonb)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.record_challenge_completion_v2(text, text, text, integer, jsonb, jsonb)', 'EXECUTE'),
    'a browser role can complete a run';
END;
$$;
