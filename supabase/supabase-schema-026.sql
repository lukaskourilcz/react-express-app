-- Migration 026: the versioned learner profile and the progression policy it
-- feeds. Apply after migrations 001-025. Safe to re-run.
--
-- devShark personalises what a learner sees from one small record:
--   * learner_profiles: the accepted profile (base track, optional FDE
--     specialisation, optional DSA enrolment, goals, experience, sitting
--     length) plus the answers of a registration that was interrupted.
--
-- The profile is data, never an entitlement. Eligibility is derived in
-- shared/progression.ts from this row *and* the verified completions already
-- stored in roadmap_progress; nothing here unlocks a level, and experience is
-- advisory. Learning stays free.

-- ---------------------------------------------------------------------------
-- 1. Table.
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
-- 3. Account erasure covers the new row.
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
