-- Migration 047: launch-audit fixes (2026-09-29). Apply after 046. Safe to
-- re-run: every statement is CREATE OR REPLACE, DROP ... IF EXISTS or an
-- idempotent UPDATE. No table or column changes.
--
--   1. purchase_streak_protection charged only the first purchase at a given
--      balance in a month: its debit id was (month, remaining), so a second
--      purchase at the same balance replayed the first debit and was free.
--   2. remove_friend let a blocked account overwrite the other party's block
--      with its own and then lift it; the friendships policy showed a block to
--      the blocked party through the Data API.
--   3. A daily challenge started before 00:00 UTC and submitted after it failed
--      the daily_attempts trigger, which rolled back the whole quiz result
--      (stats, XP, streak).
--   4. user_stats.picture accepted any https URL from the request body, and the
--      public leaderboards load it for every visitor. Only the Google avatar
--      host the client accepts is stored now; other stored URLs are cleared.
--   5. sync_user_badges raised on every call ("badge_id is ambiguous").
--   6. complete_verified_roadmap_attempt counted a coding task whose solution
--      was revealed in the same attempt.

-- ---------------------------------------------------------------------------
-- 1. Every streak-protection purchase is its own ledger event.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_streak_protection(
  p_user_id TEXT,
  p_subject TEXT,
  p_price   INTEGER
)
RETURNS TABLE (bought BOOLEAN, period TEXT, remaining INTEGER, used JSONB, shield_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row    public.user_streak_freezes%ROWTYPE;
  v_period TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_prefix TEXT;
  v_n      INTEGER;
BEGIN
  IF p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;

  PERFORM public.refresh_streak_freezes(p_user_id);
  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  IF COALESCE(v_row.remaining, 0) >= 2 THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
    RETURN;
  END IF;

  -- The row lock above serialises one account's purchases, so the count is
  -- exact and the id is new for every purchase (old ':0'/':1' ids included).
  v_prefix := 'streak-protection:' || p_user_id || ':' || v_period || ':';
  SELECT COUNT(*) INTO v_n
    FROM public.token_ledger l
   WHERE l.user_id = p_user_id AND l.reference = 'streak-protection'
     AND left(l.event_id, length(v_prefix)) = v_prefix;
  IF NOT public.debit_tokens(p_user_id, v_prefix || 'p' || (v_n + 1)::TEXT,
                             p_subject, p_price, 'purchase', 'streak-protection') THEN
    RAISE EXCEPTION 'protection_not_charged';
  END IF;

  UPDATE public.user_streak_freezes
     SET remaining = LEAST(COALESCE(v_row.remaining, 0) + 1, 2),
         period = v_period,
         updated_at = NOW()
   WHERE user_id = p_user_id
   RETURNING * INTO v_row;

  RETURN QUERY SELECT TRUE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_streak_protection(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_streak_protection(TEXT, TEXT, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. A block belongs to whoever set it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_friend(
  p_user_id TEXT,
  p_handle  TEXT,
  p_block   BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_other TEXT := public.friend_user_for_handle(p_handle, FALSE);
  v_low   TEXT;
  v_high  TEXT;
  v_hit   INTEGER;
BEGIN
  IF v_other IS NULL THEN RAISE EXCEPTION 'handle_not_found'; END IF;
  v_low  := LEAST(p_user_id, v_other);
  v_high := GREATEST(p_user_id, v_other);

  IF p_block THEN
    INSERT INTO public.friendships (user_low, user_high, requested_by, state, blocked_by)
    VALUES (v_low, v_high, p_user_id, 'blocked', p_user_id)
    ON CONFLICT (user_low, user_high) DO UPDATE
       SET state = 'blocked', blocked_by = p_user_id, updated_at = NOW()
     WHERE public.friendships.state <> 'blocked';   -- keep an existing block as it is
    RETURN TRUE;
  END IF;

  DELETE FROM public.friendships f
   WHERE f.user_low = v_low AND f.user_high = v_high
     AND (f.state <> 'blocked' OR f.blocked_by = p_user_id);
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  RETURN v_hit > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_friend(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(TEXT, TEXT, BOOLEAN) TO service_role;

DROP POLICY IF EXISTS "friendships_select_party" ON public.friendships;
CREATE POLICY "friendships_select_party"
  ON public.friendships FOR SELECT TO authenticated
  USING ((SELECT auth.uid()::TEXT) IN (user_low, user_high)
         AND (state <> 'blocked' OR blocked_by = (SELECT auth.uid()::TEXT)));

-- ---------------------------------------------------------------------------
-- 3. A daily started before 00:00 UTC is still yesterday's daily.
-- ---------------------------------------------------------------------------
-- The session lives 1 h and the result receipt 1 h after grading, so two hours
-- of grace after midnight covers every valid late submission.
CREATE OR REPLACE FUNCTION public.enforce_current_daily_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF NEW.challenge_date = v_today OR
     (NEW.challenge_date = v_today - 1 AND
      NOW() < (v_today::TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '2 hours') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'invalid_daily_date';
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Only Google avatars on the public boards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_stats_safe_picture()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.picture IS NOT NULL AND
     NEW.picture !~ '^https://([a-z0-9-]+\.)*googleusercontent\.com/' THEN
    NEW.picture := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_stats_safe_picture ON public.user_stats;
CREATE TRIGGER user_stats_safe_picture
  BEFORE INSERT OR UPDATE OF picture ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.user_stats_safe_picture();
UPDATE public.user_stats SET picture = NULL
 WHERE picture IS NOT NULL AND picture !~ '^https://([a-z0-9-]+\.)*googleusercontent\.com/';

-- ---------------------------------------------------------------------------
-- 5. sync_user_badges names its conflict target.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_badges(
  p_user_id TEXT,
  p_subject TEXT,
  p_badge_ids JSONB
)
RETURNS TABLE (badge_id TEXT, earned_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') THEN
    RAISE EXCEPTION 'invalid_subject';
  END IF;
  IF jsonb_typeof(p_badge_ids) = 'array' AND jsonb_array_length(p_badge_ids) <= 100 THEN
    INSERT INTO public.user_badges (user_id, subject, badge_id)
    SELECT p_user_id, p_subject, value
      FROM jsonb_array_elements_text(p_badge_ids) AS value
     WHERE value ~ '^[a-z0-9-]{1,50}$'
    ON CONFLICT ON CONSTRAINT user_badges_pkey DO NOTHING;
  END IF;
  RETURN QUERY
    SELECT b.badge_id, b.earned_at
      FROM public.user_badges b
     WHERE b.user_id = p_user_id AND b.subject = p_subject
     ORDER BY b.earned_at ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_user_badges(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_badges(TEXT, TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. A revealed coding task does not complete a Learn level.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_verified_roadmap_attempt(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_coding_task_ids JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.roadmap_attempts%ROWTYPE;
  v_answer_count INTEGER;
  v_correct INTEGER;
  v_pct INTEGER;
  v_passed BOOLEAN;
  v_data JSONB;
  v_kind_key TEXT;
  v_existing JSONB;
  v_best INTEGER;
  v_was_passed BOOLEAN;
  v_level INTEGER;
  v_day_key TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_pass_days JSONB;
  v_distinct INTEGER;
  v_mastered BOOLEAN;
  v_mastered_at TEXT;
  v_entry JSONB;
  v_coding_passed INTEGER := 0;
BEGIN
  SELECT * INTO v_attempt
    FROM public.roadmap_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;
  IF NOT FOUND OR v_attempt.user_id IS DISTINCT FROM p_user_id OR
     v_attempt.expires_at < NOW() THEN
    RAISE EXCEPTION 'invalid_roadmap_attempt';
  END IF;
  IF v_attempt.completed_at IS NOT NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
    INTO v_answer_count, v_correct
    FROM public.roadmap_attempt_answers
   WHERE attempt_id = p_attempt_id;
  IF v_answer_count IS DISTINCT FROM v_attempt.total_questions THEN
    RAISE EXCEPTION 'incomplete_roadmap_attempt';
  END IF;

  INSERT INTO public.roadmap_progress (user_id, data)
  VALUES (p_user_id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT COALESCE(data, '{}'::jsonb) INTO v_data
    FROM public.roadmap_progress
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_attempt.required_level_start IS NOT NULL THEN
    FOR v_level IN v_attempt.required_level_start..v_attempt.required_level_end LOOP
      IF COALESCE((v_data #>> ARRAY[v_attempt.topic, 'levels', v_level::TEXT, 'passed'])::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'roadmap_prerequisite_not_met';
      END IF;
    END LOOP;
  END IF;

  v_pct := ROUND(100.0 * v_correct / v_attempt.total_questions)::INTEGER;
  v_passed := v_pct >= v_attempt.pass_pct;

  -- Coding gate (migration 025): a level that carries coding tasks passes only
  -- when every task the sealed session named has a passed verdict recorded for
  -- this attempt. The question score still decides the percentage shown.
  -- Migration 047: a task whose solution was revealed in this attempt no longer
  -- counts, as docs/product-architecture.md has always said ("a reveal ends the
  -- current Learn level attempt"); the learner passes it in a fresh attempt.
  IF v_passed AND p_coding_task_ids IS NOT NULL AND jsonb_typeof(p_coding_task_ids) = 'array'
     AND jsonb_array_length(p_coding_task_ids) > 0 THEN
    IF jsonb_array_length(p_coding_task_ids) > 5 THEN
      RAISE EXCEPTION 'invalid_roadmap_attempt';
    END IF;
    SELECT COUNT(*) INTO v_coding_passed
      FROM jsonb_array_elements_text(p_coding_task_ids) AS wanted(task_id)
      JOIN public.roadmap_attempt_coding rac
        ON rac.attempt_id = p_attempt_id AND rac.task_id = wanted.task_id
       AND rac.passed AND NOT rac.revealed
     WHERE wanted.task_id ~ '^[a-z0-9-]{3,64}$';
    IF v_coding_passed < jsonb_array_length(p_coding_task_ids) THEN
      v_passed := FALSE;
    END IF;
  END IF;
  UPDATE public.roadmap_attempts
     SET completed_at = NOW(), score_pct = v_pct, passed = v_passed
   WHERE attempt_id = p_attempt_id;

  IF NOT (v_data ? v_attempt.topic) THEN
    v_data := jsonb_set(v_data, ARRAY[v_attempt.topic], '{"levels":{},"checkpoints":{}}'::jsonb, TRUE);
  END IF;
  v_kind_key := CASE WHEN v_attempt.kind = 'level' THEN 'levels' ELSE 'checkpoints' END;
  IF jsonb_typeof(v_data #> ARRAY[v_attempt.topic, v_kind_key]) IS DISTINCT FROM 'object' THEN
    v_data := jsonb_set(v_data, ARRAY[v_attempt.topic, v_kind_key], '{}'::jsonb, TRUE);
  END IF;
  v_existing := v_data #> ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT];
  v_best := GREATEST(COALESCE((v_existing->>'bestPct')::INTEGER, 0), v_pct);
  v_was_passed := COALESCE((v_existing->>'passed')::BOOLEAN, FALSE);

  v_entry := jsonb_build_object('passed', v_was_passed OR v_passed, 'bestPct', v_best);

  -- Mastery tracking applies only to Learn levels. Record one distinct UTC day
  -- per passing attempt; three distinct days mark the level mastered.
  IF v_attempt.kind = 'level' THEN
    v_pass_days := COALESCE(v_existing->'passDays', '[]'::jsonb);
    IF jsonb_typeof(v_pass_days) IS DISTINCT FROM 'array' THEN
      v_pass_days := '[]'::jsonb;
    END IF;
    IF v_passed AND NOT (v_pass_days @> to_jsonb(v_day_key)) THEN
      IF jsonb_array_length(v_pass_days) < 12 THEN
        v_pass_days := v_pass_days || to_jsonb(v_day_key);
      END IF;
    END IF;
    v_distinct := jsonb_array_length(v_pass_days);
    v_mastered := COALESCE((v_existing->>'mastered')::BOOLEAN, FALSE) OR v_distinct >= 3;
    v_mastered_at := v_existing->>'masteredAt';
    IF v_mastered AND v_mastered_at IS NULL THEN
      v_mastered_at := v_day_key;
    END IF;
    v_entry := v_entry
      || jsonb_build_object('passDays', v_pass_days, 'mastered', v_mastered);
    IF v_passed THEN
      v_entry := v_entry || jsonb_build_object('lastPassDay', v_day_key);
    ELSIF v_existing ? 'lastPassDay' THEN
      v_entry := v_entry || jsonb_build_object('lastPassDay', v_existing->>'lastPassDay');
    END IF;
    IF v_mastered_at IS NOT NULL THEN
      v_entry := v_entry || jsonb_build_object('masteredAt', v_mastered_at);
    END IF;
  END IF;

  v_data := jsonb_set(
    v_data,
    ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT],
    v_entry,
    TRUE
  );
  UPDATE public.roadmap_progress SET data = v_data, updated_at = NOW()
   WHERE user_id = p_user_id;

  INSERT INTO public.user_streak (user_id, days)
  VALUES (p_user_id, jsonb_build_object(v_day_key, 1))
  ON CONFLICT (user_id) DO UPDATE SET
    days = jsonb_set(
      COALESCE(public.user_streak.days, '{}'::jsonb), ARRAY[v_day_key],
      to_jsonb(LEAST(50, COALESCE((public.user_streak.days ->> v_day_key)::INTEGER, 0) + 1)), TRUE
    ),
    updated_at = NOW();
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  TO service_role;
