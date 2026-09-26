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
--     delivery of a processed event changes nothing.
--   * billing_checkout_consents keeps the buyer's acceptance of the terms and
--     of the withdrawal waiver with the Checkout Session id (step D2, #221).
--
-- Section 5 was added by step D2 (#221) before 039 reached production. It is
-- additive: re-running this file on a database that holds the D1 copy adds the
-- consent table, two billing_events columns and the section 5 routines.
--
-- Added by the review of the freemium programme (step FIX), before 039
-- reached production:
--   * entitlement_grants.past_due_since: the grace window runs from the failed
--     renewal, not from the period end. A failed renewal already carries the
--     next period's end, so "period end + 7 days" kept Premium open for the
--     whole unpaid period (finding product-3).
--   * billing_customers.voluntary_refund_at and _subscription: the voluntary
--     14-day refund is taken once per account (finding integrity-2).
--   * billing_cancel_requests: the public cancellation page acts only on a
--     single-use link emailed to the address, or at once for a signed-in owner
--     of that address (finding integrity-1).
--   * entitlement_summary also says whether the account has a billing customer
--     and a live subscription (finding product-10).
--
-- is_premium() is the rule, written once:
--   a manual or promo grant that is active and not past valid_until, or
--   a provider grant that is active or trialing, or
--   a provider grant that is past_due for less than 7 days, counted from the
--   failed renewal (the grace window that covers the provider's retries).
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
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- When the account took the owner's voluntary 14-day refund, and on which
  -- subscription. Set once by claim_voluntary_refund; never cleared.
  voluntary_refund_at           TIMESTAMPTZ,
  voluntary_refund_subscription TEXT CHECK (
    voluntary_refund_subscription IS NULL OR voluntary_refund_subscription ~ '^[A-Za-z0-9_-]{1,128}$')
);
-- Added by step FIX; a database that ran an earlier copy of 039 gains them here.
ALTER TABLE public.billing_customers ADD COLUMN IF NOT EXISTS voluntary_refund_at TIMESTAMPTZ;
ALTER TABLE public.billing_customers ADD COLUMN IF NOT EXISTS voluntary_refund_subscription TEXT CHECK (
  voluntary_refund_subscription IS NULL OR voluntary_refund_subscription ~ '^[A-Za-z0-9_-]{1,128}$');

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
  -- A provider grant that is past_due: when the renewal failed. The grace
  -- window is 7 days from here. NULL in every other status.
  past_due_since           TIMESTAMPTZ,
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
-- Added by step FIX; a database that ran an earlier copy of 039 gains it here.
ALTER TABLE public.entitlement_grants ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;
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
  error        TEXT CHECK (error IS NULL OR LENGTH(error) <= 500),
  -- When a delivery last started work on the event, and how many did. A
  -- delivery that fails part-way leaves processed_at empty, so the provider's
  -- retry can take the event again once the previous attempt's lease is over.
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  attempts     INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 0)
);
-- Added by step D2 (#221); a database that ran an earlier copy of 039 gains them here.
ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 0);
CREATE INDEX IF NOT EXISTS billing_events_unprocessed_idx
  ON public.billing_events (received_at) WHERE processed_at IS NULL;

