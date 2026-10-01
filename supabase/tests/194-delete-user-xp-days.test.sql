-- Deleting an account deletes its monthly XP ledger (migration 056 restates
-- delete_user_data from 051 with user_xp_days). A month it placed in keeps its
-- places and loses the person, as 041 to 051 did for the old ranking; another
-- learner's ledger and places stay. 080-delete-user-data.test.sql checks that
-- no table names the account afterwards.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_gone CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001951';
  v_bob  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001952';
  v_last_start CONSTANT DATE := (date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 month')::DATE;
  v_last       CONSTANT TEXT := TO_CHAR(date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 month', 'YYYY-MM');
  v_winners TEXT;
BEGIN
  INSERT INTO public.user_xp_days (user_id, day, subject, xp) VALUES
    (v_gone, v_last_start + 1, 'webdev', 700),
    (v_bob,  v_last_start + 1, 'webdev', 400);
  -- And this month, through a verified quiz.
  PERFORM public.record_verified_quiz_result_v2(
    v_gone, 'deletexpdays00000001', 1, 1, NULL,
    '[{"questionId":"q1","category":"javascript","isCorrect":true,"xp":4}]', 'webdev', 4);
  PERFORM public.settle_month_top3(v_last, 'webdev', ARRAY[300, 200, 100], 5);

  PERFORM public.delete_user_data(v_gone);

  ASSERT NOT EXISTS (SELECT 1 FROM public.user_xp_days WHERE user_id = v_gone), 'the account''s ledger is gone';
  ASSERT (SELECT SUM(xp) FROM public.user_xp_days WHERE user_id = v_bob) = 400, 'another learner keeps theirs';

  SELECT string_agg(format('%s:%s:%s', w ->> 'userId', w ->> 'rank', w ->> 'xp'), ' ' ORDER BY ordinality) INTO v_winners
    FROM public.token_month_settlements s, jsonb_array_elements(s.winners) WITH ORDINALITY AS t(w, ordinality)
   WHERE s.month = v_last;
  ASSERT v_winners = format('deleted-account:1:700 %s:2:400', v_bob),
    format('the settled month keeps its places and loses the person: %s', v_winners);
  ASSERT NOT EXISTS (SELECT 1 FROM public.token_month_settlements WHERE strpos(winners::TEXT, v_gone) > 0),
    'the settlement no longer names the account';
END;
$$;
