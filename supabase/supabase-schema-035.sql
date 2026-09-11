-- Migration 035: buying a streak protection with earned tokens, and the
-- merchandise package a finished learning path earns.
-- Apply after migrations 001-034. Safe to re-run.
--
-- ── The invariant this changes, stated plainly ─────────────────────────────
--
-- CLAUDE.md has said that shop items "never change ... streaks". That sentence
-- was already inaccurate before this migration: since 024, returning after a
-- missed day spends a monthly protection and the streak continues instead of
-- resetting. Protections have always changed streaks — they just were not
-- purchasable.
--
-- The owner has asked for extra protections to be buyable. This migration does
-- that in the narrowest form the request allows, and the documents are being
-- corrected to say what the code does rather than left saying something it
-- does not:
--
--   * The currency is tokens, and tokens are earned by learning — 10% of
--     verified XP (TOKENS_PER_XP). No money buys a protection. The path is
--     learn more, then protect a streak; it is not pay to win.
--   * A protection changes the day count of a streak and nothing else. It
--     grants no XP, no score, no rank, no badge, no access, no content and no
--     leaderboard position. Every leaderboard in this product ranks by correct
--     answers and accuracy; none of them ranks by streak.
--   * The monthly ceiling still applies. Buying tops the same budget back up to
--     two and never beyond it, so the most anybody can hold is the two everyone
--     gets free. Money cannot buy a deeper reserve than a learner who spends
--     nothing.
--
-- ── The merchandise package ────────────────────────────────────────────────
--
-- Finishing a whole learning path earns the package: a t-shirt, a mug and a
-- sticker set. That is a reward FOR learning, which is the opposite direction
-- from a purchase that affects learning, and it changes nothing about anyone's
-- progress. It is a one-time claim, and the server owns one-time claims: the
-- grant is keyed by (user, path) so completing twice, or two devices reporting
-- the same completion, grants once.

