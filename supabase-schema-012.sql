-- Migration 012: per-user practice streak / activity garden (mobile).
-- Stores the daily activity map (date → lessons completed) that powers the
-- mobile streak screen and the iOS Home Screen widget, so the streak follows the
-- user across devices. Merged client-side (max per day). Apply after 011.

CREATE TABLE IF NOT EXISTS user_streak (
  user_id    TEXT PRIMARY KEY,
  days       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_streak ENABLE ROW LEVEL SECURITY;

-- Each user can only see/manage their own streak. The server-side API uses the
-- service-role key (bypasses RLS) and scopes every query by the verified token
-- subject; these policies are defense-in-depth for direct PostgREST access.
CREATE POLICY "user_streak_select_own"
  ON user_streak FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_streak_insert_own"
  ON user_streak FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_streak_update_own"
  ON user_streak FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
