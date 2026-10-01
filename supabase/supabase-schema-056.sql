-- Migration 056: XP for every answer, a classroom question that closes, and
-- the month's top three by XP (2026-10-01). Apply after 055.
--
-- Safe to re-run, and the code running when it is applied keeps working: one
-- ADD COLUMN IF NOT EXISTS, one CREATE TABLE IF NOT EXISTS, new routines, and
-- routines restated with the same names, arguments and results.
-- match_scoreboard takes one more DEFAULT argument, so it is dropped and
-- created again; the whole file is one transaction, so no caller ever finds
-- it missing.
--
--   1. record_verified_quiz_result_v2 pays the receipt's whole XP for every
--      quiz and daily result, repeated questions included (owner decision 5,
--      1 Oct 2026). From 052 it paid only the questions not answered earlier
--      the same UTC day. The daily keeps its minimum of 20 XP, which
--      api/quiz/submit.ts already puts in the receipt's total. The boards and
--      the category stats still count a question once per learner and UTC
--      day, as 048 made them: what a repeat earns is XP, never a place.
--   2. A classroom question closes when the teacher reveals its answer
--      (owner decision 6). matches.revealed_idx holds the question the
--      teacher closed; api/play/[action].ts sets it (control action
--      'reveal') and refuses an answer to that question. match_scoreboard
--      takes p_before_idx and then counts only the answers to earlier
--      questions, so while a classroom room runs its scoreboard shows only
--      closed questions and tells nobody which option is scoring.
--   3. user_xp_days records the verified XP each learner earns per UTC day
--      and subject, written by add_xp_day inside every verified award: a quiz
--      or daily result, a Biggest Shark Challenge run, a coding challenge's
--      first pass and a Learn step's first pass. Guest XP merged at sign-in
--      does not count, and nothing is backfilled.
--   4-5. record_verified_activity_xp and complete_verified_roadmap_attempt
--      credit it (restated from 022 and 048).
--   6. month_xp_ranks ranks a subject's calendar month by XP, ties sharing a
--      place; month_xp_leaderboard and month_xp_leaderboard_rank serve the
--      "This month" board, naming learners with 055's board_display_name.
--   7. settle_month_top3 pays the month's top three by that ranking (owner
--      decision 8): everyone tied at a place gets its coins, and the next
--      total takes the place after the tied group.
--   8. delete_user_data erases the account's user_xp_days rows.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. A quiz pays its whole XP.
-- ---------------------------------------------------------------------------
-- Restated from 052. What changes: the award is p_quest_xp, whatever the
-- outcomes say about earlier answers today, so the per-question sum and the
-- share formula are gone. The freshness read stays, because it still decides
-- what the category stats and the dated boards count. The award also goes to
-- the month's XP ledger (section 3).
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
    -- The month's XP (section 3).
    PERFORM public.add_xp_day(p_user_id, p_subject, v_xp);
  END IF;

  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.record_verified_quiz_result_v2(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result_v2(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 2. A classroom question the teacher closed, and a scoreboard of closed
--    questions.
-- ---------------------------------------------------------------------------
-- revealed_idx is the question whose answer the classroom teacher revealed.
-- Revealing closes it: the handler refuses every later answer to it. A later
-- question is open again (its index is higher), so the column never needs a
-- reset. NULL until the first reveal, and in every multiplayer room.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS revealed_idx INTEGER CHECK (revealed_idx >= 0);

COMMENT ON COLUMN public.matches.revealed_idx IS
  'Classroom only: the question whose answer the teacher revealed, which closes it to answers (migration 056).';

-- Restated from 005 with one argument more and nothing else changed:
-- p_before_idx counts only the answers to questions before that index. The
-- handler passes it while a classroom room runs (the questions already closed),
-- and leaves it out for a multiplayer room and a finished one, which count
-- every answer as before. A participant with no counted answer keeps a row of
-- zeros, as before. It now has an empty search_path and is service-role only,
-- like every routine the API calls.
DROP FUNCTION IF EXISTS public.match_scoreboard(UUID);

CREATE OR REPLACE FUNCTION public.match_scoreboard(
  p_match_id   UUID,
  p_before_idx INTEGER DEFAULT NULL
)
RETURNS TABLE (user_id TEXT, display_name TEXT, correct INTEGER, score INTEGER, total_ms BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.user_id,
         p.display_name,
         COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::INT AS correct,
         COALESCE(SUM(CASE WHEN a.is_correct THEN 100 + a.speed_bonus ELSE 0 END), 0)::INT AS score,
         COALESCE(SUM(a.duration_ms), 0)::BIGINT AS total_ms
    FROM public.match_participants p
    LEFT JOIN public.match_answers a
      ON a.match_id = p.match_id AND a.user_id = p.user_id
     AND (p_before_idx IS NULL OR a.question_idx < p_before_idx)
   WHERE p.match_id = p_match_id
   GROUP BY p.user_id, p.display_name
   ORDER BY score DESC, total_ms ASC;
$$;

REVOKE ALL ON FUNCTION public.match_scoreboard(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_scoreboard(UUID, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. The monthly XP ledger.
-- ---------------------------------------------------------------------------
-- One row per learner, UTC day and subject: the verified XP awarded that day.
-- It exists so a calendar month's XP can be summed (owner decision 8: the
-- month's top three are the learners with the most XP that month). user_xp
-- keeps only a running total, so it cannot say what a month earned.
--
-- Written only by add_xp_day, which the verified awards call in the same
-- transaction as the award itself: a quiz or daily result
-- (record_verified_quiz_result_v2), a Biggest Shark Challenge run and a coding
-- challenge's first pass (record_verified_activity_xp), and a Learn level or
-- part test passed for the first time (complete_verified_roadmap_attempt).
-- Learning paths award no XP in v1. Guest XP merged at sign-in
-- (merge_user_xp) does not count: it was earned signed out and nothing
-- verified it, and no handler calls that routine any more. Nothing is copied
-- in from before this migration, so a month counts the XP awarded from the
-- moment 056 is applied.
CREATE TABLE IF NOT EXISTS public.user_xp_days (
  user_id    TEXT        NOT NULL CHECK (char_length(user_id) BETWEEN 8 AND 128),
  day        DATE        NOT NULL,
  subject    TEXT        NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  xp         INTEGER     NOT NULL CHECK (xp > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day, subject)
);

-- The month board and the settlement read one subject's month across
-- everybody; the primary key serves one learner's rows.
CREATE INDEX IF NOT EXISTS user_xp_days_subject_day_idx
  ON public.user_xp_days (subject, day);

ALTER TABLE public.user_xp_days ENABLE ROW LEVEL SECURITY;

-- Revoke first, then grant back only SELECT: RLS filters rows, it does not
-- stop TRUNCATE. A learner may read their own rows; the boards go through the
-- service-role routines below.
REVOKE ALL ON public.user_xp_days FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_xp_days TO authenticated;

DROP POLICY IF EXISTS "user_xp_days_select_own" ON public.user_xp_days;
CREATE POLICY "user_xp_days_select_own"
  ON public.user_xp_days FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

COMMENT ON TABLE public.user_xp_days IS
  'Verified XP awarded per learner, UTC day and subject (migration 056). The monthly top three and the "This month" board sum it. Written only by add_xp_day.';

-- The one write. Every caller has already decided the award is new, so this
-- only adds. Bad input is skipped rather than raised: it must never fail the
-- learning it rides on.
CREATE OR REPLACE FUNCTION public.add_xp_day(
  p_user_id TEXT,
  p_subject TEXT,
  p_xp      INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_subject IS NULL OR p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_xp IS NULL OR p_xp <= 0 OR p_xp > 100000 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_xp_days (user_id, day, subject, xp)
  VALUES (p_user_id, (NOW() AT TIME ZONE 'UTC')::DATE, p_subject, p_xp)
  ON CONFLICT (user_id, day, subject) DO UPDATE SET
    xp         = LEAST(100000000, public.user_xp_days.xp + EXCLUDED.xp),
    updated_at = NOW();
END;
$$;
REVOKE ALL ON FUNCTION public.add_xp_day(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_xp_day(TEXT, TEXT, INTEGER) TO service_role;

-- A Learn step's first-pass XP, as shared/progression.ts computes it: a level
-- is 50 × its tier (one tier per five levels, 1 to 5), part test n is 300 × n.
-- The browser derives a learner's learning XP from verified progress with the
-- same numbers, and the server credits coins with them (lib/rewards/coins.ts).
CREATE OR REPLACE FUNCTION public.learn_step_xp(p_kind TEXT, p_ref INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_ref IS NULL OR p_ref < 1 THEN 0
    WHEN p_kind = 'level' THEN 50 * LEAST(5, GREATEST(1, CEIL(p_ref / 5.0)::INTEGER))
    WHEN p_kind = 'checkpoint' THEN 300 * p_ref
    ELSE 0
  END;
$$;
REVOKE ALL ON FUNCTION public.learn_step_xp(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.learn_step_xp(TEXT, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. A Challenge run and a coding first pass credit the ledger.
-- ---------------------------------------------------------------------------
-- Restated from 022. What changes: an applied award also adds its XP to the
-- day's ledger row. A replayed award id is still refused before anything is
-- written, so the ledger counts each award once.
CREATE OR REPLACE FUNCTION public.record_verified_activity_xp(
  p_user_id TEXT,
  p_award_id TEXT,
  p_subject TEXT,
  p_xp INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applied INTEGER;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_award_id !~ '^[A-Za-z0-9:_-]{8,128}$' OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_xp <= 0 OR p_xp > 10000 THEN
    RAISE EXCEPTION 'invalid_activity_award';
  END IF;

  INSERT INTO public.verified_activity_awards (award_id, user_id, subject, xp)
  VALUES (p_award_id, p_user_id, p_subject, p_xp)
  ON CONFLICT (award_id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  IF v_applied = 0 THEN RETURN FALSE; END IF;

  INSERT INTO public.user_xp (user_id, quest_xp, quest_xp_by_subject)
  VALUES (p_user_id, p_xp, jsonb_build_object(p_subject, p_xp))
  ON CONFLICT (user_id) DO UPDATE SET
    quest_xp = LEAST(100000000, public.user_xp.quest_xp + p_xp),
    quest_xp_by_subject = jsonb_set(
      COALESCE(public.user_xp.quest_xp_by_subject, '{}'::jsonb),
      ARRAY[p_subject],
      to_jsonb(LEAST(
        100000000,
        COALESCE((public.user_xp.quest_xp_by_subject ->> p_subject)::BIGINT, 0) + p_xp
      )),
      TRUE
    ),
    updated_at = NOW();

  -- New in 056: the month's XP.
  PERFORM public.add_xp_day(p_user_id, p_subject, p_xp);

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_verified_activity_xp(TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_activity_xp(TEXT, TEXT, TEXT, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. A Learn step passed for the first time credits the ledger.
-- ---------------------------------------------------------------------------
-- Restated from 048. What changes: when this completion passes a level or part
-- test the learner had not passed before, its first-pass XP (learn_step_xp)
-- goes to the day's ledger row. Learning XP is derived from verified progress
-- and is not in user_xp, so this is where a month learns of it. A completed
-- attempt returns FALSE above and adds nothing, and a replay of a passed step
-- is not a first pass.
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

  -- 048: a finished level or part test is a day of learning.
  IF p_user_id IS NOT NULL THEN
    PERFORM public.advance_verified_streak(p_user_id);
  END IF;

  -- New in 056: a first pass earns the step's learning XP, and the month's
  -- ledger counts it.
  IF p_user_id IS NOT NULL AND v_passed AND NOT v_was_passed THEN
    PERFORM public.add_xp_day(p_user_id, v_attempt.subject, public.learn_step_xp(v_attempt.kind, v_attempt.ref));
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 6. A month's XP, ranked, and the "This month" board.
-- ---------------------------------------------------------------------------
-- The one ranking: the learners with XP in one subject's calendar month (UTC),
-- most XP first. Equal XP shares a place (RANK: 1, 1, 3). The board and the
-- settlement both read it, so the board shows what the month will pay.
CREATE OR REPLACE FUNCTION public.month_xp_ranks(
  p_subject     TEXT,
  p_month_start DATE
)
RETURNS TABLE (user_id TEXT, xp BIGINT, rank INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT d.user_id,
         SUM(d.xp)::BIGINT AS xp,
         RANK() OVER (ORDER BY SUM(d.xp) DESC)::INTEGER AS rank
    FROM public.user_xp_days d
   WHERE d.subject = p_subject
     AND d.day >= date_trunc('month', p_month_start)::DATE
     AND d.day < (date_trunc('month', p_month_start) + INTERVAL '1 month')::DATE
   GROUP BY d.user_id;
$$;
REVOKE ALL ON FUNCTION public.month_xp_ranks(TEXT, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.month_xp_ranks(TEXT, DATE) TO service_role;

-- The "This month" board (api/leaderboard.ts, period=month): the current UTC
-- month unless p_month ('yyyy-mm') names another. A learner is named as on
-- every other board: board_display_name (055) gives NULL until they switched
-- on show_on_leaderboards, then their sharkname or the Google name they chose,
-- and the photo follows show_on_leaderboards alone. The viewer's own row is
-- marked, and follows the same rule.
CREATE OR REPLACE FUNCTION public.month_xp_leaderboard(
  p_subject TEXT,
  p_limit   INTEGER DEFAULT 100,
  p_viewer  TEXT    DEFAULT NULL,
  p_month   TEXT    DEFAULT NULL
)
RETURNS TABLE (
  rank         INTEGER,
  display_name TEXT,
  picture      TEXT,
  xp           BIGINT,
  is_viewer    BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.rank,
         public.board_display_name(r.user_id),
         CASE WHEN u.show_on_leaderboards THEN u.picture END,
         r.xp,
         (p_viewer IS NOT NULL AND r.user_id = p_viewer)
    FROM public.month_xp_ranks(
           p_subject,
           CASE WHEN p_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
                THEN TO_DATE(p_month || '-01', 'YYYY-MM-DD')
                ELSE (NOW() AT TIME ZONE 'UTC')::DATE END
         ) r
    LEFT JOIN public.user_stats u ON u.user_id = r.user_id
   ORDER BY r.rank ASC, r.user_id ASC
   LIMIT GREATEST(LEAST(COALESCE(p_limit, 100), 200), 1);
$$;
REVOKE ALL ON FUNCTION public.month_xp_leaderboard(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.month_xp_leaderboard(TEXT, INTEGER, TEXT, TEXT) TO service_role;

-- The signed-in learner's own place on that board, for the line pinned under
-- it. No row when they have no XP that month.
CREATE OR REPLACE FUNCTION public.month_xp_leaderboard_rank(
  p_user    TEXT,
  p_subject TEXT,
  p_month   TEXT DEFAULT NULL
)
RETURNS TABLE (rank INTEGER, xp BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.rank, r.xp
    FROM public.month_xp_ranks(
           p_subject,
           CASE WHEN p_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
                THEN TO_DATE(p_month || '-01', 'YYYY-MM-DD')
                ELSE (NOW() AT TIME ZONE 'UTC')::DATE END
         ) r
   WHERE r.user_id = p_user;
$$;
REVOKE ALL ON FUNCTION public.month_xp_leaderboard_rank(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.month_xp_leaderboard_rank(TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. The monthly top three, by the month's XP, ties sharing the place.
-- ---------------------------------------------------------------------------
-- Restated from 041. What changes: the month is ranked by the XP its learners
-- earned in it (month_xp_ranks), not by correct answers, and a tie shares the
-- place. Everyone tied at a place gets that place's coins, and the next total
-- takes the place after the tied group (1, 1, 3): nobody below third is paid.
-- 041 broke ties by the earlier first active day and paid one learner per
-- place. Each winner's credit has its own event (`month-top:<yyyy-mm>:<place>:
-- <account>`), so two learners sharing a place are both paid and a replay pays
-- nobody twice. A place held by a free account is still paid to nobody, as in
-- 041. The month settles once (token_month_settlements), so running it again
-- changes nothing. p_min_answers stays for the caller in production and no
-- longer decides anything: any XP that month puts a learner on the board.
CREATE OR REPLACE FUNCTION public.settle_month_top3(
  p_month       TEXT,
  p_subject     TEXT,
  p_rewards     INTEGER[],
  p_min_answers INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start    DATE;
  v_end      DATE;
  v_row      RECORD;
  v_premium  BOOLEAN;
  v_coins    INTEGER;
  v_paid     BOOLEAN;
  v_winners  JSONB := '[]'::jsonb;
  v_inserted INTEGER;
BEGIN
  IF p_month IS NULL OR p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_rewards IS NULL OR COALESCE(array_length(p_rewards, 1), 0) > 10 OR
     p_min_answers IS NULL OR p_min_answers < 1 OR p_min_answers > 1000 THEN
    RAISE EXCEPTION 'invalid_month_settlement';
  END IF;
  v_start := TO_DATE(p_month || '-01', 'YYYY-MM-DD');
  v_end := (v_start + INTERVAL '1 month')::DATE;
  IF v_end > (NOW() AT TIME ZONE 'UTC')::DATE THEN
    RETURN jsonb_build_object('settled', FALSE, 'reason', 'open');
  END IF;

  INSERT INTO public.token_month_settlements (month, subject)
  VALUES (p_month, p_subject)
  ON CONFLICT (month) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('settled', FALSE, 'reason', 'already');
  END IF;

  FOR v_row IN
    SELECT r.user_id, r.xp, r.rank
      FROM public.month_xp_ranks(p_subject, v_start) r
     WHERE r.rank <= LEAST(3, COALESCE(array_length(p_rewards, 1), 0))
     ORDER BY r.rank, r.user_id
  LOOP
    v_premium := public.is_premium(v_row.user_id);
    v_coins := p_rewards[v_row.rank];
    v_paid := FALSE;
    IF v_premium AND v_coins IS NOT NULL AND v_coins BETWEEN 1 AND 100000 THEN
      v_paid := public.credit_tokens(
        v_row.user_id,
        'month-top:' || p_month || ':' || v_row.rank || ':' || public.token_account_key(v_row.user_id),
        p_subject, v_coins, 'milestone', 'month-top:' || p_month
      );
    END IF;
    v_winners := v_winners || jsonb_build_object(
      'rank', v_row.rank, 'userId', v_row.user_id, 'xp', v_row.xp,
      'premium', v_premium, 'coins', CASE WHEN v_paid THEN v_coins ELSE 0 END
    );
  END LOOP;

  UPDATE public.token_month_settlements SET winners = v_winners WHERE month = p_month;
  RETURN jsonb_build_object('settled', TRUE, 'winners', jsonb_array_length(v_winners));
END;
$$;
REVOKE ALL ON FUNCTION public.settle_month_top3(TEXT, TEXT, INTEGER[], INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_month_top3(TEXT, TEXT, INTEGER[], INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Account erasure: the monthly XP ledger goes with the account.
-- ---------------------------------------------------------------------------
-- delete_user_data is restated from 051 (052 to 055 do not touch it) with one
-- line more, at the end: the account's user_xp_days rows. Every other
-- statement, the signature and the grants are unchanged, so the code in
-- production keeps calling it as it does. It refuses to install before the
-- migrations whose tables it erases, as 051 did; user_xp_days is created
-- above in this file.
DO $$
DECLARE
  v_table   TEXT;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'merch_stock', 'merch_orders', 'merch_order_items',                      -- 028
    'path_reward_claims',                                                    -- 035
    'entitlement_grants', 'billing_customers', 'billing_checkout_consents',  -- 039
    'user_activity_days',                                                    -- 040
    'token_xp_credits', 'token_month_settlements',                           -- 041
    'referral_codes', 'referrals',                                           -- 042
    'premium_vouchers', 'premium_voucher_redemptions'                        -- 045
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      v_missing := v_missing || v_table;
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'migration 056 needs 035 and 039 to 045 first; missing: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.matches WHERE host_id = p_user_id;
  DELETE FROM public.match_answers WHERE user_id = p_user_id;
  DELETE FROM public.match_participants WHERE user_id = p_user_id;
  DELETE FROM public.daily_attempts WHERE user_id = p_user_id;
  DELETE FROM public.flashcards WHERE user_id = p_user_id;
  DELETE FROM public.user_category_stats WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_progress WHERE user_id = p_user_id;
  DELETE FROM public.user_streak WHERE user_id = p_user_id;
  DELETE FROM public.user_streak_config WHERE user_id = p_user_id;
  DELETE FROM public.user_streak_freezes WHERE user_id = p_user_id;
  DELETE FROM public.user_xp WHERE user_id = p_user_id;
  DELETE FROM public.user_badges WHERE user_id = p_user_id;
  DELETE FROM public.user_cards WHERE user_id = p_user_id;
  DELETE FROM public.daily_queue_completions WHERE user_id = p_user_id;
  DELETE FROM public.challenge_scores WHERE user_id = p_user_id;
  DELETE FROM public.auth_events WHERE user_id = p_user_id;
  DELETE FROM public.question_reports WHERE reporter_sub = p_user_id;
  DELETE FROM public.user_question_history WHERE user_id = p_user_id;
  DELETE FROM public.concept_reviews WHERE user_id = p_user_id;
  DELETE FROM public.practice_sessions WHERE user_id = p_user_id;
  DELETE FROM public.coding_puzzle_results WHERE user_id = p_user_id;
  DELETE FROM public.coding_skips WHERE user_id = p_user_id;
  DELETE FROM public.coding_collection_items
   WHERE collection_id IN (SELECT collection_id FROM public.coding_collections WHERE user_id = p_user_id);
  DELETE FROM public.coding_collections WHERE user_id = p_user_id;
  DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.cosmetic_entitlements WHERE user_id = p_user_id;
  DELETE FROM public.token_ledger WHERE user_id = p_user_id;
  DELETE FROM public.token_balances WHERE user_id = p_user_id;
  -- 051: the account's orders that never reached the supplier give their
  -- stock back first. They are locked before anything is read, so an order
  -- the owner hands to Spreadshop at this moment is either released here or
  -- submitted there, never both. One grouped update per SKU and size, never
  -- below zero. A claimed learning-path package reserved nothing (035, 043)
  -- and releases nothing.
  PERFORM 1 FROM public.merch_orders
   WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'paid')
   FOR UPDATE;
  UPDATE public.merch_stock s
     SET reserved = GREATEST(0, s.reserved - held.quantity), updated_at = NOW()
    FROM (SELECT i.sku, i.variant, SUM(i.quantity)::INTEGER AS quantity
            FROM public.merch_order_items i
            JOIN public.merch_orders o ON o.order_id = i.order_id
           WHERE o.user_id = p_user_id
             AND o.state IN ('awaiting_payment', 'paid')
             AND NOT EXISTS (SELECT 1 FROM public.path_reward_claims c WHERE c.order_id = o.order_id)
           GROUP BY i.sku, i.variant) held
   WHERE s.sku = held.sku AND s.variant = held.variant;
  DELETE FROM public.merch_order_items
   WHERE order_id IN (SELECT order_id FROM public.merch_orders
                       WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled'));
  DELETE FROM public.merch_orders
   WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled');
  -- 051: a paid order the supplier never received can no longer ship, and its
  -- units went back above. It is cancelled, which takes it off the
  -- fulfilment queue (paid orders), and stays, anonymised below, as the
  -- shop's record of what was paid: a coin redemption's coins went with the
  -- account, and a cash payment can be refunded against its provider
  -- reference. Orders already submitted or shipped are kept as before.
  UPDATE public.merch_orders
     SET state = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
   WHERE user_id = p_user_id AND state = 'paid';
  UPDATE public.merch_orders
     SET user_id = 'deleted-account',
         ship_name = 'redacted', ship_line1 = 'redacted', ship_line2 = NULL,
         ship_city = 'redacted', ship_postal = 'redacted', updated_at = NOW()
   WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_drafts WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_progress WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_evidence WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_attempts WHERE user_id = p_user_id;
  DELETE FROM public.learning_path_enrollments WHERE user_id = p_user_id;
  DELETE FROM public.github_commits WHERE user_id = p_user_id;
  DELETE FROM public.github_connections WHERE user_id = p_user_id;
  DELETE FROM public.coding_drafts WHERE user_id = p_user_id;
  DELETE FROM public.coding_attempts WHERE user_id = p_user_id;
  DELETE FROM public.coding_progress WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_attempts WHERE user_id = p_user_id;
  DELETE FROM public.verified_skill_checks WHERE user_id = p_user_id;
  DELETE FROM public.verified_activity_awards WHERE user_id = p_user_id;
  DELETE FROM public.quiz_submissions WHERE user_id = p_user_id;
  DELETE FROM public.quiz_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
  DELETE FROM public.friendships WHERE p_user_id IN (user_low, user_high);
  DELETE FROM public.user_handles WHERE user_id = p_user_id;

  -- 035: the claim on a finished path's package. The order it created went
  -- above if it was never sent (awaiting payment or cancelled), and so does
  -- the claim. An order already with Spreadshop stays, anonymised, and its
  -- claim stays too, because the fulfilment queue recognises a package by its
  -- claim row (043). That row loses the person: its account part becomes
  -- 'deleted-account:<order id>', which keeps the primary key unique.
  DELETE FROM public.path_reward_claims c
   WHERE c.user_id = p_user_id
     AND (c.order_id IS NULL
          OR NOT EXISTS (SELECT 1 FROM public.merch_orders o WHERE o.order_id = c.order_id));
  UPDATE public.path_reward_claims
     SET user_id = 'deleted-account:' || order_id
   WHERE user_id = p_user_id;

  -- 039: Premium grants, the billing-customer link and the checkout
  -- consents. billing_events hold provider data and no account id.
  DELETE FROM public.entitlement_grants WHERE user_id = p_user_id;
  DELETE FROM public.billing_customers WHERE user_id = p_user_id;
  DELETE FROM public.billing_checkout_consents WHERE user_id = p_user_id;

  -- 040: the dated answers behind the 30-day board.
  DELETE FROM public.user_activity_days WHERE user_id = p_user_id;

  -- 041: coin credit records. A settled month keeps its ranks and loses the
  -- person.
  DELETE FROM public.token_xp_credits WHERE user_id = p_user_id;
  UPDATE public.token_month_settlements s
     SET winners = (
       SELECT COALESCE(jsonb_agg(
                CASE WHEN w ->> 'userId' = p_user_id
                     THEN w || jsonb_build_object('userId', 'deleted-account')
                     ELSE w END
                ORDER BY ordinality), '[]'::jsonb)
         FROM jsonb_array_elements(s.winners) WITH ORDINALITY AS t(w, ordinality)
     )
   WHERE s.winners @> jsonb_build_array(jsonb_build_object('userId', p_user_id));

  -- 042: the invite code and the account's own referral row. A referral it
  -- made keeps the friend's side under 'deleted-account'.
  DELETE FROM public.referral_codes WHERE user_id = p_user_id;
  DELETE FROM public.referrals WHERE invitee_user_id = p_user_id;
  UPDATE public.referrals SET referrer_user_id = 'deleted-account' WHERE referrer_user_id = p_user_id;

  -- 043 added no per-account table: a hoodie order is a merch_orders row,
  -- handled above, and merch_stock is the owner's monthly cap, which 051
  -- gives back the units of the orders above that never shipped.

  -- 045: the account's voucher redemptions. Each went with its grant in the
  -- 039 lines above (ON DELETE CASCADE); this removes any row left. The
  -- voucher keeps its count, so a used-up code stays used up. A voucher the
  -- account created as an admin keeps its counts and loses the person.
  DELETE FROM public.premium_voucher_redemptions WHERE user_id = p_user_id;
  UPDATE public.premium_vouchers SET created_by = 'deleted-account' WHERE created_by = p_user_id;

  -- 056: the month's XP ledger. A settled month keeps its places and loses
  -- the person (the token_month_settlements lines above).
  DELETE FROM public.user_xp_days WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

COMMIT;
