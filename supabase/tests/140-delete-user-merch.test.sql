-- Deleting an account gives back the merchandise it held and will never
-- receive (migration 051). Orders the supplier never got release their stock
-- reservations: an order awaiting payment is deleted, a paid one is cancelled
-- and kept without the person, off the fulfilment queue. An order already
-- submitted or shipped is kept, anonymised, as before, and a submitted one
-- keeps its reservation until it ships. A claimed learning-path package
-- reserved nothing and releases nothing. Another account's orders and
-- reservations are untouched.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_gone CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000140';
  v_bob  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000141';
  v_ship CONSTANT JSONB := '{"name":"Gone Learner","line1":"Street 1","city":"Prague","postalCode":"11000","country":"CZ"}';
  v_bob_ship CONSTANT JSONB := '{"name":"Bob","line1":"Road 2","city":"Brno","postalCode":"60200","country":"CZ"}';
BEGIN
  -- The month's caps the owner set in /dev.
  PERFORM public.set_merch_stock('mug', '', 10);
  PERFORM public.set_merch_stock('cap', '', 10);
  PERFORM public.set_merch_stock('sticker-set', '', 10);
  PERFORM public.set_merch_stock('hoodie', 'L', 10);
  PERFORM public.set_merch_stock('t-shirt', 'M', 10);
  PERFORM public.grant_signup_tokens(v_gone, 'webdev', 1000);
  PERFORM public.grant_signup_tokens(v_bob, 'webdev', 1000);

  -- A paid coin redemption the supplier has not received: two mugs and a hoodie.
  PERFORM public.create_merch_order('delmerchpaidcoins001', v_gone, 'tokens',
    '[{"sku":"mug","quantity":2,"unitTokens":100},{"sku":"hoodie","variant":"L","quantity":1,"unitTokens":300}]',
    NULL, NULL, 500, 'webdev', v_ship, TRUE);
  -- A cash order still awaiting payment: a sticker set and a mug.
  PERFORM public.create_merch_order('delmerchawaitcash001', v_gone, 'cash',
    '[{"sku":"sticker-set","quantity":1,"unitMinor":500},{"sku":"mug","quantity":1,"unitMinor":1200}]',
    1700, 'EUR', NULL, 'webdev', v_ship, TRUE);
  -- A cash order the provider confirmed paid, not sent yet: a cap.
  PERFORM public.create_merch_order('delmerchpaidcash0001', v_gone, 'cash',
    '[{"sku":"cap","quantity":1,"unitMinor":1500}]', 1500, 'EUR', NULL, 'webdev', v_ship, TRUE);
  PERFORM public.mark_merch_order_paid('delmerchpaidcash0001', 'stripe', 'pi_delete_140');
  -- Handed to Spreadshop: a mug and a cap, still reserved until shipped.
  PERFORM public.create_merch_order('delmerchsubmitted001', v_gone, 'tokens',
    '[{"sku":"mug","quantity":1,"unitTokens":100},{"sku":"cap","quantity":1,"unitTokens":100}]',
    NULL, NULL, 200, 'webdev', v_ship, TRUE);
  PERFORM public.advance_merch_order('delmerchsubmitted001', 'submitted', NULL, NULL);
  -- Shipped: two caps, which used their units up.
  PERFORM public.create_merch_order('delmerchshipped00001', v_gone, 'tokens',
    '[{"sku":"cap","quantity":2,"unitTokens":100}]', NULL, NULL, 200, 'webdev', v_ship, TRUE);
  PERFORM public.advance_merch_order('delmerchshipped00001', 'shipped', 'DHL', 'TRACK140');

  -- A finished path's package, claimed and waiting for the owner: a t-shirt,
  -- a mug and a sticker set, none of them reserved.
  PERFORM public.upsert_learning_path_enrollment(v_gone, 'delmerchenroll000001', 'dsa-foundations', 1, NULL, 'enroll');
  PERFORM public.open_learning_path_attempt(v_gone, 'delmerchattempt00001', 'delmerchenroll000001', 'dsa-arrays-1', 'exercise', 1, 1, 60);
  PERFORM public.accept_learning_path_result(v_gone, 'delmerchattempt00001', 'delmerchidemkey00001', 'delmerchrequest00001', 'dsa-module-1',
    'verified_pass', 'machine_verified', 0.9, NULL, NULL, '{"code":"x"}', TRUE, '{"ok":true}');
  PERFORM public.claim_path_reward(v_gone, 'dsa-foundations', 1, 'M', 'Gone Learner', 'Street 1', NULL, 'Prague', '11000', 'CZ');

  -- Another account's paid redemption: a mug and a t-shirt.
  PERFORM public.create_merch_order('delmerchbobpaid00001', v_bob, 'tokens',
    '[{"sku":"mug","quantity":1,"unitTokens":100},{"sku":"t-shirt","variant":"M","quantity":1,"unitTokens":200}]',
    NULL, NULL, 300, 'webdev', v_bob_ship, TRUE);
