-- Migration 052: every shielded day is kept, a shield is never sold for a day
-- a protection still has to pay, the month change keeps the shield, the Shop
-- counts the same live streak as the Profile, a Challenge question counts on
-- the boards once a day, a quiz pays XP per fresh question, and a coding
-- verdict takes its locks in the order the Learn completion does
-- (2026-09-29). Apply after 051.
--
-- Safe to re-run, and the code running when it is applied keeps working: one
-- ADD COLUMN IF NOT EXISTS, a backfill that only fills empty rows, and
-- routines restated with the same names and arguments. Three routines return
-- one more column or take one more DEFAULT argument, so they are dropped and
-- created again; the whole file is one transaction, so no caller ever finds
-- one missing.
--
--   1. user_streak_freezes.shield_days keeps every UTC date a shield covered
--      in the last 40 days, and the month change never clears it. A second
--      shield used to overwrite shield_until, the only record of the first,
--      and the first shield's two days then counted as missed (review finding
--      RANK-1). Every reader takes a day as shielded when it is in
--      shield_days or in the window of shield_until, so a row from before
--      this migration reads as it did. streak_day_shielded,
--      streak_missed_days and streak_live are that one rule, shared by
--      advance_verified_streak, activate_streak_shield, friend_list and
--      settle_coin_milestones.
--   2. activate_streak_shield refuses, and spends nothing, when a missed day
--      between the last learning day and today still needs a protection and
--      spending one on the shield would leave too few (RANK-2): the streak
--      would end the moment the learner came back. It says so in a new
--      `outcome` column ('would_end_streak'); the handler answers 409
--      shield_would_end_streak. It also returns shield_days.
--   3. refresh_streak_freezes restores the month's two protections at the
--      month change and no longer clears the shield (RANK-3). It returns
--      shield_days for the Profile.
--   4. settle_coin_milestones counts the streak the Profile shows: a shield
--      or a protection still covering the gap keeps it (RANK-7).
--   5. record_coding_verdict writes the Learn attempt's coding row before it
--      advances the streak. The row's foreign key locks roadmap_attempts, and
--      complete_verified_roadmap_attempt locks that row and then user_stats;
--      taking user_stats first deadlocked the two (SEC-6).
--   6. record_challenge_completion takes the run's answers (p_outcomes) and
--      dates on the boards only the questions the learner had not answered
--      earlier the same UTC day, as the quiz routine does (PLAY-1). The
--      Challenge XP is unchanged. Without p_outcomes it counts the breakdown
--      as before.
--   7. record_verified_quiz_result_v2 pays each fresh question its own XP
--      when the receipt carries it (QUIZ-3); older receipts keep the share
--      formula of 048. A daily challenge with a fresh correct answer still
--      pays at least the 20 XP api/quiz/submit.ts gives every daily.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Every shielded date.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_streak_freezes
  ADD COLUMN IF NOT EXISTS shield_days DATE[] NOT NULL DEFAULT '{}'::DATE[];

COMMENT ON COLUMN public.user_streak_freezes.shield_days IS
  'Every UTC date a streak shield covered in the last 40 days, sorted (migration 052). Never reset by the month change. shield_until still holds the latest shield''s end.';

