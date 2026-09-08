-- Migration 029: short practice sessions and skip feedback (issues #159, #160).
-- Apply after migrations 001-028. Safe to re-run.
--
-- Neither table grants anything. A practice session is a saved queue and a
-- position in it, so a learner can resume where they stopped; a skip is
-- feedback with a reason. No XP, no completion and no unlock is written here,
-- and choosing a session never opens a task the progression policy has not.

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  session_id   TEXT PRIMARY KEY CHECK (session_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  user_id      TEXT NOT NULL,
  minutes      INTEGER NOT NULL CHECK (minutes IN (5, 10, 20, 40)),
  task_ids     TEXT[] NOT NULL DEFAULT '{}',
  position     INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT practice_sessions_length CHECK (array_length(task_ids, 1) IS NULL OR array_length(task_ids, 1) <= 40)
);

-- One open session per learner: a resume must be unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS practice_sessions_one_open_idx
  ON public.practice_sessions (user_id) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS practice_sessions_user_started_idx
  ON public.practice_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.coding_skips (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  task_id    TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  track      TEXT NOT NULL CHECK (track IN ('javascript', 'typescript', 'react', 'system-design')),
  reason     TEXT NOT NULL CHECK (reason IN ('too-easy', 'too-hard', 'missing-prerequisite', 'unclear', 'later')),
  -- Optional and bounded: a signal, not a support ticket.
  note       TEXT CHECK (note IS NULL OR char_length(note) <= 280),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coding_skips_user_created_idx
  ON public.coding_skips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS coding_skips_task_reason_idx
  ON public.coding_skips (task_id, reason);

-- ---------------------------------------------------------------------------
-- 2. Row-level security.
-- ---------------------------------------------------------------------------
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_skips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.practice_sessions, public.coding_skips FROM anon, authenticated;

DROP POLICY IF EXISTS "practice_sessions_select_own" ON public.practice_sessions;
CREATE POLICY "practice_sessions_select_own"
  ON public.practice_sessions FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "coding_skips_select_own" ON public.coding_skips;
CREATE POLICY "coding_skips_select_own"
  ON public.coding_skips FOR SELECT
  USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 3. Account erasure covers both.
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
  DELETE FROM public.practice_sessions WHERE user_id = p_user_id;
  DELETE FROM public.coding_skips WHERE user_id = p_user_id;
  DELETE FROM public.coding_collection_items WHERE user_id = p_user_id;
  DELETE FROM public.coding_collections WHERE user_id = p_user_id;
  DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id;
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
