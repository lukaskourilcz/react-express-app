-- A coding task's XP (and so its coins) is for solving it (migration 048): a
-- first pass after the learner revealed the solution earns none, and neither
-- does any later pass, because the award stays once per account and task. A
-- pass without a reveal earns it as before, and a reveal after the pass takes
-- nothing back.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001301';
  v_result JSONB;
  v_xp     BIGINT;
  v_awards INTEGER;
BEGIN
  -- Revealed first, then passed: the pass is recorded, no XP.
  PERFORM public.record_coding_reveal(v_user, 'js-double-numbers', 'javascript');
  v_result := public.record_coding_verdict(v_user, 'revealcoding0001', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND (v_result ->> 'firstPass')::BOOLEAN,
    format('the pass after a reveal is recorded as the first pass: %s', v_result);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN IS FALSE, format('it earns no XP: %s', v_result);
  ASSERT v_result ->> 'status' = 'passed', format('the task is passed: %s', v_result);

  -- A later pass is review: still nothing.
  v_result := public.record_coding_verdict(v_user, 'revealcoding0002', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN IS FALSE, format('a later pass pays nothing either: %s', v_result);

  SELECT COALESCE(SUM(quest_xp), 0) INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  SELECT COUNT(*)::INT INTO v_awards FROM public.verified_activity_awards WHERE user_id = v_user;
  ASSERT v_xp = 0 AND v_awards = 0, format('no XP and no award for the revealed task: %s XP, %s awards', v_xp, v_awards);

  -- Another task passed without a reveal pays its XP.
  v_result := public.record_coding_verdict(v_user, 'revealcoding0003', 'js-sum-array', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN, format('a pass without a reveal pays: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 20, format('20 XP for the task solved without the solution, got %s', v_xp);

  -- Revealing it afterwards keeps the pass and the XP.
  PERFORM public.record_coding_reveal(v_user, 'js-sum-array', 'javascript');
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 20, format('a reveal after the pass takes nothing back, got %s', v_xp);

  -- A failed run after a reveal, then a pass: still the revealed task.
  PERFORM public.record_coding_reveal(v_user, 'ts-first-type', 'typescript');
  PERFORM public.record_coding_verdict(v_user, 'revealcoding0004', 'ts-first-type', 'typescript', 'failed', TRUE, 20);
  v_result := public.record_coding_verdict(v_user, 'revealcoding0005', 'ts-first-type', 'typescript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN IS FALSE, format('a reveal before a failed run still forfeits the XP: %s', v_result);
END;
$$;
