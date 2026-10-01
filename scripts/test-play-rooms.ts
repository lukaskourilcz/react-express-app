/* Live rooms (Play): the timing, host and switch rules of api/play/[action].ts.
 *
 * Runs the real handler through supabase-js against a local stand-in that
 * answers the PostgREST requests it makes, over in-memory `matches`,
 * `match_participants`, `match_answers` and `app_settings` tables and the two
 * routines of migration 005, plus Supabase Auth's /user for sign-in. The rules:
 *
 * - an answer after the question's clock (and the expiry grace) is refused;
 * - a classroom host presents: no answers, no scoreboard row;
 * - a multiplayer host (a competitor) cannot read the live answer distribution;
 * - a lobby whose host stopped sending heartbeats is closed;
 * - a player reads only the questions already shown, and the server's clock;
 * - the Play switch in the app settings turns every action off.
 *
 * Nothing leaves the machine. */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

type Row = Record<string, unknown>;

const USERS = {
  host: { id: '5d0c6a52-3f7e-4b8e-9c1a-0a1b2c3d4e01', token: 'play-contract-host' },
  one: { id: '5d0c6a52-3f7e-4b8e-9c1a-0a1b2c3d4e02', token: 'play-contract-one' },
  two: { id: '5d0c6a52-3f7e-4b8e-9c1a-0a1b2c3d4e03', token: 'play-contract-two' },
} as const;
type Who = keyof typeof USERS;

const tables: Record<string, Row[]> = { matches: [], match_participants: [], match_answers: [], app_settings: [] };
const UNIQUE: Record<string, string[][]> = {
  matches: [['id'], ['code']],
  match_participants: [['match_id', 'user_id']],
  match_answers: [['match_id', 'user_id', 'question_idx']],
  app_settings: [['key']],
};
let clock = 0;

const readBody = (req: IncomingMessage) => new Promise<string>((resolve) => {
  let text = '';
  req.on('data', (chunk) => { text += chunk; });
  req.on('end', () => resolve(text));
});

/** The PostgREST filters the handler uses: eq, in and is. */
function matches(row: Row, params: URLSearchParams): boolean {
  for (const [column, raw] of params) {
    if (['select', 'order', 'limit', 'on_conflict', 'columns'].includes(column)) continue;
    const value = String(row[column] ?? 'null');
    if (raw.startsWith('eq.')) {
      if (value !== raw.slice(3)) return false;
    } else if (raw.startsWith('in.(')) {
      const list = raw.slice(4, -1).split(',').map((one) => one.replace(/^"|"$/g, ''));
      if (!list.includes(value)) return false;
    } else if (raw.startsWith('is.')) {
      if (value !== raw.slice(3)) return false;
    } else {
      throw new Error(`stand-in: unsupported filter ${column}=${raw}`);
    }
  }
  return true;
}

function project(row: Row, select: string | null): Row {
  if (!select || select === '*') return { ...row };
  return Object.fromEntries(select.split(',').map((column) => [column, row[column] ?? null]));
}

