-- A replayed Learn level or part test pays its XP again (migration 060,
-- owner decision of 9 Oct 2026, afternoon) when, at a verified pass of a step
-- already passed, the step last paid this account its XP at least 60 minutes
-- ago. The first pass pays learning XP as before (056) and starts the hour.
-- A repeat pays the step's learn_step_xp under its own award id
-- ('learn-repeat:<attempt>') into user_xp and the month's ledger, and no
-- coins. A pass inside the hour pays nothing and says when the XP opens.
-- The routine the code in production calls (056) still pays no replay.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002301';
  v_result JSONB;
  v_xp     BIGINT;
  v_month  BIGINT;
  v_level  JSONB;
  v_n      INTEGER := 0;
  v_attempt TEXT;
BEGIN
  -- Level javascript/1 (50 XP, tier 1): one question, 100% to pass.
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000001', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnrepeat000000001');
  ASSERT (v_result ->> 'applied')::BOOLEAN AND (v_result ->> 'passed')::BOOLEAN AND (v_result ->> 'firstPass')::BOOLEAN,
    format('the first pass completes as a first pass: %s', v_result);
  ASSERT (v_result #>> '{repeatXp,xp}')::INT = 0 AND v_result #> '{repeatXp,withheld}' = 'null'::jsonb
     AND (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '60 minutes',
    format('it pays learning XP, not repeat XP, and opens the repeat an hour later: %s', v_result);
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_xp WHERE user_id = v_user), 'the first pass adds nothing to user_xp (learning XP is derived)';
  SELECT SUM(xp) INTO v_month FROM public.user_xp_days WHERE user_id = v_user;
  ASSERT v_month = 50, format('the month counts the first pass once (056): %s', v_month);
  ASSERT (SELECT last_xp_at = NOW() AND repeats = 0 FROM public.user_learn_step_xp
           WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1),
    'the step''s hour starts at the first pass';

  -- 1. Straight away: nothing, and when it opens.
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000002', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnrepeat000000002');
  ASSERT (v_result ->> 'applied')::BOOLEAN AND NOT (v_result ->> 'firstPass')::BOOLEAN
     AND (v_result #>> '{repeatXp,xp}')::INT = 0 AND v_result #>> '{repeatXp,withheld}' = 'cooldown'
     AND (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '60 minutes',
    format('a replay inside the hour pays nothing and says when: %s', v_result);

  -- 2. The boundary: 59 minutes after it last paid, still nothing.
  UPDATE public.user_learn_step_xp SET last_xp_at = NOW() - INTERVAL '59 minutes'
   WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1;
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000003', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnrepeat000000003');
  ASSERT (v_result #>> '{repeatXp,xp}')::INT = 0 AND v_result #>> '{repeatXp,withheld}' = 'cooldown'
     AND (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '1 minute',
    format('59 minutes: no XP, one minute to go: %s', v_result);
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_xp WHERE user_id = v_user), '59 minutes paid nothing';
  ASSERT (SELECT last_xp_at = NOW() - INTERVAL '59 minutes' FROM public.user_learn_step_xp
           WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1),
    'a pass that paid nothing does not restart the hour';

  -- 3. At 60 minutes: the level's XP again, as XP only.
  UPDATE public.user_learn_step_xp SET last_xp_at = NOW() - INTERVAL '60 minutes'
   WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1;
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000004', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnrepeat000000004');
  ASSERT (v_result #>> '{repeatXp,xp}')::INT = 50 AND v_result #> '{repeatXp,withheld}' = 'null'::jsonb
     AND (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '60 minutes'
     AND NOT (v_result ->> 'firstPass')::BOOLEAN,
    format('60 minutes: the level pays its 50 XP again, and the next hour starts: %s', v_result);
  ASSERT EXISTS (SELECT 1 FROM public.verified_activity_awards
                  WHERE award_id = 'learn-repeat:learnrepeat000000004' AND user_id = v_user AND subject = 'webdev' AND xp = 50),
    'under an award id of its own';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  SELECT SUM(xp) INTO v_month FROM public.user_xp_days WHERE user_id = v_user;
  ASSERT v_xp = 50 AND v_month = 100, format('into the balance and the month: %s and %s', v_xp, v_month);
  ASSERT (SELECT repeats = 1 AND last_xp_at = NOW() FROM public.user_learn_step_xp
           WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1), 'one repeat, paid now';
  -- XP only: no coins, no badge.
  ASSERT NOT EXISTS (SELECT 1 FROM public.token_ledger WHERE user_id = v_user), 'a repeat credits no coins';
  ASSERT NOT EXISTS (SELECT 1 FROM public.token_xp_credits WHERE user_id = v_user), 'and records no coin credit';
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = v_user), 'and awards no badge';

  -- 4. The progress, mastery and streak are 056's: the replays kept the pass.
  SELECT data #> '{javascript,levels,1}' INTO v_level FROM public.roadmap_progress WHERE user_id = v_user;
  ASSERT (v_level ->> 'passed')::BOOLEAN AND jsonb_array_length(v_level -> 'passDays') = 1,
    format('the level stays passed, one pass day today: %s', v_level);

  -- 5. A failed replay pays nothing and says nothing about repeat XP, an hour
  --    later too.
  UPDATE public.user_learn_step_xp SET last_xp_at = NOW() - INTERVAL '3 hours'
   WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1;
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000005', v_user, 'q1', 0, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnrepeat000000005');
  ASSERT (v_result ->> 'applied')::BOOLEAN AND NOT (v_result ->> 'passed')::BOOLEAN AND v_result -> 'repeatXp' = 'null'::jsonb,
    format('a failed replay: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 50, format('a failed replay pays nothing: %s', v_xp);

  -- 6. A completed attempt completes once: the second call reports and pays nothing.
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnrepeat000000004');
  ASSERT NOT (v_result ->> 'applied')::BOOLEAN AND v_result -> 'repeatXp' = 'null'::jsonb,
    format('a completed attempt is not applied again: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 50, format('and pays nothing again: %s', v_xp);

  -- 7. The code in production calls 056's routine, which still pays no replay.
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000006', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  ASSERT public.complete_verified_roadmap_attempt(v_user, 'learnrepeat000000006'), 'the old routine completes a replay';
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  SELECT SUM(xp) INTO v_month FROM public.user_xp_days WHERE user_id = v_user;
  ASSERT v_xp = 50 AND v_month = 100, format('and pays nothing for it: %s and %s', v_xp, v_month);
  ASSERT (SELECT repeats = 1 FROM public.user_learn_step_xp
           WHERE user_id = v_user AND topic = 'javascript' AND kind = 'level' AND ref = 1), 'nor claims the step';

  -- 8. Another account's attempt is refused as before.
  PERFORM public.record_roadmap_answer_v2('learnrepeat000000007', v_user, 'q1', 1, 1, 'webdev', 'javascript', 'level', 1, 1, 100);
  BEGIN
    PERFORM public.complete_verified_roadmap_attempt_v2('aaaaaaaa-0000-4000-8000-000000002399', 'learnrepeat000000007');
    RAISE EXCEPTION 'another account completed this attempt';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_roadmap_attempt', format('another account is refused: %s', SQLERRM);
  END;
END;
$$;

-- A part test pays its own XP again (part n is 300 × n), and a step first
-- passed before 060 counts its hour from its first passed attempt on record.
DO $$
DECLARE
  v_user   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000002302';
  v_result JSONB;
  v_xp     BIGINT;
BEGIN
  -- Part test 2 of html, first passed through 056's routine, as the code in
  -- production records it: no step row.
  PERFORM public.record_roadmap_answer_v2('learnpartrepeat00001', v_user, 'q1', 1, 1, 'webdev', 'html', 'checkpoint', 2, 1, 70);
  ASSERT public.complete_verified_roadmap_attempt(v_user, 'learnpartrepeat00001'), 'the part test passes through 056';
  ASSERT NOT EXISTS (SELECT 1 FROM public.user_learn_step_xp WHERE user_id = v_user), 'no step row yet';
  UPDATE public.roadmap_attempts SET completed_at = NOW() - INTERVAL '30 minutes' WHERE attempt_id = 'learnpartrepeat00001';

  -- 30 minutes after that first pass: nothing, 30 minutes to go.
  PERFORM public.record_roadmap_answer_v2('learnpartrepeat00002', v_user, 'q1', 1, 1, 'webdev', 'html', 'checkpoint', 2, 1, 70);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnpartrepeat00002');
  ASSERT (v_result #>> '{repeatXp,xp}')::INT = 0 AND v_result #>> '{repeatXp,withheld}' = 'cooldown'
     AND (v_result #>> '{repeatXp,availableAt}')::TIMESTAMPTZ = NOW() + INTERVAL '30 minutes',
    format('the hour counts from the first pass on record: %s', v_result);

  -- Two hours after it: the part test's 600 XP.
  UPDATE public.roadmap_attempts SET completed_at = NOW() - INTERVAL '2 hours' WHERE attempt_id = 'learnpartrepeat00001';
  DELETE FROM public.user_learn_step_xp WHERE user_id = v_user;
  PERFORM public.record_roadmap_answer_v2('learnpartrepeat00003', v_user, 'q1', 1, 1, 'webdev', 'html', 'checkpoint', 2, 1, 70);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnpartrepeat00003');
  ASSERT (v_result #>> '{repeatXp,xp}')::INT = 600, format('part test 2 pays 600 XP again: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 600, format('into the balance: %s', v_xp);

  -- A step whose first pass is no longer on record (purged) pays at once.
  PERFORM public.record_roadmap_answer_v2('learnpartrepeat00004', v_user, 'q1', 1, 1, 'webdev', 'html', 'level', 3, 1, 70);
  ASSERT public.complete_verified_roadmap_attempt(v_user, 'learnpartrepeat00004'), 'level 3 passes through 056';
  DELETE FROM public.roadmap_attempts WHERE attempt_id = 'learnpartrepeat00004';
  PERFORM public.record_roadmap_answer_v2('learnpartrepeat00005', v_user, 'q1', 1, 1, 'webdev', 'html', 'level', 3, 1, 70);
  v_result := public.complete_verified_roadmap_attempt_v2(v_user, 'learnpartrepeat00005');
  ASSERT (v_result #>> '{repeatXp,xp}')::INT = 50, format('a purged first pass is long past: %s', v_result);
  SELECT quest_xp INTO v_xp FROM public.user_xp WHERE user_id = v_user;
  ASSERT v_xp = 650, format('600 + 50: %s', v_xp);
END;
$$;

-- Only the server calls it, and the browser roles cannot read the table.
DO $$
BEGIN
  ASSERT has_function_privilege('service_role', 'public.complete_verified_roadmap_attempt_v2(text, text, jsonb)', 'EXECUTE'),
    'the service role cannot complete an attempt';
  ASSERT NOT has_function_privilege('anon', 'public.complete_verified_roadmap_attempt_v2(text, text, jsonb)', 'EXECUTE')
     AND NOT has_function_privilege('authenticated', 'public.complete_verified_roadmap_attempt_v2(text, text, jsonb)', 'EXECUTE'),
    'a browser role can complete an attempt';
  ASSERT NOT has_table_privilege('authenticated', 'public.user_learn_step_xp', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.user_learn_step_xp', 'SELECT'),
    'a browser role can read the step hours';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.user_learn_step_xp'::regclass), 'the table has RLS';
END;
$$;
