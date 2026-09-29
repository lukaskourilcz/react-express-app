-- Buying back a spent streak protection costs coins every time. A learner
-- with enough coins who spends a protection and buys it back twice in one
-- month is charged twice, and the reserve never rises above two.
--
-- Migrations 024/035 keyed the debit by (month, protections left), so the
-- second purchase at the same balance replayed the first debit for free;
-- migration 047 gives every purchase its own ledger event.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000070';
  v_bought BOOLEAN;
  v_remaining INTEGER;
  v_balance INTEGER;
  v_charges INTEGER;
BEGIN
  PERFORM public.grant_signup_tokens(v_user, 'webdev', 100);
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_user AND subject = 'webdev';
  ASSERT v_balance = 100, format('the learner starts with 100 coins, got %s', v_balance);

  -- Both protections are there: nothing to buy, nothing charged.
  SELECT bought, remaining INTO v_bought, v_remaining FROM public.purchase_streak_protection(v_user, 'webdev', 30);
  ASSERT v_bought IS FALSE AND v_remaining = 2, format('with two left nothing is bought (bought=%s, left=%s)', v_bought, v_remaining);

  -- Spend one (a shield), let it run out, buy it back.
  PERFORM public.activate_streak_shield(v_user);
  UPDATE public.user_streak_freezes SET shield_until = NOW() - INTERVAL '1 minute' WHERE user_id = v_user;
  SELECT bought, remaining INTO v_bought, v_remaining FROM public.purchase_streak_protection(v_user, 'webdev', 30);
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_user AND subject = 'webdev';
  ASSERT v_bought AND v_remaining = 2, format('the first purchase restores the second protection (bought=%s, left=%s)', v_bought, v_remaining);
  ASSERT v_balance = 70, format('the first purchase costs 30 coins: expected 70 left, got %s', v_balance);

  -- Spend it again the same month and buy it back again.
  PERFORM public.activate_streak_shield(v_user);
  UPDATE public.user_streak_freezes SET shield_until = NOW() - INTERVAL '1 minute' WHERE user_id = v_user;
  SELECT bought, remaining INTO v_bought, v_remaining FROM public.purchase_streak_protection(v_user, 'webdev', 30);
  SELECT balance INTO v_balance FROM public.token_balances WHERE user_id = v_user AND subject = 'webdev';
  SELECT count(*) INTO v_charges FROM public.token_ledger WHERE user_id = v_user AND reference = 'streak-protection';
  ASSERT v_bought AND v_remaining = 2, format('the second purchase restores it too (bought=%s, left=%s)', v_bought, v_remaining);
  ASSERT v_balance = 40 AND v_charges = 2,
    format('the second purchase in a month is charged as well: expected 40 coins left and 2 charges, got %s and %s', v_balance, v_charges);
END;
$$;
