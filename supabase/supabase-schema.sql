-- Supabase Schema for User Stats
-- Run this in your Supabase SQL Editor

CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  picture TEXT,
  total_quizzes INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quiz_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Safe by default: no anon access. Mutations go through the server-side API
-- (which verifies the Supabase access token before acting); reads by
-- authenticated users are scoped to their own row, where `auth.uid()` is the
-- authenticated Supabase user's id (auth.users.id).

CREATE POLICY "stats_select_own"
  ON user_stats FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "stats_insert_own"
  ON user_stats FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "stats_update_own"
  ON user_stats FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
