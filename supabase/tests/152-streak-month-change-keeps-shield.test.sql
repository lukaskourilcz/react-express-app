-- The month change restores the two protections and keeps the shield
-- (migration 052, review findings RANK-3 and SEC-3). refresh_streak_freezes
-- used to clear a shield that had ended on the first call of a new month, and
-- the Profile's read calls it first: a learner who opened the Profile before
-- learning lost the shielded days and paid for them again, or lost the streak.
-- The stored period is set to an earlier month to stand in for the change.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today   CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_old     CONSTANT TEXT := '2000-01';
  v_month   CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_paid    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001541';
  v_kept    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001542';
  v_row     RECORD;
  v_streak  INTEGER;
  v_left    INTEGER;
  v_used    JSONB;
BEGIN
  -- Last learnt three days ago; a shield raised the next day covered the two
  -- days since and ended at 00:00 today. The row is from before 052.
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_paid, 12, 12, v_today - 3);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  VALUES (v_paid, v_old, 1, '[]'::jsonb, v_today::TIMESTAMP AT TIME ZONE 'UTC');

  -- The Profile's read first.
  SELECT * INTO v_row FROM public.refresh_streak_freezes(v_paid);
  ASSERT v_row.period = v_month AND v_row.remaining = 2 AND v_row.used = '[]'::jsonb,
    format('the new month restores the two: %s, %s left, used %s', v_row.period, v_row.remaining, v_row.used);
  ASSERT v_row.shield_until = v_today::TIMESTAMP AT TIME ZONE 'UTC',
    format('and keeps the shield: %s', v_row.shield_until);

  v_streak := public.advance_verified_streak(v_paid);
  SELECT remaining, used INTO v_left, v_used FROM public.user_streak_freezes WHERE user_id = v_paid;
  ASSERT v_streak = 13 AND v_left = 2 AND v_used = '[]'::jsonb,
    format('the shielded days are not paid for again: streak %s, %s left, used %s', v_streak, v_left, v_used);

  -- Last learnt four days ago: the day after was missed, the next two were
  -- shielded. After the Profile's read the one missed day takes one of the
  -- new month's protections and the streak goes on.
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_kept, 9, 9, v_today - 4);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until, shield_days)
  VALUES (v_kept, v_old, 1, '[]'::jsonb, v_today::TIMESTAMP AT TIME ZONE 'UTC', ARRAY[v_today - 2, v_today - 1]);

  SELECT * INTO v_row FROM public.refresh_streak_freezes(v_kept);
  ASSERT v_row.shield_days = ARRAY[v_today - 2, v_today - 1],
    format('the month change keeps the shielded days: %s', v_row.shield_days);
  v_streak := public.advance_verified_streak(v_kept);
  SELECT remaining, used INTO v_left, v_used FROM public.user_streak_freezes WHERE user_id = v_kept;
  ASSERT v_streak = 10 AND v_left = 1 AND v_used = to_jsonb(ARRAY[TO_CHAR(v_today - 3, 'YYYY-MM-DD')]),
    format('one protection pays for the one missed day: streak %s, %s left, used %s', v_streak, v_left, v_used);
END;
$$;