-- ── 1. Topping the protection budget up ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_streak_protection(
  p_user_id TEXT,
  p_subject TEXT,
  p_price   INTEGER
)
RETURNS TABLE (bought BOOLEAN, period TEXT, remaining INTEGER, used JSONB, shield_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row    public.user_streak_freezes%ROWTYPE;
  v_period TEXT := TO_CHAR((NOW() AT TIME ZONE 'UTC')::DATE, 'YYYY-MM');
BEGIN
  IF p_price <= 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;

  PERFORM public.refresh_streak_freezes(p_user_id);
  SELECT * INTO v_row FROM public.user_streak_freezes
   WHERE user_id = p_user_id FOR UPDATE;

  -- The ceiling is the point. Two is what everybody gets; buying restores what
  -- was spent and never exceeds it, so no amount of learning-earned currency
  -- buys a bigger reserve than a learner who spends nothing has.
  IF COALESCE(v_row.remaining, 0) >= 2 THEN
    RETURN QUERY SELECT FALSE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
    RETURN;
  END IF;

  -- The event id carries the month and the balance being restored, so a
  -- replayed request within the same month at the same balance is the same
  -- event and charges once. debit_tokens raises insufficient_tokens itself.
  PERFORM public.debit_tokens(
    p_user_id,
    'streak-protection:' || p_user_id || ':' || v_period || ':' || COALESCE(v_row.remaining, 0)::TEXT,
    p_subject, p_price, 'purchase', 'streak-protection'
  );

  UPDATE public.user_streak_freezes
     SET remaining = LEAST(COALESCE(v_row.remaining, 0) + 1, 2),
         period = v_period,
         updated_at = NOW()
   WHERE user_id = p_user_id
   RETURNING * INTO v_row;

  RETURN QUERY SELECT TRUE, v_row.period, v_row.remaining, v_row.used, v_row.shield_until;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_streak_protection(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_streak_protection(TEXT, TEXT, INTEGER) TO service_role;

-- ── 2. The package a finished path earns ───────────────────────────────────
--
-- One row per learner per path, and the primary key is what makes the claim
-- one-time rather than a check the caller is trusted to have done.

CREATE TABLE IF NOT EXISTS public.path_reward_claims (
  user_id    TEXT        NOT NULL,
  path_id    TEXT        NOT NULL,
  order_id   TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, path_id)
);

ALTER TABLE public.path_reward_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.path_reward_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.path_reward_claims TO authenticated;

DROP POLICY IF EXISTS "path_reward_claims_select_own" ON public.path_reward_claims;
CREATE POLICY "path_reward_claims_select_own"
  ON public.path_reward_claims FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- Whether the learner has finished every module of a path. Derived from the
-- progress rows the graders wrote, never from anything the browser says.
CREATE OR REPLACE FUNCTION public.path_is_complete(
  p_user_id TEXT,
  p_path_id TEXT,
  p_modules INTEGER
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p_modules > 0 AND COUNT(*) >= p_modules
    FROM public.learning_path_progress pr
    JOIN public.learning_path_enrollments e ON e.enrollment_id = pr.enrollment_id
   WHERE e.user_id = p_user_id
     AND e.path_id = p_path_id
     AND pr.completed_at IS NOT NULL;
$$;

-- Claim it.
--
-- The address is part of the claim rather than a later step, because
-- merch_orders requires one: an order with no address is not a thing this
-- schema can hold, and inventing a placeholder to fill the columns would put a
-- fake address in a table the owner ships from.
--
-- The order is created unpaid and unpriced. The package is earned, so there is
-- nothing to charge — but merchandise is still unconfigured (no supplier, no
-- stock, no postage), so what a claim produces is an order waiting for the
-- owner to fulfil, not a parcel. `docs/rewards-launch.md` lists what has to
-- exist before anything ships.
CREATE OR REPLACE FUNCTION public.claim_path_reward(
  p_user_id  TEXT,
  p_path_id  TEXT,
  p_modules  INTEGER,
  p_shirt    TEXT,
  p_name     TEXT,
  p_line1    TEXT,
  p_line2    TEXT,
  p_city     TEXT,
  p_postal   TEXT,
  p_country  TEXT
)
-- The OUT column is not called `order_id`: ON CONFLICT (order_id) cannot be
-- table-qualified, so an OUT parameter of that name is ambiguous against the
-- column and the insert fails at run time.
RETURNS TABLE (granted BOOLEAN, reward_order_id TEXT, already BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.path_reward_claims%ROWTYPE;
  v_order    TEXT;
BEGIN
  IF p_shirt NOT IN ('S', 'M', 'L', 'XL', 'XXL') THEN RAISE EXCEPTION 'invalid_variant'; END IF;
  IF btrim(COALESCE(p_name, ''))   = '' OR btrim(COALESCE(p_line1, '')) = ''
     OR btrim(COALESCE(p_city, '')) = '' OR btrim(COALESCE(p_postal, '')) = ''
     OR p_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_address';
  END IF;

  SELECT * INTO v_existing FROM public.path_reward_claims
   WHERE user_id = p_user_id AND path_id = p_path_id;
  IF FOUND THEN
    RETURN QUERY SELECT FALSE, v_existing.order_id, TRUE;
    RETURN;
  END IF;

  IF NOT public.path_is_complete(p_user_id, p_path_id, p_modules) THEN
    RAISE EXCEPTION 'path_not_complete';
  END IF;

  -- Derived from the pair, so a retry produces the same order rather than a
  -- second one. md5 keeps it inside the id format the table checks.
  v_order := 'reward-' || substr(md5(p_user_id || ':' || p_path_id), 1, 24);

  INSERT INTO public.merch_orders (
    order_id, user_id, payment_kind, state, total_minor, currency, token_total,
    ship_name, ship_line1, ship_line2, ship_city, ship_postal, ship_country
  ) VALUES (
    v_order, p_user_id, 'tokens', 'awaiting_payment', 0, 'EUR', 0,
    btrim(p_name), btrim(p_line1), NULLIF(btrim(COALESCE(p_line2, '')), ''),
    btrim(p_city), btrim(p_postal), p_country
  )
  ON CONFLICT (order_id) DO NOTHING;

  -- An item with no variant carries the empty string, not NULL: `variant` is
  -- part of the primary key, and a NULL in a key would let the same item be
  -- inserted twice.
  INSERT INTO public.merch_order_items (order_id, sku, variant, quantity, unit_minor, unit_tokens)
  VALUES (v_order, 't-shirt', p_shirt, 1, 0, 0),
         (v_order, 'mug', '', 1, 0, 0),
         (v_order, 'sticker-set', '', 1, 0, 0)
  ON CONFLICT DO NOTHING;

  -- The claim row is written last and its primary key is the guarantee: a
  -- second call finds it and grants nothing, whatever raced it.
  INSERT INTO public.path_reward_claims (user_id, path_id, order_id)
  VALUES (p_user_id, p_path_id, v_order);

  RETURN QUERY SELECT TRUE, v_order, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.path_is_complete(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.path_is_complete(TEXT, TEXT, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;
