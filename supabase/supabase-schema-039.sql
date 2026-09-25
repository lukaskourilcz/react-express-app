-- Migration 039: entitlements for the free tier and Premium.
-- Apply after migrations 001-038. Safe to re-run.
--
-- devShark became freemium on 2026-09-25 (SECOND-HANDOFF-25-9-2026.md, section
-- 2.2). shared/tiers.ts says what the free tier includes; this migration stores
-- who holds Premium and answers one question for the server: is this account
-- Premium right now?
--
--   * billing_customers links an account to its payment-provider customer.
--   * entitlement_grants holds every grant, whatever its source. A provider
--     grant mirrors a subscription and is keyed by its id, so the webhook can
--     upsert it in any order. A manual grant is how an admin opens Premium by
--     hand (and how Premium is tested before billing exists); a promo grant is
--     the same thing issued by a campaign. The webhook never touches either.
--   * billing_events records every provider event id once, so a repeated
--     delivery changes nothing.
--
-- is_premium() is the rule, written once:
--   a manual or promo grant that is active and not past valid_until, or
--   a provider grant that is active or trialing, or
--   a provider grant that is past_due while current_period_end + 7 days is
--   still ahead (the grace window that covers the provider's retries).
--
-- Premium changes which content a learner may start and nothing else. No
-- routine here reads or writes a learning, score or streak table; the launch
-- contract greps this file for them.

-- ---------------------------------------------------------------------------
-- 1. Tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id              TEXT PRIMARY KEY CHECK (LENGTH(user_id) BETWEEN 1 AND 128),
  provider             TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe')),
  provider_customer_id TEXT NOT NULL UNIQUE CHECK (provider_customer_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.entitlement_grants (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  TEXT NOT NULL CHECK (LENGTH(user_id) BETWEEN 1 AND 128),
  source                   TEXT NOT NULL CHECK (source IN ('provider', 'manual', 'promo')),
  plan                     TEXT NOT NULL DEFAULT 'premium' CHECK (plan IN ('premium')),
  -- The provider's subscription status mirrored as-is, or active | revoked for
  -- a manual or promo grant. A provider grant may also be revoked (a full
  -- refund or a dispute), and a revoked provider grant stays revoked.
  status                   TEXT NOT NULL CHECK (status IN (
                             'active', 'trialing', 'past_due', 'canceled', 'unpaid',
                             'incomplete', 'incomplete_expired', 'paused', 'revoked')),
  provider_subscription_id TEXT UNIQUE CHECK (
                             provider_subscription_id IS NULL OR provider_subscription_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  provider_price_id        TEXT CHECK (provider_price_id IS NULL OR provider_price_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Manual and promo grants; NULL means open-ended.
  valid_until              TIMESTAMPTZ,
  -- Who granted it and why. The account owner can read it, so write it for them.
  note                     TEXT CHECK (note IS NULL OR LENGTH(note) <= 500),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A provider grant is a subscription; a manual or promo grant never is.
  CHECK ((source = 'provider') = (provider_subscription_id IS NOT NULL)),
  CHECK (source = 'provider' OR status IN ('active', 'revoked'))
);
CREATE INDEX IF NOT EXISTS entitlement_grants_user_idx
  ON public.entitlement_grants (user_id, updated_at DESC);
-- At most one active manual grant per account; granting again extends it.
CREATE UNIQUE INDEX IF NOT EXISTS entitlement_grants_one_active_manual_idx
  ON public.entitlement_grants (user_id) WHERE source = 'manual' AND status = 'active';

CREATE TABLE IF NOT EXISTS public.billing_events (
  id           TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,128}$'),  -- the provider's event id
  type         TEXT NOT NULL CHECK (LENGTH(type) BETWEEN 1 AND 100),
  object_id    TEXT CHECK (object_id IS NULL OR LENGTH(object_id) <= 128),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error        TEXT CHECK (error IS NULL OR LENGTH(error) <= 500)
);
CREATE INDEX IF NOT EXISTS billing_events_unprocessed_idx
  ON public.billing_events (received_at) WHERE processed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Row-level security. An owner reads their own customer link and grants;
--    every write is a service-role routine. billing_events holds provider
--    data, not an account's, and has no policy at all. anon holds nothing.
-- ---------------------------------------------------------------------------
ALTER TABLE public.billing_customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_customers_select_own" ON public.billing_customers;
CREATE POLICY "billing_customers_select_own"
  ON public.billing_customers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "entitlement_grants_select_own" ON public.entitlement_grants;
CREATE POLICY "entitlement_grants_select_own"
  ON public.entitlement_grants FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- Supabase grants every privilege to anon and authenticated on a new table.
-- RLS filters rows, not TRUNCATE, so revoke first and grant back SELECT only.
REVOKE ALL ON public.billing_customers  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.entitlement_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.billing_events     FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.billing_customers  TO authenticated;
GRANT SELECT ON public.entitlement_grants TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. The rule.
-- ---------------------------------------------------------------------------

-- Whether one grant opens Premium now. Private: only the two readers below
-- call it, so the rule cannot be evaluated two different ways.
CREATE OR REPLACE FUNCTION public.entitlement_grant_live(
  p_source             TEXT,
  p_status             TEXT,
  p_valid_until        TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_source IN ('manual', 'promo') THEN
      p_status = 'active' AND (p_valid_until IS NULL OR p_valid_until > NOW())
    WHEN p_source = 'provider' THEN
      p_status IN ('active', 'trialing')
      OR (p_status = 'past_due'
          AND p_current_period_end IS NOT NULL
          AND p_current_period_end + INTERVAL '7 days' > NOW())
    ELSE FALSE
  END;
$$;
REVOKE ALL ON FUNCTION public.entitlement_grant_live(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_grant_live(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- The one question the server asks per request.
CREATE OR REPLACE FUNCTION public.is_premium(p_user TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.entitlement_grants g
     WHERE g.user_id = p_user
       AND g.plan = 'premium'
       AND public.entitlement_grant_live(g.source, g.status, g.valid_until, g.current_period_end)
  );
$$;
REVOKE ALL ON FUNCTION public.is_premium(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(TEXT) TO service_role;

-- What the plan line on the Profile needs: the live grant that lasts longest,
-- or premium = false. A provider grant outranks a manual one of equal length,
-- because it is the one the learner manages.
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
        AND public.entitlement_grant_live(g.source, g.status, g.valid_until, g.current_period_end)
      ORDER BY
        CASE WHEN g.source = 'provider' THEN g.current_period_end ELSE g.valid_until END DESC NULLS FIRST,
        (g.source = 'provider') DESC,
        g.updated_at DESC
      LIMIT 1),
    jsonb_build_object('premium', FALSE)
  );
$$;
REVOKE ALL ON FUNCTION public.entitlement_summary(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_summary(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Writers. All service-role only.
-- ---------------------------------------------------------------------------

-- Link an account to its provider customer. Idempotent for the same pair;
-- a customer already linked to another account is refused.
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

-- Mirror a subscription. Keyed by the subscription id, so events that arrive
-- out of order converge on the live object the caller fetched. A grant that was
-- revoked (full refund, dispute) stays revoked whatever status arrives later.
CREATE OR REPLACE FUNCTION public.upsert_provider_entitlement(
  p_user_id              TEXT,
  p_subscription_id      TEXT,
  p_status               TEXT,
  p_price_id             TEXT,
  p_current_period_end   TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN,
  p_note                 TEXT DEFAULT NULL
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
  SELECT user_id INTO v_owner FROM public.entitlement_grants
   WHERE provider_subscription_id = p_subscription_id;
  IF FOUND AND v_owner <> p_user_id THEN
    RAISE EXCEPTION 'subscription_owner_conflict';
  END IF;

  INSERT INTO public.entitlement_grants AS g (
    user_id, source, status, provider_subscription_id, provider_price_id,
    current_period_end, cancel_at_period_end, note
  )
  VALUES (
    p_user_id, 'provider', p_status, p_subscription_id, p_price_id,
    p_current_period_end, COALESCE(p_cancel_at_period_end, FALSE), p_note
  )
  ON CONFLICT (provider_subscription_id) DO UPDATE
    SET status               = CASE WHEN g.status = 'revoked' THEN 'revoked' ELSE EXCLUDED.status END,
        provider_price_id    = EXCLUDED.provider_price_id,
        current_period_end   = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        note                 = COALESCE(EXCLUDED.note, g.note),
        updated_at           = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_provider_entitlement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_provider_entitlement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT) TO service_role;

-- Open Premium by hand. An account holds at most one active manual grant:
-- granting again moves its end and replaces its note instead of stacking rows.
CREATE OR REPLACE FUNCTION public.grant_manual_entitlement(
  p_user_id     TEXT,
  p_valid_until TIMESTAMPTZ,
  p_note        TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id IS NULL OR LENGTH(p_user_id) NOT BETWEEN 1 AND 128 THEN
    RAISE EXCEPTION 'invalid_manual_entitlement';
  END IF;
  IF p_valid_until IS NOT NULL AND p_valid_until <= NOW() THEN
    RAISE EXCEPTION 'manual_entitlement_in_past';
  END IF;
  -- Serialise grants for one account so two admins cannot create two rows.
  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id));

  UPDATE public.entitlement_grants
     SET valid_until = p_valid_until, note = p_note, updated_at = NOW()
   WHERE user_id = p_user_id AND source = 'manual' AND status = 'active'
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.entitlement_grants (user_id, source, status, valid_until, note)
  VALUES (p_user_id, 'manual', 'active', p_valid_until, p_note)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_manual_entitlement(TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_manual_entitlement(TEXT, TIMESTAMPTZ, TEXT) TO service_role;

-- Close an account's active manual grants, or one grant by id. Provider grants
-- are the webhook's and are never touched here. Returns how many closed.
CREATE OR REPLACE FUNCTION public.revoke_manual_entitlement(
  p_user_id  TEXT,
  p_grant_id UUID DEFAULT NULL,
  p_note     TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.entitlement_grants
     SET status = 'revoked', note = COALESCE(p_note, note), updated_at = NOW()
   WHERE user_id = p_user_id
     AND source IN ('manual', 'promo')
     AND status = 'active'
     AND (p_grant_id IS NULL OR id = p_grant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_manual_entitlement(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_manual_entitlement(TEXT, UUID, TEXT) TO service_role;

-- Record a provider event before acting on it. FALSE means it was seen
-- already, and the caller stops.
CREATE OR REPLACE FUNCTION public.record_billing_event(
  p_event_id  TEXT,
  p_type      TEXT,
  p_object_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applied INTEGER;
BEGIN
  INSERT INTO public.billing_events (id, type, object_id)
  VALUES (p_event_id, p_type, p_object_id)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  RETURN v_applied > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.record_billing_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_billing_event(TEXT, TEXT, TEXT) TO service_role;

-- Close a recorded event: processed, or processed with the reason it could
-- not be applied (an account the server cannot resolve, for one).
CREATE OR REPLACE FUNCTION public.finish_billing_event(
  p_event_id TEXT,
  p_error    TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.billing_events
     SET processed_at = NOW(), error = LEFT(p_error, 500)
   WHERE id = p_event_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_billing_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_billing_event(TEXT, TEXT) TO service_role;

-- Account deletion. A separate routine rather than another copy of
-- delete_user_data, so this migration redefines nothing an earlier one owns.
-- The API calls it after delete_user_data. billing_events hold no account id.
CREATE OR REPLACE FUNCTION public.delete_entitlement_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.entitlement_grants WHERE user_id = p_user_id;
  DELETE FROM public.billing_customers WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_entitlement_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entitlement_data(TEXT) TO service_role;
