-- Migration 011: per-user roadmap ("Learn") progress.
-- Stores each user's learning-path progress (which levels and checkpoints they
-- have passed, and best scores) as a single JSON blob. The blob is small and
-- merged client-side, so one row per user is plenty. Apply after migrations
-- 001-010.
--
-- Shape of `data` (mirrors the client store):
--   {
--     "<topic>": {
--       "levels":      { "<level>":      { "passed": bool, "bestPct": int } },
--       "checkpoints": { "<checkpoint>": { "passed": bool, "bestPct": int } }
--     }
--   }

CREATE TABLE IF NOT EXISTS roadmap_progress (
  user_id    TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;

-- Each user can only see/manage their own progress. The server-side API uses the
-- service-role key (bypasses RLS) and scopes every query by the verified token
-- subject; these policies are defense-in-depth for any direct PostgREST access.
CREATE POLICY "roadmap_progress_select_own"
  ON roadmap_progress FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "roadmap_progress_insert_own"
  ON roadmap_progress FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "roadmap_progress_update_own"
  ON roadmap_progress FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
