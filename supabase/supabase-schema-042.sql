-- Migration 042: the puzzle sprint's board and its proof-completeness check.
-- Apply after the migrations before it. Safe to re-run.
--
-- It touches `challenge_scores` and `quiz_submissions` only, and creates no
-- object that 038-041 create, so the order between it and them does not matter.
--
-- ── Why the sprint shares a table ──────────────────────────────────────────
--
-- A sprint score and a classic Biggest-Shark score are the same measurement —
-- correct answers in one verified run — taken under different clocks. They
-- must never be ranked together, because three minutes against three strikes
-- is not a comparison. That is a filter, not a second table: `challenge_scores`
-- already has the subject scoping, the unique `run_id`, the name and score
-- constraints, row-level security, and it is already emptied for a learner by
-- the account-deletion routine in migration 021. A `sprint_scores` table would
-- have to re-earn every one of those, and the deletion routine would have to
-- learn about it or quietly leave rows behind.
--
-- Every existing row predates the sprint and is therefore classic, which is
-- what the default says. The Hall of Fame the product already shows is
-- unchanged by this migration.
ALTER TABLE public.challenge_scores
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'classic';

ALTER TABLE public.challenge_scores
  DROP CONSTRAINT IF EXISTS challenge_scores_mode_valid;
ALTER TABLE public.challenge_scores
  ADD CONSTRAINT challenge_scores_mode_valid
  CHECK (mode IN ('classic', 'sprint'));

-- The board reads one subject and one mode, ordered by score then age.
CREATE INDEX IF NOT EXISTS challenge_scores_mode_rank_idx
  ON public.challenge_scores (subject, mode, score DESC, created_at);

-- ── Why the ledger is counted ──────────────────────────────────────────────
--
-- In the classic run a withheld score proof can only lower a score, because a
-- run is accepted only with its three terminal strikes. In a sprint a wrong
-- answer costs ten seconds, so withholding one buys clock: the browser could
-- grade an answer, drop the proof, and submit a run that looks faster than it
-- was. The proofs are sealed and cannot be forged, but nothing inside them says
-- how many there should be.
--
-- The grading ledger does. Every graded answer in a run writes one row keyed
-- `<run id>:<question id>` with the run id as its attempt id, and the browser
-- neither writes that row nor can edit it. Counting the rows gives the number
-- of answers the server actually graded, which the completion handler compares
-- against the proofs it was handed.
--
-- The counting function is service-role only and takes the same id shape
-- migration 023 validates, so it can neither be called from a browser session
-- nor be used to probe arbitrary strings.
CREATE INDEX IF NOT EXISTS quiz_submissions_attempt_idx
  ON public.quiz_submissions (attempt_id);

CREATE OR REPLACE FUNCTION public.count_attempt_submissions(p_attempt_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_attempt_id !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RAISE EXCEPTION 'invalid_attempt_id';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.quiz_submissions
   WHERE attempt_id = p_attempt_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.count_attempt_submissions(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_attempt_submissions(TEXT) TO service_role;
