-- Migration 042: the referral grant (step D8b, #228). An invite link pays the
-- inviter and the invited friend in coins once the friend has passed a first
-- Learn level. Apply after migration 041 (it uses token_account_key). Safe to
-- re-run.
--
-- The compliant substitute for paying for social follows (handoff sections 1
-- and 7.2): the server itself verifies the event it pays for.
--
--   * referral_codes holds one random eight-character code per account. The
--     invite link is `/?ref=<code>`; the code names no one.
--   * referrals binds an invited account to the account whose code it used,
--     once. record_referral binds only while the invited account is new (the
--     caller passes the creation time Supabase Auth verified) and refuses the
--     account's own code and a pair that already runs the other way.
--   * credit_referral pays both sides once, after the invited account has a
--     passed Learn level in its verified progress. The invited friend is paid
--     under `referral:<account>`; the inviter under `referral:friend:<key>`,
--     where the key is random per referral, so the inviter's ledger never
--     carries the friend's account id. An inviter is paid for at most p_cap
--     friends, counted from the inviter's own ledger; past the cap the friend
--     is still paid and the inviter is not.
--
-- The tables hold the two account ids and timestamps, nothing else. The
-- referrals table has no browser policy at all: an inviter sees counts through
-- the API, never who joined. Every routine is SECURITY DEFINER with an empty
-- search_path and executable by service_role only. credit_referral writes the
-- ledger (through credit_tokens) and the referral row and nothing else: no XP,
-- no progress, no streak, no leaderboard.

-- ---------------------------------------------------------------------------
-- 1. One more ledger reason: 'referral'. Keeps 041's 'milestone' and 'social'.
-- ---------------------------------------------------------------------------
-- Additive, as in 041: the check is rebuilt from the reasons it already allows
-- plus these, so no order of re-running 041 and 042 narrows it.
DO $$
DECLARE
  v_reasons TEXT[] := ARRAY['signup', 'verified-xp', 'purchase', 'refund', 'adjustment', 'milestone', 'social', 'referral'];
  v_current TEXT;
  v_reason  TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_current
    FROM pg_constraint c
   WHERE c.conrelid = 'public.token_ledger'::regclass
     AND c.conname = 'token_ledger_reason_check';
  FOR v_reason IN SELECT (regexp_matches(COALESCE(v_current, ''), '''([^'']+)''', 'g'))[1] LOOP
    IF NOT v_reason = ANY (v_reasons) THEN
      v_reasons := v_reasons || v_reason;
    END IF;
  END LOOP;
  ALTER TABLE public.token_ledger DROP CONSTRAINT IF EXISTS token_ledger_reason_check;
  EXECUTE format(
    'ALTER TABLE public.token_ledger ADD CONSTRAINT token_ledger_reason_check CHECK (reason IN (%s))',
    (SELECT string_agg(quote_literal(r), ', ' ORDER BY o) FROM unnest(v_reasons) WITH ORDINALITY AS t(r, o))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables.
-- ---------------------------------------------------------------------------
-- Crockford's base32 in lower case: no i, l, o or u, so a code read aloud or
-- retyped from a screenshot cannot be misread. Eight characters, 40 bits.
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id    TEXT PRIMARY KEY CHECK (LENGTH(user_id) BETWEEN 8 AND 128),
  code       TEXT NOT NULL UNIQUE CHECK (code ~ '^[0-9a-hjkmnp-tv-z]{8}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  invitee_user_id  TEXT PRIMARY KEY CHECK (LENGTH(invitee_user_id) BETWEEN 8 AND 128),
  -- 'deleted-account' once the inviter deletes their account; the friend is
  -- still paid and nobody else is.
  referrer_user_id TEXT NOT NULL CHECK (LENGTH(referrer_user_id) BETWEEN 8 AND 128),
  -- The inviter's ledger event is `referral:friend:<credit_key>`. Random, so
  -- that event id says nothing about who the friend is.
  credit_key       TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::TEXT, '-', '')
                   CHECK (credit_key ~ '^[0-9a-f]{32}$'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Set once, when the referral was settled. A second completion finds it set.
  credited_at      TIMESTAMPTZ,
  CHECK (invitee_user_id <> referrer_user_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_user_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes_select_own" ON public.referral_codes;
CREATE POLICY "referral_codes_select_own"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::TEXT));

-- Revoke first, then grant back only what a browser may read, as 028 does.
-- referrals gets nothing: a row names both accounts.
REVOKE ALL ON public.referral_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.referrals      FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.referral_codes TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. The inviter's side: the code, and what the Rewards screen shows.
-- ---------------------------------------------------------------------------
-- Returns the account's code (made on first use), how many friends have paid
-- the account so far, how many joined and have not passed a level yet, and the
-- account's own state as an invited friend. Counts only; no account ids.
CREATE OR REPLACE FUNCTION public.referral_summary(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code     TEXT;
  v_try      TEXT;
  v_tries    INTEGER := 0;
  v_inserted INTEGER;
  v_credited INTEGER;
  v_pending  INTEGER;
  v_invited  TEXT;
BEGIN
  IF p_user_id IS NULL OR char_length(p_user_id) < 8 OR char_length(p_user_id) > 128 THEN
    RAISE EXCEPTION 'invalid_referral_account';
  END IF;

  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  WHILE v_code IS NULL LOOP
    v_tries := v_tries + 1;
    IF v_tries > 5 THEN RAISE EXCEPTION 'referral_code_unavailable'; END IF;
    -- Eight random bytes of a v4 UUID (none of the version or variant bits),
    -- each mapped onto the 32 letters.
    SELECT string_agg(substr('0123456789abcdefghjkmnpqrstvwxyz', (get_byte(s.b, i.n) % 32) + 1, 1), '' ORDER BY i.n)
      INTO v_try
      FROM (SELECT uuid_send(gen_random_uuid()) AS b) s,
           unnest(ARRAY[0, 1, 2, 3, 4, 5, 7, 9]) AS i(n);
    INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_try)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted = 1 THEN
      v_code := v_try;
    ELSE
      -- Either another request made this account's code first, or the code
      -- belongs to someone else and the loop draws again.
      SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
    END IF;
  END LOOP;

  SELECT COUNT(*)::INTEGER INTO v_credited
    FROM public.token_ledger
   WHERE user_id = p_user_id AND reason = 'referral' AND reference = 'referral:friend';
  SELECT COUNT(*)::INTEGER INTO v_pending
    FROM public.referrals
   WHERE referrer_user_id = p_user_id AND credited_at IS NULL;
  SELECT CASE WHEN credited_at IS NULL THEN 'pending' ELSE 'credited' END INTO v_invited
    FROM public.referrals
   WHERE invitee_user_id = p_user_id;

  RETURN jsonb_build_object(
    'code', v_code,
    'credited', v_credited,
    'pending', v_pending,
    'invited', v_invited
  );
END;
$$;
REVOKE ALL ON FUNCTION public.referral_summary(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.referral_summary(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. The friend's side: bind the code at sign-up, once.
-- ---------------------------------------------------------------------------
-- p_account_created_at is the creation time of the calling account as Supabase
-- Auth reported it to the server, never a value from the request. Returns:
--   recorded  the referral is bound
--   already   this account was bound before (to anyone)
--   unknown   no account holds this code
--   self      the account's own code, or the inviter was invited by this account
--   closed    the account is older than the sign-up window
CREATE OR REPLACE FUNCTION public.record_referral(
  p_invitee            TEXT,
  p_code               TEXT,
  p_account_created_at TIMESTAMPTZ,
  p_window_hours       INTEGER DEFAULT 48
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer TEXT;
  v_inserted INTEGER;
BEGIN
  IF p_invitee IS NULL OR char_length(p_invitee) < 8 OR char_length(p_invitee) > 128 OR
     p_window_hours IS NULL OR p_window_hours < 1 OR p_window_hours > 720 THEN
    RAISE EXCEPTION 'invalid_referral';
  END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9a-hjkmnp-tv-z]{8}$' THEN RETURN 'unknown'; END IF;

  SELECT user_id INTO v_referrer FROM public.referral_codes WHERE code = p_code;
  IF NOT FOUND THEN RETURN 'unknown'; END IF;
  IF v_referrer = p_invitee THEN RETURN 'self'; END IF;
  -- Two accounts inviting each other would pay each of them twice. The pair is
  -- locked first, in either direction, so two sessions offering each other's
  -- code at the same moment run one after the other and the second one sees
  -- the first one's row (review finding integrity-6).
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'referral-pair:' || LEAST(p_invitee, v_referrer) || ':' || GREATEST(p_invitee, v_referrer), 0));
  PERFORM 1 FROM public.referrals WHERE invitee_user_id = v_referrer AND referrer_user_id = p_invitee;
  IF FOUND THEN RETURN 'self'; END IF;
  PERFORM 1 FROM public.referrals WHERE invitee_user_id = p_invitee;
  IF FOUND THEN RETURN 'already'; END IF;
  IF p_account_created_at IS NULL OR
     p_account_created_at < NOW() - make_interval(hours => p_window_hours) THEN
    RETURN 'closed';
  END IF;

  INSERT INTO public.referrals (invitee_user_id, referrer_user_id)
  VALUES (p_invitee, v_referrer)
  ON CONFLICT (invitee_user_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN CASE WHEN v_inserted = 1 THEN 'recorded' ELSE 'already' END;
END;
$$;
REVOKE ALL ON FUNCTION public.record_referral(TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral(TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. The grant: both sides, once, after the friend's first Learn level.
-- ---------------------------------------------------------------------------
-- Returns:
--   none      this account was not invited
--   waiting   no Learn level passed yet
--   already   settled before; nothing credited
--   credited  both sides paid
--   capped    the friend paid; the inviter has reached p_cap
--   orphaned  the friend paid; the inviter deleted their account
--   off       p_amount is 0
CREATE OR REPLACE FUNCTION public.credit_referral(
  p_invitee TEXT,
  p_subject TEXT DEFAULT 'webdev',
  p_amount  INTEGER DEFAULT 100,
  p_cap     INTEGER DEFAULT 20
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row    public.referrals%ROWTYPE;
  v_data   JSONB;
  v_paid   INTEGER;
  v_status TEXT := 'credited';
BEGIN
  IF p_invitee IS NULL OR char_length(p_invitee) < 8 OR char_length(p_invitee) > 128 OR
     p_subject NOT IN ('webdev', 'geography', 'math', 'history', 'biology', 'chess', 'poker') OR
     p_amount IS NULL OR p_amount < 0 OR p_amount > 100000 OR
     p_cap IS NULL OR p_cap < 0 OR p_cap > 1000 THEN
    RAISE EXCEPTION 'invalid_referral_credit';
  END IF;
  IF p_amount = 0 THEN RETURN 'off'; END IF;

  -- The row lock makes two completions landing together settle once.
  SELECT * INTO v_row FROM public.referrals WHERE invitee_user_id = p_invitee FOR UPDATE;
  IF NOT FOUND THEN RETURN 'none'; END IF;
  IF v_row.credited_at IS NOT NULL THEN RETURN 'already'; END IF;

  -- A passed Learn level, read from the verified progress the server wrote.
  SELECT data INTO v_data FROM public.roadmap_progress WHERE user_id = p_invitee;
  IF v_data IS NULL OR NOT jsonb_path_exists(v_data, '$.*.levels.*.passed ? (@ == true)') THEN
    RETURN 'waiting';
  END IF;

  PERFORM public.credit_tokens(
    p_invitee, 'referral:' || public.token_account_key(p_invitee), p_subject, p_amount,
    'referral', 'referral:invited'
  );

  IF v_row.referrer_user_id = 'deleted-account' THEN
    v_status := 'orphaned';
  ELSE
    -- One inviter's friends settle one at a time, so two cannot both see the
    -- last place under the cap.
    PERFORM pg_advisory_xact_lock(hashtextextended('referral:' || v_row.referrer_user_id, 0));
    SELECT COUNT(*)::INTEGER INTO v_paid
      FROM public.token_ledger
     WHERE user_id = v_row.referrer_user_id AND reason = 'referral' AND reference = 'referral:friend';
    IF v_paid < p_cap THEN
      PERFORM public.credit_tokens(
        v_row.referrer_user_id, 'referral:friend:' || v_row.credit_key, p_subject, p_amount,
        'referral', 'referral:friend'
      );
    ELSE
      v_status := 'capped';
    END IF;
  END IF;

  UPDATE public.referrals SET credited_at = NOW() WHERE invitee_user_id = p_invitee;
  RETURN v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_referral(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referral(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Account deletion. A separate routine, as 039 and 041 do, so no migration
--    has to restate delete_user_data (which removes the ledger and balance).
--    The account's code goes, its own referral row goes, and a referral it
--    made keeps the friend's side under 'deleted-account'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_referral_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.referral_codes WHERE user_id = p_user_id;
  DELETE FROM public.referrals WHERE invitee_user_id = p_user_id;
  UPDATE public.referrals SET referrer_user_id = 'deleted-account' WHERE referrer_user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_referral_data(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_referral_data(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Rollback (manual): DROP the four routines and the two tables. Restore
-- token_ledger_reason_check from migration 041 only after the ledger holds no
-- 'referral' rows, as 041's own rollback note says for its reasons.
-- ---------------------------------------------------------------------------
