-- Migration 061: complete the audit follow-ups in #236.
-- Browser roles read personal rows through RLS; only the service writes them.
-- Daily retention now also removes finished/abandoned practice after 30 days.
-- The existing pg_cron job and the other retention windows are unchanged.

REVOKE ALL ON public.app_settings, public.auth_events, public.daily_attempts,
  public.flashcards, public.question_edits, public.roadmap_progress,
  public.user_category_stats, public.user_stats, public.user_streak,
  public.user_xp, public.concept_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.daily_attempts, public.flashcards, public.roadmap_progress,
  public.user_category_stats, public.user_stats, public.user_streak,
  public.user_xp, public.concept_reviews TO authenticated;

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
  v_path_attempts INTEGER;
  v_path_drafts INTEGER;
  v_auth_events INTEGER;
  v_practice_sessions INTEGER;
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
  DELETE FROM public.learning_path_attempts
   WHERE state <> 'accepted' AND expires_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_path_attempts = ROW_COUNT;
  DELETE FROM public.learning_path_drafts
   WHERE updated_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_path_drafts = ROW_COUNT;
  -- 057: the sign-in log keeps a record for 12 months (privacy policy,
  -- "How long devShark keeps data").
  DELETE FROM public.auth_events
   WHERE created_at < NOW() - INTERVAL '12 months';
  GET DIAGNOSTICS v_auth_events = ROW_COUNT;
  v_practice_sessions := public.purge_practice_sessions(NOW() - INTERVAL '30 days');
  RETURN jsonb_build_object(
    'roadmapAttempts', v_roadmap, 'quizSubmissions', v_submissions,
    'codingAttempts', v_coding, 'codingDrafts', v_drafts, 'githubCommits', v_commits,
    'learningPathAttempts', v_path_attempts, 'learningPathDrafts', v_path_drafts,
    'authEvents', v_auth_events, 'practiceSessions', v_practice_sessions
  );
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ) TO service_role;

