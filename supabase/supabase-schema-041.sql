-- Migration 041: the progression-velocity review list.
-- Apply after the migrations before it. Safe to re-run.
--
-- It creates one table and four functions and alters nothing that exists, so
-- its order relative to 037-040 does not matter.
--
-- ── What a flag is ─────────────────────────────────────────────────────────
--
-- A note for the owner, and nothing else. Writing one does not delete a score,
-- edit XP, move a rank, hide a row from any board, tighten a rate limit or
-- refuse the next submission. Every learning surface in this product behaves
-- identically for a flagged account and an unflagged one, because the flag is
-- stored here and read only by `/dev`.
--
-- That is deliberate, and it is what makes the thresholds safe to set
-- aggressively. Silent deletion would make a false positive cost a learner
-- their work; a review list makes it cost the owner ten seconds of reading.
--
-- ── Why the row is keyed the way it is ─────────────────────────────────────
--
-- (user_id, surface, signal) rather than one row per event. A script produces
-- thousands of identical events, and a table with one row each is a table
-- nobody reads. So a repeat increments `hits` and moves `last_seen_at`, and the
-- list stays the length of the problem rather than the length of the attack.
--
-- `user_id` is TEXT NOT NULL with '' meaning "no account". The challenge board
-- accepts anonymous runs, and a wave of anonymous impossible-pace submissions is
-- exactly the thing worth seeing; collapsing them onto one counted row shows the
-- wave without storing anything about who sent it. No name, no address, no
-- answer text is stored here — only counts, durations and the signal.
--
-- ── What a status means ────────────────────────────────────────────────────
--
--   open      nobody has looked at it yet
--   reviewed  looked at, no decision made
--   cleared   the owner decided this was a real person
--   confirmed the owner decided this was not
--
-- A new hit re-opens a `reviewed` row, because "seen, undecided" is not a
-- decision. It leaves `cleared` and `confirmed` alone: re-opening a decided row
-- on every subsequent event is how a review list becomes noise and stops being
-- read. The hit is still counted either way, so a cleared account that keeps
-- firing is visible as a rising number rather than as a new alarm.

CREATE TABLE IF NOT EXISTS public.integrity_flags (
  user_id TEXT NOT NULL,
  surface TEXT NOT NULL CHECK (surface IN ('quiz', 'challenge', 'signup')),
  signal TEXT NOT NULL CHECK (signal IN (
    'pace-below-reading-floor',
    'pace-below-reaction-floor',
    'sustained-volume',
    'unattested-signup'
  )),
  severity TEXT NOT NULL DEFAULT 'review' CHECK (severity IN ('review', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'cleared', 'confirmed')),
  subject TEXT,
  hits INTEGER NOT NULL DEFAULT 1 CHECK (hits > 0),
  -- Counts and durations only. A reviewer needs to know how fast, how many and
  -- how often; they never need the answers, and this column must never carry
  -- them.
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  answers_last_hour INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  PRIMARY KEY (user_id, surface, signal)
);

CREATE INDEX IF NOT EXISTS integrity_flags_status_idx
  ON public.integrity_flags (status, last_seen_at DESC);

ALTER TABLE public.integrity_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integrity_flags FROM anon, authenticated;

