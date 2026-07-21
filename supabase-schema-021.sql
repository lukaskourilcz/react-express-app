-- Migration 021: launch hardening, verified challenge runs, and account erasure.
-- Apply after migrations 001-020. This migration is idempotent.

-- Challenge submissions carry an opaque server-issued run id. A unique partial
-- index makes an ambiguous retry idempotent while preserving historic rows.
ALTER TABLE public.challenge_scores
  ADD COLUMN IF NOT EXISTS run_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS challenge_scores_run_id_unique
  ON public.challenge_scores (run_id)
  WHERE run_id IS NOT NULL;

-- Idempotency ledger for verified quiz result receipts. The receipt itself is
-- encrypted and validated by the API; only its random identifier is stored.
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  attempt_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_created_idx
  ON public.quiz_attempts (user_id, created_at DESC);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_attempts FROM anon, authenticated;

-- Optional post-answer AI explanations. Cache keys include the selected answer
-- because misconception guidance differs by distractor. Changing any curated
-- question content changes question_hash and naturally invalidates old output.
CREATE TABLE IF NOT EXISTS public.question_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'cs')),
  selected_answer_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (question_id, question_hash, locale, selected_answer_hash)
);

CREATE INDEX IF NOT EXISTS question_explanations_review_idx
  ON public.question_explanations (status, created_at DESC)
  WHERE status = 'generated';

ALTER TABLE public.question_explanations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.question_explanations FROM anon, authenticated;

