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
 * routines the fallbacks call are there. Then it installs the two plan
 * routines of 039, production's shape after 044 and before 045, and runs the
 * real `api/user/[op].ts` and `api/admin/[op].ts`: a voucher redemption answers
 * 503 `voucher_unavailable`, the owner's list names the missing migration, and
 * the plan and the tier gate work as before. Last, production's shape after
 * 046: `delete_user_data` is there, the four erasure routines of 039 to 042
 * are gone, and deleting an account asks for `delete_user_data` alone. On the
 * same stand-in, the stats write is checked to store the Google identity's
 * name and picture whatever the body or user_metadata says, and a friend
 * request to answer in the states the Friends screen reads. The stats write also credits
 * a quiz's coins for the XP migration 048 says it awarded, also on a retry
 * the routine answers FALSE after a commit that timed out, and for the
 * receipt's XP before 048 adds that column. Sign-in and the deletion of
 * the sign-in identity are answered by the same stand-in. Nothing leaves the
 * machine. */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Routines that exist on a 001-038 database and that a fallback calls. */
const INSTALLED: Record<string, unknown> = {
  record_verified_activity_xp: true,
  credit_tokens: true,
};

/** What a table read answers, by table; any other read finds nothing. */
const TABLE_READS: Record<string, { status: number; body: unknown }> = {};

/** Arguments an installed routine does not take yet: PostgREST finds no
 * routine for the call and answers PGRST202, as it does for a missing one. */
const UNKNOWN_ARGS: Record<string, string[]> = {};

const USER = { id: '0b5e7c1e-2f7a-4c3d-9a61-5d2f0c9e8a41', email: 'fallback@example.invalid' };
const TOKEN = 'fallback-contract-token';
/** What USER wrote into their own user_metadata. Any signed-in user can,
 * from the browser (supabase.auth.updateUser), so it is never the profile. */
let userMetadata: Record<string, unknown> = {};
/** What Google put on USER's Google identity: the verified profile. Null for
 * an account with no Google identity. */
let googleProfile: Record<string, unknown> | null = null;
/** Whether the verified user carries its identities, or the handler has to
 * ask the admin API for them. */
let identitiesInUser = true;
const identitiesOf = () => (googleProfile
  ? [{ provider: 'google', id: 'google-sub-1', user_id: USER.id, identity_data: { sub: 'google-sub-1', email: USER.email, ...googleProfile } }]
  : [{ provider: 'email', id: USER.id, user_id: USER.id, identity_data: { sub: USER.id, email: USER.email } }]);
const ADMIN = { id: '7c1f3a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b', email: 'owner@example.invalid' };
const ADMIN_TOKEN = 'fallback-contract-admin-token';

interface Call { name: string; args: Record<string, unknown> }

const readBody = (req: IncomingMessage) => new Promise<string>((resolve) => {
  let text = '';
  req.on('data', (chunk) => { text += chunk; });
  req.on('end', () => resolve(text));
});

