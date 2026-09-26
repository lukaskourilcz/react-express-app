-- Migration 045: Premium vouchers. Apply after migrations 039 to 044. Safe to
-- re-run.
--
-- Billing stays switched off until the owner's Stripe account exists
-- (NEEDED.md). Until then, and beside billing afterwards, a signed-in learner
-- can enter a voucher code on /premium and Premium opens for that account. The
-- owner creates the codes in /dev → Vouchers.
--
--   * premium_vouchers holds one row per code: the SHA-256 of the normalised
--     code (upper case, no spaces or hyphens), never the code itself; its first
--     four characters, so the owner can tell codes apart; a note; how many days
--     of Premium it opens (NULL: no end); how many accounts may redeem it; until
--     when; and whether it is still active. The API shows the code once, when
--     it creates it.
--   * premium_voucher_redemptions records which account redeemed which voucher,
--     when, and the grant it opened. One row per voucher and account, so an
--     account redeems a voucher once.
--   * A redemption opens Premium through the table 039 already reads: an
--     entitlement_grants row with source 'promo', status 'active' and
--     valid_until = now + the voucher's days, or NULL. is_premium and
--     entitlement_summary count an active promo grant until its valid_until,
--     so nothing of 039 changes, and the billing webhook never touches a promo
--     row. A voucher's days start when it is redeemed.
--
-- Premium changes which content a learner may start and nothing else. No
-- routine here reads or writes a learning, score, streak or wallet table.
--
-- delete_user_data is restated: 044's body unchanged and in the same order,
-- then this migration's tables, so one routine still erases everything an
-- account owns (docs/product-architecture.md, "Account erasure").

