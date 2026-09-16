-- Migration 038: weekly micro-leagues.
-- Apply after the migrations before it. Safe to re-run.
--
-- A leaderboard says who is ahead. It does not say when to come back. The
-- three boards this product already has are all-time, today and by category,
-- and none of them has an end: a learner who is 900 correct answers behind the
-- top of the all-time board reads it once and never again.
--
-- A league is the same ranking with a deadline. Twenty to thirty people who
-- have been learning at a similar rate, one week, and a line under it on
-- Sunday night. Nothing new is measured — the score is correct answers, the
-- same thing every other board in this product ranks by — and nothing is won.
--
-- What a tier is NOT, and this is the whole of the fairness contract:
--
--   A tier grants no access, no content, no explanation, no learning path, no
--   XP, no token, no hint, no AI, no badge and no card. Every question in this
--   product is free at tier 1 and free at tier 5. The tier is a label on a
--   room. If a future change ever makes a tier worth something, this comment
--   is the thing it has to argue with first.
--
-- Nothing here ranks by streak either. `docs/product-architecture.md` says it
-- plainly: no leaderboard in this product ranks by streak. The league score is
-- weekly correct answers with answered as the tie-break, and this file does not
-- read `current_streak` or `longest_streak` at all.
--
-- ── choices this file makes that the issue did not ────────────────────────
--
-- 1. THE WEEK IS ISO. `date_trunc('week', ...)` in Postgres starts on Monday,
--    and every other date in this schema is UTC (`(NOW() AT TIME ZONE 'UTC')`).
--    So a league week runs Monday 00:00 UTC to Sunday 23:59 UTC and the line is
--    drawn at the end of Sunday, which is what "reset every Sunday" asks for,
--    without inventing a Sunday-start boundary nothing else in the product uses.
--
-- 2. FIVE TIERS. Top five of a cohort promote, bottom five demote, everyone
--    else holds, and a first-ever member starts at tier 1. Five is a choice,
--    not a finding; it is small enough that a promotion is reachable in a week
--    of ordinary practice and shallow enough that the ladder has a visible top.
--
-- 3. TWENTY TO THIRTY. Thirty is a hard ceiling enforced on every insert. The
--    twenty is a fill target, not a constraint that can be enforced at insert
--    time: a population of thirty-one produces one cohort of thirty and one of
--    one, and no rebalancing job runs here. Cohorts fill before new ones open,
--    so the band holds as soon as there are enough learners to fill it.
--
-- 4. ASSIGNMENT IS LAZY. There is no cron, no scheduler and no Sunday job. A
--    learner is placed in this week's cohort the first time they read the board
--    or record a result in a new week, and their tier is computed then from
--    last week's finish. A week nobody opens costs nothing and stores nothing.
--
-- 5. THE NAME SHOWN IS THE HANDLE FIRST. Migration 036 said `user_stats.name`
--    and `.email` are what an OAuth provider handed us and nobody chose to
--    publish, and `user_handles.handle` is the opt-in identity. A league room
--    holds up to thirty strangers, so the handle wins where one exists; the
--    fallback is the same COALESCE the three existing boards already use, so
--    nothing regresses. Worth the owner's decision, not this file's.
--
-- 6. SCORING IS SERVER-OWNED AND WRITTEN ONCE. `league_record` is called by
--    `api/user/[op].ts` immediately after `record_verified_quiz_result_v2`
--    returns TRUE — the same place, and on the same condition, as the verified
--    XP credit that has been there since migration 034. The numbers it stores
--    are the ones the server graded; the browser never sends a score. This file
--    deliberately does NOT restate `record_verified_quiz_result_v2`: that
--    function carries the shield-aware streak arithmetic from 032 and is being
--    changed by other work, and two migrations restating the same body is how
--    one of them silently loses.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The weekly accumulator. One row per learner per subject per week; a week that
-- nobody played has no rows at all.
CREATE TABLE IF NOT EXISTS public.league_scores (
  user_id    TEXT NOT NULL,
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  week_start DATE NOT NULL,
  correct    INTEGER NOT NULL DEFAULT 0 CHECK (correct >= 0),
  answered   INTEGER NOT NULL DEFAULT 0 CHECK (answered >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, week_start)
);

