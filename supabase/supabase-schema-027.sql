-- Migration 027: saved challenges, named collections, skip reasons, ordering
-- evidence and short practice sessions.
-- Apply after migrations 001-026. Safe to re-run.
--
-- Six additive tables, all owner-scoped and none of them authority over
-- anything:
--   * coding_bookmarks: a saved challenge. Saving one records interest, never
--     access — an item the learner may not open yet stays in the list with an
--     explanation and refuses to launch, which the API enforces.
--   * coding_collections / coding_collection_items: named, ordered lists of
--     saved challenges. Bounded so a list cannot become a storage vector.
--   * coding_skips: why a learner passed on a task. Structured, minimal, and
--     explicitly not a completion: a required task that was skipped stays
--     required, and nothing here can unlock a level.
--   * coding_puzzle_results: what a code-ordering puzzle established, kept
--     apart from a code pass because arranging authored lines is not the same
--     as writing them.
--   * practice_sessions: a short session's queue and position, so closing the
--     tab does not lose the learner's place. The queue is chosen server-side
--     from what is already eligible; it never widens what is available.
--
-- Nothing here writes to user_xp, coding_progress, roadmap_progress or
-- verified_activity_awards. A bookmark, a skip and a session are all preference
-- and position — no XP, no unlock, no mastery.

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coding_bookmarks (
  user_id    TEXT NOT NULL,
  task_id    TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS coding_bookmarks_user_idx
  ON public.coding_bookmarks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.coding_collections (
  collection_id TEXT PRIMARY KEY CHECK (collection_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  user_id       TEXT NOT NULL,
  -- Names are the learner's own words, so they are bounded and trimmed rather
  -- than pattern-matched: an empty or whitespace-only name is rejected.
  name          TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 60),
  position      INTEGER NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 999),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS coding_collections_user_idx
  ON public.coding_collections (user_id, position);

CREATE TABLE IF NOT EXISTS public.coding_collection_items (
  collection_id TEXT NOT NULL REFERENCES public.coding_collections(collection_id) ON DELETE CASCADE,
  task_id       TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  position      INTEGER NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 999),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, task_id)
);
CREATE INDEX IF NOT EXISTS coding_collection_items_order_idx
  ON public.coding_collection_items (collection_id, position);

