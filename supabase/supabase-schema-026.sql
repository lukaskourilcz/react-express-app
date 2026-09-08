-- Migration 026: the versioned learner profile and the progression policy it
-- feeds. Apply after migrations 001-025. Safe to re-run.
--
-- devShark personalises what a learner sees from one small record:
--   * learner_profiles: the accepted profile (base track, optional FDE
--     specialisation, optional DSA enrolment, goals, experience, sitting
--     length) plus the answers of a registration that was interrupted.
--   * coding_puzzle_results: code-ordering (Parsons) evidence, kept apart from
--     coding_progress so arranging code is never counted as writing it.
--
-- The profile is data, never an entitlement. Eligibility is derived in
-- shared/progression.ts from this row *and* the verified completions already
-- stored in roadmap_progress; nothing here unlocks a level, and experience is
-- advisory. Learning stays free.

-- ---------------------------------------------------------------------------
-- 1. The learner profile table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_profiles (
  user_id    TEXT PRIMARY KEY,
  version    INTEGER NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 1000),
  -- The accepted profile, or NULL while required answers are still missing.
  profile    JSONB,
  -- Partial answers kept so an interrupted registration resumes in place.
  draft      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learner_profiles_profile_object
    CHECK (profile IS NULL OR jsonb_typeof(profile) = 'object'),
  CONSTRAINT learner_profiles_draft_object
    CHECK (jsonb_typeof(draft) = 'object')
);

CREATE INDEX IF NOT EXISTS learner_profiles_updated_idx
  ON public.learner_profiles (updated_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Row-level security: a learner reads their own row, the service role writes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learner_profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "learner_profiles_select_own" ON public.learner_profiles;
CREATE POLICY "learner_profiles_select_own"
  ON public.learner_profiles FOR SELECT
  USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 3. Code-ordering puzzle results (issue #154).
-- ---------------------------------------------------------------------------
-- Arranging authored blocks into working code is recognition evidence. It is
-- recorded here and NOT in coding_progress, because it is not the same claim as
-- writing the implementation: the Coding section still shows such a task as
-- unwritten. A passed puzzle does satisfy a Learn level's coding requirement so
-- a learner on a phone is never stuck, and it awards no task XP.
CREATE TABLE IF NOT EXISTS public.coding_puzzle_results (
  attempt_id     TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  task_id        TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  track          TEXT NOT NULL CHECK (track IN ('javascript', 'typescript', 'react', 'system-design')),
  puzzle_version INTEGER NOT NULL CHECK (puzzle_version BETWEEN 1 AND 1000),
  passed         BOOLEAN NOT NULL DEFAULT FALSE,
  competencies   TEXT[] NOT NULL DEFAULT '{}',
  duration_ms    INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coding_puzzle_results_user_task_idx
  ON public.coding_puzzle_results (user_id, task_id, created_at DESC);

ALTER TABLE public.coding_puzzle_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coding_puzzle_results FROM anon, authenticated;
DROP POLICY IF EXISTS "coding_puzzle_results_select_own" ON public.coding_puzzle_results;
CREATE POLICY "coding_puzzle_results_select_own"
  ON public.coding_puzzle_results FOR SELECT
  USING (user_id = auth.uid()::text);

-- Idempotent per sealed attempt id: a replayed submit returns the first result.
CREATE OR REPLACE FUNCTION public.record_coding_puzzle_result(
  p_user_id            TEXT,
  p_attempt_id         TEXT,
  p_task_id            TEXT,
  p_track              TEXT,
  p_puzzle_version     INTEGER,
  p_passed             BOOLEAN,
  p_competencies       TEXT[],
  p_roadmap_attempt_id TEXT DEFAULT NULL,
  p_duration_ms        INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows INTEGER := 0;
  v_inserted BOOLEAN := FALSE;
  v_satisfies BOOLEAN := FALSE;
BEGIN
  INSERT INTO public.coding_puzzle_results (
    attempt_id, user_id, task_id, track, puzzle_version, passed, competencies, duration_ms
  )
  VALUES (
    p_attempt_id, p_user_id, p_task_id, p_track, p_puzzle_version,
    COALESCE(p_passed, FALSE), COALESCE(p_competencies, '{}'), p_duration_ms
  )
  -- One row per sealed attempt, and the sealed attempt is the whole coding
  -- session: the same id comes back for every arrangement the learner checks
  -- for up to three hours. A replay changes nothing, but the pass that follows
  -- an earlier failure is the result worth keeping, so it replaces it. A pass
  -- is never downgraded by a later failure.
  ON CONFLICT (attempt_id) DO UPDATE SET
    passed       = TRUE,
    competencies = EXCLUDED.competencies,
    duration_ms  = EXCLUDED.duration_ms,
    created_at   = NOW()
  WHERE public.coding_puzzle_results.user_id = EXCLUDED.user_id
    AND public.coding_puzzle_results.passed = FALSE
    AND EXCLUDED.passed;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_rows > 0;

  -- A passed puzzle clears the level's coding requirement so a phone is not a
  -- dead end. `verified` stays FALSE: the level knows this was not written code.
  IF COALESCE(p_passed, FALSE) AND p_roadmap_attempt_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.roadmap_attempts
       WHERE attempt_id = p_roadmap_attempt_id AND user_id = p_user_id
    ) THEN
      INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
      VALUES (p_roadmap_attempt_id, p_task_id, TRUE, FALSE)
      ON CONFLICT (attempt_id, task_id) DO UPDATE SET
        passed = TRUE,
        updated_at = NOW();
      v_satisfies := TRUE;
    END IF;
  END IF;

  RETURN jsonb_build_object('applied', v_inserted, 'satisfiesLevel', v_satisfies);
END;
$$;
REVOKE ALL ON FUNCTION public.record_coding_puzzle_result(
  TEXT, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT[], TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_puzzle_result(
  TEXT, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, TEXT[], TEXT, INTEGER
) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Account erasure covers the new rows.
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
  DELETE FROM public.coding_puzzle_results WHERE user_id = p_user_id;
  DELETE FROM public.learner_profiles WHERE user_id = p_user_id;
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
