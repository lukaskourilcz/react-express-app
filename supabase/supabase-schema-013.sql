-- Migration 013: per-user quest XP (career leveling).
-- Stores the "quest" experience points a user has accumulated from quizzes and
-- practice replays, so their career rank follows them across devices. Learning
-- XP is NOT stored here — it is derived deterministically from roadmap_progress
-- (migration 011), so it can't be farmed and never needs a separate write.
-- Merged client-side and server-side by taking the max (XP only grows). Apply
-- after 012.

CREATE TABLE IF NOT EXISTS user_xp (
  user_id    TEXT PRIMARY KEY,
  quest_xp   BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Each user can only see/manage their own XP row. The server-side API uses the
-- service-role key (bypasses RLS) and scopes every query by the verified token
-- subject; these policies are defense-in-depth for direct PostgREST access.
CREATE POLICY "user_xp_select_own"
  ON user_xp FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_xp_insert_own"
  ON user_xp FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_xp_update_own"
  ON user_xp FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
