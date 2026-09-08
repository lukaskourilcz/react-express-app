-- Migration 028: an auditable token wallet, and orders for the merchandise the
-- tokens can be spent on.
-- Apply after migrations 001-027. Safe to re-run.
--
-- Until now tokens lived in the browser: localStorage held the balance, the
-- client awarded and spent it, and the account sync merged by taking the larger
-- of the two numbers. That is fine for a cosmetic ring and completely unfit for
-- anything that costs a real object to fulfil. This migration moves the
-- authority to the server.
--
--   * token_ledger is append-only and keyed by an event id the server issues.
--     Every entry says why it exists and what it belongs to. Replaying an event
--     changes nothing, which is what makes a retry safe.
--   * token_balances is the running total, written only by the ledger routines
--     inside the same transaction as the entry that moved it.
--   * merch_stock, merch_orders and merch_order_items carry the shop. Stock is
--     reserved when an order is created and released exactly once if it is
--     cancelled; a token order debits and reserves atomically or does neither.
--
-- LEGACY BALANCES ARE NOT CONVERTED. The wallets in roadmap_progress.extra were
-- written by browsers and cannot be audited, so this ledger starts every account
-- at zero and earns forward from verified activity. The old numbers stay
-- readable, and the cosmetics already owned stay owned — see
-- docs/rewards-launch.md for why converting them was rejected.
--
-- Nothing here touches user_xp, roadmap_progress, coding_progress or any
-- learning table. A balance buys a picture or a mug; it never buys access.

-- ---------------------------------------------------------------------------
-- 1. The wallet.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_ledger (
  event_id   TEXT PRIMARY KEY CHECK (event_id ~ '^[A-Za-z0-9:_-]{8,128}$'),
  user_id    TEXT NOT NULL,
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  -- Positive credits, negative debits. Stored signed so the sum of the ledger
  -- is the balance, and a disagreement between the two is detectable.
  amount     INTEGER NOT NULL CHECK (amount <> 0 AND amount BETWEEN -100000000 AND 100000000),
  reason     TEXT NOT NULL CHECK (reason IN ('signup', 'verified-xp', 'purchase', 'refund', 'adjustment')),
  -- What the entry belongs to: an award id, an order id. Never free text from
  -- a request.
  reference  TEXT CHECK (reference IS NULL OR reference ~ '^[A-Za-z0-9:_-]{1,128}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS token_ledger_user_idx
  ON public.token_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS token_ledger_reference_idx
  ON public.token_ledger (reference);

CREATE TABLE IF NOT EXISTS public.token_balances (
  user_id    TEXT NOT NULL,
  subject    TEXT NOT NULL CHECK (
    subject IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker')
  ),
  balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0 AND balance <= 100000000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject)
);

-- ---------------------------------------------------------------------------
-- 2. The shop.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merch_stock (
  sku        TEXT NOT NULL CHECK (sku IN ('sticker-set', 'mug', 't-shirt', 'cap')),
  variant    TEXT NOT NULL DEFAULT '' CHECK (LENGTH(variant) <= 16),
  -- Units physically held. Owner-entered; there is no default, because a
  -- default stock figure is an invented one.
  on_hand    INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  -- Units promised to orders that have not shipped or been cancelled.
  reserved   INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sku, variant),
  CHECK (reserved <= on_hand)
);

