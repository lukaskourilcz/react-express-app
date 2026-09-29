/* Learn integrity against a stand-in database.
 *
 * Runs the real `api/quiz/roadmap.ts` against a local stand-in that answers
 * the way PostgREST does for the learning tables and routines, with the
 * state kept in memory. It covers what only shows once a database answers:
 *
 *  - the progress a completion returns is the progress the GET returns,
 *    spaced-mastery fields included, because the browser replaces its copy
 *    with it;
 *
 * Nothing leaves the machine. */

import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

const LEARNER = { id: '5a0e7c1e-2f7a-4c3d-9a61-5d2f0c9e8a41', email: 'learner@example.invalid', token: 'learn-contract-learner' };
const OTHER = { id: '9b1f3a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b', email: 'other@example.invalid', token: 'learn-contract-other' };
const OWNER = { id: '3c2d1e0f-6a7b-4c8d-9e0f-a1b2c3d4e5f6', email: 'owner@example.invalid', token: 'learn-contract-owner' };
const BROKEN = { id: '7d6c5b4a-3e2f-4a1b-8c9d-0e1f2a3b4c5d', email: 'broken@example.invalid', token: 'learn-contract-broken' };
const USERS = [LEARNER, OTHER, OWNER, BROKEN];
const PREMIUM = new Set([OWNER.id]);
const DAY = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {
  roadmap_progress: [],
  roadmap_attempts: [],
  roadmap_attempt_answers: [],
  roadmap_attempt_coding: [],
};

const readBody = (req: IncomingMessage) => new Promise<string>((resolve) => {
  let text = '';
  req.on('data', (chunk) => { text += chunk; });
  req.on('end', () => resolve(text));
});

