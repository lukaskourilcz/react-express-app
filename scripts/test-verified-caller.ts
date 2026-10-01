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
}
const A: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000a', token: 'caller-a', email: 'a@example.invalid', confirmed: true };
const B: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000b', token: 'caller-b', email: 'b@example.invalid', confirmed: true };
const ADMIN_EMAIL = 'admin@example.invalid';
// Someone who signed up with the admin's address and never clicked the link.
const LISTED_UNCONFIRMED: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000c', token: 'listed-unconfirmed', email: ADMIN_EMAIL, confirmed: false };
const LISTED_CONFIRMED: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000d', token: 'listed-confirmed', email: ADMIN_EMAIL, confirmed: true };
const ROLE_ADMIN: Account = { id: '1a2b3c4d-0000-4000-8000-00000000000e', token: 'role-admin', email: 'role@example.invalid', confirmed: false, appMetadata: { role: 'admin' } };
const ACCOUNTS = [A, B, LISTED_UNCONFIRMED, LISTED_CONFIRMED, ROLE_ADMIN];

type Row = Record<string, unknown>;
interface Seen { method: string; path: string; filters: Record<string, string>; body: unknown }
const seen: Seen[] = [];
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
    res.setHeader('content-type', 'application/json');
    const send = (status: number, body: unknown) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    if (url.pathname === '/auth/v1/user') {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
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
        identities: [],
      });
    }
    const raw = req.method === 'GET' ? '' : await readBody(req);
    const body = raw ? JSON.parse(raw) as unknown : undefined;
    const filters = Object.fromEntries([...url.searchParams.entries()].filter(([, value]) => value.startsWith('eq.')).map(([key, value]) => [key, value.slice(3)]));
    seen.push({ method: req.method ?? 'GET', path: url.pathname, filters, body });
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname)?.[1];
    if (rpc) {
      // The Premium check: account A is Premium, so every coding task opens.
      if (rpc === 'is_premium') return send(200, (body as Row | undefined)?.p_user === A.id);
      if (rpc.endsWith('leaderboard') || rpc === 'friend_lookup') return send(200, []);
      return send(200, null);
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const single = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
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
    assert.deepEqual(reads('/rest/v1/rpc/save_coding_draft').map((one) => (one.body as Row).p_user_id), [A.id], 'a draft is saved for the token\'s account');
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
      ['the Learn map', await call(roadmap as Handler, {}), /^public, max-age=60$/],
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
    const level = await call(roadmap as Handler, { from: school, query: { topic: 'javascript', level: '1', lang: 'en' } });
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

    // ── one-time claims with Upstash configured and failing ──────────────
    upstashCommands.length = 0;
    await assert.rejects(
      rateLimit.claimOnce('placement:verified-caller-attempt-0001:1', 60),
      (error: unknown) => error instanceof http.ServiceUnavailableError && error.code === 'claim_unavailable',
      'a claim Upstash does not record is refused, not taken from this instance\'s memory',
    );
    assert.ok(upstashCommands.some((command) => command.includes('once:placement:verified-caller-attempt-0001:1')), 'the claim was asked of Upstash');

    const placement = await call(roadmap as Handler, { query: { resource: 'placement', subject: 'webdev', lang: 'en' } });
    assert.equal(placement.statusCode, 200, JSON.stringify(placement.body));
    const round = placement.body as { placementToken: string; questions: { id: string }[] };
    const graded = await call(roadmap as Handler, { method: 'POST', query: { resource: 'placement' }, body: { placementToken: round.placementToken, answers: Object.fromEntries(round.questions.map((q) => [q.id, 0])) } });
    assert.equal(graded.statusCode, 503, `a placement round is not graded without its claim (${JSON.stringify(graded.body)})`);
    assert.equal(errorCode(graded), 'claim_unavailable');

    const design = CODING_TASKS.find((task) => task.track === 'system-design' && task.design)!;
    const opened = await call(roadmap as Handler, { account: A, query: { resource: 'coding-task', id: design.id } });
    assert.equal(opened.statusCode, 200, JSON.stringify(opened.body));
    const walkthrough = opened.body as { session: string; task: { design: { steps: unknown[] } } };
    const checked = await call(roadmap as Handler, { method: 'POST', account: A, query: { resource: 'coding-submit' }, body: { session: walkthrough.session, answers: walkthrough.task.design.steps.map(() => 0) } });
    assert.equal(checked.statusCode, 503, `a design check is not graded without its claim (${JSON.stringify(checked.body)})`);
    assert.equal(errorCode(checked), 'claim_unavailable');
    console.log('PASS verified caller: a one-time claim Upstash cannot record answers 503');

    console.log('Verified-caller contracts passed: a token acts for its own account whatever user_id says, admin by confirmed address or role, private caching by default, read limits, and one-time claims that fail closed.');
  } finally {
    for (const server of servers) server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
