-- Migration 004: live multiplayer + classroom matches.
-- Apply in Supabase SQL Editor after migrations 001-003.
-- Also requires Supabase Realtime to be enabled (Project → Realtime).

CREATE TABLE IF NOT EXISTS matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  mode          TEXT NOT NULL CHECK (mode IN ('multiplayer', 'classroom')),
  host_id      TEXT NOT NULL,
  host_name     TEXT,
  status        TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'running', 'finished')),
  questions     JSONB NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_code ON matches(code);
CREATE INDEX IF NOT EXISTS idx_matches_host ON matches(host_id, created_at DESC);

CREATE TABLE IF NOT EXISTS match_participants (
  match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  display_name TEXT NOT NULL,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS match_answers (
  match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  question_id   TEXT NOT NULL,
  question_idx  INTEGER NOT NULL,
  selected_idx  INTEGER NOT NULL,
  is_correct    BOOLEAN NOT NULL,
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  answered_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id, question_idx)
);

CREATE INDEX IF NOT EXISTS idx_match_answers_summary
  ON match_answers(match_id, user_id, is_correct);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_answers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read a match by code (the code is the access
-- credential — keep it short but unguessable, e.g. 6 chars from
-- crockford-base32 alphabet).
CREATE POLICY "matches_read"
  ON matches FOR SELECT USING (true);

-- Only the host can mutate their own match.
CREATE POLICY "matches_write_host"
  ON matches FOR UPDATE
  USING (host_id = auth.uid()::text)
  WITH CHECK (host_id = auth.uid()::text);

CREATE POLICY "matches_insert_self"
  ON matches FOR INSERT
  WITH CHECK (host_id = auth.uid()::text);

-- Participants: anyone in the match can read; insert your own row only.
CREATE POLICY "participants_read"
  ON match_participants FOR SELECT USING (true);

CREATE POLICY "participants_insert_self"
  ON match_participants FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Answers: insert your own only; read your own only (final aggregates go
-- through an RPC the host can call).
CREATE POLICY "answers_read_self"
  ON match_answers FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "answers_insert_self"
  ON match_answers FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- RPC: leaderboard for a match (callable by anyone in the match).
CREATE OR REPLACE FUNCTION public.match_scoreboard(p_match_id UUID)
RETURNS TABLE (user_id TEXT, display_name TEXT, correct INTEGER, total_ms BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
         p.display_name,
         COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::INT AS correct,
         COALESCE(SUM(a.duration_ms), 0)::BIGINT AS total_ms
    FROM match_participants p
    LEFT JOIN match_answers a
      ON a.match_id = p.match_id AND a.user_id = p.user_id
   WHERE p.match_id = p_match_id
   GROUP BY p.user_id, p.display_name
   ORDER BY correct DESC, total_ms ASC;
$$;

GRANT EXECUTE ON FUNCTION public.match_scoreboard(UUID) TO authenticated, anon;

-- RPC: global leaderboard (top 100 by lifetime accuracy and volume).
CREATE OR REPLACE FUNCTION public.global_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  display_name   TEXT,
  picture        TEXT,
  total_correct  INTEGER,
  total_quizzes  INTEGER,
  longest_streak INTEGER,
  current_streak INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(name, split_part(email, '@', 1), 'Anonymous') AS display_name,
         picture,
         total_correct,
         total_quizzes,
         longest_streak,
         current_streak
    FROM user_stats
   WHERE total_quizzes > 0
   ORDER BY total_correct DESC, longest_streak DESC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.global_leaderboard(INTEGER) TO authenticated, anon;

-- RPC: daily challenge leaderboard (for a given UTC date).
CREATE OR REPLACE FUNCTION public.daily_leaderboard(p_date DATE, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  display_name TEXT,
  picture      TEXT,
  correct      INTEGER,
  total        INTEGER,
  duration_ms  INTEGER,
  attempted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(u.name, split_part(u.email, '@', 1), 'Anonymous') AS display_name,
         u.picture,
         d.correct,
         d.total,
         d.duration_ms,
         d.created_at AS attempted_at
    FROM daily_attempts d
    LEFT JOIN user_stats u ON u.user_id = d.user_id
   WHERE d.challenge_date = p_date
   ORDER BY d.correct DESC, d.duration_ms ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.daily_leaderboard(DATE, INTEGER) TO authenticated, anon;
