-- Checkout's guard (billing_account.providerLive) and the browser's Manage
-- billing switch (entitlement_summary.subscriptionLive) follow what Stripe can
-- still charge, not whether Premium is open (BILL-2, migration 053): a
-- subscription that is past_due beyond the 7-day grace, unpaid or paused
-- opens no Premium but blocks a second checkout. A subscription that ended,
-- never started or was revoked blocks nothing, and neither does a manual grant.

INSERT INTO auth.users (id)
SELECT ('bbbbbbbb-0000-4000-8000-0000000161' || lpad(n::TEXT, 2, '0'))::UUID FROM generate_series(1, 12) AS n;

SET LOCAL ROLE service_role;

DO $$
DECLARE
  -- status, when the renewal failed (past_due only), whether it can still charge, whether it opens Premium
  v_cases CONSTANT JSONB := '[
    {"status": "active",             "live": true,  "premium": true},
    {"status": "trialing",           "live": true,  "premium": true},
    {"status": "past_due", "days": 2, "live": true,  "premium": true},
    {"status": "past_due", "days": 8, "live": true,  "premium": false},
    {"status": "unpaid",             "live": true,  "premium": false},
    {"status": "paused",             "live": true,  "premium": false},
    {"status": "canceled",           "live": false, "premium": false},
    {"status": "incomplete",         "live": false, "premium": false},
    {"status": "incomplete_expired", "live": false, "premium": false},
    {"status": "revoked",            "live": false, "premium": false}
  ]';
  v_case    JSONB;
  v_n       INTEGER := 0;
  v_user    TEXT;
  v_sub     TEXT;
  v_account JSONB;
  v_summary JSONB;
BEGIN
  FOR v_case IN SELECT * FROM jsonb_array_elements(v_cases) LOOP
    v_n := v_n + 1;
    v_user := 'bbbbbbbb-0000-4000-8000-0000000161' || lpad(v_n::TEXT, 2, '0');
    v_sub := 'sub_live161_' || v_n;
    PERFORM public.link_billing_customer(v_user, 'cus_live161_' || v_n);
    PERFORM public.upsert_provider_entitlement(
      v_user, v_sub, v_case ->> 'status', 'price_m', NOW() + INTERVAL '20 days', FALSE, NULL,
      CASE WHEN v_case ? 'days' THEN NOW() - make_interval(days => (v_case ->> 'days')::INTEGER) END);
    v_account := public.billing_account(v_user);
    v_summary := public.entitlement_summary(v_user);
    ASSERT v_account ->> 'customerId' = 'cus_live161_' || v_n, format('%s: the customer is linked', v_case);
    ASSERT (v_account ->> 'providerLive')::BOOLEAN = (v_case ->> 'live')::BOOLEAN,
      format('%s: checkout guard providerLive = %s', v_case, v_account ->> 'providerLive');
    ASSERT (v_summary ->> 'subscriptionLive')::BOOLEAN = (v_case ->> 'live')::BOOLEAN,
      format('%s: subscriptionLive = %s', v_case, v_summary ->> 'subscriptionLive');
    -- Premium itself keeps its own rule.
    ASSERT public.is_premium(v_user) = (v_case ->> 'premium')::BOOLEAN, format('%s: is_premium', v_case);
    ASSERT (v_summary ->> 'premium')::BOOLEAN = (v_case ->> 'premium')::BOOLEAN, format('%s: the plan line', v_case);
    ASSERT (v_summary ->> 'billingAccount')::BOOLEAN, format('%s: billingAccount', v_case);
  END LOOP;

  -- billing_account names the subscriptions that can still charge.
  v_n := 0;
  FOR v_case IN SELECT * FROM jsonb_array_elements(v_cases) LOOP
    v_n := v_n + 1;
    v_account := public.billing_account('bbbbbbbb-0000-4000-8000-0000000161' || lpad(v_n::TEXT, 2, '0'));
    ASSERT (v_account -> 'liveSubscriptionIds') IS NOT DISTINCT FROM
             CASE WHEN (v_case ->> 'live')::BOOLEAN THEN jsonb_build_array('sub_live161_' || v_n) ELSE '[]'::JSONB END,
      format('%s: liveSubscriptionIds = %s', v_case, v_account -> 'liveSubscriptionIds');
  END LOOP;

  -- A manual grant opens Premium and blocks no checkout; an account without a
  -- customer has none to report.
  v_user := 'bbbbbbbb-0000-4000-8000-000000016111';
  PERFORM public.grant_manual_entitlement(v_user, NULL, 'complimentary');
  v_account := public.billing_account(v_user);
  ASSERT v_account ->> 'customerId' IS NULL, format('no customer: %s', v_account);
  ASSERT (v_account ->> 'providerLive')::BOOLEAN = FALSE, 'a manual grant is no subscription';
  ASSERT v_account -> 'liveSubscriptionIds' = '[]'::JSONB;
  ASSERT (public.entitlement_summary(v_user) ->> 'subscriptionLive')::BOOLEAN = FALSE;
  ASSERT public.is_premium(v_user);

  -- Two subscriptions that can both charge are both listed, oldest first, so
  -- the webhook can warn about the second.
  v_user := 'bbbbbbbb-0000-4000-8000-000000016112';
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_live161_first', 'unpaid', 'price_m', NOW() + INTERVAL '20 days', FALSE);
  UPDATE public.entitlement_grants SET created_at = NOW() - INTERVAL '40 days' WHERE provider_subscription_id = 'sub_live161_first';
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_live161_second', 'active', 'price_m', NOW() + INTERVAL '30 days', FALSE);
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_live161_ended', 'canceled', 'price_m', NOW() - INTERVAL '1 day', FALSE);
  v_account := public.billing_account(v_user);
  ASSERT v_account -> 'liveSubscriptionIds' = '["sub_live161_first", "sub_live161_second"]'::JSONB,
    format('both live subscriptions, oldest first: %s', v_account -> 'liveSubscriptionIds');
END;
$$;
