-- Migration 040: dated activity, the 30-day leaderboard, and a friend list
-- that ranks by learning rather than by streak.
-- Apply after migrations 001-039. Safe to re-run. Nothing here depends on 039.
--
-- The all-time board ranks lifetime correct answers from user_category_stats.
-- That table carries no dates, so whoever has been around longest stays on top
-- and a new learner cannot catch up. This migration records the same numbers
-- per day and ranks a rolling window over them. The all-time functions are not
-- touched: they keep their sources, and the two boards differ only in the
-- window and in the fact that the window also counts Learn answers and the
-- Biggest Shark Challenge.
--
-- What is counted, and where it is written:
--
--   * record_verified_quiz_result_v2 (quizzes and the daily challenge) adds
--     each category of the verified batch. It is restated from 032 with one
--     PERFORM added inside the per-category loop, which only runs once the
--     attempt receipt was new and, for a daily, only for the first result of
--     the day. A retry that improves a daily score adds nothing here, exactly
--     as it adds nothing to user_category_stats.
--   * record_roadmap_answer_v2 (Learn) adds one answer the first time a
--     signed-in learner answers a question in an attempt. Restated from 034;
--     the answer row is the receipt. It counts only while the attempt's level
--     or part test is not yet passed, and a question counts at most once per
--     learner and UTC day: a level's questions never change and every answer
--     returns the correct option, so a replayed level would otherwise add
--     unlimited correct answers (review finding integrity-5).
--   * record_challenge_completion (new, the Biggest Shark Challenge) applies the
--     run's XP through record_verified_activity_xp under the same award id the
--     handler has always used, `challenge:<run id>`, and adds the run's answers
--     only when that award was new.
--
-- Coding passes are not written here. They are not question answers, and
-- mixing units would change what a rank means.
--
-- The ranking rule is the one every board in this product uses: correct
-- answers, then fewer answers for the same number correct (higher accuracy).
-- Never XP and never a streak. friend_list (036) ordered by current_streak,
-- which contradicted that; it is restated below with the ordering changed and
-- nothing else, and it still returns the streak as a fact to show.
--
-- No backfill. Quiz history holds no per-day category counts, so a backfill
-- could only have dated Learn answers, and a window filled from one source
-- would rank Learn above quizzes for the next thirty days. The window fills
-- from the first answer after this migration.
--
-- Account erasure: delete_user_data is not restated here, so a parallel
-- migration that restates it cannot silently drop a line added in this one.
-- delete_user_activity_days is the erasure for this table and
-- api/user/[op].ts calls it beside delete_user_data. Fold it into
-- delete_user_data the next time that routine is restated.

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_activity_days (
  user_id    TEXT        NOT NULL CHECK (char_length(user_id) BETWEEN 8 AND 128),
  day        DATE        NOT NULL,
  category   TEXT        NOT NULL CHECK (category ~ '^[a-z0-9-]{1,50}$'),
  correct    INTEGER     NOT NULL DEFAULT 0 CHECK (correct >= 0),
  answered   INTEGER     NOT NULL DEFAULT 0 CHECK (answered >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day, category),
  CONSTRAINT user_activity_days_correct_le_answered CHECK (correct <= answered)
);

-- The boards read a date range across everybody; the primary key serves the
-- per-learner reads.
CREATE INDEX IF NOT EXISTS user_activity_days_day_idx
  ON public.user_activity_days (day, category);

ALTER TABLE public.user_activity_days ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_activity_days FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_activity_days TO authenticated;

DROP POLICY IF EXISTS "user_activity_days_select_own" ON public.user_activity_days;
CREATE POLICY "user_activity_days_select_own"
  ON public.user_activity_days FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- ---------------------------------------------------------------------------
-- 2. The one write
-- ---------------------------------------------------------------------------
--
-- Every caller is a verified routine that has already decided the batch is new.
-- This adds it to the day. Bad input is skipped rather than raised: the
-- learning write around it must not fail because a count could not be dated,
-- and the callers validate their input before they get here.

