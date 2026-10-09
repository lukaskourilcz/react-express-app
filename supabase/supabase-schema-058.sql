-- Migration 058: coding and question XP after the owner's decisions of
-- 9 October 2026. Apply after migrations 001-057. Safe to re-run. It does not
-- depend on 059 and 059 does not depend on it.
--
-- Compatible with the code in production (e077f45), which is still running
-- when this is applied. Every routine it restates keeps its name, arguments,
-- defaults, result type and grants; results gain keys that code does not
-- read. Two routines are new and that code never calls them. The whole file
-- is one transaction.
--
--   1. A coding task's first VERIFIED pass pays its XP, even after an old
--      unverified pass (decision 3; audit finding C1-7). From 3 September
--      React passes were graded in the browser and reported with p_verified
--      FALSE, and until 29 September a checklist capstone passed on the
--      learner's word. The routine paid only a task's first pass of any kind
--      (`passes = 0`), so the first pass the server checked never paid. Now:
--        * the first pass with p_verified TRUE on a row whose `verified` is
--          still FALSE pays, once per account and task. The row lock (FOR
--          UPDATE) serialises two Submits of one task and the ledger's key
--          refuses a second award;
--        * an account already holding the task's award, under the current
--          id ('coding:<account>:<task>', 041) or the id of 025-038
--          ('coding:<task>' with this account's user_id), is not paid again;
--        * a reveal recorded before it still forfeits it (048), and the
--          result says so in `xpForfeited`;
--        * an unverified pass never pays, whatever p_xp says (the API has
--          sent 0 for one since 29 September).
--      The legacy pass stays as it was. `firstPass` is TRUE for the task's
--      first pass and for its first verified pass. The API credits coins for
--      a first pass under the same award id.
--
--   2. A coding task pays its XP again ("repeat XP", decision of 9 Oct): a
--      verified pass pays the task's XP once more when the learner reset the
--      task to its starter since the last award (`record_coding_reset`,
--      called by the workbench's Reset), at least 60 minutes passed since the
--      task last paid or forfeited its XP, and no reveal was recorded since
--      the reset (`record_coding_repeat_reveal`). Any verified pass closes the
--      reset, so each payment takes a reset of its own and two Submits after
--      one reset pay once. A repeat pays XP only, under its own award id
--      ('coding:<account>:<task>:r<n>'), into user_xp and the month's ledger:
--      no coins, no first-pass flag. The result says when the XP opens again
--      (`repeatXp`). The code in production never resets a task, so until the
--      new code deploys no repeat is ever paid, and nothing it sees changes.
--
--   3. A question's XP waits an hour (same decision): a correct answer pays
--      its XP only when the account's last XP for that question is at least
--      60 minutes old. user_question_xp keeps that time per account, subject
--      and question; a quiz or daily result (record_verified_quiz_result_v2)
--      and a Biggest Shark Challenge run (record_challenge_completion) claim
--      it per correct answer and leave the XP of an answer on cooldown out of
--      the award. The daily keeps its minimum of 20. Boards, streaks and the
--      coin rules do not change: coins follow the XP actually awarded, as
--      before. This amends 056, which paid every repeat. A Learn step pays
--      once, on its first pass (056), and has no per-question XP to wait on.
--      delete_user_data erases the new table.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.record_coding_verdict(text, text, text, text, text, boolean, integer, text, text, integer, integer, integer, text)') IS NULL
     OR to_regprocedure('public.record_verified_activity_xp(text, text, text, integer)') IS NULL
     OR to_regprocedure('public.token_account_key(text)') IS NULL
     OR to_regprocedure('public.advance_verified_streak(text)') IS NULL
     OR to_regprocedure('public.add_xp_day(text, text, integer)') IS NULL
     OR to_regprocedure('public.record_challenge_completion(text, text, text, integer, jsonb, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'migration 058 needs migrations 025, 041, 048, 052 and 056 first';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. What a coding task's repeat XP reads.
-- ---------------------------------------------------------------------------
--   last_xp_at      when the task last paid its XP (a first pass or a repeat)
--                   or a reveal forfeited it; NULL before either.
--   xp_repeats      repeat awards paid, which numbers the next award id.
--   reset_at        the learner's last reset not yet closed by a verified
--                   pass; NULL when none is open.
--   reset_revealed  a reveal was recorded since that reset.
ALTER TABLE public.coding_progress ADD COLUMN IF NOT EXISTS last_xp_at TIMESTAMPTZ;
ALTER TABLE public.coding_progress ADD COLUMN IF NOT EXISTS xp_repeats INTEGER NOT NULL DEFAULT 0 CHECK (xp_repeats >= 0);
ALTER TABLE public.coding_progress ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;
ALTER TABLE public.coding_progress ADD COLUMN IF NOT EXISTS reset_revealed BOOLEAN NOT NULL DEFAULT FALSE;

-- A task paid before this migration counts its hour from that award. Only
-- empty rows are filled, so a second run changes nothing.
UPDATE public.coding_progress p
   SET last_xp_at = a.created_at
  FROM public.verified_activity_awards a
 WHERE p.last_xp_at IS NULL
   AND a.user_id = p.user_id
   AND a.award_id = 'coding:' || public.token_account_key(p.user_id) || ':' || p.task_id;
UPDATE public.coding_progress p
   SET last_xp_at = a.created_at
  FROM public.verified_activity_awards a
 WHERE p.last_xp_at IS NULL
   AND a.user_id = p.user_id
   AND a.award_id = 'coding:' || p.task_id;

-- The workbench's Reset, signed in: it opens the task's next repeat XP. Only
-- a task the account has a row for can be reset; one never opened has
-- nothing to repeat. Returns whether a reset was recorded and when the XP
-- opens again.
CREATE OR REPLACE FUNCTION public.record_coding_reset(p_user_id TEXT, p_task_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.coding_progress%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_task_id IS NULL OR p_task_id !~ '^[a-z0-9-]{3,64}$' THEN
    RAISE EXCEPTION 'invalid_coding_reset';
  END IF;
  UPDATE public.coding_progress
     SET reset_at = NOW(), reset_revealed = FALSE, updated_at = NOW()
   WHERE user_id = p_user_id AND task_id = p_task_id
  RETURNING * INTO v_row;
  RETURN jsonb_build_object(
    'recorded', FOUND,
    'availableAt', CASE WHEN FOUND THEN COALESCE(v_row.last_xp_at, v_row.best_passed_at) + INTERVAL '60 minutes' END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_coding_reset(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_reset(TEXT, TEXT) TO service_role;

-- A reveal of a task already passed. Before a pass the reveal is recorded by
-- record_coding_reveal and forfeits the first pass (048); after one, the API
-- calls this, and it forfeits the repeat XP of the open reset, if any.
CREATE OR REPLACE FUNCTION public.record_coding_repeat_reveal(p_user_id TEXT, p_task_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_task_id IS NULL OR p_task_id !~ '^[a-z0-9-]{3,64}$' THEN
    RAISE EXCEPTION 'invalid_coding_reveal';
  END IF;
  UPDATE public.coding_progress
     SET reset_revealed = TRUE, updated_at = NOW()
   WHERE user_id = p_user_id AND task_id = p_task_id AND reset_at IS NOT NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.record_coding_repeat_reveal(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_coding_repeat_reveal(TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. A coding verdict: the first verified pass, and the repeat XP.
-- ---------------------------------------------------------------------------
-- Restated from 052. What changes is marked "058".
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
  v_verified BOOLEAN := COALESCE(p_verified, FALSE);
  v_first_pass BOOLEAN := FALSE;
  v_first_verified BOOLEAN := FALSE;
  v_paid_before BOOLEAN := FALSE;
  v_revealed_before BOOLEAN := FALSE;
  v_reset_open BOOLEAN := FALSE;
  v_reset_revealed BOOLEAN := FALSE;
  v_settled_at TIMESTAMPTZ;
  v_settles BOOLEAN := FALSE;
  v_xp_awarded BOOLEAN := FALSE;
  v_xp_forfeited BOOLEAN := FALSE;
  v_xp_kind TEXT;
  v_withheld TEXT;
  v_repeat JSONB;
  v_code_changed BOOLEAN := FALSE;
  v_award_id TEXT;
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
    p_attempt_id, p_user_id, p_task_id, p_track, p_outcome, v_verified,
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
      'applied', FALSE, 'firstPass', FALSE, 'xpAwarded', FALSE, 'xpForfeited', FALSE,
      'xpKind', NULL, 'repeatXp', NULL, 'codeChanged', FALSE,
      'status', v_row.status, 'passes', v_row.passes, 'reviewStage', v_row.review_stage,
      'nextReviewAt', v_row.next_review_at
    );
  END IF;

  -- Moved up in 052: the attempt row's lock comes before user_stats's.
  IF p_roadmap_attempt_id IS NOT NULL THEN
    INSERT INTO public.roadmap_attempt_coding (attempt_id, task_id, passed, verified)
    VALUES (p_roadmap_attempt_id, p_task_id, p_outcome = 'passed', v_verified)
    ON CONFLICT (attempt_id, task_id) DO UPDATE SET
      passed = public.roadmap_attempt_coding.passed OR EXCLUDED.passed,
      verified = public.roadmap_attempt_coding.verified OR EXCLUDED.verified,
      updated_at = NOW();
  END IF;

  IF p_outcome = 'passed' THEN
    -- 058: the first verified pass is a first pass too, after an unverified
    -- one. v_row is locked, so a concurrent Submit of this task reads the
    -- row this one writes.
    v_first_verified := v_verified AND NOT v_row.verified;
    v_first_pass := v_row.passes = 0 OR v_first_verified;
    -- Read before the update below. The API records a reveal with
    -- record_coding_reveal only before a pass, so one on record came first.
    v_revealed_before := v_row.reveal_count > 0 OR v_row.status = 'revealed';
    v_code_changed := p_code_hash IS NOT NULL AND v_row.last_code_hash IS DISTINCT FROM p_code_hash;
    -- 058: the repeat XP's state before this pass.
    v_reset_open := v_row.reset_at IS NOT NULL;
    v_reset_revealed := v_row.reset_revealed;
    v_settled_at := COALESCE(v_row.last_xp_at, v_row.best_passed_at);

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

    -- 058: a verified pass closes the open reset, whether it pays or not.
    UPDATE public.coding_progress
       SET status = 'passed',
           verified = verified OR v_verified,
           passes = passes + 1,
           clean_passes = v_clean,
           last_pass_sitting = v_today,
           review_stage = v_stage,
           next_review_at = v_next,
           best_passed_at = COALESCE(best_passed_at, NOW()),
           last_code_hash = COALESCE(p_code_hash, last_code_hash),
           reset_at = CASE WHEN v_verified THEN NULL ELSE reset_at END,
           reset_revealed = CASE WHEN v_verified THEN FALSE ELSE reset_revealed END,
           updated_at = NOW()
     WHERE user_id = p_user_id AND task_id = p_task_id
     RETURNING * INTO v_row;

    -- Any verified pass is a day of learning (048). An unverified
    -- (self-reported checklist) pass is not.
    IF v_verified THEN
      PERFORM public.advance_verified_streak(p_user_id);
    END IF;

    IF v_verified AND p_xp > 0 THEN
      v_award_id := 'coding:' || public.token_account_key(p_user_id) || ':' || p_task_id;
      -- 058: an account already holding the task's award under the current
      -- id or the id of 025-038 was paid for an earlier pass.
      IF v_first_verified THEN
        v_paid_before := EXISTS (
          SELECT 1 FROM public.verified_activity_awards
           WHERE award_id IN (v_award_id, 'coding:' || p_task_id) AND user_id = p_user_id
        );
      END IF;
      IF v_first_verified AND NOT v_paid_before THEN
        -- The first verified pass pays, unless a reveal came first (048).
        v_settles := TRUE;
        IF v_revealed_before THEN
          v_xp_forfeited := TRUE;
        ELSE
          v_xp_awarded := public.record_verified_activity_xp(p_user_id, v_award_id, p_subject, p_xp);
          IF v_xp_awarded THEN v_xp_kind := 'first'; END IF;
        END IF;
      -- 058: the repeat XP needs a reset since the last award, an hour since
      -- the task last paid or forfeited its XP, and no reveal since the reset.
      ELSIF NOT v_reset_open THEN
        v_withheld := 'reset';
      ELSIF v_settled_at IS NOT NULL AND NOW() < v_settled_at + INTERVAL '60 minutes' THEN
        v_withheld := 'cooldown';
      ELSIF v_reset_revealed THEN
        v_settles := TRUE;
        v_xp_forfeited := TRUE;
      ELSE
        v_settles := TRUE;
        v_xp_awarded := public.record_verified_activity_xp(
          p_user_id, v_award_id || ':r' || (v_row.xp_repeats + 1), p_subject, p_xp
        );
        IF v_xp_awarded THEN v_xp_kind := 'repeat'; END IF;
      END IF;

      IF v_settles THEN
        UPDATE public.coding_progress
           SET last_xp_at = NOW(),
               xp_repeats = xp_repeats + CASE WHEN v_xp_kind = 'repeat' THEN 1 ELSE 0 END
         WHERE user_id = p_user_id AND task_id = p_task_id
         RETURNING * INTO v_row;
      END IF;
      v_repeat := jsonb_build_object(
        'availableAt', COALESCE(v_row.last_xp_at, v_row.best_passed_at) + INTERVAL '60 minutes',
        'needsReset', v_row.reset_at IS NULL,
        'withheld', v_withheld
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
    'xpForfeited', v_xp_forfeited, 'xpKind', v_xp_kind, 'repeatXp', v_repeat,
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
-- 3. A question's XP waits an hour.
-- ---------------------------------------------------------------------------
-- When each question last paid this account XP. A correct answer claims the
-- row (`question_xp_claim`): the claim succeeds, and the answer pays, when
-- the row is missing or at least 60 minutes old. The claim is one upsert,
-- so two results paying one question at once pay it once.
CREATE TABLE IF NOT EXISTS public.user_question_xp (
  user_id     TEXT NOT NULL CHECK (char_length(user_id) BETWEEN 8 AND 128),
  subject     TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  question_id TEXT NOT NULL CHECK (question_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  last_xp_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, question_id)
);
ALTER TABLE public.user_question_xp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_question_xp FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.question_xp_claim(p_user_id TEXT, p_subject TEXT, p_question_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed INTEGER;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 OR
     p_subject IS NULL OR p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_question_id IS NULL OR p_question_id !~ '^[A-Za-z0-9_-]{1,64}$' THEN
    RAISE EXCEPTION 'invalid_question_xp_claim';
  END IF;
  INSERT INTO public.user_question_xp AS q (user_id, subject, question_id, last_xp_at)
  VALUES (p_user_id, p_subject, p_question_id, NOW())
  ON CONFLICT (user_id, subject, question_id) DO UPDATE SET last_xp_at = NOW()
   WHERE q.last_xp_at <= NOW() - INTERVAL '60 minutes';
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.question_xp_claim(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.question_xp_claim(TEXT, TEXT, TEXT) TO service_role;

-- A quiz or daily result. Restated from 056; what changes is marked "058".
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
  -- The receipt's XP, less the XP of each correct answer whose question paid
  -- this account XP less than an hour ago (058). The daily's minimum of 20 is
  -- already in the receipt's total (api/quiz/submit.ts) and stays.
  v_xp            INTEGER := p_quest_xp;
  v_cut           INTEGER := 0;
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
             (value->>'isCorrect')::BOOLEAN AS is_correct,
             CASE WHEN jsonb_typeof(value->'xp') = 'number' AND (value->>'xp') ~ '^[0-9]{1,5}$'
                  THEN (value->>'xp')::INTEGER END AS xp
        FROM jsonb_array_elements(p_outcomes)
       LIMIT 50
    LOOP
      IF rec.question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
         rec.category !~ '^[a-z0-9-]{1,50}$' THEN
        CONTINUE;
      END IF;

      -- 058: a correct answer pays its XP only when its question last paid
      -- this account XP an hour ago or more. A receipt minted before 052
      -- names no XP per question and is paid as it is.
      IF rec.is_correct AND COALESCE(rec.xp, 0) > 0 AND
         NOT public.question_xp_claim(p_user_id, p_subject, rec.question_id) THEN
        v_cut := v_cut + rec.xp;
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

  -- 058: the answers on cooldown pay nothing; the daily keeps its 20.
  v_xp := GREATEST(0, p_quest_xp - v_cut);
  IF p_daily_date IS NOT NULL THEN
    v_xp := GREATEST(v_xp, LEAST(p_quest_xp, 20));
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
    -- The month's XP (056, section 3).
    PERFORM public.add_xp_day(p_user_id, p_subject, v_xp);
  END IF;

  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.record_verified_quiz_result_v2(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result_v2(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  TO service_role;

-- A Biggest Shark Challenge run. Restated from 052; what changes is marked
-- "058".
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
  v_cut       INTEGER := 0;
  v_award     INTEGER;
  rec         RECORD;
BEGIN
  IF p_run_id IS NULL OR p_run_id !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RAISE EXCEPTION 'invalid_challenge_completion';
  END IF;
  IF p_xp IS NULL OR p_xp <= 0 THEN
    RETURN FALSE;
  END IF;

  -- 058: one learner's runs complete one at a time, so a run sent twice at
  -- once finds the first one's award below before it claims any question.
  PERFORM pg_advisory_xact_lock(hashtextextended('challenge-run:' || p_user_id, 0));

  -- A run already awarded (here or by the pre-040 path) changes nothing.
  PERFORM 1 FROM public.verified_activity_awards WHERE award_id = 'challenge:' || p_run_id;
  IF FOUND THEN RETURN FALSE; END IF;

  -- 058: a correct answer pays its XP only when its question last paid this
  -- account XP an hour ago or more. The API names each answer's XP in
  -- p_outcomes; an answer without one (the code before 058) is paid as before.
  IF p_outcomes IS NOT NULL AND jsonb_typeof(p_outcomes) = 'array' THEN
    FOR rec IN
      SELECT value->>'questionId' AS question_id,
             CASE WHEN jsonb_typeof(value->'isCorrect') = 'boolean'
                  THEN (value->>'isCorrect')::BOOLEAN END AS is_correct,
             CASE WHEN jsonb_typeof(value->'xp') = 'number' AND (value->>'xp') ~ '^[0-9]{1,5}$'
                  THEN (value->>'xp')::INTEGER END AS xp
        FROM jsonb_array_elements(p_outcomes)
       LIMIT 1000
    LOOP
      IF rec.question_id IS NULL OR rec.question_id !~ '^[A-Za-z0-9_-]{1,64}$' OR
         rec.is_correct IS NOT TRUE OR COALESCE(rec.xp, 0) = 0 THEN
        CONTINUE;
      END IF;
      IF NOT public.question_xp_claim(p_user_id, p_subject, rec.question_id) THEN
        v_cut := v_cut + rec.xp;
      END IF;
    END LOOP;
  END IF;
  v_award := p_xp - v_cut;
  -- Every correct answer on cooldown: no XP, as for a run with none right.
  -- Nothing was claimed, so nothing is written.
  IF v_award <= 0 THEN RETURN FALSE; END IF;

  -- The streak day, and the user_stats lock that makes one learner's writes
  -- apply one after the other, so the freshness read below sees what an
  -- earlier quiz or run wrote.
  PERFORM public.advance_verified_streak(p_user_id);

  -- Validates the user, the subject and the amount, and is the receipt.
  IF NOT public.record_verified_activity_xp(p_user_id, 'challenge:' || p_run_id, p_subject, v_award) THEN
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
-- 4. Account erasure: the question cooldowns go with the account.
-- ---------------------------------------------------------------------------
-- delete_user_data is restated from 056 with one line more, at the end: the
-- account's user_question_xp rows. Every other statement, the signature and
-- the grants are unchanged, so the code in production keeps calling it as it
-- does. It refuses to install before the migrations whose tables it erases;
-- user_question_xp is created above in this file.
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
    'premium_vouchers', 'premium_voucher_redemptions',                       -- 045
    'user_xp_days',                                                          -- 056
    'user_question_xp'                                                       -- 058
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      v_missing := v_missing || v_table;
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'migration 058 needs 035 and 039 to 045 first; missing: %', array_to_string(v_missing, ', ');
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

  -- 058: when each question last paid the account XP.
  DELETE FROM public.user_question_xp WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

COMMIT;
