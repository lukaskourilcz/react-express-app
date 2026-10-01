// First: no exported Supabase project or Redis may reach these handlers.
import './launch-test-env';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { handleGithub } from '../lib/github-handlers';
import { encodeGithubConnectState } from '../lib/quiz-tokens';
import { RATE_LIMITS, SHARED_NETWORK_SEATS } from '../lib/rate-limit';

// The GitHub garden's connect step, run through the real handler against a
// stand-in GitHub and a stand-in github_connections table. The state token
// says which devShark account started a connect; these checks hold the part
// that proves which GitHub user finished it, and that one installation never
// belongs to two devShark accounts.

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const APP_ENV: Record<string, string> = {
  GITHUB_APP_ID: '424242',
  GITHUB_APP_SLUG: 'devshark-garden-test',
  GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
  GITHUB_APP_CLIENT_ID: 'Iv1.test-client',
  GITHUB_APP_CLIENT_SECRET: 'test-client-secret',
};
Object.assign(process.env, APP_ENV);

/* ── a stand-in GitHub ────────────────────────────────────────────────── */

const OWNER = { id: 7001, login: 'garden-owner' };
const COLLABORATOR = { id: 7002, login: 'garden-collaborator' };
const STRANGER = { id: 7003, login: 'garden-stranger' };
const OWNER_INSTALLATION = 555_001;
const STRANGER_INSTALLATION = 555_003;
// An organisation the owner administers, with the app installed on it.
const ORGANISATION = { id: 7101, login: 'garden-owner-org' };
const ORGANISATION_INSTALLATION = 555_004;

// One-time codes GitHub would add to the install redirect, and the user each
// turns into. Every code can be exchanged once, as on GitHub.
const CODES: Record<string, { token: string; user: typeof OWNER }> = {
  'code-owner-1': { token: 'ghu_owner_token_1', user: OWNER },
  'code-owner-2': { token: 'ghu_owner_token_2', user: OWNER },
  'code-owner-3': { token: 'ghu_owner_token_3', user: OWNER },
  'code-owner-4': { token: 'ghu_owner_token_4', user: OWNER },
  'code-owner-org': { token: 'ghu_owner_token_org', user: OWNER },
  'code-collaborator': { token: 'ghu_collaborator_token', user: COLLABORATOR },
  'code-stranger': { token: 'ghu_stranger_token', user: STRANGER },
};
const usedCodes = new Set<string>();
// The owner's installations fill a first page of 100, so the one being
// connected is only on page two. The collaborator reaches the owner's
// installation through a repository they collaborate on; the stranger reaches
// only their own.
const unrelated = Array.from({ length: 100 }, (_, index) => ({ id: 900_000 + index, account: { login: `org-${index}`, id: 800_000 + index } }));
const REACHABLE: Record<number, { id: number }[]> = {
  [OWNER.id]: [...unrelated, { id: OWNER_INSTALLATION }, { id: ORGANISATION_INSTALLATION }],
  [COLLABORATOR.id]: [{ id: OWNER_INSTALLATION }],
  [STRANGER.id]: [{ id: STRANGER_INSTALLATION }],
};
const INSTALLATIONS: Record<number, { id: number; account: { login: string; id: number; type: string }; repository_selection: 'selected' }> = {
  [OWNER_INSTALLATION]: { id: OWNER_INSTALLATION, account: { ...OWNER, type: 'User' }, repository_selection: 'selected' },
  [STRANGER_INSTALLATION]: { id: STRANGER_INSTALLATION, account: { ...STRANGER, type: 'User' }, repository_selection: 'selected' },
  [ORGANISATION_INSTALLATION]: { id: ORGANISATION_INSTALLATION, account: { ...ORGANISATION, type: 'Organization' }, repository_selection: 'selected' },
};