-- Apply one verified result exactly once. This also avoids the first-quiz race:
-- profile creation and counter/category increments occur in one transaction.
CREATE OR REPLACE FUNCTION public.record_verified_quiz_result(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_correct INTEGER,
  p_total INTEGER,
  p_breakdown JSONB,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_picture TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  v_applied INTEGER;
  rec RECORD;
BEGIN
  IF p_correct < 0 OR p_total <= 0 OR p_correct > p_total OR p_total > 50 THEN
    RAISE EXCEPTION 'invalid_quiz_result';
  END IF;
  IF p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RAISE EXCEPTION 'invalid_attempt_id';
  END IF;

  INSERT INTO public.quiz_attempts (attempt_id, user_id)
  VALUES (p_attempt_id, p_user_id)
  ON CONFLICT (attempt_id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  IF v_applied = 0 THEN RETURN FALSE; END IF;

  INSERT INTO public.user_stats (
    user_id, email, name, picture, total_quizzes, total_correct,
    total_questions, current_streak, longest_streak, last_quiz_date
  ) VALUES (
    p_user_id, p_email, p_name, p_picture, 1, p_correct,
    p_total, 1, 1, v_today
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_stats.email),
    name = COALESCE(EXCLUDED.name, public.user_stats.name),
    picture = COALESCE(EXCLUDED.picture, public.user_stats.picture),
    total_quizzes = public.user_stats.total_quizzes + 1,
    total_correct = public.user_stats.total_correct + EXCLUDED.total_correct,
    total_questions = public.user_stats.total_questions + EXCLUDED.total_questions,
    current_streak = CASE
      WHEN public.user_stats.last_quiz_date = v_today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_quiz_date = v_today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      public.user_stats.longest_streak,
      CASE
        WHEN public.user_stats.last_quiz_date = v_today THEN public.user_stats.current_streak
        WHEN public.user_stats.last_quiz_date = v_today - 1 THEN public.user_stats.current_streak + 1
        ELSE 1
      END
    ),
    last_quiz_date = v_today,
    updated_at = NOW();

  IF p_breakdown IS NOT NULL THEN
    FOR rec IN
      SELECT key AS category,
             (value->>'correct')::INTEGER AS correct,
             (value->>'total')::INTEGER AS total
      FROM jsonb_each(p_breakdown)
    LOOP
      IF rec.category !~ '^[a-z0-9-]{1,50}$' OR rec.total <= 0 OR
         rec.total > 50 OR rec.correct < 0 OR rec.correct > rec.total THEN
        CONTINUE;
      END IF;
      INSERT INTO public.user_category_stats (
        user_id, category, total_correct, total_questions, updated_at
      ) VALUES (
        p_user_id, rec.category, rec.correct, rec.total, NOW()
      )
      ON CONFLICT (user_id, category) DO UPDATE SET
        total_correct = public.user_category_stats.total_correct + EXCLUDED.total_correct,
        total_questions = public.user_category_stats.total_questions + EXCLUDED.total_questions,
        updated_at = NOW();
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_verified_quiz_result(TEXT, TEXT, INTEGER, INTEGER, JSONB, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result(TEXT, TEXT, INTEGER, INTEGER, JSONB, TEXT, TEXT, TEXT)
  TO service_role;

-- Monotone, row-locked XP merge. Concurrent tabs cannot overwrite a larger
-- value with a stale read, and per-subject balances remain independently maxed.
CREATE OR REPLACE FUNCTION public.merge_user_xp(
  p_user_id TEXT,
  p_quest_xp BIGINT,
  p_by_subject JSONB
)
RETURNS TABLE (quest_xp BIGINT, by_subject JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.user_xp%ROWTYPE;
  v_map JSONB;
  v_total BIGINT;
  rec RECORD;
  v_value BIGINT;
  v_current BIGINT;
BEGIN
  INSERT INTO public.user_xp (user_id, quest_xp, quest_xp_by_subject)
  VALUES (p_user_id, 0, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.user_xp
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_map := COALESCE(v_row.quest_xp_by_subject, '{}'::jsonb);
  IF p_by_subject IS NOT NULL AND jsonb_typeof(p_by_subject) = 'object' THEN
    FOR rec IN SELECT key, value FROM jsonb_each_text(p_by_subject)
    LOOP
      IF rec.key !~ '^[a-z][a-z0-9-]{0,31}$' OR rec.value !~ '^\d{1,9}$' THEN CONTINUE; END IF;
      v_value := LEAST(rec.value::BIGINT, 100000000);
      v_current := COALESCE((v_map ->> rec.key)::BIGINT, 0);
      IF v_value > v_current THEN
        v_map := jsonb_set(v_map, ARRAY[rec.key], to_jsonb(v_value), TRUE);
      END IF;
    END LOOP;
  END IF;

  SELECT COALESCE(SUM(value::BIGINT), 0) INTO v_total
  FROM jsonb_each_text(v_map);
  v_total := LEAST(100000000, GREATEST(v_row.quest_xp, p_quest_xp, v_total));

  UPDATE public.user_xp
  SET quest_xp = v_total,
      quest_xp_by_subject = v_map,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_total, v_map;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_user_xp(TEXT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_user_xp(TEXT, BIGINT, JSONB) TO service_role;

-- The browser never needs direct table writes: all mutations go through API
-- handlers that verify identity, validate input, rate-limit, and use service
-- credentials. Removing mutation policies closes the client-authoritative
-- stats/progress/report paths while retaining existing own-row read policies.
DROP POLICY IF EXISTS "stats_insert_own" ON public.user_stats;
DROP POLICY IF EXISTS "stats_update_own" ON public.user_stats;
DROP POLICY IF EXISTS "category_stats_upsert_self" ON public.user_category_stats;
DROP POLICY IF EXISTS "category_stats_update_self" ON public.user_category_stats;
DROP POLICY IF EXISTS "daily_insert_self" ON public.daily_attempts;
DROP POLICY IF EXISTS "report_insert_any" ON public.question_reports;
DROP POLICY IF EXISTS "flashcards_insert_own" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_update_own" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_delete_own" ON public.flashcards;
DROP POLICY IF EXISTS "roadmap_progress_insert_own" ON public.roadmap_progress;
DROP POLICY IF EXISTS "roadmap_progress_update_own" ON public.roadmap_progress;
DROP POLICY IF EXISTS "user_streak_insert_own" ON public.user_streak;
DROP POLICY IF EXISTS "user_streak_update_own" ON public.user_streak;
DROP POLICY IF EXISTS "user_xp_insert_own" ON public.user_xp;
DROP POLICY IF EXISTS "user_xp_update_own" ON public.user_xp;

-- Multiplayer data contains answer keys and room membership. Clients use the
-- API plus Realtime Broadcast, not PostgREST table reads, so no direct browser
-- policies are required.
DROP POLICY IF EXISTS "matches_read" ON public.matches;
DROP POLICY IF EXISTS "matches_write_host" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_self" ON public.matches;
DROP POLICY IF EXISTS "participants_read" ON public.match_participants;
DROP POLICY IF EXISTS "participants_insert_self" ON public.match_participants;
DROP POLICY IF EXISTS "answers_read_self" ON public.match_answers;
DROP POLICY IF EXISTS "answers_insert_self" ON public.match_answers;

REVOKE ALL ON public.matches, public.match_participants, public.match_answers,
  public.question_reports FROM anon, authenticated;

-- One short transaction removes every user-owned row. The service API calls
-- this first, then removes the Supabase Auth identity. Hosted matches cascade
-- their participants/answers; participation in other rooms is removed below.
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
  DELETE FROM public.quiz_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;
