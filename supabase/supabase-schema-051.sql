-- Migration 051: deleting an account gives back the merchandise it held.
-- Apply after migrations 028, 035, 039 to 045. Safe to re-run.
--
-- delete_user_data, last restated by 045 (046 and 047 do not touch it),
-- deleted an account's orders awaiting payment without releasing the stock
-- they reserved, and kept a paid order the supplier never received (a coin
-- redemption, its address redacted) in the fulfilment queue, where it could
-- not ship and still held its units against the month's cap.
--
-- The routine is restated with 045's body unchanged and in the same order,
-- except the merchandise lines, which now:
--
--   * lock the account's orders that were not handed to Spreadshop yet
--     ('awaiting_payment' or 'paid') and give their reservations back in one
--     grouped update of merch_stock.reserved per SKU and size, never below
--     zero. A claimed learning-path package (a path_reward_claims row points
--     at it) reserved nothing, so it releases nothing;
--   * delete orders awaiting payment and cancelled ones, as before, and with
--     them a claimed package that was never sent and, further down, its claim,
--     as before;
--   * cancel a paid order the supplier never received (state 'cancelled',
--     cancelled_at now) and keep it, anonymised like every kept order, as the
--     record of what was paid. It leaves the fulfilment queue, which lists
--     paid orders and claimed packages;
--   * keep orders already submitted or shipped, anonymised, as before. A
--     submitted order keeps its reservation until the owner ships it.
--
-- The signature, grants and every other statement are unchanged, so the code
-- in production keeps calling it as it does. The API calls delete_user_data
-- alone (docs/product-architecture.md, "Account erasure").

-- ---------------------------------------------------------------------------
-- 0. Refuse to run before the migrations this one depends on. plpgsql
--    resolves a table only when the routine runs, so a copy installed early
--    would fail every deletion.
-- ---------------------------------------------------------------------------
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
    RAISE EXCEPTION 'migration 051 needs 035 and 039 to 045 first; missing: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Account erasure in one routine, restated from 045 with the merchandise
--    lines above.
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
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Rollback (manual): restate delete_user_data from migration 045. Orders this
-- version cancelled stay cancelled and their units stay released; nothing
-- else changed.
-- ---------------------------------------------------------------------------
