-- Migration 040: a monthly ceiling on the merchandise package a finished
-- learning path earns.
-- Apply after migrations 001-039. Safe to re-run.
--
-- ── What this changes, and what it deliberately does not ───────────────────
--
-- Migration 035 made the package a one-time claim per (user, path), owned by
-- the server and conditional on `path_is_complete`. All of that stands. What it
-- had no answer for is the other half of the question: a package is a real
-- object with a real landed cost, and the number of them leaving in a month was
-- whatever number of learners happened to finish. That is an unbounded cost
-- attached to success, which is exactly the wrong thing to leave unbounded.
--
-- So the claim now takes a cap. The cap is the owner's figure, read from game
-- settings and passed in; this migration invents no number and defaults to
-- NULL, which behaves exactly as 035 did. What it adds is the guarantee that
-- once a number exists, it holds:
--
--   * The month is counted here, inside the claiming transaction, from
--     `path_reward_claims` — the same table the one-time guarantee lives in.
--     No caller may assert the count.
--   * Claimants in one month serialize on a transaction advisory lock keyed by
--     that month, so two simultaneous claims cannot both take the last slot and
--     the check is a guarantee rather than a good intention.
--   * Reaching the cap raises `package_cap_reached` before anything is written,
--     so a refused claim leaves no order, no claim row and no reserved stock.
--
-- ── What the cap is not ────────────────────────────────────────────────────
--
-- It is not a change to anyone's learning. A capped month posts no parcel; it
-- takes no XP, no score, no rank, no streak, no badge and no access, and the
-- learner's completion is untouched. Because the claim row is written only on a
-- granted claim, the eligibility they earned is still there next month — the
-- month is full, the reward is not withdrawn.
--
-- It is also not a queue. Holding a claim for later would mean storing an
-- address for an unbounded time against a parcel nobody has committed to
-- sending; the honest version is to say the month is full and let the learner
-- claim when it is not.

-- ── 1. Counting a month ────────────────────────────────────────────────────

-- The claim table is small and read once per claim, but the month range is the
-- only thing it is ever scanned by.
CREATE INDEX IF NOT EXISTS path_reward_claims_claimed_at_idx
  ON public.path_reward_claims (claimed_at);

-- How many packages this calendar month has already granted, across everybody.
-- UTC, because every other date in this schema is UTC and a cap that moves with
-- a viewer's timezone is two different caps.
CREATE OR REPLACE FUNCTION public.path_rewards_claimed_this_month()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
    FROM public.path_reward_claims
   WHERE claimed_at >= (date_trunc('month', (NOW() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC');
$$;

REVOKE ALL ON FUNCTION public.path_rewards_claimed_this_month() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.path_rewards_claimed_this_month() TO service_role;

-- ── 2. The claim, with the cap ─────────────────────────────────────────────
--
-- The parameter list grows by one, so the 035 function is dropped rather than
-- replaced: leaving both would make a ten-argument call ambiguous against the
-- eleven-argument one with its default, and PostgREST would fail every claim
-- with a function-not-unique error. Dropping first is what makes the
-- `p_cap INTEGER DEFAULT NULL` safe.
--
-- Everything below the cap check is migration 035's body unchanged. It is
-- restated in full because that is how this schema is read: the newest
-- definition of a routine is the definition.

DROP FUNCTION IF EXISTS public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

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
  p_country  TEXT,
  -- NULL means the owner has not set a cap, and the routine then behaves
  -- exactly as it did in 035. Zero is a decision, not a missing one: it means
  -- no packages are posted this month, and it is honoured.
  p_cap      INTEGER DEFAULT NULL
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
  v_existing    public.path_reward_claims%ROWTYPE;
  v_order       TEXT;
  v_month_start TIMESTAMPTZ;
  v_month_count INTEGER;
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

  -- The cap, counted here so nothing outside this transaction can be wrong
  -- about it. The advisory lock is held until the transaction ends and is keyed
  -- by the month as YYYYMM, so everybody claiming in the same month queues
  -- behind one another and the count below cannot be stale by the time the
  -- insert happens. Claims are rare; the contention this creates is a few rows
  -- a day waiting on each other for the length of one insert.
  IF p_cap IS NOT NULL THEN
    v_month_start := (date_trunc('month', (NOW() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC');
    PERFORM pg_advisory_xact_lock(4711, TO_CHAR(v_month_start, 'YYYYMM')::INTEGER);
    SELECT COUNT(*)::INTEGER INTO v_month_count
      FROM public.path_reward_claims
     WHERE claimed_at >= v_month_start
       AND claimed_at <  v_month_start + INTERVAL '1 month';
    IF v_month_count >= p_cap THEN
      -- Raised before any write, so a full month leaves no order, no claim row
      -- and no address behind. The learner keeps the completion that earned it.
      RAISE EXCEPTION 'package_cap_reached';
    END IF;
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

REVOKE ALL ON FUNCTION public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_path_reward(
  TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) TO service_role;
