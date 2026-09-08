-- Migration 029: the auditable reward wallet, the shared order model and the
-- account-owned cosmetic inventory (issues #168, #170, #172, #173).
-- Apply after migrations 001-028. Safe to re-run.
--
-- The wallet is a ledger, not a number. Every credit carries the receipt of the
-- verified event that produced it (a signup grant, or an award already recorded
-- in verified_activity_awards), so the balance can be recomputed at any time and
-- a replayed sync is a no-op. Nothing here reads a browser's idea of a balance:
-- the old device-local wallet is reported to the learner as unverified and is
-- never converted into redeemable value.
--
-- Orders are one model for both payment channels. Stock is reserved when the
-- order is created and released exactly once on a valid cancellation; a token
-- order debits the wallet in the same transaction as the reservation, so a
-- double-click cannot spend twice. Cash orders wait for the payment webhook,
-- which is the only authority for `paid`.
--
-- Rewards never change learning: no XP, no ranks, no access, no leaderboard.

-- ---------------------------------------------------------------------------
-- 1. Wallet.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reward_wallets (
  user_id    TEXT NOT NULL,
  subject    TEXT NOT NULL CHECK (subject ~ '^[a-z][a-z0-9-]{0,31}$'),
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0 AND balance <= 100000000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject)
);

CREATE TABLE IF NOT EXISTS public.reward_ledger (
  entry_id   BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  subject    TEXT NOT NULL CHECK (subject ~ '^[a-z][a-z0-9-]{0,31}$'),
  delta      BIGINT NOT NULL CHECK (delta <> 0),
  reason     TEXT NOT NULL CHECK (reason IN ('signup', 'activity', 'redemption', 'refund', 'adjustment')),
  -- The verified event this entry came from. Unique per wallet, which is what
  -- makes every credit and every debit idempotent.
  receipt_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject, receipt_id)
);

CREATE INDEX IF NOT EXISTS reward_ledger_user_created_idx
  ON public.reward_ledger (user_id, subject, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Cosmetic inventory (issue #173).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reward_inventory (
  user_id     TEXT NOT NULL,
  subject     TEXT NOT NULL CHECK (subject ~ '^[a-z][a-z0-9-]{0,31}$'),
  sku         TEXT NOT NULL CHECK (sku ~ '^[a-z][a-z0-9-]{0,31}$'),
  equipped    BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, sku)
);

