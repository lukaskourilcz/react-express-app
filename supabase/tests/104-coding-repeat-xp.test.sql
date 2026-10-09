-- A coding task pays its XP again (migration 058, owner decision of 9 Oct
-- 2026) when, at a verified pass, all of these hold:
--   * the learner reset the task since its last award (record_coding_reset);
--   * at least 60 minutes passed since the task last paid its XP, or a reveal
--     forfeited it;
--   * no reveal was recorded since that reset (record_coding_repeat_reveal).
-- Any verified pass closes the reset, so each payment takes a reset of its
-- own. A repeat pays the task's XP, under its own award id, into user_xp and
-- the month's ledger, and is no first pass. Without a reset, which the code
-- in production never records, nothing changes: a later pass pays nothing.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001041';
  v_task    CONSTANT TEXT := 'js-double-numbers';
  v_award   CONSTANT TEXT := 'coding:aaaaaaaa-0000-4000-8000-000000001041:js-double-numbers';
  v_result  JSONB;
  v_reset   JSONB;
  v_xp      BIGINT;
  v_month   BIGINT;
  v_n       INTEGER := 0;
  -- A verified pass under a fresh attempt id.
  v_pass CONSTANT TEXT := 'passed';
BEGIN
  -- A task never opened has nothing to reset.
  v_reset := public.record_coding_reset(v_user, v_task);
  ASSERT NOT (v_reset ->> 'recorded')::BOOLEAN, format('no row, no reset: %s', v_reset);

  -- The first pass pays as before and opens the next XP an hour later.
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000001', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN AND v_result ->> 'xpKind' = 'first' AND (v_result ->> 'firstPass')::BOOLEAN,
    format('the first pass pays: %s', v_result);
  ASSERT (v_result #>> '{repeatXp,needsReset}')::BOOLEAN AND v_result #> '{repeatXp,withheld}' = 'null'::jsonb,
    format('it needs a reset next: %s', v_result);
  ASSERT (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '60 minutes',
    format('and opens an hour later: %s', v_result);

  -- 1. No reset: a later pass pays nothing, an hour later too.
  UPDATE public.coding_progress SET last_xp_at = NOW() - INTERVAL '2 hours' WHERE user_id = v_user AND task_id = v_task;
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000002', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN AND v_result #>> '{repeatXp,withheld}' = 'reset',
    format('without a reset nothing is paid: %s', v_result);

  -- 2. The boundary: a reset 59 minutes after the award pays nothing, and the
  --    pass closes the reset.
  UPDATE public.coding_progress SET last_xp_at = NOW() - INTERVAL '59 minutes' WHERE user_id = v_user AND task_id = v_task;
  v_reset := public.record_coding_reset(v_user, v_task);
  ASSERT (v_reset ->> 'recorded')::BOOLEAN, format('the reset is recorded: %s', v_reset);
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000003', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN AND v_result #>> '{repeatXp,withheld}' = 'cooldown'
     AND (v_result #>> '{repeatXp,needsReset}')::BOOLEAN,
    format('59 minutes: no XP, and the reset is spent: %s', v_result);
  ASSERT (SELECT reset_at IS NULL FROM public.coding_progress WHERE user_id = v_user AND task_id = v_task), 'the reset is closed';

  -- 3. At 60 minutes, after a reset: the repeat XP.
  UPDATE public.coding_progress SET last_xp_at = NOW() - INTERVAL '60 minutes' WHERE user_id = v_user AND task_id = v_task;
  PERFORM public.record_coding_reset(v_user, v_task);
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000004', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN AND v_result ->> 'xpKind' = 'repeat' AND NOT (v_result ->> 'firstPass')::BOOLEAN,
    format('60 minutes after a reset the task pays again, as no first pass: %s', v_result);
  ASSERT EXISTS (SELECT 1 FROM public.verified_activity_awards WHERE award_id = v_award || ':r1' AND xp = 25),
    'under an award id of its own, at the task''s XP';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  SELECT SUM(xp) INTO v_month FROM public.user_xp_days WHERE user_id = v_user;
  ASSERT v_xp = 50 AND v_month = 50, format('into the balance and the month: %s and %s', v_xp, v_month);

  -- 4. One reset pays once: a second pass right after pays nothing.
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000005', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN AND v_result #>> '{repeatXp,withheld}' = 'reset',
    format('the reset was spent by the award: %s', v_result);
  -- And a new reset at once is still inside the hour of that award.
  PERFORM public.record_coding_reset(v_user, v_task);
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000006', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT v_result #>> '{repeatXp,withheld}' = 'cooldown', format('the hour runs from the repeat: %s', v_result);

  -- 5. A failed run and an unverified pass leave the reset open.
  UPDATE public.coding_progress SET last_xp_at = NOW() - INTERVAL '3 hours' WHERE user_id = v_user AND task_id = v_task;
  PERFORM public.record_coding_reset(v_user, v_task);
  PERFORM public.record_coding_verdict(v_user, 'repeatxp0000000007', v_task, 'javascript', 'failed', TRUE, 25);
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000008', v_task, 'javascript', v_pass, FALSE, 0);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN AND v_result -> 'repeatXp' = 'null'::jsonb, format('an unverified pass pays nothing: %s', v_result);
  ASSERT (SELECT reset_at IS NOT NULL FROM public.coding_progress WHERE user_id = v_user AND task_id = v_task), 'the reset is still open';

  -- 6. A reveal after the reset forfeits that attempt's XP, and its hour.
  ASSERT public.record_coding_repeat_reveal(v_user, v_task), 'the reveal is recorded against the open reset';
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000009', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN AND (v_result ->> 'xpForfeited')::BOOLEAN,
    format('a reveal after the reset forfeits the XP: %s', v_result);
  ASSERT (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '60 minutes',
    format('and the next XP waits an hour from that pass: %s', v_result);
  -- A reveal with no reset open forfeits nothing.
  ASSERT NOT public.record_coding_repeat_reveal(v_user, v_task), 'no open reset, nothing to forfeit';

  -- 7. A new reset after the hour pays again, under the next id.
  UPDATE public.coding_progress SET last_xp_at = NOW() - INTERVAL '61 minutes' WHERE user_id = v_user AND task_id = v_task;
  PERFORM public.record_coding_reset(v_user, v_task);
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000010', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT v_result ->> 'xpKind' = 'repeat', format('a fresh reset pays: %s', v_result);
  SELECT count(*)::INT INTO v_n FROM public.verified_activity_awards WHERE user_id = v_user;
  ASSERT v_n = 3 AND EXISTS (SELECT 1 FROM public.verified_activity_awards WHERE award_id = v_award || ':r2'),
    format('three awards, each its own id: %s', v_n);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 75, format('25 three times: %s', v_xp);

  -- 8. A replayed verdict repeats nothing.
  v_result := public.record_coding_verdict(v_user, 'repeatxp0000000010', v_task, 'javascript', v_pass, TRUE, 25);
  ASSERT NOT (v_result ->> 'applied')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN, format('a replay: %s', v_result);
END;
$$;

-- A task that never paid (its first pass came after a reveal) counts its hour
-- from that pass, and a reset after it then pays.
DO $$
DECLARE
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001042';
  v_result JSONB;
BEGIN
  PERFORM public.record_coding_reveal(v_user, 'js-sum-array', 'javascript');
  v_result := public.record_coding_verdict(v_user, 'repeatxprevealed01', 'js-sum-array', 'javascript', 'passed', TRUE, 25);
  ASSERT (v_result ->> 'xpForfeited')::BOOLEAN, format('the first pass after a reveal forfeits: %s', v_result);
  PERFORM public.record_coding_reset(v_user, 'js-sum-array');
  v_result := public.record_coding_verdict(v_user, 'repeatxprevealed02', 'js-sum-array', 'javascript', 'passed', TRUE, 25);
  ASSERT v_result #>> '{repeatXp,withheld}' = 'cooldown', format('the hour runs from the forfeited pass: %s', v_result);
  UPDATE public.coding_progress SET last_xp_at = NOW() - INTERVAL '60 minutes' WHERE user_id = v_user AND task_id = 'js-sum-array';
  PERFORM public.record_coding_reset(v_user, 'js-sum-array');
  v_result := public.record_coding_verdict(v_user, 'repeatxprevealed03', 'js-sum-array', 'javascript', 'passed', TRUE, 25);
  ASSERT v_result ->> 'xpKind' = 'repeat', format('a reset an hour later pays: %s', v_result);
END;
$$;
