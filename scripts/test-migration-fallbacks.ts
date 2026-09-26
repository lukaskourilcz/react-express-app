/* Migration fallbacks (review findings data-1 and data-2).
 *
 * `main` can deploy before the owner applies migrations 039 to 044, so the
 * handlers that name a fallback for a missing routine have to recognise the
 * answer they will really get. Every `.rpc()` goes through PostgREST, and
 * PostgREST 12 answers a routine it does not have with HTTP 404 and code
 * PGRST202, "Could not find the function public.x(...) in the schema cache".
 * The first fallbacks matched only Postgres's own "function ... does not
 * exist", so none of them fired.
 *
 * This runs the real `api/leaderboard.ts`, `api/quiz/challenge.ts` and the
 * tier gate of `lib/access.ts` against a local stand-in that answers the way
 * PostgREST 12.2.12 answered on a database holding 001 to 038, production's
 * shape before 039: every routine of 039 to 044 is PGRST202, and the older
 * routines the fallbacks call are there. Sign-in is answered by the same
 * stand-in. Nothing leaves the machine. */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Routines that exist on a 001-038 database and that a fallback calls. */
const INSTALLED: Record<string, unknown> = {
  record_verified_activity_xp: true,
  credit_tokens: true,
};

const USER = { id: '0b5e7c1e-2f7a-4c3d-9a61-5d2f0c9e8a41', email: 'fallback@example.invalid' };
const TOKEN = 'fallback-contract-token';

interface Call { name: string; args: Record<string, unknown> }

const readBody = (req: IncomingMessage) => new Promise<string>((resolve) => {
  let text = '';
  req.on('data', (chunk) => { text += chunk; });
  req.on('end', () => resolve(text));
});

async function startStandIn(calls: Call[]) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://stand-in');
    res.setHeader('content-type', 'application/json');
    if (url.pathname === '/auth/v1/user') {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (token !== TOKEN) {
        res.statusCode = 401;
        res.end(JSON.stringify({ message: 'invalid token' }));
        return;
      }
      res.end(JSON.stringify({ ...USER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }));
      return;
    }
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname);
    if (rpc) {
      const name = rpc[1];
      const raw = await readBody(req);
      calls.push({ name, args: raw ? JSON.parse(raw) : {} });
      if (name in INSTALLED) {
        res.end(JSON.stringify(INSTALLED[name]));
        return;
      }
      // PostgREST 12.2.12's answer for a routine missing from its schema cache.
      res.statusCode = 404;
      res.end(JSON.stringify({
        code: 'PGRST202',
        details: `Searched for the function public.${name} with the given parameters, but no matches were found in the schema cache.`,
        hint: null,
        message: `Could not find the function public.${name} in the schema cache`,
      }));
      return;
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      // Table reads (settings, the question bank): nothing stored.
      res.end('[]');
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'no route' }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // lib/http.ts and lib/auth.ts read these when they load, so they are set
  // before anything from the repository is imported.
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_ANON_KEY = 'anon-fallback-contract';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-fallback-contract';
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'NODE_ENV', 'VERCEL_ENV', 'VERCEL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    delete process.env[key];
  }
  return server;
}

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

async function main() {
  const calls: Call[] = [];
  const server = await startStandIn(calls);
  try {
    const [{ default: leaderboard }, { default: challenge }, tokens, access] = await Promise.all([
      import('../api/leaderboard'),
      import('../api/quiz/challenge'),
      import('../lib/quiz-tokens'),
      import('../lib/access'),
    ]);

    // The 30-day board before 040: 503 rpc_missing, which the Leaderboard
    // screen answers with the all-time board and a note, never a 500.
    for (const headers of [{}, { authorization: `Bearer ${TOKEN}` }]) {
      const res = mockResponse();
      await leaderboard({ method: 'GET', headers: { ...headers, 'x-forwarded-for': '10.20.0.1' }, query: { period: '30d' }, url: '/api/leaderboard?period=30d' } as never, res as never);
      assert.equal(res.statusCode, 503, `the 30-day board before 040 answers 503 (${Object.keys(headers).length ? 'signed in' : 'signed out'})`);
      assert.equal(res.body?.error?.code, 'rpc_missing');
    }
    assert.ok(calls.some((call) => call.name === 'window_leaderboard'), 'the board asked for window_leaderboard');

    // A finished Biggest Shark Challenge run before 040: the completion step
    // is missing, so the award goes through the older routine under the same
    // id, and the learner keeps the XP.
    calls.length = 0;
    const run = tokens.createChallengeRun(true, 'webdev');
    const proofs = [
      tokens.encodeScoreProof(run.runId, 'fallback-q1', 'webdev', true),
      tokens.encodeScoreProof(run.runId, 'fallback-q2', 'webdev', true),
      tokens.encodeScoreProof(run.runId, 'fallback-q3', 'webdev', false),
      tokens.encodeScoreProof(run.runId, 'fallback-q4', 'webdev', false),
      tokens.encodeScoreProof(run.runId, 'fallback-q5', 'webdev', false),
    ];
    const done = mockResponse();
    await challenge({
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.2' },
      query: { resource: 'complete' },
      url: '/api/quiz/challenge?resource=complete',
      body: { runToken: run.runToken, proofs },
    } as never, done as never);
    assert.equal(done.statusCode, 200, `a finished run before 040 is recorded (${JSON.stringify(done.body)})`);
    assert.deepEqual({ awarded: done.body.awarded, score: done.body.score, xp: done.body.xp }, { awarded: true, score: 2, xp: 10 });
    const names = calls.map((call) => call.name);
    const completion = names.indexOf('record_challenge_completion');
    const award = names.indexOf('record_verified_activity_xp');
    assert.ok(completion >= 0 && award > completion, `the handler tried 040's routine, then fell back (${names.join(', ')})`);
    assert.equal(calls[award].args.p_award_id, `challenge:${run.runId}`, 'the fallback keeps the award id');
    assert.equal(calls[award].args.p_user_id, USER.id);

    // The tier before 039: every account reads as free, so a cleared step
    // stays open and a new Premium step answers 402, never 503.
    calls.length = 0;
    assert.equal(await access.resolveTier(USER.id), 'free', 'a missing is_premium reads as the free tier');
    assert.ok(calls.some((call) => call.name === 'is_premium'));
    const level = { kind: 'learn-level', topic: 'react', level: 13 } as const;
    const cleared = mockResponse();
    assert.equal(await access.refuseLocked(cleared as never, USER.id, level, { cleared: async () => true }), false, 'a level already passed stays open');
    const locked = mockResponse();
    assert.equal(await access.refuseLocked(locked as never, USER.id, level, { cleared: async () => false }), true);
    assert.equal(locked.statusCode, 402, 'a Premium level answers 402 before 039, not 503');
    assert.equal(locked.body?.error?.code, 'premium_required');
  } finally {
    server.close();
  }
  console.log('Migration fallbacks passed: before 039 and 040, the 30-day board answers rpc_missing, a finished challenge run keeps its XP through the older routine, and the tier reads free, against a stand-in that answers PGRST202 as PostgREST 12 does.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
