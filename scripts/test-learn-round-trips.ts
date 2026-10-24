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
 *  - a completion reads its coding rows and checks the tier with its first
 *    reads, inserts nothing for a session the tier refuses, and then runs the
 *    reload (followed by the coin and referral credits together), the
 *    milestone settlement and the concept reviews at once (server item 5);
 * Run as its own process by scripts/test-request-timing.ts, since the
 * modules read these settings when they load. Nothing leaves the machine. */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

const DELAY_MS = 40;
type Row = Record<string, unknown>;
interface Call { name: string; start: number; end: number }
const calls: Call[] = [];

const LEARNER = { id: '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e', email: 'learner@example.invalid', token: 'round-trips-learner' };
const PREMIUM_LEARNER = { id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', email: 'premium@example.invalid', token: 'round-trips-premium' };
const USERS = [LEARNER, PREMIUM_LEARNER];
const PREMIUM = new Set([PREMIUM_LEARNER.id]);
const tables: Record<string, Row[]> = {
  roadmap_progress: [],
  roadmap_attempts: [],
  roadmap_attempt_answers: [],
  roadmap_attempt_coding: [],
};

/** `col=eq.value` filters, the only kind these handlers send. */
const filtersOf = (url: URL): [string, string][] => [...url.searchParams.entries()]
  .filter(([key, value]) => !['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key) && value.startsWith('eq.'))
  .map(([key, value]) => [key, value.slice(3)]);
const matches = (row: Row, filters: [string, string][]) => filters.every(([key, value]) => String(row[key]) === value);

/** The parts of record_roadmap_answer_v2 the handler relies on. */
function recordAnswer(args: Row): Row {
  let attempt = tables.roadmap_attempts.find((row) => row.attempt_id === args.p_attempt_id);
  if (!attempt) {
    attempt = {
      attempt_id: args.p_attempt_id, user_id: args.p_user_id ?? null, subject: args.p_subject, topic: args.p_topic,
      kind: args.p_kind, ref: args.p_ref, total_questions: args.p_total_questions, pass_pct: args.p_pass_pct,
      required_level_start: args.p_required_start ?? null, required_level_end: args.p_required_end ?? null, completed_at: null,
    };
    tables.roadmap_attempts.push(attempt);
  }
  const answer = {
    attempt_id: args.p_attempt_id, question_id: args.p_question_id,
    selected_index: args.p_selected_index, correct_index: args.p_correct_index,
    is_correct: args.p_selected_index === args.p_correct_index,
  };
  tables.roadmap_attempt_answers.push(answer);
  return { selectedIndex: answer.selected_index, correctAnswer: answer.correct_index, isCorrect: answer.is_correct };
}

/** A first pass, as complete_verified_roadmap_attempt_v2 reports one. */
function completeAttempt(args: Row): Row {
  const attempt = tables.roadmap_attempts.find((row) => row.attempt_id === args.p_attempt_id)!;
  attempt.completed_at = new Date().toISOString();
  return { applied: true, passed: true, firstPass: true, repeatXp: null };
}

/** A progress record with these levels of a topic passed. */
function passedLevels(userId: string, topic: string, upTo: number) {
  const levels = Object.fromEntries(Array.from({ length: upTo }, (_, index) => [String(index + 1), { passed: true, bestPct: 100 }]));
  tables.roadmap_progress = tables.roadmap_progress.filter((row) => row.user_id !== userId);
  tables.roadmap_progress.push({ user_id: userId, data: { [topic]: { levels, checkpoints: {} } }, extra: {} });
}

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
    if (url.pathname === '/auth/v1/user') {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      const user = USERS.find((one) => one.token === token);
      if (!user) return send('auth', 401, { message: 'invalid token' });
      return send('auth', 200, { id: user.id, email: user.email, email_confirmed_at: '2026-09-01T00:00:00Z', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} });
    }
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname)?.[1];
    if (rpc) {
      const args = (raw ? JSON.parse(raw) : {}) as Row;
      if (rpc === 'record_roadmap_answer_v2') return send(`rpc:${rpc}`, 200, recordAnswer(args));
      if (rpc === 'complete_verified_roadmap_attempt_v2') return send(`rpc:${rpc}`, 200, completeAttempt(args));
      if (rpc === 'is_premium') return send(`rpc:${rpc}`, 200, PREMIUM.has(String(args.p_user)));
      // Rewards and concept reviews: nothing to report.
      return send(`rpc:${rpc}`, 200, null);
    }
    const table = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)?.[1] ?? 'unknown';
    const name = `${req.method} ${table}`;
    const rows = tables[table] ?? [];
    const filters = filtersOf(url);
    const single = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
    if (req.method === 'POST') {
      const inserted = JSON.parse(raw) as Row | Row[];
      const list = Array.isArray(inserted) ? inserted : [inserted];
      rows.push(...list);
      return send(name, 201, single ? list[0] : list);
    }
    if (req.method === 'PATCH') {
      const found = rows.filter((row) => matches(row, filters));
      for (const row of found) Object.assign(row, JSON.parse(raw) as Row);
      return send(name, 200, found);
    }
    const found = rows.filter((row) => matches(row, filters));
    if (single) return found.length === 1 ? send(name, 200, found[0]) : send(name, 406, { code: 'PGRST116', message: 'no rows' });
    return send(name, 200, found);
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

  const tokens = await import('../lib/quiz-tokens');
  const answerAll = async (sessionId: string, token: string) => {
    const session = tokens.decodeSessionEnvelope(sessionId)!;
    for (const question of session.questions) {
      const res = await call('POST', { resource: 'answer' }, token, { sessionId, questionId: question.questionId, selectedIndex: question.correctAnswer });
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    }
    return session;
  };
  /** The calls one request made, by name. */
  const during = async (run: () => Promise<unknown>) => {
    const from = calls.length;
    const result = await run();
    return { result, made: calls.slice(from) };
  };
  const one = (made: Call[], name: string) => {
    const found = made.filter((call) => call.name === name);
    assert.equal(found.length, 1, `one ${name} (${made.map((call) => call.name).join(', ')})`);
    return found[0];
  };
  /** Whether two calls were in flight at the same time. */
  const together = (a: Call, b: Call) => a.start < b.end && b.start < a.end;

  // ── server item 5: a first pass of a code level ────────────────────────
  // JavaScript level 3 carries one coding task and seven questions that name
  // a concept. The record says the learner passed it before, so the
  // progression guard serves it whatever their plan.
  {
    passedLevels(LEARNER.id, 'javascript', 3);
    const level = await call('GET', { topic: 'javascript', level: '3' }, LEARNER.token);
    assert.equal(level.statusCode, 200, JSON.stringify(level.body));
    const session = await answerAll(level.body.sessionId, LEARNER.token);
    assert.ok((session.codingTaskIds?.length ?? 0) > 0, 'the level seals a coding task');
    for (const taskId of session.codingTaskIds!) {
      tables.roadmap_attempt_coding.push({ attempt_id: session.attemptId, task_id: taskId, passed: true, verified: true, revealed: false });
    }
    const { result, made } = await during(() => call('POST', { resource: 'complete' }, LEARNER.token, { sessionId: level.body.sessionId }));
    const res = result as ReturnType<typeof mockResponse>;
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.passed, res.body.applied, res.body.codingPending], [true, true, []], 'the level passes with its coding task');
    assert.ok(res.body.progress?.javascript?.levels?.['3']?.passed, 'and answers with the reloaded progress');
    const answers = one(made, 'GET roadmap_attempt_answers');
    assert.ok(together(one(made, 'GET roadmap_attempt_coding'), answers), 'the coding rows are read with the answers');
    assert.ok(together(one(made, 'GET roadmap_attempts'), answers), 'as is the attempt');
    assert.equal(made.filter((call) => call.name === 'rpc:is_premium').length, 0, 'a free level asks for no tier');
    const completion = one(made, 'rpc:complete_verified_roadmap_attempt_v2');
    const reload = made.find((call) => call.name === 'GET roadmap_progress' && call.start >= completion.end)!;
    assert.ok(reload, 'the progress is reloaded after the completion');
    const settle = one(made, 'rpc:settle_coin_milestones');
    const reviews = made.filter((call) => call.name === 'rpc:record_concept_review');
    assert.ok(reviews.length > 0, 'the concepts the level graded are recorded');
    for (const follower of [settle, ...reviews]) {
      assert.ok(follower.start >= completion.end, `${follower.name} waits for the completion`);
      assert.ok(together(follower, reload), `${follower.name} runs with the reload`);
    }
    const credit = one(made, 'rpc:credit_verified_xp_tokens');
    const referral = one(made, 'rpc:credit_referral');
    for (const follower of [credit, referral]) assert.ok(follower.start >= reload.end, `${follower.name} reads the reloaded record first`);
    assert.ok(together(credit, referral), 'the coin and referral credits run together');
    assert.ok(Math.max(...made.map((call) => call.end)) - completion.end < 3 * DELAY_MS, 'what follows the completion takes two waves, not five');
  }
  console.log('PASS round trips: a completion reads its coding rows with its first reads and runs what follows the close at once');

  // ── server item 5: the tier gate of a Premium level ───────────────────
  {
    passedLevels(PREMIUM_LEARNER.id, 'nodejs', 10);
    const level = await call('GET', { topic: 'nodejs', level: '10' }, PREMIUM_LEARNER.token);
    assert.equal(level.statusCode, 200, JSON.stringify(level.body));
    await answerAll(level.body.sessionId, PREMIUM_LEARNER.token);
    const { result, made } = await during(() => call('POST', { resource: 'complete' }, PREMIUM_LEARNER.token, { sessionId: level.body.sessionId }));
    assert.equal((result as ReturnType<typeof mockResponse>).statusCode, 200);
    assert.ok(together(one(made, 'rpc:is_premium'), one(made, 'GET roadmap_attempts')), 'the tier is checked with the first reads');

    // A session issued while the account was Premium, completed after it
    // lapsed, with no answer that opened its attempt: 402, and no write.
    const fresh = await call('GET', { topic: 'nodejs', level: '10' }, PREMIUM_LEARNER.token);
    assert.equal(fresh.statusCode, 200);
    PREMIUM.delete(PREMIUM_LEARNER.id);
    tables.roadmap_progress = tables.roadmap_progress.filter((row) => row.user_id !== PREMIUM_LEARNER.id);
    try {
      const lapsed = await during(() => call('POST', { resource: 'complete' }, PREMIUM_LEARNER.token, { sessionId: fresh.body.sessionId }));
      assert.equal((lapsed.result as ReturnType<typeof mockResponse>).statusCode, 402, JSON.stringify((lapsed.result as ReturnType<typeof mockResponse>).body));
      // The reads the request started finish after it answered.
      await new Promise((resolve) => setTimeout(resolve, 3 * DELAY_MS));
      const after = calls.slice(calls.indexOf(lapsed.made[0]));
      assert.equal(after.filter((call) => call.name.startsWith('POST') || call.name.startsWith('PATCH')).length, 0, 'a refused session inserts no attempt');
      assert.equal(after.filter((call) => call.name.startsWith('rpc:') && call.name !== 'rpc:is_premium').length, 0, 'and completes nothing');
    } finally {
      PREMIUM.add(PREMIUM_LEARNER.id);
    }
  }
  console.log('PASS round trips: a Premium completion checks its tier with its first reads, and a refused one writes nothing');
} finally {
  server.close();
}
