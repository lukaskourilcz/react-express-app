-- Migration 053: billing follows the subscription while it can still charge,
-- and writes nothing for an account that no longer exists.
-- Apply after migrations 001-052. Safe to re-run. Every routine keeps its
-- signature, so the code already in production keeps working.
--
-- Round 3 of the launch audit found two gaps in migration 039:
--
--   * BILL-2. billing_account.providerLive (checkout's "already subscribed"
--     guard) and entitlement_summary.subscriptionLive (the browser's "Manage
--     billing" switch) used the Premium rule. A subscription that is past_due
--     for more than the 7-day grace, unpaid or paused no longer opens Premium,
--     but Stripe can still charge it; checkout then started a second
--     subscription on the same customer. Both flags now mean: a provider
--     grant whose status is active, trialing, past_due, unpaid or paused,
--     the states in which a subscription may still charge
--     (LIVE_SUBSCRIPTION_STATUSES in lib/billing/sync.ts). is_premium() and
--     the plan line keep the Premium rule; only these two flags change.
--     billing_account also lists those subscriptions (liveSubscriptionIds), so
--     the webhook can warn when an account holds two.
--   * PROF-4. Deleting an account cancels its subscription at Stripe first, and
--     the webhook that follows could write billing_customers and
--     entitlement_grants rows after delete_user_data had run.
--     link_billing_customer and upsert_provider_entitlement now refuse an id
--     with no auth.users row ('unknown_account'); the API also erases once
--     more after the sign-in identity is gone.
--
-- Nothing here reads or writes a learning, score or streak table.

-- ---------------------------------------------------------------------------
-- 1. Whether an id names an existing account. Private to the billing writers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.billing_account_exists(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Account ids are Supabase Auth user ids. Checked before the cast, so any
  -- other text answers FALSE instead of raising.
  IF p_user_id IS NULL OR p_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id::UUID);
END;
$$;
REVOKE ALL ON FUNCTION public.billing_account_exists(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_account_exists(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. The two writers refuse an account that does not exist (PROF-4).
--    Otherwise as migration 039 wrote them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_billing_customer(
  p_user_id              TEXT,
  p_provider_customer_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
BEGIN
  IF NOT public.billing_account_exists(p_user_id) THEN
    RAISE EXCEPTION 'unknown_account';
  END IF;
  SELECT user_id INTO v_owner FROM public.billing_customers
   WHERE provider_customer_id = p_provider_customer_id;
  IF FOUND AND v_owner <> p_user_id THEN
    RAISE EXCEPTION 'billing_customer_conflict';
  END IF;
  INSERT INTO public.billing_customers (user_id, provider_customer_id)
  VALUES (p_user_id, p_provider_customer_id)
  ON CONFLICT (user_id) DO UPDATE
    SET provider_customer_id = EXCLUDED.provider_customer_id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.link_billing_customer(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_billing_customer(TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_provider_entitlement(
  p_user_id              TEXT,
  p_subscription_id      TEXT,
  p_status               TEXT,
  p_price_id             TEXT,
  p_current_period_end   TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN,
  p_note                 TEXT DEFAULT NULL,
  p_past_due_since       TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id    UUID;
  v_owner TEXT;
BEGIN
  IF p_subscription_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_provider_entitlement';
  END IF;
  IF NOT public.billing_account_exists(p_user_id) THEN
    RAISE EXCEPTION 'unknown_account';
  END IF;
  SELECT user_id INTO v_owner FROM public.entitlement_grants
   WHERE provider_subscription_id = p_subscription_id;
  IF FOUND AND v_owner <> p_user_id THEN
    RAISE EXCEPTION 'subscription_owner_conflict';
  END IF;

  INSERT INTO public.entitlement_grants AS g (
    user_id, source, status, provider_subscription_id, provider_price_id,
    current_period_end, cancel_at_period_end, note, past_due_since
  )
  VALUES (
    p_user_id, 'provider', p_status, p_subscription_id, p_price_id,
    p_current_period_end, COALESCE(p_cancel_at_period_end, FALSE), p_note,
    CASE WHEN p_status = 'past_due' THEN COALESCE(p_past_due_since, NOW()) END
  )
  ON CONFLICT (provider_subscription_id) DO UPDATE
    SET status               = CASE WHEN g.status = 'revoked' THEN 'revoked' ELSE EXCLUDED.status END,
        provider_price_id    = EXCLUDED.provider_price_id,
        current_period_end   = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        note                 = COALESCE(EXCLUDED.note, g.note),
        past_due_since       = CASE
                                 WHEN g.status = 'revoked' OR EXCLUDED.status <> 'past_due' THEN NULL
                                 WHEN g.status = 'past_due' AND g.past_due_since IS NOT NULL THEN g.past_due_since
                                 ELSE EXCLUDED.past_due_since
                               END,
        updated_at           = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_provider_entitlement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_provider_entitlement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT, TIMESTAMPTZ) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. The live-subscription flags follow what Stripe can still charge (BILL-2).
-- ---------------------------------------------------------------------------

-- What checkout and the portal need to know about an account: its provider
-- customer, whether a subscription of it can still charge (checkout then
-- sends the account to the portal instead of starting a second one), and
-- which subscriptions those are.
CREATE OR REPLACE FUNCTION public.billing_account(p_user_id TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'customerId', (SELECT c.provider_customer_id FROM public.billing_customers c WHERE c.user_id = p_user_id),
    'providerLive', EXISTS (
      SELECT 1 FROM public.entitlement_grants g
       WHERE g.user_id = p_user_id
         AND g.source = 'provider'
         AND g.status IN ('active', 'trialing', 'past_due', 'unpaid', 'paused')
    ),
    'liveSubscriptionIds', COALESCE((
      SELECT jsonb_agg(g.provider_subscription_id ORDER BY g.created_at)
        FROM public.entitlement_grants g
       WHERE g.user_id = p_user_id
         AND g.source = 'provider'
         AND g.status IN ('active', 'trialing', 'past_due', 'unpaid', 'paused')
    ), '[]'::JSONB)
  );
$$;
REVOKE ALL ON FUNCTION public.billing_account(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_account(TEXT) TO service_role;

-- What the plan line on the Profile needs: the live grant that lasts longest,
-- or premium = false, as 039 wrote it. subscriptionLive now says whether a
-- subscription can still charge, so /premium offers Manage billing instead of
-- a second checkout also after the grace window of a failed renewal, and for
-- an unpaid or paused subscription.
CREATE OR REPLACE FUNCTION public.entitlement_summary(p_user TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
              'premium', TRUE,
              'source', g.source,
              'status', g.status,
              'currentPeriodEnd', g.current_period_end,
              'cancelAtPeriodEnd', g.cancel_at_period_end,
              'validUntil', g.valid_until,
              'inGrace', g.source = 'provider' AND g.status = 'past_due')
       FROM public.entitlement_grants g
      WHERE g.user_id = p_user
        AND g.plan = 'premium'
        AND public.entitlement_grant_live(g.source, g.status, g.valid_until, g.current_period_end, g.past_due_since)
      ORDER BY
        CASE WHEN g.source = 'provider' THEN g.current_period_end ELSE g.valid_until END DESC NULLS FIRST,
        (g.source = 'provider') DESC,
        g.updated_at DESC
      LIMIT 1),
    jsonb_build_object('premium', FALSE)
  ) || jsonb_build_object(
    'billingAccount', EXISTS (SELECT 1 FROM public.billing_customers c WHERE c.user_id = p_user),
    'subscriptionLive', EXISTS (
      SELECT 1 FROM public.entitlement_grants g
       WHERE g.user_id = p_user
         AND g.source = 'provider'
         AND g.status IN ('active', 'trialing', 'past_due', 'unpaid', 'paused'))
  );
$$;
REVOKE ALL ON FUNCTION public.entitlement_summary(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_summary(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Rollback (manual): restate link_billing_customer, upsert_provider_entitlement,
-- billing_account and entitlement_summary from migration 039, then
-- DROP FUNCTION public.billing_account_exists(TEXT).
-- ---------------------------------------------------------------------------
