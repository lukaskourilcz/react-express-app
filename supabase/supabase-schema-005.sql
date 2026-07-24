-- Migration 005: per-category stats, match question timing,
-- per-question answer distribution. Apply in Supabase SQL Editor
-- after migrations 001-004.

-- 1. Per-category lifetime stats ---------------------------------------
CREATE TABLE IF NOT EXISTS user_category_stats (
  user_id        TEXT NOT NULL,
  category        TEXT NOT NULL,
  total_correct   INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_category_stats_category_correct
  ON user_category_stats(category, total_correct DESC) WHERE total_questions > 0;

ALTER TABLE user_category_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_stats_select_self"
  ON user_category_stats FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "category_stats_upsert_self"
  ON user_category_stats FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "category_stats_update_self"
  ON user_category_stats FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Atomically apply a per-category breakdown.
-- Input shape: jsonb object {javascript:{correct:3,total:5}, react:{...}}
CREATE OR REPLACE FUNCTION public.record_category_stats(
  p_user_id TEXT,
  p_breakdown JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF p_breakdown IS NULL THEN RETURN; END IF;

  FOR rec IN
    SELECT key AS category,
           (value->>'correct')::INT AS correct,
           (value->>'total')::INT AS total
      FROM jsonb_each(p_breakdown)
  LOOP
    IF rec.total IS NULL OR rec.total <= 0 THEN CONTINUE; END IF;
    IF rec.correct < 0 OR rec.correct > rec.total OR rec.total > 100 THEN CONTINUE; END IF;
    IF length(rec.category) > 50 THEN CONTINUE; END IF;

    INSERT INTO user_category_stats (user_id, category, total_correct, total_questions, updated_at)
    VALUES (p_user_id, rec.category, rec.correct, rec.total, NOW())
    ON CONFLICT (user_id, category) DO UPDATE SET
      total_correct   = user_category_stats.total_correct + EXCLUDED.total_correct,
      total_questions = user_category_stats.total_questions + EXCLUDED.total_questions,
      updated_at      = NOW();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_category_stats(TEXT, JSONB) TO authenticated, anon;

-- Per-category leaderboard.
CREATE OR REPLACE FUNCTION public.category_leaderboard(
  p_category TEXT,
  p_limit    INTEGER DEFAULT 50
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
    LEFT JOIN user_stats u ON u.user_id = c.user_id
   WHERE c.category = p_category
     AND c.total_questions >= 5
   ORDER BY c.total_correct DESC,
            c.total_questions ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.category_leaderboard(TEXT, INTEGER) TO authenticated, anon;

-- 2. Match question timing for countdown & speed bonus ------------------
ALTER TABLE matches ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS question_duration_s INTEGER NOT NULL DEFAULT 30;

-- Add a speed_bonus column to match_answers so we can show it on the
-- scoreboard. Computed at insertion time by the API layer.
ALTER TABLE match_answers ADD COLUMN IF NOT EXISTS speed_bonus INTEGER NOT NULL DEFAULT 0;

-- Replacement scoreboard RPC that uses correct + speed_bonus.
-- PostgreSQL cannot CREATE OR REPLACE a function when its RETURNS TABLE shape
-- changes, so remove the schema-004 version before introducing the score field.
DROP FUNCTION IF EXISTS public.match_scoreboard(UUID);

CREATE OR REPLACE FUNCTION public.match_scoreboard(p_match_id UUID)
RETURNS TABLE (user_id TEXT, display_name TEXT, correct INTEGER, score INTEGER, total_ms BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
         p.display_name,
         COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::INT AS correct,
         COALESCE(SUM(CASE WHEN a.is_correct THEN 100 + a.speed_bonus ELSE 0 END), 0)::INT AS score,
         COALESCE(SUM(a.duration_ms), 0)::BIGINT AS total_ms
    FROM match_participants p
    LEFT JOIN match_answers a
      ON a.match_id = p.match_id AND a.user_id = p.user_id
   WHERE p.match_id = p_match_id
   GROUP BY p.user_id, p.display_name
   ORDER BY score DESC, total_ms ASC;
$$;

-- 3. Per-question answer distribution for classroom histograms ----------
CREATE OR REPLACE FUNCTION public.match_question_distribution(
  p_match_id   UUID,
  p_question_idx INTEGER
)
RETURNS TABLE (selected_idx INTEGER, count INTEGER, correct BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.selected_idx,
         COUNT(*)::INT AS count,
         BOOL_AND(a.is_correct) AS correct
    FROM match_answers a
   WHERE a.match_id = p_match_id
     AND a.question_idx = p_question_idx
   GROUP BY a.selected_idx
   ORDER BY a.selected_idx;
$$;

GRANT EXECUTE ON FUNCTION public.match_question_distribution(UUID, INTEGER) TO authenticated, anon;
