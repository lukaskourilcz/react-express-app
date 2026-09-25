-- Migration 043: the hoodie, and the monthly stock cap the owner sets from
-- /dev (step D9, #229). Apply after migration 028. Safe to re-run.
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
--
-- No table gains a policy and nothing here reads or writes a learning table.
-- set_merch_stock is SECURITY DEFINER with an empty search_path and executable
-- by service_role only; the admin-only op=fulfilment is its one caller.

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
-- Rollback (manual): DROP FUNCTION public.set_merch_stock(TEXT, TEXT, INTEGER);
-- delete or cancel every 'hoodie' order and stock row, then restore both SKU
-- checks from migration 028.
-- ---------------------------------------------------------------------------
