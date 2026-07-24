-- Migration 007: harden RLS and revoke anon write access.
-- Apply in Supabase SQL Editor AFTER migrations 001-006.

-- 1. Replace any leftover trust-everyone policies on user_stats ------------
DROP POLICY IF EXISTS "Users can read own stats"   ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

-- Create the JWT-scoped policies only if they don't already exist.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_stats' AND policyname='stats_select_own') THEN
    CREATE POLICY "stats_select_own" ON user_stats FOR SELECT
      USING (user_id = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_stats' AND policyname='stats_insert_own') THEN
    CREATE POLICY "stats_insert_own" ON user_stats FOR INSERT
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_stats' AND policyname='stats_update_own') THEN
    CREATE POLICY "stats_update_own" ON user_stats FOR UPDATE
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
END $$;

-- 2. Lock write RPCs to the server (service-role) only --------------------
-- These mutations take p_user_id as a parameter and run SECURITY DEFINER
-- (bypassing RLS), so any caller could forge another user's stats. They must
-- only be reachable via the server-side API, which uses the service-role key
-- (the service-role bypasses these grants).
-- NOTE: revoking FROM anon alone is ineffective — anon inherits EXECUTE from
-- PUBLIC. Revoke from PUBLIC and authenticated too.
REVOKE EXECUTE ON FUNCTION public.record_quiz_result(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_category_stats(TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- 3. Ensure match_answers idempotency key ----------------------------------
-- The API uses upsert(..., onConflict: 'match_id,user_id,question_idx').
-- Make sure that uniqueness constraint exists so retries replace rather
-- than duplicate.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_answers_match_sub_qidx_uniq'
  ) THEN
    EXECUTE 'ALTER TABLE match_answers
      ADD CONSTRAINT match_answers_match_sub_qidx_uniq
      UNIQUE (match_id, user_id, question_idx)';
  END IF;
END $$;
