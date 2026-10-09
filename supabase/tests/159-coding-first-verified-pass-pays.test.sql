-- An old unverified pass no longer blocks a task's XP (migration 058, owner
-- decision 3, audit finding C1-7). React passes reported by the browser
-- (3-29 September) and checklist capstones were recorded with p_verified
-- FALSE, and the routine paid only a task's first pass of any kind, so the
-- first pass the server checked never paid. Now the first verified pass pays
-- the task's XP, once per account and task:
--   * after an unverified pass, the first verified pass pays, and the old pass
--     stays on record;
--   * a later pass, a replay and a second verified pass pay nothing;
--   * an account already paid for the task, under the current award id or the
--     025-038 one, is not paid again;
--   * a reveal on record before it still forfeits the XP, and says so;
--   * an unverified pass never pays.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_learner CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001591';
  v_task    CONSTANT TEXT := 'react-modal-capstone';
  v_award   CONSTANT TEXT := 'coding:' || 'aaaaaaaa-0000-4000-8000-000000001591' || ':react-modal-capstone';
  v_result  JSONB;
  v_xp      BIGINT;
  v_awards  INTEGER;
  v_row     public.coding_progress%ROWTYPE;
  v_coins   INTEGER;
BEGIN
  -- 1. The old pass: reported by the browser, unverified, paid nothing.
  v_result := public.record_coding_verdict(v_learner, 'legacypass000000001', v_task, 'react', 'passed', FALSE, 0);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND (v_result ->> 'firstPass')::BOOLEAN
     AND NOT (v_result ->> 'xpAwarded')::BOOLEAN,
    format('the unverified pass is recorded and pays nothing: %s', v_result);
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_xp WHERE user_id = v_learner), 'no XP for it';

  -- 2. The first verified pass pays the task's XP.
  v_result := public.record_coding_verdict(v_learner, 'legacypass000000002', v_task, 'react', 'passed', TRUE, 120);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND (v_result ->> 'firstPass')::BOOLEAN AND (v_result ->> 'xpAwarded')::BOOLEAN,
    format('the first verified pass is a first pass and pays: %s', v_result);
  ASSERT (v_result ->> 'xpForfeited')::BOOLEAN IS FALSE, format('and claims no forfeit: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_learner;
  ASSERT v_xp = 120, format('120 XP, got %s', v_xp);
  SELECT COUNT(*)::INT INTO v_awards FROM public.verified_activity_awards WHERE user_id = v_learner AND award_id = v_award;
  ASSERT v_awards = 1, format('under the account''s award id, once: %s', v_awards);
  -- Coins ride on the award id (the API calls this right after): once.
  v_coins := public.credit_verified_xp_tokens(v_learner, v_award, 'webdev', 120);
  ASSERT v_coins > 0, format('the award credits coins: %s', v_coins);
  ASSERT public.credit_verified_xp_tokens(v_learner, v_award, 'webdev', 120) = 0, 'and only once';

  -- The old pass is history: its attempt row is kept as it was.
  ASSERT EXISTS (SELECT 1 FROM public.coding_attempts WHERE attempt_id = 'legacypass000000001' AND verified = FALSE AND outcome = 'passed'),
    'the unverified attempt stays on record';
  SELECT * INTO v_row FROM public.coding_progress WHERE user_id = v_learner AND task_id = v_task;
  ASSERT v_row.passes = 2 AND v_row.verified AND v_row.status = 'passed',
    format('both passes count and the task is now verified: %s passes, verified %s', v_row.passes, v_row.verified);

  -- 3. A replay, then another verified pass: nothing more.
  v_result := public.record_coding_verdict(v_learner, 'legacypass000000002', v_task, 'react', 'passed', TRUE, 120);
  ASSERT NOT (v_result ->> 'applied')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN, format('a replay pays nothing: %s', v_result);
  v_result := public.record_coding_verdict(v_learner, 'legacypass000000003', v_task, 'react', 'passed', TRUE, 120);
  ASSERT (v_result ->> 'applied')::BOOLEAN AND NOT (v_result ->> 'firstPass')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN,
    format('a second verified pass is review and pays nothing: %s', v_result);
  -- Two Submits racing: the second waits on the row lock, then reads the
  -- row the first wrote, so it is this case. scripts in the owner's scratch
  -- folder rehearse the race itself on two connections.
  v_result := public.record_coding_verdict(v_learner, 'legacypass000000004', v_task, 'react', 'passed', FALSE, 0);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN, format('an unverified pass after it pays nothing: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_learner;
  SELECT COUNT(*)::INT INTO v_awards FROM public.verified_activity_awards WHERE user_id = v_learner;
  ASSERT v_xp = 120 AND v_awards = 1, format('the task paid once: %s XP, %s awards', v_xp, v_awards);
END;
$$;

-- An account already paid for the task is not paid again.
DO $$
DECLARE
  v_paid_now  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001592';
  v_paid_025  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001593';
  v_other     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001594';
  v_result    JSONB;
  v_xp        BIGINT;
BEGIN
  -- Paid for an unverified first pass under the current id (the browser's
  -- React report after 041 sent the tier's XP).
  PERFORM public.record_coding_verdict(v_paid_now, 'paidbefore00000001', 'react-tabs-capstone', 'react', 'passed', FALSE, 0);
  ASSERT public.record_verified_activity_xp(v_paid_now, 'coding:' || v_paid_now || ':react-tabs-capstone', 'webdev', 120),
    'the award of that time';
  v_result := public.record_coding_verdict(v_paid_now, 'paidbefore00000002', 'react-tabs-capstone', 'react', 'passed', TRUE, 120);
  ASSERT (v_result ->> 'firstPass')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN AND NOT (v_result ->> 'xpForfeited')::BOOLEAN,
    format('already paid under the current id: nothing more, and no forfeit claimed: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_paid_now;
  ASSERT v_xp = 120, format('still 120 XP, got %s', v_xp);

  -- Paid under the id of 025-038, which named only the task.
  PERFORM public.record_coding_verdict(v_paid_025, 'paidbefore00000003', 'react-form-capstone', 'react', 'passed', FALSE, 0);
  ASSERT public.record_verified_activity_xp(v_paid_025, 'coding:react-form-capstone', 'webdev', 120), 'the award of that time';
  v_result := public.record_coding_verdict(v_paid_025, 'paidbefore00000004', 'react-form-capstone', 'react', 'passed', TRUE, 120);
  ASSERT NOT (v_result ->> 'xpAwarded')::BOOLEAN AND NOT (v_result ->> 'xpForfeited')::BOOLEAN,
    format('already paid under the 025 id: nothing more: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_paid_025;
  ASSERT v_xp = 120, format('still 120 XP, got %s', v_xp);

  -- That old id is another account's: it does not stop this one being paid.
  PERFORM public.record_coding_verdict(v_other, 'paidbefore00000005', 'react-form-capstone', 'react', 'passed', FALSE, 0);
  v_result := public.record_coding_verdict(v_other, 'paidbefore00000006', 'react-form-capstone', 'react', 'passed', TRUE, 120);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN, format('another account''s old award is not this one''s: %s', v_result);
END;
$$;

-- A reveal before the first verified pass forfeits its XP and says so; an
-- unverified pass never pays, whatever XP is offered.
DO $$
DECLARE
  v_revealer CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001595';
  v_result   JSONB;
BEGIN
  PERFORM public.record_coding_reveal(v_revealer, 'react-wizard-capstone', 'react');
  PERFORM public.record_coding_verdict(v_revealer, 'revealedlegacy0001', 'react-wizard-capstone', 'react', 'passed', FALSE, 0);
  v_result := public.record_coding_verdict(v_revealer, 'revealedlegacy0002', 'react-wizard-capstone', 'react', 'passed', TRUE, 120);
  ASSERT (v_result ->> 'firstPass')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN AND (v_result ->> 'xpForfeited')::BOOLEAN,
    format('a reveal before the first verified pass forfeits its XP: %s', v_result);
  ASSERT NOT EXISTS (SELECT 1 FROM public.verified_activity_awards WHERE user_id = v_revealer), 'and records no award';

  v_result := public.record_coding_verdict(v_revealer, 'revealedlegacy0003', 'js-double-numbers', 'javascript', 'passed', FALSE, 25);
  ASSERT (v_result ->> 'firstPass')::BOOLEAN AND NOT (v_result ->> 'xpAwarded')::BOOLEAN AND NOT (v_result ->> 'xpForfeited')::BOOLEAN,
    format('an unverified pass never pays: %s', v_result);
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_xp WHERE user_id = v_revealer), 'no XP at all';
  v_result := public.record_coding_verdict(v_revealer, 'revealedlegacy0004', 'js-double-numbers', 'javascript', 'passed', TRUE, 25);
  ASSERT (v_result ->> 'xpAwarded')::BOOLEAN, format('the verified pass after it does: %s', v_result);
END;
$$;
