-- Per-question importance override for the /dev console.
--
-- Importance (1–10, "how important is this for a student to know?") is normally
-- the hand-judged score baked into the app (lib/question-importance.ts). This
-- column lets the owner override a single question's score from the editor; the
-- questions store reads it on top of the baked score (DB override → baked →
-- heuristic). The write is best-effort in code, so the app keeps working before
-- this migration is applied — run it to enable persisting per-question overrides.

ALTER TABLE question_edits
  ADD COLUMN IF NOT EXISTS importance INTEGER
  CHECK (importance IS NULL OR (importance BETWEEN 1 AND 10));
