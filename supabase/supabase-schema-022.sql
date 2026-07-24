-- Migration 022: server-authoritative, subject-scoped progression.
-- Apply after migrations 001-021. Safe to re-run.

-- Daily and challenge records belong to exactly one StudyShark subject. Old
-- rows predate multi-subject deployments and therefore map to Web Development.
ALTER TABLE public.daily_attempts
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'webdev';

ALTER TABLE public.challenge_scores
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'webdev';

ALTER TABLE public.daily_attempts
  DROP CONSTRAINT IF EXISTS daily_attempts_subject_valid;
ALTER TABLE public.daily_attempts
  ADD CONSTRAINT daily_attempts_subject_valid
  CHECK (subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker'));

ALTER TABLE public.challenge_scores
  DROP CONSTRAINT IF EXISTS challenge_scores_subject_valid;
ALTER TABLE public.challenge_scores
  ADD CONSTRAINT challenge_scores_subject_valid
  CHECK (subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker'));

ALTER TABLE public.daily_attempts
  DROP CONSTRAINT IF EXISTS daily_attempts_user_id_challenge_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_attempts_user_date_subject_unique
  ON public.daily_attempts (user_id, challenge_date, subject);

CREATE INDEX IF NOT EXISTS daily_attempts_subject_rank_idx
  ON public.daily_attempts (challenge_date, subject, correct DESC, duration_ms ASC);

CREATE INDEX IF NOT EXISTS challenge_scores_subject_rank_idx
  ON public.challenge_scores (subject, score DESC, created_at);

-- Idempotency ledger for non-quiz awards such as a finished challenge. The
-- opaque award id is issued and checked by the API, never chosen by a client.
CREATE TABLE IF NOT EXISTS public.verified_activity_awards (
  award_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  xp INTEGER NOT NULL CHECK (xp > 0 AND xp <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verified_activity_awards_user_created_idx
  ON public.verified_activity_awards (user_id, created_at DESC);

ALTER TABLE public.verified_activity_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.verified_activity_awards FROM anon, authenticated;

-- Per-question learning history powers deterministic review sets without
-- sending personal data or raw activity histories to an AI provider.
CREATE TABLE IF NOT EXISTS public.user_question_history (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  category TEXT NOT NULL CHECK (category ~ '^[a-z0-9-]{1,50}$'),
  times_seen INTEGER NOT NULL DEFAULT 0 CHECK (times_seen >= 0),
  times_missed INTEGER NOT NULL DEFAULT 0 CHECK (times_missed >= 0),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_missed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, subject, question_id)
);

CREATE INDEX IF NOT EXISTS user_question_history_review_idx
  ON public.user_question_history (user_id, subject, last_missed_at DESC, last_seen_at DESC);

ALTER TABLE public.user_question_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_question_history FROM anon, authenticated;

-- Admin quality/parity suggestions are deliberately separate from accepted
-- question overrides. Nothing in this table changes live content until an
-- administrator reviews and manually applies a suggestion.
CREATE TABLE IF NOT EXISTS public.question_quality_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('deterministic', 'ai')),
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  model TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (question_id, question_hash, source, kind)
);

CREATE INDEX IF NOT EXISTS question_quality_suggestions_review_idx
  ON public.question_quality_suggestions (status, created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.question_quality_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.question_quality_suggestions FROM anon, authenticated;

-- Global UTC-day generation ledger. Cached explanations do not consume this
-- budget; each uncached provider call must atomically claim one slot first.
CREATE TABLE IF NOT EXISTS public.ai_generation_budget (
  budget_date DATE PRIMARY KEY,
  generations INTEGER NOT NULL DEFAULT 0 CHECK (generations >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_generation_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_generation_budget FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_generation_budget(
  p_date DATE,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed BOOLEAN := FALSE;
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF p_date IS DISTINCT FROM v_today OR p_limit <= 0 OR p_limit > 100000 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_generation_budget (budget_date, generations)
  VALUES (p_date, 1)
  ON CONFLICT (budget_date) DO UPDATE SET
    generations = public.ai_generation_budget.generations + 1,
    updated_at = NOW()
  WHERE public.ai_generation_budget.generations < p_limit
  RETURNING TRUE INTO v_claimed;

  RETURN COALESCE(v_claimed, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_generation_budget(DATE, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_generation_budget(DATE, INTEGER)
  TO service_role;

-- Apply an activity award exactly once and increment both the legacy total and
-- the active subject balance in one short transaction.
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

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_verified_activity_xp(TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_activity_xp(TEXT, TEXT, TEXT, INTEGER)
  TO service_role;

-- Verified quiz result v2 atomically records statistics, per-category counts,
-- XP and (for a daily session) the user's best subject-scoped attempt.
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
  v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  v_applied INTEGER;
  rec RECORD;
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

  INSERT INTO public.user_stats (
    user_id, email, name, picture, total_quizzes, total_correct,
    total_questions, current_streak, longest_streak, last_quiz_date
  ) VALUES (
    p_user_id, p_email, p_name, p_picture, 1, p_correct,
    p_total, 1, 1, v_today
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_stats.email),
    name = COALESCE(EXCLUDED.name, public.user_stats.name),
    picture = COALESCE(EXCLUDED.picture, public.user_stats.picture),
    total_quizzes = public.user_stats.total_quizzes + 1,
    total_correct = public.user_stats.total_correct + EXCLUDED.total_correct,
    total_questions = public.user_stats.total_questions + EXCLUDED.total_questions,
    current_streak = CASE
      WHEN public.user_stats.last_quiz_date = v_today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_quiz_date = v_today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      public.user_stats.longest_streak,
      CASE
        WHEN public.user_stats.last_quiz_date = v_today THEN public.user_stats.current_streak
        WHEN public.user_stats.last_quiz_date = v_today - 1 THEN public.user_stats.current_streak + 1
        ELSE 1
      END
    ),
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

CREATE OR REPLACE FUNCTION public.daily_leaderboard_v2(
  p_date DATE,
  p_subject TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  display_name TEXT,
  picture TEXT,
  correct INTEGER,
  total INTEGER,
  duration_ms INTEGER,
  attempted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(u.name, split_part(u.email, '@', 1), 'Anonymous') AS display_name,
         u.picture,
         d.correct,
         d.total,
         d.duration_ms,
         d.created_at AS attempted_at
    FROM public.daily_attempts d
    LEFT JOIN public.user_stats u ON u.user_id = d.user_id
   WHERE d.challenge_date = p_date
     AND d.subject = p_subject
     AND p_subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
   ORDER BY d.correct DESC, d.duration_ms ASC
   LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daily_leaderboard_v2(DATE, TEXT, INTEGER)
  TO anon, authenticated;

-- Learn sessions keep their answer keys in an encrypted API token. The first
-- submitted answer for each question is stored here, so revealing feedback
-- cannot be used to revise a scored attempt. Anonymous rows support the same
-- learning UX but never mutate account progress.
CREATE TABLE IF NOT EXISTS public.roadmap_attempts (
  attempt_id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  topic TEXT NOT NULL CHECK (topic ~ '^[a-z0-9-]{1,50}$'),
  kind TEXT NOT NULL CHECK (kind IN ('level', 'checkpoint')),
  ref INTEGER NOT NULL CHECK (ref > 0 AND ref <= 100),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0 AND total_questions <= 50),
  pass_pct INTEGER NOT NULL CHECK (pass_pct BETWEEN 1 AND 100),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  score_pct INTEGER CHECK (score_pct BETWEEN 0 AND 100),
  passed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roadmap_attempt_answers (
  attempt_id TEXT NOT NULL REFERENCES public.roadmap_attempts(attempt_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_index INTEGER NOT NULL CHECK (selected_index BETWEEN 0 AND 25),
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 25),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS roadmap_attempts_user_created_idx
  ON public.roadmap_attempts (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS roadmap_attempts_expiry_idx
  ON public.roadmap_attempts (expires_at)
  WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.verified_skill_checks (
  attempt_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  unlocked_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (total > 0 AND total <= 50 AND correct >= 0 AND correct <= total)
);

CREATE INDEX IF NOT EXISTS verified_skill_checks_user_created_idx
  ON public.verified_skill_checks (user_id, created_at DESC);

ALTER TABLE public.roadmap_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_skill_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roadmap_attempts, public.roadmap_attempt_answers,
  public.verified_skill_checks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_verified_skill_check(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_subject TEXT,
  p_correct INTEGER,
  p_total INTEGER,
  p_unlocked JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applied INTEGER;
  v_extra JSONB;
  v_unlocked JSONB;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_total <> 20 OR p_correct < 0 OR p_correct > p_total OR
     jsonb_typeof(p_unlocked) IS DISTINCT FROM 'array' OR jsonb_array_length(p_unlocked) > 50 THEN
    RAISE EXCEPTION 'invalid_skill_check';
  END IF;

  INSERT INTO public.verified_skill_checks (
    attempt_id, user_id, subject, correct, total, unlocked_topics
  ) VALUES (
    p_attempt_id, p_user_id, p_subject, p_correct, p_total, p_unlocked
  ) ON CONFLICT (attempt_id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  IF v_applied = 0 THEN RETURN FALSE; END IF;

  -- Reserve the receipt id so it cannot later be replayed as an ordinary quiz
  -- result to earn a second progression mutation.
  INSERT INTO public.quiz_attempts (attempt_id, user_id)
  VALUES (p_attempt_id, p_user_id)
  ON CONFLICT (attempt_id) DO NOTHING;

  INSERT INTO public.roadmap_progress (user_id, data, extra)
  VALUES (p_user_id, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(extra, '{}'::jsonb) INTO v_extra
    FROM public.roadmap_progress
   WHERE user_id = p_user_id
   FOR UPDATE;

  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) INTO v_unlocked
    FROM (
      SELECT DISTINCT value
        FROM jsonb_array_elements(COALESCE(v_extra->'unlocked', '[]'::jsonb) || p_unlocked) AS item(value)
       WHERE jsonb_typeof(value) = 'string'
    ) AS combined;

  UPDATE public.roadmap_progress
     SET extra = jsonb_set(v_extra, '{unlocked}', v_unlocked, TRUE),
         updated_at = NOW()
   WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_verified_skill_check(TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_skill_check(TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB)
  TO service_role;

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
  v_correct INTEGER;
  v_pct INTEGER;
  v_passed BOOLEAN;
  v_data JSONB;
  v_kind_key TEXT;
  v_existing JSONB;
  v_best INTEGER;
  v_was_passed BOOLEAN;
  v_day_key TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
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

  SELECT COUNT(*) FILTER (WHERE is_correct)
    INTO v_correct
    FROM public.roadmap_attempt_answers
   WHERE attempt_id = p_attempt_id;
  v_pct := ROUND(100.0 * v_correct / v_attempt.total_questions)::INTEGER;
  v_passed := v_pct >= v_attempt.pass_pct;

  UPDATE public.roadmap_attempts
     SET completed_at = NOW(), score_pct = v_pct, passed = v_passed
   WHERE attempt_id = p_attempt_id;

  INSERT INTO public.roadmap_progress (user_id, data)
  VALUES (p_user_id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(data, '{}'::jsonb) INTO v_data
    FROM public.roadmap_progress
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT (v_data ? v_attempt.topic) THEN
    v_data := jsonb_set(
      v_data,
      ARRAY[v_attempt.topic],
      '{"levels":{},"checkpoints":{}}'::jsonb,
      TRUE
    );
  END IF;
  v_kind_key := CASE WHEN v_attempt.kind = 'level' THEN 'levels' ELSE 'checkpoints' END;
  IF jsonb_typeof(v_data #> ARRAY[v_attempt.topic, v_kind_key]) IS DISTINCT FROM 'object' THEN
    v_data := jsonb_set(v_data, ARRAY[v_attempt.topic, v_kind_key], '{}'::jsonb, TRUE);
  END IF;

  v_existing := v_data #> ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT];
  v_best := GREATEST(COALESCE((v_existing->>'bestPct')::INTEGER, 0), v_pct);
  v_was_passed := COALESCE((v_existing->>'passed')::BOOLEAN, FALSE);
  v_data := jsonb_set(
    v_data,
    ARRAY[v_attempt.topic, v_kind_key, v_attempt.ref::TEXT],
    jsonb_build_object('passed', v_was_passed OR v_passed, 'bestPct', v_best),
    TRUE
  );

  UPDATE public.roadmap_progress
     SET data = v_data, updated_at = NOW()
   WHERE user_id = p_user_id;

  INSERT INTO public.user_streak (user_id, days)
  VALUES (p_user_id, jsonb_build_object(v_day_key, 1))
  ON CONFLICT (user_id) DO UPDATE SET
    days = jsonb_set(
      COALESCE(public.user_streak.days, '{}'::jsonb),
      ARRAY[v_day_key],
      to_jsonb(LEAST(50, COALESCE((public.user_streak.days ->> v_day_key)::INTEGER, 0) + 1)),
      TRUE
    ),
    updated_at = NOW();
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt(TEXT, TEXT)
  TO service_role;

-- Keep account erasure complete as new user-owned ledgers are introduced.
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
  DELETE FROM public.user_xp WHERE user_id = p_user_id;
  DELETE FROM public.challenge_scores WHERE user_id = p_user_id;
  DELETE FROM public.auth_events WHERE user_id = p_user_id;
  DELETE FROM public.question_reports WHERE reporter_sub = p_user_id;
  DELETE FROM public.user_question_history WHERE user_id = p_user_id;
  DELETE FROM public.roadmap_attempts WHERE user_id = p_user_id;
  DELETE FROM public.verified_skill_checks WHERE user_id = p_user_id;
  DELETE FROM public.verified_activity_awards WHERE user_id = p_user_id;
  DELETE FROM public.quiz_attempts WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

-- Rollback note: drop the v2 functions and verified_activity_awards first.
-- Keep subject columns when rolling back application code; they are backward
-- compatible and dropping them would destroy the now-separated history.
