-- Migration 009: admin /dev console — question overrides and game settings.
-- Apply after migrations 001-008.
--
-- Questions themselves live in code (lib/quiz-data.ts). Rather than migrate the
-- whole bank into the DB, the /dev console stores *overrides* here: an edited
-- copy of a base question, a brand-new ("custom") question, or a soft-delete
-- flag. The quiz API merges these onto the static base at serve time and falls
-- back to the static set whenever this table is unavailable.

CREATE TABLE IF NOT EXISTS question_edits (
  question_id   TEXT PRIMARY KEY,        -- base question id, or "dev-…" for custom
  is_custom     BOOLEAN NOT NULL DEFAULT FALSE,  -- true = no base counterpart
  deleted       BOOLEAN NOT NULL DEFAULT FALSE,  -- true = hide from the quiz
  question      TEXT,
  options       JSONB,                   -- string[]
  correct_index INTEGER,                 -- index into options
  explanation   TEXT,
  introduction  TEXT,
  category      TEXT,
  tags          JSONB,                   -- string[]
  difficulty    INTEGER,                 -- 1..5
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Key/value store for game-wide settings managed from /dev → Settings.
-- A single row keyed 'game' holds the whole settings object as JSON.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Both tables are written and read exclusively by the password-gated
-- /api/admin endpoint and the quiz API, which use the service-role key
-- (bypasses RLS). Enabling RLS with no policies denies all anon/PostgREST
-- access — these tables hold answer keys and config, so they must never be
-- world-readable via the public anon key.
ALTER TABLE question_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings   ENABLE ROW LEVEL SECURITY;
