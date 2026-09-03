/** GitHub App client for the garden.
 *
 * The learner installs the app on a repository they own. The server holds the
 * app's private key, mints a short-lived app JWT, exchanges it for an
 * installation token, and writes one file per passed task with the Contents
 * API. No user token is ever stored: the installation id is the whole
 * connection, and the learner can revoke it from GitHub at any time. */

import { createSign } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CodingGardenStatus } from '../shared/coding-api';
import { gardenPathFor, type CodingTask, type Localized } from '../shared/coding-catalog';
import type { GardenPassInput } from './github-garden';
import { withTimeout } from './http';

const API = 'https://api.github.com';
const USER_AGENT = 'devShark-garden';
const TOKEN_MARGIN_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function isGithubAppConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_SLUG && process.env.GITHUB_APP_PRIVATE_KEY);
}

export const githubAppSlug = (): string => process.env.GITHUB_APP_SLUG ?? '';

function privateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY ?? '';
  if (raw.includes('-----BEGIN')) return raw.replace(/\\n/g, '\n');
  return Buffer.from(raw, 'base64').toString('utf8');
}

const b64url = (input: Buffer | string): string => Buffer.from(input).toString('base64url');

/** RS256 app JWT, valid for nine minutes, issued a minute in the past to
 * absorb clock skew (GitHub rejects tokens issued in the future). */
export function appJwt(now = Date.now()): string {
  const iat = Math.floor(now / 1000) - 60;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat, exp: iat + 9 * 60, iss: process.env.GITHUB_APP_ID }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey()).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export class GithubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function gh<T>(path: string, init: { method?: string; token: string; body?: unknown; jwt?: boolean }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${API}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `${init.jwt ? 'Bearer' : 'token'} ${init.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': USER_AGENT,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      const message = data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : response.statusText;
      throw new GithubError(response.status, message.slice(0, 200));
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

const tokenCache = new Map<number, { token: string; expiresAt: number }>();

export async function installationToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt - TOKEN_MARGIN_MS > Date.now()) return cached.token;
  const data = await gh<{ token: string; expires_at: string }>(`/app/installations/${installationId}/access_tokens`, { method: 'POST', token: appJwt(), jwt: true });
  tokenCache.set(installationId, { token: data.token, expiresAt: Date.parse(data.expires_at) });
  return data.token;
}

export interface InstallationInfo {
  id: number;
  account: { login: string; id: number; type: string };
  repository_selection: 'all' | 'selected';
}

export function getInstallation(installationId: number): Promise<InstallationInfo> {
  return gh<InstallationInfo>(`/app/installations/${installationId}`, { token: appJwt(), jwt: true });
}

export interface RepoInfo {
  full_name: string;
  default_branch: string;
  private: boolean;
  fork: boolean;
  owner: { login: string; id: number };
}

export async function listInstallationRepos(token: string): Promise<RepoInfo[]> {
  const data = await gh<{ repositories: RepoInfo[] }>('/installation/repositories?per_page=100', { token });
  return data.repositories ?? [];
}

export async function getFile(token: string, repo: string, path: string, branch: string): Promise<{ sha: string; content: string } | null> {
  try {
    const data = await gh<{ sha: string; content: string; encoding: string }>(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`, { token });
    const content = data.encoding === 'base64' ? Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8') : data.content;
    return { sha: data.sha, content };
  } catch (error) {
    if (error instanceof GithubError && error.status === 404) return null;
    throw error;
  }
}

