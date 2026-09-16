-- Migration 039: two protections may be armed at once.
-- Apply after the migrations before it. Safe to re-run.
--
-- It depends on 032 (the shield) and touches no object that 037 or 038 create,
-- so the order between it and them does not matter.
--
-- ── What changes, and what deliberately does not ───────────────────────────
--
-- The ceiling does not move. Two protections a month is still the whole
-- budget, still granted free, and buying one (035) still restores toward two
-- and never past it. A protection still changes the day count of a streak and
-- nothing else: no XP, no score, no rank, no badge, no access, no content, and
-- no leaderboard in this product ranks by streak.
--
-- What changes is how many of that same budget may be *armed in advance*. 032
-- allowed exactly one shield at a time: a second request while a shield was
-- running returned the running window and charged nothing. That was the double
-- click guard, and it also capped a planned absence at 48 hours. A learner who
-- knows they are away for a long weekend had to come back and spend the second
-- protection from the road, which is the opposite of planning ahead.
--
-- So the row now counts how many protections the window is made of.
-- `shield_slots` is 0, 1 or 2, the column is CHECKed to that range, and
-- `activate_streak_shield` refuses a third. Two armed protections are one
-- 96-hour window rather than two overlapping 48-hour ones, because a streak
-- has one timeline and two windows on it would have to be merged to be read.
--
-- ── Why the column is not cleared when the window lapses ───────────────────
--
-- `record_verified_quiz_result_v2` reads `shield_until` after the fact to
-- decide which days a returning learner had already paid for, and it works
-- backwards from the expiry. It therefore needs to know how wide the window
-- was, including after it has expired. So `shield_slots` is the width of the
-- window that `shield_until` ends, not a live "currently armed" count; it is
-- cleared only when `shield_until` itself is cleared, and by the arm routine
-- when it starts a fresh window. The live count a learner sees is derived in
-- `api/user/[op].ts` from `shield_until > now`, where the question is asked.
--
-- ── Rows written before this migration ─────────────────────────────────────
--
-- They carry `shield_slots = 0` and possibly a live `shield_until` raised
-- under 032. Everything below reads such a row as one armed protection —
-- `GREATEST(shield_slots, 1)` in the gap computation, and an explicit
-- promotion in the arm routine — so an account mid-shield when this is applied
-- keeps exactly the protection it paid for.
--
-- ── One restated function, and why it is this one ──────────────────────────
--
-- `record_verified_quiz_result_v2` is restated in full below, from its 032
-- definition, with one line changed. That is this repository's convention: the
-- newest migration is the readable definition. If another migration in the
-- same release also restates it, the two have to be reconciled by hand before
-- either is applied — restating the same body twice is how one of them
-- silently loses.

-- ── 1. How wide the window is ──────────────────────────────────────────────

ALTER TABLE public.user_streak_freezes
  ADD COLUMN IF NOT EXISTS shield_slots SMALLINT NOT NULL DEFAULT 0;

-- The cap, as a constraint rather than as a promise. Nothing that writes this
-- column may put a 3 in it, whatever a caller asks for.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.user_streak_freezes'::regclass
       AND conname = 'user_streak_freezes_shield_slots_check'
  ) THEN
    ALTER TABLE public.user_streak_freezes
      ADD CONSTRAINT user_streak_freezes_shield_slots_check
      CHECK (shield_slots >= 0 AND shield_slots <= 2);
  END IF;
END $$;

-- ── 2. The budget read, now carrying the width ─────────────────────────────
--
-- Same contract as 032 plus one column. The signature widens, and CREATE OR
-- REPLACE cannot widen a function's return type, so it has to be dropped
-- first. Safe for the same reason it was safe in 032: the only in-database
-- caller is record_verified_quiz_result_v2, plpgsql resolves the call at run
-- time, and the two exist together again by the end of this file.

DROP FUNCTION IF EXISTS public.refresh_streak_freezes(TEXT);

