-- A shield is not raised when it would spend a protection that a missed day
-- still needs (migration 052, review findings RANK-2 and SEC-2). Each day
-- missed between the last learning day and today takes a protection when the
-- learner comes back; a shield that leaves fewer than that ends the streak it
-- was raised to keep. The routine refuses, spends nothing and says why
-- (outcome 'would_end_streak'); learning today bridges the day instead.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_today     CONSTANT DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_month     CONSTANT TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
  v_one_left  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001531';
  v_two_gap   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001532';
  v_spare     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001533';
  v_current   CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001534';
  v_half      CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001535';
  v_half_two  CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000001536';
  v_granted   BOOLEAN;
  v_outcome   TEXT;
  v_left      INTEGER;
  v_until     TIMESTAMPTZ;
  v_used      JSONB;
  v_days      DATE[];
  v_streak    INTEGER;
BEGIN
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_quiz_date)
  VALUES (v_one_left, 5, 5, v_today - 2),
         (v_two_gap,  5, 5, v_today - 3),
         (v_spare,    5, 5, v_today - 2),
         (v_current,  5, 5, v_today - 1),
         (v_half,     5, 5, v_today - 3),
         (v_half_two, 5, 5, v_today - 3);
  INSERT INTO public.user_streak_freezes (user_id, period, remaining, used, shield_until)
  VALUES (v_one_left, v_month, 1, '[]'::jsonb, NULL),
         (v_two_gap,  v_month, 2, '[]'::jsonb, NULL),
         (v_spare,    v_month, 2, '[]'::jsonb, NULL),
         (v_current,  v_month, 1, '[]'::jsonb, NULL),
         -- A shield raised on the last learning day covered it and the next
         -- (it ended at 00:00 yesterday); only yesterday was missed.
         (v_half,     v_month, 1, '[]'::jsonb, (v_today - 1)::TIMESTAMP AT TIME ZONE 'UTC'),
         (v_half_two, v_month, 2, '[]'::jsonb, (v_today - 1)::TIMESTAMP AT TIME ZONE 'UTC');

  -- Last learnt two days ago, yesterday missed, one protection left: the
  -- Profile used to offer "Protect today and tomorrow", and pressing it ended
  -- the streak.
  SELECT s.granted, s.remaining, s.shield_until, s.used
    INTO v_granted, v_left, v_until, v_used
    FROM public.activate_streak_shield(v_one_left) AS s;
  ASSERT NOT v_granted AND v_left = 1 AND v_until IS NULL AND v_used = '[]'::jsonb,
    format('the shield is refused and nothing is spent: %s, %s left, until %s, used %s', v_granted, v_left, v_until, v_used);
  SELECT s.outcome, s.shield_days INTO v_outcome, v_days FROM public.activate_streak_shield(v_one_left) AS s;
  ASSERT v_outcome = 'would_end_streak' AND v_days = '{}',
    format('the routine says why: %s, days %s', v_outcome, v_days);
  SELECT remaining, shield_until, shield_days INTO v_left, v_until, v_days
    FROM public.user_streak_freezes WHERE user_id = v_one_left;
  ASSERT v_left = 1 AND v_until IS NULL AND v_days = '{}',
    format('the stored row is unchanged: %s left, until %s, days %s', v_left, v_until, v_days);
  v_streak := public.advance_verified_streak(v_one_left);
  ASSERT v_streak = 6, format('learning today bridges yesterday with the protection: expected 6, got %s', v_streak);

  -- Last learnt three days ago, two protections: both are needed.
  SELECT s.granted, s.outcome, s.remaining INTO v_granted, v_outcome, v_left
    FROM public.activate_streak_shield(v_two_gap) AS s;
  ASSERT NOT v_granted AND v_outcome = 'would_end_streak' AND v_left = 2,
    format('two missed days and two protections: refused, %s, %s, %s left', v_granted, v_outcome, v_left);

  -- One missed day and two protections: one pays for the shield, one for
  -- yesterday.
  SELECT s.granted, s.outcome, s.remaining INTO v_granted, v_outcome, v_left
    FROM public.activate_streak_shield(v_spare) AS s;
  ASSERT v_granted AND v_outcome = 'granted' AND v_left = 1,
    format('a spare protection pays for the shield: %s, %s, %s left', v_granted, v_outcome, v_left);
  v_streak := public.advance_verified_streak(v_spare);
  SELECT remaining INTO v_left FROM public.user_streak_freezes WHERE user_id = v_spare;
  ASSERT v_streak = 6 AND v_left = 0, format('and the streak goes on: %s, %s left', v_streak, v_left);

  -- Nothing missed: the shield is raised as before.
  SELECT s.granted, s.outcome, s.remaining INTO v_granted, v_outcome, v_left
    FROM public.activate_streak_shield(v_current) AS s;
  ASSERT v_granted AND v_outcome = 'granted' AND v_left = 0,
    format('with nothing missed the last protection buys the shield: %s, %s, %s left', v_granted, v_outcome, v_left);

  -- A day an earlier shield covered is not missed; the one it did not cover is.
  SELECT s.granted, s.outcome INTO v_granted, v_outcome FROM public.activate_streak_shield(v_half) AS s;
  ASSERT NOT v_granted AND v_outcome = 'would_end_streak',
    format('yesterday still needs the last protection: %s, %s', v_granted, v_outcome);
  SELECT s.granted, s.outcome, s.remaining INTO v_granted, v_outcome, v_left
    FROM public.activate_streak_shield(v_half_two) AS s;
  ASSERT v_granted AND v_outcome = 'granted' AND v_left = 1,
    format('with two left, one covers yesterday and one the shield: %s, %s, %s left', v_granted, v_outcome, v_left);
  v_streak := public.advance_verified_streak(v_half_two);
  ASSERT v_streak = 6, format('and the streak goes on, got %s', v_streak);
END;
$$;
