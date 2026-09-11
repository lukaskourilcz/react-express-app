-- Migration 033: friends — an opt-in handle, a consent-gated friendship, and a
-- server-computed view of a friend's numbers.
-- Apply after migrations 001-032. Safe to re-run.
--
-- This product has never had a public user directory, and migration 023 removed
-- the last thing that resembled one: public rankings stopped inferring an
-- identity from the email local part, and every leaderboard RPC was revoked
-- from anon and authenticated. Nothing below reopens that.
--
-- In particular `user_stats.name` is the name the OAuth provider supplied — a
-- real name the learner never chose to publish, written by
-- record_verified_quiz_result_v2. No routine in this migration reads it, and no
-- routine reads user_stats.email. Searching those columns would turn a sign-in
-- detail into a searchable index of real people, which is a different product
-- from the one this file implements.
--
-- What this adds instead:
--
--   * user_handles — a self-chosen, unique, opt-in address. No handle means
--     unfindable. Matching is exact equality on lower(handle): no LIKE, no
--     ILIKE, no prefix, no listing. The lookup is an address bar, not a
--     directory. You cannot enumerate it and you cannot discover a handle you
--     do not already know.
--   * friendships — one row per unordered pair, so a relationship cannot be
--     half-true and two simultaneous requests cannot become two rows. Reading
--     another person's streak requires their acceptance.
--   * friend_list — the only place a friend's numbers are assembled, under the
--     service role, scoped to the calling deployment's categories.
--
-- Every routine is SECURITY DEFINER with an empty search_path and is granted to
-- service_role alone. The browser reaches them through api/user/[op].ts and
-- nowhere else.