CREATE OR REPLACE FUNCTION public.refresh_streak_freezes(p_user_id TEXT)
RETURNS TABLE (period TEXT, remaining INTEGER, used JSONB, shield_until TIMESTAMPTZ, shield_slots SMALLINT)
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

  -- A new month restores the two, and clears a window that belonged to the old
  -- one so a stale shield cannot bridge into it. The width goes with the
  -- window: clearing one without the other would leave a count describing a
  -- window that no longer exists.
  IF v_row.period IS DISTINCT FROM v_period THEN
    UPDATE public.user_streak_freezes
       SET period = v_period,
           remaining = 2,
           used = '[]'::jsonb,
           -- Qualified: `shield_until` and `shield_slots` are also this
           -- function's OUT parameters, and an unqualified reference on the
           -- right of an assignment is ambiguous between the two.
           shield_until = CASE
             WHEN public.user_streak_freezes.shield_until > NOW()
             THEN public.user_streak_freezes.shield_until
             ELSE NULL
           END,
           shield_slots = CASE
             WHEN public.user_streak_freezes.shield_until > NOW()
             THEN public.user_streak_freezes.shield_slots
             ELSE 0
           END,
           updated_at = NOW()
     WHERE user_id = p_user_id
     RETURNING * INTO v_row;
  END IF;

  RETURN QUERY SELECT v_row.period, v_row.remaining, v_row.used, v_row.shield_until, v_row.shield_slots;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_streak_freezes(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_streak_freezes(TEXT) TO service_role;

-- ── 3. Raising a shield, up to two deep ────────────────────────────────────
--
-- One protection still buys 48 hours, and everything about the decision is
-- still here rather than in the caller: whether there is anything to spend,
-- how long the window is, and how many may be armed at once.
--
-- The guard 032 relied on is gone — "a shield is already running" no longer
-- means "charge nothing" — so the two that replace it carry the whole weight:
-- the slot ceiling of two, and the FOR UPDATE row lock that serializes two
-- devices asking at the same moment. A third request is refused and charges
-- nothing, exactly as the second used to be.

DROP FUNCTION IF EXISTS public.activate_streak_shield(TEXT);

CREATE OR REPLACE FUNCTION public.activate_streak_shield(p_user_id TEXT)
RETURNS TABLE (granted BOOLEAN, period TEXT, remaining INTEGER, used JSONB, shield_until TIMESTAMPTZ, shield_slots SMALLINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row   public.user_streak_freezes%ROWTYPE;
  v_live  BOOLEAN;
  v_slots SMALLINT;
BEGIN
  PERFORM public.refresh_streak_freezes(p_user_id);

  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  v_live := v_row.shield_until IS NOT NULL AND v_row.shield_until > NOW();
  -- A lapsed window is worth no slots; a live one raised before this migration
  -- carries no count and is worth the one protection it cost.
  v_slots := CASE WHEN NOT v_live THEN 0
                  WHEN COALESCE(v_row.shield_slots, 0) < 1 THEN 1
                  ELSE v_row.shield_slots END;

  IF v_slots >= 2 THEN
    RETURN QUERY SELECT FALSE, v_row.period, COALESCE(v_row.remaining, 0), v_row.used, v_row.shield_until, v_slots;
    RETURN;
  END IF;

  IF COALESCE(v_row.remaining, 0) <= 0 THEN
    RETURN QUERY SELECT FALSE, v_row.period, 0, v_row.used,
                        CASE WHEN v_live THEN v_row.shield_until ELSE NULL::TIMESTAMPTZ END, v_slots;
    RETURN;
  END IF;

  UPDATE public.user_streak_freezes
     -- From the locked row rather than the bare columns: `remaining`,
     -- `shield_until` and `shield_slots` are all OUT parameters here, so an
     -- unqualified reference would be ambiguous.
     SET remaining = v_row.remaining - 1,
         -- Extending the existing window rather than opening a second one:
         -- a streak has one timeline, and two overlapping windows on it would
         -- have to be merged before anything could read them.
         shield_until = (CASE WHEN v_live THEN v_row.shield_until ELSE NOW() END) + INTERVAL '48 hours',
         shield_slots = v_slots + 1,
         used = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM (
             SELECT elem FROM jsonb_array_elements(COALESCE(v_row.used, '[]'::jsonb)) AS elem
             UNION ALL
             SELECT to_jsonb(TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM-DD'))
             LIMIT 24
           ) AS merged
         ),
         updated_at = NOW()
   WHERE user_id = p_user_id
   RETURNING * INTO v_row;

  RETURN QUERY SELECT TRUE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until, v_row.shield_slots;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_streak_shield(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_streak_shield(TEXT) TO service_role;

-- ── 4. The streak, counting every shielded day as attended ─────────────────
--
-- Restated in full from 032. Exactly one line differs: the start of the shield
-- window is now the expiry minus the width the learner actually paid for,
-- instead of a fixed 48 hours. Two armed protections therefore cover four days
-- rather than two.
--
-- GREATEST(..., 1) is what makes a row written before this migration read
-- correctly: it has no width and had one protection.
--
-- The retroactive freeze bridge below is untouched. It is the safety net for
-- a learner who never raised a shield, it spends from the same monthly budget,
-- and it still refuses a gap of more than two days.

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
    -- The learner's own shield, if one was raised. A shield covers the days up
    -- to its expiry — two per armed protection — and days inside that window
    -- are already paid for and are not missed days.
    SELECT (shield_until - (GREATEST(COALESCE(shield_slots, 0), 1) * INTERVAL '48 hours'))::DATE,
           shield_until::DATE
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
