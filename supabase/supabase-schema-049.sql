-- Migration 049: who is named on the public leaderboards, what Today ranks,
-- and what the all-time boards count (2026-09-29). Apply after 048. Safe to
-- re-run: ADD COLUMN IF NOT EXISTS and CREATE OR REPLACE only. Every routine
-- keeps its name, arguments and result columns, so the code in production
-- keeps working while this migration is ahead of it.
--
--   1. A learner's name and photo appear on a public board only after they
--      switch on user_stats.show_on_leaderboards. It is off for everybody,
--      existing learners included. Without it a row carries a NULL name and a
--      NULL picture, and the client draws its anonymous label ("Learner") and
--      the default avatar. The boards used to show every learner's Google
--      name and photo to anyone who opened them.
--   2. Today (daily_leaderboard_v2) is ordered by correct answers only. Equal
--      scores stay in the order they were recorded, which the client does not
--      rank by: it gives them one shared rank. The time is still returned
--      and still recorded; it no longer decides a place.
--   3. The all-time board (subject_leaderboard) and a topic's all-time board
--      (category_leaderboard) read user_activity_days with no date window, so
--      they count what the 30-day board counts: quizzes, the daily challenge,
--      a signed-in learner's first Learn answers and the Biggest Shark
--      Challenge. They used to read user_category_stats, which only quizzes
--      and the daily challenge write. user_activity_days starts at migration
--      040 (26 Sep 2026): older quiz history is not in it and is not copied
--      in, because the rows since 040 are already in both tables and a copy
--      would count them twice.
--
-- The ranking rule is unchanged everywhere: correct answers, then fewer
-- answers for the same number correct, never XP and never a streak.

-- ---------------------------------------------------------------------------
-- 1. The consent flag
-- ---------------------------------------------------------------------------
--
-- Written only by api/user/[op].ts (op=leaderboard-visibility) with the service
-- key: the browser has no write policy on user_stats (migration 021). The
-- quiz write path upserts user_stats with a column list that leaves this
-- column out, so a result never switches it back.

ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS show_on_leaderboards BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_stats.show_on_leaderboards IS
  'The learner switched on showing their name and photo on the public leaderboards. Off by default.';

-- ---------------------------------------------------------------------------
-- 2. The 30-day board
-- ---------------------------------------------------------------------------
--
-- Restated from 040 with the name and picture behind the flag and nothing
-- else changed. The caller's own row (p_viewer) follows the same rule: it
-- shows what everybody else sees, so switching the flag changes the
-- learner's own view of the board at once.

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
         CASE WHEN u.show_on_leaderboards THEN NULLIF(BTRIM(u.name), '') END,
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

REVOKE ALL ON FUNCTION public.window_leaderboard(INTEGER, INTEGER, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.window_leaderboard(INTEGER, INTEGER, TEXT, INTEGER, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3. The all-time boards, over dated activity
-- ---------------------------------------------------------------------------
--
-- The 30-day board's totals without its window. Five answers put a learner
-- on the subject's board, as on the 30-day board; a topic's board keeps its
-- p_min_attempts argument (the API sends 5). Rows arrive in rank order with
-- the account id as the last key, so equal results keep a stable order, and
-- the client gives them one shared rank.

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
  SELECT CASE WHEN u.show_on_leaderboards THEN NULLIF(BTRIM(u.name), '') END,
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
  SELECT CASE WHEN u.show_on_leaderboards THEN NULLIF(BTRIM(u.name), '') END,
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

-- ---------------------------------------------------------------------------
-- 4. Today
-- ---------------------------------------------------------------------------
--
-- Correct answers decide the place. For the same score the first result
-- recorded comes first, then the account id, only so the order is stable:
-- neither is a rank. The duration is returned as before.

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
  SELECT CASE WHEN u.show_on_leaderboards THEN NULLIF(BTRIM(u.name), '') END,
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

REVOKE ALL ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER) TO service_role;
