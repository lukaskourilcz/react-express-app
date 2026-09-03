/** GitHub garden operations on `api/user/[op].ts`: connect, pick a
 * repository, read status, retry queued commits, disconnect. All require a
 * signed-in learner and the devShark product scope. */

import type { VercelRequest, VercelResponse } from './vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, requireAuthSub, withTimeout, createLogger } from './http';
import { enforceRateLimit, RATE_LIMITS } from './rate-limit';
import { deploymentSubjectIds } from './product-scope';
import { decodeGithubConnectState, encodeGithubConnectState } from './quiz-tokens';
import {
  GithubError,
  getInstallation,
  githubAppSlug,
  installationToken,
  isGithubAppConfigured,
  listInstallationRepos,
  retryQueued,
  type RepoInfo,
} from './github-app';
import type { GithubConnectionResponse, GithubConnectStartResponse, GithubSyncResponse } from '../shared/coding-api';

const logEvent = createLogger('github');

interface ConnectionRow {
  installation_id: number;
  account_login: string;
  account_id: number;
  repo_full_name: string | null;
  default_branch: string | null;
  status: 'pending_repo' | 'active' | 'broken';
  last_error: string | null;
  last_commit_at: string | null;
}
const FIELDS = 'installation_id,account_login,account_id,repo_full_name,default_branch,status,last_error,last_commit_at';

const unavailable = (): GithubConnectionResponse => ({
  available: false, status: 'not_connected', accountLogin: null, repoFullName: null, defaultBranch: null, lastCommitAt: null, queued: 0, lastError: null,
});

async function readConnection(supabase: SupabaseClient, userId: string): Promise<ConnectionRow | null> {
  const { data, error } = await withTimeout(supabase.from('github_connections').select(FIELDS).eq('user_id', userId).maybeSingle());
  if (error) throw new Error('db_error');
  return (data as ConnectionRow | null) ?? null;
}

async function queuedCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await withTimeout(supabase.from('github_commits').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'queued'));
  return count ?? 0;
}

function describe(row: ConnectionRow | null, queued: number, repositories?: RepoInfo[]): GithubConnectionResponse {
  if (!row) return { ...unavailable(), available: true };
  return {
    available: true,
    status: row.status,
    accountLogin: row.account_login,
    repoFullName: row.repo_full_name,
    defaultBranch: row.default_branch,
    lastCommitAt: row.last_commit_at,
    queued,
    lastError: row.last_error,
    ...(repositories ? { repositories: repositories.map((repo) => ({ fullName: repo.full_name, defaultBranch: repo.default_branch, private: repo.private, fork: repo.fork })) } : {}),
  };
}

function gate(req: VercelRequest, res: VercelResponse): boolean {
  if (!deploymentSubjectIds().includes('webdev')) {
    jsonError(res, 404, 'not_available', 'The GitHub garden is not part of this product');
    return false;
  }
  return true;
}

