-- Migration 058: a coding task's first verified pass pays its XP, even after
-- an old unverified pass (owner decision 3, 9 October 2026; audit finding
-- C1-7). Apply after migrations 001-057. Safe to re-run.
--
-- Compatible with the code in production (e077f45), which is still running
-- when this is applied: record_coding_verdict keeps its name, its arguments,
-- its defaults, its grants and its result. The result gains one key,
-- `xpForfeited`, which that code does not read.
--
-- From 3 September React passes were graded in the browser and reported with
-- p_verified FALSE, and until 29 September a checklist capstone passed on the
-- learner's word. The routine paid XP on a task's first pass of any kind
-- (`passes = 0`), so a learner whose first pass was one of those, and who
-- was not paid for it, could never be paid: the first pass the server
-- actually checked was their second. Before 041 the award id named only the
-- task ('coding:<task>'), so the first account to pass a task was the only
-- one ever paid for it, and such learners were common.
--
-- Now the first VERIFIED pass of a task pays, once per account and task:
--   * It is the first pass with p_verified TRUE on a row whose `verified`
--     is still FALSE. The row lock (FOR UPDATE) serialises two Submits of the
--     same task, so the second sees `verified` TRUE and pays nothing; the
--     ledger's primary key (verified_activity_awards.award_id) refuses a
--     second award even so.
--   * It pays nothing when this account already holds a coding award for the
--     task: the current id ('coding:<account>:<task>', 041) or the id of
--     025-038 ('coding:<task>' with this account's user_id). Such a learner
--     was paid for an earlier pass, verified or not, and is not paid again.
--   * A reveal recorded before it still forfeits the XP (048). The verdict
--     then says so in `xpForfeited`, which the API reads in place of its own
--     guess from the progress row.
--   * An unverified pass never pays, whatever p_xp says. The API has sent
--     p_xp 0 for one since 29 September.
-- The legacy pass stays as it was: its coding_attempts row, `passes`,
-- `best_passed_at` and status are history. `firstPass` is TRUE for the task's
-- first pass and for its first verified pass, so that verdict reads as the
-- first pass it is. Coins follow the XP in the API under the same award id
-- (credit_verified_xp_tokens, 041), so they are paid once with it.
--
-- Nothing else changes: the streak, the review columns, the Learn attempt
-- link and its lock order (052), and the replay rule.

DO $$
BEGIN
  IF to_regprocedure('public.record_coding_verdict(text, text, text, text, text, boolean, integer, text, text, integer, integer, integer, text)') IS NULL
     OR to_regprocedure('public.record_verified_activity_xp(text, text, text, integer)') IS NULL
     OR to_regprocedure('public.token_account_key(text)') IS NULL
     OR to_regprocedure('public.advance_verified_streak(text)') IS NULL THEN
    RAISE EXCEPTION 'migration 058 needs migrations 025, 041, 048 and 052 first';
  END IF;
END;
$$;

-- Restated from 052. What changes is marked "058".
CREATE OR REPLACE FUNCTION public.record_coding_verdict(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_task_id TEXT,
  p_track TEXT,
  p_outcome TEXT,
  p_verified BOOLEAN,
  p_xp INTEGER,
  p_subject TEXT DEFAULT 'webdev',
  p_roadmap_attempt_id TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_run_count INTEGER DEFAULT NULL,
  p_hints_used INTEGER DEFAULT 0,
  p_code_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted INTEGER;
  v_row public.coding_progress%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_first_pass BOOLEAN := FALSE;
  v_first_verified BOOLEAN := FALSE;
  v_paid_before BOOLEAN := FALSE;
  v_revealed_before BOOLEAN := FALSE;
  v_xp_awarded BOOLEAN := FALSE;
  v_xp_forfeited BOOLEAN := FALSE;
  v_code_changed BOOLEAN := FALSE;
  v_award_id TEXT;
  v_stage INTEGER;
  v_clean INTEGER;
  v_next TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_attempt_id !~ '^[A-Za-z0-9:_-]{8,128}$' OR
     p_task_id !~ '^[a-z0-9-]{3,64}$' OR
     p_track NOT IN ('javascript', 'typescript', 'react', 'system-design', 'algorithms') OR
     p_outcome NOT IN ('passed', 'failed', 'error', 'timeout') OR
     p_xp < 0 OR p_xp > 10000 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     (p_roadmap_attempt_id IS NOT NULL AND p_roadmap_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$') OR
     (p_hints_used IS NOT NULL AND (p_hints_used < 0 OR p_hints_used > 20)) THEN
    RAISE EXCEPTION 'invalid_coding_verdict';
  END IF;

  INSERT INTO public.coding_attempts (
    attempt_id, user_id, task_id, track, outcome, verified, duration_ms, run_count, hints_used
  ) VALUES (
    p_attempt_id, p_user_id, p_task_id, p_track, p_outcome, COALESCE(p_verified, FALSE),
    p_duration_ms, p_run_count, p_hints_used
  )
  ON CONFLICT (attempt_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  INSERT INTO public.coding_progress (user_id, task_id, track)
  VALUES (p_user_id, p_task_id, p_track)
  ON CONFLICT (user_id, task_id) DO NOTHING;
  SELECT * INTO v_row FROM public.coding_progress
   WHERE user_id = p_user_id AND task_id = p_task_id
   FOR UPDATE;

  IF v_inserted = 0 THEN
    -- Replay of a verdict already recorded: report, never re-apply.
    RETURN jsonb_build_object(
      'applied', FALSE, 'firstPass', FALSE, 'xpAwarded', FALSE, 'xpForfeited', FALSE, 'codeChanged', FALSE,
      'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
      'nextReviewAt', v_row.next_review_at
    );
  END IF;

  -- Moved up in 052: the attempt row's lock comes before user_stats's.
  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
    VALUES (p_roadmap_attempt_id, p_task_id, p_outcome = 'passed', COALESCE(p_verified, FALSE))
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET
      passed = public.roadmap_attempt_coding.passed OR EXCLUDED.passed,
      verified = public.roadmap_attempt_coding.verified OR EXCLUDED.verified,
      updated_at = NOW();
  END IF;

  IF p_outcome = 'passed' THEN
    -- 058: the first verified pass is a first pass too, after an unverified
    -- one. v_row is locked, so a concurrent Submit of this task reads the
    -- row this one writes.
    v_first_verified := COALESCE(p_verified, FALSE) AND NOT v_row.verified;
    v_first_pass := v_row.passes = 0 OR v_first_verified;
    -- Read before the update below. The API records a reveal only before a
    -- pass, so a reveal on record came before this pass.
    v_revealed_before := v_row.reveal_count > 0 OR v_row.status = 'revealed';
    v_code_changed := p_code_hash IS NOT NULL AND v_row.last_code_hash IS DISTINCT FROM p_code_hash;

    -- Review ladder: a clean pass (no hints) in a new sitting climbs one rung;
    -- two such passes retire the task. Anything else restarts at four hours.
    v_stage := v_row.review_stage;
    v_clean := v_row.clean_passes;
    IF COALESCE(p_hints_used, 0) = 0 AND v_row.passes > 0 AND
       (v_row.last_pass_sitting IS NULL OR v_row.last_pass_sitting <> v_today) THEN
      v_clean := v_clean + 1;
      v_stage := LEAST(v_stage + 1, 2);
    ELSIF COALESCE(p_hints_used, 0) > 0 THEN
      v_clean := 0;
      v_stage := 0;
    END IF;
    IF v_clean >= 2 THEN
      v_stage := 3;                            -- retired from the review queue
      v_next := NULL;
    ELSE
      v_next := NOW() + CASE v_stage WHEN 0 THEN INTERVAL '4 hours'
                                     WHEN 1 THEN INTERVAL '24 hours'
                                     ELSE INTERVAL '48 hours' END;
    END IF;

    UPDATE public.coding_progress
       SET status = 'passed',
           verified = verified OR COALESCE(p_verified, FALSE),
           passes = passes + 1,
           clean_passes = v_clean,
           last_pass_sitting = v_today,
           review_stage = v_stage,
           next_review_at = v_next,
           best_passed_at = COALESCE(best_passed_at, NOW()),
           last_code_hash = COALESCE(p_code_hash, last_code_hash),
           updated_at = NOW()
     WHERE user_id = p_user_id AND task_id = p_task_id
     RETURNING * INTO v_row;

    -- Any verified pass is a day of learning (048). An unverified
    -- (self-reported checklist) pass is not.
    IF COALESCE(p_verified, FALSE) THEN
      PERFORM public.advance_verified_streak(p_user_id);
    END IF;

    -- 058: the first verified pass pays, unless this account already holds
    -- the task's award under the current id or the id of 025-038.
    IF v_first_verified AND p_xp > 0 THEN
      v_award_id := 'coding:' || public.token_account_key(p_user_id) || ':' || p_task_id;
      v_paid_before := EXISTS (
        SELECT 1 FROM public.verified_activity_awards
         WHERE award_id IN (v_award_id, 'coding:' || p_task_id) AND user_id = p_user_id
      );
      IF NOT v_paid_before THEN
        IF v_revealed_before THEN
          v_xp_forfeited := TRUE;
        ELSE
          v_xp_awarded := public.record_verified_activity_xp(p_user_id, v_award_id, p_subject, p_xp);
        END IF;
      END IF;
    END IF;
  ELSE
    -- A failed, errored or timed-out run after a pass sends the task back to the
    -- short interval; before any pass it only marks the task as started.
    UPDATE public.coding_progress
       SET review_stage = CASE WHEN status = 'passed' THEN 0 ELSE review_stage END,
           clean_passes = CASE WHEN status = 'passed' THEN 0 ELSE clean_passes END,
           next_review_at = CASE WHEN status = 'passed' THEN NOW() + INTERVAL '4 hours' ELSE next_review_at END,
           updated_at = NOW()
     WHERE user_id = p_user_id AND task_id = p_task_id
     RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'applied', TRUE, 'firstPass', v_first_pass, 'xpAwarded', v_xp_awarded,
    'xpForfeited', v_xp_forfeited,
    'codeChanged', v_first_pass OR v_code_changed,
    'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
    'nextReviewAt', v_row.next_review_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_coding_verdict(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_verdict(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT
) TO service_role;
