-- Migration 060: a replayed Learn level pays its XP again after an hour, and
-- a quiz, daily or Challenge result says which answers the hour held back
-- (owner decision of 9 October 2026, afternoon). Apply after migrations
-- 001-059. Safe to re-run; the whole file is one transaction.
--
-- Compatible with the code in production (bb96f3c), which is still running
-- when this is applied. Every routine that code calls keeps its name,
-- arguments, body, result and grants: the three new routines below wrap them
-- and are called only by the new code, and delete_user_data gains one line.
-- Until the new code deploys, a Learn replay pays nothing, as before.
--
--   1. user_learn_step_xp keeps, per account and Learn step (a level or a
--      part test), when the step last paid its XP and how many repeats it
--      paid.
--
--   2. complete_verified_roadmap_attempt_v2 completes a Learn attempt with
--      complete_verified_roadmap_attempt (056) and then:
--        * on a first pass, starts the step's hour (the first pass's XP is
--          learning XP, derived from progress, and 056 already put it in the
--          month's ledger);
--        * on a pass of a step already passed, pays the step's XP
--          (learn_step_xp) again when it last paid this account at least 60
--          minutes ago. A step first passed before this migration counts its
--          hour from its first passed attempt still on record. The claim is
--          one guarded UPDATE of the step's row, under the progress row lock
--          056 takes, so two completions at once pay once. The repeat is XP
--          only, under its own award id ('learn-repeat:<attempt>'), into
--          user_xp and the month's ledger (record_verified_activity_xp): no
--          coins, no badge, no first-pass reward. A pass inside the hour pays
--          nothing and says when the XP opens again.
--      Mastery, spaced review and the streak are 056's, unchanged. It returns
--      what happened as JSON (`repeatXp`).
--
--   3. record_verified_quiz_result_v3 and record_challenge_completion_v2
--      record a quiz or daily result and a Biggest Shark Challenge run with
--      the routines of 058, unchanged, and then name the correct answers
--      whose question was still inside its hour (the ones that paid no XP)
--      and when the last of them opens again. They read user_question_xp in
--      the same transaction: a question this result paid carries this
--      transaction's NOW(), any other was held back. A replayed result names
--      none.
--
--   4. delete_user_data also erases the account's user_learn_step_xp rows.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.complete_verified_roadmap_attempt(text, text, jsonb)') IS NULL
     OR to_regprocedure('public.learn_step_xp(text, integer)') IS NULL
     OR to_regprocedure('public.record_verified_activity_xp(text, text, text, integer)') IS NULL
     OR to_regprocedure('public.question_xp_claim(text, text, text)') IS NULL
     OR to_regprocedure('public.record_challenge_completion(text, text, text, integer, jsonb, jsonb)') IS NULL
     OR to_regprocedure('public.record_verified_quiz_result_v2(text, text, integer, integer, jsonb, jsonb, text, integer, text, text, text, date, integer)') IS NULL
     OR to_regclass('public.user_question_xp') IS NULL THEN
    RAISE EXCEPTION 'migration 060 needs migrations 056 and 058 first';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. When each Learn step last paid an account its XP.
-- ---------------------------------------------------------------------------
--   last_xp_at  the step's first pass or its last repeat XP; '-infinity' for
--               a step whose first pass is no longer on record, which may pay
--               at once.
--   repeats     repeat XP paid.
CREATE TABLE IF NOT EXISTS public.user_learn_step_xp (
  user_id    TEXT NOT NULL CHECK (char_length(user_id) BETWEEN 8 AND 128),
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  topic      TEXT NOT NULL CHECK (topic ~ '^[a-z0-9-]{1,50}$'),
  kind       TEXT NOT NULL CHECK (kind IN ('level', 'checkpoint')),
  ref        INTEGER NOT NULL CHECK (ref > 0 AND ref <= 100),
  last_xp_at TIMESTAMPTZ NOT NULL,
  repeats    INTEGER NOT NULL DEFAULT 0 CHECK (repeats >= 0),
  PRIMARY KEY (user_id, subject, topic, kind, ref)
);
ALTER TABLE public.user_learn_step_xp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_learn_step_xp FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.user_learn_step_xp IS
  'When each Learn level or part test last paid an account its XP (migration 060). Written only by complete_verified_roadmap_attempt_v2.';