export async function handleGithub(op: string, req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!gate(req, res)) return;
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!isGithubAppConfigured()) {
    if (op === 'github-connection' && req.method === 'GET') return res.json(unavailable());
    return jsonError(res, 503, 'not_configured', 'The GitHub garden is not configured');
  }

  try {
    if (op === 'github-connection') {
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return jsonError(res, 405, 'method_not_allowed', 'Method not allowed'); }
      const row = await readConnection(supabase, userId);
      const queued = row ? await queuedCount(supabase, userId) : 0;
      let repositories: RepoInfo[] | undefined;
      if (row && row.status === 'pending_repo') {
        try {
          repositories = (await listInstallationRepos(await installationToken(row.installation_id))).filter((repo) => !repo.fork && repo.owner.id === row.account_id);
        } catch { repositories = []; }
      }
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json(describe(row, queued, repositories));
    }

    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return jsonError(res, 405, 'method_not_allowed', 'Method not allowed'); }

    if (op === 'github-connect-start') {
      if (!(await enforceRateLimit(req, res, RATE_LIMITS.githubConnect))) return;
      const state = encodeGithubConnectState(userId);
      const out: GithubConnectStartResponse = { url: `https://github.com/apps/${encodeURIComponent(githubAppSlug())}/installations/new?state=${encodeURIComponent(state)}` };
      return res.json(out);
    }

    if (op === 'github-connect-finish') {
      if (!(await enforceRateLimit(req, res, RATE_LIMITS.githubConnect))) return;
      const body = (req.body || {}) as { installationId?: unknown; state?: unknown };
      const installationId = Number(body.installationId);
      if (!Number.isInteger(installationId) || installationId <= 0 || typeof body.state !== 'string') return jsonError(res, 400, 'bad_request', 'installationId and state are required');
      const state = decodeGithubConnectState(body.state);
      if (!state || state.userId !== userId) return jsonError(res, 400, 'invalid_state', 'The connection request expired. Start again from your profile.');
      const installation = await getInstallation(installationId);
      if (installation.account.type !== 'User') return jsonError(res, 400, 'organisation_not_supported', 'Install the app on your own account, not an organisation');
      const repos = (await listInstallationRepos(await installationToken(installationId))).filter((repo) => !repo.fork && repo.owner.id === installation.account.id);
      const single = repos.length === 1 ? repos[0] : null;
      const upsert = await withTimeout(supabase.from('github_connections').upsert({
        user_id: userId,
        installation_id: installationId,
        account_login: installation.account.login,
        account_id: installation.account.id,
        repo_full_name: single?.full_name ?? null,
        default_branch: single?.default_branch ?? null,
        status: single ? 'active' : 'pending_repo',
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }));
      if (upsert.error) return jsonError(res, 500, 'db_error', 'Could not save the connection');
      logEvent({ status: 200, kind: 'connected', repos: repos.length });
      const row = await readConnection(supabase, userId);
      return res.json(describe(row, 0, single ? undefined : repos));
    }

    if (op === 'github-repo') {
      const body = (req.body || {}) as { repoFullName?: unknown };
      if (typeof body.repoFullName !== 'string' || !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(body.repoFullName)) return jsonError(res, 400, 'bad_request', 'repoFullName is required');
      const row = await readConnection(supabase, userId);
      if (!row) return jsonError(res, 409, 'not_connected', 'Connect GitHub first');
      const repos = await listInstallationRepos(await installationToken(row.installation_id));
      const chosen = repos.find((repo) => repo.full_name === body.repoFullName);
      if (!chosen || chosen.fork || chosen.owner.id !== row.account_id) return jsonError(res, 400, 'bad_repo', 'Pick a repository you own that the app is installed on');
      const update = await withTimeout(supabase.from('github_connections').update({ repo_full_name: chosen.full_name, default_branch: chosen.default_branch, status: 'active', last_error: null, updated_at: new Date().toISOString() }).eq('user_id', userId));
      if (update.error) return jsonError(res, 500, 'db_error', 'Could not save the repository');
      return res.json(describe(await readConnection(supabase, userId), await queuedCount(supabase, userId)));
    }

    if (op === 'github-sync') {
      if (!(await enforceRateLimit(req, res, RATE_LIMITS.githubSync))) return;
      const row = await readConnection(supabase, userId);
      if (!row) return jsonError(res, 409, 'not_connected', 'Connect GitHub first');
      if (row.status === 'broken') {
        // A reinstall may have fixed it: probe the installation before retrying.
        try {
          await getInstallation(row.installation_id);
          await withTimeout(supabase.from('github_connections').update({ status: row.repo_full_name ? 'active' : 'pending_repo', last_error: null, updated_at: new Date().toISOString() }).eq('user_id', userId));
        } catch (error) {
          if (error instanceof GithubError) return res.json({ committed: 0, failed: 0, remaining: await queuedCount(supabase, userId) } satisfies GithubSyncResponse);
          throw error;
        }
      }
      const out: GithubSyncResponse = await retryQueued(supabase, userId, 20);
      return res.json(out);
    }

    if (op === 'github-disconnect') {
      const deleted = await withTimeout(supabase.from('github_connections').delete().eq('user_id', userId));
      await withTimeout(supabase.from('github_commits').delete().eq('user_id', userId));
      if (deleted.error) return jsonError(res, 500, 'db_error', 'Could not disconnect');
      logEvent({ status: 200, kind: 'disconnected' });
      return res.json({ ok: true });
    }

    return jsonError(res, 404, 'unknown_op', `Unknown user op: ${op}`);
  } catch (error) {
    if (error instanceof GithubError) {
      logEvent({ status: error.status, kind: 'github_error', op });
      return jsonError(res, 502, 'github_error', 'GitHub did not accept the request. Try again in a moment.');
    }
    logEvent({ status: 500, kind: 'error', op, category: error instanceof Error ? error.name : 'unknown' });
    return jsonError(res, 500, 'internal_error', 'Could not handle the GitHub request');
  }
}