END;
$$;

-- Where the caps stand before the deletion.
DO $$
DECLARE
  v_stock TEXT;
BEGIN
  SELECT string_agg(format('%s/%s:%s/%s', sku, variant, reserved, on_hand), ' ' ORDER BY sku, variant) INTO v_stock
    FROM public.merch_stock;
  ASSERT v_stock = 'cap/:2/8 hoodie/L:1/10 mug/:5/10 sticker-set/:1/10 t-shirt/M:1/10',
    format('the reservations before the deletion: %s', v_stock);
  ASSERT EXISTS (SELECT 1 FROM public.path_reward_claims WHERE user_id = 'aaaaaaaa-0000-4000-8000-000000000140'),
    'the package is claimed';
END;
$$;

-- The owner's cap drifted below what the account held for the sticker set
-- (a manual correction); the release still never goes below zero.
UPDATE public.merch_stock SET reserved = 0 WHERE sku = 'sticker-set' AND variant = '';

DO $$
BEGIN
  PERFORM public.delete_user_data('aaaaaaaa-0000-4000-8000-000000000140');
END;
$$;

DO $$
DECLARE
  v_gone CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000140';
  v_bob  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000141';
  v_stock TEXT;
  v_row  RECORD;
BEGIN
  -- Released: the paid redemption's two mugs and hoodie, the unpaid order's
  -- mug and sticker set, the paid cash order's cap. Kept: the submitted
  -- order's mug and cap, and bob's mug and t-shirt. The package touched
  -- nothing, and the shipped caps stay used.
  SELECT string_agg(format('%s/%s:%s/%s', sku, variant, reserved, on_hand), ' ' ORDER BY sku, variant) INTO v_stock
    FROM public.merch_stock;
  ASSERT v_stock = 'cap/:1/8 hoodie/L:0/10 mug/:2/10 sticker-set/:0/10 t-shirt/M:1/10',
    format('the reservations after the deletion: %s', v_stock);

  -- The unpaid order and the unsent package are gone, with their items and the claim.
  ASSERT NOT EXISTS (SELECT 1 FROM public.merch_orders WHERE order_id = 'delmerchawaitcash001'), 'the unpaid order is deleted';
  ASSERT NOT EXISTS (SELECT 1 FROM public.merch_order_items WHERE order_id = 'delmerchawaitcash001'), 'and its items';
  ASSERT NOT EXISTS (SELECT 1 FROM public.merch_orders WHERE order_id LIKE 'reward-%'), 'the unsent package is deleted';
  ASSERT NOT EXISTS (SELECT 1 FROM public.path_reward_claims WHERE user_id = v_gone OR user_id LIKE 'deleted-account:%'),
    'and its claim, as before';

  -- The paid orders the supplier never received are cancelled and kept without the person.
  FOR v_row IN
    SELECT order_id, state, cancelled_at, user_id, ship_name, ship_line1, ship_city, ship_postal, provider_ref
      FROM public.merch_orders WHERE order_id IN ('delmerchpaidcoins001', 'delmerchpaidcash0001')
  LOOP
    ASSERT v_row.state = 'cancelled' AND v_row.cancelled_at IS NOT NULL,
      format('%s is cancelled: %s', v_row.order_id, v_row.state);
    ASSERT v_row.user_id = 'deleted-account' AND v_row.ship_name = 'redacted' AND v_row.ship_line1 = 'redacted'
       AND v_row.ship_city = 'redacted' AND v_row.ship_postal = 'redacted',
      format('%s is kept without the person', v_row.order_id);
  END LOOP;
  ASSERT (SELECT count(*) FROM public.merch_orders WHERE order_id IN ('delmerchpaidcoins001', 'delmerchpaidcash0001')) = 2,
    'both paid orders are kept';
  ASSERT (SELECT provider_ref FROM public.merch_orders WHERE order_id = 'delmerchpaidcash0001') = 'pi_delete_140',
    'a paid cash order keeps its provider reference for a refund';

  -- Nothing of the account is left in the fulfilment queue: paid orders and
  -- claimed packages awaiting payment.
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.merch_orders o
     WHERE o.user_id = 'deleted-account'
       AND (o.state = 'paid'
            OR (o.state = 'awaiting_payment' AND EXISTS (SELECT 1 FROM public.path_reward_claims c WHERE c.order_id = o.order_id)))
  ), 'the deleted account has nothing left to fulfil';

  -- Orders already with the supplier are kept, anonymised, in their state.
  SELECT order_id, state, user_id, ship_name, tracking_ref INTO v_row
    FROM public.merch_orders WHERE order_id = 'delmerchsubmitted001';
  ASSERT v_row.state = 'submitted' AND v_row.user_id = 'deleted-account' AND v_row.ship_name = 'redacted',
    format('the submitted order stays, anonymised: %s/%s/%s', v_row.state, v_row.user_id, v_row.ship_name);
  SELECT order_id, state, user_id, ship_name, ship_line2, tracking_ref INTO v_row
    FROM public.merch_orders WHERE order_id = 'delmerchshipped00001';
  ASSERT v_row.state = 'shipped' AND v_row.user_id = 'deleted-account' AND v_row.ship_name = 'redacted'
     AND v_row.ship_line2 IS NULL AND v_row.tracking_ref = 'TRACK140',
    format('the shipped order stays, anonymised, with its tracking: %s/%s/%s', v_row.state, v_row.user_id, v_row.tracking_ref);
  ASSERT (SELECT count(*) FROM public.merch_order_items WHERE order_id IN ('delmerchsubmitted001', 'delmerchshipped00001')) = 3,
    'the kept orders keep their items';

  -- Nothing names the account any more.
  ASSERT NOT EXISTS (SELECT 1 FROM public.merch_orders WHERE user_id = v_gone), 'no order names the account';

  -- Bob's order and reservations are his own.
  SELECT state, user_id, ship_name INTO v_row FROM public.merch_orders WHERE order_id = 'delmerchbobpaid00001';
  ASSERT v_row.state = 'paid' AND v_row.user_id = v_bob AND v_row.ship_name = 'Bob', 'the other account''s order is untouched';
END;
$$;

-- A second deletion finds nothing of the account and releases nothing again.
DO $$
DECLARE
  v_stock TEXT;
BEGIN
  PERFORM public.delete_user_data('aaaaaaaa-0000-4000-8000-000000000140');
  SELECT string_agg(format('%s/%s:%s/%s', sku, variant, reserved, on_hand), ' ' ORDER BY sku, variant) INTO v_stock
    FROM public.merch_stock;
  ASSERT v_stock = 'cap/:1/8 hoodie/L:0/10 mug/:2/10 sticker-set/:0/10 t-shirt/M:1/10',
    format('a repeated deletion changes no reservation: %s', v_stock);
END;
$$;
