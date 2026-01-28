-- Supabase Schema for User Stats
-- Run this in your Supabase SQL Editor

CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id TEXT UNIQUE NOT NULL,
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

-- Create index for faster lookups by auth0_id
CREATE INDEX idx_user_stats_auth0_id ON user_stats(auth0_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own data
CREATE POLICY "Users can read own stats"
  ON user_stats
  FOR SELECT
  USING (true);

-- Policy: Allow insert for new users
CREATE POLICY "Users can insert own stats"
  ON user_stats
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow users to update their own stats
CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR UPDATE
  USING (true);
