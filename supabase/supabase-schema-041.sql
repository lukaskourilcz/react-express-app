-- Migration 041: coins. Every verified XP source credits the wallet, Premium
-- doubles the XP credit, and Premium milestones pay once per account.
-- Apply after migrations 001-039 (040 is independent). Safe to re-run.
--
-- The wallet of migration 028 is the only wallet. Product copy calls its unit
-- coins; the tables, routines and ops keep the `token` spelling
-- (SECOND-HANDOFF-25-9-2026.md, section 7.1).
--
--   * token_xp_credits records every XP credit decision, including a credit the
--     daily cap cut to zero. Its event id is the ledger's (`xp:<award id>`), so a
--     replayed award finds its row and credits nothing, and the daily cap is a
--     sum over one account's rows for one UTC day.
--   * credit_verified_xp_tokens applies the rate, doubles it when is_premium()
--     says so at credit time, and caps the day after the doubling. The handlers
--     call it right after the verified award they ride on: a quiz or daily
--     result, a Biggest Shark Challenge run, a Learn level or part test passed
--     for the first time, and a coding challenge passed for the first time.
--   * settle_coin_milestones pays the Premium milestones (streak 7/30/100, a
--     Learn topic with every level passed, an evolving project or short path
--     with every stage passed) against the learner's own verified progress, and
--     reports that progress for the Rewards screen. Each milestone is one ledger
--     event per account, so running it again credits nothing.
--   * settle_month_top3 pays the top three of a finished calendar month on the
--     dated board of migration 040, once per month. It has no cron: the first
--     wallet read after a month ends runs it. Until 040 is installed it reports
--     `no_board` and settles nothing.
--   * credit_social_visit exists for the owner's decision on the click-through
--     grant. The amount comes from settings and defaults to zero, and a zero
--     amount credits nothing (section 1, item 2 of the handoff).
--   * record_coding_verdict is restated from 038 with one change: the XP award
--     id names the account (`coding:<account>:<task>`). The 025 id named only
--     the task, and verified_activity_awards is keyed by the award id alone, so
--     only the first account ever to pass a task received its XP. A learner who
--     already holds a pass is not awarded again: the award still fires on the
--     first pass only.
--
-- Every routine is SECURITY DEFINER with an empty search_path and executable by
-- service_role only. None of them writes XP, stats, streaks, progress or a
-- leaderboard; the milestones only read them. A browser cannot post a credit.