CREATE TABLE IF NOT EXISTS public.merch_orders (
  order_id        TEXT PRIMARY KEY CHECK (order_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  user_id         TEXT NOT NULL,
  payment_kind    TEXT NOT NULL CHECK (payment_kind IN ('tokens', 'cash')),
  state           TEXT NOT NULL DEFAULT 'awaiting_payment'
                    CHECK (state IN ('awaiting_payment', 'paid', 'submitted', 'shipped', 'cancelled', 'refunded')),
  -- Totals the server computed from its own configuration. A request never
  -- names a price.
  total_minor     INTEGER CHECK (total_minor IS NULL OR total_minor >= 0),
  currency        TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  token_total     INTEGER CHECK (token_total IS NULL OR token_total >= 0),
  -- The minimum needed to post a parcel, and nothing else.
  ship_name       TEXT NOT NULL CHECK (LENGTH(ship_name) BETWEEN 1 AND 120),
  ship_line1      TEXT NOT NULL CHECK (LENGTH(ship_line1) BETWEEN 1 AND 120),
  ship_line2      TEXT CHECK (ship_line2 IS NULL OR LENGTH(ship_line2) <= 120),
  ship_city       TEXT NOT NULL CHECK (LENGTH(ship_city) BETWEEN 1 AND 120),
  ship_postal     TEXT NOT NULL CHECK (LENGTH(ship_postal) BETWEEN 1 AND 120),
  ship_country    TEXT NOT NULL CHECK (ship_country ~ '^[A-Z]{2}$'),
  -- Set by the provider's signed webhook, never by a redirect.
  provider        TEXT CHECK (provider IS NULL OR LENGTH(provider) <= 40),
  provider_ref    TEXT CHECK (provider_ref IS NULL OR LENGTH(provider_ref) <= 200),
  test_mode       BOOLEAN NOT NULL DEFAULT TRUE,
  carrier         TEXT CHECK (carrier IS NULL OR LENGTH(carrier) <= 60),
  tracking_ref    TEXT CHECK (tracking_ref IS NULL OR LENGTH(tracking_ref) <= 120),
  cancelled_at    TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS merch_orders_user_idx ON public.merch_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS merch_orders_state_idx ON public.merch_orders (state, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS merch_orders_provider_ref_idx
  ON public.merch_orders (provider, provider_ref) WHERE provider_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.merch_order_items (
  order_id    TEXT NOT NULL REFERENCES public.merch_orders(order_id) ON DELETE CASCADE,
  sku         TEXT NOT NULL CHECK (sku IN ('sticker-set', 'mug', 't-shirt', 'cap')),
  variant     TEXT NOT NULL DEFAULT '' CHECK (LENGTH(variant) <= 16),
  quantity    INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 5),
  unit_minor  INTEGER CHECK (unit_minor IS NULL OR unit_minor >= 0),
  unit_tokens INTEGER CHECK (unit_tokens IS NULL OR unit_tokens >= 0),
  PRIMARY KEY (order_id, sku, variant)
);

-- The crown and any future cosmetic. Owned once, forever, and never shipped.
CREATE TABLE IF NOT EXISTS public.cosmetic_entitlements (
  user_id     TEXT NOT NULL,
  cosmetic_id TEXT NOT NULL CHECK (cosmetic_id IN ('crown')),
  equipped    BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);

-- ---------------------------------------------------------------------------
-- 3. Row-level security. Owners read their own rows; every write is a
--    service-role routine, so no browser can mint a balance or an entitlement.
--    The ledger itself is readable by its owner: a wallet nobody can audit is
--    the problem this migration exists to fix.
-- ---------------------------------------------------------------------------
ALTER TABLE public.token_ledger           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_balances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_entitlements  ENABLE ROW LEVEL SECURITY;
-- merch_stock is business data, not personal data, and deliberately has no
-- policy: with RLS on and none granted, only the service role sees it.
ALTER TABLE public.merch_stock            ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_ledger_select_own" ON public.token_ledger;
CREATE POLICY "token_ledger_select_own"
  ON public.token_ledger FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "token_balances_select_own" ON public.token_balances;
CREATE POLICY "token_balances_select_own"
  ON public.token_balances FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "merch_orders_select_own" ON public.merch_orders;
CREATE POLICY "merch_orders_select_own"
  ON public.merch_orders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

DROP POLICY IF EXISTS "merch_order_items_select_own" ON public.merch_order_items;
CREATE POLICY "merch_order_items_select_own"
  ON public.merch_order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.merch_orders o
     WHERE o.order_id = merch_order_items.order_id
       AND o.user_id = (SELECT auth.uid()::TEXT)
  ));

DROP POLICY IF EXISTS "cosmetic_entitlements_select_own" ON public.cosmetic_entitlements;
CREATE POLICY "cosmetic_entitlements_select_own"
  ON public.cosmetic_entitlements FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

GRANT SELECT ON public.token_ledger          TO authenticated;
GRANT SELECT ON public.token_balances        TO authenticated;
GRANT SELECT ON public.merch_orders          TO authenticated;
GRANT SELECT ON public.merch_order_items     TO authenticated;
GRANT SELECT ON public.cosmetic_entitlements TO authenticated;
REVOKE ALL ON public.merch_stock FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Wallet routines.
-- ---------------------------------------------------------------------------

