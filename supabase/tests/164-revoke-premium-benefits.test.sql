-- A refunded, disputed or withdrawn subscription keeps nothing that only
-- Premium paid for (migration 041). Once its grant is revoked,
-- revoke_premium_benefits cancels the coin redemption placed while it was
-- live, which returns the coins and releases the reserved stock, and debits
-- the milestone coins and the doubled share of XP coins. A second call changes
-- nothing. Nothing happens while the grant is live, or while another grant
-- keeps the account Premium.

INSERT INTO auth.users (id) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000164'),
  ('bbbbbbbb-0000-4000-8000-000000000165');

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user    CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000164';
  v_kept    CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000165';
  v_outcome JSONB;
  v_balance INTEGER;
  v_debits  INTEGER;
BEGIN
  -- A subscriber: 200 signup coins, a quiz worth 100 coins doubled to 200 by
  -- Premium, a 100-coin milestone, and a mug redeemed for 300 coins.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_benefit164', 'active', 'price_m', NOW() + INTERVAL '30 days', FALSE);
  PERFORM public.grant_signup_tokens(v_user, 'webdev', 200);
  ASSERT public.credit_verified_xp_tokens(v_user, 'quiz:benefit164', 'webdev', 1000) = 200, 'Premium doubles the quiz coins';
  PERFORM public.credit_tokens(v_user, 'topic:html:' || v_user, 'webdev', 100, 'milestone', 'topic:html');
  PERFORM public.set_merch_stock('mug', '', 5);
  ASSERT public.create_merch_order('order_benefit164_aaaa', v_user, 'tokens',
    '[{"sku":"mug","variant":"","quantity":1,"unitMinor":1349,"unitTokens":300}]'::JSONB, 1349, 'EUR', 300, 'webdev',
    '{"name":"A","line1":"B","city":"C","postalCode":"1","country":"CZ"}'::JSONB, TRUE) = 'created', 'the mug is redeemed';
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_user AND subject = 'webdev';
  ASSERT v_balance = 200, format('200 + 200 + 100 - 300 = 200 coins: %s', v_balance);
  ASSERT (SELECT reserved FROM public.merch_stock WHERE sku = 'mug' AND variant = '') = 1, 'one mug reserved';

  -- While the grant is live nothing is taken back.
  v_outcome := public.revoke_premium_benefits('sub_benefit164', 'webdev');
  ASSERT v_outcome ->> 'skipped' = 'not_revoked', format('a live grant keeps its benefits: %s', v_outcome);
  ASSERT (SELECT state FROM public.merch_orders WHERE order_id = 'order_benefit164_aaaa') <> 'refunded';

  -- A full refund revokes the grant, then the benefits go.
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_benefit164', 'revoked', 'price_m', NOW(), FALSE, 'Revoked: test refund');
  v_outcome := public.revoke_premium_benefits('sub_benefit164', 'webdev');
  ASSERT (v_outcome ->> 'cancelledOrders')::INTEGER = 1, format('the redemption is cancelled: %s', v_outcome);
  ASSERT (v_outcome ->> 'owed')::INTEGER = 200 AND (v_outcome ->> 'debited')::INTEGER = 200,
    format('100 milestone coins and the 100 doubled coins are owed and debited: %s', v_outcome);
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_user AND subject = 'webdev';
  ASSERT v_balance = 300, format('200 + 300 returned - 200 debited = 300: %s', v_balance);
  ASSERT (SELECT reserved FROM public.merch_stock WHERE sku = 'mug' AND variant = '') = 0, 'the mug is back in stock';
  ASSERT (SELECT state FROM public.merch_orders WHERE order_id = 'order_benefit164_aaaa') = 'refunded', 'the order reads refunded';
  ASSERT (SELECT amount FROM public.token_ledger WHERE event_id = 'refund:order_benefit164_aaaa') = 300, 'the coins came back once';

  -- A second call (a redelivered webhook) changes nothing.
  v_outcome := public.revoke_premium_benefits('sub_benefit164', 'webdev');
  ASSERT (v_outcome ->> 'cancelledOrders')::INTEGER = 0 AND (v_outcome ->> 'debited')::INTEGER = 0,
    format('the second call takes nothing more: %s', v_outcome);
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_user AND subject = 'webdev';
  ASSERT v_balance = 300, format('still 300: %s', v_balance);
  SELECT COUNT(*) INTO v_debits FROM public.token_ledger WHERE user_id = v_user AND event_id LIKE 'revoke:%';
  ASSERT v_debits = 1, format('one debit in the ledger: %s', v_debits);
  ASSERT (SELECT COUNT(*) FROM public.token_ledger WHERE event_id = 'refund:order_benefit164_aaaa') = 1, 'one refund in the ledger';
  ASSERT (SELECT reserved FROM public.merch_stock WHERE sku = 'mug' AND variant = '') = 0, 'the stock is released once';

  -- Another grant keeps the account Premium: nothing is taken back.
  PERFORM public.upsert_provider_entitlement(v_kept, 'sub_benefit165', 'active', 'price_m', NOW() + INTERVAL '30 days', FALSE);
  PERFORM public.grant_manual_entitlement(v_kept, NULL, 'complimentary');
  PERFORM public.credit_tokens(v_kept, 'topic:css:' || v_kept, 'webdev', 100, 'milestone', 'topic:css');
  PERFORM public.upsert_provider_entitlement(v_kept, 'sub_benefit165', 'revoked', 'price_m', NOW(), FALSE, 'Revoked: test dispute');
  v_outcome := public.revoke_premium_benefits('sub_benefit165', 'webdev');
  ASSERT v_outcome ->> 'skipped' = 'still_premium', format('a manual grant keeps the benefits: %s', v_outcome);
  ASSERT (SELECT balance FROM public.token_balances WHERE user_id = v_kept AND subject = 'webdev') = 100, 'the milestone stays';
END;
$$;