export async function putFile(token: string, repo: string, path: string, input: {
  content: string;
  message: string;
  branch: string;
  sha?: string;
  author: { name: string; email: string };
}): Promise<{ sha: string; url: string }> {
  const data = await gh<{ commit: { sha: string; html_url: string } }>(`/repos/${repo}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    token,
    body: {
      message: input.message,
      content: Buffer.from(input.content, 'utf8').toString('base64'),
      branch: input.branch,
      ...(input.sha ? { sha: input.sha } : {}),
      author: input.author,
      committer: input.author,
    },
  });
  return { sha: data.commit.sha, url: data.commit.html_url };
}

/* ── file and message builders (pure) ─────────────────────────────────── */

const pick = (value: Localized, locale: 'en' | 'cs') => value[locale] || value.en;

export function commitMessageFor(task: CodingTask): string {
  const track = { javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', 'system-design': 'System design' }[task.track];
  return `Complete "${task.title.en}" (${track}${task.level > 0 ? `, level ${task.level}` : ''})`;
}

const LEVEL_TITLES: Record<string, string[]> = {
  javascript: ['Values & Math', 'Strings', 'Booleans & Comparison', 'Arrays: Basics', 'Objects: Basics', 'Array Iteration', 'Filter & Find', 'Reduce', 'Destructuring', 'Spread & Rest', 'Functions & Scope', 'Closures', 'Hoisting & let/const', 'this & Context', 'Callbacks & HOFs', 'Ternary & Short-circuit', 'Type Coercion', 'Truthy / Falsy', 'JSON & Objects', 'Optional & Nullish', 'Promises', 'Async / Await', 'Sets & Maps', 'Edge Cases & Gotchas', 'Mixed Mastery'],
  typescript: ['Basic Types', 'Type Inference', 'Function Types', 'Arrays & Tuples', 'Object Types', 'Interfaces', 'Union Types', 'Literal Types', 'Optional & Readonly', 'Type Aliases', 'Type Narrowing', 'Type Guards', 'Enums', 'Generics: Basics', 'Generic Constraints', 'keyof & typeof', 'Indexed Access', 'Partial & Required', 'Pick & Omit', 'Record', 'Mapped Types', 'Conditional Types', 'infer', 'Template Literals', 'Mixed Mastery'],
  react: ['JSX Basics', 'Components', 'Props', 'Rendering Lists', 'Conditional Rendering', 'useState: Basics', 'Event Handling', 'Updating State', 'State: Objects & Arrays', 'Derived State', 'useEffect: Basics', 'Effect Dependencies', 'Cleanup Functions', 'useRef', 'Forms & Inputs', 'Lifting State Up', 'useMemo', 'useCallback', 'useReducer', 'useContext', 'Custom Hooks', 'Keys & Reconciliation', 'Performance Patterns', 'Common Pitfalls', 'Mixed Mastery'],
};

export function buildTaskFile(task: CodingTask, code: string, verdict: { passed: number; total: number }, locale: 'en' | 'cs', date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const trackName = { javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', 'system-design': 'System design' }[task.track];
  const levelName = task.level > 0 ? LEVEL_TITLES[task.track]?.[task.level - 1] : undefined;
  const link = `https://devshark.app/coding/${task.track}/${task.id}`;
  const tests = verdict.total > 0 ? `${verdict.passed}/${verdict.total} ${locale === 'cs' ? 'testů' : 'tests'}` : locale === 'cs' ? 'splněno' : 'passed';
  if (task.track === 'system-design') {
    return `# ${pick(task.title, locale)}\n\n${locale === 'cs' ? 'devShark · Návrh systémů' : 'devShark · System design'} · ${task.tier}\n\n${locale === 'cs' ? 'Splněno' : 'Passed'} ${day} · ${tests}\n\n${link}\n`;
  }
  const header = [
    '/**',
    ` * ${pick(task.title, locale)}`,
    ` * devShark · ${trackName}${levelName ? ` · ${locale === 'cs' ? 'Úroveň' : 'Level'} ${task.level} "${levelName}"` : ''} · ${locale === 'cs' ? 'Stupeň' : 'Tier'} ${task.tier}`,
    ` * ${locale === 'cs' ? 'Splněno' : 'Passed'} ${day} · ${tests}`,
    ` * ${link}`,
    ' */',
    '',
  ].join('\n');
  return `${header}${code.replace(/\s+$/, '')}\n`;
}

export function readmeFor(login: string, locale: 'en' | 'cs'): string {
  return locale === 'cs'
    ? `# devShark zahrádka\n\nKaždá splněná programovací úloha z devSharku přistane tady jako jeden soubor, jedna složka na předmět. Commity zapisuje aplikace devShark garden pod účtem ${login}.\n\nhttps://devshark.app/coding\n`
    : `# devShark garden\n\nEvery coding task passed on devShark lands here as one file, one folder per subject. Commits are written by the devShark garden app on behalf of ${login}.\n\nhttps://devshark.app/coding\n`;
}

/* ── pipeline ─────────────────────────────────────────────────────────── */

interface ConnectionRow {
  user_id: string;
  installation_id: number;
  account_login: string;
  account_id: number;
  repo_full_name: string | null;
  default_branch: string | null;
  status: 'pending_repo' | 'active' | 'broken';
}

async function loadConnection(supabase: SupabaseClient, userId: string): Promise<ConnectionRow | null> {
  const { data, error } = await withTimeout(supabase.from('github_connections').select('user_id,installation_id,account_login,account_id,repo_full_name,default_branch,status').eq('user_id', userId).maybeSingle());
  if (error || !data) return null;
  return data as ConnectionRow;
}

const authorFor = (connection: ConnectionRow) => ({
  name: connection.account_login,
  email: `${connection.account_id}+${connection.account_login}@users.noreply.github.com`,
});

async function markBroken(supabase: SupabaseClient, userId: string, message: string) {
  await withTimeout(supabase.from('github_connections').update({ status: 'broken', last_error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq('user_id', userId));
}

/** Writes one queued row to the repository. Returns the garden status for the UI. */
async function deliver(supabase: SupabaseClient, connection: ConnectionRow, row: { id: string; path: string; content: string; message: string; attempts: number }): Promise<CodingGardenStatus> {
  if (connection.status !== 'active' || !connection.repo_full_name || !connection.default_branch) return { status: 'queued' };
  const now = new Date().toISOString();
  try {
    const token = await installationToken(connection.installation_id);
    const repo = connection.repo_full_name;
    const branch = connection.default_branch;
    const author = authorFor(connection);
    const readme = await getFile(token, repo, 'README.md', branch);
    if (!readme) {
      await putFile(token, repo, 'README.md', { content: readmeFor(connection.account_login, 'en'), message: 'Start the devShark garden', branch, author });
    }
    const existing = await getFile(token, repo, row.path, branch);
    if (existing && existing.content === row.content) {
      await withTimeout(supabase.from('github_commits').update({ status: 'skipped', updated_at: now }).eq('id', row.id));
      return { status: 'skipped', url: `https://github.com/${repo}/blob/${branch}/${row.path}` };
    }
    const commit = await putFile(token, repo, row.path, { content: row.content, message: row.message, branch, sha: existing?.sha, author });
    await Promise.all([
      withTimeout(supabase.from('github_commits').update({ status: 'committed', commit_sha: commit.sha, attempts: row.attempts + 1, last_error: null, updated_at: now }).eq('id', row.id)),
      withTimeout(supabase.from('github_connections').update({ last_commit_at: now, last_error: null, updated_at: now }).eq('user_id', connection.user_id)),
    ]);
    return { status: 'committed', url: commit.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = row.attempts + 1;
    const broken = error instanceof GithubError && [401, 403, 404].includes(error.status);
    await withTimeout(supabase.from('github_commits').update({ status: attempts >= MAX_ATTEMPTS && !broken ? 'failed' : 'queued', attempts, last_error: message.slice(0, 500), updated_at: now }).eq('id', row.id));
    if (broken) await markBroken(supabase, connection.user_id, message);
    return { status: attempts >= MAX_ATTEMPTS && !broken ? 'failed' : 'queued' };
  }
}

/** Called after a recorded pass. Queues the file and tries to deliver it now,
 * plus up to a few older queued rows. Never throws. */
export async function commitPassedTask(supabase: SupabaseClient, input: GardenPassInput): Promise<CodingGardenStatus | null> {
  if (!isGithubAppConfigured()) return null;
  const connection = await loadConnection(supabase, input.userId);
  if (!connection) return { status: 'not_connected' };
  if (!input.firstPass && !input.codeChanged) return { status: 'skipped' };
  const path = gardenPathFor(input.task);
  const content = buildTaskFile(input.task, input.code, { passed: input.passedCount, total: input.totalCount }, input.locale);
  const message = commitMessageFor(input.task);
  const inserted = await withTimeout(supabase.from('github_commits').insert({ user_id: input.userId, task_id: input.task.id, path, content, message }).select('id,path,content,message,attempts').single());
  if (inserted.error || !inserted.data) return { status: 'failed' };
  const status = await deliver(supabase, connection, inserted.data as { id: string; path: string; content: string; message: string; attempts: number });
  if (status.status === 'committed') await retryQueued(supabase, input.userId, 5).catch(() => undefined);
  return status;
}

/** Retries queued rows for one learner, oldest first. */
export async function retryQueued(supabase: SupabaseClient, userId: string, limit = 20): Promise<{ committed: number; failed: number; remaining: number }> {
  const connection = await loadConnection(supabase, userId);
  const rows = await withTimeout(supabase.from('github_commits').select('id,path,content,message,attempts').eq('user_id', userId).eq('status', 'queued').order('created_at', { ascending: true }).limit(limit));
  if (!connection || rows.error) return { committed: 0, failed: 0, remaining: rows.data?.length ?? 0 };
  let committed = 0;
  let failed = 0;
  for (const row of (rows.data ?? []) as { id: string; path: string; content: string; message: string; attempts: number }[]) {
    const status = await deliver(supabase, connection, row);
    if (status.status === 'committed' || status.status === 'skipped') committed++;
    else if (status.status === 'failed') failed++;
    else break; // still queued: the connection is broken or GitHub is down, stop hammering
  }
  const left = await withTimeout(supabase.from('github_commits').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'queued'));
  return { committed, failed, remaining: left.count ?? 0 };
}