function reply(req: IncomingMessage, res: ServerResponse, rows: Row[], params: URLSearchParams, status = 200) {
  const prefer = String(req.headers.prefer ?? '');
  const shaped = rows.map((row) => project(row, params.get('select')));
  if (/count=exact/.test(prefer)) res.setHeader('content-range', `${shaped.length ? `0-${shaped.length - 1}` : '*'}/${shaped.length}`);
  if (String(req.headers.accept ?? '').includes('vnd.pgrst.object+json')) {
    if (shaped.length !== 1) {
      res.statusCode = 406;
      res.end(JSON.stringify({ code: 'PGRST116', details: `The result contains ${shaped.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' }));
      return;
    }
    res.statusCode = status;
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(shaped[0]));
    return;
  }
  res.statusCode = status;
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(shaped));
}

function scoreboard(matchId: string): Row[] {
  return tables.match_participants
    .filter((p) => p.match_id === matchId)
    .map((p) => {
      const answers = tables.match_answers.filter((a) => a.match_id === matchId && a.user_id === p.user_id);
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        correct: answers.filter((a) => a.is_correct).length,
        score: answers.reduce((sum, a) => sum + (a.is_correct ? 100 + Number(a.speed_bonus) : 0), 0),
        total_ms: answers.reduce((sum, a) => sum + Number(a.duration_ms), 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.total_ms - b.total_ms);
}

function distribution(matchId: string, questionIdx: number): Row[] {
  const byOption = new Map<number, { selected_idx: number; count: number; correct: boolean }>();
  for (const answer of tables.match_answers.filter((a) => a.match_id === matchId && a.question_idx === questionIdx)) {
    const bucket = byOption.get(Number(answer.selected_idx)) ?? { selected_idx: Number(answer.selected_idx), count: 0, correct: true };
    bucket.count += 1;
    bucket.correct = bucket.correct && answer.is_correct === true;
    byOption.set(bucket.selected_idx, bucket);
  }
  return [...byOption.values()].sort((a, b) => a.selected_idx - b.selected_idx);
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://stand-in');
  res.setHeader('content-type', 'application/json');

  if (url.pathname === '/auth/v1/user') {
    const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const user = Object.values(USERS).find((one) => one.token === token);
    if (!user) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: 'invalid token' }));
      return;
    }
    res.end(JSON.stringify({ id: user.id, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }));
    return;
  }

  const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(url.pathname);
  if (rpc) {
    const args = JSON.parse((await readBody(req)) || '{}') as Record<string, unknown>;
    if (rpc[1] === 'match_scoreboard') return void res.end(JSON.stringify(scoreboard(String(args.p_match_id))));
    if (rpc[1] === 'match_question_distribution') {
      return void res.end(JSON.stringify(distribution(String(args.p_match_id), Number(args.p_question_idx))));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ code: 'PGRST202', details: null, hint: null, message: `Could not find the function public.${rpc[1]} in the schema cache` }));
    return;
  }

  const table = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)?.[1];
  if (!table) {
    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'no route' }));
    return;
  }
  // Tables this contract does not model (the question bank's edits): empty.
  if (!(table in tables)) {
    if (req.method === 'GET' || req.method === 'HEAD') return reply(req, res, [], url.searchParams);
    res.statusCode = 201;
    res.end();
    return;
  }

  const rows = tables[table];
  const prefer = String(req.headers.prefer ?? '');
  const representation = /return=representation/.test(prefer);
  if (req.method === 'GET' || req.method === 'HEAD') {
    let found = rows.filter((row) => matches(row, url.searchParams));
    const order = url.searchParams.get('order');
    if (order) {
      const [column, direction] = order.split('.');
      found = [...found].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (direction === 'desc' ? -1 : 1));
    }
    return reply(req, res, found, url.searchParams);
  }
  if (req.method === 'POST') {
    const payload = JSON.parse(await readBody(req)) as Row | Row[];
    const written: Row[] = [];
    for (const input of Array.isArray(payload) ? payload : [payload]) {
      const row: Row = { ...input };
      clock += 1;
      if (table === 'matches') row.id ??= randomUUID();
      if (table === 'match_participants') row.joined_at ??= new Date(Date.now() + clock).toISOString();
      if (table === 'match_answers') row.answered_at ??= new Date().toISOString();
      const upsert = /resolution=merge-duplicates/.test(prefer);
      const keys = UNIQUE[table];
      const clash = rows.find((other) => keys.some((key) => key.every((column) => other[column] === row[column])));
      if (clash && !upsert) {
        res.statusCode = 409;
        res.end(JSON.stringify({ code: '23505', details: null, hint: null, message: 'duplicate key value violates unique constraint' }));
        return;
      }
      if (clash) Object.assign(clash, input);
      else rows.push(row);
      written.push(clash ?? row);
    }
    if (!representation) {
      res.statusCode = 201;
      res.end();
      return;
    }
    return reply(req, res, written, url.searchParams, 201);
  }
  if (req.method === 'PATCH') {
    const patch = JSON.parse(await readBody(req)) as Row;
    const hit = rows.filter((row) => matches(row, url.searchParams));
    hit.forEach((row) => Object.assign(row, patch));
    if (!representation) {
      res.statusCode = 204;
      res.end();
      return;
    }
    return reply(req, res, hit, url.searchParams);
  }
  if (req.method === 'DELETE') {
    tables[table] = rows.filter((row) => !matches(row, url.searchParams));
    res.statusCode = 204;
    res.end();
    return;
  }
  res.statusCode = 405;
  res.end(JSON.stringify({ message: 'method' }));
}

async function startStandIn() {
  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ message: error instanceof Error ? error.message : 'stand-in failure' }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  // lib/http.ts, lib/auth.ts and lib/play-helpers.ts read these when they
  // load, so they are set before anything from the repository is imported.
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_ANON_KEY = 'anon-play-contract';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-play-contract';
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
    setHeader(key: string, value: string) { res.headers[key.toLowerCase()] = value; return res; },
    getHeader(key: string) { return res.headers[key.toLowerCase()]; },
    status(code: number) { res.statusCode = code; return res; },
    json(body: unknown) { res.body = body; return res; },
    end() { return res; },
  };
  return res;
}

async function main() {
  const server = await startStandIn();
  try {
    const [{ default: play }, settings] = await Promise.all([
      import('../api/play/[action]'),
      import('../lib/settings-store'),
    ]);
    let address = 0;
    const call = async (who: Who | null, method: 'GET' | 'POST', action: string, input: Row = {}) => {
      const res = mockResponse();
      address += 1;
      await play({
        method,
        headers: { 'x-forwarded-for': `10.30.0.${address % 250}`, ...(who ? { authorization: `Bearer ${USERS[who].token}` } : {}) },
        query: { action, ...(method === 'GET' ? input : {}) },
        body: method === 'POST' ? input : undefined,
        url: `/api/play/${action}`,
      } as never, res as never);
      return res;
    };
    const room = (code: string) => tables.matches.find((match) => match.code === code)!;
    const correctIndex = (code: string, idx: number) => (room(code).questions as Array<{ correct_index: number }>)[idx].correct_index;
    const open = async (mode: 'multiplayer' | 'classroom', players: Who[]) => {
      const created = await call('host', 'POST', 'create', { host_name: 'Host', mode, count: 5, categories: ['javascript'], duration_s: 30 });
      assert.equal(created.statusCode, 200, `a ${mode} room opens (${JSON.stringify(created.body)})`);
      const code = created.body.code as string;
      for (const who of players) {
        const joined = await call(who, 'POST', 'join', { code, display_name: who });
        assert.equal(joined.statusCode, 200, `${who} joins the ${mode} room`);
      }
      assert.equal((await call('host', 'POST', 'control', { code, action: 'start' })).statusCode, 200, `the ${mode} room starts`);
      return code;
    };
    const rewind = (code: string, ms: number) => {
      room(code).question_started_at = new Date(Date.now() - ms).toISOString();
    };

    // 1. A multiplayer host competes, so the live answer distribution (counts
    //    per option and which one is correct) is closed to them until the end.
    {
      const code = await open('multiplayer', ['one', 'two']);
      const answered = await call('one', 'POST', 'answer', { code, question_idx: 0, selected_idx: (correctIndex(code, 0) + 1) % 4 });
      assert.equal(answered.statusCode, 200);
      const peek = await call('host', 'GET', 'distribution', { code, q: '0' });
      assert.equal(peek.statusCode, 403, 'a competing host cannot read the live distribution');
      assert.equal(peek.body?.buckets, undefined, 'and gets no buckets');

      // 2. An answer after the clock and the grace is refused, and scores
      //    nothing; an answer on the buzzer, inside the grace, still counts.
      rewind(code, 30_000 + 1_000);
      const buzzer = await call('two', 'POST', 'answer', { code, question_idx: 0, selected_idx: correctIndex(code, 0) });
      assert.equal(buzzer.statusCode, 200, 'an answer inside the grace lands');
      assert.equal(buzzer.body.is_correct, true);
      assert.equal(buzzer.body.advanced, false, 'the host has not answered yet');
      rewind(code, 50_000);
      const late = await call('host', 'POST', 'answer', { code, question_idx: 0, selected_idx: correctIndex(code, 0) });
      assert.equal(late.statusCode, 409, `an answer 20 s after a 30 s question closed is refused (${JSON.stringify(late.body)})`);
      assert.equal(late.body.error.code, 'time_up');
      assert.equal(tables.match_answers.filter((a) => a.user_id === USERS.host.id).length, 0, 'the late answer is not recorded');
      // A retry of an answer that landed in time replays it rather than
      // turning it into a late one.
      const retry = await call('two', 'POST', 'answer', { code, question_idx: 0, selected_idx: correctIndex(code, 0) });
      assert.equal(retry.statusCode, 200, 'a retry of an in-time answer replays it');
      assert.equal(retry.body.is_correct, true);

      // The expired question moves on at the next read, and the distribution
      // opens once the match is over. Every client reads once when the clock
      // runs out, so the reads land together: each one gets the next
      // question, not only the read that moved the room on.
      const reads = await Promise.all((['one', 'two', 'host'] as const).map((who) => call(who, 'GET', 'state', { code })));
      assert.deepEqual(reads.map((read) => read.body.match.current_index), [1, 1, 1], 'every read at the expiry sees the next question');
      assert.equal(room(code).current_index, 1, 'the room moved on once');
      assert.equal((await call('host', 'POST', 'control', { code, action: 'finish' })).statusCode, 200);
      const after = await call('host', 'GET', 'distribution', { code, q: '0' });
      assert.equal(after.statusCode, 200, 'the host reads the distribution after the end');
      assert.equal(after.body.buckets.length, 2);
    }

    // 3. A classroom host presents: they read the live distribution, cannot
    //    answer, and have no scoreboard row; a student's late answer is refused.
    {
      const code = await open('classroom', ['one']);
      const hostAnswer = await call('host', 'POST', 'answer', { code, question_idx: 0, selected_idx: correctIndex(code, 0) });
      assert.equal(hostAnswer.statusCode, 403, 'the classroom host cannot answer');
      assert.equal(hostAnswer.body.error.code, 'host_cannot_answer');
      assert.equal((await call('host', 'GET', 'distribution', { code, q: '0' })).statusCode, 200, 'the presenter reads the live distribution');
      rewind(code, 10 * 60_000);
      const late = await call('one', 'POST', 'answer', { code, question_idx: 0, selected_idx: correctIndex(code, 0) });
      assert.equal(late.statusCode, 409, 'a student answering ten minutes into a 30 s question is refused');
      assert.equal(late.body.error.code, 'time_up');
      assert.equal((await call('host', 'POST', 'control', { code, action: 'finish' })).statusCode, 200);
      const board = (await call('one', 'GET', 'state', { code })).body.scoreboard as Array<{ user_id: string; score: number }>;
      assert.deepEqual(board.map((row) => row.user_id), [USERS.one.id], 'only the student is on the classroom scoreboard');
      assert.equal(board[0].score, 0, 'nobody scored');
    }

    // A multiplayer host competes, so they keep their row.
    {
      const code = await open('multiplayer', ['one']);
      const board = (await call('one', 'GET', 'state', { code })).body.scoreboard as Array<{ user_id: string }>;
      assert.ok(board.some((row) => row.user_id === USERS.host.id), 'a multiplayer host is on the scoreboard');
    }

    // 4. A lobby whose host stopped sending heartbeats is closed at the next
    //    read, like a running room; one whose host is present stays open.
    {
      const created = await call('host', 'POST', 'create', { host_name: 'Host', mode: 'multiplayer', count: 5, categories: ['javascript'], duration_s: 30 });
      const code = created.body.code as string;
      await call('one', 'POST', 'join', { code, display_name: 'one' });
      assert.equal((await call('one', 'GET', 'state', { code })).body.match.status, 'lobby', 'a lobby with its host stays open');
      // A multiplayer host competes: in the lobby they read no more than anyone.
      const hostLobby = (await call('host', 'GET', 'state', { code })).body.match;
      assert.deepEqual(hostLobby.questions, [], 'a competing host reads no question in the lobby');
      assert.equal(hostLobby.question_count, 5);
      room(code).last_heartbeat_at = new Date(Date.now() - 6 * 60_000).toISOString();
      const state = await call('one', 'GET', 'state', { code });
      assert.equal(state.body.match.status, 'finished', 'a lobby the host left is closed');
      assert.equal(state.body.match.started_at ?? null, null, 'and reads as never started');
    }

    // 6. A player reads only the questions already shown: none in the lobby,
    //    up to the current one while the room runs, and never the key. The
    //    round's length travels as `question_count`, and every join and state
    //    carries the server's clock. `two` hosts this room: the host above has
    //    opened as many rooms as one account may in a minute.
    {
      const created = await call('two', 'POST', 'create', { host_name: 'Two', mode: 'classroom', count: 5, categories: ['javascript'], duration_s: 30 });
      assert.equal(created.statusCode, 200, `a classroom room opens (${JSON.stringify(created.body)})`);
      const code = created.body.code as string;
      const nearNow = (value: unknown, what: string) => {
        assert.equal(typeof value, 'string', `${what} carries server_now`);
        assert.ok(Math.abs(Date.parse(value as string) - Date.now()) < 5_000, `${what}: server_now is the server's clock`);
      };
      const joined = await call('one', 'POST', 'join', { code, display_name: 'one' });
      assert.deepEqual(joined.body.questions, [], 'a player joining the lobby receives no question');
      assert.equal(joined.body.question_count, 5, 'the join says how long the round is');
      nearNow(joined.body.server_now, 'the join');
      for (const who of ['one', null] as const) {
        const lobby = await call(who, 'GET', 'state', { code });
        assert.deepEqual(lobby.body.match.questions, [], `${who ?? 'an anonymous reader'} reads no question in the lobby`);
        assert.equal(lobby.body.match.question_count, 5);
        nearNow(lobby.body.server_now, 'the state');
      }
      const presenter = await call('two', 'GET', 'state', { code });
      assert.equal(presenter.body.match.questions.length, 5, 'the classroom presenter holds the whole round');
      assert.equal(typeof presenter.body.match.questions[0].correct_index, 'number', 'with its key');

      assert.equal((await call('two', 'POST', 'control', { code, action: 'start' })).statusCode, 200);
      const shown = (await call('one', 'GET', 'state', { code })).body.match;
      assert.equal(shown.questions.length, 1, 'the first question is the only one a running room shows');
      assert.equal(shown.questions[0].id, (room(code).questions as Array<{ id: string }>)[0].id);
      assert.equal(shown.questions[0].correct_index, undefined, 'without its key');
      assert.equal(shown.questions[0].explanation, undefined, 'or its explanation');
      assert.equal(shown.question_count, 5);
      assert.equal((await call(null, 'GET', 'state', { code })).body.match.questions.length, 1, 'an anonymous reader gets no more');
      assert.equal((await call('two', 'POST', 'control', { code, action: 'advance' })).statusCode, 200);
      assert.equal((await call('one', 'GET', 'state', { code })).body.match.questions.length, 2, 'the next question opens with the room');

      assert.equal((await call('two', 'POST', 'control', { code, action: 'finish' })).statusCode, 200);
      const finished = (await call('one', 'GET', 'state', { code })).body.match;
      assert.equal(finished.questions.length, 5, 'a finished round shows every question');
      assert.equal(typeof finished.questions[4].correct_index, 'number', 'with its key');
    }

    // 5. The Play switch turns every action off, rooms already open included.
    {
      const code = await open('multiplayer', ['one']);
      await settings.saveGameSettings({ ...settings.DEFAULT_SETTINGS, features: { ...settings.DEFAULT_SETTINGS.features, multiplayer: false } });
      for (const [who, method, action, input] of [
        ['host', 'POST', 'create', { host_name: 'Host', mode: 'multiplayer', count: 5, categories: ['javascript'], duration_s: 30 }],
        ['two', 'POST', 'join', { code, display_name: 'two' }],
        ['one', 'GET', 'state', { code }],
        [null, 'GET', 'state', { code }],
        ['one', 'POST', 'answer', { code, question_idx: 0, selected_idx: 0 }],
        ['host', 'POST', 'control', { code, action: 'finish' }],
        ['host', 'POST', 'heartbeat', { code }],
        ['host', 'GET', 'distribution', { code, q: '0' }],
      ] as const) {
        const res = await call(who, method, action, input);
        assert.equal(res.statusCode, 503, `${action} is off while Play is switched off`);
        assert.equal(res.body.error.code, 'feature_disabled');
      }
      await settings.saveGameSettings(settings.DEFAULT_SETTINGS);
      assert.equal((await call('one', 'GET', 'state', { code })).statusCode, 200, 'switching Play back on reopens the room');
    }
  } finally {
    server.close();
  }
  console.log('Play room contracts passed: late answers, the classroom host, the live distribution, abandoned lobbies, the questions a player reads and the Play switch.');
}

await main();
