-- Migration 016: remove custom questions entirely.
--
-- The /dev console can author brand-new ("custom") questions, stored in
-- `question_edits` with is_custom = TRUE and a "dev-…" question_id (they have no
-- base counterpart in lib/quiz-data.ts). This migration deletes all such rows so
-- custom questions no longer appear in the quiz, learning paths, or /dev console.
--
-- Base-question overrides (edits and soft-deletes, is_custom = FALSE) are left
-- untouched. Safe to re-run: it only ever deletes custom rows.

DELETE FROM question_edits WHERE is_custom = TRUE;
