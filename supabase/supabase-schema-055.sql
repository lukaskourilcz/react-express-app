-- Migration 055: sharknames, and what friends and the boards see of a learner
-- (owner decisions 1 and 9, 1 Oct 2026). Apply after 054.
--
-- Safe to re-run, and the code running when it is applied keeps working: ADD
-- COLUMN IF NOT EXISTS with FALSE defaults, a CHECK that only widens, and
-- routines restated with the same names and arguments. friend_list,
-- friend_lookup and friend_requests return one more column (display_name),
-- so they are dropped and created again; the whole file is one transaction,
-- so no caller ever finds one missing. The code in production reads its
-- columns by name and ignores the new one.
--
--   1. A handle may be 32 characters (it was 24), so a generated sharkname
--      such as `shark-so-fat-it-cant-swim` fits. Same start and end rules,
--      same reserved words. set_user_handle checks the same pattern.
--   2. user_handles.show_real_name: friends see the learner's Google name
--      instead of the sharkname. Off by default. Only a name the server took
--      from the Google identity counts (user_stats.name); with none, the
--      sharkname shows. friend_display_name() is that rule.
--   3. user_handles.show_photo_to_friends: friends see the Google photo.
--      Off by default, so from this migration friends see an initials avatar
--      until the learner switches it on. friend_list used to return the
--      photo whatever the learner had chosen.
--   4. set_friend_display() writes both switches; api/user/[op].ts
--      (op=identity) calls it after checking the account has a Google name
--      or photo to show.
--   5. Who sees the name: accepted friends (friend_list, and friend_lookup
--      once the state is 'accepted'), and the person a learner sent a request
--      to (an incoming row of friend_requests). A stranger who looks a handle
--      up, and a learner looking at their own outgoing request, see the
--      sharkname. The photo is only ever in friend_list.
--   6. The public boards name a learner with board_display_name(): nobody
--      ("Learner") until user_stats.show_on_leaderboards is on, then the
--      sharkname, or the Google name when show_real_name is on. A learner
--      with no sharkname keeps showing the Google name they consented to
--      under 049. So an email/password account, which has no Google name,
--      can appear on a board by its sharkname. The photo rule is unchanged:
--      show_on_leaderboards alone decides it.
--   7. The ten seed friends (seed-friend-*) get sharknames. Each rename runs
--      only while the account still has its old handle and nobody else holds
--      the new one, so a re-run, or a rename made since, is left alone. Their
--      progress, country and friendships are not touched.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Handles up to 32 characters
-- ---------------------------------------------------------------------------
--
-- 033 wrote the rule as an unnamed column CHECK, which Postgres named
-- user_handles_handle_check. Dropping and adding it again re-validates every
-- row, which all pass: the old rule was the stricter one.