-- Append one observation.
--
-- The hourly answer count is computed here rather than passed in, because the
-- history lives here: `quiz_submissions` already records one row per graded
-- attempt with a (user_id, created_at DESC) index, and asking the database for
-- a count it can answer from an index is cheaper than another round trip from a
-- serverless function. An anonymous flag gets 0 — there is no account to count.
CREATE OR REPLACE FUNCTION public.record_integrity_flag(
  p_user_id TEXT,
  p_surface TEXT,
  p_signal TEXT,
  p_severity TEXT,
  p_subject TEXT,
  p_evidence JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user   TEXT := COALESCE(p_user_id, '');
  v_sev    TEXT := CASE WHEN p_severity = 'urgent' THEN 'urgent' ELSE 'review' END;
  v_recent INTEGER := 0;
BEGIN
  IF p_surface IS NULL OR p_signal IS NULL THEN
    RAISE EXCEPTION 'integrity_flag_incomplete';
  END IF;

  IF v_user <> '' THEN
    SELECT COUNT(*) INTO v_recent
      FROM public.quiz_submissions
     WHERE user_id = v_user
       AND created_at > NOW() - INTERVAL '1 hour';
  END IF;

  INSERT INTO public.integrity_flags AS f (
    user_id, surface, signal, severity, subject, evidence, answers_last_hour
  )
  VALUES (
    v_user, p_surface, p_signal, v_sev, p_subject,
    COALESCE(p_evidence, '{}'::JSONB), v_recent
  )
  ON CONFLICT (user_id, surface, signal) DO UPDATE
     SET hits = f.hits + 1,
         last_seen_at = NOW(),
         -- Severity ratchets up and never down: the worst thing an account has
         -- done is what a reviewer needs to see first.
         severity = CASE WHEN f.severity = 'urgent' OR v_sev = 'urgent' THEN 'urgent' ELSE 'review' END,
         subject = COALESCE(p_subject, f.subject),
         evidence = COALESCE(p_evidence, f.evidence),
         answers_last_hour = GREATEST(f.answers_last_hour, v_recent),
         status = CASE WHEN f.status = 'reviewed' THEN 'open' ELSE f.status END;
END;
$$;

-- The list, newest activity first. `p_status` NULL means every status.
CREATE OR REPLACE FUNCTION public.integrity_review_list(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id TEXT,
  surface TEXT,
  signal TEXT,
  severity TEXT,
  status TEXT,
  subject TEXT,
  hits INTEGER,
  evidence JSONB,
  answers_last_hour INTEGER,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  note TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT f.user_id, f.surface, f.signal, f.severity, f.status, f.subject, f.hits,
         f.evidence, f.answers_last_hour, f.first_seen_at, f.last_seen_at,
         f.reviewed_at, f.note
    FROM public.integrity_flags f
   WHERE p_status IS NULL OR f.status = p_status
   ORDER BY CASE WHEN f.severity = 'urgent' THEN 0 ELSE 1 END,
            f.last_seen_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 300);
$$;

-- Record the owner's decision on one row. It writes to this table and to
-- nothing else: there is deliberately no path from here to a score, a rank, an
-- account or a board.
CREATE OR REPLACE FUNCTION public.resolve_integrity_flag(
  p_user_id TEXT,
  p_surface TEXT,
  p_signal TEXT,
  p_status TEXT,
  p_note TEXT
)
RETURNS TABLE (
  user_id TEXT,
  surface TEXT,
  signal TEXT,
  severity TEXT,
  status TEXT,
  subject TEXT,
  hits INTEGER,
  evidence JSONB,
  answers_last_hour INTEGER,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('open', 'reviewed', 'cleared', 'confirmed') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  RETURN QUERY
  UPDATE public.integrity_flags f
     SET status = p_status,
         reviewed_at = CASE WHEN p_status = 'open' THEN NULL ELSE NOW() END,
         note = NULLIF(btrim(COALESCE(p_note, '')), '')
   WHERE f.user_id = COALESCE(p_user_id, '')
     AND f.surface = p_surface
     AND f.signal = p_signal
  RETURNING f.user_id, f.surface, f.signal, f.severity, f.status, f.subject, f.hits,
            f.evidence, f.answers_last_hour, f.first_seen_at, f.last_seen_at,
            f.reviewed_at, f.note;
END;
$$;

-- Erasure. Called by the account-deletion handler straight after
-- `delete_user_data`, as an additive function rather than another line inside
-- that one: `delete_user_data` is restated in full by every migration that
-- extends it, and two migrations restating it from different starting points
-- would silently drop one of their additions. The anonymous bucket ('') is not
-- an account and is never deleted by this.
CREATE OR REPLACE FUNCTION public.delete_integrity_data(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(p_user_id, '') = '' THEN RETURN; END IF;
  DELETE FROM public.integrity_flags WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_integrity_flag(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.integrity_review_list(TEXT, INTEGER)                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_integrity_flag(TEXT, TEXT, TEXT, TEXT, TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_integrity_data(TEXT)                                 FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_integrity_flag(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.integrity_review_list(TEXT, INTEGER)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_integrity_flag(TEXT, TEXT, TEXT, TEXT, TEXT)        TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_integrity_data(TEXT)                                 TO service_role;