let oauthAnswer: 'normal' | 'server_error' = 'normal';
const calls: string[] = [];

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const userFor = (authorization: string | null) => Object.values(CODES).find((one) => authorization === `Bearer ${one.token}`)?.user;

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const method = init?.method ?? 'GET';
  const headers = new Headers(init?.headers);
  calls.push(`${method} ${url.host}${url.pathname}${url.search}`);
  if (url.host === 'github.com' && url.pathname === '/login/oauth/access_token' && method === 'POST') {
    if (oauthAnswer === 'server_error') return json(502, { message: 'Bad gateway' });
    const body = JSON.parse(String(init?.body)) as { client_id: string; client_secret: string; code: string };
    assert.equal(body.client_id, APP_ENV.GITHUB_APP_CLIENT_ID, 'the exchange names the app\'s client id');
    assert.equal(body.client_secret, APP_ENV.GITHUB_APP_CLIENT_SECRET, 'the exchange carries the client secret');
    const known = CODES[body.code];
    if (!known || usedCodes.has(body.code)) return json(200, { error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' });
    usedCodes.add(body.code);
    return json(200, { access_token: known.token, token_type: 'bearer', expires_in: 28800, refresh_token: 'ghr_refresh', scope: '' });
  }
  if (url.host !== 'api.github.com') throw new Error(`unexpected request to ${url.href}`);
  if (url.pathname === '/user/installations') {
    const user = userFor(headers.get('authorization'));
    if (!user) return json(401, { message: 'Bad credentials' });
    const perPage = Number(url.searchParams.get('per_page'));
    const page = Number(url.searchParams.get('page'));
    const all = REACHABLE[user.id] ?? [];
    return json(200, { total_count: all.length, installations: all.slice((page - 1) * perPage, page * perPage) });
  }
  if (url.pathname === '/user') {
    const user = userFor(headers.get('authorization'));
    return user ? json(200, { id: user.id, login: user.login }) : json(401, { message: 'Bad credentials' });
  }
  const installation = /^\/app\/installations\/(\d+)(\/access_tokens)?$/.exec(url.pathname);
  if (installation) {
    assert.match(headers.get('authorization') ?? '', /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/, 'app endpoints are called with the app JWT');
    const found = INSTALLATIONS[Number(installation[1])];
    if (!found) return json(404, { message: 'Not Found' });
    if (installation[2]) return json(201, { token: `ghs_installation_${found.id}`, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
    return json(200, found);
  }
  if (url.pathname === '/installation/repositories') {
    const id = Number(/ghs_installation_(\d+)/.exec(headers.get('authorization') ?? '')?.[1]);
    const account = INSTALLATIONS[id]?.account;
    if (!account) return json(401, { message: 'Bad credentials' });
    return json(200, { total_count: 1, repositories: [{ full_name: `${account.login}/garden`, default_branch: 'main', private: false, fork: false, owner: { login: account.login, id: account.id } }] });
  }
  throw new Error(`unexpected GitHub call ${method} ${url.pathname}`);
}) as typeof fetch;

/* ── a stand-in github_connections table ──────────────────────────────── */

type Row = Record<string, unknown> & { user_id: string; installation_id: number };
const table = new Map<string, Row>();
// Hides rows from the pre-check only, to stand for a second account whose
// upsert lands between the check and the write.
let raceWindow = false;

function query(name: string) {
  const filters: ((row: Row) => boolean)[] = [];
  let upsertRow: Row | null = null;
  let head = false;
  let columns = '*';
  let single = false;
  const run = () => {
    if (name === 'github_commits') return { data: null, error: null, count: 0 };
    if (upsertRow) {
      const incoming = upsertRow;
      const clash = [...table.values()].some((row) => row.installation_id === incoming.installation_id && row.user_id !== incoming.user_id);
      if (clash) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "github_connections_installation_id_key"' } };
      table.set(incoming.user_id, { ...table.get(incoming.user_id), ...incoming });
      return { data: null, error: null };
    }
    const hidePeers = raceWindow && columns === 'user_id';
    const rows = [...table.values()].filter((row) => !hidePeers && filters.every((filter) => filter(row)));
    if (head) return { data: null, error: null, count: rows.length };
    return { data: single ? (rows[0] ?? null) : rows, error: null };
  };
  const builder = {
    select(selected: string, options?: { head?: boolean }) { columns = selected; head = Boolean(options?.head); return builder; },
    eq(column: string, value: unknown) { filters.push((row) => row[column] === value); return builder; },
    neq(column: string, value: unknown) { filters.push((row) => row[column] !== value); return builder; },
    limit() { return builder; },
    maybeSingle() { single = true; return builder; },
    upsert(row: Row, options: { onConflict: string }) { assert.equal(options.onConflict, 'user_id'); upsertRow = row; return builder; },
    then<A, B>(resolve: (value: ReturnType<typeof run>) => A, reject?: (reason: unknown) => B) { return Promise.resolve(run()).then(resolve, reject); },
  };
  return builder;
}
const supabase = { from: query } as never;

/* ── requests ─────────────────────────────────────────────────────────── */

let address = 0;
function response() {
  return { statusCode: 200, body: null as unknown, headers: {} as Record<string, string>, setHeader(key: string, value: string) { this.headers[key] = value; }, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
}
async function call(op: string, account: string, method: 'GET' | 'POST', body: Record<string, unknown> = {}, from?: string) {
  const res = response();
  // Without Supabase configured, a Bearer token with a user_id is that account
  // (lib/auth.ts's local fallback). A fresh address keeps the address backstop
  // out of the way unless a case names one.
  const req = { method, headers: { authorization: 'Bearer stand-in-token', 'x-forwarded-for': from ?? `203.0.113.${++address}` }, query: { op, user_id: account }, body };
  await handleGithub(op, req as never, res as never, supabase);
  return res;
}
const finish = (account: string, fields: Record<string, unknown>) => call('github-connect-finish', account, 'POST', { installationId: OWNER_INSTALLATION, state: encodeGithubConnectState(account), ...fields });
const errorCode = (body: unknown) => (body as { error?: { code?: string } } | null)?.error?.code;
const oauthCalls = () => calls.filter((one) => one.startsWith('POST github.com/login/oauth/access_token')).length;

async function main() {
  const accountA = 'aaaaaaaa-0000-4000-8000-00000000a001';
  const accountB = 'aaaaaaaa-0000-4000-8000-00000000b002';

  // 1. The garden is configured only with the OAuth client pair as well: a
  //    deployment with the old three variables keeps it hidden.
  for (const key of ['GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET']) {
    delete process.env[key];
    const hidden = await call('github-connection', accountA, 'GET');
    assert.equal(hidden.statusCode, 200);
    assert.equal((hidden.body as { available?: boolean }).available, false, `without ${key} the garden reports itself unavailable`);
    const start = await call('github-connect-start', accountA, 'POST');
    assert.equal(start.statusCode, 503, `without ${key} a connect cannot start`);
    process.env[key] = APP_ENV[key];
  }
  const shown = await call('github-connection', accountA, 'GET');
  assert.equal((shown.body as { available?: boolean }).available, true, 'with all five variables the garden is available');

  // 2. No code: refused before GitHub is asked anything, nothing stored.
  const missing = await finish(accountA, {});
  assert.equal(missing.statusCode, 400, 'a finish without the authorization code is refused');
  assert.equal(errorCode(missing.body), 'authorization_missing');
  assert.equal(oauthCalls(), 0, 'nothing is exchanged without a code');
  assert.equal(table.size, 0, 'nothing is stored without a code');

  // 3. GitHub refuses the code (used, expired or foreign): refused, nothing stored.
  const refused = await finish(accountA, { code: 'code-that-github-never-issued' });
  assert.equal(refused.statusCode, 403, 'a code GitHub refuses is refused');
  assert.equal(errorCode(refused.body), 'authorization_failed');
  assert.ok(!calls.some((one) => one.includes('/user/installations')), 'a refused code lists no installations');
  assert.equal(table.size, 0, 'nothing is stored after a refused code');

  // 4. The exchange itself fails on GitHub's side: refused, nothing stored.
  oauthAnswer = 'server_error';
  const down = await finish(accountA, { code: 'code-owner-4' });
  oauthAnswer = 'normal';
  assert.equal(down.statusCode, 502, 'an exchange GitHub cannot answer is refused as a GitHub error');
  assert.equal(errorCode(down.body), 'github_error');
  assert.equal(table.size, 0, 'nothing is stored when the exchange fails');

  // 5. A GitHub user who cannot reach the installation: every page is read,
  //    then refused, nothing stored.
  const stranger = await finish(accountA, { code: 'code-stranger' });
  assert.equal(stranger.statusCode, 403, 'an installation outside the user\'s list is refused');
  assert.equal(errorCode(stranger.body), 'installation_not_yours');
  assert.equal(table.size, 0, 'nothing is stored for an installation that is not yours');

  // 6. A collaborator reaches the owner's installation through a shared
  //    repository, but the installation is not on their account: refused.
  const collaborator = await finish(accountA, { code: 'code-collaborator' });
  assert.equal(collaborator.statusCode, 403, 'a collaborator cannot connect the owner\'s installation');
  assert.equal(errorCode(collaborator.body), 'installation_not_yours');
  assert.equal(table.size, 0, 'nothing is stored for a collaborator');

  // 7. The owner, whose installation is on page two of their list: stored.
  calls.length = 0;
  const connected = await finish(accountA, { code: 'code-owner-1' });
  assert.equal(connected.statusCode, 200, `the owner connects (${JSON.stringify(connected.body)})`);
  assert.ok(calls.includes('GET api.github.com/user/installations?per_page=100&page=2'), 'the installation list is read past its first page');
  const stored = table.get(accountA);
  assert.equal(stored?.installation_id, OWNER_INSTALLATION, 'the owner\'s installation is stored');
  assert.equal(stored?.account_login, OWNER.login);
  assert.equal((connected.body as { status?: string }).status, 'active', 'the single owned repository is picked');
  for (const [where, value] of [['the stored row', stored], ['the response', connected.body]] as const) {
    assert.doesNotMatch(JSON.stringify(value), /ghu_|ghr_|access_token|refresh_token/, `${where} carries no user token`);
  }

  // A used code does not work twice.
  const replay = await finish(accountA, { code: 'code-owner-1' });
  assert.equal(errorCode(replay.body), 'authorization_failed', 'a code is good for one exchange');

  // The owner reconnecting the same installation updates their own row.
  const again = await finish(accountA, { code: 'code-owner-2' });
  assert.equal(again.statusCode, 200, 'the owner can reconnect');
  assert.equal(table.size, 1);

  // 8. A second devShark account of the same GitHub owner: 409, and the first
  //    account keeps the installation.
  const second = await finish(accountB, { code: 'code-owner-3' });
  assert.equal(second.statusCode, 409, 'a second devShark account cannot hold the same installation');
  assert.equal(errorCode(second.body), 'installation_taken');
  assert.equal(table.get(accountA)?.installation_id, OWNER_INSTALLATION, 'the first account keeps its connection');
  assert.equal(table.has(accountB), false, 'nothing is stored for the second account');

  // 9. The same when the second account's check runs before the first
  //    account's row is visible: the unique index answers, again with 409.
  raceWindow = true;
  CODES['code-owner-5'] = { token: 'ghu_owner_token_5', user: OWNER };
  const raced = await finish(accountB, { code: 'code-owner-5' });
  raceWindow = false;
  assert.equal(raced.statusCode, 409, 'a unique violation on save is a 409, not a 500');
  assert.equal(errorCode(raced.body), 'installation_taken');
  assert.equal(table.has(accountB), false);

  // 10. The state still binds the connect to the account that started it.
  const foreignState = await call('github-connect-finish', accountB, 'POST', { installationId: OWNER_INSTALLATION, state: encodeGithubConnectState(accountA), code: 'code-owner-6' });
  assert.equal(errorCode(foreignState.body), 'invalid_state', 'another account\'s state is refused');

  // 11. An installation on an organisation, even one the authorizing user
  //     administers and can list: refused, nothing stored.
  const accountC = 'aaaaaaaa-0000-4000-8000-00000000c003';
  const organisation = await call('github-connect-finish', accountC, 'POST', { installationId: ORGANISATION_INSTALLATION, state: encodeGithubConnectState(accountC), code: 'code-owner-org' });
  assert.equal(organisation.statusCode, 400, 'an organisation installation is refused');
  assert.equal(errorCode(organisation.body), 'organisation_not_supported');
  assert.equal(table.has(accountC), false, 'nothing is stored for an organisation installation');
  assert.ok(![...table.values()].some((row) => row.installation_id === ORGANISATION_INSTALLATION), 'no account holds the organisation installation');

  // 12. Rate limits are each learner's own, with an address backstop that
  //     holds a class: every seat of a class behind one address spends its
  //     whole connect and sync budget without a 429, one learner past their
  //     budget is refused, and the next learner at that address is not.
  const cases = [
    { op: 'github-connect-start', per: RATE_LIMITS.githubConnect, net: 1 },
    { op: 'github-sync', per: RATE_LIMITS.githubSync, net: 2 },
  ];
  // The development auth fallback logs a warning on every call; a few hundred
  // of them would bury the report.
  const { warn, log } = console;
  console.warn = () => {};
  console.log = () => {};
  const refusals: string[] = [];
  try {
    for (const one of cases) {
      const classroom = `198.51.100.${one.net}`;
      for (let seat = 0; seat < SHARED_NETWORK_SEATS; seat += 1) {
        for (let n = 0; n < one.per.capacity; n += 1) {
          const res = await call(one.op, `aaaaaaaa-0000-4000-8000-${String(seat).padStart(12, '0')}`, 'POST', {}, classroom);
          if (res.statusCode === 429) refusals.push(`${one.op} seat ${seat}`);
        }
      }
      const desk = `198.51.100.${one.net + 10}`;
      const first = 'aaaaaaaa-0000-4000-8000-00000000f157';
      for (let n = 0; n < one.per.capacity; n += 1) await call(one.op, first, 'POST', {}, desk);
      assert.equal((await call(one.op, first, 'POST', {}, desk)).statusCode, 429, `${one.op}: one learner is bounded by their own budget`);
      assert.notEqual((await call(one.op, 'aaaaaaaa-0000-4000-8000-00000000ec0d', 'POST', {}, desk)).statusCode, 429,
        `${one.op}: one learner's spent budget refused another at the same address`);
    }
  } finally {
    console.warn = warn;
    console.log = log;
  }
  assert.deepEqual(refusals, [], `a class of ${SHARED_NETWORK_SEATS} behind one address met 429s`);

  console.log('GitHub garden connect passed: the code is required and exchanged once, only the installation\'s own GitHub account can connect it, an organisation installation is refused, no user token is kept, one installation belongs to one devShark account, and connect and sync limits are each learner\'s own.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