-- ---------------------------------------------------------------------------
-- 3. Orders.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reward_orders (
  order_id          TEXT PRIMARY KEY CHECK (order_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  user_id           TEXT NOT NULL,
  subject           TEXT NOT NULL CHECK (subject ~ '^[a-z][a-z0-9-]{0,31}$'),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','fulfilling','shipped','delivered','cancelled','refunded')),
  payment           TEXT NOT NULL CHECK (payment IN ('tokens','cash')),
  currency          TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  total_cash_minor  BIGINT CHECK (total_cash_minor IS NULL OR total_cash_minor >= 0),
  total_tokens      BIGINT CHECK (total_tokens IS NULL OR total_tokens >= 0),
  lines             JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- The minimum shipping detail needed to deliver a parcel. Owner and admin
  -- read it; it is never written to a log or an analytics event.
  address           JSONB,
  idempotency_key   TEXT NOT NULL,
  provider          TEXT,
  provider_ref      TEXT,
  tracking_carrier  TEXT,
  tracking_code     TEXT,
  stock_released    BOOLEAN NOT NULL DEFAULT FALSE,
  refunded_at       TIMESTAMPTZ,
  dispatched_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS reward_orders_user_created_idx
  ON public.reward_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_orders_status_idx
  ON public.reward_orders (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reward_orders_provider_ref_idx
  ON public.reward_orders (provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- Stock is server-owned. A row exists only for a SKU the owner has stocked.
CREATE TABLE IF NOT EXISTS public.reward_stock (
  sku        TEXT PRIMARY KEY CHECK (sku ~ '^[a-z][a-z0-9-]{0,31}$'),
  on_hand    INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved   INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every state change, for the audit trail. Addresses never appear here.
CREATE TABLE IF NOT EXISTS public.reward_order_events (
  event_id   BIGSERIAL PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES public.reward_orders(order_id) ON DELETE CASCADE,
  from_status TEXT,
  to_status  TEXT NOT NULL,
  actor      TEXT NOT NULL CHECK (actor IN ('learner','admin','provider','system')),
  note       TEXT CHECK (note IS NULL OR char_length(note) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reward_order_events_order_idx
  ON public.reward_order_events (order_id, created_at);

-- ---------------------------------------------------------------------------
-- 4. Row-level security: a learner reads their own rows; the service writes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.reward_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reward_wallets, public.reward_ledger, public.reward_inventory,
  public.reward_orders, public.reward_order_events, public.reward_stock
  FROM anon, authenticated;

DROP POLICY IF EXISTS "reward_wallets_select_own" ON public.reward_wallets;
CREATE POLICY "reward_wallets_select_own"
  ON public.reward_wallets FOR SELECT USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "reward_ledger_select_own" ON public.reward_ledger;
CREATE POLICY "reward_ledger_select_own"
  ON public.reward_ledger FOR SELECT USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "reward_inventory_select_own" ON public.reward_inventory;
CREATE POLICY "reward_inventory_select_own"
  ON public.reward_inventory FOR SELECT USING (user_id = auth.uid()::text);
DROP POLICY IF EXISTS "reward_orders_select_own" ON public.reward_orders;
CREATE POLICY "reward_orders_select_own"
  ON public.reward_orders FOR SELECT USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 5. Wallet functions.
-- ---------------------------------------------------------------------------
-- Recompute the wallet from verified evidence. Idempotent: every entry is keyed
-- by the receipt of the event that produced it, so a second call adds nothing.
-- The one registration grant is `signup`, and each verified activity award is
-- worth TOKENS_PER_XP of its XP, floored.
CREATE OR REPLACE FUNCTION public.sync_reward_wallet(
  p_user_id  TEXT,
  p_subject  TEXT,
  p_grant    INTEGER DEFAULT 200,
  p_xp_ratio NUMERIC DEFAULT 0.1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_added BIGINT := 0;
  v_balance BIGINT := 0;
BEGIN
  IF p_grant < 0 OR p_grant > 10000 OR p_xp_ratio <= 0 OR p_xp_ratio > 1 THEN
    RAISE EXCEPTION 'invalid_wallet_parameters';
  END IF;

  INSERT INTO public.reward_wallets (user_id, subject) VALUES (p_user_id, p_subject)
  ON CONFLICT (user_id, subject) DO NOTHING;
  PERFORM 1 FROM public.reward_wallets
   WHERE user_id = p_user_id AND subject = p_subject FOR UPDATE;

  -- One grant per account and subject.
  INSERT INTO public.reward_ledger (user_id, subject, delta, reason, receipt_id)
  VALUES (p_user_id, p_subject, p_grant, 'signup', 'signup:' || p_subject)
  ON CONFLICT (user_id, subject, receipt_id) DO NOTHING;

  -- Every verified award not yet credited, at the declared ratio.
  INSERT INTO public.reward_ledger (user_id, subject, delta, reason, receipt_id)
  SELECT a.user_id, a.subject, FLOOR(a.xp * p_xp_ratio)::BIGINT, 'activity', 'xp:' || a.award_id
    FROM public.verified_activity_awards a
   WHERE a.user_id = p_user_id
     AND a.subject = p_subject
     AND FLOOR(a.xp * p_xp_ratio) >= 1
  ON CONFLICT (user_id, subject, receipt_id) DO NOTHING;

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
    FROM public.reward_ledger WHERE user_id = p_user_id AND subject = p_subject;
  IF v_balance < 0 THEN v_balance := 0; END IF;
  IF v_balance > 100000000 THEN v_balance := 100000000; END IF;

  SELECT v_balance - balance INTO v_added FROM public.reward_wallets
   WHERE user_id = p_user_id AND subject = p_subject;

  UPDATE public.reward_wallets
     SET balance = v_balance, updated_at = NOW()
   WHERE user_id = p_user_id AND subject = p_subject;

  RETURN jsonb_build_object('balance', v_balance, 'added', COALESCE(v_added, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.sync_reward_wallet(TEXT, TEXT, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_reward_wallet(TEXT, TEXT, INTEGER, NUMERIC) TO service_role;

-- A debit or a credit with an explicit receipt. Refuses to go negative, and a
-- repeat of the same receipt returns the balance without changing it.
CREATE OR REPLACE FUNCTION public.move_reward_tokens(
  p_user_id    TEXT,
  p_subject    TEXT,
  p_delta      BIGINT,
  p_reason     TEXT,
  p_receipt_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance BIGINT := 0;
  v_applied BOOLEAN := FALSE;
  v_rows INTEGER := 0;
BEGIN
  IF p_delta = 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_reason NOT IN ('signup','activity','redemption','refund','adjustment') THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;

  INSERT INTO public.reward_wallets (user_id, subject) VALUES (p_user_id, p_subject)
  ON CONFLICT (user_id, subject) DO NOTHING;
  SELECT balance INTO v_balance FROM public.reward_wallets
   WHERE user_id = p_user_id AND subject = p_subject FOR UPDATE;

  IF p_delta < 0 AND v_balance + p_delta < 0 THEN
    RETURN jsonb_build_object('applied', FALSE, 'balance', v_balance, 'error', 'insufficient_funds');
  END IF;

  INSERT INTO public.reward_ledger (user_id, subject, delta, reason, receipt_id)
  VALUES (p_user_id, p_subject, p_delta, p_reason, p_receipt_id)
  ON CONFLICT (user_id, subject, receipt_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_applied := v_rows > 0;

  IF v_applied THEN
    v_balance := v_balance + p_delta;
    UPDATE public.reward_wallets SET balance = v_balance, updated_at = NOW()
     WHERE user_id = p_user_id AND subject = p_subject;
  END IF;

  RETURN jsonb_build_object('applied', v_applied, 'balance', v_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.move_reward_tokens(TEXT, TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.move_reward_tokens(TEXT, TEXT, BIGINT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Placing an order: reserve stock and, for tokens, debit — atomically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_reward_order(
  p_order_id        TEXT,
  p_user_id         TEXT,
  p_subject         TEXT,
  p_payment         TEXT,
  p_sku             TEXT,
  p_quantity        INTEGER,
  p_currency        TEXT,
  p_total_cash_minor BIGINT,
  p_total_tokens    BIGINT,
  p_lines           JSONB,
  p_address         JSONB,
  p_idempotency_key TEXT,
  p_physical        BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.reward_orders%ROWTYPE;
  v_available INTEGER := 0;
  v_move JSONB;
BEGIN
  IF p_quantity < 1 OR p_quantity > 3 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  -- The API refuses an unpriced item before it gets here; this is the backstop,
  -- so an unconfigured price can never become a free order.
  IF p_payment = 'tokens' AND (p_total_tokens IS NULL OR p_total_tokens <= 0) THEN
    RAISE EXCEPTION 'invalid_total';
  END IF;
  IF p_payment = 'cash' AND (p_total_cash_minor IS NULL OR p_total_cash_minor <= 0 OR p_currency IS NULL) THEN
    RAISE EXCEPTION 'invalid_total';
  END IF;

  -- A retry with the same key returns the order it already made.
  SELECT * INTO v_existing FROM public.reward_orders
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('orderId', v_existing.order_id, 'status', v_existing.status, 'created', FALSE);
  END IF;

  IF p_physical THEN
    SELECT on_hand - reserved INTO v_available FROM public.reward_stock
     WHERE sku = p_sku FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'no_stock_configured');
    END IF;
    IF v_available < p_quantity THEN
      RETURN jsonb_build_object('error', 'out_of_stock', 'available', GREATEST(v_available, 0));
    END IF;
    UPDATE public.reward_stock SET reserved = reserved + p_quantity, updated_at = NOW()
     WHERE sku = p_sku;
  END IF;

  IF p_payment = 'tokens' THEN
    v_move := public.move_reward_tokens(p_user_id, p_subject, -p_total_tokens, 'redemption', 'order:' || p_order_id);
    IF (v_move->>'applied')::BOOLEAN IS NOT TRUE THEN
      IF p_physical THEN
        UPDATE public.reward_stock SET reserved = GREATEST(0, reserved - p_quantity), updated_at = NOW()
         WHERE sku = p_sku;
      END IF;
      RETURN jsonb_build_object('error', COALESCE(v_move->>'error', 'insufficient_funds'));
    END IF;
  END IF;

  INSERT INTO public.reward_orders (
    order_id, user_id, subject, status, payment, currency,
    total_cash_minor, total_tokens, lines, address, idempotency_key
  ) VALUES (
    p_order_id, p_user_id, p_subject,
    CASE WHEN p_payment = 'tokens' THEN 'paid' ELSE 'pending' END,
    p_payment, p_currency, p_total_cash_minor, p_total_tokens, p_lines, p_address, p_idempotency_key
  );

  INSERT INTO public.reward_order_events (order_id, from_status, to_status, actor)
  VALUES (p_order_id, NULL, CASE WHEN p_payment = 'tokens' THEN 'paid' ELSE 'pending' END, 'learner');

  RETURN jsonb_build_object(
    'orderId', p_order_id,
    'status', CASE WHEN p_payment = 'tokens' THEN 'paid' ELSE 'pending' END,
    'created', TRUE
  );
END;
$$;
REVOKE ALL ON FUNCTION public.place_reward_order(
  TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, BIGINT, BIGINT, JSONB, JSONB, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_reward_order(
  TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, BIGINT, BIGINT, JSONB, JSONB, TEXT, BOOLEAN
) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. Moving an order on: one transition, exactly once.
-- ---------------------------------------------------------------------------
-- Releases stock and refunds tokens exactly once, whichever way the order ends.
CREATE OR REPLACE FUNCTION public.advance_reward_order(
  p_order_id   TEXT,
  p_to_status  TEXT,
  p_actor      TEXT,
  p_note       TEXT DEFAULT NULL,
  p_provider   TEXT DEFAULT NULL,
  p_provider_ref TEXT DEFAULT NULL,
  p_carrier    TEXT DEFAULT NULL,
  p_tracking   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.reward_orders%ROWTYPE;
  v_allowed TEXT[];
  v_quantity INTEGER := 0;
  v_sku TEXT;
BEGIN
  SELECT * INTO v_order FROM public.reward_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_order.status = p_to_status THEN
    -- Already there: a replayed webhook or a double click changes nothing.
    RETURN jsonb_build_object('status', v_order.status, 'applied', FALSE);
  END IF;

  v_allowed := CASE v_order.status
    WHEN 'pending' THEN ARRAY['paid','cancelled']
    WHEN 'paid' THEN ARRAY['fulfilling','cancelled','refunded']
    WHEN 'fulfilling' THEN ARRAY['shipped','cancelled','refunded']
    WHEN 'shipped' THEN ARRAY['delivered','refunded']
    WHEN 'delivered' THEN ARRAY['refunded']
    ELSE ARRAY[]::TEXT[]
  END;
  IF NOT (p_to_status = ANY (v_allowed)) THEN
    RETURN jsonb_build_object('error', 'invalid_transition', 'status', v_order.status);
  END IF;

  SELECT (line->>'sku'), COALESCE((line->>'quantity')::INTEGER, 0)
    INTO v_sku, v_quantity
    FROM jsonb_array_elements(v_order.lines) AS line LIMIT 1;

  -- Stock goes back exactly once, and only for an order that reserved it.
  IF p_to_status IN ('cancelled','refunded') AND NOT v_order.stock_released THEN
    UPDATE public.reward_stock
       SET reserved = GREATEST(0, reserved - v_quantity), updated_at = NOW()
     WHERE sku = v_sku;
    UPDATE public.reward_orders SET stock_released = TRUE WHERE order_id = p_order_id;
  END IF;

  -- Tokens go back through the wallet they came from, once, keyed by the order.
  IF p_to_status IN ('cancelled','refunded') AND v_order.payment = 'tokens'
     AND COALESCE(v_order.total_tokens, 0) > 0 THEN
    PERFORM public.move_reward_tokens(
      v_order.user_id, v_order.subject, v_order.total_tokens, 'refund', 'refund:' || p_order_id
    );
  END IF;

  -- Shipped consumes the reservation: the parcel has left.
  IF p_to_status = 'shipped' AND NOT v_order.stock_released THEN
    UPDATE public.reward_stock
       SET on_hand = GREATEST(0, on_hand - v_quantity),
           reserved = GREATEST(0, reserved - v_quantity),
           updated_at = NOW()
     WHERE sku = v_sku;
    UPDATE public.reward_orders SET stock_released = TRUE WHERE order_id = p_order_id;
  END IF;

  UPDATE public.reward_orders
     SET status = p_to_status,
         provider = COALESCE(p_provider, provider),
         provider_ref = COALESCE(p_provider_ref, provider_ref),
         tracking_carrier = COALESCE(p_carrier, tracking_carrier),
         tracking_code = COALESCE(p_tracking, tracking_code),
         refunded_at = CASE WHEN p_to_status = 'refunded' THEN NOW() ELSE refunded_at END,
         dispatched_at = CASE WHEN p_to_status = 'shipped' THEN NOW() ELSE dispatched_at END,
         updated_at = NOW()
   WHERE order_id = p_order_id;

  INSERT INTO public.reward_order_events (order_id, from_status, to_status, actor, note)
  VALUES (p_order_id, v_order.status, p_to_status, p_actor, p_note);

  RETURN jsonb_build_object('status', p_to_status, 'applied', TRUE);
END;
$$;
REVOKE ALL ON FUNCTION public.advance_reward_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_reward_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Cosmetic entitlement (issue #173).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_reward_cosmetic(
  p_user_id TEXT,
  p_subject TEXT,
  p_sku     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.reward_inventory (user_id, subject, sku)
  VALUES (p_user_id, p_subject, p_sku)
  ON CONFLICT (user_id, subject, sku) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_reward_cosmetic(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_reward_cosmetic(TEXT, TEXT, TEXT) TO service_role;

-- Equip or unequip an owned cosmetic. An unowned sku is refused outright.
CREATE OR REPLACE FUNCTION public.equip_reward_cosmetic(
  p_user_id TEXT,
  p_subject TEXT,
  p_sku     TEXT,
  p_equip   BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owned BOOLEAN := FALSE;
BEGIN
  SELECT TRUE INTO v_owned FROM public.reward_inventory
   WHERE user_id = p_user_id AND subject = p_subject AND sku = p_sku;
  IF NOT COALESCE(v_owned, FALSE) THEN
    RETURN jsonb_build_object('applied', FALSE, 'error', 'not_owned');
  END IF;
  -- One equipped cosmetic at a time, so the avatar cannot stack marks.
  UPDATE public.reward_inventory SET equipped = FALSE
   WHERE user_id = p_user_id AND subject = p_subject AND equipped;
  IF p_equip THEN
    UPDATE public.reward_inventory SET equipped = TRUE
     WHERE user_id = p_user_id AND subject = p_subject AND sku = p_sku;
  END IF;
  RETURN jsonb_build_object('applied', TRUE, 'equipped', p_equip);
END;
$$;
REVOKE ALL ON FUNCTION public.equip_reward_cosmetic(TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.equip_reward_cosmetic(TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------------
-- 9. Account erasure. Orders that are still owed a delivery are kept, with the
--    address cleared, until they are closed; everything else goes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_reward_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.reward_orders
     SET address = NULL, updated_at = NOW()
   WHERE user_id = p_user_id AND status IN ('paid','fulfilling','shipped');
  DELETE FROM public.reward_orders
   WHERE user_id = p_user_id AND status IN ('pending','cancelled','refunded','delivered');
  DELETE FROM public.reward_inventory WHERE user_id = p_user_id;
  DELETE FROM public.reward_ledger WHERE user_id = p_user_id;
  DELETE FROM public.reward_wallets WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_reward_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_reward_data(TEXT) TO service_role;

-- Account erasure runs the reward cleanup too.
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.delete_reward_data(p_user_id);
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
  DELETE FROM public.github_commits WHERE user_id = p_user_id;
  DELETE FROM public.github_connections WHERE user_id = p_user_id;
  DELETE FROM public.practice_sessions WHERE user_id = p_user_id;
  DELETE FROM public.coding_skips WHERE user_id = p_user_id;
  DELETE FROM public.coding_collection_items WHERE user_id = p_user_id;
  DELETE FROM public.coding_collections WHERE user_id = p_user_id;
  DELETE FROM public.coding_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.coding_drafts WHERE user_id = p_user_id;
  DELETE FROM public.coding_attempts WHERE user_id = p_user_id;
  DELETE FROM public.coding_progress WHERE user_id = p_user_id;
  DELETE FROM public.coding_puzzle_results WHERE user_id = p_user_id;
  DELETE FROM public.learner_profiles WHERE user_id = p_user_id;
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