-- Credit tokens against a server-issued event id. Replaying the same event is a
-- no-op and returns FALSE, which is what makes every retry path safe.
CREATE OR REPLACE FUNCTION public.credit_tokens(
  p_user_id   TEXT,
  p_event_id  TEXT,
  p_subject   TEXT,
  p_amount    INTEGER,
  p_reason    TEXT,
  p_reference TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_applied INTEGER;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid_token_amount'; END IF;
  INSERT INTO public.token_ledger (event_id, user_id, subject, amount, reason, reference)
  VALUES (p_event_id, p_user_id, p_subject, p_amount, p_reason, p_reference)
  ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  IF v_applied = 0 THEN RETURN FALSE; END IF;

  INSERT INTO public.token_balances (user_id, subject, balance)
  VALUES (p_user_id, p_subject, p_amount)
  ON CONFLICT (user_id, subject) DO UPDATE
    SET balance = LEAST(100000000, public.token_balances.balance + p_amount),
        updated_at = NOW();
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_tokens(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_tokens(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;

-- Debit tokens, atomically. The row is locked before the balance is read, so
-- two concurrent spends cannot both see the same funds.
CREATE OR REPLACE FUNCTION public.debit_tokens(
  p_user_id   TEXT,
  p_event_id  TEXT,
  p_subject   TEXT,
  p_amount    INTEGER,
  p_reason    TEXT,
  p_reference TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance INTEGER;
  v_applied INTEGER;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid_token_amount'; END IF;
  -- A replayed debit is not a second charge.
  PERFORM 1 FROM public.token_ledger WHERE event_id = p_event_id;
  IF FOUND THEN RETURN FALSE; END IF;

  SELECT balance INTO v_balance
    FROM public.token_balances
   WHERE user_id = p_user_id AND subject = p_subject
   FOR UPDATE;
  IF NOT FOUND OR v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_tokens';
  END IF;

  INSERT INTO public.token_ledger (event_id, user_id, subject, amount, reason, reference)
  VALUES (p_event_id, p_user_id, p_subject, -p_amount, p_reason, p_reference)
  ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  IF v_applied = 0 THEN RETURN FALSE; END IF;

  UPDATE public.token_balances
     SET balance = balance - p_amount, updated_at = NOW()
   WHERE user_id = p_user_id AND subject = p_subject;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.debit_tokens(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_tokens(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;

-- The one-time sign-up grant. The event id is derived from the account, so a
-- second call from any device is the same event and grants nothing.
CREATE OR REPLACE FUNCTION public.grant_signup_tokens(
  p_user_id TEXT,
  p_subject TEXT,
  p_amount  INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.credit_tokens(p_user_id, 'signup:' || p_user_id, p_subject, p_amount, 'signup', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_signup_tokens(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_signup_tokens(TEXT, TEXT, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Order routines.
-- ---------------------------------------------------------------------------

-- Create an order, reserving stock for every line. A token order is paid here,
-- inside the same transaction: the debit, the reservation and the row either
-- all happen or none do. A cash order is created awaiting payment, and the
-- reservation holds until it is paid or cancelled.
CREATE OR REPLACE FUNCTION public.create_merch_order(
  p_order_id     TEXT,
  p_user_id      TEXT,
  p_payment_kind TEXT,
  p_items        JSONB,
  p_total_minor  INTEGER,
  p_currency     TEXT,
  p_token_total  INTEGER,
  p_subject      TEXT,
  p_ship         JSONB,
  p_test_mode    BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item     JSONB;
  v_sku      TEXT;
  v_variant  TEXT;
  v_quantity INTEGER;
  v_free     INTEGER;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 10 THEN
    RAISE EXCEPTION 'invalid_order_items';
  END IF;

  -- Already created: return it rather than charging again. This is what makes
  -- a retried submit safe.
  PERFORM 1 FROM public.merch_orders WHERE order_id = p_order_id;
  IF FOUND THEN RETURN 'replayed'; END IF;

  INSERT INTO public.merch_orders (
    order_id, user_id, payment_kind, state, total_minor, currency, token_total,
    ship_name, ship_line1, ship_line2, ship_city, ship_postal, ship_country, test_mode
  ) VALUES (
    p_order_id, p_user_id, p_payment_kind,
    CASE WHEN p_payment_kind = 'tokens' THEN 'paid' ELSE 'awaiting_payment' END,
    p_total_minor, p_currency, p_token_total,
    p_ship ->> 'name', p_ship ->> 'line1', p_ship ->> 'line2',
    p_ship ->> 'city', p_ship ->> 'postalCode', p_ship ->> 'country',
    COALESCE(p_test_mode, TRUE)
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_sku := v_item ->> 'sku';
    v_variant := COALESCE(v_item ->> 'variant', '');
    v_quantity := COALESCE((v_item ->> 'quantity')::INTEGER, 0);
    IF v_quantity < 1 OR v_quantity > 5 THEN RAISE EXCEPTION 'invalid_order_quantity'; END IF;

    SELECT on_hand - reserved INTO v_free
      FROM public.merch_stock
     WHERE sku = v_sku AND variant = v_variant
     FOR UPDATE;
    IF NOT FOUND OR v_free < v_quantity THEN RAISE EXCEPTION 'out_of_stock'; END IF;

    UPDATE public.merch_stock
       SET reserved = reserved + v_quantity, updated_at = NOW()
     WHERE sku = v_sku AND variant = v_variant;

    INSERT INTO public.merch_order_items (order_id, sku, variant, quantity, unit_minor, unit_tokens)
    VALUES (
      p_order_id, v_sku, v_variant, v_quantity,
      (v_item ->> 'unitMinor')::INTEGER, (v_item ->> 'unitTokens')::INTEGER
    );
  END LOOP;

  IF p_payment_kind = 'tokens' THEN
    IF p_token_total IS NULL OR p_token_total <= 0 THEN RAISE EXCEPTION 'invalid_token_total'; END IF;
    PERFORM public.debit_tokens(
      p_user_id, 'order:' || p_order_id, p_subject, p_token_total, 'purchase', p_order_id
    );
  END IF;

  RETURN 'created';
END;
$$;
REVOKE ALL ON FUNCTION public.create_merch_order(TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT, INTEGER, TEXT, JSONB, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_merch_order(TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT, INTEGER, TEXT, JSONB, BOOLEAN)
  TO service_role;

-- Payment, established by a verified webhook. Out-of-order and duplicate events
-- are ordinary: the state only ever moves forward, and a second delivery of the
-- same event finds the order already paid and does nothing.
CREATE OR REPLACE FUNCTION public.mark_merch_order_paid(
  p_order_id     TEXT,
  p_provider     TEXT,
  p_provider_ref TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_state TEXT;
BEGIN
  SELECT state INTO v_state FROM public.merch_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_order'; END IF;
  IF v_state <> 'awaiting_payment' THEN RETURN FALSE; END IF;
  UPDATE public.merch_orders
     SET state = 'paid', provider = p_provider, provider_ref = p_provider_ref, updated_at = NOW()
   WHERE order_id = p_order_id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_merch_order_paid(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_merch_order_paid(TEXT, TEXT, TEXT) TO service_role;

-- Cancel and refund, exactly once. Stock returns to the shelf, a token order is
-- credited back through the ledger, and a cash order is marked refunded for the
-- provider-side refund to reconcile against.
CREATE OR REPLACE FUNCTION public.cancel_merch_order(
  p_order_id TEXT,
  p_user_id  TEXT,
  p_subject  TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order  public.merch_orders%ROWTYPE;
  v_item   RECORD;
BEGIN
  SELECT * INTO v_order FROM public.merch_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_order'; END IF;
  IF p_user_id IS NOT NULL AND v_order.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'order_not_owned';
  END IF;
  IF v_order.state IN ('cancelled', 'refunded') THEN RETURN 'already_cancelled'; END IF;
  IF v_order.state NOT IN ('awaiting_payment', 'paid') THEN RAISE EXCEPTION 'order_not_cancellable'; END IF;

  FOR v_item IN SELECT sku, variant, quantity FROM public.merch_order_items WHERE order_id = p_order_id LOOP
    UPDATE public.merch_stock
       SET reserved = GREATEST(0, reserved - v_item.quantity), updated_at = NOW()
     WHERE sku = v_item.sku AND variant = v_item.variant;
  END LOOP;

  IF v_order.payment_kind = 'tokens' AND v_order.token_total IS NOT NULL AND v_order.token_total > 0 THEN
    PERFORM public.credit_tokens(
      v_order.user_id, 'refund:' || p_order_id, p_subject, v_order.token_total, 'refund', p_order_id
    );
    UPDATE public.merch_orders
       SET state = 'refunded', cancelled_at = NOW(), refunded_at = NOW(), updated_at = NOW()
     WHERE order_id = p_order_id;
    RETURN 'refunded';
  END IF;

  UPDATE public.merch_orders
     SET state = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
   WHERE order_id = p_order_id;
  RETURN 'cancelled';
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_merch_order(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_merch_order(TEXT, TEXT, TEXT) TO service_role;

-- Fulfilment. Submitting hands the order to the supplier; shipping consumes the
-- reservation, because the units have left the building.
CREATE OR REPLACE FUNCTION public.advance_merch_order(
  p_order_id TEXT,
  p_state    TEXT,
  p_carrier  TEXT,
  p_tracking TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.merch_orders%ROWTYPE;
  v_item  RECORD;
BEGIN
  IF p_state NOT IN ('submitted', 'shipped') THEN RAISE EXCEPTION 'invalid_order_state'; END IF;
  SELECT * INTO v_order FROM public.merch_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_order'; END IF;
  IF v_order.state = p_state THEN RETURN FALSE; END IF;
  IF p_state = 'submitted' AND v_order.state <> 'paid' THEN RAISE EXCEPTION 'order_not_paid'; END IF;
  IF p_state = 'shipped' AND v_order.state NOT IN ('paid', 'submitted') THEN RAISE EXCEPTION 'order_not_paid'; END IF;

  IF p_state = 'shipped' THEN
    FOR v_item IN SELECT sku, variant, quantity FROM public.merch_order_items WHERE order_id = p_order_id LOOP
      UPDATE public.merch_stock
         SET on_hand = GREATEST(0, on_hand - v_item.quantity),
             reserved = GREATEST(0, reserved - v_item.quantity),
             updated_at = NOW()
       WHERE sku = v_item.sku AND variant = v_item.variant;
    END LOOP;
  END IF;

  UPDATE public.merch_orders
     SET state = p_state,
         carrier = COALESCE(p_carrier, carrier),
         tracking_ref = COALESCE(p_tracking, tracking_ref),
         updated_at = NOW()
   WHERE order_id = p_order_id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_merch_order(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_merch_order(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Buying the crown: one debit, one entitlement, one transaction. Owning it
-- twice is impossible and paying twice is impossible.
CREATE OR REPLACE FUNCTION public.purchase_cosmetic(
  p_user_id     TEXT,
  p_cosmetic_id TEXT,
  p_subject     TEXT,
  p_price       INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.cosmetic_entitlements
   WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id;
  IF FOUND THEN RETURN FALSE; END IF;

  PERFORM public.debit_tokens(
    p_user_id, 'cosmetic:' || p_cosmetic_id || ':' || p_user_id, p_subject, p_price, 'purchase', p_cosmetic_id
  );
  INSERT INTO public.cosmetic_entitlements (user_id, cosmetic_id)
  VALUES (p_user_id, p_cosmetic_id)
  ON CONFLICT (user_id, cosmetic_id) DO NOTHING;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_cosmetic(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_cosmetic(TEXT, TEXT, TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.equip_cosmetic(
  p_user_id     TEXT,
  p_cosmetic_id TEXT,
  p_equipped    BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.cosmetic_entitlements
     SET equipped = p_equipped
   WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.equip_cosmetic(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.equip_cosmetic(TEXT, TEXT, BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Account deletion. Restated in full, following the convention of 026-027.
--    An order that has shipped keeps its shipping record for as long as the
--    law and the returns window require; deleting the account anonymises the
--    learner from it rather than destroying the commercial record, which is
--    why the address columns are cleared instead of the row.
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
  -- Unshipped orders go entirely; shipped ones lose the person and keep the
  -- transaction, so the books still balance.
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
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(TEXT) TO service_role;
