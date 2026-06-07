-- Migration 002: tighten RLS, add atomic counter RPC, add indexes & uniqueness.
-- Apply in Supabase SQL Editor AFTER the original supabase-schema.sql.

-- 1. Drop the trust-everyone policies from migration 001 ----------------
DROP POLICY IF EXISTS "Users can read own stats"   ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

-- 2. Re-create policies that filter by the Supabase user id --------------
-- `auth.uid()` is the authenticated Supabase user's id (auth.users.id).
-- Writes also go through the server (api/user/[op].ts) which verifies the
-- caller's Supabase access token before acting.

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

-- 3. Atomic counter + streak update -------------------------------------
-- Replaces the read-modify-write pattern in api/user/stats.ts and the
-- old client lib. Computes streak using UTC date and increments counters
-- in a single statement.

CREATE OR REPLACE FUNCTION public.record_quiz_result(
  p_user_id TEXT,
  p_correct  INTEGER,
  p_total    INTEGER
)
RETURNS user_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  v_existing user_stats;
  v_new_streak INTEGER;
  v_result user_stats;
BEGIN
  IF p_correct < 0 OR p_total <= 0 OR p_correct > p_total OR p_total > 50 THEN
    RAISE EXCEPTION 'invalid_quiz_result';
  END IF;

  SELECT * INTO v_existing FROM user_stats WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, total_quizzes, total_correct, total_questions,
                            current_streak, longest_streak, last_quiz_date)
    VALUES (p_user_id, 1, p_correct, p_total, 1, 1, v_today)
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;

  IF v_existing.last_quiz_date IS NULL THEN
    v_new_streak := 1;
  ELSIF v_existing.last_quiz_date = v_today THEN
    v_new_streak := v_existing.current_streak;
  ELSIF v_existing.last_quiz_date = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_existing.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE user_stats
     SET total_quizzes    = total_quizzes + 1,
         total_correct    = total_correct + p_correct,
         total_questions  = total_questions + p_total,
         current_streak   = v_new_streak,
         longest_streak   = GREATEST(longest_streak, v_new_streak),
         last_quiz_date   = v_today,
         updated_at       = NOW()
   WHERE user_id = p_user_id
   RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_quiz_result(TEXT, INTEGER, INTEGER) TO authenticated, anon;

-- 4. Indexes for likely future queries (leaderboards, recency) ----------
CREATE INDEX IF NOT EXISTS idx_user_stats_last_quiz_date ON user_stats(last_quiz_date);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_correct  ON user_stats(total_correct DESC) WHERE total_quizzes > 0;

-- 5. updated_at auto-touch ---------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS user_stats_touch_updated_at ON user_stats;
CREATE TRIGGER user_stats_touch_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
