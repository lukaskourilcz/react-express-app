-- A Biggest Shark Challenge question counts on the boards once per learner
-- and UTC day (migration 052, review findings PLAY-1 and SEC-4), as a quiz
-- question does since 048: record_challenge_completion dates only the answers
-- to questions the learner had not answered earlier the same day. Replaying
-- runs used to add every run's answers to user_activity_days, which the
-- 30-day, all-time and topic boards read, without limit. The Challenge XP a
-- run earns is unchanged: whether a repeated question earns it is the
-- owner's decision.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001571';
  v_legacy   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001572';
  v_run      CONSTANT JSONB := '[
    {"questionId":"q1","category":"javascript","isCorrect":true},
    {"questionId":"q4","category":"javascript","isCorrect":true},
    {"questionId":"q5","category":"css","isCorrect":false},
    {"questionId":"bad id!","category":"javascript","isCorrect":true},
    {"questionId":"q6","category":"javascript","isCorrect":"yes"}
  ]';
  v_applied  BOOLEAN;
  v_answered INTEGER;
  v_correct  INTEGER;
  v_xp       BIGINT;
  v_seen     INTEGER;
BEGIN
  -- A quiz first: q1 to q3 are answered today.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'challengequiz0000001', 3, 3, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true},
      {"questionId":"q2","category":"javascript","isCorrect":true},
      {"questionId":"q3","category":"javascript","isCorrect":true}]',
    'webdev', 0);

  -- A run with q1 again, two new questions and two entries that are not
  -- answers: only q4 and q5 are dated.
  v_applied := public.record_challenge_completion(v_user, 'onceadayrun000000001', 'webdev', 10,
    '{"javascript":{"correct":3,"total":3},"css":{"correct":0,"total":1}}', v_run);
  ASSERT v_applied, 'the run is recorded';
  SELECT SUM(answered)::INT, SUM(correct)::INT INTO v_answered, v_correct
    FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 5 AND v_correct = 4,
    format('the boards gain q4 and q5 only: expected 4 of 5, got %s of %s', v_correct, v_answered);
  SELECT answered INTO v_answered FROM public.user_activity_days WHERE user_id = v_user AND category = 'css';
  ASSERT v_answered = 1, format('by category: css 1, got %s', v_answered);

  -- The same run replayed under a new run id: nothing more on the boards.
  v_applied := public.record_challenge_completion(v_user, 'onceadayrun000000002', 'webdev', 10,
    '{"javascript":{"correct":3,"total":3},"css":{"correct":0,"total":1}}', v_run);
  ASSERT v_applied, 'the replayed run is recorded';
  SELECT SUM(answered)::INT, SUM(correct)::INT INTO v_answered, v_correct
    FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 5 AND v_correct = 4,
    format('a replayed run adds nothing to the boards: expected 4 of 5, got %s of %s', v_correct, v_answered);

  -- The Challenge XP is the caller's, for both runs, as before.
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 20, format('each run keeps its Challenge XP: expected 20, got %s', v_xp);

  -- The question history records every answer, as a quiz's does.
  SELECT times_seen INTO v_seen FROM public.user_question_history
   WHERE user_id = v_user AND subject = 'webdev' AND question_id = 'q1';
  ASSERT v_seen = 3, format('q1 was answered three times today: got %s', v_seen);

  -- The next UTC day the questions count again.
  UPDATE public.user_question_history SET last_seen_at = last_seen_at - INTERVAL '1 day' WHERE user_id = v_user;
  PERFORM public.record_challenge_completion(v_user, 'onceadayrun000000003', 'webdev', 10, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true}]');
  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_user;
  ASSERT v_answered = 6, format('a question last answered yesterday counts again: expected 6, got %s', v_answered);

  -- Without outcomes (the handler before 052) the breakdown counts in full.
  PERFORM public.record_challenge_completion(v_legacy, 'onceadayrun000000004', 'webdev', 10,
    '{"javascript":{"correct":2,"total":3}}');
  PERFORM public.record_challenge_completion(v_legacy, 'onceadayrun000000005', 'webdev', 10,
    '{"javascript":{"correct":2,"total":3}}');
  SELECT SUM(answered)::INT INTO v_answered FROM public.user_activity_days WHERE user_id = v_legacy;
  ASSERT v_answered = 6, format('the breakdown path is unchanged: expected 6, got %s', v_answered);
END;
$$;