-- ---------------------------------------------------------------------------
-- 1. Two new ledger reasons: 'milestone' and 'social'.
-- ---------------------------------------------------------------------------
-- Additive: the check is rebuilt from the reasons it already allows plus these
-- two, so re-running this file after 042 keeps 042's 'referral' instead of
-- narrowing the check under live code (review finding data-3).
DO $$
DECLARE
  v_reasons TEXT[] := ARRAY['signup', 'verified-xp', 'purchase', 'refund', 'adjustment', 'milestone', 'social'];
  v_current TEXT;
  v_reason  TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_current
    FROM pg_constraint c
   WHERE c.conrelid = 'public.token_ledger'::regclass
     AND c.conname = 'token_ledger_reason_check';
  FOR v_reason IN SELECT (regexp_matches(COALESCE(v_current, ''), '''([^'']+)''', 'g'))[1] LOOP
    IF NOT v_reason = ANY (v_reasons) THEN
      v_reasons := v_reasons || v_reason;
    END IF;
  END LOOP;
  ALTER TABLE public.token_ledger DROP CONSTRAINT IF EXISTS token_ledger_reason_check;
  EXECUTE format(
    'ALTER TABLE public.token_ledger ADD CONSTRAINT token_ledger_reason_check CHECK (reason IN (%s))',
    (SELECT string_agg(quote_literal(r), ', ' ORDER BY o) FROM unnest(v_reasons) WITH ORDINALITY AS t(r, o))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_xp_credits (
  event_id   TEXT PRIMARY KEY CHECK (event_id ~ '^[A-Za-z0-9:_-]{8,128}$'),
  user_id    TEXT NOT NULL CHECK (LENGTH(user_id) BETWEEN 8 AND 128),
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  -- The UTC day the cap counts against.
  day        DATE NOT NULL,
  xp         INTEGER NOT NULL CHECK (xp > 0 AND xp <= 100000),
  -- Coins before the doubling, the multiplier applied, and what the cap left.
  base       INTEGER NOT NULL CHECK (base >= 0),
  multiplier INTEGER NOT NULL CHECK (multiplier BETWEEN 1 AND 5),
  credited   INTEGER NOT NULL CHECK (credited >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS token_xp_credits_user_day_idx
  ON public.token_xp_credits (user_id, subject, day);

-- One row per finished month. `winners` keeps who ranked and what they were
-- paid, for the owner's audit; it is business data and has no owner policy.
CREATE TABLE IF NOT EXISTS public.token_month_settlements (
  month      TEXT PRIMARY KEY CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  winners    JSONB NOT NULL DEFAULT '[]'::jsonb,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.token_xp_credits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_month_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_xp_credits_select_own" ON public.token_xp_credits;
CREATE POLICY "token_xp_credits_select_own"
  ON public.token_xp_credits FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- Revoke first, then grant back only SELECT, as 028 does: RLS filters rows, it
-- does not stop TRUNCATE.
REVOKE ALL ON public.token_xp_credits        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.token_month_settlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.token_xp_credits TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Deterministic event ids.
-- ---------------------------------------------------------------------------
-- The account part of a per-account event id. A Supabase user id is a UUID and
-- is used as it is; anything longer or with other characters is hashed, so an
-- event id always fits the ledger's pattern.
CREATE OR REPLACE FUNCTION public.token_account_key(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_user_id ~ '^[A-Za-z0-9_-]{1,64}$' THEN p_user_id ELSE md5(p_user_id) END;
$$;
REVOKE ALL ON FUNCTION public.token_account_key(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.token_account_key(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. XP credits: the rate, the Premium doubling and the daily cap.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_verified_xp_tokens(
  p_user_id            TEXT,
  p_award_id           TEXT,
  p_subject            TEXT,
  p_xp                 INTEGER,
  p_rate               NUMERIC DEFAULT 0.1,
  p_premium_multiplier INTEGER DEFAULT 2,
  p_daily_cap          INTEGER DEFAULT 400
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event  TEXT;
  v_day    DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_base   INTEGER;
  v_mult   INTEGER := 1;
  v_used   INTEGER;
  v_credit INTEGER;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_award_id IS NULL OR p_award_id !~ '^[A-Za-z0-9:_-]{5,125}$' OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_xp IS NULL OR p_xp <= 0 OR p_xp > 100000 OR
     p_rate IS NULL OR p_rate < 0 OR p_rate > 1 OR
     p_premium_multiplier IS NULL OR p_premium_multiplier < 1 OR p_premium_multiplier > 5 OR
     p_daily_cap IS NULL OR p_daily_cap < 0 OR p_daily_cap > 100000 THEN
    RAISE EXCEPTION 'invalid_token_credit';
  END IF;
  v_event := 'xp:' || p_award_id;

  -- One account's credits run one at a time, so two awards landing together
  -- cannot both see the same room under the cap.
  PERFORM pg_advisory_xact_lock(hashtextextended('token-xp:' || p_user_id, 0));

  -- A replayed award credits nothing, including one credited before this
  -- migration through credit_tokens directly.
  PERFORM 1 FROM public.token_xp_credits WHERE event_id = v_event;
  IF FOUND THEN RETURN 0; END IF;
  PERFORM 1 FROM public.token_ledger WHERE event_id = v_event;
  IF FOUND THEN RETURN 0; END IF;

  v_base := FLOOR(p_xp * p_rate)::INTEGER;
  IF public.is_premium(p_user_id) THEN v_mult := p_premium_multiplier; END IF;

  SELECT COALESCE(SUM(credited), 0) INTO v_used
    FROM public.token_xp_credits
   WHERE user_id = p_user_id AND subject = p_subject AND day = v_day;
  v_credit := GREATEST(0, LEAST(v_base * v_mult, p_daily_cap - v_used));

  INSERT INTO public.token_xp_credits (event_id, user_id, subject, day, xp, base, multiplier, credited)
  VALUES (v_event, p_user_id, p_subject, v_day, p_xp, v_base, v_mult, v_credit);

  IF v_credit > 0 THEN
    PERFORM public.credit_tokens(p_user_id, v_event, p_subject, v_credit, 'verified-xp', p_award_id);
  END IF;
  RETURN v_credit;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_verified_xp_tokens(TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_verified_xp_tokens(TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Premium milestones, settled against verified progress.
-- ---------------------------------------------------------------------------
-- p_config, built by the server from its own content and settings:
--   { "streak":   [{ "days": 7, "coins": 25 }, ...],
--     "topic":    { "coins": 100, "levels": { "html": 30, ... } },
--     "projects": [{ "id": "js-evolving-calculator", "coins": 150, "stages": [...] }, ...] }
-- Returns what it credited and the progress behind every milestone, which the
-- Rewards screen shows as "How to earn". A free account is reported and never
-- credited.
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
  v_last      DATE;
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

  -- The streak the Profile shows: the verified quiz streak, live when the last
  -- verified quiz was today or yesterday (UTC).
  SELECT COALESCE(current_streak, 0), last_quiz_date INTO v_streak, v_last
    FROM public.user_stats WHERE user_id = p_user_id;
  IF NOT FOUND OR v_last IS NULL OR v_last < v_today - 1 THEN v_streak := 0; END IF;

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
-- 6. The monthly top three, settled once per finished month.
-- ---------------------------------------------------------------------------
-- The board is migration 040's dated activity, ranked by the same rule as the
-- 30-day board: most correct answers, then fewer answers, with at least
-- p_min_answers in the month. Ties break on the earlier first active day, then
-- the account id, so each rank has one holder. A rank held by a free account is
-- paid to nobody; Premium changes no rank.
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
  -- The dated board arrives with migration 040. Without it there is nothing to
  -- rank, and the month stays unsettled so a later read can settle it.
  IF to_regclass('public.user_activity_days') IS NULL THEN
    RETURN jsonb_build_object('settled', FALSE, 'reason', 'no_board');
  END IF;

  INSERT INTO public.token_month_settlements (month, subject)
  VALUES (p_month, p_subject)
  ON CONFLICT (month) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('settled', FALSE, 'reason', 'already');
  END IF;

  FOR v_row IN
    SELECT ranked.user_id, ranked.correct, ranked.answered, ranked.rnk
      FROM (
        SELECT a.user_id,
               SUM(a.correct)::INTEGER AS correct,
               SUM(a.answered)::INTEGER AS answered,
               ROW_NUMBER() OVER (
                 ORDER BY SUM(a.correct) DESC, SUM(a.answered) ASC, MIN(a.day) ASC, a.user_id ASC
               )::INTEGER AS rnk
          FROM public.user_activity_days a
         WHERE a.day >= v_start AND a.day < v_end
         GROUP BY a.user_id
        HAVING SUM(a.answered) >= p_min_answers
      ) ranked
     WHERE ranked.rnk <= LEAST(3, COALESCE(array_length(p_rewards, 1), 0))
     ORDER BY ranked.rnk
  LOOP
    v_premium := public.is_premium(v_row.user_id);
    v_coins := p_rewards[v_row.rnk];
    v_paid := FALSE;
    IF v_premium AND v_coins IS NOT NULL AND v_coins BETWEEN 1 AND 100000 THEN
      v_paid := public.credit_tokens(
        v_row.user_id, 'month-top:' || p_month || ':' || v_row.rnk, p_subject, v_coins,
        'milestone', 'month-top:' || p_month
      );
    END IF;
    v_winners := v_winners || jsonb_build_object(
      'rank', v_row.rnk, 'userId', v_row.user_id, 'correct', v_row.correct,
      'answered', v_row.answered, 'premium', v_premium, 'coins', CASE WHEN v_paid THEN v_coins ELSE 0 END
    );
  END LOOP;

  UPDATE public.token_month_settlements SET winners = v_winners WHERE month = p_month;
  RETURN jsonb_build_object('settled', TRUE, 'winners', jsonb_array_length(v_winners));
END;
$$;
REVOKE ALL ON FUNCTION public.settle_month_top3(TEXT, TEXT, INTEGER[], INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_month_top3(TEXT, TEXT, INTEGER[], INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. The social click-through grant: off unless the owner sets an amount.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_social_visit(
  p_user_id  TEXT,
  p_subject  TEXT,
  p_platform TEXT,
  p_amount   INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_platform NOT IN ('linkedin', 'instagram', 'threads') OR
     p_amount IS NULL OR p_amount < 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'invalid_social_visit';
  END IF;
  IF p_amount = 0 THEN RETURN FALSE; END IF;
  RETURN public.credit_tokens(
    p_user_id, 'social:' || p_platform || ':' || public.token_account_key(p_user_id), p_subject, p_amount,
    'social', 'social:' || p_platform
  );
END;
$$;
REVOKE ALL ON FUNCTION public.credit_social_visit(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_social_visit(TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Coding XP, once per account and task.
-- ---------------------------------------------------------------------------
-- Restated verbatim from migration 038 except the award id passed to
-- record_verified_activity_xp, which now names the account.
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

    IF v_first_pass AND p_xp > 0 THEN
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
-- 9. Account deletion. A separate routine, as 039 does, so no migration has to
--    restate delete_user_data (which already removes the ledger and balance).
--    A month's settlement keeps its ranks and loses the person.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_coin_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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
END;
$$;
REVOKE ALL ON FUNCTION public.delete_coin_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_coin_data(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Rollback (manual): DROP the five routines added here and the two tables,
-- restore token_ledger_reason_check without 'milestone' and 'social' (after
-- deleting those ledger rows), and restate record_coding_verdict from 038.
-- ---------------------------------------------------------------------------
