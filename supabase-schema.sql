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

-- Safe by default: no anon access. Mutations go through the server-side API
-- (which uses SUPABASE_SERVICE_ROLE_KEY in production, bypassing RLS); reads
-- by authenticated users are scoped to their own row via Auth0 JWT sub.
--
-- Supabase must be configured to accept Auth0 JWTs (Settings → Auth → JWT)
-- so that `auth.jwt() ->> 'sub'` returns the user's Auth0 user_id. Until
-- that integration is set up, leave the policies as-is — the server-side
-- service-role key still works because RLS doesn't apply to it.

CREATE POLICY "stats_select_own"
  ON user_stats FOR SELECT
  USING (auth0_id = auth.jwt() ->> 'sub');

CREATE POLICY "stats_insert_own"
  ON user_stats FOR INSERT
  WITH CHECK (auth0_id = auth.jwt() ->> 'sub');

CREATE POLICY "stats_update_own"
  ON user_stats FOR UPDATE
  USING (auth0_id = auth.jwt() ->> 'sub')
  WITH CHECK (auth0_id = auth.jwt() ->> 'sub');
