-- Integration checks for the reward wallet, orders and cosmetics
-- (issues #168, #170, #172, #173). Run against a database with migrations
-- 001-029 applied:
--   psql -v ON_ERROR_STOP=1 -d <db> -f scripts/sql/test-rewards.sql
--
-- Every check raises on failure, so a non-zero exit is a real regression.
\set ON_ERROR_STOP on
SET client_min_messages = notice;

DO $$
DECLARE
  u  TEXT := 'user-wallet-1';
  v  TEXT := 'user-wallet-2';
  r  JSONB;
  n  BIGINT;
BEGIN
  DELETE FROM public.reward_ledger WHERE user_id IN (u, v);
  DELETE FROM public.reward_wallets WHERE user_id IN (u, v);
  DELETE FROM public.verified_activity_awards WHERE user_id IN (u, v);

  -- 1. The registration grant lands once, and only once.
  r := public.sync_reward_wallet(u, 'webdev', 200, 0.1);
  ASSERT (r->>'balance')::BIGINT = 200, 'the registration grant must be credited';
  r := public.sync_reward_wallet(u, 'webdev', 200, 0.1);
  ASSERT (r->>'balance')::BIGINT = 200, 'a replayed sync must add nothing';
  SELECT COUNT(*) INTO n FROM public.reward_ledger WHERE user_id = u AND reason = 'signup';
  ASSERT n = 1, 'exactly one signup entry';

  -- 2. Verified awards become tokens at the declared ratio, once each.
  INSERT INTO public.verified_activity_awards (award_id, user_id, subject, xp)
  VALUES ('a1', u, 'webdev', 100), ('a2', u, 'webdev', 55), ('a3', u, 'webdev', 5);
  r := public.sync_reward_wallet(u, 'webdev', 200, 0.1);
  -- 200 + floor(10) + floor(5.5) + floor(0.5 -> 0, below one token and skipped)
  ASSERT (r->>'balance')::BIGINT = 215, format('expected 215, got %s', r->>'balance');
  r := public.sync_reward_wallet(u, 'webdev', 200, 0.1);
  ASSERT (r->>'balance')::BIGINT = 215, 'a second sync must be a no-op';

  -- 3. Another account's awards never reach this wallet.
  INSERT INTO public.verified_activity_awards (award_id, user_id, subject, xp) VALUES ('b1', v, 'webdev', 900);
  r := public.sync_reward_wallet(u, 'webdev', 200, 0.1);
  ASSERT (r->>'balance')::BIGINT = 215, 'wallets are per account';

  -- 4. A wallet cannot go negative, and a repeated receipt cannot double-spend.
  r := public.move_reward_tokens(u, 'webdev', -1000, 'redemption', 'order:too-big');
  ASSERT (r->>'applied')::BOOLEAN IS FALSE, 'an overdraft must be refused';
  ASSERT (r->>'error') = 'insufficient_funds', 'and say why';
  r := public.move_reward_tokens(u, 'webdev', -15, 'redemption', 'order:x');
  ASSERT (r->>'balance')::BIGINT = 200, 'a debit lowers the balance';
  r := public.move_reward_tokens(u, 'webdev', -15, 'redemption', 'order:x');
  ASSERT (r->>'applied')::BOOLEAN IS FALSE, 'the same receipt must not debit twice';
  ASSERT (r->>'balance')::BIGINT = 200, 'and must not change the balance';

  -- 5. The balance always equals the ledger.
  SELECT SUM(delta) INTO n FROM public.reward_ledger WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 200, format('ledger sum %s must equal the balance', n);
  RAISE NOTICE 'wallet: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-order-1';
  r JSONB;
  n BIGINT;
  v_units INTEGER;
BEGIN
  DELETE FROM public.reward_order_events WHERE order_id LIKE 'ord-%';
  DELETE FROM public.reward_orders WHERE user_id = u;
  DELETE FROM public.reward_ledger WHERE user_id = u;
  DELETE FROM public.reward_wallets WHERE user_id = u;
  DELETE FROM public.reward_inventory WHERE user_id = u;
  DELETE FROM public.reward_stock WHERE sku IN ('mug', 'cap');

  PERFORM public.move_reward_tokens(u, 'webdev', 1000, 'adjustment', 'test:seed');
  INSERT INTO public.reward_stock (sku, on_hand, reserved) VALUES ('mug', 2, 0);

  -- 1. A physical order reserves stock and debits in one step.
  r := public.place_reward_order('ord-aaaaaaaa', u, 'webdev', 'tokens', 'mug', 1, 'CZK', NULL, 300,
    '[{"sku":"mug","variantId":null,"quantity":1,"unitCashMinor":null,"unitTokens":300}]'::jsonb,
    '{"name":"A","line1":"B","city":"C","postcode":"D","country":"CZ"}'::jsonb, 'key-1', TRUE);
  ASSERT (r->>'created')::BOOLEAN, 'the order is created';
  ASSERT (r->>'status') = 'paid', 'a token order is paid on placement';
  SELECT reserved INTO v_units FROM public.reward_stock WHERE sku = 'mug';
  ASSERT v_units = 1, format('one unit reserved, got %s', v_units);
  SELECT balance INTO n FROM public.reward_wallets WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 700, format('300 debited, got balance %s', n);

  -- 2. A retry with the same idempotency key returns the first order.
  r := public.place_reward_order('ord-bbbbbbbb', u, 'webdev', 'tokens', 'mug', 1, 'CZK', NULL, 300,
    '[{"sku":"mug","variantId":null,"quantity":1,"unitCashMinor":null,"unitTokens":300}]'::jsonb,
    '{"name":"A","line1":"B","city":"C","postcode":"D","country":"CZ"}'::jsonb, 'key-1', TRUE);
  ASSERT (r->>'created')::BOOLEAN IS FALSE, 'a retry creates nothing';
  ASSERT (r->>'orderId') = 'ord-aaaaaaaa', 'a retry returns the first order';
  SELECT balance INTO n FROM public.reward_wallets WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 700, 'a retry must not debit again';

  -- 3. Stock runs out honestly, and the failed attempt refunds nothing it did
  --    not take: the second unit is reserved, the third is refused.
  r := public.place_reward_order('ord-cccccccc', u, 'webdev', 'tokens', 'mug', 1, 'CZK', NULL, 300,
    '[{"sku":"mug","variantId":null,"quantity":1,"unitCashMinor":null,"unitTokens":300}]'::jsonb,
    '{"name":"A","line1":"B","city":"C","postcode":"D","country":"CZ"}'::jsonb, 'key-2', TRUE);
  ASSERT (r->>'created')::BOOLEAN, 'the second unit is available';
  r := public.place_reward_order('ord-dddddddd', u, 'webdev', 'tokens', 'mug', 1, 'CZK', NULL, 300,
    '[{"sku":"mug","variantId":null,"quantity":1,"unitCashMinor":null,"unitTokens":300}]'::jsonb,
    '{"name":"A","line1":"B","city":"C","postcode":"D","country":"CZ"}'::jsonb, 'key-3', TRUE);
  ASSERT (r->>'error') = 'out_of_stock', 'the third is refused';
  SELECT balance INTO n FROM public.reward_wallets WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 400, format('only two debits, got balance %s', n);

  -- 4. Insufficient funds releases the reservation it just took.
  INSERT INTO public.reward_stock (sku, on_hand, reserved) VALUES ('cap', 5, 0);
  r := public.place_reward_order('ord-eeeeeeee', u, 'webdev', 'tokens', 'cap', 1, 'CZK', NULL, 99999,
    '[{"sku":"cap","variantId":null,"quantity":1,"unitCashMinor":null,"unitTokens":99999}]'::jsonb,
    '{"name":"A","line1":"B","city":"C","postcode":"D","country":"CZ"}'::jsonb, 'key-4', TRUE);
  ASSERT (r->>'error') = 'insufficient_funds', 'an unaffordable order is refused';
  SELECT reserved INTO v_units FROM public.reward_stock WHERE sku = 'cap';
  ASSERT v_units = 0, format('the reservation must be released, got %s', v_units);

  -- 5. Cancelling refunds the tokens and returns the stock, exactly once.
  r := public.advance_reward_order('ord-aaaaaaaa', 'cancelled', 'learner', NULL);
  ASSERT (r->>'applied')::BOOLEAN, 'the cancellation applies';
  SELECT balance INTO n FROM public.reward_wallets WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 700, format('300 refunded, got %s', n);
  SELECT reserved INTO v_units FROM public.reward_stock WHERE sku = 'mug';
  ASSERT v_units = 1, format('one reservation left, got %s', v_units);
  r := public.advance_reward_order('ord-aaaaaaaa', 'cancelled', 'learner', NULL);
  ASSERT (r->>'applied')::BOOLEAN IS FALSE, 'a repeated cancellation changes nothing';
  SELECT balance INTO n FROM public.reward_wallets WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 700, 'and must not refund twice';

  -- 6. The transition table is enforced.
  r := public.advance_reward_order('ord-cccccccc', 'delivered', 'admin', NULL);
  ASSERT (r->>'error') = 'invalid_transition', 'a paid order cannot jump to delivered';
  r := public.advance_reward_order('ord-cccccccc', 'fulfilling', 'admin', NULL);
  ASSERT (r->>'applied')::BOOLEAN, 'paid to fulfilling is allowed';
  r := public.advance_reward_order('ord-cccccccc', 'shipped', 'admin', NULL, NULL, NULL, 'carrier', 'TRACK123');
  ASSERT (r->>'applied')::BOOLEAN, 'fulfilling to shipped is allowed';
  SELECT on_hand INTO v_units FROM public.reward_stock WHERE sku = 'mug';
  ASSERT v_units = 1, format('shipping consumes a unit, on_hand %s', v_units);
  r := public.advance_reward_order('ord-cccccccc', 'cancelled', 'learner', NULL);
  ASSERT (r->>'error') = 'invalid_transition', 'a shipped order cannot be cancelled';

  -- 7. Refunding a shipped order returns the tokens once and does not double
  --    release the stock it already consumed.
  r := public.advance_reward_order('ord-cccccccc', 'refunded', 'admin', NULL);
  ASSERT (r->>'applied')::BOOLEAN, 'a shipped order can be refunded';
  SELECT balance INTO n FROM public.reward_wallets WHERE user_id = u AND subject = 'webdev';
  ASSERT n = 1000, format('the second 300 refunded, got %s', n);
  SELECT reserved INTO v_units FROM public.reward_stock WHERE sku = 'mug';
  ASSERT v_units = 0, format('no reservation left, got %s', v_units);

  -- 8. An unpriced token order can never become a free one.
  BEGIN
    PERFORM public.place_reward_order('ord-ffffffff', u, 'webdev', 'tokens', 'cap', 1, NULL, NULL, NULL,
      '[]'::jsonb, NULL, 'key-5', TRUE);
    ASSERT FALSE, 'an unpriced token order must raise';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%invalid_total%', format('unexpected error: %s', SQLERRM);
  END;

  -- 9. An audit row exists for every transition.
  SELECT COUNT(*) INTO n FROM public.reward_order_events WHERE order_id = 'ord-cccccccc';
  ASSERT n >= 4, format('every transition is audited, got %s', n);
  RAISE NOTICE 'orders: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-crown-1';
  r JSONB;
  n BIGINT;
BEGIN
  DELETE FROM public.reward_inventory WHERE user_id = u;

  -- 1. An unowned cosmetic cannot be equipped.
  r := public.equip_reward_cosmetic(u, 'webdev', 'crown', TRUE);
  ASSERT (r->>'applied')::BOOLEAN IS FALSE, 'an unowned cosmetic is refused';
  ASSERT (r->>'error') = 'not_owned', 'and says why';

  -- 2. Granting is idempotent, so a duplicate purchase grants one entitlement.
  PERFORM public.grant_reward_cosmetic(u, 'webdev', 'crown');
  PERFORM public.grant_reward_cosmetic(u, 'webdev', 'crown');
  SELECT COUNT(*) INTO n FROM public.reward_inventory WHERE user_id = u AND sku = 'crown';
  ASSERT n = 1, format('one entitlement, got %s', n);

  -- 3. Equipping and unequipping work, and only one is worn at a time.
  r := public.equip_reward_cosmetic(u, 'webdev', 'crown', TRUE);
  ASSERT (r->>'applied')::BOOLEAN, 'an owned cosmetic equips';
  SELECT COUNT(*) INTO n FROM public.reward_inventory WHERE user_id = u AND equipped;
  ASSERT n = 1, 'exactly one equipped';
  r := public.equip_reward_cosmetic(u, 'webdev', 'crown', FALSE);
  SELECT COUNT(*) INTO n FROM public.reward_inventory WHERE user_id = u AND equipped;
  ASSERT n = 0, 'unequipping leaves nothing worn';
  RAISE NOTICE 'cosmetics: ok';
END $$;

DO $$
DECLARE
  u TEXT := 'user-erase-1';
  n BIGINT;
BEGIN
  DELETE FROM public.reward_orders WHERE user_id = u;
  DELETE FROM public.reward_stock WHERE sku = 'tshirt';
  INSERT INTO public.reward_stock (sku, on_hand, reserved) VALUES ('tshirt', 5, 0);
  PERFORM public.move_reward_tokens(u, 'webdev', 1000, 'adjustment', 'test:seed');
  PERFORM public.place_reward_order('ord-99999999', u, 'webdev', 'tokens', 'tshirt', 1, 'CZK', NULL, 100,
    '[{"sku":"tshirt","variantId":"m","quantity":1,"unitCashMinor":null,"unitTokens":100}]'::jsonb,
    '{"name":"A","line1":"B","city":"C","postcode":"D","country":"CZ"}'::jsonb, 'erase-1', TRUE);
  PERFORM public.grant_reward_cosmetic(u, 'webdev', 'crown');

  PERFORM public.delete_reward_data(u);

  -- An order that still owes a delivery survives, without the address.
  SELECT COUNT(*) INTO n FROM public.reward_orders WHERE user_id = u AND status = 'paid';
  ASSERT n = 1, 'an open order is kept for the parcel and the tax record';
  SELECT COUNT(*) INTO n FROM public.reward_orders WHERE user_id = u AND address IS NOT NULL;
  ASSERT n = 0, 'the address is cleared';
  SELECT COUNT(*) INTO n FROM public.reward_wallets WHERE user_id = u;
  ASSERT n = 0, 'the wallet goes';
  SELECT COUNT(*) INTO n FROM public.reward_ledger WHERE user_id = u;
  ASSERT n = 0, 'the ledger goes';
  SELECT COUNT(*) INTO n FROM public.reward_inventory WHERE user_id = u;
  ASSERT n = 0, 'the inventory goes';
  RAISE NOTICE 'erasure: ok';
END $$;
