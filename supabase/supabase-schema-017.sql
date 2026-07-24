-- Migration 017: remove the APT and Custom categories entirely.
--
-- The "apt" and "custom" categories were dropped from the app. This deletes any
-- question overrides in those categories, plus all custom (dev-authored) rows,
-- so no APT/Custom questions remain. Safe to re-run.

DELETE FROM question_edits WHERE category IN ('apt', 'custom');
DELETE FROM question_edits WHERE is_custom = TRUE;
