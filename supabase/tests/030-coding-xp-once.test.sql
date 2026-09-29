-- Coding XP is paid once per account and task: on the first passing verdict.
-- A replayed verdict changes nothing, a later pass of the same task is review
-- and pays nothing, and another account passing the same task gets its own XP.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000030';
  v_other CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000031';
  v_result JSONB;
  v_xp BIGINT;
  v_passes INTEGER;
BEGIN
  -- A failed run first: no XP, the task is only started.
  v_result := public.record_coding_verdict(v_user, 'codingattempt00001', 'js-double-numbers', 'javascript', 'failed', TRUE, 20);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN IS FALSE, 'a failed run pays no XP';

  v_result := public.record_coding_verdict(v_user, 'codingattempt00002', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND (v_result ->> 'firstPass')::BOOLEAN AND (v_result ->> 'xpAwarded')::BOOLEAN,
    format('the first pass is applied and pays XP: %s', v_result);

  -- The same verdict replayed.
  v_result := public.record_coding_verdict(v_user, 'codingattempt00002', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'applied')::BOOLEAN IS FALSE AND (v_result ->> 'xpAwarded')::BOOLEAN IS FALSE,
    format('a replayed verdict is not applied again: %s', v_result);

  -- A second, genuine pass of the same task.
  v_result := public.record_coding_verdict(v_user, 'codingattempt00003', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND NOT (v_result ->> 'firstPass')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN,
    format('a later pass is recorded as review and pays nothing: %s', v_result);

  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 20, format('the task paid its XP once: expected 20, got %s', v_xp);
  SELECT passes INTO v_passes FROM public.coding_progress WHERE user_id = v_user AND task_id = 'js-double-numbers';
  ASSERT v_passes = 2, format('both genuine passes are on record: expected 2, got %s', v_passes);

  -- Another account passing the same task earns its own XP.
  v_result := public.record_coding_verdict(v_other, 'codingattempt00004', 'js-double-numbers', 'javascript', 'passed', TRUE, 20);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN, format('another account''s first pass pays: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_other;
  ASSERT v_xp = 20, format('the other account has its own 20 XP, got %s', v_xp);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 20, format('and the first account still has 20, got %s', v_xp);
END;
$$;