async function startStandIn(calls: Call[], writes: Call[]) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://stand-in');
    res.setHeader('content-type', 'application/json');
    const adminUser = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(url.pathname);
    if (adminUser && req.method === 'GET') {
      calls.push({ name: 'auth.admin.getUserById', args: { id: decodeURIComponent(adminUser[1]) } });
      res.end(JSON.stringify({ ...USER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: userMetadata, identities: identitiesOf() }));
      return;
    }
    if (adminUser && req.method === 'DELETE') {
      calls.push({ name: 'auth.admin.deleteUser', args: { id: decodeURIComponent(adminUser[1]) } });
      res.end(JSON.stringify({ ...USER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }));
      return;
    }
    if (url.pathname === '/auth/v1/user') {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (token !== TOKEN && token !== ADMIN_TOKEN) {
        res.statusCode = 401;
        res.end(JSON.stringify({ message: 'invalid token' }));
        return;
      }
      const admin = token === ADMIN_TOKEN;
      res.end(JSON.stringify({
        ...(admin ? ADMIN : USER),
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: admin ? { role: 'admin' } : {},
        user_metadata: admin ? {} : userMetadata,
        ...(admin || identitiesInUser ? { identities: admin ? [] : identitiesOf() } : {}),
      }));
      return;
    }
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname);
    if (rpc) {
      const name = rpc[1];
      const raw = await readBody(req);
      const args = raw ? JSON.parse(raw) : {};
      calls.push({ name, args });
      const unknownArg = (UNKNOWN_ARGS[name] ?? []).some((arg) => arg in args);
      if (name in INSTALLED && !unknownArg) {
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
      // Table writes are recorded; table reads (settings, the question bank)
      // find nothing stored.
      if (req.method === 'POST' || req.method === 'PATCH') {
        const raw = await readBody(req);
        writes.push({ name: `write:${url.pathname.slice('/rest/v1/'.length)}`, args: raw ? JSON.parse(raw) : {} });
      }
      const read = req.method === 'GET' ? TABLE_READS[url.pathname.slice('/rest/v1/'.length)] : undefined;
      if (read) {
        calls.push({ name: `read:${url.pathname.slice('/rest/v1/'.length)}`, args: Object.fromEntries(url.searchParams) });
        res.statusCode = read.status;
        res.end(JSON.stringify(read.body));
        return;
      }
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
  const writes: Call[] = [];
  const server = await startStandIn(calls, writes);
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
    // An awarded run is a streak day from 048, so it settles the milestones.
    assert.ok(names.indexOf('settle_coin_milestones') > award, 'an awarded run settles the streak milestones');

    // From 052 the completion step takes the run's answers with their
    // categories and counts each question once a UTC day. Between 040 and
    // 052 it takes the breakdown alone and answers PGRST202 for p_outcomes,
    // so the handler asks again without them. Either way the XP is 5 a
    // correct answer.
    const { getEffectiveQuestions } = await import('../lib/questions-store');
    const bank = (await getEffectiveQuestions('webdev', false)).slice(0, 5);
    const answered = (runId: string) => bank.map((question, i) => tokens.encodeScoreProof(runId, question.id, 'webdev', i < 2));
    INSTALLED.record_challenge_completion = true;
    for (const shape of ['052', '040'] as const) {
      if (shape === '040') UNKNOWN_ARGS.record_challenge_completion = ['p_outcomes'];
      calls.length = 0;
      const played = tokens.createChallengeRun(true, 'webdev');
      const finished = mockResponse();
      await challenge({
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': `10.20.0.${shape === '052' ? 10 : 11}` },
        query: { resource: 'complete' },
        url: '/api/quiz/challenge?resource=complete',
        body: { runToken: played.runToken, proofs: answered(played.runId) },
      } as never, finished as never);
      assert.equal(finished.statusCode, 200, `a finished run is recorded on ${shape} (${JSON.stringify(finished.body)})`);
      assert.deepEqual({ awarded: finished.body.awarded, xp: finished.body.xp }, { awarded: true, xp: 10 });
      const completions = calls.filter((call) => call.name === 'record_challenge_completion');
      const expectedOutcomes = bank.map((question, i) => ({ questionId: question.id, category: question.category, isCorrect: i < 2 }));
      assert.deepEqual(completions[0]?.args.p_outcomes, expectedOutcomes, `the run's answers go with their categories (${shape})`);
      assert.equal(completions[0]?.args.p_xp, 10, 'the Challenge XP is unchanged');
      if (shape === '052') {
        assert.equal(completions.length, 1, 'one call on 052');
      } else {
        assert.equal(completions.length, 2, 'before 052 the handler asks again');
        assert.ok(!('p_outcomes' in completions[1].args), 'without the answers');
        const total = Object.values(completions[1].args.p_breakdown as Record<string, { total: number }>).reduce((sum, entry) => sum + entry.total, 0);
        assert.equal(total, 5, 'and with the breakdown 040 counts');
        assert.ok(!calls.some((call) => call.name === 'record_verified_activity_xp'), 'and never falls back to the bare award');
      }
    }
    delete UNKNOWN_ARGS.record_challenge_completion;
    delete INSTALLED.record_challenge_completion;

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

    // After 044 and before 045: the plan routines of 039 answer, the voucher
    // routines of 045 do not.
    INSTALLED.is_premium = false;
    INSTALLED.entitlement_summary = { premium: false, billingAccount: false, subscriptionLive: false };
    const [{ default: userOps }, { default: adminOps }] = await Promise.all([
      import('../api/user/[op]'),
      import('../api/admin/[op]'),
    ]);
    calls.length = 0;
    const redeem = mockResponse();
    await userOps({
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.3' },
      query: { op: 'voucher' },
      url: '/api/user/voucher',
      body: { code: 'K7Q2-ABCD-1234' },
    } as never, redeem as never);
    assert.equal(redeem.statusCode, 503, `a redemption before 045 answers 503 (${JSON.stringify(redeem.body)})`);
    assert.equal(redeem.body?.error?.code, 'voucher_unavailable');
    assert.ok(calls.some((call) => call.name === 'redeem_premium_voucher' && call.args.p_user_id === USER.id), 'the handler asked for the 045 routine');
    assert.ok(!JSON.stringify(calls).includes('K7Q2'), 'with the hash of the code, never the code');
    const plan = mockResponse();
    await userOps({ method: 'GET', headers: { authorization: `Bearer ${TOKEN}` }, query: { op: 'entitlement' }, url: '/api/user/entitlement' } as never, plan as never);
    assert.equal(plan.statusCode, 200, 'the plan still loads before 045');
    assert.equal(plan.body?.tier, 'free');
    const list = mockResponse();
    await adminOps({ method: 'GET', headers: { authorization: `Bearer ${ADMIN_TOKEN}`, 'x-forwarded-for': '10.20.0.4' }, query: { op: 'vouchers' }, url: '/api/admin/vouchers' } as never, list as never);
    assert.equal(list.statusCode, 503, `the owner's voucher list before 045 answers 503 (${JSON.stringify(list.body)})`);
    assert.equal(list.body?.error?.code, 'migration_required');
    const grants = mockResponse();
    await adminOps({ method: 'GET', headers: { authorization: `Bearer ${ADMIN_TOKEN}`, 'x-forwarded-for': '10.20.0.4' }, query: { op: 'learning-paths' }, url: '/api/admin/learning-paths' } as never, grants as never);
    assert.equal(grants.statusCode, 200, 'the other admin ops still answer');
    const stillLocked = mockResponse();
    assert.equal(await access.refuseLocked(stillLocked as never, USER.id, level, { cleared: async () => false }), true);
    assert.equal(stillLocked.statusCode, 402, 'the tier gate reads is_premium and still answers 402');

    // After 046: delete_user_data is there and the four erasure routines of
    // 039 to 042 are gone, so PostgREST answers PGRST202 for each. Deleting an
    // account asks for delete_user_data alone, then deletes the sign-in
    // identity.
    INSTALLED.delete_user_data = null;
    calls.length = 0;
    const erased = mockResponse();
    await userOps({
      method: 'DELETE',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.5' },
      query: { op: 'delete-account' },
      url: '/api/user/delete-account',
      body: { confirmation: 'DELETE' },
    } as never, erased as never);
    assert.equal(erased.statusCode, 200, `an account deletion after 046 answers 200 (${JSON.stringify(erased.body)})`);
    assert.deepEqual(erased.body, { ok: true });
    // Then it erases once more, for rows a billing webhook wrote meanwhile
    // (finding PROF-4).
    assert.deepEqual(calls.map((call) => call.name), ['delete_user_data', 'auth.admin.deleteUser', 'delete_user_data'],
      'the deletion asks for delete_user_data and no dropped routine, deletes the sign-in identity, then erases once more');
    assert.equal(calls[0].args.p_user_id, USER.id);
    assert.equal(calls[1].args.id, USER.id);
    assert.equal(calls[2].args.p_user_id, USER.id);

    // The name and picture a public board shows come from the account's
    // Google identity, never from the request body and never from
    // user_metadata, which the account can rewrite itself. A picture Google
    // does not serve is dropped, and the name loses control and
    // text-direction characters and is cut to sixty characters.
    const bodyProfile = { email: 'fallback@example.invalid', name: 'Somebody Else', picture: 'https://lh3.googleusercontent.com/a/somebody-else' };
    googleProfile = { full_name: `\u202EAda\u0007 ${'L'.repeat(100)}`, avatar_url: 'https://tracker.example/pixel.png' };
    userMetadata = { full_name: 'Grace Hopper', avatar_url: 'https://lh3.googleusercontent.com/a/grace' };
    writes.length = 0;
    const saved = mockResponse();
    await userOps({
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.6' },
      query: { op: 'stats' },
      url: '/api/user/stats',
      body: bodyProfile,
    } as never, saved as never);
    const upsert = writes.find((write) => write.name === 'write:user_stats');
    assert.ok(upsert, `the profile write reached user_stats (${saved.statusCode} ${JSON.stringify(saved.body)})`);
    assert.equal(upsert.args.name, `Ada ${'L'.repeat(56)}`, 'the name is Google\'s, cleaned and cut to 60 characters, not the one in user_metadata');
    assert.equal(upsert.args.picture, null, 'a picture Google does not serve is not stored, whatever user_metadata says');

    googleProfile = { name: 'Ada Lovelace', picture: 'https://lh3.googleusercontent.com/a/ada=s96-c' };
    userMetadata = { name: 'Edited In The Browser', picture: 'https://lh3.googleusercontent.com/a/edited' };
    calls.length = 0;
    INSTALLED.record_verified_quiz_result_v2 = false;
    const receipt = tokens.encodeQuizResultReceipt({
      userId: USER.id,
      correct: 1,
      total: 1,
      breakdown: { html: { correct: 1, total: 1 } },
      outcomes: [{ questionId: 'fallback-html-1', category: 'html', isCorrect: true }],
      subject: 'webdev',
      questXp: 0,
      purpose: 'quiz',
    });
    const recorded = mockResponse();
    await userOps({
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.7' },
      query: { op: 'stats' },
      url: '/api/user/stats',
      body: { result_receipt: receipt, profile: { ...bodyProfile, picture: 'https://tracker.example/pixel.png' } },
    } as never, recorded as never);
    const result = calls.find((call) => call.name === 'record_verified_quiz_result_v2');
    assert.ok(result, `the quiz result reached the routine (${recorded.statusCode} ${JSON.stringify(recorded.body)})`);
    assert.equal(result.args.p_name, 'Ada Lovelace', 'a quiz result stores Google\'s name, not the body\'s or user_metadata\'s');
    assert.equal(result.args.p_picture, 'https://lh3.googleusercontent.com/a/ada=s96-c', 'and Google\'s picture');

    // A verified user without its identities: the handler asks the admin API.
    identitiesInUser = false;
    writes.length = 0;
    calls.length = 0;
    await userOps({
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.9' },
      query: { op: 'stats' },
      url: '/api/user/stats',
      body: bodyProfile,
    } as never, mockResponse() as never);
    assert.deepEqual(calls.filter((call) => call.name === 'auth.admin.getUserById').map((call) => call.args.id), [USER.id], 'the identities are read for the verified account');
    assert.equal(writes.find((write) => write.name === 'write:user_stats')?.args.name, 'Ada Lovelace', 'and the name is still Google\'s');
    identitiesInUser = true;

    // Migration 048 counts a question once per learner and UTC day, so the
    // routine can award less XP than the receipt names. It keeps the amount on
    // the attempt row, and the coins and the gain the client announces follow
    // that amount. Before 048 the column is missing (PostgREST's 42703) and the
    // routine awarded the receipt's XP, which the handler then uses.
    INSTALLED.record_verified_quiz_result_v2 = true;
    INSTALLED.credit_verified_xp_tokens = 3;
    for (const [read, expected] of [
      [{ status: 200, body: [{ quest_xp: 16 }] }, 16],
      [{ status: 400, body: { code: '42703', details: null, hint: null, message: 'column quiz_attempts.quest_xp does not exist' } }, 80],
    ] as const) {
      TABLE_READS.quiz_attempts = read;
      calls.length = 0;
      const scaled = tokens.encodeQuizResultReceipt({
        userId: USER.id,
        correct: 10,
        total: 10,
        breakdown: { html: { correct: 10, total: 10 } },
        outcomes: Array.from({ length: 10 }, (_, i) => ({ questionId: `fallback-html-${i}`, category: 'html', isCorrect: true, xp: 8 })),
        subject: 'webdev',
        questXp: 80,
        purpose: 'quiz',
      });
      const saved = mockResponse();
      await userOps({
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.7' },
        query: { op: 'stats' },
        url: '/api/user/stats',
        body: { result_receipt: scaled },
      } as never, saved as never);
      assert.equal(saved.statusCode, 200, `the result is recorded (${JSON.stringify(saved.body)})`);
      const attempt = calls.find((call) => call.name === 'read:quiz_attempts');
      assert.ok(attempt, 'the handler reads the XP the routine awarded');
      assert.equal(attempt.args.user_id, `eq.${USER.id}`, 'from the learner\'s own attempt');
      const credit = calls.find((call) => call.name === 'credit_verified_xp_tokens');
      assert.equal(credit?.args.p_xp, expected, `coins follow the awarded XP: ${expected}`);
      assert.equal(saved.body?.questXp, expected, 'and the response names it for the client to announce');
      assert.ok(calls.some((call) => call.name === 'settle_coin_milestones'), 'the streak day settles the milestones');
      // From 052 each outcome carries its question's XP to the routine, which
      // pays only the questions not answered earlier the same UTC day.
      const recorded = calls.find((call) => call.name === 'record_verified_quiz_result_v2');
      assert.deepEqual((recorded?.args.p_outcomes as { xp?: number }[]).map((outcome) => outcome.xp), Array(10).fill(8), 'each outcome carries its XP');
    }

    // The routine can commit and then time out. The retry finds the attempt
    // recorded and answers FALSE, yet the XP was awarded, so the coins follow
    // the stored amount; the credit is keyed to the attempt and pays once. A
    // NULL amount is a refused result (a second daily for the day) that
    // awarded nothing, and a failed read for an attempt this request did not
    // apply credits nothing. Before, a FALSE answer credited nothing at all.
    INSTALLED.record_verified_quiz_result_v2 = false;
    for (const [label, read, expected] of [
      ['a commit that timed out', { status: 200, body: [{ quest_xp: 16 }] }, 16],
      ['a refused daily', { status: 200, body: [{ quest_xp: null }] }, 0],
      ['an unreadable amount', { status: 400, body: { code: '42703', details: null, hint: null, message: 'column quiz_attempts.quest_xp does not exist' } }, 0],
    ] as const) {
      TABLE_READS.quiz_attempts = read;
      calls.length = 0;
      const attemptId = `retry-attempt-${expected}-${label.length}`.padEnd(24, 'x');
      const retried = tokens.encodeQuizResultReceipt({
        userId: USER.id,
        attemptId,
        correct: 10,
        total: 10,
        breakdown: { html: { correct: 10, total: 10 } },
        outcomes: Array.from({ length: 10 }, (_, i) => ({ questionId: `fallback-html-${i}`, category: 'html', isCorrect: true })),
        subject: 'webdev',
        questXp: 80,
        purpose: 'quiz',
      });
      const saved = mockResponse();
      await userOps({
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.7' },
        query: { op: 'stats' },
        url: '/api/user/stats',
        body: { result_receipt: retried },
      } as never, saved as never);
      assert.equal(saved.statusCode, 200, `${label}: ${JSON.stringify(saved.body)}`);
      assert.equal(saved.body?.applied, false, `${label}: the routine did not apply it now`);
      const credit = calls.find((call) => call.name === 'credit_verified_xp_tokens');
      if (expected > 0) {
        assert.equal(credit?.args.p_xp, expected, `${label}: the coins follow the stored XP`);
        assert.equal(credit?.args.p_award_id, `quiz:${attemptId}`, `${label}: keyed to the attempt, so they pay once`);
      } else {
        assert.equal(credit, undefined, `${label}: no coins`);
      }
    }
    delete TABLE_READS.quiz_attempts;
    INSTALLED.record_verified_quiz_result_v2 = false;

    // An account without a Google identity has no verified name, whatever it
    // wrote into its own metadata.
    googleProfile = null;
    userMetadata = { full_name: 'Self Named', avatar_url: 'https://lh3.googleusercontent.com/a/self' };
    writes.length = 0;
    await userOps({
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.8' },
      query: { op: 'stats' },
      url: '/api/user/stats',
      body: bodyProfile,
    } as never, mockResponse() as never);
    const nameless = writes.find((write) => write.name === 'write:user_stats');
    assert.equal(nameless?.args.name, null, 'an account without a provider name stores no name, and never the email');
    assert.equal(nameless?.args.picture, null);

    // request_friend answers 'pending' for a new request, a repeated one and a
    // request a block dropped. The screen reads states from the asker's side,
    // so each answers 'pending_out' ("Request sent"); 'accepted' passes as is.
    for (const [answer, state] of [['pending', 'pending_out'], ['accepted', 'accepted']] as const) {
      INSTALLED.request_friend = answer;
      calls.length = 0;
      const asked = mockResponse();
      await userOps({
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.9' },
        query: { op: 'friends-request' },
        url: '/api/user/friends-request',
        body: { handle: 'harbour-reader' },
      } as never, asked as never);
      assert.equal(asked.statusCode, 200, `a friend request answers 200 (${JSON.stringify(asked.body)})`);
      assert.deepEqual(asked.body, { state }, `request_friend's '${answer}' reaches the screen as '${state}'`);
      assert.equal(calls[0]?.args.p_handle, 'harbour-reader');
    }

    // The streak shield. From 052 the budget read returns every date a
    // shield covered (shieldDays), and the Profile counts a day under any of
    // them as not missed; before 052 there are none and shieldUntil alone is
    // read. A shield that would spend the protection a missed day still needs
    // is refused by the routine and answered 409 shield_would_end_streak.
    const freezes = async (method: 'GET' | 'POST') => {
      const res = mockResponse();
      await userOps({
        method,
        headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.20.0.12' },
        query: { op: 'freezes' },
        url: '/api/user/freezes',
      } as never, res as never);
      return res;
    };
    INSTALLED.refresh_streak_freezes = [{
      period: '2026-09', remaining: 1, used: [], shield_until: '2026-09-29T00:00:00+00:00',
      shield_days: ['2026-09-26', '2026-09-27', '2026-09-28'],
    }];
    let budget = await freezes('GET');
    assert.equal(budget.statusCode, 200, JSON.stringify(budget.body));
    assert.deepEqual(budget.body.shieldDays, ['2026-09-26', '2026-09-27', '2026-09-28'], 'the Profile gets every shielded date');
    assert.equal(budget.body.shieldUntil, '2026-09-29T00:00:00+00:00');
    INSTALLED.refresh_streak_freezes = [{ period: '2026-09', remaining: 1, used: [], shield_until: '2026-09-29T00:00:00+00:00' }];
    budget = await freezes('GET');
    assert.deepEqual(
      { days: budget.body.shieldDays, until: budget.body.shieldUntil, supported: budget.body.shieldSupported },
      { days: [], until: '2026-09-29T00:00:00+00:00', supported: true },
      'before 052 the read has no shielded dates and the latest shield still reads',
    );

    INSTALLED.activate_streak_shield = [{
      granted: false, period: '2026-09', remaining: 1, used: [], shield_until: null, shield_days: [], outcome: 'would_end_streak',
    }];
    const refused = await freezes('POST');
    assert.equal(refused.statusCode, 409, JSON.stringify(refused.body));
    assert.deepEqual(
      { code: refused.body?.error?.code, message: refused.body?.error?.message },
      { code: 'shield_would_end_streak', message: 'Learn today to keep your streak' },
    );
    INSTALLED.activate_streak_shield = [{
      granted: true, period: '2026-09', remaining: 0, used: ['2026-09-29'], shield_until: '2026-10-01T00:00:00+00:00',
      shield_days: ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'], outcome: 'granted',
    }];
    const raised = await freezes('POST');
    assert.equal(raised.statusCode, 200, JSON.stringify(raised.body));
    assert.deepEqual(raised.body.shieldDays, ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'], 'a raised shield returns every shielded date');
    INSTALLED.activate_streak_shield = [{
      granted: false, period: '2026-09', remaining: 0, used: [], shield_until: null, shield_days: [], outcome: 'empty',
    }];
    const empty = await freezes('POST');
    assert.equal(empty.statusCode, 409);
    assert.equal(empty.body?.error?.code, 'no_protection_left', 'an empty budget answers as before');
  } finally {
    server.close();
  }
  console.log('Migration fallbacks passed: before 039 and 040, the 30-day board answers rpc_missing, a finished challenge run keeps its XP through the older routine, and the tier reads free; before 045, a voucher redemption answers 503 voucher_unavailable while the plan, the admin console and the tier gate keep working; after 046, an account deletion calls delete_user_data alone; the stats write stores the name and picture of the Google identity and ignores the body and user_metadata, and credits the coins of a quiz for the XP the routine awarded; a friend request answers pending_out; a finished challenge run sends its answers from 052 and only its breakdown before; the streak shield returns every shielded date and answers 409 shield_would_end_streak when the routine refuses; against a stand-in that answers PGRST202 as PostgREST 12 does.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
