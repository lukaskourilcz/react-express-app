-- Migration 046: drop the four erasure routines that 044 folded into
-- delete_user_data. Apply after migration 045, and only once the code that
-- stopped calling them is deployed. Safe to re-run.
--
--   * 039, 040, 041 and 042 each shipped an erasure routine of their own
--     (delete_entitlement_data, delete_user_activity_days, delete_coin_data,
--     delete_referral_data), so that parallel steps would not overwrite one
--     another's copy of delete_user_data. 044 restated delete_user_data with
--     every statement of the four, and 045 restated it again with the voucher
--     redemptions, so after 044 each of the four deletes nothing.
--   * api/user/[op].ts called the four after delete_user_data until the
--     deploy that ships this file. From that deploy on, account deletion calls
--     delete_user_data alone. No routine, trigger, policy, view or default in
--     migrations 001 to 045 calls any of the four.
--
-- Order in production: deploy the code first, then run this file. The code
-- before that deploy calls the four routines on every account deletion.
--
-- Nothing else changes: no table, grant or policy, and delete_user_data keeps
-- 045's body.

-- ---------------------------------------------------------------------------
-- 0. Refuse to run before 045, when delete_user_data does not erase every
--    table the four routines touch, or while anything else still calls one
--    of them. A plpgsql body and a cron job name a routine as text, which
--    Postgres does not record as a dependency, so a plain DROP would succeed
--    and leave that caller to fail later.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table   TEXT;
  v_body    TEXT;
  v_callers TEXT;
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_pattern CONSTANT TEXT := '\mdelete_(entitlement_data|user_activity_days|coin_data|referral_data)\M';
BEGIN
  FOREACH v_table IN ARRAY ARRAY['premium_vouchers', 'premium_voucher_redemptions'] LOOP  -- 045
    IF to_regclass('public.' || v_table) IS NULL THEN
      v_missing := v_missing || v_table;
    END IF;
  END LOOP;

  SELECT p.prosrc INTO v_body
    FROM pg_catalog.pg_proc p
   WHERE p.oid = to_regprocedure('public.delete_user_data(text)');
  IF v_body IS NULL THEN
    v_missing := v_missing || 'delete_user_data'::TEXT;
  ELSE
    FOREACH v_table IN ARRAY ARRAY[
      'entitlement_grants', 'billing_customers', 'billing_checkout_consents',  -- 039
      'user_activity_days',                                                    -- 040
      'token_xp_credits', 'token_month_settlements',                           -- 041
      'referral_codes', 'referrals',                                           -- 042
      'premium_voucher_redemptions'                                            -- 045
    ] LOOP
      IF v_body !~ ('\mpublic\.' || v_table || '\M') THEN
        v_missing := v_missing || ('delete_user_data erasing ' || v_table);
      END IF;
    END LOOP;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'migration 046 needs 045 first; missing: %', array_to_string(v_missing, ', ');
  END IF;

  SELECT string_agg(p.oid::regprocedure::TEXT, ', ' ORDER BY p.oid::regprocedure::TEXT) INTO v_callers
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE p.prosrc ~ v_pattern
     AND NOT (n.nspname = 'public'
              AND p.proname IN ('delete_entitlement_data', 'delete_user_activity_days',
                                'delete_coin_data', 'delete_referral_data'));
  IF v_callers IS NOT NULL THEN
    RAISE EXCEPTION 'migration 046 drops routines that % still call', v_callers;
  END IF;

  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT string_agg(jobname, '', '') FROM cron.job WHERE command ~ $1'
       INTO v_callers USING v_pattern;
    IF v_callers IS NOT NULL THEN
      RAISE EXCEPTION 'migration 046 drops routines that the cron jobs % still call', v_callers;
    END IF;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Drop the four routines. RESTRICT is the default: a drop fails, and
--    changes nothing, if a view, policy or default depends on the routine.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_entitlement_data(TEXT);    -- 039
DROP FUNCTION IF EXISTS public.delete_user_activity_days(TEXT);  -- 040
DROP FUNCTION IF EXISTS public.delete_coin_data(TEXT);           -- 041
DROP FUNCTION IF EXISTS public.delete_referral_data(TEXT);       -- 042

-- ---------------------------------------------------------------------------
-- Rollback (manual): run again the CREATE OR REPLACE FUNCTION, REVOKE and
-- GRANT statements of each routine: 039 section 4, 040 section 8, 041
-- section 9 and 042 section 6. Only code older than the deploy that ships
-- this file calls them.
-- ---------------------------------------------------------------------------
