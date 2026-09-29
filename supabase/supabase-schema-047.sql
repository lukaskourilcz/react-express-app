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
--   7. grant_daily_queue_cards failed with a 500 for the whole day when a pack
--      held the same card twice (about one pack in five).
--   8. friend_list showed a friend's stored streak, which only changes on
--      their next quiz, so a streak that ended weeks ago still showed.
--   9. record_verified_quiz_result_v2 let a later daily receipt replace the
--      first daily score on the Today board; the first verified one stands.
--  10. Stored names that are just the account's email address are cleared:
--      the client used the email as a fallback name, and the boards are public.

-- ---------------------------------------------------------------------------
-- 1. Every streak-protection purchase is its own ledger event.
-- ---------------------------------------------------------------------------
-- Each purchase gets its own event id, numbered by the purchases already
-- charged this month (035's ':0'/':1' ids included), and nothing is granted
-- unless the debit went through. The row lock taken before the ceiling check
-- serialises one learner's purchases, so two requests cannot pick the same
-- number, and the ceiling makes a repeated request at two charge nothing.
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
  v_bought INTEGER;
BEGIN
  IF p_price <= 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;

  PERFORM public.refresh_streak_freezes(p_user_id);
  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  -- The ceiling is the point. Two is what everybody gets; buying restores what
  -- was spent and never exceeds it, so no amount of learning-earned currency
  -- buys a bigger reserve than a learner who spends nothing has.
  IF COALESCE(v_row.remaining, 0) >= 2 THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
    RETURN;
  END IF;

  -- 'streak-protection:<user>:<YYYY-MM>:' then 'n1', 'n2', ... The 'n' keeps
  -- the new ids clear of 035's ':0' and ':1', which are counted all the same.
  v_prefix := 'streak-protection:' || p_user_id || ':' || v_period || ':';
  SELECT COUNT(*)::INTEGER INTO v_bought
    FROM public.token_ledger l
   WHERE l.user_id = p_user_id
     AND starts_with(l.event_id, v_prefix);

  -- debit_tokens raises insufficient_tokens itself. FALSE means the event
  -- was already in the ledger: nothing was charged, so nothing is granted.
  IF NOT public.debit_tokens(
    p_user_id, v_prefix || 'n' || (v_bought + 1)::TEXT,
    p_subject, p_price, 'purchase', 'streak-protection'
  ) THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
    RETURN;
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

-- ---------------------------------------------------------------------------
-- 7. A pack that repeats a card adds to its count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_daily_queue_cards(
  p_user_id TEXT,
  p_subject TEXT,
  p_date DATE,
  p_card_ids JSONB
)
RETURNS TABLE (status TEXT, granted_cards JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted INTEGER;
  v_existing JSONB;
BEGIN
  IF p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_date IS DISTINCT FROM (NOW() AT TIME ZONE 'UTC')::DATE OR
     jsonb_typeof(p_card_ids) IS DISTINCT FROM 'array' OR
     jsonb_array_length(p_card_ids) = 0 OR jsonb_array_length(p_card_ids) > 10 THEN
    RAISE EXCEPTION 'invalid_card_grant';
  END IF;

  INSERT INTO public.daily_queue_completions (user_id, subject, queue_date, granted_cards)
  VALUES (p_user_id, p_subject, p_date, p_card_ids)
  ON CONFLICT (user_id, subject, queue_date) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT c.granted_cards INTO v_existing
      FROM public.daily_queue_completions c
     WHERE c.user_id = p_user_id AND c.subject = p_subject AND c.queue_date = p_date;
    RETURN QUERY SELECT 'claimed'::TEXT, COALESCE(v_existing, '[]'::jsonb);
    RETURN;
  END IF;

  INSERT INTO public.user_cards (user_id, subject, card_id, count)
  SELECT p_user_id, p_subject, value, COUNT(*)::INTEGER
    FROM jsonb_array_elements_text(p_card_ids) AS value
   WHERE value ~ '^[a-z0-9-]{1,60}$'
   GROUP BY value
  ON CONFLICT (user_id, subject, card_id) DO UPDATE SET
    count = LEAST(100000, public.user_cards.count + EXCLUDED.count);

  RETURN QUERY SELECT 'granted'::TEXT, p_card_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_daily_queue_cards(TEXT, TEXT, DATE, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_daily_queue_cards(TEXT, TEXT, DATE, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. A friend's streak as it stands today.
-- ---------------------------------------------------------------------------
-- Restated from 040 with one column changed: current_streak is the live
-- streak, by the rule record_verified_quiz_result_v2 applies on return and the
-- Profile shows (client/src/lib/streakFreezes.ts liveStreak).
CREATE OR REPLACE FUNCTION public.friend_list(p_user_id TEXT, p_categories TEXT[])
RETURNS TABLE (
  handle          TEXT,
  picture         TEXT,
  country         TEXT,
  crown           BOOLEAN,
  current_streak  INTEGER,
  longest_streak  INTEGER,
  total_correct   INTEGER,
  total_questions INTEGER,
  accuracy_pct    INTEGER,
  active_today    BOOLEAN,
  since           TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH mine AS (
    SELECT CASE WHEN f.user_low = p_user_id THEN f.user_high ELSE f.user_low END AS friend_id,
           COALESCE(f.responded_at, f.created_at) AS since
      FROM public.friendships f
     WHERE f.state = 'accepted'
       AND p_user_id IN (f.user_low, f.user_high)
  )
  SELECT h.handle,
         s.picture,
         h.country,
         EXISTS (
           SELECT 1 FROM public.cosmetic_entitlements ce
            WHERE ce.user_id = m.friend_id
              AND ce.cosmetic_id = 'crown'
              AND ce.equipped
         ),
         (CASE
            WHEN s.last_quiz_date IS NULL OR COALESCE(s.current_streak, 0) <= 0 THEN 0
            WHEN s.last_quiz_date >= (NOW() AT TIME ZONE 'UTC')::DATE - 1 THEN s.current_streak
            WHEN s.last_quiz_date < (NOW() AT TIME ZONE 'UTC')::DATE - 6 THEN 0
            ELSE (
              SELECT CASE
                       WHEN COUNT(*) = 0 THEN s.current_streak
                       WHEN COUNT(*) <= 2 AND COUNT(*) <= CASE
                              WHEN fz.period = TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM')
                              THEN COALESCE(fz.remaining, 0)
                              ELSE 2
                            END
                         THEN s.current_streak
                       ELSE 0
                     END
                FROM generate_series(s.last_quiz_date + 1, (NOW() AT TIME ZONE 'UTC')::DATE - 1, INTERVAL '1 day') AS gap(day)
               WHERE fz.shield_until IS NULL
                  OR gap.day::DATE < (fz.shield_until - INTERVAL '48 hours')::DATE
                  OR gap.day::DATE > fz.shield_until::DATE
            )
          END)::INT,
         COALESCE(s.longest_streak, 0)::INT,
         COALESCE(c.total_correct, 0)::INT,
         COALESCE(c.total_questions, 0)::INT,
         CASE WHEN COALESCE(c.total_questions, 0) > 0
              THEN ROUND(100.0 * c.total_correct / c.total_questions)::INT
              ELSE 0 END,
         (s.last_quiz_date = (NOW() AT TIME ZONE 'UTC')::DATE) IS TRUE,
         m.since
    FROM mine m
    JOIN public.user_handles h ON h.user_id = m.friend_id
    LEFT JOIN public.user_stats s ON s.user_id = m.friend_id
    LEFT JOIN public.user_streak_freezes fz ON fz.user_id = m.friend_id
    LEFT JOIN LATERAL (
      SELECT SUM(k.total_correct)   AS total_correct,
             SUM(k.total_questions) AS total_questions
        FROM public.user_category_stats k
       WHERE k.user_id = m.friend_id
         AND k.category = ANY(p_categories)
    ) c ON TRUE
   ORDER BY COALESCE(c.total_correct, 0) DESC,
            CASE WHEN COALESCE(c.total_questions, 0) > 0
                 THEN 100.0 * c.total_correct / c.total_questions
                 ELSE -1 END DESC,
            h.handle ASC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.friend_list(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.friend_list(TEXT, TEXT[]) TO service_role;

-- ---------------------------------------------------------------------------
-- 9. The first verified daily result stands.
-- ---------------------------------------------------------------------------
-- Restated from 040; only the daily block changes. quiz/submit now ranks only
-- a learner's fixed attempt of the day, so a second receipt for the same day
-- can only be one minted before that deploy.
CREATE OR REPLACE FUNCTION public.record_verified_quiz_result_v2(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_correct INTEGER,
  p_total INTEGER,
  p_breakdown JSONB,
  p_outcomes JSONB,
  p_subject TEXT,
  p_quest_xp INTEGER,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_picture TEXT DEFAULT NULL,
  p_daily_date DATE DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_period TEXT := TO_CHAR(v_today, 'YYYY-MM');
  v_applied INTEGER;
  rec RECORD;
  v_prev_streak INTEGER;
  v_prev_date DATE;
  v_shield_from DATE;
  v_shield_to DATE;
  v_missed INTEGER := 0;
  v_new_streak INTEGER;
  v_remaining INTEGER;
  v_used JSONB;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_correct < 0 OR p_total <= 0 OR p_correct > p_total OR p_total > 50 OR
     p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_quest_xp < 0 OR p_quest_xp > 10000 OR
     (p_duration_ms IS NOT NULL AND (p_duration_ms < 0 OR p_duration_ms > 86400000)) OR
     (p_daily_date IS NULL) <> (p_duration_ms IS NULL) THEN
    RAISE EXCEPTION 'invalid_quiz_result';
  END IF;

  INSERT INTO public.quiz_attempts (attempt_id, user_id)
  VALUES (p_attempt_id, p_user_id)
  ON CONFLICT (attempt_id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  IF v_applied = 0 THEN RETURN FALSE; END IF;

  -- One daily result per user/date/subject: the first verified one. A later
  -- receipt for the same day neither replaces it on the board nor mutates
  -- stats and XP. quiz/submit ranks only the learner's stable attempt of the
  -- day, so a second receipt can only be one minted before that change.
  IF p_daily_date IS NOT NULL THEN
    INSERT INTO public.daily_attempts (
      user_id, challenge_date, subject, correct, total, duration_ms
    ) VALUES (
      p_user_id, p_daily_date, p_subject, p_correct, p_total, p_duration_ms
    )
    ON CONFLICT (user_id, challenge_date, subject) DO NOTHING;
    GET DIAGNOSTICS v_applied = ROW_COUNT;
    IF v_applied = 0 THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Read the previous streak state under a row lock so the freeze-aware
  -- computation below cannot race concurrent tabs.
  SELECT current_streak, last_quiz_date INTO v_prev_streak, v_prev_date
    FROM public.user_stats
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_prev_date IS NULL THEN
    v_new_streak := 1;                       -- first ever activity
  ELSIF v_prev_date = v_today THEN
    v_new_streak := COALESCE(v_prev_streak, 1);  -- already active today
  ELSE
    -- The learner's own shield, if one was raised. A shield covers the two
    -- days up to its expiry; days inside that window are already paid for and
    -- are not missed days.
    SELECT (shield_until - INTERVAL '48 hours')::DATE, shield_until::DATE
      INTO v_shield_from, v_shield_to
      FROM public.user_streak_freezes
     WHERE user_id = p_user_id AND shield_until IS NOT NULL;

    -- Count the missed days strictly between the last active day and today,
    -- ignoring any the shield covers.
    SELECT COUNT(*) INTO v_missed
      FROM generate_series(v_prev_date + 1, v_today - 1, INTERVAL '1 day') AS gap(day)
     WHERE v_shield_to IS NULL
        OR gap.day::DATE < v_shield_from
        OR gap.day::DATE > v_shield_to;

    IF v_missed = 0 THEN
      v_new_streak := COALESCE(v_prev_streak, 0) + 1;
    ELSE
      -- Try to bridge the gap with the monthly freeze budget. refresh_streak_
      -- freezes creates/locks the row and resets a stale month before returning
      -- the live balance.
      SELECT period, remaining, used INTO v_period, v_remaining, v_used
        FROM public.refresh_streak_freezes(p_user_id);

      IF v_remaining >= v_missed AND v_missed <= 2 THEN
        UPDATE public.user_streak_freezes
           SET remaining = v_remaining - v_missed,
               used = (
                 SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                 FROM (
                   SELECT elem FROM jsonb_array_elements(v_used) AS elem
                   UNION ALL
                   SELECT to_jsonb(TO_CHAR(gap.day, 'YYYY-MM-DD'))
                     FROM generate_series(v_prev_date + 1, v_today - 1, INTERVAL '1 day') AS gap(day)
                    WHERE v_shield_to IS NULL
                       OR gap.day::DATE < v_shield_from
                       OR gap.day::DATE > v_shield_to
                   LIMIT 24
                 ) AS merged
               ),
               updated_at = NOW()
         WHERE user_id = p_user_id;
        v_new_streak := COALESCE(v_prev_streak, 0) + 1;
      ELSE
        v_new_streak := 1;                   -- gap too large: streak restarts
      END IF;
    END IF;
  END IF;

  INSERT INTO public.user_stats (
    user_id, email, name, picture, total_quizzes, total_correct,
    total_questions, current_streak, longest_streak, last_quiz_date
  ) VALUES (
    p_user_id, p_email, p_name, p_picture, 1, p_correct,
    p_total, v_new_streak, v_new_streak, v_today
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_stats.email),
    name = COALESCE(EXCLUDED.name, public.user_stats.name),
    picture = COALESCE(EXCLUDED.picture, public.user_stats.picture),
    total_quizzes = public.user_stats.total_quizzes + 1,
    total_correct = public.user_stats.total_correct + EXCLUDED.total_correct,
    total_questions = public.user_stats.total_questions + EXCLUDED.total_questions,
    current_streak = v_new_streak,
    longest_streak = GREATEST(public.user_stats.longest_streak, v_new_streak),
    last_quiz_date = v_today,
    updated_at = NOW();

  IF p_breakdown IS NOT NULL AND jsonb_typeof(p_breakdown) = 'object' THEN
    FOR rec IN
      SELECT key AS category,
             (value->>'correct')::INTEGER AS correct,
             (value->>'total')::INTEGER AS total
      FROM jsonb_each(p_breakdown)
    LOOP
      IF rec.category !~ '^[a-z0-9-]{1,50}$' OR rec.total <= 0 OR
         rec.total > 50 OR rec.correct < 0 OR rec.correct > rec.total THEN
        CONTINUE;
      END IF;
      INSERT INTO public.user_category_stats (
        user_id, category, total_correct, total_questions, updated_at
      ) VALUES (
        p_user_id, rec.category, rec.correct, rec.total, NOW()
      )
      ON CONFLICT (user_id, category) DO UPDATE SET
        total_correct = public.user_category_stats.total_correct + EXCLUDED.total_correct,
        total_questions = public.user_category_stats.total_questions + EXCLUDED.total_questions,
        updated_at = NOW();
      -- New in 040: the same batch, dated, for the windowed boards. It sits
      -- behind the same receipt as the lines above: a replayed attempt and a
      -- daily retry both returned before reaching this loop.
      PERFORM public.add_activity_day(p_user_id, v_today, rec.category, rec.correct, rec.total);
    END LOOP;
  END IF;

  IF p_outcomes IS NOT NULL AND jsonb_typeof(p_outcomes) = 'array' THEN
    FOR rec IN
      SELECT value->>'questionId' AS question_id,
             value->>'category' AS category,
             (value->>'isCorrect')::BOOLEAN AS is_correct
        FROM jsonb_array_elements(p_outcomes)
       LIMIT 50
    LOOP
      IF rec.question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
         rec.category !~ '^[a-z0-9-]{1,50}$' THEN
        CONTINUE;
      END IF;
      INSERT INTO public.user_question_history (
        user_id, question_id, subject, category, times_seen, times_missed,
        last_seen_at, last_missed_at
      ) VALUES (
        p_user_id, rec.question_id, p_subject, rec.category, 1,
        CASE WHEN rec.is_correct THEN 0 ELSE 1 END,
        NOW(), CASE WHEN rec.is_correct THEN NULL ELSE NOW() END
      )
      ON CONFLICT (user_id, subject, question_id) DO UPDATE SET
        category = EXCLUDED.category,
        times_seen = public.user_question_history.times_seen + 1,
        times_missed = public.user_question_history.times_missed +
          CASE WHEN rec.is_correct THEN 0 ELSE 1 END,
        last_seen_at = NOW(),
        last_missed_at = CASE
          WHEN rec.is_correct THEN public.user_question_history.last_missed_at
          ELSE NOW()
        END;
    END LOOP;
  END IF;

  IF p_quest_xp > 0 THEN
    INSERT INTO public.user_xp (user_id, quest_xp, quest_xp_by_subject)
    VALUES (p_user_id, p_quest_xp, jsonb_build_object(p_subject, p_quest_xp))
    ON CONFLICT (user_id) DO UPDATE SET
      quest_xp = LEAST(100000000, public.user_xp.quest_xp + p_quest_xp),
      quest_xp_by_subject = jsonb_set(
        COALESCE(public.user_xp.quest_xp_by_subject, '{}'::jsonb),
        ARRAY[p_subject],
        to_jsonb(LEAST(
          100000000,
          COALESCE((public.user_xp.quest_xp_by_subject ->> p_subject)::BIGINT, 0) + p_quest_xp
        )),
        TRUE
      ),
      updated_at = NOW();
  END IF;

  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.record_verified_quiz_result_v2(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result_v2(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 10. No email address stands in for a name.
-- ---------------------------------------------------------------------------
UPDATE public.user_stats SET name = NULL, updated_at = NOW()
 WHERE name IS NOT NULL AND email IS NOT NULL AND lower(btrim(name)) = lower(btrim(email));
