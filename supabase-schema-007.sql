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
      USING (auth0_id = auth.jwt() ->> 'sub');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_stats' AND policyname='stats_insert_own') THEN
    CREATE POLICY "stats_insert_own" ON user_stats FOR INSERT
      WITH CHECK (auth0_id = auth.jwt() ->> 'sub');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_stats' AND policyname='stats_update_own') THEN
    CREATE POLICY "stats_update_own" ON user_stats FOR UPDATE
      USING (auth0_id = auth.jwt() ->> 'sub')
      WITH CHECK (auth0_id = auth.jwt() ->> 'sub');
  END IF;
END $$;

-- 2. Revoke anon write access from RPCs ------------------------------------
-- Anonymous (anon) callers can still execute via PostgREST otherwise.
-- These mutations must only be reachable via the server-side API after JWT
-- verification — i.e. via the service-role key.

REVOKE EXECUTE ON FUNCTION public.record_quiz_result(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_category_stats(TEXT, JSONB) FROM anon;

-- Keep `authenticated` execute granted so authed clients can still call via
-- PostgREST if/when Auth0 JWTs are forwarded to Supabase.
GRANT EXECUTE ON FUNCTION public.record_quiz_result(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_category_stats(TEXT, JSONB) TO authenticated;

-- 3. Ensure match_answers idempotency key ----------------------------------
-- The API uses upsert(..., onConflict: 'match_id,auth0_sub,question_idx').
-- Make sure that uniqueness constraint exists so retries replace rather
-- than duplicate.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_answers_match_sub_qidx_uniq'
  ) THEN
    EXECUTE 'ALTER TABLE match_answers
      ADD CONSTRAINT match_answers_match_sub_qidx_uniq
      UNIQUE (match_id, auth0_sub, question_idx)';
  END IF;
END $$;
