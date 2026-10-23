/* Handlers against a real token check.
 *
 * The launch contracts run the handlers through lib/auth.ts's local fallback,
 * where the signed-in account is simply the `user_id` the request names, so
 * they cannot catch a handler that trusts a client-supplied `user_id`. This
 * suite runs the real `api/user/[op].ts`, `api/quiz/roadmap.ts`,
 * `api/leaderboard.ts` and the public handlers against a local stand-in that
 * answers `/auth/v1/user` the way Supabase Auth does (a token names one
 * account, with its email, confirmation and app metadata) and PostgREST's
 * tables and routines with nothing stored. Every read and write the stand-in
 * sees is recorded, so a check can say which account it was for.
 *
 * It holds:
 *  - a token for account A with a body or query `user_id` of B reads and
 *    writes A's rows: the leaderboard switch, a coding op and a garden op;
 *  - the admin allow-list counts a confirmed address only, and the admin
 *    role in app metadata keeps working; the fulfilment op takes the admin
 *    bucket before its gate, GET included;
 *  - an answer about one person is never stored by a shared cache unless its
 *    handler says so, and the public ones still say so;
 *  - the reads a script can drive take a per-account bucket and an address
 *    bucket, and a leaderboard `limit` is rounded to a few fixed sizes;
 *  - with Upstash configured and failing, a one-time claim is refused with
 *    503 instead of falling back to this instance's memory.
 *
 * Upstash is a second stand-in that answers every command with an error, so
 * the rate limits here run on their in-memory fallback. Nothing leaves the
 * machine. */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

interface Account {
  id: string;
  token: string;
  email: string;
  confirmed: boolean;
  appMetadata?: Record<string, unknown>;
  identities?: Record<string, unknown>[];
}
const A: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000a', token: 'caller-a', email: 'a@example.invalid', confirmed: true };
const B: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000b', token: 'caller-b', email: 'b@example.invalid', confirmed: true };
const ADMIN_EMAIL = 'admin@example.invalid';
// Someone who signed up with the admin's address and never clicked the link.
const LISTED_UNCONFIRMED: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000c', token: 'listed-unconfirmed', email: ADMIN_EMAIL, confirmed: false };
const LISTED_CONFIRMED: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000d', token: 'listed-confirmed', email: ADMIN_EMAIL, confirmed: true };
const ROLE_ADMIN: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000e', token: 'role-admin', email: 'role@example.invalid', confirmed: false, appMetadata: { role: 'admin' } };
// An account made with an email and password (owner decision 3): no Google
// identity, so no name or picture, and `email` as its provider.
const EMAIL: Account = {
  id: '1a2b3c4d-0000-4000-8000-00000000000f',
  token: 'email-password',
  email: 'ada@example.invalid',
  confirmed: true,
  appMetadata: { provider: 'email', providers: ['email'] },
  identities: [{
    identity_id: '1a2b3c4d-0000-4000-8000-0000000000f1',
    id: '1a2b3c4d-0000-4000-8000-00000000000f',
    user_id: '1a2b3c4d-0000-4000-8000-00000000000f',
    provider: 'email',
    identity_data: { email: 'ada@example.invalid', email_verified: true, phone_verified: false, sub: '1a2b3c4d-0000-4000-8000-00000000000f' },
  }],
};
// An account whose own rows the database is too slow to read.
const SLOW: Account = { id: '1a2b3c4d-0000-4000-8000-000000000010', token: 'slow-rows', email: 'slow@example.invalid', confirmed: true };
const ACCOUNTS = [A, B, LISTED_UNCONFIRMED, LISTED_CONFIRMED, ROLE_ADMIN, EMAIL, SLOW];
// A token presented while Supabase Auth answers 500 (not one of ACCOUNTS).
const AUTH_DOWN: Account = { id: '1a2b3c4d-0000-4000-8000-0000000000aa', token: 'auth-is-down', email: 'down@example.invalid', confirmed: true };

type Row = Record<string, unknown>;
interface Seen { method: string; path: string; filters: Record<string, string>; body: unknown }
const seen: Seen[] = [];
/** While true, the one-time quiz claim fails as an unreachable database would. */
let claimFails = false;
/** Token checks Supabase Auth answered, so a test can count a request's. */
let authChecks = 0;
const SLOW_REPORT = 'stand-in: answer after the timeout';
// A topic board asked with this minimum answers after the timeout too.
const SLOW_BOARD_MIN_ATTEMPTS = 97;
const upstashCommands: string[] = [];

const readBody = (req: IncomingMessage) => new Promise<string>((resolve) => {
  let text = '';
  req.on('data', (chunk) => { text += chunk; });
  req.on('end', () => resolve(text));
});

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
}

