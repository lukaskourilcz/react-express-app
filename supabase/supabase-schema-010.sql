-- Migration 010: per-question Czech (cs) translation overrides for /dev.
-- Apply after migration 009.
--
-- Extends question_edits with the translatable text fields. A null column means
-- "no cs override for that field" — the quiz falls back to the static cs bank
-- (quiz-data.cs.ts) for un-edited base questions, or to English otherwise.
-- cs_options, when set, MUST match the English options length/order so the
-- stored correct-answer index stays valid.

ALTER TABLE question_edits ADD COLUMN IF NOT EXISTS cs_question     TEXT;
ALTER TABLE question_edits ADD COLUMN IF NOT EXISTS cs_options      JSONB;  -- string[]
ALTER TABLE question_edits ADD COLUMN IF NOT EXISTS cs_introduction TEXT;
ALTER TABLE question_edits ADD COLUMN IF NOT EXISTS cs_explanation  TEXT;
