-- Migration 048: a streak day is a day of verified learning, the shield covers
-- two UTC dates, a quiz question counts once a day, and a revealed solution
-- earns no XP. Apply after 047. Safe to re-run: one ADD COLUMN IF NOT EXISTS,
-- the rest CREATE OR REPLACE with unchanged signatures, so the code running
-- when this is applied keeps working.
--
--   1. advance_verified_streak (new) is the one place a streak day is counted:
--      the UTC day, the shield window and the monthly protections, as
--      record_verified_quiz_result_v2 has counted them since 032. It is
--      idempotent within a day. Four writers call it, each behind the receipt
--      that already makes it idempotent:
--        record_verified_quiz_result_v2   a quiz or daily result
--        complete_verified_roadmap_attempt a Learn level or part test with
--                                          every question answered, passed or
--                                          not
--        record_coding_verdict            any passing verdict (coding section
--                                          and Learn-level tasks)
--        record_challenge_completion      a Biggest Shark Challenge run that
--                                          earned XP
--      user_stats.last_quiz_date keeps its name and now means "the last UTC
--      day with verified learning". settle_coin_milestones reads it with that
--      meaning and needs no change; friend_list's active_today now says "learnt
--      today" rather than "took a quiz today".
--   2. A shield covers exactly two UTC dates: the date it was raised and the
--      next one. The raise date is (shield_until - 48 hours) in UTC, which is
--      right for the shields raised before this migration (NOW() + 48 hours)
--      and for the ones raised after it: activate_streak_shield now ends the
--      window at the start of the day after tomorrow, so the time the Profile
--      shows as left is the time the shield really covers, and it counts a
--      shield as running only while it covers today. The old test covered a
--      third date when a shield was raised just after midnight.
--   3. record_verified_quiz_result_v2 counts a question toward the category
--      stats, the 30-day board and the XP only the first time the learner
--      answers it on a UTC day, as record_roadmap_answer_v2 does for Learn
--      (040). The quiz XP is scaled by the share of fresh questions and kept
--      on the attempt receipt (quiz_attempts.quest_xp), where the stats handler
--      reads it to credit coins for the same amount.
--   4. record_coding_verdict awards no XP for a first pass when the learner
--      revealed that task's solution before passing it. The award id stays
--      `coding:<account>:<task>`, so a later pass does not pay either.

-- ---------------------------------------------------------------------------
-- 0. The XP a quiz attempt actually awarded.
-- ---------------------------------------------------------------------------
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS quest_xp INTEGER CHECK (quest_xp IS NULL OR quest_xp BETWEEN 0 AND 10000);

