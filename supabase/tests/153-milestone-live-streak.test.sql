-- The Shop's streak milestones count the streak the Profile shows (migration
-- 052, review finding RANK-7). settle_coin_milestones counted 0 as soon as the
-- last learning day was before yesterday, although a shield or one of the
-- month's protections still covered the gap and the Profile showed the
-- streak. It now uses streak_live, the rule friend_list and the Profile use.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today    CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month    CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_config   CONSTANT JSONB := '{"streak":[{"days":7,"coins":25}]}';
  v_shielded CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001551';
  v_bridged  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001552';
  v_lapsed   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001553';
  v_recent   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001554';
  v_newmonth CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001555';
  v_none     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001556';
  v_streak   INTEGER;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_shielded, 12, 12, v_today - 3),
         (v_bridged,  12, 12, v_today - 2),
         (v_lapsed,   12, 12, v_today - 3),
         (v_recent,   12, 12, v_today - 1),
         (v_newmonth, 12, 12, v_today - 3);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  -- A shield raised two days ago, ended at 00:00 today.
  VALUES (v_shielded, v_month, 0, '[]'::jsonb, v_today::TIMESTAMP AT TIME ZONE 'UTC'),
         (v_bridged,  v_month, 1, '[]'::jsonb, NULL),
         (v_lapsed,   v_month, 1, '[]'::jsonb, NULL),
         -- An earlier month's empty balance: the next learning day restores two.
         (v_newmonth, '2000-01', 0, '[]'::jsonb, NULL);

  v_streak := (public.settle_coin_milestones(v_shielded, 'webdev', v_config) ->> 'streak')::INTEGER;
  ASSERT v_streak = 12, format('a shield covering the two days since keeps it: expected 12, got %s', v_streak);
  v_streak := (public.settle_coin_milestones(v_bridged, 'webdev', v_config) ->> 'streak')::INTEGER;
  ASSERT v_streak = 12, format('a protection left for yesterday keeps it: expected 12, got %s', v_streak);
  v_streak := (public.settle_coin_milestones(v_lapsed, 'webdev', v_config) ->> 'streak')::INTEGER;
  ASSERT v_streak = 0, format('two missed days and one protection end it: expected 0, got %s', v_streak);
  v_streak := (public.settle_coin_milestones(v_recent, 'webdev', v_config) ->> 'streak')::INTEGER;
  ASSERT v_streak = 12, format('learnt yesterday: expected 12, got %s', v_streak);
  v_streak := (public.settle_coin_milestones(v_newmonth, 'webdev', v_config) ->> 'streak')::INTEGER;
  ASSERT v_streak = 12, format('a new month''s two protections cover two missed days: expected 12, got %s', v_streak);
  v_streak := (public.settle_coin_milestones(v_none, 'webdev', v_config) ->> 'streak')::INTEGER;
  ASSERT v_streak = 0, format('no stats, no streak: got %s', v_streak);
END;
$$;