ALTER TABLE public.user_handles DROP CONSTRAINT IF EXISTS user_handles_handle_check;
ALTER TABLE public.user_handles
  ADD CONSTRAINT user_handles_handle_check
  CHECK (handle ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$');

-- Restated from 033 with the wider pattern; nothing else changes.
CREATE OR REPLACE FUNCTION public.set_user_handle(p_user_id TEXT, p_handle TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_clean    TEXT := btrim(p_handle);
  v_existing public.user_handles;
BEGIN
  IF v_clean !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$' THEN
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

-- ---------------------------------------------------------------------------
-- 2. What friends see
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_handles
  ADD COLUMN IF NOT EXISTS show_real_name BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.user_handles
  ADD COLUMN IF NOT EXISTS show_photo_to_friends BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_handles.show_real_name IS
  'Friends (and the public boards, when show_on_leaderboards is on) see the Google name instead of the sharkname. Off by default (migration 055).';
COMMENT ON COLUMN public.user_handles.show_photo_to_friends IS
  'Accepted friends see the Google photo; otherwise an initials avatar. Off by default (migration 055).';

-- The name a friend sees: the sharkname, or the Google name when the learner
-- chose it and the server holds one. NULL for an account without a handle,
-- which no friend can have.
CREATE OR REPLACE FUNCTION public.friend_display_name(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN h.show_real_name
              THEN COALESCE(NULLIF(BTRIM(s.name), ''), h.handle)
              ELSE h.handle END
    FROM public.user_handles h
    LEFT JOIN public.user_stats s ON s.user_id = h.user_id
   WHERE h.user_id = p_user_id
$$;

-- Both switches in one call. NULL leaves a switch as it is. No handle row
-- means nobody can be a friend of this account yet, so there is nothing to
-- show anybody: refused, like a country without a handle (036).
CREATE OR REPLACE FUNCTION public.set_friend_display(
  p_user_id        TEXT,
  p_show_real_name BOOLEAN DEFAULT NULL,
  p_show_photo     BOOLEAN DEFAULT NULL
)
RETURNS TABLE (show_real_name BOOLEAN, show_photo_to_friends BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_name  BOOLEAN;
  v_photo BOOLEAN;
BEGIN
  UPDATE public.user_handles h
     SET show_real_name        = COALESCE(p_show_real_name, h.show_real_name),
         show_photo_to_friends = COALESCE(p_show_photo, h.show_photo_to_friends),
         updated_at            = NOW()
   WHERE h.user_id = p_user_id
  RETURNING h.show_real_name, h.show_photo_to_friends INTO v_name, v_photo;

  IF NOT FOUND THEN RAISE EXCEPTION 'no_handle'; END IF;
  RETURN QUERY SELECT v_name, v_photo;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. The friends routines, with the display name and the photo switch
-- ---------------------------------------------------------------------------

-- Restated from 033 with display_name: the sharkname, unless the two are
-- already friends, in which case it is the friend's chosen name. A stranger
-- who types a handle learns nothing the handle did not already say.
DROP FUNCTION IF EXISTS public.friend_lookup(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.friend_lookup(p_user_id TEXT, p_handle TEXT)
RETURNS TABLE (handle TEXT, state TEXT, display_name TEXT)
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
    RETURN QUERY SELECT v_handle, 'self'::TEXT, public.friend_display_name(v_other);
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

  RETURN QUERY SELECT v_handle, v_state,
    CASE WHEN v_state = 'accepted' THEN public.friend_display_name(v_other) ELSE v_handle END;
END;
$$;

-- Restated from 033 with display_name. An incoming request carries the
-- asker's chosen name: they sent it to this person. An outgoing one carries
-- the other person's sharkname until they accept.
DROP FUNCTION IF EXISTS public.friend_requests(TEXT);
CREATE OR REPLACE FUNCTION public.friend_requests(p_user_id TEXT)
RETURNS TABLE (handle TEXT, direction TEXT, requested_at TIMESTAMPTZ, display_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT h.handle,
         CASE WHEN f.requested_by = p_user_id THEN 'outgoing' ELSE 'incoming' END,
         f.created_at,
         CASE WHEN f.requested_by = p_user_id THEN h.handle
              ELSE public.friend_display_name(h.user_id) END
    FROM public.friendships f
    JOIN public.user_handles h
      ON h.user_id = CASE WHEN f.user_low = p_user_id THEN f.user_high ELSE f.user_low END
   WHERE f.state = 'pending'
     AND p_user_id IN (f.user_low, f.user_high)
   ORDER BY f.created_at DESC
   LIMIT 100;
$$;

-- Restated from 052 with display_name and the photo behind its switch.
-- Neither moves anybody: the order is still correct answers, then accuracy,
-- then handle.
DROP FUNCTION IF EXISTS public.friend_list(TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION public.friend_list(p_user_id TEXT, p_categories TEXT[])
RETURNS TABLE (
  handle          TEXT,
  picture         TEXT,
  country         TEXT,
  crown           BOOLEAN,
  current_streak  INTEGER,
  longest_streak  INTEGER,
  total_correct   INTEGER,
  total_questions INTEGER,
  accuracy_pct    INTEGER,
  active_today    BOOLEAN,
  since           TIMESTAMPTZ,
  display_name    TEXT
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
         CASE WHEN h.show_photo_to_friends THEN s.picture END,
         h.country,
         EXISTS (
           SELECT 1 FROM public.cosmetic_entitlements ce
            WHERE ce.user_id = m.friend_id
              AND ce.cosmetic_id = 'crown'
              AND ce.equipped
         ),
         public.streak_live(
           s.current_streak, s.last_quiz_date, (NOW() AT TIME ZONE 'UTC')::DATE,
           fz.shield_days, fz.shield_until, fz.period, fz.remaining
         )::INT,
         COALESCE(s.longest_streak, 0)::INT,
         COALESCE(c.total_correct, 0)::INT,
         COALESCE(c.total_questions, 0)::INT,
         CASE WHEN COALESCE(c.total_questions, 0) > 0
              THEN ROUND(100.0 * c.total_correct / c.total_questions)::INT
              ELSE 0 END,
         (s.last_quiz_date = (NOW() AT TIME ZONE 'UTC')::DATE) IS TRUE,
         m.since,
         public.friend_display_name(m.friend_id)
    FROM mine m
    JOIN public.user_handles h ON h.user_id = m.friend_id
    LEFT JOIN public.user_stats s ON s.user_id = m.friend_id
    LEFT JOIN public.user_streak_freezes fz ON fz.user_id = m.friend_id
    LEFT JOIN LATERAL (
      SELECT SUM(k.total_correct)   AS total_correct,
             SUM(k.total_questions) AS total_questions
        FROM public.user_category_stats k
       WHERE k.user_id = m.friend_id
         AND k.category = ANY(p_categories)
    ) c ON TRUE
   ORDER BY COALESCE(c.total_correct, 0) DESC,
            CASE WHEN COALESCE(c.total_questions, 0) > 0
                 THEN 100.0 * c.total_correct / c.total_questions
                 ELSE -1 END DESC,
            h.handle ASC
   LIMIT 200;
$$;

-- ---------------------------------------------------------------------------
-- 4. The name on a public board
-- ---------------------------------------------------------------------------
--
-- One rule for every board, the "This month" board included: NULL (the
-- client's "Learner") until the learner switched on show_on_leaderboards;
-- then the sharkname, or the Google name if they chose it for friends; and,
-- for a learner with no sharkname, the Google name, as 049 showed it. A
-- learner with no stats row has not switched anything on.
CREATE OR REPLACE FUNCTION public.board_display_name(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
           WHEN NOT u.show_on_leaderboards THEN NULL
           WHEN h.user_id IS NULL THEN NULLIF(BTRIM(u.name), '')
           WHEN h.show_real_name THEN COALESCE(NULLIF(BTRIM(u.name), ''), h.handle)
           ELSE h.handle
         END
    FROM public.user_stats u
    LEFT JOIN public.user_handles h ON h.user_id = u.user_id
   WHERE u.user_id = p_user_id
$$;

-- The four boards of 049, restated with board_display_name() for the name and
-- nothing else changed. The picture still follows show_on_leaderboards alone.

CREATE OR REPLACE FUNCTION public.window_leaderboard(
  p_days        INTEGER,
  p_limit       INTEGER DEFAULT 100,
  p_category    TEXT    DEFAULT NULL,
  p_min_answers INTEGER DEFAULT 5,
  p_viewer      TEXT    DEFAULT NULL
)
RETURNS TABLE (
  rank         INTEGER,
  display_name TEXT,
  picture      TEXT,
  correct      INTEGER,
  answered     INTEGER,
  accuracy_pct INTEGER,
  is_viewer    BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH totals AS (
    SELECT a.user_id,
           SUM(a.correct)::INT  AS correct,
           SUM(a.answered)::INT AS answered
      FROM public.user_activity_days a
     WHERE a.day >= (NOW() AT TIME ZONE 'UTC')::DATE
                    - (GREATEST(LEAST(COALESCE(p_days, 30), 366), 1) - 1)
       AND (p_category IS NULL OR a.category = p_category)
     GROUP BY a.user_id
    HAVING SUM(a.answered) >= GREATEST(COALESCE(p_min_answers, 5), 1)
  ),
  ranked AS (
    SELECT t.user_id, t.correct, t.answered,
           RANK() OVER (ORDER BY t.correct DESC, t.answered ASC)::INT AS rank
      FROM totals t
  )
  SELECT r.rank,
         public.board_display_name(r.user_id),
         CASE WHEN u.show_on_leaderboards THEN u.picture END,
         r.correct,
         r.answered,
         CASE WHEN r.answered > 0
              THEN ROUND(100.0 * r.correct / r.answered)::INT
              ELSE 0 END,
         (p_viewer IS NOT NULL AND r.user_id = p_viewer)
    FROM ranked r
    LEFT JOIN public.user_stats u ON u.user_id = r.user_id
   ORDER BY r.rank ASC, r.user_id ASC
   LIMIT GREATEST(LEAST(COALESCE(p_limit, 100), 200), 1);
$$;

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
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH totals AS (
    SELECT a.user_id,
           SUM(a.correct)::INT  AS correct,
           SUM(a.answered)::INT AS answered
      FROM public.user_activity_days a
     WHERE a.category = ANY(p_categories)
     GROUP BY a.user_id
    HAVING SUM(a.answered) >= 5
  )
  SELECT public.board_display_name(t.user_id),
         CASE WHEN u.show_on_leaderboards THEN u.picture END,
         t.correct,
         t.answered,
         CASE WHEN t.answered > 0
              THEN ROUND(100.0 * t.correct / t.answered)::INT
              ELSE 0 END
    FROM totals t
    LEFT JOIN public.user_stats u ON u.user_id = t.user_id
   ORDER BY t.correct DESC, t.answered ASC, t.user_id ASC
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
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH totals AS (
    SELECT a.user_id,
           SUM(a.correct)::INT  AS correct,
           SUM(a.answered)::INT AS answered
      FROM public.user_activity_days a
     WHERE a.category = p_category
     GROUP BY a.user_id
    HAVING SUM(a.answered) >= GREATEST(LEAST(p_min_attempts, 100), 1)
  )
  SELECT public.board_display_name(t.user_id),
         CASE WHEN u.show_on_leaderboards THEN u.picture END,
         t.correct,
         t.answered,
         CASE WHEN t.answered > 0
              THEN ROUND(100.0 * t.correct / t.answered)::INT
              ELSE 0 END
    FROM totals t
    LEFT JOIN public.user_stats u ON u.user_id = t.user_id
   ORDER BY t.correct DESC, t.answered ASC, t.user_id ASC
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
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.board_display_name(d.user_id),
         CASE WHEN u.show_on_leaderboards THEN u.picture END,
         d.correct, d.total, d.duration_ms, d.created_at
    FROM public.daily_attempts d
    LEFT JOIN public.user_stats u ON u.user_id = d.user_id
   WHERE d.challenge_date = p_date
     AND d.subject = p_subject
     AND p_subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
   ORDER BY d.correct DESC, d.created_at ASC, d.user_id ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

-- ---------------------------------------------------------------------------
-- 5. The ten seed friends get sharknames
-- ---------------------------------------------------------------------------
--
-- Rolled by shared/sharkname.ts and checked to be distinct valid handles. All
-- are 24 characters or fewer, so the API in production when this is applied,
-- which still checks 3–24, can answer and remove them. A rename happens only
-- while the account still has its old handle and the new one is free.

UPDATE public.user_handles h
   SET handle = v.new_handle, updated_at = NOW()
  FROM (VALUES
    ('seed-friend-amara-o', 'amara-o', 'el-tiburon-tremendo'),
    ('seed-friend-jonas-b', 'jonas-b', 'sharky-mc-burritoface'),
    ('seed-friend-lena-k',  'lena-k',  'muy-thirsty-sharkie'),
    ('seed-friend-mia-dev', 'mia-dev', 'fin-de-siesta'),
    ('seed-friend-nina-v',  'nina-v',  'mucho-drama-fin'),
    ('seed-friend-pablo-r', 'pablo-r', 'kale-no-bueno-tiburon'),
    ('seed-friend-ravi-p',  'ravi-p',  'deployed-lantern-shark'),
    ('seed-friend-sofia-m', 'sofia-m', 'gracias-sharkie'),
    ('seed-friend-tomas-h', 'tomas-h', 'stealthy-cat-shark'),
    ('seed-friend-yuki-t',  'yuki-t',  'mucho-nap-chomper')
  ) AS v(user_id, old_handle, new_handle)
 WHERE h.user_id = v.user_id
   AND h.handle = v.old_handle
   AND NOT EXISTS (
     SELECT 1 FROM public.user_handles taken WHERE taken.handle_key = lower(v.new_handle)
   );

-- ---------------------------------------------------------------------------
-- 6. Privileges: service role only, as for every friends routine
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.set_user_handle(TEXT, TEXT)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_display_name(TEXT)                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_friend_display(TEXT, BOOLEAN, BOOLEAN)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_lookup(TEXT, TEXT)                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_requests(TEXT)                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.friend_list(TEXT, TEXT[])                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.board_display_name(TEXT)                       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.window_leaderboard(INTEGER, INTEGER, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER)      FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_user_handle(TEXT, TEXT)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_display_name(TEXT)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.set_friend_display(TEXT, BOOLEAN, BOOLEAN)   TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_lookup(TEXT, TEXT)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_requests(TEXT)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_list(TEXT, TEXT[])                    TO service_role;
GRANT EXECUTE ON FUNCTION public.board_display_name(TEXT)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.window_leaderboard(INTEGER, INTEGER, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER)         TO service_role;
GRANT EXECUTE ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER)    TO service_role;

COMMIT;
