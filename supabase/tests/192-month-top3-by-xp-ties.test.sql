-- The monthly top three are the learners with the most XP earned in that
-- calendar month (UTC), and a tie shares the place (migration 056, owner
-- decision 8). Everyone tied at a place gets that place's coins; the next
-- total takes the place after the tied group (1, 1, 3), and nobody below
-- third is paid. 041 ranked correct answers and broke ties by the earlier
-- first active day, so one of two tied learners went unpaid. A place held by
-- a free account is still paid to nobody. A month settles once, so running it
-- again pays nothing more, and a month still running does not settle.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_month_start CONSTANT DATE := date_trunc('month', NOW() AT TIME ZONE 'UTC')::DATE;
  v_last_start  CONSTANT DATE := (date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 month')::DATE;
  v_last        CONSTANT TEXT := TO_CHAR(date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 month', 'YYYY-MM');
  v_this        CONSTANT TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_ada   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001921'; -- Premium, 500
  v_bo    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001922'; -- free, 500
  v_cy    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001923'; -- Premium, 400
  v_di    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001924'; -- Premium, 400
  v_ed    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001925'; -- Premium, 300, most correct answers
  v_fay   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001926'; -- Premium, most XP this month, 50 last month
  v_user    TEXT;
  v_result  JSONB;
  v_winners TEXT;
  v_paid    TEXT;
  v_coins   BIGINT;
BEGIN
  FOREACH v_user IN ARRAY ARRAY[v_ada, v_cy, v_di, v_ed, v_fay] LOOP
    PERFORM public.grant_manual_entitlement(v_user, NULL, 'monthly top three test');
  END LOOP;

  -- Last month's XP, split over days, including its first and last day.
  INSERT INTO public.user_xp_days (user_id, day, subject, xp) VALUES
    (v_ada, v_last_start,            'webdev', 200), (v_ada, v_month_start - 1, 'webdev', 300),
    (v_bo,  v_last_start + 3,        'webdev', 500),
    (v_cy,  v_last_start + 10,       'webdev', 400),
    (v_di,  v_last_start + 11,       'webdev', 150), (v_di, v_last_start + 12, 'webdev', 250),
    (v_ed,  v_last_start + 5,        'webdev', 300),
    -- Another subject's month is not this one's.
    (v_ed,  v_last_start + 5,        'math',   5000),
    (v_fay, v_last_start + 20,       'webdev', 50),
    -- XP from this month and from the month before does not count.
    (v_fay, v_month_start,           'webdev', 9000),
    (v_bo,  v_last_start - 1,        'webdev', 9000);
  -- The answers that ranked 041's board: Ed had by far the most correct.
  PERFORM public.add_activity_day(v_ed, v_last_start + 5, 'javascript', 900, 900);
  PERFORM public.add_activity_day(v_ada, v_last_start + 5, 'javascript', 5, 10);

  -- A month still running does not settle.
  v_result := public.settle_month_top3(v_this, 'webdev', ARRAY[300, 200, 100], 5);
  ASSERT v_result ->> 'reason' = 'open', format('the running month waits: %s', v_result);

  v_result := public.settle_month_top3(v_last, 'webdev', ARRAY[300, 200, 100], 5);
  ASSERT (v_result ->> 'settled')::BOOLEAN AND (v_result ->> 'winners')::INT = 4, format('four learners place: %s', v_result);

  SELECT string_agg(format('%s:%s:%s:%s', right(w ->> 'userId', 2), w ->> 'rank', w ->> 'xp', w ->> 'coins'), ' ' ORDER BY ordinality)
    INTO v_winners
    FROM public.token_month_settlements s, jsonb_array_elements(s.winners) WITH ORDINALITY AS t(w, ordinality)
   WHERE s.month = v_last;
  -- Ada and Bo share first; Bo is on the free plan and is paid nothing. Cy and
  -- Di share third and are both paid third's coins. Ed's correct answers do
  -- not place him, and nobody is second.
  ASSERT v_winners = '21:1:500:300 22:1:500:0 23:3:400:100 24:3:400:100',
    format('ranked by the month''s XP, ties sharing the place: %s', v_winners);

  SELECT string_agg(format('%s=%s', right(user_id, 2), amount), ' ' ORDER BY user_id) INTO v_paid
    FROM public.token_ledger WHERE reference = 'month-top:' || v_last;
  ASSERT v_paid = '21=300 23=100 24=100', format('each winner on a paid plan has one credit: %s', v_paid);
  ASSERT EXISTS (SELECT 1 FROM public.token_ledger
                  WHERE event_id = 'month-top:' || v_last || ':3:' || public.token_account_key(v_di)),
    'a shared place has one event per learner';

  -- Settling again pays nothing more.
  v_result := public.settle_month_top3(v_last, 'webdev', ARRAY[300, 200, 100], 5);
  ASSERT v_result ->> 'reason' = 'already', format('a month settles once: %s', v_result);
  SELECT SUM(amount) INTO v_coins FROM public.token_ledger WHERE reference = 'month-top:' || v_last;
  ASSERT v_coins = 500, format('still 300 + 100 + 100 coins, got %s', v_coins);
END;
$$;

-- Three learners tied at the top all take first; the next takes fourth and is
-- not paid. A month in which nobody earned XP settles with no winners.
DO $$
DECLARE
  -- Three and four months ago: the block above put XP in the month before last.
  v_start CONSTANT DATE := (date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '3 months')::DATE;
  v_month   CONSTANT TEXT := TO_CHAR(date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '3 months', 'YYYY-MM');
  v_empty   CONSTANT TEXT := TO_CHAR(date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '4 months', 'YYYY-MM');
  v_user    TEXT;
  v_result  JSONB;
  v_ranks   TEXT;
BEGIN
  FOREACH v_user IN ARRAY ARRAY['aaaaaaaa-0000-4000-8000-000000001931', 'aaaaaaaa-0000-4000-8000-000000001932',
                                'aaaaaaaa-0000-4000-8000-000000001933', 'aaaaaaaa-0000-4000-8000-000000001934'] LOOP
    PERFORM public.grant_manual_entitlement(v_user, NULL, 'monthly top three test');
    INSERT INTO public.user_xp_days (user_id, day, subject, xp)
    VALUES (v_user, v_start + 2, 'webdev', CASE WHEN v_user LIKE '%34' THEN 90 ELSE 120 END);
  END LOOP;

  v_result := public.settle_month_top3(v_month, 'webdev', ARRAY[300, 200, 100], 5);
  SELECT string_agg(format('%s:%s', w ->> 'rank', w ->> 'coins'), ' ' ORDER BY ordinality) INTO v_ranks
    FROM public.token_month_settlements s, jsonb_array_elements(s.winners) WITH ORDINALITY AS t(w, ordinality)
   WHERE s.month = v_month;
  ASSERT v_ranks = '1:300 1:300 1:300', format('three tied at the top all take first, the fourth is not paid: %s', v_ranks);

  v_result := public.settle_month_top3(v_empty, 'webdev', ARRAY[300, 200, 100], 5);
  ASSERT (v_result ->> 'settled')::BOOLEAN AND (v_result ->> 'winners')::INT = 0, format('an empty month settles with nobody: %s', v_result);
END;
$$;
