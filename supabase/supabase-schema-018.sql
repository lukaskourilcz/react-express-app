-- Migration 018: Biggest Shark Challenge leaderboard.
--
-- Stores one row per finished run. The challenge runs until the learner racks
-- up three wrong answers; `score` is the number of correct answers before that
-- third strike. Public reads (so the home page can show the top scorer);
-- writes flow through the service-role API.

CREATE TABLE IF NOT EXISTS challenge_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text NOT NULL,
  score int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_scores_name_length CHECK (char_length(name) BETWEEN 1 AND 40),
  CONSTRAINT challenge_scores_score_range CHECK (score >= 0 AND score <= 100000)
);

CREATE INDEX IF NOT EXISTS challenge_scores_top_idx
  ON challenge_scores (score DESC, created_at);

ALTER TABLE challenge_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_scores_read" ON challenge_scores;
CREATE POLICY "challenge_scores_read"
  ON challenge_scores FOR SELECT
  USING (true);
