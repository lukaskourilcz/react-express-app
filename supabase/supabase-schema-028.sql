-- Migration 028: the learner's coding library — saved challenges and named
-- collections (issue #157). Apply after migrations 001-027. Safe to re-run.
--
-- A library is a reading list. Saving a challenge never opens it: eligibility
-- still comes from the progression policy, so a saved task the learner's plan
-- does not currently allow stays listed, with an explanation, and cannot start.
-- Rows are owner-scoped; the service role writes them after verifying the token.

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_bookmarks (
  user_id    TEXT NOT NULL,
  task_id    TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.coding_collections (
  collection_id TEXT PRIMARY KEY CHECK (collection_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  position      INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coding_collection_items (
  collection_id TEXT NOT NULL REFERENCES public.coding_collections(collection_id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,
  task_id       TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  position      INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, task_id)
);

CREATE INDEX IF NOT EXISTS coding_collections_user_position_idx
  ON public.coding_collections (user_id, position);
CREATE INDEX IF NOT EXISTS coding_collection_items_user_idx
  ON public.coding_collection_items (user_id, collection_id, position);

-- One learner may not hold more than twenty collections. The API refuses the
-- twenty-first; this trigger is the backstop for anything that bypasses it.
CREATE OR REPLACE FUNCTION public.enforce_coding_collection_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.coding_collections WHERE user_id = NEW.user_id) > 20 THEN
    RAISE EXCEPTION 'coding_collection_limit';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS coding_collections_limit ON public.coding_collections;
CREATE TRIGGER coding_collections_limit
  AFTER INSERT ON public.coding_collections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coding_collection_limit();

-- ---------------------------------------------------------------------------
-- 2. Row-level security: a learner reads their own library, the service writes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.coding_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_collection_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coding_bookmarks, public.coding_collections, public.coding_collection_items
  FROM anon, authenticated;

DROP POLICY IF EXISTS "coding_bookmarks_select_own" ON public.coding_bookmarks;
CREATE POLICY "coding_bookmarks_select_own"
  ON public.coding_bookmarks FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "coding_collections_select_own" ON public.coding_collections;
CREATE POLICY "coding_collections_select_own"
  ON public.coding_collections FOR SELECT
  USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "coding_collection_items_select_own" ON public.coding_collection_items;
CREATE POLICY "coding_collection_items_select_own"
  ON public.coding_collection_items FOR SELECT
  USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 3. Account erasure and export cover the library.
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