-- A room. `member_count` is denormalised on purpose: the ceiling has to be
-- checked and the seat taken in one statement, or two tabs fill seat thirty
-- twice.
CREATE TABLE IF NOT EXISTS public.league_cohorts (
  cohort_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  week_start   DATE NOT NULL,
  tier         SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0 AND member_count <= 30),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.league_members (
  user_id    TEXT NOT NULL,
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  week_start DATE NOT NULL,
  cohort_id  UUID NOT NULL REFERENCES public.league_cohorts (cohort_id) ON DELETE CASCADE,
  tier       SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, week_start)
);

-- Opting out is one row and one boolean. It is not a deletion: a learner who
-- opts back in next week starts at tier 1 with no history, which is the honest
-- consequence of having been out of every room in between.
CREATE TABLE IF NOT EXISTS public.league_preferences (
  user_id    TEXT PRIMARY KEY,
  opted_out  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS league_scores_week_idx
  ON public.league_scores (subject, week_start, correct DESC);
CREATE INDEX IF NOT EXISTS league_cohorts_open_idx
  ON public.league_cohorts (subject, week_start, tier, member_count);
CREATE INDEX IF NOT EXISTS league_members_cohort_idx
  ON public.league_members (cohort_id);

ALTER TABLE public.league_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_preferences ENABLE ROW LEVEL SECURITY;

-- No policy is declared, so the browser keys reach none of these tables. Every
-- read and write below is SECURITY DEFINER and service-role only, reached from
-- a handler that has already verified the caller's own token.
REVOKE ALL ON public.league_scores      FROM anon, authenticated;
REVOKE ALL ON public.league_cohorts     FROM anon, authenticated;
REVOKE ALL ON public.league_members     FROM anon, authenticated;
REVOKE ALL ON public.league_preferences FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Recording a verified result
-- ---------------------------------------------------------------------------
--
-- Called once per verified quiz result, with the numbers the server graded. It
-- accumulates and nothing else: it does not touch user_stats, user_xp, a badge,
-- a card, a token or a streak, and it never assigns a cohort — being counted and
-- being seated are separate so a mid-week join cannot renumber a running room.

CREATE OR REPLACE FUNCTION public.league_record(
  p_user_id  TEXT,
  p_subject  TEXT,
  p_correct  INTEGER,
  p_answered INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week DATE := date_trunc('week', (NOW() AT TIME ZONE 'UTC')::DATE)::DATE;
BEGIN
  -- The same bounds record_verified_quiz_result_v2 enforces on its own inputs.
  -- A bad call is refused rather than clamped: a score nobody can explain is
  -- worse than no score.
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_correct IS NULL OR p_answered IS NULL OR
     p_correct < 0 OR p_answered <= 0 OR p_correct > p_answered OR p_answered > 50 THEN
    RAISE EXCEPTION 'invalid_league_result';
  END IF;

  -- Opting out stops the counting, not just the display. Somebody who left the
  -- league should not find a week of scores waiting if they come back.
  IF EXISTS (
    SELECT 1 FROM public.league_preferences p
     WHERE p.user_id = p_user_id AND p.opted_out
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.league_scores (user_id, subject, week_start, correct, answered)
  VALUES (p_user_id, p_subject, v_week, p_correct, p_answered)
  ON CONFLICT (user_id, subject, week_start) DO UPDATE SET
    correct = public.league_scores.correct + EXCLUDED.correct,
    answered = public.league_scores.answered + EXCLUDED.answered,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Seating: promotion, demotion, and the thirty-seat ceiling
-- ---------------------------------------------------------------------------
--
-- Everything about where a learner lands this week is decided here, from last
-- week's finish, the first time anybody asks. Idempotent: a second call in the
-- same week returns the seat already taken.

CREATE OR REPLACE FUNCTION public.league_assign(p_user_id TEXT, p_subject TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week       DATE := date_trunc('week', (NOW() AT TIME ZONE 'UTC')::DATE)::DATE;
  v_prev_week  DATE;
  v_prev_tier  SMALLINT;
  v_prev_rank  INTEGER;
  v_prev_size  INTEGER;
  v_tier       SMALLINT;
  v_cohort     UUID;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') THEN
    RAISE EXCEPTION 'invalid_league_request';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.league_preferences p
     WHERE p.user_id = p_user_id AND p.opted_out
  ) THEN
    RETURN NULL;
  END IF;

  SELECT m.cohort_id INTO v_cohort
    FROM public.league_members m
   WHERE m.user_id = p_user_id AND m.subject = p_subject AND m.week_start = v_week;
  IF v_cohort IS NOT NULL THEN
    RETURN v_cohort;
  END IF;

  v_prev_week := v_week - 7;

  -- Last week's room, and where this learner finished in it. Only the
  -- immediately preceding week counts: somebody who was away for a month has no
  -- standing to carry, and starting them at tier 1 is the truthful answer.
  SELECT m.tier INTO v_prev_tier
    FROM public.league_members m
   WHERE m.user_id = p_user_id AND m.subject = p_subject AND m.week_start = v_prev_week;

  IF v_prev_tier IS NULL THEN
    v_tier := 1;
  ELSE
    SELECT standing.rank_pos, standing.cohort_size
      INTO v_prev_rank, v_prev_size
      FROM (
        SELECT m.user_id,
               ROW_NUMBER() OVER (
                 ORDER BY COALESCE(s.correct, 0) DESC,
                          COALESCE(s.answered, 0) ASC,
                          m.joined_at ASC
               ) AS rank_pos,
               COUNT(*) OVER () AS cohort_size
          FROM public.league_members m
          LEFT JOIN public.league_scores s
            ON s.user_id = m.user_id
           AND s.subject = m.subject
           AND s.week_start = m.week_start
         WHERE m.cohort_id = (
           SELECT mm.cohort_id FROM public.league_members mm
            WHERE mm.user_id = p_user_id
              AND mm.subject = p_subject
              AND mm.week_start = v_prev_week
         )
      ) standing
     WHERE standing.user_id = p_user_id;

    -- Top five up, bottom five down, everyone else holds. The second condition
    -- on the demotion keeps the two sets apart in a room too small to have ten
    -- distinct places.
    IF v_prev_rank IS NULL THEN
      v_tier := v_prev_tier;
    ELSIF v_prev_rank <= 5 THEN
      v_tier := LEAST(v_prev_tier + 1, 5);
    ELSIF v_prev_rank > 5 AND v_prev_rank > COALESCE(v_prev_size, 0) - 5 THEN
      v_tier := GREATEST(v_prev_tier - 1, 1);
    ELSE
      v_tier := v_prev_tier;
    END IF;
  END IF;

  -- Take a seat in the emptiest open room, and take the seat and the count in
  -- one statement so two tabs cannot both take the thirtieth. If every room for
  -- this tier is full, open one. Two learners racing that last check can open
  -- two rooms of one; the next joiners fill the emptiest, so it evens out
  -- without a rebalancing job.
  UPDATE public.league_cohorts c
     SET member_count = c.member_count + 1
   WHERE c.cohort_id = (
     SELECT o.cohort_id FROM public.league_cohorts o
      WHERE o.subject = p_subject
        AND o.week_start = v_week
        AND o.tier = v_tier
        AND o.member_count < 30
      ORDER BY o.member_count ASC, o.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING c.cohort_id INTO v_cohort;

  IF v_cohort IS NULL THEN
    INSERT INTO public.league_cohorts (subject, week_start, tier, member_count)
    VALUES (p_subject, v_week, v_tier, 1)
    RETURNING cohort_id INTO v_cohort;
  END IF;

  INSERT INTO public.league_members (user_id, subject, week_start, cohort_id, tier)
  VALUES (p_user_id, p_subject, v_week, v_cohort, v_tier)
  ON CONFLICT (user_id, subject, week_start) DO NOTHING;

  -- Lost the race: somebody else seated this learner between the read at the
  -- top and here. Give the seat back and return the one that stuck.
  IF NOT FOUND THEN
    UPDATE public.league_cohorts
       SET member_count = GREATEST(member_count - 1, 0)
     WHERE cohort_id = v_cohort;
    SELECT m.cohort_id INTO v_cohort
      FROM public.league_members m
     WHERE m.user_id = p_user_id AND m.subject = p_subject AND m.week_start = v_week;
  END IF;

  RETURN v_cohort;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. The board
-- ---------------------------------------------------------------------------
--
-- One room, the caller's own, and only ever theirs: there is no parameter for
-- somebody else's cohort and no way to enumerate the rooms. Seats the caller
-- first, so the first read of a new week is what creates it.

CREATE OR REPLACE FUNCTION public.league_board(p_user_id TEXT, p_subject TEXT)
RETURNS TABLE (
  display_name TEXT,
  picture      TEXT,
  correct      INTEGER,
  answered     INTEGER,
  accuracy_pct INTEGER,
  tier         SMALLINT,
  week_start   DATE,
  is_self      BOOLEAN
)
-- Volatile on purpose: it seats the caller before it reads, and PostgreSQL
-- refuses a write inside a STABLE function.
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cohort UUID;
BEGIN
  v_cohort := public.league_assign(p_user_id, p_subject);
  IF v_cohort IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT COALESCE(
           h.handle,
           NULLIF(u.name, ''),
           NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
           'Anonymous'
         )::TEXT,
         u.picture::TEXT,
         COALESCE(s.correct, 0)::INTEGER,
         COALESCE(s.answered, 0)::INTEGER,
         CASE WHEN COALESCE(s.answered, 0) > 0
              THEN ROUND(100.0 * s.correct / s.answered)::INTEGER
              ELSE 0 END,
         m.tier,
         m.week_start,
         (m.user_id = p_user_id)
    FROM public.league_members m
    LEFT JOIN public.user_handles h ON h.user_id = m.user_id
    LEFT JOIN public.user_stats  u ON u.user_id = m.user_id
    LEFT JOIN public.league_scores s
      ON s.user_id = m.user_id
     AND s.subject = m.subject
     AND s.week_start = m.week_start
   WHERE m.cohort_id = v_cohort
   ORDER BY COALESCE(s.correct, 0) DESC,
            COALESCE(s.answered, 0) ASC,
            m.joined_at ASC
   LIMIT 30;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Leaving, and coming back
-- ---------------------------------------------------------------------------
--
-- Opting out takes the learner out of this week's room straight away and frees
-- the seat, so the people left behind are ranked against who is actually there.
-- Their accumulated weekly scores are left alone: they are this learner's own
-- record of their own week, nobody else can read them once the membership is
-- gone, and account deletion still removes them.

CREATE OR REPLACE FUNCTION public.set_league_optout(p_user_id TEXT, p_opted_out BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week DATE := date_trunc('week', (NOW() AT TIME ZONE 'UTC')::DATE)::DATE;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_opted_out IS NULL THEN
    RAISE EXCEPTION 'invalid_league_request';
  END IF;

  INSERT INTO public.league_preferences (user_id, opted_out)
  VALUES (p_user_id, p_opted_out)
  ON CONFLICT (user_id) DO UPDATE SET
    opted_out = EXCLUDED.opted_out,
    updated_at = NOW();

  IF p_opted_out THEN
    WITH removed AS (
      DELETE FROM public.league_members m
       WHERE m.user_id = p_user_id AND m.week_start = v_week
       RETURNING m.cohort_id
    ), freed AS (
      SELECT removed.cohort_id, COUNT(*) AS seats FROM removed GROUP BY removed.cohort_id
    )
    UPDATE public.league_cohorts c
       SET member_count = GREATEST(c.member_count - freed.seats, 0)
      FROM freed
     WHERE c.cohort_id = freed.cohort_id;
  END IF;

  RETURN p_opted_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.league_optout(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.opted_out FROM public.league_preferences p WHERE p.user_id = p_user_id),
    FALSE
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. The one number the league is judged by
-- ---------------------------------------------------------------------------
--
-- Of the people who learned something yesterday, how many came back today.
-- That is the whole metric, and it is deliberately the only one: a league can
-- be made to look successful by almost any other measure — more sessions, more
-- answers, more minutes — while the people it was built for quietly leave.
--
-- Operator-only. It is served by `api/admin/[op].ts` behind the admin gate and
-- appears on no reader surface, because a retention rate is a fact about the
-- product and not about the learner reading it.
--
-- Capped at 90 days because `purge_expired_learning_data` deletes attempts past
-- that, so a longer window would report a decline that is only deletion.

CREATE OR REPLACE FUNCTION public.daily_return_rate(p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  day          DATE,
  prior_active INTEGER,
  returned     INTEGER,
  rate_pct     INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT (NOW() AT TIME ZONE 'UTC')::DATE AS today,
           LEAST(GREATEST(COALESCE(p_days, 14), 1), 90) AS span
  ),
  learner_days AS (
    SELECT DISTINCT activity.user_id, activity.day
      FROM (
        SELECT q.user_id, (q.created_at AT TIME ZONE 'UTC')::DATE AS day
          FROM public.quiz_submissions q, bounds b
         WHERE q.user_id IS NOT NULL
           AND q.created_at >= ((b.today - b.span - 1)::TIMESTAMP AT TIME ZONE 'UTC')
        UNION ALL
        SELECT d.user_id, d.challenge_date
          FROM public.daily_attempts d, bounds b
         WHERE d.user_id IS NOT NULL
           AND d.challenge_date >= (b.today - b.span - 1)
        UNION ALL
        SELECT r.user_id, (r.created_at AT TIME ZONE 'UTC')::DATE
          FROM public.roadmap_attempts r, bounds b
         WHERE r.user_id IS NOT NULL
           AND r.created_at >= ((b.today - b.span - 1)::TIMESTAMP AT TIME ZONE 'UTC')
        UNION ALL
        SELECT c.user_id, (c.created_at AT TIME ZONE 'UTC')::DATE
          FROM public.coding_attempts c, bounds b
         WHERE c.user_id IS NOT NULL
           AND c.created_at >= ((b.today - b.span - 1)::TIMESTAMP AT TIME ZONE 'UTC')
      ) activity
  ),
  days AS (
    SELECT generate_series(b.today - b.span + 1, b.today, INTERVAL '1 day')::DATE AS day
      FROM bounds b
  )
  SELECT days.day,
         COUNT(prev.user_id)::INTEGER AS prior_active,
         COUNT(next.user_id)::INTEGER AS returned,
         CASE WHEN COUNT(prev.user_id) > 0
              THEN ROUND(100.0 * COUNT(next.user_id) / COUNT(prev.user_id))::INTEGER
              ELSE 0 END AS rate_pct
    FROM days
    LEFT JOIN learner_days prev ON prev.day = days.day - 1
    LEFT JOIN learner_days next
           ON next.user_id = prev.user_id AND next.day = days.day
   GROUP BY days.day
   ORDER BY days.day DESC;
$$;

-- ---------------------------------------------------------------------------
-- 7. Account erasure reaches the league
-- ---------------------------------------------------------------------------
--
-- Restated in full so this file is the readable definition, as 025 and 033 were
-- before it. The only change is the league block: the seat is given back before
-- the membership row goes, or the room it was in stays one short for the rest
-- of the week and ranks the survivors against a ghost.

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
  DELETE FROM public.merch_order_items
   WHERE order_id IN (SELECT order_id FROM public.merch_orders
                       WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled'));
  DELETE FROM public.merch_orders
   WHERE user_id = p_user_id AND state IN ('awaiting_payment', 'cancelled');
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
  -- New in 038: give every seat back before the memberships go.
  UPDATE public.league_cohorts c
     SET member_count = GREATEST(c.member_count - seats.taken, 0)
    FROM (
      SELECT m.cohort_id, COUNT(*) AS taken
        FROM public.league_members m
       WHERE m.user_id = p_user_id
       GROUP BY m.cohort_id
    ) seats
   WHERE c.cohort_id = seats.cohort_id;
  DELETE FROM public.league_members WHERE user_id = p_user_id;
  DELETE FROM public.league_scores WHERE user_id = p_user_id;
  DELETE FROM public.league_preferences WHERE user_id = p_user_id;
  DELETE FROM public.user_stats WHERE user_id = p_user_id;
  -- New in 033: a deleted account must not linger in anybody else's list.
  DELETE FROM public.friendships WHERE p_user_id IN (user_low, user_high);
  DELETE FROM public.user_handles WHERE user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Privileges
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.league_record(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.league_assign(TEXT, TEXT)                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.league_board(TEXT, TEXT)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_league_optout(TEXT, BOOLEAN)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.league_optout(TEXT)                         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_return_rate(INTEGER)                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_user_data(TEXT)                      FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.league_record(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.league_assign(TEXT, TEXT)                   TO service_role;
GRANT EXECUTE ON FUNCTION public.league_board(TEXT, TEXT)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.set_league_optout(TEXT, BOOLEAN)            TO service_role;
GRANT EXECUTE ON FUNCTION public.league_optout(TEXT)                         TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_return_rate(INTEGER)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT)                      TO service_role;