-- ---------------------------------------------------------------------------
-- 1. One streak day, from any verified learning.
-- ---------------------------------------------------------------------------
-- Returns the streak after today's learning. Creates the user_stats row with
-- zero totals when the learner has none yet (the profile columns stay NULL;
-- the stats handler and the quiz routine fill them), and locks it, so two
-- writers for one learner run one after the other. Callers write user_xp only
-- after this, which keeps one lock order (user_stats, then user_xp) across
-- the four writers.
CREATE OR REPLACE FUNCTION public.advance_verified_streak(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today       DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_prev_streak INTEGER;
  v_prev_date   DATE;
  v_raised      DATE;
  v_missed      INTEGER := 0;
  v_new_streak  INTEGER;
  v_period      TEXT;
  v_remaining   INTEGER;
  v_used        JSONB;
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
    -- The shield covers the UTC date it was raised and the next one. Those
    -- days were paid for in advance and are not missed.
    SELECT ((shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE
      INTO v_raised
      FROM public.user_streak_freezes
     WHERE user_id = p_user_id AND shield_until IS NOT NULL;

    -- Missed days strictly between the last learning day and today.
    SELECT COUNT(*) INTO v_missed
      FROM generate_series(v_prev_date + 1, v_today - 1, INTERVAL '1 day') AS gap(day)
     WHERE v_raised IS NULL
        OR gap.day::DATE < v_raised
        OR gap.day::DATE > v_raised + 1;

    IF v_missed = 0 THEN
      v_new_streak := COALESCE(v_prev_streak, 0) + 1;
    ELSE
      -- Bridge the gap with the month's protections. refresh_streak_freezes
      -- creates and locks the row and resets a stale month first.
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
                    WHERE v_raised IS NULL
                       OR gap.day::DATE < v_raised
                       OR gap.day::DATE > v_raised + 1
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

COMMENT ON COLUMN public.user_stats.last_quiz_date IS
  'The last UTC day with verified learning: a quiz or daily result, a completed Learn level or part test, a passing coding verdict or a Biggest Shark Challenge run that earned XP (migration 048). Named before Learn and coding counted.';

-- ---------------------------------------------------------------------------
-- 2. A shield ends when the day after it was raised ends (UTC).
-- ---------------------------------------------------------------------------
-- Restated from 032. The expiry changes, and a shield counts as running while
-- it still covers today, so one raised late on a day before this migration
-- (stored as raised + 48 hours) does not block a new shield on the third day
-- it no longer covers. (shield_until - 48 hours) is still the raise date, so
-- every reader of the window works the same way for old and new shields.
CREATE OR REPLACE FUNCTION public.activate_streak_shield(p_user_id TEXT)
RETURNS TABLE (granted BOOLEAN, period TEXT, remaining INTEGER, used JSONB, shield_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.user_streak_freezes%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  PERFORM public.refresh_streak_freezes(p_user_id);

  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  IF v_row.shield_until IS NOT NULL AND
     ((v_row.shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE + 1 >= v_today THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
    RETURN;
  END IF;

  IF COALESCE(v_row.remaining, 0) <= 0 THEN
    RETURN QUERY SELECT FALSE, v_row.period, COALESCE(v_row.remaining, 0), v_row.used, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  UPDATE public.user_streak_freezes
     -- From the locked row rather than the bare column: `remaining` is also an
     -- OUT parameter here, so the unqualified reference would be ambiguous.
     SET remaining = v_row.remaining - 1,
         -- 00:00 UTC the day after tomorrow: today and tomorrow are covered.
         shield_until = (v_today + 2)::TIMESTAMP AT TIME ZONE 'UTC',
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

  RETURN QUERY SELECT TRUE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_streak_shield(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_streak_shield(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Quizzes: the streak from the shared routine, a question once a day.
-- ---------------------------------------------------------------------------
-- Restated from 047. What changes:
--   * the streak comes from advance_verified_streak;
--   * the per-category counts (user_category_stats and the 30-day board) are
--     built from the outcomes whose question this learner had not answered
--     earlier the same UTC day, read from user_question_history before this
--     attempt updates it. p_breakdown is used only when p_outcomes is NULL, as
--     before 022;
--   * the quest XP is scaled by the fresh share, floor(xp * fresh / total),
--     and stored on the attempt receipt for the coin credit.
-- total_quizzes, total_correct and total_questions still count the whole quiz.
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
  v_today     DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_day_start TIMESTAMPTZ := (NOW() AT TIME ZONE 'UTC')::DATE::TIMESTAMP AT TIME ZONE 'UTC';
  v_applied   INTEGER;
  rec         RECORD;
  v_legacy    BOOLEAN := p_outcomes IS NULL OR jsonb_typeof(p_outcomes) = 'null';
  v_counts    JSONB := '{}'::jsonb;
  v_fresh     INTEGER := 0;
  v_seen_at   TIMESTAMPTZ;
  v_xp        INTEGER;
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

      -- Fresh: never answered, or last answered before today (UTC). Read
      -- before the upsert below moves last_seen_at to now.
      SELECT h.last_seen_at INTO v_seen_at
        FROM public.user_question_history h
       WHERE h.user_id = p_user_id AND h.subject = p_subject AND h.question_id = rec.question_id;
      IF NOT FOUND OR v_seen_at < v_day_start THEN
        v_fresh := v_fresh + 1;
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

-- ---------------------------------------------------------------------------
-- 4. A completed Learn level or part test is a streak day.
-- ---------------------------------------------------------------------------
-- Restated from 047; only the advance_verified_streak call at the end is new.
-- It runs once per attempt (a completed attempt returns FALSE above), passed
-- or not: the routine completes only a fully answered attempt.
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

  -- New in 048: a finished level or part test is a day of learning.
  IF p_user_id IS NOT NULL THEN
    PERFORM public.advance_verified_streak(p_user_id);
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Coding: every pass is a streak day; a revealed solution earns no XP.
-- ---------------------------------------------------------------------------
-- Restated from 041. What changes: a passing verdict advances the streak
-- (before the XP write, for the lock order), and a first pass pays XP only
-- when the task's solution was never revealed before it (reveal_count, which
-- record_coding_reveal raises on every reveal, in Learn or in the coding
-- section). The award id is unchanged.
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

    -- New in 048: any pass is a day of learning.
    PERFORM public.advance_verified_streak(p_user_id);

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

  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
    VALUES (p_roadmap_attempt_id, p_task_id, p_outcome = 'passed', COALESCE(p_verified, FALSE))
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET
      passed = public.roadmap_attempt_coding.passed OR EXCLUDED.passed,
      verified = public.roadmap_attempt_coding.verified OR EXCLUDED.verified,
      updated_at = NOW();
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
-- 6. A Biggest Shark Challenge run that earned XP is a streak day.
-- ---------------------------------------------------------------------------
-- Restated from 040. The award receipt is checked first and the streak
-- advanced before record_verified_activity_xp writes user_xp, so this routine
-- takes its locks in the order the quiz routine does (user_stats, then
-- user_xp). Two calls for the same run at once both pass the check; the award
-- insert still admits one, and the streak routine counts a day once.
CREATE OR REPLACE FUNCTION public.record_challenge_completion(
  p_user_id   TEXT,
  p_run_id    TEXT,
  p_subject   TEXT,
  p_xp        INTEGER,
  p_breakdown JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  rec RECORD;
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

  PERFORM public.advance_verified_streak(p_user_id);

  -- Validates the user, the subject and the amount, and is the receipt.
  IF NOT public.record_verified_activity_xp(p_user_id, 'challenge:' || p_run_id, p_subject, p_xp) THEN
    RETURN FALSE;
  END IF;

  IF p_breakdown IS NOT NULL AND jsonb_typeof(p_breakdown) = 'object' THEN
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

REVOKE ALL ON FUNCTION public.record_challenge_completion(TEXT, TEXT, TEXT, INTEGER, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_challenge_completion(TEXT, TEXT, TEXT, INTEGER, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Friends: the two-date shield, and "learnt today".
-- ---------------------------------------------------------------------------
-- Restated from 047. The shield window is the raise date and the next one, as
-- in advance_verified_streak and client/src/lib/streakFreezes.ts liveStreak.
-- active_today reads last_quiz_date, which from 048 is the last day of any
-- verified learning: exactly the days a streak counts. user_activity_days
-- would miss a coding pass and a Learn level replayed after it was passed.
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
                  OR gap.day::DATE < ((fz.shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE
                  OR gap.day::DATE > ((fz.shield_until - INTERVAL '48 hours') AT TIME ZONE 'UTC')::DATE + 1
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