-- The shield running when this is applied: the raise date and the next one.
UPDATE public.user_streak_freezes
   SET shield_days = ARRAY[
         ((shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE,
         ((shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE + 1
       ]
 WHERE shield_until IS NOT NULL
   AND cardinality(shield_days) = 0;

-- ---------------------------------------------------------------------------
-- 1. The one rule for a missed day.
-- ---------------------------------------------------------------------------
-- A day is shielded when a shield covered it: it is in shield_days, or in the
-- two dates of shield_until's window (the raise date is shield_until - 48
-- hours, 048), which is all a row from before this migration has.
CREATE OR REPLACE FUNCTION public.streak_day_shielded(
  p_day          DATE,
  p_shield_days  DATE[],
  p_shield_until TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_day = ANY(COALESCE(p_shield_days, '{}'::DATE[]))
      OR (p_shield_until IS NOT NULL AND
          p_day BETWEEN ((p_shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE
                    AND ((p_shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE + 1);
$$;
REVOKE ALL ON FUNCTION public.streak_day_shielded(DATE, DATE[], TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.streak_day_shielded(DATE, DATE[], TIMESTAMPTZ) TO service_role;

-- The days strictly between the last learning day and today that no shield
-- covered: each needs a protection. A gap longer than every stored shield
-- could cover returns a lower bound, which is already more than the two
-- protections a month can bridge.
CREATE OR REPLACE FUNCTION public.streak_missed_days(
  p_last         DATE,
  p_today        DATE,
  p_shield_days  DATE[],
  p_shield_until TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_last IS NULL OR p_today IS NULL OR p_last >= p_today - 1 THEN 0
    WHEN p_today - p_last - 1 > COALESCE(cardinality(p_shield_days), 0) + 4
      THEN p_today - p_last - 1 - COALESCE(cardinality(p_shield_days), 0) - 2
    ELSE (
      SELECT COUNT(*)::INTEGER
        FROM generate_series(p_last + 1, p_today - 1, INTERVAL '1 day') AS gap(day)
       WHERE NOT public.streak_day_shielded(gap.day::DATE, p_shield_days, p_shield_until)
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.streak_missed_days(DATE, DATE, DATE[], TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.streak_missed_days(DATE, DATE, DATE[], TIMESTAMPTZ) TO service_role;

-- The streak as it stands today, as the Profile shows it (liveStreak in
-- client/src/lib/streakFreezes.ts): the recorded count while the missed days
-- are no more than two and no more than the protections left this month (two
-- when the stored balance belongs to an earlier month, which the next
-- learning day resets), and 0 otherwise.
CREATE OR REPLACE FUNCTION public.streak_live(
  p_streak       INTEGER,
  p_last         DATE,
  p_today        DATE,
  p_shield_days  DATE[],
  p_shield_until TIMESTAMPTZ,
  p_period       TEXT,
  p_remaining    INTEGER
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_last IS NULL OR COALESCE(p_streak, 0) <= 0 THEN 0
    WHEN m.missed = 0 THEN p_streak
    WHEN m.missed <= 2 AND m.missed <= CASE
           WHEN p_period = TO_CHAR(p_today, 'YYYY-MM') THEN COALESCE(p_remaining, 0)
           ELSE 2
         END
      THEN p_streak
    ELSE 0
  END
  FROM (SELECT public.streak_missed_days(p_last, p_today, p_shield_days, p_shield_until) AS missed) AS m;
$$;
REVOKE ALL ON FUNCTION public.streak_live(INTEGER, DATE, DATE, DATE[], TIMESTAMPTZ, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.streak_live(INTEGER, DATE, DATE, DATE[], TIMESTAMPTZ, TEXT, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. The month change restores the protections and keeps the shield.
-- ---------------------------------------------------------------------------
-- Restated from 032 with one more result column. The return type changes, so
-- it is dropped first; plpgsql callers resolve it when they run, and this
-- file is one transaction.
DROP FUNCTION IF EXISTS public.refresh_streak_freezes(TEXT);

CREATE FUNCTION public.refresh_streak_freezes(p_user_id TEXT)
RETURNS TABLE (period TEXT, remaining INTEGER, used JSONB, shield_until TIMESTAMPTZ, shield_days DATE[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_period TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_row public.user_streak_freezes%ROWTYPE;
BEGIN
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used)
  VALUES (p_user_id, v_period, 2, '[]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  -- A new month restores the two. The shield stays: its dates were paid for,
  -- and a shield covers only its own two dates, so it cannot reach into the
  -- new month. 032 cleared an ended shield here, and a learner who opened the
  -- Profile first lost the days it had covered.
  IF v_row.period IS DISTINCT FROM v_period THEN
    UPDATE public.user_streak_freezes
       SET period = v_period,
           remaining = 2,
           used = '[]'::jsonb,
           updated_at = NOW()
     WHERE user_id = p_user_id
     RETURNING * INTO v_row;
  END IF;

  RETURN QUERY SELECT v_row.period, v_row.remaining, v_row.used, v_row.shield_until, v_row.shield_days;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_streak_freezes(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_streak_freezes(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. One streak day, with every shielded date.
-- ---------------------------------------------------------------------------
-- Restated from 048. The missed days are the ones streak_missed_days counts,
-- so a day under any shield of the last 40 days is not missed.
CREATE OR REPLACE FUNCTION public.advance_verified_streak(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today        DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_prev_streak  INTEGER;
  v_prev_date    DATE;
  v_shield_days  DATE[];
  v_shield_until TIMESTAMPTZ;
  v_missed       INTEGER := 0;
  v_new_streak   INTEGER;
  v_period       TEXT;
  v_remaining    INTEGER;
  v_used         JSONB;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 THEN
    RAISE EXCEPTION 'invalid_streak_user';
  END IF;

  INSERT INTO public.user_stats (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT current_streak, last_quiz_date INTO v_prev_streak, v_prev_date
    FROM public.user_stats
   WHERE user_id = p_user_id
   FOR UPDATE;

  -- Today already counted: nothing moves, whatever else the learner does.
  IF v_prev_date IS NOT NULL AND v_prev_date >= v_today THEN
    RETURN COALESCE(v_prev_streak, 0);
  END IF;

  IF v_prev_date IS NULL THEN
    v_new_streak := 1;                         -- first verified learning day
  ELSE
    -- Days a shield covered were paid for in advance and are not missed.
    SELECT f.shield_days, f.shield_until INTO v_shield_days, v_shield_until
      FROM public.user_streak_freezes f
     WHERE f.user_id = p_user_id;
    v_missed := public.streak_missed_days(v_prev_date, v_today, v_shield_days, v_shield_until);

    IF v_missed = 0 THEN
      v_new_streak := COALESCE(v_prev_streak, 0) + 1;
    ELSE
      -- Bridge the gap with the month's protections. refresh_streak_freezes
      -- creates and locks the row and resets a stale month first.
      SELECT r.period, r.remaining, r.used INTO v_period, v_remaining, v_used
        FROM public.refresh_streak_freezes(p_user_id) AS r;

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
                    WHERE NOT public.streak_day_shielded(gap.day::DATE, v_shield_days, v_shield_until)
                   LIMIT 24
                 ) AS merged
               ),
               updated_at = NOW()
         WHERE user_id = p_user_id;
        v_new_streak := COALESCE(v_prev_streak, 0) + 1;
      ELSE
        v_new_streak := 1;                     -- gap too long: start again
      END IF;
    END IF;
  END IF;

  UPDATE public.user_stats
     SET current_streak = v_new_streak,
         longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
         last_quiz_date = v_today,
         updated_at = NOW()
   WHERE user_id = p_user_id;
  RETURN v_new_streak;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_verified_streak(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_verified_streak(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Raising a shield: every date kept, and never at the cost of the streak.
-- ---------------------------------------------------------------------------
-- Restated from 048 with two more result columns, so it is dropped first.
-- outcome is 'granted', 'running' (a shield already covers today; nothing
-- spent), 'empty' (no protection left) or 'would_end_streak': a day missed
-- since the last learning day still needs a protection, and spending one on
-- the shield would leave too few. Learning today bridges it instead.
-- granted, period, remaining, used and shield_until keep their meaning, so
-- the handler in production reads the first three outcomes as before, and
-- the fourth as a shield not raised.
DROP FUNCTION IF EXISTS public.activate_streak_shield(TEXT);

CREATE FUNCTION public.activate_streak_shield(p_user_id TEXT)
RETURNS TABLE (
  granted      BOOLEAN,
  period       TEXT,
  remaining    INTEGER,
  used         JSONB,
  shield_until TIMESTAMPTZ,
  shield_days  DATE[],
  outcome      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row    public.user_streak_freezes%ROWTYPE;
  v_today  DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_last   DATE;
  v_missed INTEGER;
  v_raised DATE;
BEGIN
  PERFORM public.refresh_streak_freezes(p_user_id);

  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  -- The latest shield still covers today: return it and charge nothing.
  IF v_row.shield_until IS NOT NULL AND
     ((v_row.shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE + 1 >= v_today THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until,
                        v_row.shield_days, 'running'::TEXT;
    RETURN;
  END IF;

  IF COALESCE(v_row.remaining, 0) <= 0 THEN
    RETURN QUERY SELECT FALSE, v_row.period, COALESCE(v_row.remaining, 0), v_row.used, NULL::TIMESTAMPTZ,
                        v_row.shield_days, 'empty'::TEXT;
    RETURN;
  END IF;

  -- The days already missed will each take a protection when the learner
  -- comes back. A shield that leaves fewer than that ends the streak it was
  -- raised to keep. Read without a lock: advance_verified_streak locks
  -- user_stats before this row, and the check only has to be right for the
  -- day the learner is looking at.
  SELECT s.last_quiz_date INTO v_last FROM public.user_stats s WHERE s.user_id = p_user_id;
  v_missed := public.streak_missed_days(v_last, v_today, v_row.shield_days, v_row.shield_until);
  IF v_missed > 0 AND v_row.remaining - 1 < v_missed THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until,
                        v_row.shield_days, 'would_end_streak'::TEXT;
    RETURN;
  END IF;

  -- The latest shield's two dates join the list too, for a row whose
  -- shield_days the backfill above did not reach.
  IF v_row.shield_until IS NOT NULL THEN
    v_raised := ((v_row.shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE;
  END IF;

  UPDATE public.user_streak_freezes
     -- From the locked row rather than the bare columns: they are also OUT
     -- parameters here, so an unqualified reference would be ambiguous.
     SET remaining = v_row.remaining - 1,
         -- 00:00 UTC the day after tomorrow: today and tomorrow are covered.
         shield_until = (v_today + 2)::TIMESTAMP AT TIME ZONE 'UTC',
         shield_days = ARRAY(
           SELECT DISTINCT kept.day
             FROM unnest(
                    COALESCE(v_row.shield_days, '{}'::DATE[])
                    || CASE WHEN v_raised IS NULL THEN '{}'::DATE[] ELSE ARRAY[v_raised, v_raised + 1] END
                    || ARRAY[v_today, v_today + 1]
                  ) AS kept(day)
            WHERE kept.day >= v_today - 40
            ORDER BY kept.day
         ),
         used = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM (
             SELECT elem FROM jsonb_array_elements(COALESCE(v_row.used, '[]'::jsonb)) AS elem
             UNION ALL
             SELECT to_jsonb(TO_CHAR(v_today, 'YYYY-MM-DD'))
             LIMIT 24
           ) AS merged
         ),
         updated_at = NOW()
   WHERE user_id = p_user_id
   RETURNING * INTO v_row;

  RETURN QUERY SELECT TRUE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until,
                      v_row.shield_days, 'granted'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_streak_shield(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_streak_shield(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Friends: the same live streak.
-- ---------------------------------------------------------------------------
-- Restated from 048; only the current_streak column changes, to streak_live.
-- The six-day cut-off is gone: chained shields can keep a longer gap alive,
-- and streak_missed_days bounds the work on its own.
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
         public.streak_live(
           s.current_streak, s.last_quiz_date, (NOW() AT TIME ZONE 'UTC')::DATE,
           fz.shield_days, fz.shield_until, fz.period, fz.remaining
         )::INT,
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
-- 6. Premium milestones count the streak the Profile shows.
-- ---------------------------------------------------------------------------
-- Restated from 041; only the streak read changes. It counted 0 as soon as
-- the last learning day was before yesterday, although a shield or a
-- protection still covered the gap and the Profile showed the streak.
CREATE OR REPLACE FUNCTION public.settle_coin_milestones(
  p_user_id TEXT,
  p_subject TEXT,
  p_config  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key       TEXT;
  v_premium   BOOLEAN;
  v_credited  JSONB := '[]'::jsonb;
  v_topics    JSONB := '[]'::jsonb;
  v_projects  JSONB := '[]'::jsonb;
  v_streak    INTEGER := 0;
  v_today     DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_data      JSONB;
  v_passed    TEXT[];
  v_item      JSONB;
  v_topic     TEXT;
  v_total     INTEGER;
  v_done      INTEGER;
  v_level     INTEGER;
  v_coins     INTEGER;
  v_days      INTEGER;
  v_id        TEXT;
  v_stage     TEXT;
  v_earned    JSONB;
  v_today_xp  INTEGER;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RAISE EXCEPTION 'invalid_milestone_settlement';
  END IF;
  v_key := public.token_account_key(p_user_id);
  v_premium := public.is_premium(p_user_id);

  -- The streak the Profile shows: the recorded count while the days missed
  -- since the last learning day are covered by a shield or by the month's
  -- protections (streak_live).
  SELECT public.streak_live(s.current_streak, s.last_quiz_date, v_today,
                            fz.shield_days, fz.shield_until, fz.period, fz.remaining)
    INTO v_streak
    FROM public.user_stats s
    LEFT JOIN public.user_streak_freezes fz ON fz.user_id = s.user_id
   WHERE s.user_id = p_user_id;
  v_streak := COALESCE(v_streak, 0);

  IF jsonb_typeof(p_config -> 'streak') = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_config -> 'streak') LOOP
      v_days := CASE WHEN jsonb_typeof(v_item -> 'days') = 'number' THEN (v_item ->> 'days')::NUMERIC::INTEGER END;
      v_coins := CASE WHEN jsonb_typeof(v_item -> 'coins') = 'number' THEN (v_item ->> 'coins')::NUMERIC::INTEGER END;
      CONTINUE WHEN v_days IS NULL OR v_days < 1 OR v_days > 10000 OR v_coins IS NULL OR v_coins < 1 OR v_coins > 100000;
      -- Nested rather than one AND: SQL does not promise to evaluate an AND
      -- left to right, and the credit must never run for a free account.
      IF v_premium AND v_streak >= v_days THEN
        IF public.credit_tokens(p_user_id, 'streak:' || v_days || ':' || v_key, p_subject, v_coins,
                                'milestone', 'streak:' || v_days) THEN
          v_credited := v_credited || jsonb_build_object('key', 'streak:' || v_days, 'coins', v_coins);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Learn topics: every level passed, read from the verified progress blob.
  SELECT data INTO v_data FROM public.roadmap_progress WHERE user_id = p_user_id;
  v_data := COALESCE(v_data, '{}'::jsonb);
  v_coins := CASE WHEN jsonb_typeof(p_config #> '{topic,coins}') = 'number'
                  THEN (p_config #>> '{topic,coins}')::NUMERIC::INTEGER END;
  IF jsonb_typeof(p_config #> '{topic,levels}') = 'object' THEN
    FOR v_topic, v_item IN SELECT key, value FROM jsonb_each(p_config #> '{topic,levels}') LOOP
      CONTINUE WHEN v_topic !~ '^[a-z0-9-]{1,48}$' OR jsonb_typeof(v_item) <> 'number';
      v_total := (v_item #>> '{}')::NUMERIC::INTEGER;
      CONTINUE WHEN v_total < 1 OR v_total > 200;
      v_done := 0;
      FOR v_level IN 1..v_total LOOP
        IF COALESCE((v_data #>> ARRAY[v_topic, 'levels', v_level::TEXT, 'passed'])::BOOLEAN, FALSE) THEN
          v_done := v_done + 1;
        END IF;
      END LOOP;
      IF v_done > 0 THEN
        v_topics := v_topics || jsonb_build_object('id', v_topic, 'passed', v_done, 'total', v_total);
      END IF;
      IF v_premium AND v_done = v_total AND COALESCE(v_coins BETWEEN 1 AND 100000, FALSE) THEN
        IF public.credit_tokens(p_user_id, 'topic:' || v_topic || ':' || v_key, p_subject, v_coins,
                                'milestone', 'topic:' || v_topic) THEN
          v_credited := v_credited || jsonb_build_object('key', 'topic:' || v_topic, 'coins', v_coins);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Evolving projects and short paths: every stage passed. A passed milestone
  -- also covers its separate `-start` prerequisite, as evolvingPassed() says.
  SELECT COALESCE(array_agg(task_id), ARRAY[]::TEXT[]) INTO v_passed
    FROM public.coding_progress WHERE user_id = p_user_id AND status = 'passed';
  IF jsonb_typeof(p_config -> 'projects') = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_config -> 'projects') LOOP
      v_id := v_item ->> 'id';
      CONTINUE WHEN v_id IS NULL OR v_id !~ '^[a-z0-9-]{3,64}$' OR jsonb_typeof(v_item -> 'stages') <> 'array';
      v_coins := CASE WHEN jsonb_typeof(v_item -> 'coins') = 'number' THEN (v_item ->> 'coins')::NUMERIC::INTEGER END;
      v_total := 0;
      v_done := 0;
      FOR v_stage IN SELECT jsonb_array_elements_text(v_item -> 'stages') LOOP
        v_total := v_total + 1;
        IF v_stage = ANY(v_passed) OR
           (v_stage LIKE '%-start' AND left(v_stage, -6) = ANY(v_passed)) THEN
          v_done := v_done + 1;
        END IF;
      END LOOP;
      CONTINUE WHEN v_total = 0;
      IF v_done > 0 THEN
        v_projects := v_projects || jsonb_build_object('id', v_id, 'passed', v_done, 'total', v_total);
      END IF;
      IF v_premium AND v_done = v_total AND COALESCE(v_coins BETWEEN 1 AND 100000, FALSE) THEN
        IF public.credit_tokens(p_user_id, 'project:' || v_id || ':' || v_key, p_subject, v_coins,
                                'milestone', 'project:' || v_id) THEN
          v_credited := v_credited || jsonb_build_object('key', 'project:' || v_id, 'coins', v_coins);
        END IF;
      END IF;
    END LOOP;
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT reference), '[]'::jsonb) INTO v_earned
    FROM public.token_ledger
   WHERE user_id = p_user_id AND subject = p_subject AND reason = 'milestone' AND reference IS NOT NULL;
  SELECT COALESCE(SUM(credited), 0) INTO v_today_xp
    FROM public.token_xp_credits
   WHERE user_id = p_user_id AND subject = p_subject AND day = v_today;

  RETURN jsonb_build_object(
    'premium', v_premium,
    'credited', v_credited,
    'streak', v_streak,
    'topics', v_topics,
    'projects', v_projects,
    'earned', v_earned,
    'todayXpCoins', v_today_xp
  );
END;
$$;
REVOKE ALL ON FUNCTION public.settle_coin_milestones(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_coin_milestones(TEXT, TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Coding: the Learn attempt's row before the streak.
-- ---------------------------------------------------------------------------
-- Restated from 048; only the roadmap_attempt_coding upsert moves, from the
-- end to just after the replay check. Its foreign key takes a KEY SHARE lock
-- on the roadmap_attempts row. complete_verified_roadmap_attempt locks that
-- row FOR UPDATE and then user_stats (in advance_verified_streak); this
-- routine used to lock user_stats first and the row second, so a verdict and
-- a completion of the same attempt could deadlock. Both now take the attempt
-- row before user_stats.
CREATE OR REPLACE FUNCTION public.record_coding_verdict(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_task_id TEXT,
  p_track TEXT,
  p_outcome TEXT,
  p_verified BOOLEAN,
  p_xp INTEGER,
  p_subject TEXT DEFAULT 'webdev',
  p_roadmap_attempt_id TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_run_count INTEGER DEFAULT NULL,
  p_hints_used INTEGER DEFAULT 0,
  p_code_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted INTEGER;
  v_row public.coding_progress%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_first_pass BOOLEAN := FALSE;
  v_revealed_before BOOLEAN := FALSE;
  v_xp_awarded BOOLEAN := FALSE;
  v_code_changed BOOLEAN := FALSE;
  v_stage INTEGER;
  v_clean INTEGER;
  v_next TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_attempt_id !~ '^[A-Za-z0-9:_-]{8,128}$' OR
     p_task_id !~ '^[a-z0-9-]{3,64}$' OR
     p_track NOT IN ('javascript', 'typescript', 'react', 'system-design', 'algorithms') OR
     p_outcome NOT IN ('passed', 'failed', 'error', 'timeout') OR
     p_xp < 0 OR p_xp > 10000 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     (p_roadmap_attempt_id IS NOT NULL AND p_roadmap_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$') OR
     (p_hints_used IS NOT NULL AND (p_hints_used < 0 OR p_hints_used > 20)) THEN
    RAISE EXCEPTION 'invalid_coding_verdict';
  END IF;

  INSERT INTO public.coding_attempts (
    attempt_id, user_id, task_id, track, outcome, verified, duration_ms, run_count, hints_used
  ) VALUES (
    p_attempt_id, p_user_id, p_task_id, p_track, p_outcome, COALESCE(p_verified, FALSE),
    p_duration_ms, p_run_count, p_hints_used
  )
  ON CONFLICT (attempt_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  INSERT INTO public.coding_progress (user_id, task_id, track)
  VALUES (p_user_id, p_task_id, p_track)
  ON CONFLICT (user_id, task_id) DO NOTHING;
  SELECT * INTO v_row FROM public.coding_progress
   WHERE user_id = p_user_id AND task_id = p_task_id
   FOR UPDATE;

  IF v_inserted = 0 THEN
    -- Replay of a verdict already recorded: report, never re-apply.
    RETURN jsonb_build_object(
      'applied', FALSE, 'firstPass', FALSE, 'xpAwarded', FALSE, 'codeChanged', FALSE,
      'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
      'nextReviewAt', v_row.next_review_at
    );
  END IF;

  -- Moved up in 052: the attempt row's lock comes before user_stats's.
  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
    VALUES (p_roadmap_attempt_id, p_task_id, p_outcome = 'passed', COALESCE(p_verified, FALSE))
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET
      passed = public.roadmap_attempt_coding.passed OR EXCLUDED.passed,
      verified = public.roadmap_attempt_coding.verified OR EXCLUDED.verified,
      updated_at = NOW();
  END IF;

  IF p_outcome = 'passed' THEN
    v_first_pass := v_row.passes = 0;
    -- Read before the update below: a reveal after the first pass keeps the
    -- status 'passed' and never reaches this line for a first pass anyway.
    v_revealed_before := v_row.reveal_count > 0 OR v_row.status = 'revealed';
    v_code_changed := p_code_hash IS NOT NULL AND v_row.last_code_hash IS DISTINCT FROM p_code_hash;

    -- Review ladder: a clean pass (no hints) in a new sitting climbs one rung;
    -- two such passes retire the task. Anything else restarts at four hours.
    v_stage := v_row.review_stage;
    v_clean := v_row.clean_passes;
    IF COALESCE(p_hints_used, 0) = 0 AND v_row.passes > 0 AND
       (v_row.last_pass_sitting IS NULL OR v_row.last_pass_sitting <> v_today) THEN
      v_clean := v_clean + 1;
      v_stage := LEAST(v_stage + 1, 2);
    ELSIF COALESCE(p_hints_used, 0) > 0 THEN
      v_clean := 0;
      v_stage := 0;
    END IF;
    IF v_clean >= 2 THEN
      v_stage := 3;                            -- retired from the review queue
      v_next := NULL;
    ELSE
      v_next := NOW() + CASE v_stage WHEN 0 THEN INTERVAL '4 hours'
                                     WHEN 1 THEN INTERVAL '24 hours'
                                     ELSE INTERVAL '48 hours' END;
    END IF;

    UPDATE public.coding_progress
       SET status = 'passed',
           verified = verified OR COALESCE(p_verified, FALSE),
           passes = passes + 1,
           clean_passes = v_clean,
           last_pass_sitting = v_today,
           review_stage = v_stage,
           next_review_at = v_next,
           best_passed_at = COALESCE(best_passed_at, NOW()),
           last_code_hash = COALESCE(p_code_hash, last_code_hash),
           updated_at = NOW()
     WHERE user_id = p_user_id AND task_id = p_task_id
     RETURNING * INTO v_row;

    -- Any verified pass is a day of learning (048). An unverified
    -- (self-reported checklist) pass is not.
    IF COALESCE(p_verified, FALSE) THEN
      PERFORM public.advance_verified_streak(p_user_id);
    END IF;

    IF v_first_pass AND p_xp > 0 AND NOT v_revealed_before THEN
      v_xp_awarded := public.record_verified_activity_xp(
        p_user_id, 'coding:' || public.token_account_key(p_user_id) || ':' || p_task_id, p_subject, p_xp
      );
    END IF;
  ELSE
    -- A failed, errored or timed-out run after a pass sends the task back to the
    -- short interval; before any pass it only marks the task as started.
    UPDATE public.coding_progress
       SET review_stage = CASE WHEN status = 'passed' THEN 0 ELSE review_stage END,
           clean_passes = CASE WHEN status = 'passed' THEN 0 ELSE clean_passes END,
           next_review_at = CASE WHEN status = 'passed' THEN NOW() + INTERVAL '4 hours' ELSE next_review_at END,
           updated_at = NOW()
     WHERE user_id = p_user_id AND task_id = p_task_id
     RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'applied', TRUE, 'firstPass', v_first_pass, 'xpAwarded', v_xp_awarded,
    'codeChanged', v_first_pass OR v_code_changed,
    'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
    'nextReviewAt', v_row.next_review_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_coding_verdict(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_verdict(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT
) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. A Challenge question counts on the boards once a day.
-- ---------------------------------------------------------------------------
-- Restated from 048 with one more DEFAULT argument, p_outcomes: the run's
-- answers, [{ questionId, category, isCorrect }], at most 1,000 read. Each is
-- dated on the boards only when the learner had not answered that question
-- earlier the same UTC day (user_question_history, read before this run
-- updates it), as record_verified_quiz_result_v2 does since 048; the history
-- is updated either way. Without p_outcomes the breakdown is counted in full,
-- as before, so the handler in production keeps working. The XP is the
-- caller's p_xp, unchanged. The five-argument version is dropped: next to
-- this one every call that omits p_outcomes would be ambiguous.
DROP FUNCTION IF EXISTS public.record_challenge_completion(TEXT, TEXT, TEXT, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION public.record_challenge_completion(
  p_user_id   TEXT,
  p_run_id    TEXT,
  p_subject   TEXT,
  p_xp        INTEGER,
  p_breakdown JSONB DEFAULT NULL,
  p_outcomes  JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today     DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_day_start TIMESTAMPTZ := (NOW() AT TIME ZONE 'UTC')::DATE::TIMESTAMP AT TIME ZONE 'UTC';
  v_counts    JSONB := '{}'::jsonb;
  v_seen_at   TIMESTAMPTZ;
  rec         RECORD;
BEGIN
  IF p_run_id IS NULL OR p_run_id !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RAISE EXCEPTION 'invalid_challenge_completion';
  END IF;
  IF p_xp IS NULL OR p_xp <= 0 THEN
    RETURN FALSE;
  END IF;

  -- A run already awarded (here or by the pre-040 path) changes nothing.
  PERFORM 1 FROM public.verified_activity_awards WHERE award_id = 'challenge:' || p_run_id;
  IF FOUND THEN RETURN FALSE; END IF;

  -- The streak day, and the user_stats lock that makes one learner's writes
  -- apply one after the other, so the freshness read below sees what an
  -- earlier quiz or run wrote.
  PERFORM public.advance_verified_streak(p_user_id);

  -- Validates the user, the subject and the amount, and is the receipt.
  IF NOT public.record_verified_activity_xp(p_user_id, 'challenge:' || p_run_id, p_subject, p_xp) THEN
    RETURN FALSE;
  END IF;

  IF p_outcomes IS NOT NULL AND jsonb_typeof(p_outcomes) = 'array' THEN
    FOR rec IN
      SELECT value->>'questionId' AS question_id,
             value->>'category' AS category,
             CASE WHEN jsonb_typeof(value->'isCorrect') = 'boolean'
                  THEN (value->>'isCorrect')::BOOLEAN END AS is_correct
        FROM jsonb_array_elements(p_outcomes)
       LIMIT 1000
    LOOP
      IF rec.question_id IS NULL OR rec.question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
         rec.category IS NULL OR rec.category !~ '^[a-z0-9-]{1,50}$' OR
         rec.is_correct IS NULL THEN
        CONTINUE;
      END IF;

      -- Fresh: never answered, or last answered before today (UTC).
      SELECT h.last_seen_at INTO v_seen_at
        FROM public.user_question_history h
       WHERE h.user_id = p_user_id AND h.subject = p_subject AND h.question_id = rec.question_id;
      IF NOT FOUND OR v_seen_at < v_day_start THEN
        v_counts := jsonb_set(
          v_counts,
          ARRAY[rec.category],
          jsonb_build_object(
            'correct', COALESCE((v_counts #>> ARRAY[rec.category, 'correct'])::INTEGER, 0)
                       + CASE WHEN rec.is_correct THEN 1 ELSE 0 END,
            'total',   COALESCE((v_counts #>> ARRAY[rec.category, 'total'])::INTEGER, 0) + 1
          ),
          TRUE
        );
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

    FOR rec IN
      SELECT key AS category,
             (value->>'correct')::INTEGER AS correct,
             (value->>'total')::INTEGER AS total
        FROM jsonb_each(v_counts)
    LOOP
      PERFORM public.add_activity_day(p_user_id, v_today, rec.category, rec.correct, rec.total);
    END LOOP;
  ELSIF p_breakdown IS NOT NULL AND jsonb_typeof(p_breakdown) = 'object' THEN
    FOR rec IN
      SELECT key AS category,
             (value->>'correct')::INTEGER AS correct,
             (value->>'total')::INTEGER AS total
        FROM jsonb_each(p_breakdown)
       LIMIT 64
    LOOP
      PERFORM public.add_activity_day(p_user_id, v_today, rec.category, rec.correct, rec.total);
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_challenge_completion(TEXT, TEXT, TEXT, INTEGER, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_challenge_completion(TEXT, TEXT, TEXT, INTEGER, JSONB, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 9. Quizzes: each fresh question pays its own XP.
-- ---------------------------------------------------------------------------
-- Restated from 048. What changes: when every outcome carries its question's
-- XP (`xp`, from api/quiz/submit.ts: 2 + 2 × difficulty for a correct answer,
-- 0 for a wrong one), the award is the sum over the fresh outcomes, never more
-- than p_quest_xp. A question answered earlier the same UTC day pays nothing
-- and a fresh correct answer pays in full; 048 scaled the whole quiz by the
-- fresh share, which paid part of a repeat and underpaid a fresh answer. A
-- daily challenge keeps its minimum of 20 XP (submit.ts gives every daily
-- Math.max(20, xp)) when it has at least one fresh correct answer. A receipt
-- without `xp` (minted before this change) keeps the share formula.
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
  v_today         DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_day_start     TIMESTAMPTZ := (NOW() AT TIME ZONE 'UTC')::DATE::TIMESTAMP AT TIME ZONE 'UTC';
  v_applied       INTEGER;
  rec             RECORD;
  v_legacy        BOOLEAN := p_outcomes IS NULL OR jsonb_typeof(p_outcomes) = 'null';
  v_per_question  BOOLEAN := FALSE;
  v_counts        JSONB := '{}'::jsonb;
  v_fresh         INTEGER := 0;
  v_fresh_correct INTEGER := 0;
  v_fresh_xp      INTEGER := 0;
  v_seen_at       TIMESTAMPTZ;
  v_xp            INTEGER;
  -- The daily challenge's minimum, as api/quiz/submit.ts sets it.
  v_daily_min_xp  CONSTANT INTEGER := 20;
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

  -- One daily result per user/date/subject: the first verified one (047).
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

  -- The streak day, and the row lock that makes one learner's results apply
  -- one after the other: the freshness read below then sees what an earlier
  -- result wrote.
  PERFORM public.advance_verified_streak(p_user_id);

  UPDATE public.user_stats
     SET email = COALESCE(p_email, email),
         name = COALESCE(p_name, name),
         picture = COALESCE(p_picture, picture),
         total_quizzes = COALESCE(total_quizzes, 0) + 1,
         total_correct = COALESCE(total_correct, 0) + p_correct,
         total_questions = COALESCE(total_questions, 0) + p_total,
         updated_at = NOW()
   WHERE user_id = p_user_id;

  IF NOT v_legacy AND jsonb_typeof(p_outcomes) = 'array' THEN
    -- Receipts minted from 052 carry each question's XP; older ones do not.
    v_per_question := jsonb_array_length(p_outcomes) > 0 AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_outcomes) AS o(value)
       WHERE jsonb_typeof(o.value -> 'xp') IS DISTINCT FROM 'number'
    );

    FOR rec IN
      SELECT value->>'questionId' AS question_id,
             value->>'category' AS category,
             (value->>'isCorrect')::BOOLEAN AS is_correct,
             CASE WHEN jsonb_typeof(value->'xp') = 'number'
                  THEN LEAST(100, GREATEST(0, (value->>'xp')::NUMERIC::INTEGER))
                  ELSE 0 END AS xp
        FROM jsonb_array_elements(p_outcomes)
       LIMIT 50
    LOOP
      IF rec.question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
         rec.category !~ '^[a-z0-9-]{1,50}$' THEN
        CONTINUE;
      END IF;

      -- Fresh: never answered, or last answered before today (UTC). Read
      -- before the upsert below moves last_seen_at to now.
      SELECT h.last_seen_at INTO v_seen_at
        FROM public.user_question_history h
       WHERE h.user_id = p_user_id AND h.subject = p_subject AND h.question_id = rec.question_id;
      IF NOT FOUND OR v_seen_at < v_day_start THEN
        v_fresh := v_fresh + 1;
        v_fresh_xp := v_fresh_xp + rec.xp;
        IF rec.is_correct THEN v_fresh_correct := v_fresh_correct + 1; END IF;
        v_counts := jsonb_set(
          v_counts,
          ARRAY[rec.category],
          jsonb_build_object(
            'correct', COALESCE((v_counts #>> ARRAY[rec.category, 'correct'])::INTEGER, 0)
                       + CASE WHEN rec.is_correct THEN 1 ELSE 0 END,
            'total',   COALESCE((v_counts #>> ARRAY[rec.category, 'total'])::INTEGER, 0) + 1
          ),
          TRUE
        );
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

  IF v_legacy THEN
    v_counts := CASE WHEN jsonb_typeof(p_breakdown) = 'object' THEN p_breakdown ELSE '{}'::jsonb END;
    v_xp := p_quest_xp;
  ELSIF v_per_question THEN
    v_xp := LEAST(p_quest_xp, v_fresh_xp);
    IF p_daily_date IS NOT NULL AND v_fresh_correct > 0 THEN
      v_xp := GREATEST(v_xp, LEAST(p_quest_xp, v_daily_min_xp));
    END IF;
  ELSE
    v_xp := (p_quest_xp * LEAST(v_fresh, p_total)) / p_total;
  END IF;

  FOR rec IN
    SELECT key AS category,
           (value->>'correct')::INTEGER AS correct,
           (value->>'total')::INTEGER AS total
      FROM jsonb_each(v_counts)
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
    PERFORM public.add_activity_day(p_user_id, v_today, rec.category, rec.correct, rec.total);
  END LOOP;

  UPDATE public.quiz_attempts SET quest_xp = v_xp WHERE attempt_id = p_attempt_id;

  IF v_xp > 0 THEN
    INSERT INTO public.user_xp (user_id, quest_xp, quest_xp_by_subject)
    VALUES (p_user_id, v_xp, jsonb_build_object(p_subject, v_xp))
    ON CONFLICT (user_id) DO UPDATE SET
      quest_xp = LEAST(100000000, public.user_xp.quest_xp + v_xp),
      quest_xp_by_subject = jsonb_set(
        COALESCE(public.user_xp.quest_xp_by_subject, '{}'::jsonb),
        ARRAY[p_subject],
        to_jsonb(LEAST(
          100000000,
          COALESCE((public.user_xp.quest_xp_by_subject ->> p_subject)::BIGINT, 0) + v_xp
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

COMMIT;
