-- A Premium voucher opens Premium once per account, and a voucher with one
-- use opens it for exactly one account. Redeeming twice answers "already" and
-- grants nothing more; a used-up code is refused and grants nothing.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_first  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000050';
  v_second CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000051';
  v_single CONSTANT TEXT := repeat('5', 64);
  v_shared CONSTANT TEXT := repeat('6', 64);
  v_result JSONB;
  v_grants INTEGER;
  v_count INTEGER;
BEGIN
  PERFORM public.create_premium_voucher(v_single, 'SING', 'single-use test voucher', 30, 1, NULL, NULL);
  PERFORM public.create_premium_voucher(v_shared, 'SHAR', 'two-use test voucher', NULL, 2, NULL, NULL);
  ASSERT NOT public.is_premium(v_first), 'no Premium before redeeming';

  v_result := public.redeem_premium_voucher(v_first, v_single);
  ASSERT v_result ->> 'status' = 'redeemed', format('the first redemption succeeds: %s', v_result);
  ASSERT (v_result ->> 'validUntil')::TIMESTAMPTZ BETWEEN NOW() + INTERVAL '29 days' AND NOW() + INTERVAL '31 days',
    format('a 30-day voucher ends in 30 days: %s', v_result);
  ASSERT public.is_premium(v_first), 'the voucher opens Premium';

  v_result := public.redeem_premium_voucher(v_first, v_single);
  ASSERT v_result ->> 'status' = 'already', format('the same account redeeming again is told "already": %s', v_result);
  SELECT count(*) INTO v_grants FROM public.entitlement_grants WHERE user_id = v_first;
  ASSERT v_grants = 1, format('redeeming again grants nothing more: %s grants', v_grants);

  v_result := public.redeem_premium_voucher(v_second, v_single);
  ASSERT v_result ->> 'status' = 'invalid', format('a used-up single-use voucher is refused: %s', v_result);
  ASSERT NOT public.is_premium(v_second), 'the refused account has no Premium';
  SELECT count(*) INTO v_grants FROM public.entitlement_grants WHERE user_id = v_second;
  ASSERT v_grants = 0, format('the refused account got no grant: %s', v_grants);
  SELECT redeemed_count INTO v_count FROM public.premium_vouchers WHERE code_hash = v_single;
  ASSERT v_count = 1, format('the single-use voucher counts one use, got %s', v_count);

  -- A two-use voucher serves two accounts, once each.
  ASSERT public.redeem_premium_voucher(v_first, v_shared) ->> 'status' = 'redeemed', 'the first account redeems the shared voucher';
  ASSERT public.redeem_premium_voucher(v_second, v_shared) ->> 'status' = 'redeemed', 'the second account redeems the shared voucher';
  ASSERT public.redeem_premium_voucher(v_second, v_shared) ->> 'status' = 'already', 'and not twice';
  SELECT redeemed_count INTO v_count FROM public.premium_vouchers WHERE code_hash = v_shared;
  ASSERT v_count = 2, format('the shared voucher counts two uses, got %s', v_count);

  ASSERT public.redeem_premium_voucher(v_second, repeat('7', 64)) ->> 'status' = 'invalid', 'an unknown code is invalid';
END;
$$;