-- ---------------------------------------------------------------------------
-- 1. Handles: the opt-in address
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_handles (
  user_id       TEXT        PRIMARY KEY,
  handle        TEXT        NOT NULL
                            CHECK (handle ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,22}[A-Za-z0-9]$'),
  -- Reserved words are a CHECK rather than a lookup table so the constraint
  -- travels with the column and cannot be bypassed by a future write path.
  CONSTRAINT user_handles_not_reserved CHECK (lower(handle) NOT IN (
    'admin','administrator','moderator','mod','support','help','staff','team',
    'shark','studyshark','devshark','sharkira','learner','anonymous',
    'me','you','system','root','null','undefined'
  )),
  handle_key    TEXT        GENERATED ALWAYS AS (lower(handle)) STORED,
  -- FALSE means "no new person can find me". It does not unmake a friendship
  -- and it does not release the handle: existing friends keep addressing this
  -- account by it, which is why leaving search is a flag and not a delete.
  discoverable  BOOLEAN     NOT NULL DEFAULT TRUE,
  handle_set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_handles_key_uniq
  ON public.user_handles (handle_key);

-- ---------------------------------------------------------------------------
-- 2. Friendships: one row per unordered pair
-- ---------------------------------------------------------------------------
--
-- Storing (low, high) with the pair as the primary key means the database, not
-- the application, guarantees there is exactly one truth about two people. Two
-- users pressing "add" at the same moment collide on the key instead of
-- creating A-pending-B alongside B-pending-A.

CREATE TABLE IF NOT EXISTS public.friendships (
  user_low     TEXT NOT NULL,
  user_high    TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (state IN ('pending', 'accepted', 'declined', 'blocked')),
  blocked_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_low, user_high),
  CONSTRAINT friendships_ordered CHECK (user_low < user_high),
  CONSTRAINT friendships_requester_is_party CHECK (requested_by IN (user_low, user_high)),
  CONSTRAINT friendships_blocker_is_party CHECK (blocked_by IS NULL OR blocked_by IN (user_low, user_high)),
  CONSTRAINT friendships_blocked_has_blocker CHECK ((state = 'blocked') = (blocked_by IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS friendships_low_state_idx  ON public.friendships (user_low, state);
CREATE INDEX IF NOT EXISTS friendships_high_state_idx ON public.friendships (user_high, state);

-- ---------------------------------------------------------------------------
-- 3. Row-level security.
--
--    A person may read their own handle row and the rows of relationships they
--    are part of. There is deliberately NO policy letting `authenticated` read
--    somebody else's handle: that absence is the privacy control. Resolving a
--    handle to an account happens only inside the definer routines below, which
--    the browser cannot call. Every write is service-role.
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_handles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_handles_select_own" ON public.user_handles;
CREATE POLICY "user_handles_select_own"
  ON public.user_handles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "friendships_select_party" ON public.friendships;
CREATE POLICY "friendships_select_party"
  ON public.friendships FOR SELECT TO authenticated
  USING ((SELECT auth.uid()::TEXT) IN (user_low, user_high));

-- Supabase grants INSERT/UPDATE/DELETE/TRUNCATE to anon and authenticated on
-- every new table. RLS filters rows a statement may touch; it does not filter
-- TRUNCATE, which takes no rows and so passes no policy. Revoking first and
-- granting back only SELECT is what makes the policies above the whole story.
REVOKE ALL ON public.user_handles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.friendships  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_handles TO authenticated;
GRANT SELECT ON public.friendships  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Routines.
-- ---------------------------------------------------------------------------

-- Resolve a handle to an account. `p_require_discoverable` is TRUE for search
-- and for a new request, and FALSE for answering or removing an existing
-- relationship — leaving search must not strand the friends you already have.
CREATE OR REPLACE FUNCTION public.friend_user_for_handle(
  p_handle TEXT,
  p_require_discoverable BOOLEAN
)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT h.user_id
    FROM public.user_handles h
   WHERE h.handle_key = lower(btrim(p_handle))
     AND (NOT p_require_discoverable OR h.discoverable)
$$;

CREATE OR REPLACE FUNCTION public.get_user_handle(p_user_id TEXT)
RETURNS TABLE (handle TEXT, discoverable BOOLEAN, can_change_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT h.handle, h.discoverable, h.handle_set_at + INTERVAL '30 days'
    FROM public.user_handles h
   WHERE h.user_id = p_user_id
$$;

CREATE OR REPLACE FUNCTION public.set_user_handle(p_user_id TEXT, p_handle TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_clean    TEXT := btrim(p_handle);
  v_existing public.user_handles;
BEGIN
  IF v_clean !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,22}[A-Za-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_handle';
  END IF;

  SELECT * INTO v_existing FROM public.user_handles
   WHERE user_id = p_user_id FOR UPDATE;

  IF FOUND THEN
    IF lower(v_existing.handle) = lower(v_clean) THEN
      -- Same handle, different capitalisation. Free, and not a change.
      UPDATE public.user_handles
         SET handle = v_clean, updated_at = NOW()
       WHERE user_id = p_user_id;
      RETURN v_clean;
    END IF;
    -- A handle is how other people address an account. Letting it change
    -- freely turns "add lukas" into a moving target and makes impersonation by
    -- handle recycling cheap, so a real change costs thirty days.
    IF v_existing.handle_set_at > NOW() - INTERVAL '30 days' THEN
      RAISE EXCEPTION 'handle_cooldown';
    END IF;
  END IF;

  INSERT INTO public.user_handles (user_id, handle, handle_set_at)
  VALUES (p_user_id, v_clean, NOW())
  ON CONFLICT (user_id) DO UPDATE
     SET handle = EXCLUDED.handle, handle_set_at = NOW(), updated_at = NOW();
  RETURN v_clean;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'handle_taken';
  WHEN check_violation  THEN RAISE EXCEPTION 'invalid_handle';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_handle_discoverable(
  p_user_id TEXT,
  p_discoverable BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.user_handles
     SET discoverable = p_discoverable, updated_at = NOW()
   WHERE user_id = p_user_id
  RETURNING discoverable;
$$;

-- The search. Exactly one handle in, at most one row out, and the row carries
-- a handle and a relationship state — no account id, no name, no email, no
-- picture, no crown and no statistic. Everything a stranger could learn here is
-- something the other person chose to publish by claiming the handle.
CREATE OR REPLACE FUNCTION public.friend_lookup(p_user_id TEXT, p_handle TEXT)
RETURNS TABLE (handle TEXT, state TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_other  TEXT := public.friend_user_for_handle(p_handle, TRUE);
  v_low    TEXT;
  v_high   TEXT;
  v_row    public.friendships;
  v_found  BOOLEAN;
  v_state  TEXT;
  v_handle TEXT;
BEGIN
  IF v_other IS NULL THEN RETURN; END IF;

  SELECT h.handle INTO v_handle FROM public.user_handles h WHERE h.user_id = v_other;

  IF v_other = p_user_id THEN
    RETURN QUERY SELECT v_handle, 'self'::TEXT;
    RETURN;
  END IF;

  v_low  := LEAST(p_user_id, v_other);
  v_high := GREATEST(p_user_id, v_other);
  SELECT * INTO v_row FROM public.friendships f
   WHERE f.user_low = v_low AND f.user_high = v_high;
  v_found := FOUND;

  IF NOT v_found THEN
    v_state := 'none';
  ELSIF v_row.state = 'accepted' THEN
    v_state := 'accepted';
  ELSIF v_row.state = 'blocked' THEN
    -- A block is never observable by the person blocked: to them the account
    -- looks ordinary. A block that announces itself is a signal, which is the
    -- one thing it must not be.
    v_state := CASE WHEN v_row.blocked_by = p_user_id THEN 'blocked' ELSE 'none' END;
  ELSIF v_row.state = 'declined' THEN
    v_state := CASE WHEN v_row.requested_by = p_user_id THEN 'declined_out' ELSE 'declined_in' END;
  ELSE
    v_state := CASE WHEN v_row.requested_by = p_user_id THEN 'pending_out' ELSE 'pending_in' END;
  END IF;

  RETURN QUERY SELECT v_handle, v_state;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_friend(p_user_id TEXT, p_handle TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_other    TEXT := public.friend_user_for_handle(p_handle, TRUE);
  v_low      TEXT;
  v_high     TEXT;
  v_row      public.friendships;
  v_found    BOOLEAN;
  v_accepted INTEGER;
  v_pending  INTEGER;
BEGIN
  IF v_other IS NULL       THEN RAISE EXCEPTION 'handle_not_found'; END IF;
  IF v_other = p_user_id   THEN RAISE EXCEPTION 'cannot_friend_self'; END IF;

  SELECT COUNT(*) INTO v_accepted FROM public.friendships f
   WHERE f.state = 'accepted' AND p_user_id IN (f.user_low, f.user_high);
  IF v_accepted >= 200 THEN RAISE EXCEPTION 'friend_limit_reached'; END IF;

  SELECT COUNT(*) INTO v_pending FROM public.friendships f
   WHERE f.state = 'pending' AND f.requested_by = p_user_id;
  IF v_pending >= 50 THEN RAISE EXCEPTION 'pending_limit_reached'; END IF;

  v_low  := LEAST(p_user_id, v_other);
  v_high := GREATEST(p_user_id, v_other);
  SELECT * INTO v_row FROM public.friendships f
   WHERE f.user_low = v_low AND f.user_high = v_high FOR UPDATE;
  v_found := FOUND;

  IF NOT v_found THEN
    INSERT INTO public.friendships (user_low, user_high, requested_by, state)
    VALUES (v_low, v_high, p_user_id, 'pending');
    RETURN 'pending';
  END IF;

  IF v_row.state = 'accepted' THEN RETURN 'accepted'; END IF;

  -- Blocked: the request is dropped and the caller is told it was sent.
  IF v_row.state = 'blocked' THEN RETURN 'pending'; END IF;

  IF v_row.state = 'pending' THEN
    IF v_row.requested_by = p_user_id THEN RETURN 'pending'; END IF;
    -- They asked first. Asking back is an answer.
    UPDATE public.friendships
       SET state = 'accepted', responded_at = NOW(), updated_at = NOW()
     WHERE user_low = v_low AND user_high = v_high;
    RETURN 'accepted';
  END IF;

  -- 'declined'. Whoever declined may change their mind; whoever was declined
  -- may not ask again, which is what makes declining worth anything.
  IF v_row.requested_by = p_user_id THEN RAISE EXCEPTION 'request_declined'; END IF;
  UPDATE public.friendships
     SET state = 'pending', requested_by = p_user_id,
         responded_at = NULL, updated_at = NOW()
   WHERE user_low = v_low AND user_high = v_high;
  RETURN 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_friend(
  p_user_id TEXT,
  p_handle  TEXT,
  p_accept  BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_other TEXT := public.friend_user_for_handle(p_handle, FALSE);
  v_low   TEXT;
  v_high  TEXT;
  v_row   public.friendships;
BEGIN
  IF v_other IS NULL THEN RAISE EXCEPTION 'handle_not_found'; END IF;

  v_low  := LEAST(p_user_id, v_other);
  v_high := GREATEST(p_user_id, v_other);
  SELECT * INTO v_row FROM public.friendships f
   WHERE f.user_low = v_low AND f.user_high = v_high FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_request'; END IF;

  -- Only the party who did not ask may answer, and only a pending request has
  -- an answer to give.
  IF v_row.state <> 'pending' OR v_row.requested_by = p_user_id THEN
    RAISE EXCEPTION 'no_request';
  END IF;

  UPDATE public.friendships
     SET state = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         responded_at = NOW(), updated_at = NOW()
   WHERE user_low = v_low AND user_high = v_high;

  RETURN CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_friend(
  p_user_id TEXT,
  p_handle  TEXT,
  p_block   BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_other TEXT := public.friend_user_for_handle(p_handle, FALSE);
  v_low   TEXT;
  v_high  TEXT;
  v_hit   INTEGER;
BEGIN
  IF v_other IS NULL THEN RAISE EXCEPTION 'handle_not_found'; END IF;

  v_low  := LEAST(p_user_id, v_other);
  v_high := GREATEST(p_user_id, v_other);

  IF p_block THEN
    INSERT INTO public.friendships (user_low, user_high, requested_by, state, blocked_by)
    VALUES (v_low, v_high, p_user_id, 'blocked', p_user_id)
    ON CONFLICT (user_low, user_high) DO UPDATE
       SET state = 'blocked', blocked_by = p_user_id, updated_at = NOW();
    RETURN TRUE;
  END IF;

  -- A block is only liftable by whoever set it.
  DELETE FROM public.friendships f
   WHERE f.user_low = v_low AND f.user_high = v_high
     AND (f.state <> 'blocked' OR f.blocked_by = p_user_id);
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  RETURN v_hit > 0;
END;
$$;

-- The only place a friend's numbers are assembled.
--
-- p_categories is the deployment's own subject scope, passed by the API from
-- deploymentSubjectIds() — never by the browser — so a geoShark friend list
-- sums geoShark categories and a devShark one sums webdev. The shape mirrors
-- subject_leaderboard (migration 023) on purpose: same aggregation, same
-- picture column, same accuracy rounding.
--
-- The crown is a boolean and nothing more: not granted_at, not what else the
-- friend owns, and not a term in the ORDER BY. It is a picture somebody liked
-- enough to spend tokens on and it must not move anybody up this list.
CREATE OR REPLACE FUNCTION public.friend_list(p_user_id TEXT, p_categories TEXT[])
RETURNS TABLE (
  handle          TEXT,
  picture         TEXT,
  crown           BOOLEAN,
  current_streak  INTEGER,
  longest_streak  INTEGER,
  total_correct   INTEGER,
  total_questions INTEGER,
  accuracy_pct    INTEGER,
  active_today    BOOLEAN,
  since           TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH mine AS (
    SELECT CASE WHEN f.user_low = p_user_id THEN f.user_high ELSE f.user_low END AS friend_id,
           COALESCE(f.responded_at, f.created_at) AS since
      FROM public.friendships f
     WHERE f.state = 'accepted'
       AND p_user_id IN (f.user_low, f.user_high)
  )
  SELECT h.handle,
         s.picture,
         EXISTS (
           SELECT 1 FROM public.cosmetic_entitlements ce
            WHERE ce.user_id = m.friend_id
              AND ce.cosmetic_id = 'crown'
              AND ce.equipped
         ),
         COALESCE(s.current_streak, 0)::INT,
         COALESCE(s.longest_streak, 0)::INT,
         COALESCE(c.total_correct, 0)::INT,
         COALESCE(c.total_questions, 0)::INT,
         CASE WHEN COALESCE(c.total_questions, 0) > 0
              THEN ROUND(100.0 * c.total_correct / c.total_questions)::INT
              ELSE 0 END,
         -- "Studied today", not a date. A streak already implies recent
         -- activity; publishing the exact last-active date would be an
         -- activity log, which is more than a streak needs.
         (s.last_quiz_date = (NOW() AT TIME ZONE 'UTC')::DATE) IS TRUE,
         m.since
    FROM mine m
    JOIN public.user_handles h ON h.user_id = m.friend_id
    LEFT JOIN public.user_stats s ON s.user_id = m.friend_id
    LEFT JOIN LATERAL (
      SELECT SUM(k.total_correct)   AS total_correct,
             SUM(k.total_questions) AS total_questions
        FROM public.user_category_stats k
       WHERE k.user_id = m.friend_id
         AND k.category = ANY(p_categories)
    ) c ON TRUE
   ORDER BY COALESCE(s.current_streak, 0) DESC,
            CASE WHEN COALESCE(c.total_questions, 0) > 0
                 THEN 100.0 * c.total_correct / c.total_questions
                 ELSE -1 END DESC,
            h.handle ASC
   LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.friend_requests(p_user_id TEXT)
RETURNS TABLE (handle TEXT, direction TEXT, requested_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT h.handle,
         CASE WHEN f.requested_by = p_user_id THEN 'outgoing' ELSE 'incoming' END,
         f.created_at
    FROM public.friendships f
    JOIN public.user_handles h
      ON h.user_id = CASE WHEN f.user_low = p_user_id THEN f.user_high ELSE f.user_low END
   WHERE f.state = 'pending'
     AND p_user_id IN (f.user_low, f.user_high)
   ORDER BY f.created_at DESC
   LIMIT 100;
$$;

-- ---------------------------------------------------------------------------
-- 5. Account erasure reaches the new tables.
--
--    Postgres has no way to append a statement to an existing function, so the
--    whole body is restated. It is the body from migration 028 (lines 574-638)
--    with two lines added at the end. Deleting the friendship rows is what
--    stops a deleted account lingering in somebody else's list.
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
  DELETE FROM public.concept_reviews WHERE user_id = p_user_id;
  DELETE FROM public.practice_sessions WHERE user_id = p_user_id;
  DELETE FROM public.coding_puzzle_results WHERE user_id = p_user_id;
  DELETE FROM public.coding_skips WHERE user_id = p_user_id;
  DELETE FROM public.coding_collection_items
   WHERE collection_id IN (SELECT collection_id FROM public.coding_collections WHERE user_id = p_user_id);
  DELETE FROM public.coding_collections WHERE user_id = p_user_id;
  DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.cosmetic_entitlements WHERE user_id = p_user_id;
  DELETE FROM public.token_ledger WHERE user_id = p_user_id;
  DELETE FROM public.token_balances WHERE user_id = p_user_id;
  DELETE FROM public.merch_order_items
   WHERE order_id IN (SELECT order_id FROM public.merch_orders
                       WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled'));
  DELETE FROM public.merch_orders
   WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled');
  UPDATE public.merch_orders
     SET user_id = 'deleted-account',
         ship_name = 'redacted', ship_line1 = 'redacted', ship_line2 = NULL,
         ship_city = 'redacted', ship_postal = 'redacted', updated_at = NOW()
   WHERE user_id = p_user_id;
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
  -- New in 033: a deleted account must not linger in anybody else's list.
  DELETE FROM public.friendships WHERE p_user_id IN (user_low, user_high);
  DELETE FROM public.user_handles WHERE user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Privileges. Every routine is service-role only: the browser reaches them
--    through api/user/[op].ts, which verifies the caller's token first.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.friend_user_for_handle(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_handle(TEXT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_handle(TEXT, TEXT)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_handle_discoverable(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_lookup(TEXT, TEXT)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_friend(TEXT, TEXT)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_friend(TEXT, TEXT, BOOLEAN)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_friend(TEXT, TEXT, BOOLEAN)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_list(TEXT, TEXT[])             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_requests(TEXT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_user_data(TEXT)                FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.friend_user_for_handle(TEXT, BOOLEAN)  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_handle(TEXT)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_handle(TEXT, TEXT)            TO service_role;
GRANT EXECUTE ON FUNCTION public.set_handle_discoverable(TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_lookup(TEXT, TEXT)              TO service_role;
GRANT EXECUTE ON FUNCTION public.request_friend(TEXT, TEXT)             TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_friend(TEXT, TEXT, BOOLEAN)    TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_friend(TEXT, TEXT, BOOLEAN)     TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_list(TEXT, TEXT[])              TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_requests(TEXT)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT)                 TO service_role;
