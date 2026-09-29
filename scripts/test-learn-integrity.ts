/* Learn integrity against a stand-in database.
 *
 * Runs the real `api/quiz/roadmap.ts` against a local stand-in that answers
 * the way PostgREST does for the learning tables and routines, with the
 * state kept in memory. It covers what only shows once a database answers:
 *
 *  - a Learn session answers only to the account it was issued to, so a
 *    level fetched without a token (the progression guard runs only for a
 *    signed-in request) cannot be answered and completed with one;
 *  - the progress a completion returns is the progress the GET returns,
 *    spaced-mastery fields included, because the browser replaces its copy
 *    with it;
 *  - a topic granted to an account opens its levels as the progress GET
 *    reports it open;
 *  - a failed progress read answers 503 rather than refusing the level as if
 *    the learner had not earned it;
 *  - a coding task whose solution was revealed in the attempt does not
 *    complete the level;
 *  - a guest's level passes on its questions with its coding marked
 *    unverified, while an account's still waits for a recorded coding pass.
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

    // ── A guest's session cannot be completed by an account ────────────────
    // JavaScript level 10 opens part two: a new account is refused it when it
    // asks with its token. Fetched without the token, the same level is served
    // as a preview; answering and completing it with the token must not record
    // it for the account.
    const refused = await call('GET', { topic: 'javascript', level: '10', lang: 'en' }, LEARNER.token);
    assert.equal(refused.statusCode, 403, 'a new account is refused a level it has not reached');
    const preview = await call('GET', { topic: 'javascript', level: '10', lang: 'en' });
    assert.equal(preview.statusCode, 200, 'a guest is served the preview');
    const previewSession = preview.body.sessionId as string;
    const foreign = await answerAll(previewSession, LEARNER.token);
    assert.ok(foreign.every((status) => status === 409), `a guest session is not answered with a token (${foreign.join(',')})`);
    const foreignAnswer = await call('POST', { resource: 'answer' }, LEARNER.token, { sessionId: previewSession, questionId: tokens.decodeSessionEnvelope(previewSession)!.questions[0].questionId, selectedIndex: 0, lang: 'en' });
    assert.equal(foreignAnswer.body?.error?.code, 'session_owner_mismatch', 'the refusal names why, so the client can restart the level');
    const foreignComplete = await call('POST', { resource: 'complete' }, LEARNER.token, { sessionId: previewSession });
    assert.equal(foreignComplete.statusCode, 409, 'a guest session is not completed with a token');
    assert.equal(foreignComplete.body?.error?.code, 'session_owner_mismatch');
    assert.equal(tables.roadmap_progress.find((row) => row.user_id === LEARNER.id), undefined, 'nothing was recorded for the account');
    assert.equal(tables.roadmap_attempts.filter((row) => row.user_id === LEARNER.id).length, 0, 'no attempt was opened for the account');
    // The coding tasks inside the level carry the same owner.
    const codingItem = (preview.body.coding ?? [])[0] as { session: string } | undefined;
    assert.ok(codingItem, 'JavaScript level 10 carries a coding task');
    assert.equal(tokens.decodeCodingSession(codingItem.session)?.userId, null, 'a guest level seals a guest coding session');

    // An account's session answers to that account alone: not to a guest (a
    // learner who signed out mid-level) and not to another account.
    const own = await call('GET', { topic: 'javascript', level: '1', lang: 'en' }, LEARNER.token);
    assert.equal(own.statusCode, 200);
    assert.equal(tokens.decodeSessionEnvelope(own.body.sessionId)?.userId, LEARNER.id, 'the session is sealed to the account');
    const ownCoding = (own.body.coding ?? [])[0] as { session: string } | undefined;
    assert.ok(ownCoding, 'JavaScript level 1 carries a coding task');
    assert.equal(tokens.decodeCodingSession(ownCoding.session)?.userId, LEARNER.id, 'and so is its coding task');
    const firstQuestion = tokens.decodeSessionEnvelope(own.body.sessionId)!.questions[0];
    const signedOut = await call('POST', { resource: 'answer' }, undefined, { sessionId: own.body.sessionId, questionId: firstQuestion.questionId, selectedIndex: 0, lang: 'en' });
    assert.equal(signedOut.statusCode, 409, 'a signed-in session is not answered after signing out');
    const otherAccount = await call('POST', { resource: 'answer' }, OTHER.token, { sessionId: own.body.sessionId, questionId: firstQuestion.questionId, selectedIndex: 0, lang: 'en' });
    assert.equal(otherAccount.statusCode, 409, 'nor by another account');
    const ownAnswer = await call('POST', { resource: 'answer' }, LEARNER.token, { sessionId: own.body.sessionId, questionId: firstQuestion.questionId, selectedIndex: firstQuestion.correctAnswer, lang: 'en' });
    assert.equal(ownAnswer.statusCode, 200, `the account itself answers (${JSON.stringify(ownAnswer.body)})`);
    assert.equal(ownAnswer.body.isCorrect, true);
    // A guest keeps playing a guest session.
    const guestLevel = await call('GET', { topic: 'html', level: '1', lang: 'en' });
    const guestStatuses = await answerAll(guestLevel.body.sessionId);
    assert.ok(guestStatuses.every((status) => status === 200), `a guest answers a guest session (${guestStatuses.join(',')})`);
    console.log('PASS learn: a session answers only to the account it was issued to');

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

    // ── A granted topic opens its levels ───────────────────────────────────
    const granted = await call('GET', { resource: 'progress' }, OWNER.token);
    assert.ok(granted.body.extra.unlocked.includes('system-design'), 'the progress GET reports the grant');
    const grantedLevel = await call('GET', { topic: 'system-design', level: '1', lang: 'en' }, OWNER.token);
    assert.equal(grantedLevel.statusCode, 200, `a granted topic serves its first level (${JSON.stringify(grantedLevel.body?.error)})`);
    const notGranted = await call('GET', { topic: 'system-design', level: '1', lang: 'en' }, OTHER.token);
    assert.equal(notGranted.body?.error?.code, 'topic_locked', 'an account without the grant is still refused');
    console.log('PASS learn: a granted topic opens its levels');

    // ── A revealed coding task does not complete the level ─────────────────
    // Every answer right, the level's coding task passed, but its solution was
    // revealed in this attempt: the level is not passed and the task stays
    // pending, as complete_verified_roadmap_attempt records it from 047.
    for (const revealed of [true, false]) {
      const level = await call('GET', { topic: 'javascript', level: '1', lang: 'en' }, OTHER.token);
      assert.equal(level.statusCode, 200, JSON.stringify(level.body));
      assert.ok((await answerAll(level.body.sessionId, OTHER.token)).every((status) => status === 200));
      const attemptId = tokens.decodeSessionEnvelope(level.body.sessionId)!.attemptId;
      const taskIds = (level.body.coding as Array<{ task: { id: string } }>).map((item) => item.task.id);
      assert.ok(taskIds.length > 0, 'JavaScript level 1 carries a coding task');
      for (const taskId of taskIds) tables.roadmap_attempt_coding.push({ attempt_id: attemptId, task_id: taskId, passed: true, verified: true, revealed });
      const done = await call('POST', { resource: 'complete' }, OTHER.token, { sessionId: level.body.sessionId });
      assert.equal(done.statusCode, 200, JSON.stringify(done.body));
      if (revealed) {
        assert.equal(done.body.passed, false, 'a level whose coding solution was revealed is not passed');
        assert.deepEqual(done.body.codingPending, taskIds, 'the revealed task is still pending');
      } else {
        assert.equal(done.body.passed, true, 'the same level passes when the task was solved without a reveal');
        assert.deepEqual(done.body.codingPending, []);
      }
    }
    console.log('PASS learn: a revealed coding task does not complete the level');

    // ── A guest's level passes on its questions ────────────────────────────
    // A guest's coding passes are never stored, so requiring them failed
    // every guest level with a coding task. The guest passes on the answers,
    // told the coding was not verified, and nothing is recorded for them. An
    // account without a recorded coding pass still waits for one.
    {
      const progressRows = tables.roadmap_progress.length;
      const guest = await call('GET', { topic: 'javascript', level: '1', lang: 'en' });
      assert.equal(guest.statusCode, 200, JSON.stringify(guest.body));
      assert.ok((guest.body.coding ?? []).length > 0, 'JavaScript level 1 carries a coding task');
      assert.ok((await answerAll(guest.body.sessionId)).every((status) => status === 200));
      const guestDone = await call('POST', { resource: 'complete' }, undefined, { sessionId: guest.body.sessionId });
      assert.equal(guestDone.statusCode, 200, JSON.stringify(guestDone.body));
      assert.equal(guestDone.body.passed, true, 'a guest passes the level on its questions');
      assert.equal(guestDone.body.codingUnverified, true, 'and is told the coding was not verified');
      assert.deepEqual(guestDone.body.codingPending, []);
      assert.equal(guestDone.body.progress, undefined, 'no stored progress comes back for a guest');
      assert.equal(tables.roadmap_progress.length, progressRows, 'nothing is recorded for a guest');

      const signedIn = await call('GET', { topic: 'javascript', level: '1', lang: 'en' }, LEARNER.token);
      assert.equal(signedIn.statusCode, 200, JSON.stringify(signedIn.body));
      assert.ok((await answerAll(signedIn.body.sessionId, LEARNER.token)).every((status) => status === 200));
      const taskIds = (signedIn.body.coding as Array<{ task: { id: string } }>).map((item) => item.task.id);
      const signedDone = await call('POST', { resource: 'complete' }, LEARNER.token, { sessionId: signedIn.body.sessionId });
      assert.equal(signedDone.statusCode, 200, JSON.stringify(signedDone.body));
      assert.equal(signedDone.body.passed, false, 'an account still needs a recorded coding pass');
      assert.deepEqual(signedDone.body.codingPending, taskIds);
      assert.equal(signedDone.body.codingUnverified, undefined, 'an account is never told its coding went unverified');
    }
    console.log('PASS learn: a guest passes a level on its questions; an account still needs its coding pass');

    // ── A failed progress read is not a refusal ────────────────────────────
    const blip = await call('GET', { topic: 'javascript', level: '2', lang: 'en' }, BROKEN.token);
    assert.equal(blip.statusCode, 503, `a progress read that fails answers 503 (${JSON.stringify(blip.body)})`);
    assert.equal(blip.body?.error?.code, 'progress_unavailable');
    console.log('PASS learn: a failed progress read answers 503, not "complete the preceding steps"');
  } finally {
    server.close();
  }
  console.log('Learn integrity passed against a stand-in database.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
