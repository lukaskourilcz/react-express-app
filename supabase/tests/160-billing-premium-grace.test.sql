-- A provider grant opens Premium while its subscription is active or
-- trialing, and for seven days after a failed renewal, counted from the
-- failure (past_due_since), not from the period end. upsert_provider_entitlement
-- keeps the first failure it sees, clears it once the renewal is paid, keeps a
-- revoked grant revoked, and refuses a subscription that belongs to another
-- account.

-- The accounts exist in Auth, as every account the billing code writes for does.
INSERT INTO auth.users (id) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000160'),
  ('bbbbbbbb-0000-4000-8000-000000000161');

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user  CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000160';
  v_other CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000161';
  v_end   CONSTANT TIMESTAMPTZ := NOW() + INTERVAL '25 days';
  v_first UUID;
  v_again UUID;
  v_since TIMESTAMPTZ;
  v_summary JSONB;
  v_status TEXT;
BEGIN
  ASSERT NOT public.is_premium(v_user), 'no grant, no Premium';

  v_first := public.upsert_provider_entitlement(v_user, 'sub_grace160', 'active', 'price_m', v_end, FALSE);
  ASSERT public.is_premium(v_user), 'an active subscription opens Premium';
  v_summary := public.entitlement_summary(v_user);
  ASSERT v_summary ->> 'source' = 'provider' AND v_summary ->> 'status' = 'active'
     AND (v_summary ->> 'inGrace')::BOOLEAN = FALSE, format('the plan line reads the active grant: %s', v_summary);

  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', 'trialing', 'price_m', v_end, FALSE);
  ASSERT public.is_premium(v_user), 'a trial opens Premium';

  -- A renewal failed three days ago: day 3 of the grace window, although the
  -- provider already moved the period end 25 days ahead.
  v_again := public.upsert_provider_entitlement(v_user, 'sub_grace160', 'past_due', 'price_m', v_end, FALSE, NULL, NOW() - INTERVAL '3 days');
  ASSERT v_again = v_first, 'one row per subscription';
  ASSERT public.is_premium(v_user), 'day 3 of the grace window keeps Premium';
  v_summary := public.entitlement_summary(v_user);
  ASSERT (v_summary ->> 'inGrace')::BOOLEAN, format('the plan line says the payment failed: %s', v_summary);

  -- A later retry reports a later start; the first failure stands.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', 'past_due', 'price_m', v_end, FALSE, NULL, NOW() - INTERVAL '1 day');
  SELECT past_due_since INTO v_since FROM public.entitlement_grants WHERE provider_subscription_id = 'sub_grace160';
  ASSERT v_since::DATE = (NOW() - INTERVAL '3 days')::DATE, format('the first failure stands: %s', v_since);

  -- Paid: the failure is cleared and Premium stays.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', 'active', 'price_m', v_end, FALSE);
  SELECT past_due_since INTO v_since FROM public.entitlement_grants WHERE provider_subscription_id = 'sub_grace160';
  ASSERT v_since IS NULL, 'a paid renewal clears the failure';

  -- A renewal that failed eight days ago: the grace window is over even though
  -- the period runs for 25 more days.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', 'past_due', 'price_m', v_end, FALSE, NULL, NOW() - INTERVAL '8 days');
  ASSERT NOT public.is_premium(v_user), 'day 8: no Premium';
  ASSERT (public.entitlement_summary(v_user) ->> 'premium')::BOOLEAN = FALSE, 'the plan line reads Free on day 8';

  -- An unknown start counts from now.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160b', 'past_due', 'price_m', v_end, FALSE);
  SELECT past_due_since INTO v_since FROM public.entitlement_grants WHERE provider_subscription_id = 'sub_grace160b';
  ASSERT v_since IS NOT NULL AND v_since >= NOW() - INTERVAL '1 minute', format('an unknown start is now: %s', v_since);
  ASSERT public.is_premium(v_user), 'a failure just now is inside the window';
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160b', 'canceled', 'price_m', v_end, FALSE);

  -- None of the other states opens Premium.
  FOREACH v_status IN ARRAY ARRAY['canceled', 'unpaid', 'paused', 'incomplete', 'incomplete_expired'] LOOP
    PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', v_status, 'price_m', v_end, FALSE);
    ASSERT NOT public.is_premium(v_user), format('%s does not open Premium', v_status);
  END LOOP;

  -- A revoked grant (refund, dispute, withdrawal) stays revoked whatever the
  -- provider says later, and keeps its note.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', 'revoked', 'price_m', NOW(), FALSE, 'Revoked: test refund');
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_grace160', 'active', 'price_m', v_end, FALSE);
  SELECT status INTO v_status FROM public.entitlement_grants WHERE provider_subscription_id = 'sub_grace160';
  ASSERT v_status = 'revoked', format('revoked stays revoked: %s', v_status);
  ASSERT (SELECT note FROM public.entitlement_grants WHERE provider_subscription_id = 'sub_grace160') = 'Revoked: test refund';
  ASSERT NOT public.is_premium(v_user), 'a revoked grant opens nothing';

  -- A subscription is one account's.
  BEGIN
    PERFORM public.upsert_provider_entitlement(v_other, 'sub_grace160', 'active', 'price_m', v_end, FALSE);
    ASSERT FALSE, 'another account cannot take the subscription';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'subscription_owner_conflict', SQLERRM;
  END;
  ASSERT NOT public.is_premium(v_other), 'and gets no Premium from it';
END;
$$;
