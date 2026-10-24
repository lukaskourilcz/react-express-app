/* The Learn branches' round trips (#587).
 *
 * Runs the real `api/quiz/roadmap.ts` against a local stand-in for Supabase
 * Auth and PostgREST that answers every request after DELAY_MS and records
 * when each one started and ended, so the contract can say which requests
 * run together and which wait for another. It pins:
 *  - each Learn level's coding task list is worked out once per instance
 *    (server item 25);
 *  - the learning-path catalogue is the same for every caller, costs no
 *    round trip and is shared by the CDN (server item 12);
 * Run as its own process by scripts/test-request-timing.ts, since the
 * modules read these settings when they load. Nothing leaves the machine. */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

const DELAY_MS = 40;
type Row = Record<string, unknown>;
interface Call { name: string; start: number; end: number }
const calls: Call[] = [];

const readBody = (req: IncomingMessage) => new Promise<string>((resolve) => {
  let text = '';
  req.on('data', (chunk) => { text += chunk; });
  req.on('end', () => resolve(text));
});

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    headersSent: false,
    setHeader(key: string, value: string) { res.headers[key.toLowerCase()] = value; return res; },
    getHeader(key: string) { return res.headers[key.toLowerCase()]; },
    status(code: number) { res.statusCode = code; return res; },
    json(body: unknown) { res.body = body; res.headersSent = true; return res; },
    send(body: unknown) { res.body = body; res.headersSent = true; return res; },
    end() { res.headersSent = true; return res; },
  };
  return res;
}

async function startStandIn() {
  const server = createServer(async (req, res) => {
    const start = performance.now();
    const url = new URL(req.url ?? '/', 'http://stand-in');
    const raw = await readBody(req);
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    res.setHeader('content-type', 'application/json');
    const send = (name: string, status: number, body: unknown) => {
      calls.push({ name, start, end: performance.now() });
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/auth/v1/user') return send('auth', 401, { message: 'invalid token' });
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname)?.[1];
    if (rpc) return send(`rpc:${rpc}`, 200, null);
    const table = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)?.[1] ?? 'unknown';
    void raw;
    return send(`${req.method} ${table}`, 200, []);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // lib/http.ts and lib/auth.ts read these when they load, so they are set
  // before anything from the repository is imported.
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_ANON_KEY = 'anon-round-trips';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-round-trips';
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'NODE_ENV', 'VERCEL_ENV', 'VERCEL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    delete process.env[key];
  }
  return server;
}

const server = await startStandIn();
try {
  const roadmap = await import('../api/quiz/roadmap');
  const { levelCodingTasks } = await import('../lib/coding/active');
  const { LEARN_CODING_TOPICS } = await import('../shared/coding-catalog');
  const { topicLevelCount } = await import('../lib/roadmap');

  // ── server item 25: one filter per level and instance ─────────────────
  for (const topic of LEARN_CODING_TOPICS) {
    for (let level = 1; level <= topicLevelCount(topic); level++) {
      const first = await roadmap.learnLevelCodingTasks(topic, level);
      assert.deepEqual(first.map((task) => task.id), levelCodingTasks(topic, level).map((task) => task.id), `${topic} ${level}: the same tasks in the same order`);
      assert.equal(await roadmap.learnLevelCodingTasks(topic, level), first, `${topic} ${level}: worked out once, then kept`);
      assert.ok(Object.isFrozen(first), `${topic} ${level}: the kept list cannot be changed by a caller`);
    }
  }
  console.log('PASS round trips: a Learn level\'s coding tasks are worked out once per instance');

  let address = 0;
  const call = async (method: string, query: Record<string, string>, token?: string, body?: unknown) => {
    const res = mockResponse();
    address += 1;
    await roadmap.default({
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-forwarded-for': `10.40.0.${address % 250}` },
      query,
      url: '/api/quiz/roadmap',
      body,
    } as never, res as never);
    return res;
  };

  // ── server item 12: the catalogue in the CDN ──────────────────────────
  {
    const before = calls.length;
    const guest = await call('GET', { resource: 'learning-path-catalog' });
    const signedIn = await call('GET', { resource: 'learning-path-catalog' }, 'any-token');
    assert.equal(guest.statusCode, 200, JSON.stringify(guest.body));
    assert.deepEqual(signedIn.body, guest.body, 'the same answer for a guest and an account');
    assert.equal(calls.length, before, 'the catalogue reads no token and no table');
    for (const res of [guest, signedIn]) {
      assert.equal(res.headers['cache-control'], 'public, max-age=60, s-maxage=300, stale-while-revalidate=600', 'shared by the CDN for five minutes');
    }
    const refused = await call('POST', { resource: 'learning-path-catalog' });
    assert.equal(refused.statusCode, 405);
    assert.equal(refused.headers['cache-control'], 'private, no-store', 'a refusal keeps the private default');
  }
  console.log('PASS round trips: the learning-path catalogue is the same for everyone and shared by the CDN');
} finally {
  server.close();
}
