-- Migration 019: persist skill-check unlocks alongside roadmap progress.
--
-- The skill-check assessment grants extra topic unlocks that aren't derivable
-- from level pass-state, so they need their own store. Keeping them in the
-- same row as roadmap_progress keeps the sync path simple — one upsert covers
-- both progress and unlocks per save.
--
-- Shape of `extra`:
--   { "unlocked": ["typescript", "react", ...] }

ALTER TABLE roadmap_progress
  ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
