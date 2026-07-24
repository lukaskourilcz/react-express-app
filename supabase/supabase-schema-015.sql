-- Auth events log for the /dev console "Logs" tab.
--
-- An append-only record of authentication actions (registrations and logins) so
-- the owner can see who is signing up / signing in. Rows are written by the
-- server (api/user/authevent) after it verifies the caller's Supabase token, and
-- read by the password-gated admin endpoint (api/admin/logs). The writer is
-- best-effort, so the app keeps working before this migration is applied — run it
-- to start collecting the log.
--
-- event_type is 'register' for a user's first-ever event, otherwise 'login'.

CREATE TABLE IF NOT EXISTS auth_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  email      TEXT,
  provider   TEXT,                       -- e.g. 'google'
  event_type TEXT NOT NULL CHECK (event_type IN ('register', 'login')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id, created_at DESC);

-- Written and read only by the server (service-role bypasses RLS). Enabling RLS
-- with no policies denies all anon/PostgREST access — this is an admin-only log
-- that can contain emails, so it must never be world-readable via the anon key.
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
