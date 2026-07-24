-- Migration 024: daily habit loop, forgiving streaks, server badges, Shark Cards.
-- Apply after migrations 001-023. Safe to re-run.
--
-- This migration adds the server-authoritative storage and one-transaction RPCs
-- for the Deep End "daily habit" additions:
--   * Spaced mastery: a Learn level is "cleared" on its first pass and only
--     "mastered" after 3 correct passes on 3 distinct UTC days. Passes are
--     recorded inside the existing verified roadmap completion so they can't be
--     farmed from the client.
--   * Forgiving streaks: configurable non-school days never break a streak, and
--     each learner gets 2 monthly streak freezes that bridge missed school days.
--   * Server-synced badges: earned achievements are stored once with a stable
--     earned_at, computed from already-verified stats.
--   * Shark Cards: finishing a subject's daily "Today" queue grants one
--     cosmetic card pack per subject per UTC day, recorded idempotently.
--
-- Nothing here changes access, content, grading, XP, or leaderboards. Cards and
-- freezes are cosmetic/retention only and are never purchasable with tokens.

-- ---------------------------------------------------------------------------
-- 1. Forgiving streaks: per-user off-days and a monthly freeze budget.
-- ---------------------------------------------------------------------------

-- Which weekdays never count against a streak (0 = Sunday .. 6 = Saturday,
-- matching Postgres EXTRACT(DOW)). Default is the weekend. Empty means every
-- day is a school day.
CREATE TABLE IF NOT EXISTS public.user_streak_config (
  user_id    TEXT PRIMARY KEY,
  off_days   INTEGER[] NOT NULL DEFAULT ARRAY[0, 6],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (array_length(off_days, 1) IS NULL OR array_length(off_days, 1) <= 7)
);

