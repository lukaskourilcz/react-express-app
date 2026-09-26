-- Migration 044: one erasure routine again, and the importance check that 014
-- meant to add. Apply after migrations 039 to 043. Safe to re-run.
--
--   * delete_user_data is restated so a single call erases everything an
--     account owns, including the tables that 035 and 039 to 042 added after
--     its last restatement in 033. Those migrations each shipped a separate
--     routine instead (delete_entitlement_data, delete_user_activity_days,
--     delete_coin_data, delete_referral_data), so that parallel steps would
--     not overwrite one another's copy of this body. 035's path_reward_claims
--     was never erased; it is now. The four routines stay installed and
--     api/user/[op].ts still calls them after delete_user_data until this
--     migration is in production; once it is, they delete nothing.
--   * question_edits gains the CHECK that migration 014 declared inline with
--     ADD COLUMN IF NOT EXISTS. Where the column already existed, 014 added
--     nothing, so production has no check on importance at all. The
--     constraint is added only when a constraint of that name is missing.
--
-- No table gains a policy and no routine reads or writes a learning table
-- beyond deleting the account's own rows. delete_user_data stays SECURITY
-- DEFINER with an empty search_path and executable by service_role only.
--
-- The body of delete_user_data names tables from 035 and 039 to 042, and
-- plpgsql resolves them only when the routine runs. Applied early, this file
-- would install cleanly and then fail every account deletion, so section 0
-- refuses to run until every one of those tables exists (review finding
-- data-4). Production receives 039, 040, 041, 042, 043 and 044 in one sitting,
-- in that order, before the code that calls them deploys.

-- ---------------------------------------------------------------------------
-- 0. Refuse to run before the migrations this one depends on.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table   TEXT;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'path_reward_claims',                                                    -- 035
    'entitlement_grants', 'billing_customers', 'billing_checkout_consents',  -- 039
    'user_activity_days',                                                    -- 040
    'token_xp_credits', 'token_month_settlements',                           -- 041
    'referral_codes', 'referrals'                                            -- 042
  ] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      v_missing := v_missing || v_table;
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'migration 044 needs 035 and 039 to 042 first; missing: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. question_edits.importance is 1 to 10 or empty, as 014 intended. On
--    2026-09-25 production had 485 rows, none with an importance, so nothing
--    stored can fail the check.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.question_edits'::regclass
       AND conname = 'question_edits_importance_check'
  ) THEN
    ALTER TABLE public.question_edits
      ADD CONSTRAINT question_edits_importance_check
      CHECK (importance IS NULL OR importance BETWEEN 1 AND 10);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Account erasure in one routine.
--
--    Postgres cannot append a statement to a function, so the whole body is
--    restated: migration 033's body, unchanged and in the same order, then the
--    tables added since. The lines for 039 to 042 do what their own routines
--    do. 035's package claims had no erasure at all until now.
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
  -- handled above, and merch_stock is the owner's monthly cap.
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Catch up an erasure that ran between 040 and this file.
--
--    040 restates the verified answer routines that the code before the
--    freemium programme already calls, so with 040 applied and that code
--    live, dated answers are written, and that code's account deletion (the
--    033 body) leaves them behind. An account deleted in that window keeps
--    its rows and its place on the 30-day board. Applied in one sitting with
--    040, as NEEDED.md says, this deletes nothing.
-- ---------------------------------------------------------------------------
DELETE FROM public.user_activity_days d
 WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id::TEXT = d.user_id);

-- ---------------------------------------------------------------------------
-- Rollback (manual): restate delete_user_data from migration 033 and keep
-- calling the four separate routines from api/user/[op].ts; then
-- ALTER TABLE public.question_edits DROP CONSTRAINT question_edits_importance_check
-- only on a database where 014 did not create it.
-- ---------------------------------------------------------------------------
