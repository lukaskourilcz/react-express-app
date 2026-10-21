-- Migration 062: keep linked Learn coding attempts bound and open while pending.
-- Apply before the new-tab links. Existing rows keep NULL bindings; every new
-- coding-bearing lesson stores the sealed list before it serves its intro.
BEGIN;
ALTER TABLE public.roadmap_attempts ADD COLUMN IF NOT EXISTS coding_task_ids JSONB
  CHECK (coding_task_ids IS NULL OR (jsonb_typeof(coding_task_ids) = 'array' AND jsonb_array_length(coding_task_ids) BETWEEN 1 AND 5));

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
  v_verified BOOLEAN := COALESCE(p_verified, FALSE);
  v_first_pass BOOLEAN := FALSE;
  v_first_verified BOOLEAN := FALSE;
  v_paid_before BOOLEAN := FALSE;
  v_revealed_before BOOLEAN := FALSE;
  v_reset_open BOOLEAN := FALSE;
  v_reset_revealed BOOLEAN := FALSE;
  v_settled_at TIMESTAMPTZ;
  v_settles BOOLEAN := FALSE;
  v_xp_awarded BOOLEAN := FALSE;
  v_xp_forfeited BOOLEAN := FALSE;
  v_xp_kind TEXT;
  v_withheld TEXT;
  v_repeat JSONB;
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

  IF p_roadmap_attempt_id IS NOT NULL THEN
    PERFORM 1 FROM public.roadmap_attempts a
     WHERE a.attempt_id = p_roadmap_attempt_id AND a.user_id = p_user_id
       AND a.completed_at IS NULL AND a.expires_at > NOW()
       AND (a.coding_task_ids IS NULL OR a.coding_task_ids ? p_task_id)
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_roadmap_attempt'; END IF;
  END IF;

  INSERT INTO public.coding_attempts (
    attempt_id, user_id, task_id, track, outcome, verified, duration_ms, run_count, hints_used
  ) VALUES (
    p_attempt_id, p_user_id, p_task_id, p_track, p_outcome, v_verified,
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
      'applied', FALSE, 'firstPass', FALSE, 'xpAwarded', FALSE, 'xpForfeited', FALSE,
      'xpKind', NULL, 'repeatXp', NULL, 'codeChanged', FALSE,
      'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
      'nextReviewAt', v_row.next_review_at
    );
  END IF;

  -- Moved up in 052: the attempt row's lock comes before user_stats's.
  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
    VALUES (p_roadmap_attempt_id, p_task_id, p_outcome = 'passed', v_verified)
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET
      passed = public.roadmap_attempt_coding.passed OR EXCLUDED.passed,
      verified = public.roadmap_attempt_coding.verified OR EXCLUDED.verified,
      updated_at = NOW();
  END IF;

  IF p_outcome = 'passed' THEN
    -- 058: the first verified pass is a first pass too, after an unverified
    -- one. v_row is locked, so a concurrent Submit of this task reads the
    -- row this one writes.
    v_first_verified := v_verified AND NOT v_row.verified;
    v_first_pass := v_row.passes = 0 OR v_first_verified;
    -- Read before the update below. The API records a reveal with
    -- record_coding_reveal only before a pass, so one on record came first.
    v_revealed_before := v_row.reveal_count > 0 OR v_row.status = 'revealed';
    v_code_changed := p_code_hash IS NOT NULL AND v_row.last_code_hash IS DISTINCT FROM p_code_hash;
    -- 058: the repeat XP's state before this pass.
    v_reset_open := v_row.reset_at IS NOT NULL;
    v_reset_revealed := v_row.reset_revealed;
    v_settled_at := COALESCE(v_row.last_xp_at, v_row.best_passed_at);

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

    -- 058: a verified pass closes the open reset, whether it pays or not.
    UPDATE public.coding_progress
       SET status = 'passed',
           verified = verified OR v_verified,
           passes = passes + 1,
           clean_passes = v_clean,
           last_pass_sitting = v_today,
           review_stage = v_stage,
           next_review_at = v_next,
           best_passed_at = COALESCE(best_passed_at, NOW()),
           last_code_hash = COALESCE(p_code_hash, last_code_hash),
           reset_at = CASE WHEN v_verified THEN NULL ELSE reset_at END,
           reset_revealed = CASE WHEN v_verified THEN FALSE ELSE reset_revealed END,
           updated_at = NOW()
     WHERE user_id = p_user_id AND task_id = p_task_id
     RETURNING * INTO v_row;

    -- Any verified pass is a day of learning (048). An unverified
    -- (self-reported checklist) pass is not.
    IF v_verified THEN
      PERFORM public.advance_verified_streak(p_user_id);
    END IF;

    IF v_verified AND p_xp > 0 THEN
      v_award_id := 'coding:' || public.token_account_key(p_user_id) || ':' || p_task_id;
      -- 058: an account already holding the task's award under the current
      -- id or the id of 025-038 was paid for an earlier pass.
      IF v_first_verified THEN
        v_paid_before := EXISTS (
          SELECT 1 FROM public.verified_activity_awards
           WHERE award_id IN (v_award_id, 'coding:' || p_task_id) AND user_id = p_user_id
        );
      END IF;
      IF v_first_verified AND NOT v_paid_before THEN
        -- The first verified pass pays, unless a reveal came first (048).
        v_settles := TRUE;
        IF v_revealed_before THEN
          v_xp_forfeited := TRUE;
        ELSE
          v_xp_awarded := public.record_verified_activity_xp(p_user_id, v_award_id, p_subject, p_xp);
          IF v_xp_awarded THEN v_xp_kind := 'first'; END IF;
        END IF;
      -- 058: the repeat XP needs a reset since the last award, an hour since
      -- the task last paid or forfeited its XP, and no reveal since the reset.
      ELSIF NOT v_reset_open THEN
        v_withheld := 'reset';
      ELSIF v_settled_at IS NOT NULL AND NOW() < v_settled_at + INTERVAL '60 minutes' THEN
        v_withheld := 'cooldown';
      ELSIF v_reset_revealed THEN
        v_settles := TRUE;
        v_xp_forfeited := TRUE;
      ELSE
        v_settles := TRUE;
        v_xp_awarded := public.record_verified_activity_xp(
          p_user_id, v_award_id || ':r' || (v_row.xp_repeats + 1), p_subject, p_xp
        );
        IF v_xp_awarded THEN v_xp_kind := 'repeat'; END IF;
      END IF;

      IF v_settles THEN
        UPDATE public.coding_progress
           SET last_xp_at = NOW(),
               xp_repeats = xp_repeats + CASE WHEN v_xp_kind = 'repeat' THEN 1 ELSE 0 END
         WHERE user_id = p_user_id AND task_id = p_task_id
         RETURNING * INTO v_row;
      END IF;
      v_repeat := jsonb_build_object(
        'availableAt', COALESCE(v_row.last_xp_at, v_row.best_passed_at) + INTERVAL '60 minutes',
        'needsReset', v_row.reset_at IS NULL,
        'withheld', v_withheld
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

  RETURN jsonb_build_object(
    'applied', TRUE, 'firstPass', v_first_pass, 'xpAwarded', v_xp_awarded,
    'xpForfeited', v_xp_forfeited, 'xpKind', v_xp_kind, 'repeatXp', v_repeat,
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

  IF p_roadmap_attempt_id IS NOT NULL THEN
    PERFORM 1 FROM public.roadmap_attempts a
     WHERE a.attempt_id = p_roadmap_attempt_id AND a.user_id = p_user_id
       AND a.completed_at IS NULL AND a.expires_at > NOW()
       AND (a.coding_task_ids IS NULL OR a.coding_task_ids ? p_task_id)
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_roadmap_attempt'; END IF;
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

CREATE OR REPLACE FUNCTION public.complete_verified_roadmap_attempt(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_coding_task_ids JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.roadmap_attempts%ROWTYPE;
  v_answer_count INTEGER;
  v_correct INTEGER;
  v_pct INTEGER;
  v_passed BOOLEAN;
  v_data JSONB;
  v_kind_key TEXT;
  v_existing JSONB;
  v_best INTEGER;
  v_was_passed BOOLEAN;
  v_level INTEGER;
  v_day_key TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_pass_days JSONB;
  v_distinct INTEGER;
  v_mastered BOOLEAN;
  v_mastered_at TEXT;
  v_entry JSONB;
  v_coding_passed INTEGER := 0;
BEGIN
  SELECT * INTO v_attempt
    FROM public.roadmap_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id IS DISTINCT FROM p_user_id OR
     v_attempt.expires_at < NOW() THEN
    RAISE EXCEPTION 'invalid_roadmap_attempt';
  END IF;
  IF v_attempt.completed_at IS NOT NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
    INTO v_answer_count, v_correct
    FROM public.roadmap_attempt_answers
   WHERE attempt_id = p_attempt_id;
  IF v_answer_count IS DISTINCT FROM v_attempt.total_questions THEN
    RAISE EXCEPTION 'incomplete_roadmap_attempt';
  END IF;

  INSERT INTO public.roadmap_progress (user_id, data)
  VALUES (p_user_id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT COALESCE(data, '{}'::jsonb) INTO v_data
    FROM public.roadmap_progress
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_attempt.required_level_start IS NOT NULL THEN
    FOR v_level IN v_attempt.required_level_start..v_attempt.required_level_end LOOP
      IF COALESCE((v_data #>> ARRAY[v_attempt.topic, 'levels', v_level::TEXT, 'passed'])::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'roadmap_prerequisite_not_met';
      END IF;
    END LOOP;
  END IF;

  v_pct := ROUND(100.0 * v_correct / v_attempt.total_questions)::INTEGER;
  v_passed := v_pct >= v_attempt.pass_pct;

  IF v_attempt.coding_task_ids IS NOT NULL AND p_coding_task_ids IS DISTINCT FROM v_attempt.coding_task_ids THEN
    RAISE EXCEPTION 'invalid_roadmap_attempt';
  END IF;

  -- Coding gate (migration 025): a level that carries coding tasks passes only
  -- when every task the sealed session named has a passed verdict recorded for
  -- this attempt. The question score still decides the percentage shown.
  -- Migration 047: a task whose solution was revealed in this attempt no longer
  -- counts, as docs/product-architecture.md has always said ("a reveal ends the
  -- current Learn level attempt"); the learner passes it in a fresh attempt.
  IF v_passed AND p_coding_task_ids IS NOT NULL AND jsonb_typeof(p_coding_task_ids) = 'array'
     AND jsonb_array_length(p_coding_task_ids) > 0 THEN
    IF jsonb_array_length(p_coding_task_ids) > 5 THEN
      RAISE EXCEPTION 'invalid_roadmap_attempt';
    END IF;
    SELECT COUNT(*) INTO v_coding_passed
      FROM jsonb_array_elements_text(p_coding_task_ids) AS wanted(task_id)
      JOIN public.roadmap_attempt_coding rac
        ON rac.attempt_id = p_attempt_id AND rac.task_id = wanted.task_id
       AND rac.passed AND rac.verified AND NOT rac.revealed
     WHERE wanted.task_id ~ '^[a-z0-9-]{3,64}$';
    IF v_coding_passed < jsonb_array_length(p_coding_task_ids) THEN
      -- Still waiting for another tab. A reveal ends the attempt; a missing
      -- unrevealed pass keeps it open and writes no progress, XP or streak.
      IF NOT EXISTS (
        SELECT 1 FROM public.roadmap_attempt_coding rac
         WHERE rac.attempt_id = p_attempt_id AND rac.revealed
           AND p_coding_task_ids ? rac.task_id
      ) THEN RETURN FALSE; END IF;
      v_passed := FALSE;
    END IF;
  END IF;
  UPDATE public.roadmap_attempts
     SET completed_at = NOW(), score_pct = v_pct, passed = v_passed
   WHERE attempt_id = p_attempt_id;

  IF NOT (v_data ? v_attempt.topic) THEN
    v_data := jsonb_set(v_data, ARRAY[v_attempt.topic], '{"levels":{},"checkpoints":{}}'::jsonb, TRUE);
  END IF;
  v_kind_key := CASE WHEN v_attempt.kind = 'level' THEN 'levels' ELSE 'checkpoints' END;
  IF jsonb_typeof(v_data #> ARRAY[v_attempt.topic, v_kind_key]) IS DISTINCT FROM 'object' THEN
    v_data := jsonb_set(v_data, ARRAY[v_attempt.topic, v_kind_key], '{}'::jsonb, TRUE);
  END IF;
  v_existing := v_data #> ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT];
  v_best := GREATEST(COALESCE((v_existing->>'bestPct')::INTEGER, 0), v_pct);
  v_was_passed := COALESCE((v_existing->>'passed')::BOOLEAN, FALSE);

  v_entry := jsonb_build_object('passed', v_was_passed OR v_passed, 'bestPct', v_best);

  -- Mastery tracking applies only to Learn levels. Record one distinct UTC day
  -- per passing attempt; three distinct days mark the level mastered.
  IF v_attempt.kind = 'level' THEN
    v_pass_days := COALESCE(v_existing->'passDays', '[]'::jsonb);
    IF jsonb_typeof(v_pass_days) IS DISTINCT FROM 'array' THEN
      v_pass_days := '[]'::jsonb;
    END IF;
    IF v_passed AND NOT (v_pass_days @> to_jsonb(v_day_key)) THEN
      IF jsonb_array_length(v_pass_days) < 12 THEN
        v_pass_days := v_pass_days || to_jsonb(v_day_key);
      END IF;
    END IF;
    v_distinct := jsonb_array_length(v_pass_days);
    v_mastered := COALESCE((v_existing->>'mastered')::BOOLEAN, FALSE) OR v_distinct >= 3;
    v_mastered_at := v_existing->>'masteredAt';
    IF v_mastered AND v_mastered_at IS NULL THEN
      v_mastered_at := v_day_key;
    END IF;
    v_entry := v_entry
      || jsonb_build_object('passDays', v_pass_days, 'mastered', v_mastered);
    IF v_passed THEN
      v_entry := v_entry || jsonb_build_object('lastPassDay', v_day_key);
    ELSIF v_existing ? 'lastPassDay' THEN
      v_entry := v_entry || jsonb_build_object('lastPassDay', v_existing->>'lastPassDay');
    END IF;
    IF v_mastered_at IS NOT NULL THEN
      v_entry := v_entry || jsonb_build_object('masteredAt', v_mastered_at);
    END IF;
  END IF;

  v_data := jsonb_set(
    v_data,
    ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT],
    v_entry,
    TRUE
  );
  UPDATE public.roadmap_progress SET data = v_data, updated_at = NOW()
   WHERE user_id = p_user_id;

  INSERT INTO public.user_streak (user_id, days)
  VALUES (p_user_id, jsonb_build_object(v_day_key, 1))
  ON CONFLICT (user_id) DO UPDATE SET
    days = jsonb_set(
      COALESCE(public.user_streak.days, '{}'::jsonb), ARRAY[v_day_key],
      to_jsonb(LEAST(50, COALESCE((public.user_streak.days ->> v_day_key)::INTEGER, 0) + 1)), TRUE
    ),
    updated_at = NOW();

  -- 048: a finished level or part test is a day of learning.
  IF p_user_id IS NOT NULL THEN
    PERFORM public.advance_verified_streak(p_user_id);
  END IF;

  -- New in 056: a first pass earns the step's learning XP, and the month's
  -- ledger counts it.
  IF p_user_id IS NOT NULL AND v_passed AND NOT v_was_passed THEN
    PERFORM public.add_xp_day(p_user_id, v_attempt.subject, public.learn_step_xp(v_attempt.kind, v_attempt.ref));
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  TO service_role;

COMMIT;
