-- Migration 025: coding challenges and the GitHub garden.
-- Apply after migrations 001-024. Safe to re-run.
--
-- devShark's Coding section and the coding tasks inside Learn levels store
-- their progress here:
--   * coding_progress: one row per (user, task) with pass state, the spaced
--     review ladder (4 h → 24 h → 48 h, retired after two clean passes in
--     separate sittings) and reveal counts.
--   * coding_attempts: the append-only verdict log, keyed by the attempt id the
--     API issues inside a sealed coding session, so a replayed submit is a no-op.
--   * coding_drafts: the learner's last saved code per task, size-capped.
--   * roadmap_attempt_coding: per Learn attempt, which of its coding tasks passed.
--     complete_verified_roadmap_attempt now refuses to pass a level until every
--     task the sealed session named has a passed row here.
--   * github_connections / github_commits: the opt-in GitHub garden. Only the
--     GitHub App installation id and account identity are stored; the app's
--     private key lives in the server environment and no user token is kept.
--
-- XP for a first pass goes through the existing record_verified_activity_xp
-- ledger with the award id 'coding:<task id>', once per user and task. Nothing
-- here changes access, ranks, or leaderboards; the garden is cosmetic.

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_progress (
  user_id           TEXT NOT NULL,
  task_id           TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  track             TEXT NOT NULL CHECK (track IN ('javascript', 'typescript', 'react', 'system-design')),
  status            TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'passed', 'revealed')),
  verified          BOOLEAN NOT NULL DEFAULT FALSE,
  passes            INTEGER NOT NULL DEFAULT 0 CHECK (passes >= 0),
  clean_passes      INTEGER NOT NULL DEFAULT 0 CHECK (clean_passes >= 0),
  last_pass_sitting DATE,
  review_stage      INTEGER NOT NULL DEFAULT 0 CHECK (review_stage BETWEEN 0 AND 3),
  next_review_at    TIMESTAMPTZ,
  reveal_count      INTEGER NOT NULL DEFAULT 0 CHECK (reveal_count >= 0),
  best_passed_at    TIMESTAMPTZ,
  last_code_hash    TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS coding_progress_review_idx
  ON public.coding_progress (user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.coding_attempts (
  attempt_id   TEXT PRIMARY KEY CHECK (attempt_id ~ '^[A-Za-z0-9:_-]{8,128}$'),
  user_id      TEXT NOT NULL,
  task_id      TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  track        TEXT NOT NULL CHECK (track IN ('javascript', 'typescript', 'react', 'system-design')),
  outcome      TEXT NOT NULL CHECK (outcome IN ('passed', 'failed', 'error', 'timeout', 'revealed')),
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms  INTEGER CHECK (duration_ms IS NULL OR (duration_ms >= 0 AND duration_ms <= 86400000)),
  run_count    INTEGER CHECK (run_count IS NULL OR (run_count >= 0 AND run_count <= 10000)),
  hints_used   INTEGER CHECK (hints_used IS NULL OR (hints_used >= 0 AND hints_used <= 20)),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS coding_attempts_user_created_idx
  ON public.coding_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.coding_drafts (
  user_id    TEXT NOT NULL,
  task_id    TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  code       TEXT NOT NULL CHECK (octet_length(code) <= 20480),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.roadmap_attempt_coding (
  attempt_id TEXT NOT NULL REFERENCES public.roadmap_attempts(attempt_id) ON DELETE CASCADE,
  task_id    TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  passed     BOOLEAN NOT NULL DEFAULT FALSE,
  verified   BOOLEAN NOT NULL DEFAULT FALSE,
  revealed   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (attempt_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.github_connections (
  user_id          TEXT PRIMARY KEY,
  installation_id  BIGINT NOT NULL CHECK (installation_id > 0),
  account_login    TEXT NOT NULL CHECK (account_login ~ '^[A-Za-z0-9-]{1,39}$'),
  account_id       BIGINT NOT NULL CHECK (account_id > 0),
  repo_full_name   TEXT CHECK (repo_full_name IS NULL OR repo_full_name ~ '^[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$'),
  default_branch   TEXT CHECK (default_branch IS NULL OR char_length(default_branch) <= 255),
  status           TEXT NOT NULL DEFAULT 'pending_repo' CHECK (status IN ('pending_repo', 'active', 'broken')),
  last_error       TEXT CHECK (last_error IS NULL OR char_length(last_error) <= 500),
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_commit_at   TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.github_commits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  task_id     TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  path        TEXT NOT NULL CHECK (char_length(path) <= 255),
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'committed', 'failed', 'skipped')),
  commit_sha  TEXT CHECK (commit_sha IS NULL OR commit_sha ~ '^[0-9a-f]{7,64}$'),
  attempts    INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error  TEXT CHECK (last_error IS NULL OR char_length(last_error) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS github_commits_user_status_idx
  ON public.github_commits (user_id, status, created_at);

-- ---------------------------------------------------------------------------
-- 2. Row-level security: learners read their own rows, the service role writes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.coding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_attempt_coding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coding_progress, public.coding_attempts, public.coding_drafts,
  public.roadmap_attempt_coding, public.github_connections, public.github_commits
  FROM anon, authenticated;

DROP POLICY IF EXISTS "coding_progress_select_own" ON public.coding_progress;
CREATE POLICY "coding_progress_select_own"
  ON public.coding_progress FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "coding_attempts_select_own" ON public.coding_attempts;
CREATE POLICY "coding_attempts_select_own"
  ON public.coding_attempts FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "coding_drafts_select_own" ON public.coding_drafts;
CREATE POLICY "coding_drafts_select_own"
  ON public.coding_drafts FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "github_connections_select_own" ON public.github_connections;
CREATE POLICY "github_connections_select_own"
  ON public.github_connections FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "github_commits_select_own" ON public.github_commits;
CREATE POLICY "github_commits_select_own"
  ON public.github_commits FOR SELECT
  USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 3. Verdicts, reveals, drafts.
-- ---------------------------------------------------------------------------
-- Records one graded attempt and folds it into the learner's progress and the
-- spaced review ladder. Idempotent per attempt id: a replayed submit returns
-- the current state and awards nothing. XP is awarded once per user and task,
-- on the first pass, through the verified-activity ledger.
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
     p_track NOT IN ('javascript', 'typescript', 'react', 'system-design') OR
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

-- A reveal marks the task; a task passed earlier keeps its pass.
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
     p_track NOT IN ('javascript', 'typescript', 'react', 'system-design') OR
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

CREATE OR REPLACE FUNCTION public.save_coding_draft(
  p_user_id TEXT,
  p_task_id TEXT,
  p_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_task_id !~ '^[a-z0-9-]{3,64}$' OR p_code IS NULL OR octet_length(p_code) > 20480 THEN
    RAISE EXCEPTION 'invalid_coding_draft';
  END IF;
  INSERT INTO public.coding_drafts (user_id, task_id, code)
  VALUES (p_user_id, p_task_id, p_code)
  ON CONFLICT (user_id, task_id) DO UPDATE SET code = EXCLUDED.code, updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.save_coding_draft(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_coding_draft(TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Learn levels gate on their coding tasks.
-- ---------------------------------------------------------------------------
-- Replaces the migration 024 body. Identical except for the coding gate marked
-- below and the new optional argument. The two-argument overload is dropped so
-- named-parameter calls resolve to one function.
DROP FUNCTION IF EXISTS public.complete_verified_roadmap_attempt(TEXT, TEXT);
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

  -- Coding gate (migration 025): a level that carries coding tasks passes only
  -- when every task the sealed session named has a passed verdict recorded for
  -- this attempt. The question score still decides the percentage shown.
  IF v_passed AND p_coding_task_ids IS NOT NULL AND jsonb_typeof(p_coding_task_ids) = 'array'
     AND jsonb_array_length(p_coding_task_ids) > 0 THEN
    IF jsonb_array_length(p_coding_task_ids) > 5 THEN
      RAISE EXCEPTION 'invalid_roadmap_attempt';
    END IF;
    SELECT COUNT(*) INTO v_coding_passed
      FROM jsonb_array_elements_text(p_coding_task_ids) AS wanted(task_id)
      JOIN public.roadmap_attempt_coding rac
        ON rac.attempt_id = p_attempt_id AND rac.task_id = wanted.task_id AND rac.passed
     WHERE wanted.task_id ~ '^[a-z0-9-]{3,64}$';
    IF v_coding_passed < jsonb_array_length(p_coding_task_ids) THEN
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
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Keep account erasure and retention complete.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.matches WHERE host_id = p_user_id;
  DELETE FROM public.match_answers WHERE user_id = p_user_id;
  DELETE FROM public.match_participants WHERE user_id = p_user_id;
  DELETE FROM public.daily_attempts WHERE user_id = p_user_id;
  DELETE FROM public.flashcards WHERE user_id = p_user_id;
  DELETE FROM public.user_category_stats WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_progress WHERE user_id = p_user_id;
  DELETE FROM public.user_streak WHERE user_id = p_user_id;
  DELETE FROM public.user_streak_config WHERE user_id = p_user_id;
  DELETE FROM public.user_streak_freezes WHERE user_id = p_user_id;
  DELETE FROM public.user_xp WHERE user_id = p_user_id;
  DELETE FROM public.user_badges WHERE user_id = p_user_id;
  DELETE FROM public.user_cards WHERE user_id = p_user_id;
  DELETE FROM public.daily_queue_completions WHERE user_id = p_user_id;
  DELETE FROM public.challenge_scores WHERE user_id = p_user_id;
  DELETE FROM public.auth_events WHERE user_id = p_user_id;
  DELETE FROM public.question_reports WHERE reporter_sub = p_user_id;
  DELETE FROM public.user_question_history WHERE user_id = p_user_id;
  DELETE FROM public.github_commits WHERE user_id = p_user_id;
  DELETE FROM public.github_connections WHERE user_id = p_user_id;
  DELETE FROM public.coding_drafts WHERE user_id = p_user_id;
  DELETE FROM public.coding_attempts WHERE user_id = p_user_id;
  DELETE FROM public.coding_progress WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_attempts WHERE user_id = p_user_id;
  DELETE FROM public.verified_skill_checks WHERE user_id = p_user_id;
  DELETE FROM public.verified_activity_awards WHERE user_id = p_user_id;
  DELETE FROM public.quiz_submissions WHERE user_id = p_user_id;
  DELETE FROM public.quiz_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

-- Retention: coding attempts and garden commit logs are kept 90 days longer
-- than the roadmap attempts (180 days at the default), drafts go after 90
-- idle days. Same owner-scheduled primitive as migration 023.
CREATE OR REPLACE FUNCTION public.purge_expired_learning_data(
  p_before TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_roadmap INTEGER;
  v_submissions INTEGER;
  v_coding INTEGER;
  v_drafts INTEGER;
  v_commits INTEGER;
BEGIN
  DELETE FROM public.roadmap_attempts
   WHERE expires_at < p_before;
  GET DIAGNOSTICS v_roadmap = ROW_COUNT;
  DELETE FROM public.quiz_submissions
   WHERE created_at < p_before;
  GET DIAGNOSTICS v_submissions = ROW_COUNT;
  DELETE FROM public.coding_attempts
   WHERE created_at < p_before - INTERVAL '90 days';
  GET DIAGNOSTICS v_coding = ROW_COUNT;
  DELETE FROM public.coding_drafts
   WHERE updated_at < p_before;
  GET DIAGNOSTICS v_drafts = ROW_COUNT;
  DELETE FROM public.github_commits
   WHERE created_at < p_before - INTERVAL '90 days' AND status IN ('committed', 'skipped', 'failed');
  GET DIAGNOSTICS v_commits = ROW_COUNT;
  RETURN jsonb_build_object(
    'roadmapAttempts', v_roadmap, 'quizSubmissions', v_submissions,
    'codingAttempts', v_coding, 'codingDrafts', v_drafts, 'githubCommits', v_commits
  );
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ) TO service_role;

-- Rollback: the six tables are additive. Application code rolled back to
-- pre-025 never calls the coding RPCs; restore the migration 024
-- complete_verified_roadmap_attempt(TEXT, TEXT), delete_user_data and the
-- migration 023 purge_expired_learning_data bodies, then drop the tables.