/** `col=eq.value` filters, the only kind these handlers send. */
function filtersOf(url: URL): [string, string][] {
  return [...url.searchParams.entries()]
    .filter(([key, value]) => !['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key) && value.startsWith('eq.'))
    .map(([key, value]) => [key, value.slice(3)]);
}
const matches = (row: Row, filters: [string, string][]) => filters.every(([key, value]) => String(row[key]) === value);

/** The subset of record_roadmap_answer_v2 the handler relies on: open the
 * attempt on the first answer, refuse another account's attempt, keep the
 * first answer to each question. */
function recordAnswer(args: Row): { status: number; body: unknown } {
  let attempt = tables.roadmap_attempts.find((row) => row.attempt_id === args.p_attempt_id);
  if (!attempt) {
    attempt = {
      attempt_id: args.p_attempt_id, user_id: args.p_user_id ?? null, subject: args.p_subject, topic: args.p_topic,
      kind: args.p_kind, ref: args.p_ref, total_questions: args.p_total_questions, pass_pct: args.p_pass_pct,
      required_level_start: args.p_required_start ?? null, required_level_end: args.p_required_end ?? null, completed_at: null,
    };
    tables.roadmap_attempts.push(attempt);
  }
  if ((attempt.user_id ?? null) !== (args.p_user_id ?? null) || attempt.completed_at) {
    return { status: 400, body: { code: 'P0001', message: 'invalid_roadmap_attempt' } };
  }
  let answer = tables.roadmap_attempt_answers.find((row) => row.attempt_id === args.p_attempt_id && row.question_id === args.p_question_id);
  if (!answer) {
    answer = {
      attempt_id: args.p_attempt_id, question_id: args.p_question_id,
      selected_index: args.p_selected_index, correct_index: args.p_correct_index,
      is_correct: args.p_selected_index === args.p_correct_index,
    };
    tables.roadmap_attempt_answers.push(answer);
  }
  return { status: 200, body: { selectedIndex: answer.selected_index, correctAnswer: answer.correct_index, isCorrect: answer.is_correct } };
}

/** The subset of complete_verified_roadmap_attempt (migration 025) the
 * handler relies on, including the mastery fields it writes on a level. */
function completeAttempt(args: Row): { status: number; body: unknown } {
  const attempt = tables.roadmap_attempts.find((row) => row.attempt_id === args.p_attempt_id);
  if (!attempt || attempt.user_id !== args.p_user_id) return { status: 400, body: { code: 'P0001', message: 'invalid_roadmap_attempt' } };
  if (attempt.completed_at) return { status: 200, body: false };
  const answers = tables.roadmap_attempt_answers.filter((row) => row.attempt_id === attempt.attempt_id);
  if (answers.length !== attempt.total_questions) return { status: 400, body: { code: 'P0001', message: 'incomplete_roadmap_attempt' } };
  let row = tables.roadmap_progress.find((one) => one.user_id === args.p_user_id);
  if (!row) {
    row = { user_id: args.p_user_id, data: {}, extra: {} };
    tables.roadmap_progress.push(row);
  }
  const data = row.data as Record<string, { levels: Record<string, Row>; checkpoints: Record<string, Row> }>;
  const topic = String(attempt.topic);
  data[topic] ??= { levels: {}, checkpoints: {} };
  if (attempt.required_level_start != null) {
    for (let level = Number(attempt.required_level_start); level <= Number(attempt.required_level_end); level++) {
      if (data[topic].levels[String(level)]?.passed !== true) return { status: 400, body: { code: 'P0001', message: 'roadmap_prerequisite_not_met' } };
    }
  }
  const pct = Math.round((100 * answers.filter((one) => one.is_correct).length) / Number(attempt.total_questions));
  const passed = pct >= Number(attempt.pass_pct);
  attempt.completed_at = new Date().toISOString();
  const kind = attempt.kind === 'level' ? 'levels' : 'checkpoints';
  const existing = data[topic][kind][String(attempt.ref)] ?? {};
  const entry: Row = { passed: existing.passed === true || passed, bestPct: Math.max(Number(existing.bestPct ?? 0), pct) };
  if (kind === 'levels') {
    const today = DAY(0);
    const days = Array.isArray(existing.passDays) ? [...existing.passDays as string[]] : [];
    if (passed && !days.includes(today)) days.push(today);
    entry.passDays = days;
    entry.mastered = existing.mastered === true || days.length >= 3;
    if (passed) entry.lastPassDay = today;
    else if (existing.lastPassDay) entry.lastPassDay = existing.lastPassDay;
  }
  data[topic][kind][String(attempt.ref)] = entry;
  return { status: 200, body: true };
}

async function startStandIn() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://stand-in');
    res.setHeader('content-type', 'application/json');
    const send = (status: number, body: unknown) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    if (url.pathname === '/auth/v1/user') {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      const user = USERS.find((one) => one.token === token);
      if (!user) return send(401, { message: 'invalid token' });
      return send(200, { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} });
    }
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname);
    if (rpc) {
      const raw = await readBody(req);
      const args = (raw ? JSON.parse(raw) : {}) as Row;
      if (rpc[1] === 'record_roadmap_answer_v2') { const out = recordAnswer(args); return send(out.status, out.body); }
      if (rpc[1] === 'complete_verified_roadmap_attempt') { const out = completeAttempt(args); return send(out.status, out.body); }
      if (rpc[1] === 'is_premium') return send(200, PREMIUM.has(String(args.p_user)));
      // Rewards, concept reviews: nothing to report.
      return send(200, null);
    }
    const table = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)?.[1];
    if (table) {
      const filters = filtersOf(url);
      // A database blip for one account's progress row.
      if (table === 'roadmap_progress' && filters.some(([key, value]) => key === 'user_id' && value === BROKEN.id)) {
        return send(500, { code: '57014', message: 'canceling statement due to statement timeout' });
      }
      const rows = tables[table] ?? [];
      const single = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
      if (req.method === 'GET') {
        const found = rows.filter((row) => matches(row, filters));
        return single ? (found.length === 1 ? send(200, found[0]) : send(406, { code: 'PGRST116', message: 'no rows' })) : send(200, found);
      }
      if (req.method === 'PATCH') {
        const patch = JSON.parse(await readBody(req)) as Row;
        const found = rows.filter((row) => matches(row, filters));
        for (const row of found) Object.assign(row, patch);
        return send(200, found);
      }
      if (req.method === 'POST') {
        const inserted = JSON.parse(await readBody(req)) as Row | Row[];
        const list = Array.isArray(inserted) ? inserted : [inserted];
        rows.push(...list);
        return send(201, single ? list[0] : list);
      }
      return send(200, []);
    }
    send(404, { message: 'no route' });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // lib/http.ts and lib/auth.ts read these when they load, so they are set
  // before anything from the repository is imported.
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_ANON_KEY = 'anon-learn-contract';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-learn-contract';
  process.env.OWNER_EMAIL = OWNER.email;
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
  const server = await startStandIn();
  try {
    const [{ default: roadmap }, tokens] = await Promise.all([import('../api/quiz/roadmap'), import('../lib/quiz-tokens')]);
    let address = 0;
    const call = async (method: string, query: Record<string, string>, token?: string, body?: unknown) => {
      const res = mockResponse();
      address += 1;
      await roadmap({
        method,
        headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-forwarded-for': `10.30.0.${address % 250}` },
        query,
        url: '/api/quiz/roadmap',
        body,
      } as never, res as never);
      return res;
    };
    const answerAll = async (sessionId: string, token?: string) => {
      const session = tokens.decodeSessionEnvelope(sessionId)!;
      const statuses: number[] = [];
      for (const question of session.questions) {
        const res = await call('POST', { resource: 'answer' }, token, { sessionId, questionId: question.questionId, selectedIndex: question.correctAnswer, lang: 'en' });
        statuses.push(res.statusCode);
      }
      return statuses;
    };

    // ── The completion returns the progress the GET returns ────────────────
    // HTML level 1 is mastered and level 2 is due for its second pass. After
    // passing level 2 again, the progress in the completion response, which
    // the browser stores as its copy, must equal what the GET reads.
    tables.roadmap_progress.push({
      user_id: LEARNER.id,
      extra: {},
      data: {
        html: {
          checkpoints: {},
          levels: {
            '1': { passed: true, bestPct: 100, passDays: [DAY(9), DAY(6), DAY(2)], mastered: true, masteredAt: DAY(2), lastPassDay: DAY(2) },
            '2': { passed: true, bestPct: 88, passDays: [DAY(2)], mastered: false, lastPassDay: DAY(2) },
          },
        },
      },
    });
    const level2 = await call('GET', { topic: 'html', level: '2', lang: 'en' }, LEARNER.token);
    assert.equal(level2.statusCode, 200, JSON.stringify(level2.body));
    assert.ok((await answerAll(level2.body.sessionId, LEARNER.token)).every((status) => status === 200));
    const completed = await call('POST', { resource: 'complete' }, LEARNER.token, { sessionId: level2.body.sessionId });
    assert.equal(completed.statusCode, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.passed, true);
    const read = await call('GET', { resource: 'progress' }, LEARNER.token);
    assert.equal(read.statusCode, 200);
    assert.deepEqual(completed.body.progress.html, read.body.data.html, 'the completion returns the stored progress, mastery included');
    assert.equal(completed.body.progress.html.levels['1'].mastered, true, 'a mastered level stays mastered');
    assert.deepEqual(completed.body.progress.html.levels['2'].passDays, [DAY(2), DAY(0)], 'the new passing day is kept');
    assert.equal(completed.body.progress.html.levels['2'].lastPassDay, DAY(0), 'so Today counts the level as done today');
    console.log('PASS learn: a completion returns the progress the GET returns, spaced mastery included');

  } finally {
    server.close();
  }
  console.log('Learn integrity passed against a stand-in database.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
