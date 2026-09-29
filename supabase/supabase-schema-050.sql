-- Migration 050: one devShark account per GitHub App installation (2026-09-29).
-- Apply after 049. Safe to re-run: the DELETE finds nothing once the index
-- exists, and the index is created only when missing. No routine changes.
--
-- github-connect-finish used to accept any installation id of the devShark
-- GitHub App, so a second account could connect someone else's installation
-- and commit into their repository. The handler now proves with a one-time
-- GitHub user authorization that the installation belongs to the person
-- connecting it, and this index makes sure an installation is held by at most
-- one devShark account.
--
-- An installation held by more than one account cannot be told apart from a
-- hijack: at least one of those accounts is not the owner, and the database
-- does not know which. Every row of such an installation is removed, so the
-- owner reconnects through the checked flow. Production never had the garden
-- configured, so the table is expected to be empty and this removes nothing.
-- The removed accounts' queued commits stay queued and go to the repository
-- they connect next; nothing is committed while they have no connection.
--
-- The code before this change keeps working: its upsert on user_id succeeds
-- for everyone except a second account holding the same installation, which
-- now gets its generic "could not save" error.

DELETE FROM public.github_connections
WHERE installation_id IN (
  SELECT installation_id
  FROM public.github_connections
  GROUP BY installation_id
  HAVING count(*) > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS github_connections_installation_id_key
  ON public.github_connections (installation_id);