-- The checkout consent: the terms and the waiver of the 14-day withdrawal
-- right for digital content, as the provider recorded them on the Checkout
-- Session. One row per session; the text is what the buyer saw.
CREATE TABLE IF NOT EXISTS public.billing_checkout_consents (
  session_id               TEXT PRIMARY KEY CHECK (session_id ~ '^[A-Za-z0-9_-]{1,255}$'),
  user_id                  TEXT NOT NULL CHECK (LENGTH(user_id) BETWEEN 1 AND 128),
  provider_subscription_id TEXT CHECK (
                             provider_subscription_id IS NULL OR provider_subscription_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  terms_of_service         TEXT NOT NULL CHECK (terms_of_service IN ('accepted')),
  waiver_text              TEXT NOT NULL CHECK (LENGTH(waiver_text) BETWEEN 1 AND 1200),
  accepted_at              TIMESTAMPTZ NOT NULL,
  recorded_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_checkout_consents_user_idx
  ON public.billing_checkout_consents (user_id);

-- ---------------------------------------------------------------------------
-- 2. Row-level security. An owner reads their own customer link, grants and
--    checkout consents; every write is a service-role routine. billing_events
--    holds provider data, not an account's, and has no policy at all. anon
--    holds nothing.
-- ---------------------------------------------------------------------------
ALTER TABLE public.billing_customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_checkout_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_customers_select_own" ON public.billing_customers;
CREATE POLICY "billing_customers_select_own"
  ON public.billing_customers FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "entitlement_grants_select_own" ON public.entitlement_grants;
CREATE POLICY "entitlement_grants_select_own"
  ON public.entitlement_grants FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "billing_checkout_consents_select_own" ON public.billing_checkout_consents;
CREATE POLICY "billing_checkout_consents_select_own"
  ON public.billing_checkout_consents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- Supabase grants every privilege to anon and authenticated on a new table.
-- RLS filters rows, not TRUNCATE, so revoke first and grant back SELECT only.
REVOKE ALL ON public.billing_customers  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.entitlement_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.billing_events     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.billing_checkout_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.billing_customers  TO authenticated;
GRANT SELECT ON public.entitlement_grants TO authenticated;
GRANT SELECT ON public.billing_checkout_consents TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. The rule.
-- ---------------------------------------------------------------------------

-- Whether one grant opens Premium now. Private: only the three readers below
-- call it, so the rule cannot be evaluated two different ways.
--
-- The grace of a past_due subscription runs from the failed renewal
-- (past_due_since). The provider opens the next period when it creates the
-- renewal invoice, so a failed renewal already carries the next period's end,
-- and counting from that end would keep Premium open for the whole unpaid
-- period. An earlier draft of this routine took four arguments and counted
-- from the period end; it is dropped so no reader can resolve to it.
DROP FUNCTION IF EXISTS public.entitlement_grant_live(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.entitlement_grant_live(
  p_source             TEXT,
  p_status             TEXT,
  p_valid_until        TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_past_due_since     TIMESTAMPTZ
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
          AND p_past_due_since IS NOT NULL
          AND p_past_due_since + INTERVAL '7 days' > NOW())
    ELSE FALSE
  END;
$$;
REVOKE ALL ON FUNCTION public.entitlement_grant_live(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_grant_live(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

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
       AND public.entitlement_grant_live(g.source, g.status, g.valid_until, g.current_period_end, g.past_due_since)
  );
$$;
REVOKE ALL ON FUNCTION public.is_premium(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(TEXT) TO service_role;

-- What the plan line on the Profile needs: the live grant that lasts longest,
-- or premium = false. A provider grant outranks a manual one of equal length,
-- because it is the one the learner manages. Whatever wins, two facts about
-- billing ride along (finding product-10): whether the account has a billing
-- customer, so Manage billing and its invoices stay reachable under a longer
-- complimentary grant and after a subscription ended, and whether a
-- subscription is live, so /premium offers Manage billing instead of a second
-- checkout that the server would refuse.
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
         AND public.entitlement_grant_live(g.source, g.status, g.valid_until, g.current_period_end, g.past_due_since))
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
--
-- p_past_due_since is when the unpaid period began, as the caller read it from
-- the subscription; NOW() when the caller does not know. The first value seen
-- while the grant is past_due stands, so a later retry or a second failed
-- period never moves the grace window forward. Any other status clears it.
-- An earlier draft took seven arguments; it is dropped so a call cannot
-- resolve to it.
DROP FUNCTION IF EXISTS public.upsert_provider_entitlement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, TEXT);
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

-- Record a provider event before acting on it. TRUE means this delivery
-- should process it: the event is new, or an earlier delivery took it and
-- failed before finishing, and that attempt's 60-second lease is over. FALSE
-- means it was processed already (or is being processed right now), and the
-- caller stops.
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
  IF v_applied > 0 THEN RETURN TRUE; END IF;

  UPDATE public.billing_events
     SET attempted_at = NOW(), attempts = attempts + 1
   WHERE id = p_event_id
     AND processed_at IS NULL
     AND (attempted_at IS NULL OR attempted_at < NOW() - INTERVAL '60 seconds');
  RETURN FOUND;
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
  DELETE FROM public.billing_checkout_consents WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_entitlement_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_entitlement_data(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Billing (step D2, #221). What the Stripe routes in lib/billing/ need
--    beyond the writers above. All service-role only.
-- ---------------------------------------------------------------------------

-- A delivery that failed part-way hands the event back: the error is kept for
-- the operator, and the provider's next retry may take it at once.
CREATE OR REPLACE FUNCTION public.release_billing_event(
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
     SET attempted_at = NULL, error = LEFT(p_error, 500)
   WHERE id = p_event_id AND processed_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.release_billing_event(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_billing_event(TEXT, TEXT) TO service_role;

-- What checkout and the portal need to know about an account: its provider
-- customer, and whether a provider grant is live (a second subscription would
-- charge twice, so checkout sends that account to the portal instead).
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
         AND public.entitlement_grant_live(g.source, g.status, g.valid_until, g.current_period_end, g.past_due_since)
    )
  );
$$;
REVOKE ALL ON FUNCTION public.billing_account(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_account(TEXT) TO service_role;

-- The account a provider customer belongs to, or NULL.
CREATE OR REPLACE FUNCTION public.billing_customer_owner(p_provider_customer_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.user_id FROM public.billing_customers c WHERE c.provider_customer_id = p_provider_customer_id;
$$;
REVOKE ALL ON FUNCTION public.billing_customer_owner(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_customer_owner(TEXT) TO service_role;

-- Keep the buyer's acceptance of the terms and the waiver with the session id.
-- Idempotent: the webhook and the success page may both record one session,
-- and the first record stands. A session recorded for another account is
-- refused.
CREATE OR REPLACE FUNCTION public.record_checkout_consent(
  p_session_id      TEXT,
  p_user_id         TEXT,
  p_subscription_id TEXT,
  p_waiver_text     TEXT,
  p_accepted_at     TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner TEXT;
BEGIN
  SELECT user_id INTO v_owner FROM public.billing_checkout_consents WHERE session_id = p_session_id;
  IF FOUND AND v_owner <> p_user_id THEN
    RAISE EXCEPTION 'checkout_consent_conflict';
  END IF;
  INSERT INTO public.billing_checkout_consents AS c (
    session_id, user_id, provider_subscription_id, terms_of_service, waiver_text, accepted_at
  )
  VALUES (p_session_id, p_user_id, p_subscription_id, 'accepted', p_waiver_text, COALESCE(p_accepted_at, NOW()))
  ON CONFLICT (session_id) DO UPDATE
    SET provider_subscription_id = COALESCE(c.provider_subscription_id, EXCLUDED.provider_subscription_id);
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.record_checkout_consent(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_checkout_consent(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. The review's billing rules (step FIX). All service-role only.
-- ---------------------------------------------------------------------------

-- The owner's voluntary refund of the first payment is taken once per account
-- (finding integrity-2). TRUE when this subscription may take it: the account
-- has not taken it, or took it for this same subscription (a withdrawal that
-- failed part-way and is tried again). Taking it records the subscription.
-- FALSE when another subscription took it, or when the account has no billing
-- customer link. The row lock of the UPDATE makes two withdrawals at once take
-- it at most once.
CREATE OR REPLACE FUNCTION public.claim_voluntary_refund(
  p_user_id         TEXT,
  p_subscription_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_id IS NULL OR p_subscription_id IS NULL OR p_subscription_id !~ '^[A-Za-z0-9_-]{1,128}$' THEN
    RAISE EXCEPTION 'invalid_refund_claim';
  END IF;
  UPDATE public.billing_customers
     SET voluntary_refund_at = COALESCE(voluntary_refund_at, NOW()),
         voluntary_refund_subscription = COALESCE(voluntary_refund_subscription, p_subscription_id)
   WHERE user_id = p_user_id
     AND (voluntary_refund_subscription IS NULL OR voluntary_refund_subscription = p_subscription_id);
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_voluntary_refund(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_voluntary_refund(TEXT, TEXT) TO service_role;

-- The public cancellation page acts on an address only after the person who
-- typed it opened a single-use link sent to that address (finding
-- integrity-1). A row is one request: the hash of the link's token, the
-- address as typed, the action and when it was asked for. The token itself is
-- never stored. The table holds no account id, and rows are purged a day after
-- they expire, whether or not the link was used.
CREATE TABLE IF NOT EXISTS public.billing_cancel_requests (
  token_hash   TEXT PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  email        TEXT NOT NULL CHECK (LENGTH(email) BETWEEN 3 AND 254),
  action       TEXT NOT NULL CHECK (action IN ('cancel', 'withdraw')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS billing_cancel_requests_email_idx
  ON public.billing_cancel_requests (LOWER(email), requested_at DESC);
ALTER TABLE public.billing_cancel_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_cancel_requests FROM PUBLIC, anon, authenticated;

-- Record a request. FALSE, and nothing recorded, when the address already had
-- p_max_per_hour requests in the last hour: the caller then sends no email but
-- answers exactly as it would otherwise, so the page cannot be used to flood
-- someone's inbox. p_requested_at is the time the server showed the person,
-- kept so the receipt names the same minute; a value more than five minutes
-- from now is replaced by now.
CREATE OR REPLACE FUNCTION public.create_billing_cancel_request(
  p_token_hash   TEXT,
  p_email        TEXT,
  p_action       TEXT,
  p_ttl_minutes  INTEGER DEFAULT 60,
  p_max_per_hour INTEGER DEFAULT 3,
  p_requested_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recent INTEGER;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR
     p_email IS NULL OR LENGTH(p_email) NOT BETWEEN 3 AND 254 OR
     p_action NOT IN ('cancel', 'withdraw') OR
     p_ttl_minutes IS NULL OR p_ttl_minutes NOT BETWEEN 5 AND 1440 OR
     p_max_per_hour IS NULL OR p_max_per_hour NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'invalid_cancel_request';
  END IF;
  -- One address at a time, so two requests at once cannot both pass the count.
  PERFORM pg_advisory_xact_lock(hashtextextended('billing-cancel:' || LOWER(p_email), 0));
  DELETE FROM public.billing_cancel_requests WHERE expires_at < NOW() - INTERVAL '1 day';
  SELECT COUNT(*) INTO v_recent
    FROM public.billing_cancel_requests
   WHERE LOWER(email) = LOWER(p_email)
     AND requested_at > NOW() - INTERVAL '1 hour';
  IF v_recent >= p_max_per_hour THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.billing_cancel_requests (token_hash, email, action, requested_at, expires_at)
  VALUES (
    p_token_hash, p_email, p_action,
    CASE WHEN p_requested_at BETWEEN NOW() - INTERVAL '5 minutes' AND NOW() + INTERVAL '5 minutes'
         THEN p_requested_at ELSE NOW() END,
    NOW() + make_interval(mins => p_ttl_minutes)
  );
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.create_billing_cancel_request(TEXT, TEXT, TEXT, INTEGER, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_billing_cancel_request(TEXT, TEXT, TEXT, INTEGER, INTEGER, TIMESTAMPTZ) TO service_role;

-- What an unused, unexpired link asks for, or NULL. Reading it uses nothing.
CREATE OR REPLACE FUNCTION public.review_billing_cancel_request(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object('email', r.email, 'action', r.action, 'requestedAt', r.requested_at, 'expiresAt', r.expires_at)
    FROM public.billing_cancel_requests r
   WHERE r.token_hash = p_token_hash
     AND r.used_at IS NULL
     AND r.expires_at > NOW();
$$;
REVOKE ALL ON FUNCTION public.review_billing_cancel_request(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_billing_cancel_request(TEXT) TO service_role;

-- Use a link: marks it used and returns what it asks for, or NULL when it is
-- unknown, expired or already used. Two opens at once use it once.
CREATE OR REPLACE FUNCTION public.consume_billing_cancel_request(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.billing_cancel_requests%ROWTYPE;
BEGIN
  UPDATE public.billing_cancel_requests
     SET used_at = NOW()
   WHERE token_hash = p_token_hash
     AND used_at IS NULL
     AND expires_at > NOW()
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('email', v_row.email, 'action', v_row.action, 'requestedAt', v_row.requested_at, 'expiresAt', v_row.expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_billing_cancel_request(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_billing_cancel_request(TEXT) TO service_role;

-- The provider could not be reached after a link was used: hand it back, so
-- the same link works again until it expires.
CREATE OR REPLACE FUNCTION public.release_billing_cancel_request(p_token_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.billing_cancel_requests
     SET used_at = NULL
   WHERE token_hash = p_token_hash
     AND used_at IS NOT NULL
     AND expires_at > NOW();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.release_billing_cancel_request(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_billing_cancel_request(TEXT) TO service_role;
