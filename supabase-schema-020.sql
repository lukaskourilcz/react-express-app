-- Migration 020: per-subject (per-platform) XP + leaderboards.
-- Apply in Supabase SQL Editor after migrations 001-019.
--
-- Each StudyShark platform (Web Dev, Geography, Math, …) now counts XP,
-- tokens and shop inventory separately. Wallets and inventories ride in the
-- roadmap_progress `extra` jsonb (no schema change needed); quest XP gets a
-- per-subject jsonb map here, and the all-time leaderboard gets a
-- subject-scoped RPC that sums per-category stats over one subject's
-- categories (subjects' categories are disjoint, so the sum is exact).

-- 1. Per-subject quest XP -----------------------------------------------
-- Map of subject id → quest XP (e.g. {"webdev": 1200, "geography": 300}).
-- The existing quest_xp column stays as the monotone total for old clients.
ALTER TABLE user_xp
  ADD COLUMN IF NOT EXISTS quest_xp_by_subject JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Subject-scoped all-time leaderboard --------------------------------
-- Sums each user's lifetime per-category stats over the given categories
-- (the API passes one subject's category list). Requires at least 5 answered
-- questions in the subject, mirroring category_leaderboard's floor.
CREATE OR REPLACE FUNCTION public.subject_leaderboard(
  p_categories TEXT[],
  p_limit      INTEGER DEFAULT 100
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
         SUM(c.total_correct)::INT AS total_correct,
         SUM(c.total_questions)::INT AS total_questions,
         CASE WHEN SUM(c.total_questions) > 0
              THEN ROUND(100.0 * SUM(c.total_correct) / SUM(c.total_questions))::INT
              ELSE 0 END AS accuracy_pct
    FROM user_category_stats c
    LEFT JOIN user_stats u ON u.user_id = c.user_id
   WHERE c.category = ANY(p_categories)
   GROUP BY c.user_id, u.name, u.email, u.picture
  HAVING SUM(c.total_questions) >= 5
   ORDER BY SUM(c.total_correct) DESC,
            SUM(c.total_questions) ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.subject_leaderboard(TEXT[], INTEGER) TO authenticated, anon;
