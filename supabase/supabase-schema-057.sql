-- Migration 057: the sign-in log keeps each record for 12 months.
-- Apply after migrations 015 and 026. Safe to re-run. The routine keeps its
-- signature and its grants, so the code in production and the pg_cron job
-- that calls it keep working unchanged.
--
-- auth_events (015) records the email address, the provider and the time of
-- every sign-in, for the owner's /dev log. Nothing ever deleted a row except
-- account deletion, and the privacy policy now says 12 months (owner decision
-- 4, round 4). The daily retention routine, purge_expired_learning_data, last
-- restated by 026, is restated here with 026's body unchanged and one more
-- statement at the end: it deletes sign-in records older than 12 months. Like
-- the learning-path lines, the period is fixed and does not follow p_before,
-- which sets the 90-day learning window. The result gains `authEvents`.
--
-- Production runs the routine once a day through pg_cron
-- (purge_expired_learning_data_daily, 03:07 UTC), so the first run after this
-- migration removes the backlog and every later run removes a day's worth.
-- idx_auth_events_created_at (015) serves the delete.

DO $$
BEGIN
  IF to_regclass('public.auth_events') IS NULL OR to_regclass('public.learning_path_drafts') IS NULL THEN
    RAISE EXCEPTION 'migration 057 needs migrations 015 and 026 first';
  END IF;
END;
$$;

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
  RETURN jsonb_build_object(
    'roadmapAttempts', v_roadmap, 'quizSubmissions', v_submissions,
    'codingAttempts', v_coding, 'codingDrafts', v_drafts, 'githubCommits', v_commits,
    'learningPathAttempts', v_path_attempts, 'learningPathDrafts', v_path_drafts,
    'authEvents', v_auth_events
  );
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_learning_data(TIMESTAMPTZ) TO service_role;

-- Rollback (manual): restate purge_expired_learning_data from migration 026.
-- Sign-in records already deleted stay deleted; nothing else changed.
