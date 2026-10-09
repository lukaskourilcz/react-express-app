-- A Biggest Shark Challenge answer pays its XP again once its question's hour
-- is up (migration 058, owner decision of 9 Oct 2026). The API names each
-- answer's XP (5 a correct answer) in p_outcomes; the run is awarded its XP
-- less that of the correct answers whose question paid this account XP less
-- than 60 minutes ago, in a quiz or in another run. A run whose every correct
-- answer is on cooldown is awarded nothing, as a run with none right. A run
-- sent by the code before 058 names no XP per answer and is paid as before.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001051';
  v_old     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001052';
  v_awarded INTEGER;
  v_xp      BIGINT;
BEGIN
  -- Three right, one wrong: 15.
  ASSERT public.record_challenge_completion(v_user, 'cooldownrun000000001', 'webdev', 15, NULL,
    '[{"questionId":"c1","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"c2","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"c3","category":"css","isCorrect":true,"xp":5},
      {"questionId":"c4","category":"css","isCorrect":false,"xp":0}]'), 'the first run is awarded';
  SELECT xp INTO v_awarded FROM public.verified_activity_awards WHERE award_id = 'challenge:cooldownrun000000001';
  ASSERT v_awarded = 15, format('three new right answers pay 15, got %s', v_awarded);

  -- At once again: c1 right again (on cooldown) and c4 right now (new XP): 5.
  ASSERT public.record_challenge_completion(v_user, 'cooldownrun000000002', 'webdev', 10, NULL,
    '[{"questionId":"c1","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"c4","category":"css","isCorrect":true,"xp":5}]'), 'the second run is awarded';
  SELECT xp INTO v_awarded FROM public.verified_activity_awards WHERE award_id = 'challenge:cooldownrun000000002';
  ASSERT v_awarded = 5, format('an answer paid less than an hour ago pays nothing: expected 5, got %s', v_awarded);

  -- A question a quiz paid is on cooldown in a run too.
  PERFORM public.record_verified_quiz_result_v2(
    v_user, 'cooldownrunquiz00001', 1, 1, NULL,
    '[{"questionId":"c9","category":"javascript","isCorrect":true,"xp":8}]',
    'webdev', 8);
  ASSERT NOT public.record_challenge_completion(v_user, 'cooldownrun000000003', 'webdev', 10, NULL,
    '[{"questionId":"c9","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"c2","category":"javascript","isCorrect":true,"xp":5}]'),
    'a run whose every right answer is on cooldown is awarded nothing';
  ASSERT NOT EXISTS (SELECT 1 FROM public.verified_activity_awards WHERE award_id = 'challenge:cooldownrun000000003'),
    'and records no award';

  -- The boundary: 59 minutes is on cooldown, 60 minutes pays.
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '59 minutes'
   WHERE user_id = v_user AND question_id IN ('c2', 'c3');
  UPDATE public.user_question_xp SET last_xp_at = NOW() - INTERVAL '60 minutes'
   WHERE user_id = v_user AND question_id = 'c3';
  ASSERT public.record_challenge_completion(v_user, 'cooldownrun000000004', 'webdev', 10, NULL,
    '[{"questionId":"c2","category":"javascript","isCorrect":true,"xp":5},
      {"questionId":"c3","category":"css","isCorrect":true,"xp":5}]'), 'the fourth run is awarded';
  SELECT xp INTO v_awarded FROM public.verified_activity_awards WHERE award_id = 'challenge:cooldownrun000000004';
  ASSERT v_awarded = 5, format('59 minutes pays nothing and 60 pays: expected 5, got %s', v_awarded);

  -- A replayed run changes nothing and claims nothing.
  ASSERT NOT public.record_challenge_completion(v_user, 'cooldownrun000000004', 'webdev', 10, NULL,
    '[{"questionId":"c8","category":"javascript","isCorrect":true,"xp":5}]'), 'a replayed run is refused';
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_question_xp WHERE user_id = v_user AND question_id = 'c8'),
    'a replay claims no question';

  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 33, format('15 + 5 + 8 (the quiz) + 0 + 5: expected 33, got %s', v_xp);

  -- The code before 058 names no XP per answer: the run is paid in full, and
  -- starts no hour.
  PERFORM public.record_challenge_completion(v_old, 'cooldownrunold000001', 'webdev', 10, NULL,
    '[{"questionId":"c1","category":"javascript","isCorrect":true},
      {"questionId":"c2","category":"javascript","isCorrect":true}]');
  PERFORM public.record_challenge_completion(v_old, 'cooldownrunold000002', 'webdev', 10, NULL,
    '[{"questionId":"c1","category":"javascript","isCorrect":true},
      {"questionId":"c2","category":"javascript","isCorrect":true}]');
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_old;
  ASSERT v_xp = 20, format('runs without per-answer XP pay as before: expected 20, got %s', v_xp);
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_question_xp WHERE user_id = v_old), 'and start no hour';
END;
$$;
