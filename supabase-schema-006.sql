-- Migration 006: host heartbeat for stale-match cleanup, configurable
-- category leaderboard threshold. Apply in Supabase SQL Editor after
-- migrations 001-005.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_matches_running_heartbeat
  ON matches(status, last_heartbeat_at)
  WHERE status = 'running';

-- Replacement category_leaderboard with a configurable minimum-attempts
-- threshold (default 5, capped at 100 to prevent foot-guns).
DROP FUNCTION IF EXISTS public.category_leaderboard(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.category_leaderboard(
  p_category     TEXT,
  p_limit        INTEGER DEFAULT 50,
  p_min_attempts INTEGER DEFAULT 5
)
RETURNS TABLE (
  display_name    TEXT,
  picture         TEXT,
  total_correct   INTEGER,
  total_questions INTEGER,
  accuracy_pct    INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(u.name, split_part(u.email, '@', 1), 'Anonymous') AS display_name,
         u.picture,
         c.total_correct,
         c.total_questions,
         CASE WHEN c.total_questions > 0
              THEN ROUND(100.0 * c.total_correct / c.total_questions)::INT
              ELSE 0 END AS accuracy_pct
    FROM user_category_stats c
    LEFT JOIN user_stats u ON u.auth0_id = c.auth0_id
   WHERE c.category = p_category
     AND c.total_questions >= GREATEST(LEAST(p_min_attempts, 100), 1)
   ORDER BY c.total_correct DESC,
            c.total_questions ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.category_leaderboard(TEXT, INTEGER, INTEGER)
  TO authenticated, anon;