-- ---------------------------------------------------------------------------
-- 2. A Learn completion that pays a replay's XP after an hour.
-- ---------------------------------------------------------------------------
-- Returns {"applied", "passed", "firstPass", "repeatXp"}. `repeatXp` is null
-- unless the attempt passed; then {"xp": the XP this pass paid again (0 for
-- none), "availableAt": when the step's XP opens again, "withheld":
-- "cooldown" when the hour held it back, else null}.
CREATE OR REPLACE FUNCTION public.complete_verified_roadmap_attempt_v2(
  p_user_id TEXT,
  p_attempt_id TEXT,
  p_coding_task_ids JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.roadmap_attempts%ROWTYPE;
  v_was_passed BOOLEAN := FALSE;
  v_applied BOOLEAN;
  v_passed BOOLEAN;
  v_xp INTEGER;
  v_first_at TIMESTAMPTZ;
  v_last_at TIMESTAMPTZ;
  v_paid BOOLEAN := FALSE;
  v_withheld TEXT;
BEGIN
  -- The locks 056 takes, in its order: the attempt row, then the learner's
  -- progress row. Holding them, whether the step was passed before reads
  -- what 056 reads, and a concurrent completion of the same step waits.
  SELECT * INTO v_attempt
    FROM public.roadmap_attempts
   WHERE attempt_id = p_attempt_id
   FOR UPDATE;
  IF FOUND AND p_user_id IS NOT NULL AND v_attempt.user_id = p_user_id AND v_attempt.completed_at IS NULL THEN
    INSERT INTO public.roadmap_progress (user_id, data)
    VALUES (p_user_id, '{}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT COALESCE((data #>> ARRAY[
             v_attempt.topic,
             CASE WHEN v_attempt.kind = 'level' THEN 'levels' ELSE 'checkpoints' END,
             v_attempt.ref::TEXT,
             'passed'
           ])::BOOLEAN, FALSE)
      INTO v_was_passed
      FROM public.roadmap_progress
     WHERE user_id = p_user_id
     FOR UPDATE;
    v_was_passed := COALESCE(v_was_passed, FALSE);
  END IF;

  -- 056 validates, grades, records the pass, mastery and the streak, and
  -- raises what it raised before.
  v_applied := public.complete_verified_roadmap_attempt(p_user_id, p_attempt_id, p_coding_task_ids);
  IF NOT v_applied THEN
    RETURN jsonb_build_object('applied', FALSE, 'passed', NULL, 'firstPass', FALSE, 'repeatXp', NULL);
  END IF;

  SELECT passed INTO v_passed FROM public.roadmap_attempts WHERE attempt_id = p_attempt_id;
  v_passed := COALESCE(v_passed, FALSE);
  v_xp := public.learn_step_xp(v_attempt.kind, v_attempt.ref);
  IF NOT v_passed OR p_user_id IS NULL OR v_xp <= 0 OR v_xp > 10000 THEN
    RETURN jsonb_build_object('applied', TRUE, 'passed', v_passed, 'firstPass', FALSE, 'repeatXp', NULL);
  END IF;

  IF NOT v_was_passed THEN
    -- A first pass: its XP is learning XP (056). The hour starts now.
    INSERT INTO public.user_learn_step_xp AS s (user_id, subject, topic, kind, ref, last_xp_at)
    VALUES (p_user_id, v_attempt.subject, v_attempt.topic, v_attempt.kind, v_attempt.ref, NOW())
    ON CONFLICT (user_id, subject, topic, kind, ref) DO UPDATE SET last_xp_at = NOW();
    v_last_at := NOW();
  ELSE
    -- A step passed before this migration has no row: its hour counts from
    -- its first passed attempt still on record (the first pass paid then).
    SELECT MIN(a.completed_at) INTO v_first_at
      FROM public.roadmap_attempts a
     WHERE a.user_id = p_user_id AND a.subject = v_attempt.subject AND a.topic = v_attempt.topic
       AND a.kind = v_attempt.kind AND a.ref = v_attempt.ref AND a.passed
       AND a.attempt_id <> p_attempt_id;
    INSERT INTO public.user_learn_step_xp (user_id, subject, topic, kind, ref, last_xp_at)
    VALUES (p_user_id, v_attempt.subject, v_attempt.topic, v_attempt.kind, v_attempt.ref,
            COALESCE(v_first_at, '-infinity'::TIMESTAMPTZ))
    ON CONFLICT (user_id, subject, topic, kind, ref) DO NOTHING;

    -- The claim: it succeeds, and the pass pays, only when the step last paid
    -- an hour ago or more.
    UPDATE public.user_learn_step_xp
       SET last_xp_at = NOW(), repeats = repeats + 1
     WHERE user_id = p_user_id AND subject = v_attempt.subject AND topic = v_attempt.topic
       AND kind = v_attempt.kind AND ref = v_attempt.ref
       AND last_xp_at <= NOW() - INTERVAL '60 minutes'
    RETURNING last_xp_at INTO v_last_at;
    IF FOUND THEN
      v_paid := public.record_verified_activity_xp(p_user_id, 'learn-repeat:' || p_attempt_id, v_attempt.subject, v_xp);
    ELSE
      SELECT last_xp_at INTO v_last_at
        FROM public.user_learn_step_xp
       WHERE user_id = p_user_id AND subject = v_attempt.subject AND topic = v_attempt.topic
         AND kind = v_attempt.kind AND ref = v_attempt.ref;
      v_withheld := 'cooldown';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'applied', TRUE,
    'passed', TRUE,
    'firstPass', NOT v_was_passed,
    'repeatXp', jsonb_build_object(
      'xp', CASE WHEN v_paid THEN v_xp ELSE 0 END,
      'availableAt', v_last_at + INTERVAL '60 minutes',
      'withheld', v_withheld
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.complete_verified_roadmap_attempt_v2(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_roadmap_attempt_v2(TEXT, TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. A quiz, daily or Challenge result names the answers the hour held back.
-- ---------------------------------------------------------------------------
-- `xpHeld` is {"questions": how many correct answers paid no XP because their
-- question paid this account XP less than an hour ago, "availableAt": when
-- the last of them pays again}, or null when there were none.

-- A quiz or daily result: record_verified_quiz_result_v2 (058) as it is.
-- Returns {"applied", "xpHeld"}.
CREATE OR REPLACE FUNCTION public.record_verified_quiz_result_v3(
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applied BOOLEAN;
  v_held INTEGER := 0;
  v_until TIMESTAMPTZ;
BEGIN
  v_applied := public.record_verified_quiz_result_v2(
    p_user_id, p_attempt_id, p_correct, p_total, p_breakdown, p_outcomes, p_subject, p_quest_xp,
    p_email, p_name, p_picture, p_daily_date, p_duration_ms
  );
  -- The answers 058 claimed, read as 058 reads them: a correct answer with
  -- XP of its own. One it paid now carries this transaction's NOW().
  IF v_applied AND p_outcomes IS NOT NULL AND jsonb_typeof(p_outcomes) = 'array' THEN
    SELECT COUNT(DISTINCT o.question_id)::INTEGER, MAX(q.last_xp_at) + INTERVAL '60 minutes'
      INTO v_held, v_until
      FROM (
        SELECT value->>'questionId' AS question_id,
               value->>'category' AS category,
               (value->>'isCorrect')::BOOLEAN AS is_correct,
               CASE WHEN jsonb_typeof(value->'xp') = 'number' AND (value->>'xp') ~ '^[0-9]{1,5}$'
                    THEN (value->>'xp')::INTEGER END AS xp
          FROM jsonb_array_elements(p_outcomes)
         LIMIT 50
      ) o
      JOIN public.user_question_xp q
        ON q.user_id = p_user_id AND q.subject = p_subject AND q.question_id = o.question_id
     WHERE o.question_id ~ '^[A-Za-z0-9_-]{1,64}$' AND o.category ~ '^[a-z0-9-]{1,50}$'
       AND o.is_correct AND COALESCE(o.xp, 0) > 0
       AND q.last_xp_at <> NOW()
       AND q.last_xp_at > NOW() - INTERVAL '60 minutes';
  END IF;
  RETURN jsonb_build_object(
    'applied', v_applied,
    'xpHeld', CASE WHEN v_held > 0 THEN jsonb_build_object('questions', v_held, 'availableAt', v_until) END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_verified_quiz_result_v3(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_quiz_result_v3(TEXT, TEXT, INTEGER, INTEGER, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT, TEXT, DATE, INTEGER)
  TO service_role;

-- A Biggest Shark Challenge run: record_challenge_completion (058) as it is.
-- Returns {"awarded", "xp": the XP the run's award holds (0 for none),
-- "xpHeld"}.
CREATE OR REPLACE FUNCTION public.record_challenge_completion_v2(
  p_user_id   TEXT,
  p_run_id    TEXT,
  p_subject   TEXT,
  p_xp        INTEGER,
  p_breakdown JSONB DEFAULT NULL,
  p_outcomes  JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_replay BOOLEAN;
  v_awarded BOOLEAN;
  v_award INTEGER := 0;
  v_held INTEGER := 0;
  v_until TIMESTAMPTZ;
BEGIN
  -- 058's per-learner run lock, taken first, so a run already awarded is
  -- told apart from one whose every answer was held back.
  PERFORM pg_advisory_xact_lock(hashtextextended('challenge-run:' || p_user_id, 0));
  v_replay := EXISTS (SELECT 1 FROM public.verified_activity_awards WHERE award_id = 'challenge:' || p_run_id);

  v_awarded := public.record_challenge_completion(p_user_id, p_run_id, p_subject, p_xp, p_breakdown, p_outcomes);
  IF v_awarded THEN
    SELECT xp INTO v_award FROM public.verified_activity_awards WHERE award_id = 'challenge:' || p_run_id;
  END IF;

  IF NOT v_replay AND COALESCE(p_xp, 0) > 0 AND p_outcomes IS NOT NULL AND jsonb_typeof(p_outcomes) = 'array' THEN
    SELECT COUNT(DISTINCT o.question_id)::INTEGER, MAX(q.last_xp_at) + INTERVAL '60 minutes'
      INTO v_held, v_until
      FROM (
        SELECT value->>'questionId' AS question_id,
               CASE WHEN jsonb_typeof(value->'isCorrect') = 'boolean'
                    THEN (value->>'isCorrect')::BOOLEAN END AS is_correct,
               CASE WHEN jsonb_typeof(value->'xp') = 'number' AND (value->>'xp') ~ '^[0-9]{1,5}$'
                    THEN (value->>'xp')::INTEGER END AS xp
          FROM jsonb_array_elements(p_outcomes)
         LIMIT 1000
      ) o
      JOIN public.user_question_xp q
        ON q.user_id = p_user_id AND q.subject = p_subject AND q.question_id = o.question_id
     WHERE o.question_id ~ '^[A-Za-z0-9_-]{1,64}$'
       AND o.is_correct IS TRUE AND COALESCE(o.xp, 0) > 0
       AND q.last_xp_at <> NOW()
       AND q.last_xp_at > NOW() - INTERVAL '60 minutes';
  END IF;
  RETURN jsonb_build_object(
    'awarded', v_awarded,
    'xp', COALESCE(v_award, 0),
    'xpHeld', CASE WHEN v_held > 0 THEN jsonb_build_object('questions', v_held, 'availableAt', v_until) END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_challenge_completion_v2(TEXT, TEXT, TEXT, INTEGER, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_challenge_completion_v2(TEXT, TEXT, TEXT, INTEGER, JSONB, JSONB)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Account erasure: the Learn step hours go with the account.
-- ---------------------------------------------------------------------------
-- delete_user_data is restated from 058 with one line more, at the end: the
-- account's user_learn_step_xp rows. Every other statement, the signature and
-- the grants are unchanged, so the code in production keeps calling it as it
-- does. It refuses to install before the migrations whose tables it erases;
-- user_learn_step_xp is created above in this file.
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
    'user_question_xp',                                                      -- 058
    'user_learn_step_xp'                                                     -- 060
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      v_missing := v_missing || v_table;
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'migration 060 needs 035 and 039 to 045 first; missing: %', array_to_string(v_missing, ', ');
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

  -- 060: when each Learn step last paid the account XP.
  DELETE FROM public.user_learn_step_xp WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

COMMIT;