-- ---------------------------------------------------------------------------
-- 0. Refuse to run before the migrations this one depends on. The redemption
--    writes 039's entitlement_grants, and the restated delete_user_data names
--    the tables of 035 and 039 to 042, which plpgsql resolves only when the
--    routine runs.
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
    RAISE EXCEPTION 'migration 045 needs 035 and 039 to 042 first; missing: %', array_to_string(v_missing, ', ');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.premium_vouchers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SHA-256 of the normalised code, in hex. The code itself is never stored.
  code_hash        TEXT NOT NULL UNIQUE CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  -- The first four characters of the normalised code, for the owner's list.
  code_hint        TEXT NOT NULL CHECK (code_hint ~ '^[0-9A-Z]{4}$'),
  -- Who the code is for and why. Only the owner reads it.
  note             TEXT NOT NULL CHECK (LENGTH(note) BETWEEN 1 AND 500),
  -- Days of Premium from the moment of redemption; NULL opens it with no end.
  premium_days     INTEGER CHECK (premium_days IS NULL OR premium_days BETWEEN 1 AND 1830),
  max_redemptions  INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions BETWEEN 1 AND 10000),
  redeemed_count   INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  -- The code cannot be redeemed from this moment on; NULL: until it is used
  -- up or revoked.
  redeemable_until TIMESTAMPTZ,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The admin account that created it; NULL when the legacy console password
  -- did.
  created_by       TEXT CHECK (created_by IS NULL OR LENGTH(created_by) BETWEEN 1 AND 128),
  revoked_at       TIMESTAMPTZ,
  CHECK (redeemed_count <= max_redemptions),
  CHECK (active OR revoked_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.premium_voucher_redemptions (
  voucher_id  UUID NOT NULL REFERENCES public.premium_vouchers (id),
  user_id     TEXT NOT NULL CHECK (LENGTH(user_id) BETWEEN 1 AND 128),
  -- The grant this redemption opened. Erasing the account deletes the grant,
  -- and the row goes with it.
  grant_id    UUID NOT NULL UNIQUE REFERENCES public.entitlement_grants (id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (voucher_id, user_id)
);
CREATE INDEX IF NOT EXISTS premium_voucher_redemptions_user_idx
  ON public.premium_voucher_redemptions (user_id);

-- ---------------------------------------------------------------------------
-- 2. Row-level security. Both tables are service-role only: no policy and no
--    browser grant. A learner learns what a redemption opened from the answer
--    to the redemption and from the plan (entitlement_summary), never by
--    reading these tables.
-- ---------------------------------------------------------------------------
ALTER TABLE public.premium_vouchers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Supabase grants every privilege to anon and authenticated on a new table.
REVOKE ALL ON public.premium_vouchers            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.premium_voucher_redemptions FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The owner's routines: create, list and revoke. All service-role only;
--    the API calls them from the admin handler, after the admin check.
-- ---------------------------------------------------------------------------

-- One voucher row as the admin list shows it. Private: only the two routines
-- below call it.
CREATE OR REPLACE FUNCTION public.premium_voucher_json(p_voucher public.premium_vouchers)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', p_voucher.id,
    'hint', p_voucher.code_hint,
    'note', p_voucher.note,
    'premiumDays', p_voucher.premium_days,
    'maxRedemptions', p_voucher.max_redemptions,
    'redeemedCount', p_voucher.redeemed_count,
    'redeemableUntil', p_voucher.redeemable_until,
    'active', p_voucher.active,
    'createdAt', p_voucher.created_at,
    'revokedAt', p_voucher.revoked_at
  );
$$;
REVOKE ALL ON FUNCTION public.premium_voucher_json(public.premium_vouchers) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.premium_voucher_json(public.premium_vouchers) TO service_role;

-- Create a voucher from the hash of its code. Returns the new voucher, or NULL
-- when a voucher with the same code exists already (the caller picks another
-- code, or tells the owner that a custom code is taken).
CREATE OR REPLACE FUNCTION public.create_premium_voucher(
  p_code_hash        TEXT,
  p_code_hint        TEXT,
  p_note             TEXT,
  p_premium_days     INTEGER,
  p_max_redemptions  INTEGER,
  p_redeemable_until TIMESTAMPTZ,
  p_created_by       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.premium_vouchers%ROWTYPE;
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$'
     OR p_code_hint IS NULL OR p_code_hint !~ '^[0-9A-Z]{4}$'
     OR p_note IS NULL OR LENGTH(p_note) NOT BETWEEN 1 AND 500
     OR (p_premium_days IS NOT NULL AND p_premium_days NOT BETWEEN 1 AND 1830)
     OR p_max_redemptions IS NULL OR p_max_redemptions NOT BETWEEN 1 AND 10000
     OR (p_created_by IS NOT NULL AND LENGTH(p_created_by) NOT BETWEEN 1 AND 128) THEN
    RAISE EXCEPTION 'invalid_premium_voucher';
  END IF;
  IF p_redeemable_until IS NOT NULL AND p_redeemable_until <= NOW() THEN
    RAISE EXCEPTION 'premium_voucher_in_past';
  END IF;

  INSERT INTO public.premium_vouchers (
    code_hash, code_hint, note, premium_days, max_redemptions, redeemable_until, created_by
  )
  VALUES (
    p_code_hash, p_code_hint, p_note, p_premium_days, p_max_redemptions, p_redeemable_until, p_created_by
  )
  ON CONFLICT (code_hash) DO NOTHING
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.premium_voucher_json(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.create_premium_voucher(TEXT, TEXT, TEXT, INTEGER, INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_premium_voucher(TEXT, TEXT, TEXT, INTEGER, INTEGER, TIMESTAMPTZ, TEXT) TO service_role;

-- The newest vouchers first, without their hashes.
CREATE OR REPLACE FUNCTION public.list_premium_vouchers(p_limit INTEGER DEFAULT 200)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(public.premium_voucher_json(v) ORDER BY v.created_at DESC, v.id), '[]'::jsonb)
    FROM public.premium_vouchers v
   WHERE v.id IN (
     SELECT n.id
       FROM public.premium_vouchers n
      ORDER BY n.created_at DESC, n.id
      LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500)
   );
$$;
REVOKE ALL ON FUNCTION public.list_premium_vouchers(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_premium_vouchers(INTEGER) TO service_role;

-- Stop a voucher: it opens nothing from now on. Premium that it already opened
-- stays until the end of its grant (an admin ends one with op=entitlements).
-- Returns the voucher, or NULL when there is none with that id. Revoking twice
-- keeps the first time.
CREATE OR REPLACE FUNCTION public.revoke_premium_voucher(p_voucher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.premium_vouchers%ROWTYPE;
BEGIN
  UPDATE public.premium_vouchers
     SET active = FALSE, revoked_at = COALESCE(revoked_at, NOW())
   WHERE id = p_voucher_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.premium_voucher_json(v_row);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_premium_voucher(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_premium_voucher(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Redemption. Service-role only; the API calls it for the signed-in
--    account with the hash of the code the learner typed.
--
--    Answers { status: 'redeemed', grantId, validUntil, redeemedAt },
--    { status: 'already' } when this account redeemed this voucher before, or
--    { status: 'invalid' } for an unknown, inactive, expired or used-up code:
--    one answer for all four, so a guess learns nothing about a code.
--
--    The voucher row is locked first, so two redemptions of the last use run
--    one after the other and the second sees the count the first left.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_premium_voucher(
  p_user_id   TEXT,
  p_code_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_voucher     public.premium_vouchers%ROWTYPE;
  v_valid_until TIMESTAMPTZ;
  v_grant_id    UUID;
BEGIN
  IF p_user_id IS NULL OR LENGTH(p_user_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'invalid_voucher_redemption';
  END IF;

  SELECT * INTO v_voucher
    FROM public.premium_vouchers
   WHERE code_hash = p_code_hash
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.premium_voucher_redemptions r
     WHERE r.voucher_id = v_voucher.id AND r.user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('status', 'already');
  END IF;

  IF NOT v_voucher.active
     OR (v_voucher.redeemable_until IS NOT NULL AND v_voucher.redeemable_until <= NOW())
     OR v_voucher.redeemed_count >= v_voucher.max_redemptions THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  v_valid_until := CASE
    WHEN v_voucher.premium_days IS NULL THEN NULL
    ELSE NOW() + make_interval(days => v_voucher.premium_days)
  END;

  -- The account can read its own grants (039's policy), so the note names the
  -- voucher by its hint and never by its code.
  INSERT INTO public.entitlement_grants (user_id, source, status, valid_until, note)
  VALUES (p_user_id, 'promo', 'active', v_valid_until, 'Voucher ' || v_voucher.code_hint)
  RETURNING id INTO v_grant_id;

  UPDATE public.premium_vouchers
     SET redeemed_count = redeemed_count + 1
   WHERE id = v_voucher.id;

  INSERT INTO public.premium_voucher_redemptions (voucher_id, user_id, grant_id)
  VALUES (v_voucher.id, p_user_id, v_grant_id);

  RETURN jsonb_build_object(
    'status', 'redeemed',
    'grantId', v_grant_id,
    'validUntil', v_valid_until,
    'redeemedAt', NOW()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_premium_voucher(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_premium_voucher(TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Account erasure in one routine.
--
--    Postgres cannot append a statement to a function, so the whole body is
--    restated: migration 044's body, unchanged and in the same order, then
--    this migration's tables.
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
-- Rollback (manual): restate delete_user_data from migration 044; then
-- DROP FUNCTION public.redeem_premium_voucher(TEXT, TEXT),
-- public.revoke_premium_voucher(UUID), public.list_premium_vouchers(INTEGER),
-- public.create_premium_voucher(TEXT, TEXT, TEXT, INTEGER, INTEGER, TIMESTAMPTZ, TEXT)
-- and public.premium_voucher_json(public.premium_vouchers); then
-- DROP TABLE public.premium_voucher_redemptions, public.premium_vouchers.
-- The promo grants the vouchers opened stay in entitlement_grants and keep
-- Premium open until their end; revoke them with revoke_manual_entitlement.
-- ---------------------------------------------------------------------------
