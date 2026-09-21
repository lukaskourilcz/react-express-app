-- Migration 038: the Algorithms track.
-- Apply after migrations 001-037. Safe to re-run.
--
-- devShark's Coding section gained a fourth practice track, `algorithms`: a
-- set of interview problems in plain JavaScript. Every coding record is keyed
-- by track, and migration 025 wrote the four track names it knew into two
-- CHECK constraints and two routines. Until this runs, a learner who passes an
-- Algorithms challenge is graded correctly and then loses the result, because
-- `record_coding_verdict` raises `invalid_coding_verdict` on the way in.
--
-- Nothing else changes. The track is an ordinary graded track: same XP, same
-- spaced-review ladder, same one-award-per-task ledger. Widening a CHECK
-- admits values it used to refuse and can never fail against existing rows,
-- so this migration cannot invalidate anything already recorded.

DO $$
DECLARE
  v_name TEXT;
BEGIN
  -- The track checks from 025 admit four names. Replace each, whatever
  -- Postgres named it, with one that also admits `algorithms`.
  FOR v_name IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.coding_progress'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%track%'
       AND pg_get_constraintdef(oid) NOT LIKE '%algorithms%'
  LOOP
    EXECUTE format('ALTER TABLE public.coding_progress DROP CONSTRAINT %I', v_name);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.coding_progress'::regclass AND conname = 'coding_progress_track_check'
  ) THEN
    ALTER TABLE public.coding_progress
      ADD CONSTRAINT coding_progress_track_check
      CHECK (track IN ('javascript', 'typescript', 'react', 'system-design', 'algorithms'));
  END IF;

  FOR v_name IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.coding_attempts'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%track%'
       AND pg_get_constraintdef(oid) NOT LIKE '%algorithms%'
  LOOP
    EXECUTE format('ALTER TABLE public.coding_attempts DROP CONSTRAINT %I', v_name);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.coding_attempts'::regclass AND conname = 'coding_attempts_track_check'
  ) THEN
    ALTER TABLE public.coding_attempts
      ADD CONSTRAINT coding_attempts_track_check
      CHECK (track IN ('javascript', 'typescript', 'react', 'system-design', 'algorithms'));
  END IF;
END;
$$;

-- Both routines validate the track themselves, before they touch a table, so
-- widening the constraints alone would still leave them refusing the new one.
-- Replaced verbatim from migration 025 apart from that one list.

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
  v_xp_awarded BOOLEAN := FALSE;
  v_code_changed BOOLEAN := FALSE;
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
      'applied', FALSE, 'firstPass', FALSE, 'xpAwarded', FALSE, 'codeChanged', FALSE,
      'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
      'nextReviewAt', v_row.next_review_at
    );
  END IF;

  IF p_outcome = 'passed' THEN
    v_first_pass := v_row.passes = 0;
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

    IF v_first_pass AND p_xp > 0 THEN
      v_xp_awarded := public.record_verified_activity_xp(
        p_user_id, 'coding:' || p_task_id, p_subject, p_xp
      );
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

  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
    VALUES (p_roadmap_attempt_id, p_task_id, p_outcome = 'passed', COALESCE(p_verified, FALSE))
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET
      passed = public.roadmap_attempt_coding.passed OR EXCLUDED.passed,
      verified = public.roadmap_attempt_coding.verified OR EXCLUDED.verified,
      updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'applied', TRUE, 'firstPass', v_first_pass, 'xpAwarded', v_xp_awarded,
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

CREATE OR REPLACE FUNCTION public.record_coding_reveal(
  p_user_id TEXT,
  p_task_id TEXT,
  p_track TEXT,
  p_roadmap_attempt_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_task_id !~ '^[a-z0-9-]{3,64}$' OR
     p_track NOT IN ('javascript', 'typescript', 'react', 'system-design', 'algorithms') OR
     (p_roadmap_attempt_id IS NOT NULL AND p_roadmap_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$') THEN
    RAISE EXCEPTION 'invalid_coding_reveal';
  END IF;

  INSERT INTO public.coding_progress (user_id, task_id, track, status, reveal_count)
  VALUES (p_user_id, p_task_id, p_track, 'revealed', 1)
  ON CONFLICT (user_id, task_id) DO UPDATE SET
    status = CASE WHEN public.coding_progress.status = 'passed' THEN 'passed' ELSE 'revealed' END,
    reveal_count = public.coding_progress.reveal_count + 1,
    updated_at = NOW();

  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, revealed)
    VALUES (p_roadmap_attempt_id, p_task_id, TRUE)
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET revealed = TRUE, updated_at = NOW();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_coding_reveal(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_reveal(TEXT, TEXT, TEXT, TEXT) TO service_role;
