-- Migration 023: one-time grading, deployment-scoped rooms, and launch integrity.
-- Apply after migrations 001-022. Safe to re-run.

-- A submitted quiz answer set may be graded once. Exact network retries replay
-- the same result; changing an answer after feedback has revealed the key is
-- rejected. Challenge batches claim one key per question so their streaming
-- one-question-at-a-time flow remains supported.
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  grade_key TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  user_id TEXT,
  subject TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  answer_hash TEXT NOT NULL CHECK (answer_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (grade_key ~ '^[A-Za-z0-9:_-]{16,160}$'),
  CHECK (attempt_id ~ '^[A-Za-z0-9_-]{16,64}$')
);

CREATE INDEX IF NOT EXISTS quiz_submissions_created_idx
  ON public.quiz_submissions (created_at);
CREATE INDEX IF NOT EXISTS quiz_submissions_user_created_idx
  ON public.quiz_submissions (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_submissions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_quiz_submission(
  p_grade_key TEXT,
  p_attempt_id TEXT,
  p_user_id TEXT,
  p_subject TEXT,
  p_answer_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted INTEGER;
  v_existing public.quiz_submissions%ROWTYPE;
BEGIN
  IF p_grade_key !~ '^[A-Za-z0-9:_-]{16,160}$' OR
     p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_answer_hash !~ '^[a-f0-9]{64}$' OR
     (p_user_id IS NOT NULL AND (char_length(p_user_id) < 8 OR char_length(p_user_id) > 128)) THEN
    RAISE EXCEPTION 'invalid_quiz_submission';
  END IF;

  INSERT INTO public.quiz_submissions (grade_key, attempt_id, user_id, subject, answer_hash)
  VALUES (p_grade_key, p_attempt_id, p_user_id, p_subject, p_answer_hash)
  ON CONFLICT (grade_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN RETURN 'claimed'; END IF;

  SELECT * INTO v_existing
    FROM public.quiz_submissions
   WHERE grade_key = p_grade_key;

  IF v_existing.attempt_id = p_attempt_id AND
     v_existing.user_id IS NOT DISTINCT FROM p_user_id AND
     v_existing.subject = p_subject AND
     v_existing.answer_hash = p_answer_hash THEN
    RETURN 'replay';
  END IF;
  RETURN 'conflict';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_quiz_submission(TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quiz_submission(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- Rooms are owned by one product subject. Codes remain globally unique, but
-- every API lookup also filters by the deployment's allowed subject set.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'webdev';
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_subject_valid;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_subject_valid CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  );
CREATE INDEX IF NOT EXISTS matches_subject_code_idx ON public.matches (subject, code);
CREATE INDEX IF NOT EXISTS match_answers_question_idx
  ON public.match_answers (match_id, question_idx);

-- Flashcards follow the active product instead of leaking between deployments.
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'webdev';
ALTER TABLE public.flashcards
  DROP CONSTRAINT IF EXISTS flashcards_subject_valid;
ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_subject_valid CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  );
CREATE INDEX IF NOT EXISTS flashcards_user_subject_created_idx
  ON public.flashcards (user_id, subject, created_at DESC);

-- These RPCs and tables are reached only through typed, scoped API handlers.
-- In particular, match_question_distribution contains correctness flags and
-- must never be directly callable with the public browser key.
REVOKE ALL ON FUNCTION public.match_question_distribution(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_question_distribution(UUID, INTEGER)
  TO service_role;
REVOKE ALL ON FUNCTION public.match_scoreboard(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_scoreboard(UUID)
  TO service_role;

DROP POLICY IF EXISTS "challenge_scores_read" ON public.challenge_scores;
REVOKE ALL ON public.challenge_scores FROM anon, authenticated;

-- Public rankings never infer a public identity from the private email local
-- part. A learner may explicitly set a profile display name; otherwise a
-- neutral label is used.
CREATE OR REPLACE FUNCTION public.subject_leaderboard(
  p_categories TEXT[],
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  display_name TEXT,
  picture TEXT,
  total_correct INTEGER,
  total_questions INTEGER,
  accuracy_pct INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(NULLIF(BTRIM(u.name), ''), 'Learner') AS display_name,
         u.picture,
         SUM(c.total_correct)::INT,
         SUM(c.total_questions)::INT,
         CASE WHEN SUM(c.total_questions) > 0
              THEN ROUND(100.0 * SUM(c.total_correct) / SUM(c.total_questions))::INT
              ELSE 0 END
    FROM public.user_category_stats c
    LEFT JOIN public.user_stats u ON u.user_id = c.user_id
   WHERE c.category = ANY(p_categories)
   GROUP BY c.user_id, u.name, u.picture
  HAVING SUM(c.total_questions) >= 5
   ORDER BY SUM(c.total_correct) DESC, SUM(c.total_questions) ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

CREATE OR REPLACE FUNCTION public.category_leaderboard(
  p_category TEXT,
  p_limit INTEGER DEFAULT 50,
  p_min_attempts INTEGER DEFAULT 5
)
RETURNS TABLE (
  display_name TEXT,
  picture TEXT,
  total_correct INTEGER,
  total_questions INTEGER,
  accuracy_pct INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(NULLIF(BTRIM(u.name), ''), 'Learner'),
         u.picture,
         c.total_correct,
         c.total_questions,
         CASE WHEN c.total_questions > 0
              THEN ROUND(100.0 * c.total_correct / c.total_questions)::INT
              ELSE 0 END
    FROM public.user_category_stats c
    LEFT JOIN public.user_stats u ON u.user_id = c.user_id
   WHERE c.category = p_category
     AND c.total_questions >= GREATEST(LEAST(p_min_attempts, 100), 1)
   ORDER BY c.total_correct DESC, c.total_questions ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

CREATE OR REPLACE FUNCTION public.daily_leaderboard_v2(
  p_date DATE,
  p_subject TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  display_name TEXT,
  picture TEXT,
  correct INTEGER,
  total INTEGER,
  duration_ms INTEGER,
  attempted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(NULLIF(BTRIM(u.name), ''), 'Learner'),
         u.picture, d.correct, d.total, d.duration_ms, d.created_at
    FROM public.daily_attempts d
    LEFT JOIN public.user_stats u ON u.user_id = d.user_id
   WHERE d.challenge_date = p_date
     AND d.subject = p_subject
     AND p_subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
   ORDER BY d.correct DESC, d.duration_ms ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER) TO service_role;

-- Learn answer recording is one transaction and returns the immutable first
-- result. This replaces API read/upsert/read amplification and keeps retries
-- idempotent under concurrent tabs.
ALTER TABLE public.roadmap_attempts
  ADD COLUMN IF NOT EXISTS required_level_start INTEGER;
ALTER TABLE public.roadmap_attempts
  ADD COLUMN IF NOT EXISTS required_level_end INTEGER;
ALTER TABLE public.roadmap_attempts
  DROP CONSTRAINT IF EXISTS roadmap_attempts_required_range_valid;
ALTER TABLE public.roadmap_attempts
  ADD CONSTRAINT roadmap_attempts_required_range_valid CHECK (
    (required_level_start IS NULL AND required_level_end IS NULL) OR
    (required_level_start BETWEEN 1 AND 100 AND
     required_level_end BETWEEN required_level_start AND 100)
  );

CREATE OR REPLACE FUNCTION public.record_roadmap_answer(
  p_attempt_id TEXT,
  p_user_id TEXT,
  p_question_id TEXT,
  p_selected_index INTEGER,
  p_correct_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.roadmap_attempts%ROWTYPE;
  v_answer public.roadmap_attempt_answers%ROWTYPE;
BEGIN
  IF p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
     p_selected_index NOT BETWEEN 0 AND 25 OR
     p_correct_index NOT BETWEEN 0 AND 25 THEN
    RAISE EXCEPTION 'invalid_roadmap_answer';
  END IF;

  SELECT * INTO v_attempt
    FROM public.roadmap_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id IS DISTINCT FROM p_user_id OR
     v_attempt.expires_at < NOW() OR v_attempt.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_roadmap_attempt';
  END IF;

  INSERT INTO public.roadmap_attempt_answers (
    attempt_id, question_id, selected_index, correct_index, is_correct
  ) VALUES (
    p_attempt_id, p_question_id, p_selected_index, p_correct_index,
    p_selected_index = p_correct_index
  ) ON CONFLICT (attempt_id, question_id) DO NOTHING;

  SELECT * INTO v_answer
    FROM public.roadmap_attempt_answers
   WHERE attempt_id = p_attempt_id AND question_id = p_question_id;

  RETURN jsonb_build_object(
    'selectedIndex', v_answer.selected_index,
    'correctAnswer', v_answer.correct_index,
    'isCorrect', v_answer.is_correct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_roadmap_answer(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_roadmap_answer(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.complete_verified_roadmap_attempt(
  p_user_id TEXT,
  p_attempt_id TEXT
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
  v_data := jsonb_set(
    v_data,
    ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT],
    jsonb_build_object('passed', v_was_passed OR v_passed, 'bestPct', v_best),
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

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT)
  TO service_role;

-- Production daily rewards are valid only for today's UTC challenge. The API
-- also removes the production date override; this trigger is defense in depth.
CREATE OR REPLACE FUNCTION public.enforce_current_daily_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.challenge_date IS DISTINCT FROM (NOW() AT TIME ZONE 'UTC')::DATE THEN
    RAISE EXCEPTION 'invalid_daily_date';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS daily_attempt_current_date ON public.daily_attempts;
CREATE TRIGGER daily_attempt_current_date
  BEFORE INSERT OR UPDATE OF challenge_date ON public.daily_attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_current_daily_attempt();

-- Supporting indexes for user erasure and hot match answer paths.
CREATE INDEX IF NOT EXISTS match_participants_user_idx ON public.match_participants (user_id);
CREATE INDEX IF NOT EXISTS match_answers_user_idx ON public.match_answers (user_id);
CREATE INDEX IF NOT EXISTS challenge_scores_user_idx ON public.challenge_scores (user_id);
CREATE INDEX IF NOT EXISTS question_reports_reporter_idx ON public.question_reports (reporter_sub)
  WHERE reporter_sub IS NOT NULL;

-- Owner-scheduled retention primitive. Run from Supabase Cron after choosing
-- the documented retention period; it does not need another Vercel function.
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
BEGIN
  DELETE FROM public.roadmap_attempts
   WHERE expires_at < p_before;
  GET DIAGNOSTICS v_roadmap = ROW_COUNT;
  DELETE FROM public.quiz_submissions
   WHERE created_at < p_before;
  GET DIAGNOSTICS v_submissions = ROW_COUNT;
  RETURN jsonb_build_object('roadmapAttempts', v_roadmap, 'quizSubmissions', v_submissions);
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ)
  TO service_role;

-- Keep account erasure complete as the grading ledger is introduced.
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
  DELETE FROM public.user_xp WHERE user_id = p_user_id;
  DELETE FROM public.challenge_scores WHERE user_id = p_user_id;
  DELETE FROM public.auth_events WHERE user_id = p_user_id;
  DELETE FROM public.question_reports WHERE reporter_sub = p_user_id;
  DELETE FROM public.user_question_history WHERE user_id = p_user_id;
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

-- Rollback: remove the trigger/functions/table added here, then keep subject
-- columns in place. Dropping subject columns would merge separated history.