CREATE OR REPLACE FUNCTION public.add_activity_day(
  p_user_id  TEXT,
  p_day      DATE,
  p_category TEXT,
  p_correct  INTEGER,
  p_answered INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_day IS NULL OR
     p_category IS NULL OR p_category !~ '^[a-z0-9-]{1,50}$' OR
     p_correct IS NULL OR p_answered IS NULL OR
     p_answered <= 0 OR p_answered > 1000 OR
     p_correct < 0 OR p_correct > p_answered THEN
    RETURN;
  END IF;

  INSERT INTO public.user_activity_days (user_id, day, category, correct, answered)
  VALUES (p_user_id, p_day, p_category, p_correct, p_answered)
  ON CONFLICT (user_id, day, category) DO UPDATE SET
    correct    = LEAST(1000000, public.user_activity_days.correct + EXCLUDED.correct),
    answered   = LEAST(1000000, public.user_activity_days.answered + EXCLUDED.answered),
    updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.add_activity_day(TEXT, DATE, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_activity_day(TEXT, DATE, TEXT, INTEGER, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Quizzes and the daily challenge
-- ---------------------------------------------------------------------------
--
-- Restated in full from 032 so the newest migration is the readable
-- definition. The only change is the PERFORM inside the per-category loop.

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

  -- A daily challenge can be retried to improve the leaderboard, but only the
  -- first verified result for this user/date/subject mutates stats and XP.
  IF p_daily_date IS NOT NULL THEN
    INSERT INTO public.daily_attempts (
      user_id, challenge_date, subject, correct, total, duration_ms
    ) VALUES (
      p_user_id, p_daily_date, p_subject, p_correct, p_total, p_duration_ms
    )
    ON CONFLICT (user_id, challenge_date, subject) DO NOTHING;
    GET DIAGNOSTICS v_applied = ROW_COUNT;
    IF v_applied = 0 THEN
      UPDATE public.daily_attempts
         SET correct = p_correct,
             total = p_total,
             duration_ms = p_duration_ms,
             created_at = NOW()
       WHERE user_id = p_user_id
         AND challenge_date = p_daily_date
         AND subject = p_subject
         AND (
           p_correct > correct OR
           (p_correct = correct AND p_duration_ms < COALESCE(duration_ms, 2147483647))
         );
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

-- CREATE OR REPLACE keeps the existing grants, but restating them makes this
-- file complete on a database built from the migrations in order.
REVOKE ALL ON FUNCTION public.record_verified_quiz_result_v2(
  TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result_v2(
  TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER
) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Learn answers
-- ---------------------------------------------------------------------------
--
-- Restated in full from 034. The only changes are the new declarations and the block after
-- the answer insert.

CREATE OR REPLACE FUNCTION public.record_roadmap_answer_v2(
  p_attempt_id      TEXT,
  p_user_id         TEXT,
  p_question_id     TEXT,
  p_selected_index  INTEGER,
  p_correct_index   INTEGER,
  -- The descriptor, so a first answer can open the attempt without a second
  -- trip. Every field is the server's own, read from the sealed session.
  p_subject         TEXT,
  p_topic           TEXT,
  p_kind            TEXT,
  p_ref             INTEGER,
  p_total_questions INTEGER,
  p_pass_pct        INTEGER,
  p_required_start  INTEGER DEFAULT NULL,
  p_required_end    INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt   public.roadmap_attempts%ROWTYPE;
  v_answer    public.roadmap_attempt_answers%ROWTYPE;
  v_first     INTEGER;
  v_progress  JSONB;
  v_day_start TIMESTAMPTZ;
BEGIN
  IF p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
     p_selected_index NOT BETWEEN 0 AND 25 OR
     p_correct_index NOT BETWEEN 0 AND 25 OR
     p_total_questions NOT BETWEEN 1 AND 50 OR
     p_pass_pct NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_roadmap_answer';
  END IF;

  -- Open the attempt if this is the first answer. ON CONFLICT DO NOTHING makes
  -- two tabs answering at once cost one row rather than an error.
  INSERT INTO public.roadmap_attempts (
    attempt_id, user_id, subject, topic, kind, ref, total_questions, pass_pct,
    required_level_start, required_level_end, expires_at
  ) VALUES (
    p_attempt_id, p_user_id, p_subject, p_topic, p_kind, p_ref,
    p_total_questions, p_pass_pct, p_required_start, p_required_end,
    NOW() + INTERVAL '2 hours'
  )
  ON CONFLICT (attempt_id) DO NOTHING;

  SELECT * INTO v_attempt
    FROM public.roadmap_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;

  -- Exactly the checks the two-step path ran, on the row it would have read.
  -- The descriptor comparison is what stopped a session id being replayed
  -- against an attempt opened for a different lesson.
  IF NOT FOUND
     OR v_attempt.user_id IS DISTINCT FROM p_user_id
     OR v_attempt.expires_at < NOW()
     OR v_attempt.completed_at IS NOT NULL
     OR v_attempt.subject IS DISTINCT FROM p_subject
     OR v_attempt.topic IS DISTINCT FROM p_topic
     OR v_attempt.kind IS DISTINCT FROM p_kind
     OR v_attempt.ref IS DISTINCT FROM p_ref
     OR v_attempt.total_questions IS DISTINCT FROM p_total_questions
     OR v_attempt.required_level_start IS DISTINCT FROM p_required_start
     OR v_attempt.required_level_end IS DISTINCT FROM p_required_end THEN
    RAISE EXCEPTION 'invalid_roadmap_attempt';
  END IF;

  INSERT INTO public.roadmap_attempt_answers (
    attempt_id, question_id, selected_index, correct_index, is_correct
  ) VALUES (
    p_attempt_id, p_question_id, p_selected_index, p_correct_index,
    p_selected_index = p_correct_index
  ) ON CONFLICT (attempt_id, question_id) DO NOTHING;
  GET DIAGNOSTICS v_first = ROW_COUNT;

  -- New in 040: a signed-in learner's first answer to this question counts
  -- once toward the windowed boards. The answer row is the receipt, so a
  -- second tap on the same question adds nothing, and an anonymous learner
  -- (no user id) is never counted. A step the learner already passed adds
  -- nothing, and neither does a question this learner already answered in
  -- another attempt today (UTC): replaying a level is review, not new answers.
  IF v_first = 1 AND p_user_id IS NOT NULL THEN
    SELECT data INTO v_progress FROM public.roadmap_progress WHERE user_id = p_user_id;
    IF NOT COALESCE(
         v_progress #> ARRAY[
           v_attempt.topic,
           CASE WHEN v_attempt.kind = 'level' THEN 'levels' ELSE 'checkpoints' END,
           v_attempt.ref::TEXT,
           'passed'
         ] = 'true'::JSONB,
         FALSE
       ) THEN
      v_day_start := ((NOW() AT TIME ZONE 'UTC')::DATE)::TIMESTAMP AT TIME ZONE 'UTC';
      -- An attempt lives two hours, so one opened before midnight can hold an
      -- answer given after it.
      PERFORM 1
        FROM public.roadmap_attempts t
        JOIN public.roadmap_attempt_answers a ON a.attempt_id = t.attempt_id
       WHERE t.user_id = p_user_id
         AND t.created_at >= v_day_start - INTERVAL '2 hours'
         AND t.attempt_id <> p_attempt_id
         AND a.question_id = p_question_id
         AND a.answered_at >= v_day_start;
      IF NOT FOUND THEN
        PERFORM public.add_activity_day(
          p_user_id,
          (NOW() AT TIME ZONE 'UTC')::DATE,
          v_attempt.topic,
          CASE WHEN p_selected_index = p_correct_index THEN 1 ELSE 0 END,
          1
        );
      END IF;
    END IF;
  END IF;

  -- The stored answer, not the submitted one: a second attempt at the same
  -- question replays the first, which is what makes the first one final.
  SELECT * INTO v_answer
    FROM public.roadmap_attempt_answers
   WHERE attempt_id = p_attempt_id AND question_id = p_question_id;

  RETURN jsonb_build_object(
    'selectedIndex', v_answer.selected_index,
    'correctAnswer', v_answer.correct_index,
    'isCorrect', v_answer.is_correct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_roadmap_answer_v2(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_roadmap_answer_v2(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER
) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. The Biggest Shark Challenge
-- ---------------------------------------------------------------------------
--
-- Until now a finished run called record_verified_activity_xp directly, and
-- that routine takes no answer counts. It stays as it is, because changing its
-- argument list would mean dropping it under a live handler. This routine is
-- the new completion step: the same award, under the same id, plus the run's
-- answers. The handler calls it and falls back to the old call until this
-- migration is applied, the same way record_roadmap_answer_v2 was introduced.
--
-- A replayed run returns FALSE and adds nothing, and so does a run the old
-- path already awarded, because the award id is the same. A run with no
-- correct answer earns no XP, leaves no receipt and is not counted; it could
-- only have added three misses.

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
-- 6. The windowed boards
-- ---------------------------------------------------------------------------
--
-- A window of p_days whole UTC days ending today: p_days = 30 is today and the
-- 29 days before it. The rule is the all-time board's rule: correct answers
-- first, then fewer answers for the same number correct. Equal results share
-- a rank. p_min_answers keeps a single lucky answer off the top, as the
-- five-question minimum does on the all-time board.
--
-- Identity is the all-time board's too: the profile name from user_stats or a
-- neutral label, and the profile picture. No handle, no country, no user id.
-- p_viewer marks the caller's own row, so a signed-in learner sees "You" on
-- the right line even when two people share a rank. The API passes it only on
-- a personal, uncached request; the shared board is asked without it.

CREATE OR REPLACE FUNCTION public.window_leaderboard(
  p_days        INTEGER,
  p_limit       INTEGER DEFAULT 100,
  p_category    TEXT    DEFAULT NULL,
  p_min_answers INTEGER DEFAULT 5,
  p_viewer      TEXT    DEFAULT NULL
)
RETURNS TABLE (
  rank         INTEGER,
  display_name TEXT,
  picture      TEXT,
  correct      INTEGER,
  answered     INTEGER,
  accuracy_pct INTEGER,
  is_viewer    BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH totals AS (
    SELECT a.user_id,
           SUM(a.correct)::INT  AS correct,
           SUM(a.answered)::INT AS answered
      FROM public.user_activity_days a
     WHERE a.day >= (NOW() AT TIME ZONE 'UTC')::DATE
                    - (GREATEST(LEAST(COALESCE(p_days, 30), 366), 1) - 1)
       AND (p_category IS NULL OR a.category = p_category)
     GROUP BY a.user_id
    HAVING SUM(a.answered) >= GREATEST(COALESCE(p_min_answers, 5), 1)
  ),
  ranked AS (
    SELECT t.user_id, t.correct, t.answered,
           RANK() OVER (ORDER BY t.correct DESC, t.answered ASC)::INT AS rank
      FROM totals t
  )
  SELECT r.rank,
         COALESCE(NULLIF(BTRIM(u.name), ''), 'Learner'),
         u.picture,
         r.correct,
         r.answered,
         CASE WHEN r.answered > 0
              THEN ROUND(100.0 * r.correct / r.answered)::INT
              ELSE 0 END,
         (p_viewer IS NOT NULL AND r.user_id = p_viewer)
    FROM ranked r
    LEFT JOIN public.user_stats u ON u.user_id = r.user_id
   ORDER BY r.rank ASC, r.user_id ASC
   LIMIT GREATEST(LEAST(COALESCE(p_limit, 100), 200), 1);
$$;

-- The caller's own line on the same board. Always one row: a learner with no
-- answers in the window gets zeros and no rank, and so does one below the
-- minimum, so the client can say which of the two it is.
CREATE OR REPLACE FUNCTION public.window_leaderboard_rank(
  p_user        TEXT,
  p_days        INTEGER,
  p_category    TEXT    DEFAULT NULL,
  p_min_answers INTEGER DEFAULT 5
)
RETURNS TABLE (
  rank         INTEGER,
  correct      INTEGER,
  answered     INTEGER,
  accuracy_pct INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH totals AS (
    SELECT a.user_id,
           SUM(a.correct)::INT  AS correct,
           SUM(a.answered)::INT AS answered
      FROM public.user_activity_days a
     WHERE a.day >= (NOW() AT TIME ZONE 'UTC')::DATE
                    - (GREATEST(LEAST(COALESCE(p_days, 30), 366), 1) - 1)
       AND (p_category IS NULL OR a.category = p_category)
     GROUP BY a.user_id
  ),
  mine AS (
    SELECT COALESCE(MAX(t.correct), 0)  AS correct,
           COALESCE(MAX(t.answered), 0) AS answered
      FROM totals t
     WHERE t.user_id = p_user
  )
  SELECT CASE WHEN m.answered >= GREATEST(COALESCE(p_min_answers, 5), 1)
              THEN 1 + (
                SELECT COUNT(*)::INT
                  FROM totals t
                 WHERE t.answered >= GREATEST(COALESCE(p_min_answers, 5), 1)
                   AND (t.correct > m.correct OR
                        (t.correct = m.correct AND t.answered < m.answered))
              )
              ELSE NULL END,
         m.correct,
         m.answered,
         CASE WHEN m.answered > 0
              THEN ROUND(100.0 * m.correct / m.answered)::INT
              ELSE 0 END
    FROM mine m;
$$;

REVOKE ALL ON FUNCTION public.window_leaderboard(INTEGER, INTEGER, TEXT, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.window_leaderboard(INTEGER, INTEGER, TEXT, INTEGER, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.window_leaderboard_rank(TEXT, INTEGER, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.window_leaderboard_rank(TEXT, INTEGER, TEXT, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Friends, ordered by learning
-- ---------------------------------------------------------------------------
--
-- Restated from 036 with the ORDER BY changed and nothing else: correct
-- answers, then accuracy, then the handle. The streak is still returned so the
-- list can show it, and it moves nobody up. The return type is unchanged, so
-- CREATE OR REPLACE is enough and the function is never absent.

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
         COALESCE(s.current_streak, 0)::INT,
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
-- 8. Erasure
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_user_activity_days(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.user_activity_days WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_activity_days(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_activity_days(TEXT) TO service_role;

-- Rollback: the table and the six new routines are additive. Restore
-- record_verified_quiz_result_v2 from 032, record_roadmap_answer_v2 from 034
-- and friend_list from 036, then drop record_challenge_completion,
-- window_leaderboard, window_leaderboard_rank, delete_user_activity_days,
-- add_activity_day and the table. Application code rolled back to before 040
-- never calls the new routines.
