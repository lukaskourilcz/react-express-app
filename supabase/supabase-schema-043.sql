-- Migration 043: the hoodie, and the monthly stock cap the owner sets from
-- /dev (step D9, #229). Apply after migrations 028 and 035. Safe to re-run.
--
-- Spreadshop (sprd.net AG) prints and ships devShark merchandise. It has no
-- order API, so a coin redemption stays a merch_orders row and the owner
-- orders the item at base price from the shop preview ("order product
-- samples"), shipped to the learner's address. Nothing here talks to
-- Spreadshop.
--
--   * The SKU checks of merch_stock and merch_order_items gain 'hoodie'. It
--     takes the t-shirt sizes. The old checks are found by their definition
--     rather than by name, so a table whose constraint carries another name is
--     widened too.
--   * merch_stock is a budget, not a shelf: a print-on-demand item has no
--     stock, so on_hand is the number of units of a SKU and size the owner
--     will still post this month. set_merch_stock writes it. It refuses a
--     figure below what paid orders already hold (`reserved`), because those
--     units are promised. Shipping an order uses a unit up, as since 028.
--   * A claimed learning-path package (035) is created awaiting payment at a
--     total of zero and reserves no stock, so the fulfilment routines of 028
--     could neither send it nor account for it. advance_merch_order now treats
--     a claimed package as paid at zero, and neither it nor
--     cancel_merch_order releases a reservation the package never made.
--
-- No table gains a policy and nothing here reads or writes a learning table.
-- Every routine is SECURITY DEFINER with an empty search_path and executable
-- by service_role only; set_merch_stock and advance_merch_order are called by
-- the admin-only op=fulfilment.

-- ---------------------------------------------------------------------------
-- 1. The hoodie joins both SKU checks.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
      FROM pg_constraint c
     WHERE c.conrelid IN ('public.merch_stock'::regclass, 'public.merch_order_items'::regclass)
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) LIKE '%sticker-set%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.merch_stock
  ADD CONSTRAINT merch_stock_sku_check
  CHECK (sku IN ('sticker-set', 'mug', 't-shirt', 'hoodie', 'cap'));
ALTER TABLE public.merch_order_items
  ADD CONSTRAINT merch_order_items_sku_check
  CHECK (sku IN ('sticker-set', 'mug', 't-shirt', 'hoodie', 'cap'));

-- ---------------------------------------------------------------------------
-- 2. The monthly cap.
-- ---------------------------------------------------------------------------
-- Set how many units of one SKU and size the owner will still post. Returns
-- the row as it stands afterwards. A size is required exactly where the
-- catalogue has sizes (t-shirt and hoodie) and refused everywhere else, the
-- same rule the order handler applies to a request.
CREATE OR REPLACE FUNCTION public.set_merch_stock(
  p_sku     TEXT,
  p_variant TEXT,
  p_on_hand INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_variant  TEXT := COALESCE(p_variant, '');
  v_reserved INTEGER;
BEGIN
  IF p_sku IS NULL OR p_sku NOT IN ('sticker-set', 'mug', 't-shirt', 'hoodie', 'cap') THEN
    RAISE EXCEPTION 'unknown_sku';
  END IF;
  IF p_sku IN ('t-shirt', 'hoodie') THEN
    IF v_variant NOT IN ('S', 'M', 'L', 'XL', 'XXL') THEN RAISE EXCEPTION 'invalid_variant'; END IF;
  ELSIF v_variant <> '' THEN
    RAISE EXCEPTION 'invalid_variant';
  END IF;
  IF p_on_hand IS NULL OR p_on_hand < 0 OR p_on_hand > 100000 THEN
    RAISE EXCEPTION 'invalid_stock';
  END IF;

  -- Lock the row so an order cannot reserve between the check and the write.
  SELECT reserved INTO v_reserved
    FROM public.merch_stock
   WHERE sku = p_sku AND variant = v_variant
   FOR UPDATE;
  IF FOUND AND p_on_hand < v_reserved THEN
    RAISE EXCEPTION 'below_reserved';
  END IF;

  INSERT INTO public.merch_stock (sku, variant, on_hand, reserved)
  VALUES (p_sku, v_variant, p_on_hand, 0)
  ON CONFLICT (sku, variant) DO UPDATE
    SET on_hand = EXCLUDED.on_hand, updated_at = NOW();

  RETURN (
    SELECT jsonb_build_object('sku', s.sku, 'variant', s.variant, 'onHand', s.on_hand, 'reserved', s.reserved)
      FROM public.merch_stock s
     WHERE s.sku = p_sku AND s.variant = v_variant
  );
END;
$$;
REVOKE ALL ON FUNCTION public.set_merch_stock(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_merch_stock(TEXT, TEXT, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. The learning-path package goes through fulfilment like a redemption.
-- ---------------------------------------------------------------------------
-- Restated from 028. Unchanged for every order except a claimed package: it
-- may be handed to the supplier and shipped from 'awaiting_payment', because
-- nothing is owed on it, and shipping it uses the month's budget without
-- touching `reserved`, which only redemptions and cash orders fill. When the
-- budget is already promised to paid orders, the package does not push
-- on_hand below them.
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
  v_order  public.merch_orders%ROWTYPE;
  v_item   RECORD;
  v_reward BOOLEAN;
  v_payable TEXT[];
BEGIN
  IF p_state NOT IN ('submitted', 'shipped') THEN RAISE EXCEPTION 'invalid_order_state'; END IF;
  SELECT * INTO v_order FROM public.merch_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_order'; END IF;
  IF v_order.state = p_state THEN RETURN FALSE; END IF;

  v_reward := EXISTS (SELECT 1 FROM public.path_reward_claims c WHERE c.order_id = p_order_id);
  v_payable := CASE WHEN p_state = 'submitted' THEN ARRAY['paid'] ELSE ARRAY['paid', 'submitted'] END;
  IF v_reward THEN v_payable := array_append(v_payable, 'awaiting_payment'); END IF;
  IF NOT (v_order.state = ANY (v_payable)) THEN RAISE EXCEPTION 'order_not_paid'; END IF;

  IF p_state = 'shipped' THEN
    FOR v_item IN SELECT sku, variant, quantity FROM public.merch_order_items WHERE order_id = p_order_id LOOP
      IF v_reward THEN
        UPDATE public.merch_stock
           SET on_hand = GREATEST(reserved, on_hand - v_item.quantity), updated_at = NOW()
         WHERE sku = v_item.sku AND variant = v_item.variant;
      ELSE
        UPDATE public.merch_stock
           SET on_hand = GREATEST(0, on_hand - v_item.quantity),
               reserved = GREATEST(0, reserved - v_item.quantity),
               updated_at = NOW()
         WHERE sku = v_item.sku AND variant = v_item.variant;
      END IF;
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

-- Restated from 028. Unchanged except that cancelling a claimed package
-- releases no reservation, because the claim made none.
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

  IF NOT EXISTS (SELECT 1 FROM public.path_reward_claims c WHERE c.order_id = p_order_id) THEN
    FOR v_item IN SELECT sku, variant, quantity FROM public.merch_order_items WHERE order_id = p_order_id LOOP
      UPDATE public.merch_stock
         SET reserved = GREATEST(0, reserved - v_item.quantity), updated_at = NOW()
       WHERE sku = v_item.sku AND variant = v_item.variant;
    END LOOP;
  END IF;

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

-- ---------------------------------------------------------------------------
-- Rollback (manual): DROP FUNCTION public.set_merch_stock(TEXT, TEXT, INTEGER);
-- restate advance_merch_order and cancel_merch_order from migration 028; delete
-- or cancel every 'hoodie' order and stock row, then restore both SKU checks
-- from migration 028.
-- ---------------------------------------------------------------------------