async function startStandIns() {
  const supabase = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://stand-in');
    if(url.pathname==='/rest/v1/user_stats'&&req.method==='GET'&&req.headers.apikey==='anon-verified-caller') {
      res.setHeader('content-type','application/json');res.statusCode=403;
      res.end(JSON.stringify({code:'42501',message:'permission denied for table user_stats'}));return;
    }
    res.setHeader('content-type', 'application/json');
    const send = (status: number, body: unknown) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    if (url.pathname === '/auth/v1/user') {
      authChecks += 1;
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      // Supabase Auth itself failing, for any token.
      if (token === AUTH_DOWN.token) return send(500, { message: 'stand-in auth is down' });
      const account = ACCOUNTS.find((one) => one.token === token);
      if (!account) return send(401, { message: 'invalid token' });
      return send(200, {
        id: account.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: account.email,
        ...(account.confirmed ? { email_confirmed_at: '2026-09-01T00:00:00Z' } : {}),
        app_metadata: account.appMetadata ?? {},
        user_metadata: {},
        identities: account.identities ?? [],
      });
    }
    // The admin API deleting a sign-in identity (account erasure).
    const adminUser = /^\/auth\/v1\/admin\/users\/([\w-]+)$/.exec(url.pathname);
    if (adminUser && req.method === 'DELETE') {
      seen.push({ method: 'DELETE', path: url.pathname, filters: {}, body: await readBody(req).then((raw) => raw ? JSON.parse(raw) as unknown : undefined) });
      return send(200, {});
    }
    const raw = req.method === 'GET' ? '' : await readBody(req);
    const body = raw ? JSON.parse(raw) as unknown : undefined;
    // A database too slow to answer within lib/http.ts's five seconds.
    if (url.pathname === '/rest/v1/question_reports' && (body as Row | undefined)?.detail === SLOW_REPORT) {
      setTimeout(() => send(201, [body]), 5_500);
      return;
    }
    if (url.pathname === '/rest/v1/rpc/allocate_shark_name' && (body as Row | undefined)?.p_user_id === SLOW.id) {
      setTimeout(() => send(200, { handle: 'slowSharkie1', ordinal: '1', base: 'slowSharkie' }), 5_500);
      return;
    }
    if (req.method === 'GET' && url.searchParams.get('user_id') === `eq.${SLOW.id}`) {
      setTimeout(() => send(200, []), 5_500);
      return;
    }
    if (url.pathname === '/rest/v1/rpc/category_leaderboard' && (body as Row | undefined)?.p_min_attempts === SLOW_BOARD_MIN_ATTEMPTS) {
      setTimeout(() => send(200, []), 5_500);
      return;
    }
    const filters = Object.fromEntries([...url.searchParams.entries()].filter(([, value]) => value.startsWith('eq.')).map(([key, value]) => [key, value.slice(3)]));
    seen.push({ method: req.method ?? 'GET', path: url.pathname, filters, body });
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname)?.[1];
    if (rpc) {
      if (rpc === 'claim_quiz_submission' && claimFails) return send(500, { code: '08006', message: 'stand-in: connection failure' });
      if (rpc === 'allocate_shark_name') return send(200, { handle: 'sleepySharkie17', ordinal: '17', base: 'sleepySharkie' });
      if (rpc === 'save_completed_challenge_score') return send(200, { id: 'score-17', name: 'sleepySharkie17', score: (body as Row).p_score, selected_topics: (body as Row).p_topics, all_topics: (body as Row).p_all_topics, created_at: new Date().toISOString() });
      // The Premium check: account A is Premium, so every coding task opens.
      if (rpc === 'is_premium') return send(200, (body as Row | undefined)?.p_user === A.id);
      if (rpc.endsWith('leaderboard') || rpc === 'friend_lookup') return send(200, []);
      return send(200, null);
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const single = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
      if (url.pathname === '/rest/v1/user_handles' && req.method === 'GET') return send(200, single ? { leaderboard_name_mode: 'nickname' } : []);
      if (req.method === 'POST' || req.method === 'PATCH') {
        const row = (Array.isArray(body) ? body[0] : body) as Row;
        return send(201, single ? row : [row]);
      }
      return single ? send(406, { code: 'PGRST116', message: 'no rows' }) : send(200, []);
    }
    send(404, { message: 'no route' });
  });
  // Upstash, unreachable in all but name: every command fails.
  const upstash = createServer(async (req, res) => {
    upstashCommands.push(await readBody(req));
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'ERR stand-in is down' }));
  });
  const [supabasePort, upstashPort] = await Promise.all([listen(supabase), listen(upstash)]);
  // lib/http.ts, lib/auth.ts, lib/admin-auth.ts and lib/rate-limit.ts read
  // these when they load, so they are set before anything is imported.
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabasePort}`;
  process.env.SUPABASE_ANON_KEY = 'anon-verified-caller';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-verified-caller';
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${upstashPort}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-verified-caller';
  process.env.ADMIN_EMAILS = ADMIN_EMAIL;
  // The garden reads its settings when asked, not on import.
  Object.assign(process.env, {
    GITHUB_APP_ID: '424242',
    GITHUB_APP_SLUG: 'devshark-verified-caller',
    GITHUB_APP_PRIVATE_KEY: 'unused-by-these-checks',
    GITHUB_APP_CLIENT_ID: 'Iv1.verified-caller',
    GITHUB_APP_CLIENT_SECRET: 'verified-caller-secret',
  });
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'NODE_ENV', 'VERCEL_ENV', 'VERCEL', 'DEV_PASSWORD', 'ALLOW_LEGACY_DEV_PASSWORD', 'OWNER_EMAIL']) {
    delete process.env[key];
  }
  return [supabase, upstash];
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    headersSent: false,
    setHeader(key: string, value: string) { res.headers[key.toLowerCase()] = String(value); return res; },
    getHeader(key: string) { return res.headers[key.toLowerCase()]; },
    status(code: number) { res.statusCode = code; return res; },
    json(body: unknown) { res.body = body; res.headersSent = true; return res; },
    send(body: unknown) { res.body = body; res.headersSent = true; return res; },
    end() { res.headersSent = true; return res; },
  };
  return res;
}
type Response = ReturnType<typeof mockResponse>;

let address = 0;
const nextAddress = () => `10.40.${Math.floor(++address / 250)}.${address % 250}`;

async function main() {
  const servers = await startStandIns();
  try {
    const [
      { default: userOps },
      { default: roadmap },
      { default: leaderboard },
      { default: settings },
      { default: health },
      { default: flashcards },
      tokens,
      rateLimit,
      http,
      { CODING_TASKS },
      { default: challenge },
      { default: submit },
      { default: questions },
    ] = await Promise.all([
      import('../api/user/[op]'),
      import('../api/quiz/roadmap'),
      import('../api/leaderboard'),
      import('../api/settings'),
      import('../api/health'),
      import('../api/flashcards'),
      import('../lib/quiz-tokens'),
      import('../lib/rate-limit'),
      import('../lib/http'),
      import('../lib/coding/catalog'),
      import('../api/quiz/challenge'),
      import('../api/quiz/submit'),
      import('../api/quiz/questions'),
    ]);

    type Handler = (req: never, res: never) => unknown;
    const call = async (handler: Handler, input: { method?: string; query?: Record<string, string>; body?: unknown; account?: Account; from?: string }) => {
      const res = mockResponse();
      await handler({
        method: input.method ?? 'GET',
        headers: { ...(input.account ? { authorization: `Bearer ${input.account.token}` } : {}), 'x-forwarded-for': input.from ?? nextAddress() },
        query: input.query ?? {},
        url: '/api',
        body: input.body,
      } as never, res as never);
      return res;
    };
    const user = (op: string, input: Omit<Parameters<typeof call>[1], 'query'> & { query?: Record<string, string> }) =>
      call(userOps as Handler, { ...input, query: { op, ...(input.query ?? {}) } });
    const reads = (path: string) => seen.filter((one) => one.path === path);
    const errorCode = (res: Response) => (res.body as { error?: { code?: string } } | undefined)?.error?.code;

    // Leaderboard identity is independent of friends and cannot publish a full email.
    seen.length = 0;
    const preference = await user('leaderboard-name', { method: 'PUT', account: EMAIL, body: { mode: 'account', accountName: 'spoof@example.com', user_id: B.id } });
    assert.equal(preference.statusCode, 200, JSON.stringify(preference.body));
    assert.deepEqual(preference.body, { mode: 'account', nickname: 'sleepySharkie17', accountName: 'ada', showPhoto: false, picture: null });
    const preferenceWrite = reads('/rest/v1/user_handles').find(row => row.method === 'PATCH');
    assert.equal(preferenceWrite?.filters.user_id, EMAIL.id);
    assert.deepEqual(preferenceWrite?.body, { leaderboard_name_mode: 'account', leaderboard_account_name: 'ada' });
    assert.ok(!seen.some(row => row.path === '/rest/v1/rpc/set_friend_display'));
    const unavailable = await user('leaderboard-name', { method: 'PUT', account: LISTED_UNCONFIRMED, body: { mode: 'account' } });
    assert.equal(unavailable.statusCode, 409);
    assert.equal(errorCode(unavailable), 'account_name_unavailable');
    console.log('PASS verified caller: leaderboard names use the verified profile or confirmed email prefix, independently of friends');

    // A signed-in Challenge batch verifies its token once, for the rate limit
    // and the run alike.
    authChecks = 0;
    const signedInBatch = await call(challenge as Handler, { account: A, query: { categories: 'javascript' } });
    assert.equal(signedInBatch.statusCode, 200, JSON.stringify(signedInBatch.body));
    assert.equal(tokens.decodeChallengeRun((signedInBatch.body as { runToken: string }).runToken)?.userId, A.id, 'the run is the token\'s account\'s');
    assert.equal(authChecks, 1, 'a Challenge batch asks Supabase Auth once');

    // Completion writes positive scores automatically; zero allocates nothing.
    const completedRun = tokens.createChallengeRun(true, 'webdev', { topics: ['javascript'], allTopics: false, userId: null });
    const strikes = ['a','b','c'].map(id => tokens.encodeScoreProof(completedRun.runId, id, 'webdev', false));
    seen.length = 0;
    const zero = await call(challenge as Handler, { method: 'POST', query: { resource: 'complete' }, body: { runToken: completedRun.runToken, proofs: strikes } });
    assert.equal(zero.statusCode, 200);
    assert.equal(reads('/rest/v1/rpc/save_completed_challenge_score').length, 0);
    assert.equal(reads('/rest/v1/rpc/allocate_shark_name').length, 0);
    const positive = await call(challenge as Handler, { method: 'POST', query: { resource: 'complete' }, body: { runToken: completedRun.runToken, proofs: [...strikes, tokens.encodeScoreProof(completedRun.runId, 'right', 'webdev', true)], name: 'spoofed' } });
    assert.equal(positive.statusCode, 200, JSON.stringify(positive.body));
    const scoreWrite = reads('/rest/v1/rpc/save_completed_challenge_score')[0].body as Row;
    assert.equal(scoreWrite.p_score, 1);
    assert.equal(scoreWrite.p_user_id, null);
    assert.deepEqual(scoreWrite.p_topics, ['javascript']);
    assert.equal(scoreWrite.p_all_topics, false);
    assert.equal(scoreWrite.name, undefined);
    const foreignRun = await call(challenge as Handler, { method: 'POST', account: B, query: { resource: 'complete' }, body: { runToken: completedRun.runToken, proofs: [...strikes, tokens.encodeScoreProof(completedRun.runId, 'right', 'webdev', true)] } });
    assert.equal(foreignRun.statusCode, 400);
    assert.equal(reads('/rest/v1/rpc/save_completed_challenge_score').length, 1);
    console.log('PASS verified caller: completed positive Challenge runs save automatically; zero and foreign sessions write nothing');

    // ── a token for A with a user_id of B acts for A ──────────────────────
    seen.length = 0;
    const visibleGet = await user('leaderboard-visibility', { account: A, query: { user_id: B.id } });
    assert.equal(visibleGet.statusCode, 200, JSON.stringify(visibleGet.body));
    assert.deepEqual(reads('/rest/v1/user_stats').map((one) => one.filters.user_id), [A.id], 'the switch is read for the token\'s account');
    seen.length = 0;
    const visiblePut = await user('leaderboard-visibility', { method: 'PUT', account: A, query: { user_id: B.id }, body: { visible: true, user_id: B.id } });
    assert.equal(visiblePut.statusCode, 200, JSON.stringify(visiblePut.body));
    const upsert = reads('/rest/v1/user_stats').find((one) => one.method === 'POST');
    assert.equal((upsert?.body as Row | undefined)?.user_id, A.id, 'the switch is written for the token\'s account');
    assert.equal((upsert?.body as Row | undefined)?.email, A.email, 'with the token\'s email');
    console.log('PASS verified caller: leaderboard visibility reads and writes the token\'s account');

    // What friends see (op=identity, migration 055) is the token's account's too.
    seen.length = 0;
    const identityGet = await user('identity', { account: A, query: { user_id: B.id } });
    assert.equal(identityGet.statusCode, 200, JSON.stringify(identityGet.body));
    assert.deepEqual(reads('/rest/v1/user_handles').map((one) => one.filters.user_id), [A.id], 'what friends see is read for the token\'s account');
    seen.length = 0;
    const identityPut = await user('identity', { method: 'PUT', account: A, query: { user_id: B.id }, body: { showRealName: false, user_id: B.id } });
    assert.equal(identityPut.statusCode, 200, JSON.stringify(identityPut.body));
    assert.deepEqual(reads('/rest/v1/rpc/set_friend_display').map((one) => (one.body as Row).p_user_id), [A.id], 'and written for it');
    console.log('PASS verified caller: what friends see reads and writes the token\'s account');

    const codingTask = CODING_TASKS.find((task) => task.track === 'javascript')!;
    seen.length = 0;
    const draft = await user('coding-draft', { method: 'POST', account: A, query: { user_id: B.id }, body: { id: codingTask.id, code: 'const mine = 1;', user_id: B.id } });
    assert.equal(draft.statusCode, 200, JSON.stringify(draft.body));
    assert.deepEqual(reads('/rest/v1/rpc/save_coding_draft_v2').map((one) => (one.body as Row).p_user_id), [A.id], 'a draft is saved for the token\'s account');
    seen.length = 0;
    const progress = await user('coding-progress', { account: A, query: { user_id: B.id } });
    assert.equal(progress.statusCode, 200, JSON.stringify(progress.body));
    const progressReads = seen.filter((one) => one.method === 'GET' && 'user_id' in one.filters);
    assert.ok(progressReads.length > 0 && progressReads.every((one) => one.filters.user_id === A.id), `coding progress is read for the token's account (${JSON.stringify(progressReads.map((one) => one.filters))})`);
    console.log('PASS verified caller: a coding op reads and writes the token\'s account');

    const connect = await user('github-connect-start', { method: 'POST', account: A, query: { user_id: B.id }, body: { user_id: B.id } });
    assert.equal(connect.statusCode, 200, JSON.stringify(connect.body));
    const state = new URL((connect.body as { url: string }).url).searchParams.get('state')!;
    assert.equal(tokens.decodeGithubConnectState(state)?.userId, A.id, 'a garden connect is started for the token\'s account');
    seen.length = 0;
    const connection = await user('github-connection', { account: A, query: { user_id: B.id } });
    assert.equal(connection.statusCode, 200, JSON.stringify(connection.body));
    assert.deepEqual(reads('/rest/v1/github_connections').map((one) => one.filters.user_id), [A.id], 'the garden connection is read for the token\'s account');
    console.log('PASS verified caller: a garden op acts for the token\'s account');

    // ── the admin gate: a confirmed address, or the role ─────────────────
    const fulfilment = (account?: Account, from?: string) => user('fulfilment', { account, from });
    const unconfirmed = await fulfilment(LISTED_UNCONFIRMED);
    assert.equal(unconfirmed.statusCode, 403, `an allow-listed address nobody confirmed is not an admin (${JSON.stringify(unconfirmed.body)})`);
    const confirmed = await fulfilment(LISTED_CONFIRMED);
    assert.equal(confirmed.statusCode, 200, `a confirmed allow-listed address is an admin (${JSON.stringify(confirmed.body)})`);
    const role = await fulfilment(ROLE_ADMIN);
    assert.equal(role.statusCode, 200, `the admin role works without a confirmed address (${JSON.stringify(role.body)})`);
    console.log('PASS verified caller: the admin allow-list counts a confirmed address, the role still works');

    // The fulfilment op takes the admin bucket before the gate, GET included.
    // With the clock still: the bucket refills a token a second.
    const clock = Date.now;
    const stopped = clock();
    Date.now = () => stopped;
    const gateAddress = nextAddress();
    const gate: number[] = [];
    for (let n = 0; n <= rateLimit.RATE_LIMITS.admin.capacity; n += 1) gate.push((await fulfilment(undefined, gateAddress)).statusCode);
    Date.now = clock;
    assert.deepEqual(gate.slice(0, -1).filter((status) => status !== 403), [], `the gate refuses a caller without a session (${gate.join(',')})`);
    assert.equal(gate.at(-1), 429, 'and the admin bucket runs out before the gate is asked again');
    console.log('PASS verified caller: the fulfilment op is rate-limited before its admin gate');

    // ── nothing about one person in a shared cache ──────────────────────
    const personal: [string, Response][] = [
      ['stats', await user('stats', { account: A })],
      ['xp', await user('xp', { account: A })],
      ['streak', await user('streak', { account: A })],
      ['flashcards', await call(flashcards as Handler, { account: A, query: { subject: 'webdev' } })],
      ['roadmap progress', await call(roadmap as Handler, { account: A, query: { resource: 'progress' } })],
      ['a refusal', await user('stats', {})],
    ];
    for (const [label, res] of personal) {
      assert.equal(res.headers['cache-control'], 'private, no-store', `${label} (${res.statusCode}) is kept out of shared caches`);
    }
    const publicReads: [string, Response, RegExp][] = [
      ['settings', await call(settings as Handler, {}), /^public, s-maxage=15/],
      ['health', await call(health as Handler, {}), /^no-store$/],
      ['the all-time board', await call(leaderboard as Handler, { query: { period: 'global' } }), /^public, s-maxage=60/],
      ['the Learn map', await call(roadmap as Handler, {}), /^public, max-age=60, s-maxage=60, stale-while-revalidate=300$/],
    ];
    for (const [label, res, expected] of publicReads) {
      assert.equal(res.statusCode, 200, `${label}: ${JSON.stringify(res.body)}`);
      assert.match(res.headers['cache-control'] ?? '', expected, `${label} keeps its own header`);
    }
    console.log('PASS verified caller: personal answers are private, no-store; public ones keep their headers');

    // ── reads a script can drive ─────────────────────────────────────────
    const lookup = (account: Account) => user('friends-lookup', { account, query: { handle: 'shark_fan' } });
    assert.equal((await lookup(A)).statusCode, 200);
    // The buckets refill with time (the address one at 32 a second), so the
    // clock stands still while they are drained and asked, or a slow runner
    // would find a token again.
    const realNow = Date.now;
    const frozen = realNow();
    Date.now = () => frozen;
    const drain = (config: { key: string; capacity: number; refillPerSecond: number }, identity?: string, from?: string) => {
      const res = mockResponse();
      const req = { headers: { 'x-forwarded-for': from ?? '0.0.0.0' }, query: {} } as never;
      for (let n = 0; n < config.capacity; n += 1) rateLimit.checkRateLimit(req, res as never, config, identity);
    };
    drain(rateLimit.RATE_LIMITS.readPerUser, `user:${A.id}`);
    const limited = await lookup(A);
    assert.equal(limited.statusCode, 429, `a friend lookup past the account's read budget is refused (${JSON.stringify(limited.body)})`);
    assert.equal((await lookup(B)).statusCode, 200, 'another account keeps its own budget');
    const walletLimited = await user('wallet', { account: A, query: { subject: 'webdev' } });
    assert.equal(walletLimited.statusCode, 429, 'the wallet read shares the account\'s read budget');
    const badgesLimited = await user('badges', { account: A, query: { subject: 'webdev' } });
    assert.equal(badgesLimited.statusCode, 429, 'so do badges');
    const eligibility = await call(roadmap as Handler, { account: A, query: { resource: 'eligibility' } });
    assert.equal(eligibility.statusCode, 429, 'so does the Learn plan');

    const school = nextAddress();
    drain(rateLimit.RATE_LIMITS.readAddress, undefined, school);
    const map = await call(roadmap as Handler, { from: school });
    assert.equal(map.statusCode, 429, 'the Learn map past the address budget is refused');
    const level = await call(roadmap as Handler, { from: school, query: { topic: 'javascript', level: '1' } });
    assert.equal(level.statusCode, 429, 'so is a Learn step');
    const board = await call(leaderboard as Handler, { from: school, query: { period: 'global' } });
    assert.equal(board.statusCode, 429, 'so is a leaderboard read the CDN did not answer');
    assert.equal((await call(roadmap as Handler, {})).statusCode, 200, 'another address keeps its own budget');
    Date.now = realNow;
    console.log('PASS verified caller: wallet, badges, friend lookup, Learn and leaderboard reads are rate-limited');

    const limits: [string | undefined, number][] = [[undefined, 100], ['1', 10], ['10', 10], ['11', 25], ['37', 50], ['100', 100], ['101', 200], ['5000', 200], ['-3', 10], ['junk', 100]];
    for (const [asked, served] of limits) {
      seen.length = 0;
      const res = await call(leaderboard as Handler, { query: { period: 'global', ...(asked === undefined ? {} : { limit: asked }) } });
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      assert.equal((reads('/rest/v1/rpc/subject_leaderboard')[0]?.body as Row | undefined)?.p_limit, served, `limit=${asked} is served as ${served}`);
    }
    console.log('PASS verified caller: a leaderboard limit is one of a few sizes');

    // A daily board names a real day: 2026-02-30 has the right shape, and the
    // routine's date cast would fail on it. A period or date repeated in the
    // query string names neither.
    for (const query of [{ period: 'daily', date: '2026-02-30' }, { period: 'daily', date: '2026-13-01' }, { period: 'daily', date: ['2026-10-01', '2026-10-02'] }, { period: ['daily', 'global'] }] as Record<string, string>[]) {
      seen.length = 0;
      const refused = await call(leaderboard as Handler, { query });
      assert.equal(refused.statusCode, 400, `${JSON.stringify(query)} is a bad request (${JSON.stringify(refused.body)})`);
      assert.equal(reads('/rest/v1/rpc/daily_leaderboard_v2').length, 0, 'and asks no routine');
    }
    const leapDay = await call(leaderboard as Handler, { query: { period: 'daily', date: '2028-02-29' } });
    assert.equal(leapDay.statusCode, 200, `a leap day is a day (${JSON.stringify(leapDay.body)})`);
    console.log('PASS verified caller: a daily board refuses a date that is no calendar day');

    // A board routine that does not answer in time is the database busy, not
    // a fault: 503, which the client may retry, rather than 500.
    const slowBoard = await call(leaderboard as Handler, { query: { period: 'category', category: 'javascript', min_attempts: String(SLOW_BOARD_MIN_ATTEMPTS) } });
    assert.equal(slowBoard.statusCode, 503, `a board whose routine timed out answers 503 (${JSON.stringify(slowBoard.body)})`);
    assert.equal(errorCode(slowBoard), 'upstream_timeout');
    console.log('PASS verified caller: a timed-out leaderboard answers 503');

    // So do the account ops whose own catch used to answer 500.
    const slowOps = await Promise.all(['streak', 'xp', 'stats', 'leaderboard-visibility', 'identity', 'friends-handle'].map(async (op) => [op, await user(op, { account: SLOW })] as const));
    for (const [op, res] of slowOps) {
      assert.equal(res.statusCode, 503, `op=${op} whose read timed out answers 503 (${JSON.stringify(res.body)})`);
      assert.equal(errorCode(res), 'upstream_timeout');
    }
    console.log('PASS verified caller: account ops whose read timed out answer 503');

    // ── this month's XP board (migration 056) ───────────────────────────
    // Shared and cached for a minute without a session; with one it is the
    // token's own line, never the account a query names, and private.
    seen.length = 0;
    const monthShared = await call(leaderboard as Handler, { query: { period: 'month' } });
    assert.equal(monthShared.statusCode, 200, JSON.stringify(monthShared.body));
    assert.match(monthShared.headers['cache-control'] ?? '', /^public, s-maxage=60$/, 'the shared month board is cached for a minute');
    const sharedBody = monthShared.body as { period: string; month: string; subject: string; me?: unknown };
    assert.equal(sharedBody.period, 'month');
    assert.match(sharedBody.month, /^\d{4}-(0[1-9]|1[0-2])$/, 'the board names its month');
    assert.equal(sharedBody.month, new Date().toISOString().slice(0, 7), 'the current UTC month');
    assert.equal(sharedBody.subject, 'webdev');
    assert.equal('me' in sharedBody, false, 'a shared board carries nobody\'s own line');
    const sharedRead = reads('/rest/v1/rpc/month_xp_leaderboard')[0]?.body as Row | undefined;
    assert.deepEqual(sharedRead, { p_subject: 'webdev', p_limit: 100, p_viewer: null, p_month: sharedBody.month },
      'the board asks for the subject\'s month, for nobody in particular');
    assert.equal(reads('/rest/v1/rpc/month_xp_leaderboard_rank').length, 0, 'and no own place');

    seen.length = 0;
    const monthMine = await call(leaderboard as Handler, { account: A, query: { period: 'month', me: '1', user_id: B.id } });
    assert.equal(monthMine.statusCode, 200, JSON.stringify(monthMine.body));
    assert.equal(monthMine.headers['cache-control'], 'private, no-store', 'a personal month board stays out of shared caches');
    assert.equal(monthMine.headers.vary, 'Authorization');
    assert.deepEqual((monthMine.body as { me?: unknown }).me, { rank: null, xp: 0 }, 'no XP this month, no place');
    assert.equal((reads('/rest/v1/rpc/month_xp_leaderboard')[0]?.body as Row | undefined)?.p_viewer, A.id, 'the viewer is the token\'s account');
    assert.equal((reads('/rest/v1/rpc/month_xp_leaderboard_rank')[0]?.body as Row | undefined)?.p_user, A.id, 'and so is the own place');

    const foreign = await call(leaderboard as Handler, { query: { period: 'month', categories: 'javascript,geography-capitals' } });
    assert.equal(foreign.statusCode, 400, 'a month board for another subject is refused');
    assert.equal(errorCode(foreign), 'invalid_subject_scope');
    console.log('PASS verified caller: this month\'s XP board is shared without a session and the token\'s own with one');

    // ── a Supabase call that does not answer in time ─────────────────────
    const hung = new Promise<never>(() => {});
    await assert.rejects(
      http.withTimeout(hung, 5),
      (error: unknown) => error instanceof http.ServiceUnavailableError && error.code === 'upstream_timeout',
      'a timed-out Supabase call is the service being unavailable',
    );
    const timedOut = mockResponse();
    await http.withRequestContext(
      { method: 'GET', headers: { 'x-forwarded-for': nextAddress() }, query: {}, url: '/api' } as never,
      timedOut as never,
      () => http.withTimeout(hung, 5),
    );
    assert.equal(timedOut.statusCode, 503, `a handler whose Supabase call timed out answers 503, not 500 (${JSON.stringify(timedOut.body)})`);
    assert.equal(errorCode(timedOut), 'upstream_timeout');
    console.log('PASS verified caller: a Supabase timeout answers 503 upstream_timeout');

    // ── Supabase Auth down ───────────────────────────────────────────────
    for (const query of [{ resource: 'due' }, { resource: 'review', count: '5', categories: 'javascript' }] as Record<string, string>[]) {
      const down = await call(questions as Handler, { account: AUTH_DOWN, query });
      assert.equal(down.statusCode, 503, `${query.resource}: a sign-in service that is down is not an invalid session (${JSON.stringify(down.body)})`);
      assert.equal(errorCode(down), 'auth_unavailable');
    }
    const refusedToken = await call(questions as Handler, { account: { ...A, token: 'not-a-token' }, query: { resource: 'due' } });
    assert.equal(refusedToken.statusCode, 401, 'a token Supabase refuses is still 401');
    assert.equal(errorCode(refusedToken), 'unauthorized');
    console.log('PASS verified caller: Today\'s due list and a review keep 503 when Supabase Auth is down, and 401 for a refused token');

    // ── a quiz submit whose one-time claim cannot be taken ───────────────
    claimFails = true;
    try {
      const sessionId = tokens.encodeSession([{ questionId: 'q-claim-1', correctAnswer: 0 }], { subject: 'webdev' });
      const unclaimed = await call(submit as Handler, { method: 'POST', account: A, body: { sessionId, answers: { 'q-claim-1': 0 } } });
      assert.equal(unclaimed.statusCode, 503, `a submit is not graded without its claim, and says to retry (${JSON.stringify(unclaimed.body)})`);
      assert.equal(errorCode(unclaimed), 'claim_unavailable');
    } finally {
      claimFails = false;
    }
    console.log('PASS verified caller: a quiz submit whose one-time claim fails answers 503');

    // ── question reports ─────────────────────────────────────────────────
    seen.length = 0;
    const reported = await call(submit as Handler, { method: 'POST', account: A, query: { resource: 'report' }, body: { question_id: 'q-report-1', reason: 'typo', detail: 'A typo in the second option' } });
    assert.equal(reported.statusCode, 200, JSON.stringify(reported.body));
    assert.equal((reads('/rest/v1/question_reports')[0]?.body as Row | undefined)?.reporter_sub, A.id, 'a report names the token\'s account');
    seen.length = 0;
    const nul = await call(submit as Handler, { method: 'POST', query: { resource: 'report' }, body: { question_id: 'q-report-1', reason: 'other', detail: 'before\u0000after' } });
    assert.equal(nul.statusCode, 400, `Postgres text cannot hold U+0000, so the report is refused before its insert (${JSON.stringify(nul.body)})`);
    assert.equal(reads('/rest/v1/question_reports').length, 0, 'and nothing is written');
    const slowReport = await call(submit as Handler, { method: 'POST', query: { resource: 'report' }, body: { question_id: 'q-report-1', reason: 'other', detail: SLOW_REPORT } });
    assert.equal(slowReport.statusCode, 503, `a report insert that times out answers 503, as every timeout does (${JSON.stringify(slowReport.body)})`);
    assert.equal(errorCode(slowReport), 'upstream_timeout');
    console.log('PASS verified caller: a question report is saved for its reporter, one holding U+0000 is refused, and a timed-out one answers 503');

    // ── one-time claims with Upstash configured and failing ──────────────
    upstashCommands.length = 0;
    await assert.rejects(
      rateLimit.claimOnce('placement:verified-caller-attempt-0001:1', 60),
      (error: unknown) => error instanceof http.ServiceUnavailableError && error.code === 'claim_unavailable',
      'a claim Upstash does not record is refused, not taken from this instance\'s memory',
    );
    assert.ok(upstashCommands.some((command) => command.includes('once:placement:verified-caller-attempt-0001:1')), 'the claim was asked of Upstash');

    const placement = await call(roadmap as Handler, { query: { resource: 'placement', subject: 'webdev' } });
    assert.equal(placement.statusCode, 200, JSON.stringify(placement.body));
    const round = placement.body as { placementToken: string; questions: { id: string }[] };
    const graded = await call(roadmap as Handler, { method: 'POST', query: { resource: 'placement' }, body: { placementToken: round.placementToken, answers: Object.fromEntries(round.questions.map((q) => [q.id, 0])) } });
    assert.equal(graded.statusCode, 503, `a placement round is not graded without its claim (${JSON.stringify(graded.body)})`);
    assert.equal(errorCode(graded), 'claim_unavailable');

    // The design walkthrough's one-check claim is not reachable any more:
    // system design is hidden (owner decision, 9 Oct 2026), so its task does
    // not open and no walkthrough session is dealt.
    const design = CODING_TASKS.find((task) => task.track === 'system-design' && task.design)!;
    const opened = await call(roadmap as Handler, { account: A, query: { resource: 'coding-task', id: design.id } });
    assert.equal(opened.statusCode, 404, JSON.stringify(opened.body));
    console.log('PASS verified caller: a one-time claim Upstash cannot record answers 503');

    // ── an account made with an email and password ──────────────────────
    seen.length = 0;
    const event = await user('authevent', { method: 'POST', account: EMAIL, body: {} });
    assert.equal(event.statusCode, 200, JSON.stringify(event.body));
    const logged = reads('/rest/v1/auth_events').find((one) => one.method === 'POST')?.body as Row | undefined;
    assert.deepEqual(
      { user_id: logged?.user_id, email: logged?.email, provider: logged?.provider },
      { user_id: EMAIL.id, email: EMAIL.email, provider: 'email' },
      'a sign-in with a password is logged with its provider',
    );
    seen.length = 0;
    const named = await user('leaderboard-visibility', { method: 'PUT', account: EMAIL, body: { visible: true } });
    assert.equal(named.statusCode, 200, JSON.stringify(named.body));
    const shownRow = reads('/rest/v1/user_stats').find((one) => one.method === 'POST')?.body as Row | undefined;
    assert.deepEqual(
      { name: shownRow?.name, picture: shownRow?.picture, email: shownRow?.email },
      { name: null, picture: null, email: EMAIL.email },
      'without a Google identity the boards get no name and no picture, and never the address',
    );
    seen.length = 0;
    const deleted = await user('delete-account', { method: 'DELETE', account: EMAIL, body: { confirmation: 'DELETE' } });
    assert.equal(deleted.statusCode, 200, `an email account deletes like any other (${JSON.stringify(deleted.body)})`);
    assert.deepEqual(reads('/rest/v1/rpc/delete_user_data').map((one) => (one.body as Row).p_user_id), [EMAIL.id, EMAIL.id], 'its data is erased, before and after the identity');
    assert.equal(seen.filter((one) => one.method === 'DELETE' && one.path === `/auth/v1/admin/users/${EMAIL.id}`).length, 1, 'and its sign-in identity is deleted');
    console.log('PASS verified caller: an email and password account signs in, stays unnamed on boards, and deletes');

    console.log('Verified-caller contracts passed: a token acts for its own account whatever user_id says, admin by confirmed address or role, private caching by default, read limits, and one-time claims that fail closed.');
  } finally {
    for (const server of servers) server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