CREATE TABLE IF NOT EXISTS public.coding_skips (
  user_id      TEXT NOT NULL,
  task_id      TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  reason       TEXT NOT NULL CHECK (reason IN ('too-easy', 'too-hard', 'missing-prerequisite', 'unclear', 'later')),
  -- Optional and short. It is feedback about the task, not a place to write.
  note         TEXT CHECK (note IS NULL OR LENGTH(note) <= 280),
  task_version INTEGER NOT NULL DEFAULT 1 CHECK (task_version BETWEEN 1 AND 999),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS coding_skips_user_idx
  ON public.coding_skips (user_id, created_at DESC);

-- Ordering evidence, kept apart from a code pass on purpose. Arranging authored
-- lines shows the learner knows the shape of a solution; it does not show they
-- could have written it. Nothing in this table completes a task or unlocks a
-- level — coding_progress is untouched by a puzzle.
CREATE TABLE IF NOT EXISTS public.coding_puzzle_results (
  user_id       TEXT NOT NULL,
  task_id       TEXT NOT NULL CHECK (task_id ~ '^[a-z0-9-]{3,64}$'),
  competencies  JSONB NOT NULL DEFAULT '[]'::jsonb
                  CHECK (jsonb_typeof(competencies) = 'array' AND jsonb_array_length(competencies) <= 8),
  attempts      INTEGER NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 9999),
  first_pass_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS coding_puzzle_results_user_idx
  ON public.coding_puzzle_results (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  session_id  TEXT PRIMARY KEY CHECK (session_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  user_id     TEXT NOT NULL,
  subject     TEXT NOT NULL DEFAULT 'webdev',
  minutes     INTEGER NOT NULL CHECK (minutes BETWEEN 5 AND 60),
  topic       TEXT CHECK (topic IS NULL OR topic ~ '^[a-z0-9-]{2,40}$'),
  -- The queue the server chose, as an ordered array of task ids. Bounded by a
  -- check on its length so one row stays small.
  queue       JSONB NOT NULL DEFAULT '[]'::jsonb
                CHECK (jsonb_typeof(queue) = 'array' AND jsonb_array_length(queue) <= 40),
  position    INTEGER NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 40),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS practice_sessions_user_idx
  ON public.practice_sessions (user_id, status, started_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Row-level security. Every table is personal data; each is readable by its
--    owner and writable only through the service role, so no browser can mint
--    a saved item for someone else or rewrite a skip record.
-- ---------------------------------------------------------------------------
ALTER TABLE public.coding_bookmarks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_skips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_puzzle_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coding_bookmarks_select_own" ON public.coding_bookmarks;
CREATE POLICY "coding_bookmarks_select_own"
  ON public.coding_bookmarks FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "coding_collections_select_own" ON public.coding_collections;
CREATE POLICY "coding_collections_select_own"
  ON public.coding_collections FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- Items carry no user_id of their own; ownership is the collection's.
DROP POLICY IF EXISTS "coding_collection_items_select_own" ON public.coding_collection_items;
CREATE POLICY "coding_collection_items_select_own"
  ON public.coding_collection_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coding_collections c
     WHERE c.collection_id = coding_collection_items.collection_id
       AND c.user_id = (SELECT auth.uid()::TEXT)
  ));

DROP POLICY IF EXISTS "coding_skips_select_own" ON public.coding_skips;
CREATE POLICY "coding_skips_select_own"
  ON public.coding_skips FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "coding_puzzle_results_select_own" ON public.coding_puzzle_results;
CREATE POLICY "coding_puzzle_results_select_own"
  ON public.coding_puzzle_results FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "practice_sessions_select_own" ON public.practice_sessions;
CREATE POLICY "practice_sessions_select_own"
  ON public.practice_sessions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

GRANT SELECT ON public.coding_bookmarks        TO authenticated;
GRANT SELECT ON public.coding_collections      TO authenticated;
GRANT SELECT ON public.coding_collection_items TO authenticated;
GRANT SELECT ON public.coding_skips            TO authenticated;
GRANT SELECT ON public.coding_puzzle_results   TO authenticated;
GRANT SELECT ON public.practice_sessions       TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Writes. Service-role functions, so the limits are enforced in one place
--    rather than trusted from a request.
-- ---------------------------------------------------------------------------

-- At most this many saved challenges and collections per learner, and this many
-- items in one collection. Generous for a person, small enough that no account
-- becomes a storage bucket.
CREATE OR REPLACE FUNCTION public.set_coding_bookmark(
  p_user_id TEXT,
  p_task_id TEXT,
  p_saved   BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_saved THEN
    SELECT COUNT(*) INTO v_count FROM public.coding_bookmarks WHERE user_id = p_user_id;
    IF v_count >= 500 THEN
      RAISE EXCEPTION 'bookmark_limit_reached';
    END IF;
    INSERT INTO public.coding_bookmarks (user_id, task_id)
    VALUES (p_user_id, p_task_id)
    ON CONFLICT (user_id, task_id) DO NOTHING;
  ELSE
    DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id AND task_id = p_task_id;
  END IF;
  SELECT COUNT(*) INTO v_count FROM public.coding_bookmarks WHERE user_id = p_user_id;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.set_coding_bookmark(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_coding_bookmark(TEXT, TEXT, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_coding_collection(
  p_collection_id TEXT,
  p_user_id       TEXT,
  p_name          TEXT,
  p_position      INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
  v_count INTEGER;
BEGIN
  SELECT user_id INTO v_owner FROM public.coding_collections WHERE collection_id = p_collection_id;
  IF v_owner IS NOT NULL AND v_owner IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'collection_not_owned';
  END IF;
  IF v_owner IS NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.coding_collections WHERE user_id = p_user_id;
    IF v_count >= 30 THEN
      RAISE EXCEPTION 'collection_limit_reached';
    END IF;
  END IF;
  INSERT INTO public.coding_collections (collection_id, user_id, name, position)
  VALUES (p_collection_id, p_user_id, BTRIM(p_name), COALESCE(p_position, 0))
  ON CONFLICT (collection_id) DO UPDATE
    SET name = BTRIM(p_name), position = COALESCE(p_position, 0), updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_coding_collection(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_coding_collection(TEXT, TEXT, TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.set_coding_collection_item(
  p_collection_id TEXT,
  p_user_id       TEXT,
  p_task_id       TEXT,
  p_present       BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
  v_count INTEGER;
BEGIN
  SELECT user_id INTO v_owner FROM public.coding_collections WHERE collection_id = p_collection_id;
  IF v_owner IS NULL OR v_owner IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'collection_not_owned';
  END IF;
  IF p_present THEN
    SELECT COUNT(*) INTO v_count FROM public.coding_collection_items WHERE collection_id = p_collection_id;
    IF v_count >= 200 THEN
      RAISE EXCEPTION 'collection_item_limit_reached';
    END IF;
    INSERT INTO public.coding_collection_items (collection_id, task_id, position)
    VALUES (p_collection_id, p_task_id, v_count)
    ON CONFLICT (collection_id, task_id) DO NOTHING;
  ELSE
    DELETE FROM public.coding_collection_items
     WHERE collection_id = p_collection_id AND task_id = p_task_id;
  END IF;
  UPDATE public.coding_collections SET updated_at = NOW() WHERE collection_id = p_collection_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_coding_collection_item(TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_coding_collection_item(TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_coding_collection(
  p_collection_id TEXT,
  p_user_id       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.coding_collections
   WHERE collection_id = p_collection_id AND user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_coding_collection(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_coding_collection(TEXT, TEXT) TO service_role;

-- A skip is one row per learner and task: skipping again replaces the reason
-- rather than accumulating a history nobody reads.
CREATE OR REPLACE FUNCTION public.record_coding_skip(
  p_user_id      TEXT,
  p_task_id      TEXT,
  p_reason       TEXT,
  p_note         TEXT,
  p_task_version INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.coding_skips (user_id, task_id, reason, note, task_version)
  VALUES (p_user_id, p_task_id, p_reason, NULLIF(BTRIM(COALESCE(p_note, '')), ''), COALESCE(p_task_version, 1))
  ON CONFLICT (user_id, task_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        note = EXCLUDED.note,
        task_version = EXCLUDED.task_version,
        created_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.record_coding_skip(TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_skip(TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- A puzzle result is recorded on its own terms: the competencies the author
-- declared, and when it was first arranged correctly. It writes nowhere else.
CREATE OR REPLACE FUNCTION public.record_coding_puzzle(
  p_user_id      TEXT,
  p_task_id      TEXT,
  p_competencies JSONB,
  p_passed       BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.coding_puzzle_results (user_id, task_id, competencies, attempts, first_pass_at)
  VALUES (
    p_user_id, p_task_id, COALESCE(p_competencies, '[]'::jsonb), 1,
    CASE WHEN p_passed THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, task_id) DO UPDATE
    SET attempts = LEAST(public.coding_puzzle_results.attempts + 1, 9999),
        competencies = EXCLUDED.competencies,
        first_pass_at = COALESCE(public.coding_puzzle_results.first_pass_at, EXCLUDED.first_pass_at),
        updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.record_coding_puzzle(TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_puzzle(TEXT, TEXT, JSONB, BOOLEAN) TO service_role;

-- One active session per learner: starting a new one abandons the old rather
-- than leaving two queues competing for the same place.
CREATE OR REPLACE FUNCTION public.start_practice_session(
  p_session_id TEXT,
  p_user_id    TEXT,
  p_subject    TEXT,
  p_minutes    INTEGER,
  p_topic      TEXT,
  p_queue      JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.practice_sessions
     SET status = 'abandoned', updated_at = NOW()
   WHERE user_id = p_user_id AND status = 'active';
  INSERT INTO public.practice_sessions (session_id, user_id, subject, minutes, topic, queue)
  VALUES (p_session_id, p_user_id, COALESCE(p_subject, 'webdev'), p_minutes, p_topic, COALESCE(p_queue, '[]'::jsonb))
  ON CONFLICT (session_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.start_practice_session(TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_practice_session(TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.advance_practice_session(
  p_session_id TEXT,
  p_user_id    TEXT,
  p_position   INTEGER,
  p_status     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.practice_sessions
     SET position = LEAST(GREATEST(COALESCE(p_position, position), 0), jsonb_array_length(queue)),
         status = COALESCE(p_status, status),
         updated_at = NOW()
   WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_practice_session(TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_practice_session(TEXT, TEXT, INTEGER, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Account deletion and retention. Restated in full so the function stays
--    readable, following migration 026's convention.
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
  DELETE FROM public.practice_sessions WHERE user_id = p_user_id;
  DELETE FROM public.coding_puzzle_results WHERE user_id = p_user_id;
  DELETE FROM public.coding_skips WHERE user_id = p_user_id;
  DELETE FROM public.coding_collection_items
   WHERE collection_id IN (SELECT collection_id FROM public.coding_collections WHERE user_id = p_user_id);
  DELETE FROM public.coding_collections WHERE user_id = p_user_id;
  DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_drafts WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_progress WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_evidence WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_attempts WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_enrollments WHERE user_id = p_user_id;
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

-- Abandoned and finished sessions are position, not evidence: they go after 30
-- days. Bookmarks, collections and skips are the learner's own record and are
-- kept until they remove them or delete the account.
CREATE OR REPLACE FUNCTION public.purge_practice_sessions(p_before TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.practice_sessions
   WHERE status <> 'active' AND updated_at < p_before;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_practice_sessions(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_practice_sessions(TIMESTAMPTZ) TO service_role;