-- The monthly freeze budget. `period` is the UTC 'YYYY-MM' the balance belongs
-- to; a new period resets the allowance. `used` records the specific school
-- days a freeze bridged, for transparency in the profile.
CREATE TABLE IF NOT EXISTS public.user_streak_freezes (
  user_id    TEXT PRIMARY KEY,
  period     TEXT NOT NULL DEFAULT TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM'),
  remaining  INTEGER NOT NULL DEFAULT 2 CHECK (remaining >= 0 AND remaining <= 2),
  used       JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_streak_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streak_freezes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_streak_config, public.user_streak_freezes FROM anon, authenticated;

-- Learners may read their own freeze budget/off-days directly; all writes go
-- through the service-role API, matching every other learning table.
CREATE POLICY "streak_config_select_own"
  ON public.user_streak_config FOR SELECT
  USING (user_id = auth.uid()::text);
CREATE POLICY "streak_freezes_select_own"
  ON public.user_streak_freezes FOR SELECT
  USING (user_id = auth.uid()::text);

-- Monthly allowance, refreshed lazily. Returns the live balance for the current
-- UTC period so the profile can show "2 freezes left this month".
CREATE OR REPLACE FUNCTION public.refresh_streak_freezes(p_user_id TEXT)
RETURNS TABLE (period TEXT, remaining INTEGER, used JSONB)
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

  SELECT * INTO v_row
    FROM public.user_streak_freezes
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_row.period IS DISTINCT FROM v_period THEN
    UPDATE public.user_streak_freezes
       SET period = v_period, remaining = 2, used = '[]'::jsonb, updated_at = NOW()
     WHERE user_id = p_user_id
     RETURNING * INTO v_row;
  END IF;

  RETURN QUERY SELECT v_row.period, v_row.remaining, v_row.used;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_streak_freezes(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_streak_freezes(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Freeze-aware verified quiz result.
-- ---------------------------------------------------------------------------
-- Replaces the migration 022 v2 body (the function the API actually calls).
-- Behaviour is identical except the streak no longer breaks when the only gap
-- since the last active day is off-days, or when the learner still has enough
-- monthly freezes to bridge the missed school days.
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
  v_off INTEGER[];
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
    SELECT off_days INTO v_off
      FROM public.user_streak_config
     WHERE user_id = p_user_id;
    IF v_off IS NULL THEN v_off := ARRAY[0, 6]; END IF;

    -- Count the missed *school* days strictly between the last active day and
    -- today. Off-days are free and never need a freeze.
    SELECT COUNT(*) INTO v_missed
      FROM generate_series(v_prev_date + 1, v_today - 1, INTERVAL '1 day') AS gap(day)
     WHERE EXTRACT(DOW FROM gap.day)::INTEGER <> ALL (v_off);

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
                    WHERE EXTRACT(DOW FROM gap.day)::INTEGER <> ALL (v_off)
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

REVOKE ALL ON FUNCTION public.record_verified_quiz_result_v2(
  TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result_v2(
  TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER
) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Spaced mastery: cleared vs mastered inside verified roadmap completion.
-- ---------------------------------------------------------------------------
-- Replaces the migration 023 body. Everything is identical except that a passed
-- *level* also records today's UTC day into a distinct-day pass set; three
-- distinct days flip the level from cleared to mastered. Checkpoints/part tests
-- are unaffected.
CREATE OR REPLACE FUNCTION public.complete_verified_roadmap_attempt(
  p_user_id TEXT,
  p_attempt_id TEXT
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

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Server-synced badges.
-- ---------------------------------------------------------------------------
-- Earned achievements, one row per (user, subject, badge). earned_at is set on
-- first sighting and never moves, so a badge shown in the profile keeps a stable
-- date across devices. Eligibility is decided by the API from verified stats;
-- this table only remembers what has already been earned.
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id   TEXT NOT NULL,
  subject   TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  badge_id  TEXT NOT NULL CHECK (badge_id ~ '^[a-z0-9-]{1,50}$'),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, badge_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_subject_idx
  ON public.user_badges (user_id, subject);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_badges FROM anon, authenticated;
CREATE POLICY "user_badges_select_own"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid()::text);

-- Record any newly earned badges (idempotent) and return the full earned set
-- with stable timestamps.
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
    ON CONFLICT (user_id, subject, badge_id) DO NOTHING;
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
-- 5. Shark Cards: cosmetic collectible packs.
-- ---------------------------------------------------------------------------
-- The learner's collection. count is how many copies of a card they own; a
-- finite catalog lives in shared TypeScript, so this table only stores ids.
CREATE TABLE IF NOT EXISTS public.user_cards (
  user_id         TEXT NOT NULL,
  subject         TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  card_id         TEXT NOT NULL CHECK (card_id ~ '^[a-z0-9-]{1,60}$'),
  count           INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1 AND count <= 100000),
  first_earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, card_id)
);

CREATE INDEX IF NOT EXISTS user_cards_user_subject_idx
  ON public.user_cards (user_id, subject);

-- One pack per subject per UTC day. The row makes the daily grant idempotent so
-- refreshing the Today screen never yields a second pack.
CREATE TABLE IF NOT EXISTS public.daily_queue_completions (
  user_id      TEXT NOT NULL,
  subject      TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  queue_date   DATE NOT NULL,
  granted_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, queue_date)
);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_queue_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_cards, public.daily_queue_completions FROM anon, authenticated;
CREATE POLICY "user_cards_select_own"
  ON public.user_cards FOR SELECT
  USING (user_id = auth.uid()::text);
CREATE POLICY "daily_queue_completions_select_own"
  ON public.daily_queue_completions FOR SELECT
  USING (user_id = auth.uid()::text);

-- Grant one pack for a subject's daily queue exactly once. The API computes the
-- deterministic card ids from a per-user/day seed and the shared catalog; this
-- function persists them idempotently. Returns 'granted' the first time and
-- 'claimed' on any replay, along with the recorded cards.
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
  SELECT p_user_id, p_subject, value, 1
    FROM jsonb_array_elements_text(p_card_ids) AS value
   WHERE value ~ '^[a-z0-9-]{1,60}$'
  ON CONFLICT (user_id, subject, card_id) DO UPDATE SET
    count = LEAST(100000, public.user_cards.count + 1);

  RETURN QUERY SELECT 'granted'::TEXT, p_card_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_daily_queue_cards(TEXT, TEXT, DATE, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_daily_queue_cards(TEXT, TEXT, DATE, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Sharkira hint cache.
-- ---------------------------------------------------------------------------
-- Socratic pre-answer hints are cached per question+locale (they never depend on
-- a selected answer). Generation shares the existing ai_generation_budget ledger.
-- This is shared content, not user data, so it is intentionally excluded from
-- delete_user_data, exactly like question_explanations.
CREATE TABLE IF NOT EXISTS public.question_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'cs')),
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (question_id, question_hash, locale)
);

CREATE INDEX IF NOT EXISTS question_hints_review_idx
  ON public.question_hints (status, created_at DESC)
  WHERE status = 'generated';

ALTER TABLE public.question_hints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.question_hints FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Keep account erasure complete.
-- ---------------------------------------------------------------------------
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
  DELETE FROM public.roadmap_attempts WHERE user_id = p_user_id;
  DELETE FROM public.verified_skill_checks WHERE user_id = p_user_id;
  DELETE FROM public.verified_activity_awards WHERE user_id = p_user_id;
  DELETE FROM public.quiz_submissions WHERE user_id = p_user_id;
  DELETE FROM public.quiz_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

-- Rollback: the new tables and columns are additive and backward-compatible.
-- Application code rolled back to pre-024 ignores the new roadmap-progress
-- fields (passDays/mastered) and the freeze/badge/card tables. To fully revert,
-- restore the migration 021 record_verified_quiz_result and migration 023
-- complete_verified_roadmap_attempt bodies, then drop the tables added here.
