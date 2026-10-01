-- Migration 056: XP for every answer (2026-10-01). Apply after 055.
--
-- Safe to re-run, and the code running when it is applied keeps working: the
-- routine below keeps its name, arguments and result.
--
--   1. record_verified_quiz_result_v2 pays the receipt's whole XP for every
--      quiz and daily result, repeated questions included (owner decision 5,
--      1 Oct 2026). From 052 it paid only the questions not answered earlier
--      the same UTC day. The daily keeps its minimum of 20 XP, which
--      api/quiz/submit.ts already puts in the receipt's total. The boards and
--      the category stats still count a question once per learner and UTC
--      day, as 048 made them: what a repeat earns is XP, never a place.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. A quiz pays its whole XP.
-- ---------------------------------------------------------------------------
-- Restated from 052. What changes: the award is p_quest_xp, whatever the
-- outcomes say about earlier answers today, so the per-question sum and the
-- share formula are gone. The freshness read stays, because it still decides
-- what the category stats and the dated boards count.
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
  v_counts        JSONB := '{}'::jsonb;
  v_seen_at       TIMESTAMPTZ;
  -- Every answer earns its XP, a repeat included (056). The daily's minimum
  -- of 20 is already in the receipt's total (api/quiz/submit.ts).
  v_xp            INTEGER := p_quest_xp;
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
      -- before the upsert below moves last_seen_at to now. Only a fresh
      -- answer counts on the boards; every answer earns its XP.
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
  END IF;

  IF v_legacy THEN
    v_counts := CASE WHEN jsonb_typeof(p_breakdown) = 'object' THEN p_breakdown ELSE '{}'::jsonb END;
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
