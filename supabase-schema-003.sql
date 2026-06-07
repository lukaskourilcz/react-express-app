-- Migration 003: question reporting + daily challenge attempts.
-- Apply in Supabase SQL Editor after migrations 001 and 002.

-- Question reports (used by /api/quiz/report) ---------------------------
CREATE TABLE IF NOT EXISTS question_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   TEXT NOT NULL,
  reason        TEXT NOT NULL,
  detail        TEXT,
  reporter_sub  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_reports_question_id ON question_reports(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reports_created_at  ON question_reports(created_at DESC);

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert a report (about a question they saw).
CREATE POLICY "report_insert_any"
  ON question_reports FOR INSERT
  WITH CHECK (true);

-- No one but the project owner (service role bypasses RLS) can read.
-- Add a SELECT policy here if you build an admin UI.

-- Daily challenge attempts ---------------------------------------------
CREATE TABLE IF NOT EXISTS daily_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  challenge_date DATE NOT NULL,
  correct       INTEGER NOT NULL,
  total         INTEGER NOT NULL,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_attempts_date_score
  ON daily_attempts(challenge_date, correct DESC, duration_ms ASC);

ALTER TABLE daily_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_select_self"
  ON daily_attempts FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "daily_insert_self"
  ON daily_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);
