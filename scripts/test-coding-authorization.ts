// First: no exported Supabase project may verify the stand-in tokens below.
import './launch-test-env';
import assert from 'node:assert/strict';
import { handleCodingDraft, handleCodingSubmit, handleCodingReveal, handleCodingTask } from '../lib/coding/handlers';
import { handleCodingBookmarks } from '../lib/coding/practice-handlers';
import { CODING_TASKS } from '../lib/coding/catalog';
import { codingTaskById } from '../lib/coding/active';
import { encodeCodingSession } from '../lib/quiz-tokens';

const solved = 'const double=ns=>ns.map(n=>n*2)';

function response() {
  return {statusCode:200,body:null as unknown,setHeader(){},status(code:number){this.statusCode=code;return this;},json(body:unknown){this.body=body;return this;}};
}

// Without Supabase configured, a request with a Bearer token is the account its
// user_id names (lib/auth.ts's local fallback); without one it is a guest.
function request(session: string, account: string | null) {
  const signedIn = account ? { headers: { authorization: 'Bearer stand-in-token' }, query: { user_id: account } } : { headers: {}, query: {} };
  return { method: 'POST', ...signedIn, body: { session, code: solved, hintsUsed: 20, ...(account ? { user_id: account } : {}) } };
}

const errorCode = (body: unknown) => (body as { error?: { code?: string } } | null)?.error?.code;

async function main() {
  const accountA = encodeCodingSession({taskId:'js-double-numbers',track:'javascript',userId:'account-a',roadmapAttemptId:'account-a-attempt-0123456789'});
  for (const [name, handler] of [['submit', handleCodingSubmit], ['reveal', handleCodingReveal]] as const) {
    // A guest holding account A's session.
    const guest = response();
    await handler(request(accountA, null) as never, guest as never, null);
    assert.equal(guest.statusCode, 403, `${name}: a guest is refused another account's session before grading or database access`);
    assert.equal(errorCode(guest.body), 'invalid_session');

    // Account B, signed in, holding account A's session.
    const other = response();
    await handler(request(accountA, 'account-b') as never, other as never, null);
    assert.equal(other.statusCode, 403, `${name}: signed-in account B is refused account A's session`);
    assert.equal(errorCode(other.body), 'invalid_session');
    assert.ok(!JSON.stringify(other.body).includes('map(n'), `${name}: the refusal carries no solution`);
  }

  // Account A with its own session passes the ownership check: the reveal
  // answers with the solution, and the submit is graded and only then stops at
  // the missing database.
  const ownReveal = response();
  await handleCodingReveal(request(accountA, 'account-a') as never, ownReveal as never, null);
  assert.equal(ownReveal.statusCode, 200, 'the owner may reveal after the hint ladder');
  assert.ok((ownReveal.body as { solution?: string }).solution, 'the owner gets the solution');
  const ownSubmit = response();
  await handleCodingSubmit(request(accountA, 'account-a') as never, ownSubmit as never, null);
  assert.notEqual(errorCode(ownSubmit.body), 'invalid_session', 'the owner is not refused its own session');
  assert.equal(errorCode(ownSubmit.body), 'not_configured', 'the owner\'s submit reaches the progress write');

  console.log('Coding account-bound submit and reveal authorization passed: guests and other signed-in accounts are refused, the owner is not.');

  // A task opens with the account's own draft and the time it was saved, so
  // the browser can open the newer of it and the copy on the device (C5-4).
  // Another account's draft is never read.
  const drafts: Record<string, { code: string; updated_at: string }> = {
    'account-a:js-double-numbers': { code: 'const double = (ns) => ns;', updated_at: '2026-10-09T10:00:00.000Z' },
  };
  const database = {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => { filters[column] = value; return chain; },
        maybeSingle: async () => ({ data: table === 'coding_drafts' ? drafts[`${filters.user_id}:${filters.task_id}`] ?? null : null, error: null }),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }),
      };
      return chain;
    },
  };
  const open = async (account: string) => {
    const out = response();
    await handleCodingTask({ method: 'GET', headers: { authorization: 'Bearer stand-in-token' }, query: { id: 'js-double-numbers', user_id: account } } as never, out as never, database as never);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    return out.body as { draft: string | null; draftUpdatedAt?: string | null };
  };
  const own = await open('account-a');
  assert.equal(own.draft, 'const double = (ns) => ns;');
  assert.equal(own.draftUpdatedAt, '2026-10-09T10:00:00.000Z', 'the draft comes with the time it was saved');
  const other = await open('account-b');
  assert.equal(other.draft, null);
  assert.equal(other.draftUpdatedAt, null, 'no draft, no time');
  console.log('Coding task draft passed: the account\'s own draft opens with its time, and no other account\'s.');

  // V3-1: a draft save answers with the time the account now holds the code,
  // which the browser's copy then builds on. Before migration 059 the save
  // goes through save_coding_draft and the time is read back: when another
  // save landed between the write and the read-back, the row holds other code
  // and no time is given.
  let landedBetween: string | null = null;
  const saving = {
    rpc: async (fn: string, args: { p_user_id: string; p_task_id: string; p_code: string }) => {
      if (fn === 'save_coding_draft_v2') return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.save_coding_draft_v2' } };
      drafts[`${args.p_user_id}:${args.p_task_id}`] = { code: landedBetween ?? args.p_code, updated_at: '2026-10-09T10:05:00.123456+00:00' };
      return { data: null, error: null };
    },
    from: database.from,
  };
  const save = async (code: string) => {
    const out = response();
    await handleCodingDraft({ method: 'POST', headers: { authorization: 'Bearer stand-in-token' }, query: { user_id: 'account-a' }, body: { id: 'js-double-numbers', code, user_id: 'account-a' } } as never, out as never, saving as never);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    return out.body as { ok: boolean; updatedAt: string | null };
  };
  assert.deepEqual(await save('const double = (ns) => ns.map((n) => n * 2);'), { ok: true, updatedAt: '2026-10-09T10:05:00.123456+00:00' }, 'a save returns the time it was stored');
  landedBetween = '// another device';
  assert.deepEqual(await save('const double = (ns) => ns;'), { ok: true, updatedAt: null }, 'no time for a save another one overtook');
  console.log('Coding draft save passed: it returns the time the account holds the code, and none when another save overtook it.');

  // Owner decision 10 (migration 059): a save names the account draft's time
  // its code builds on, and one built on an older time is refused with 409
  // and the stored time, never the stored code. A client from before sends
  // no base and writes as it always did. save_coding_draft_v2 is played here
  // by a stand-in that keeps its rule; supabase/tests/220 covers the routine.
  const stored = new Map<string, { code: string; updated_at: string }>();
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  let tick = 0;
  const conditional = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'record_coding_verdict') return { data: { applied: true, firstPass: false, xpAwarded: false, codeChanged: true }, error: null };
      if (fn !== 'save_coding_draft_v2') return { data: null, error: null };
      const key = `${args.p_user_id}:${args.p_task_id}`;
      const row = stored.get(key);
      if (row && row.code === args.p_code) return { data: { saved: true, updatedAt: row.updated_at }, error: null };
      if (row && args.p_force !== true && row.updated_at !== args.p_base) return { data: { saved: false, conflict: true, updatedAt: row.updated_at }, error: null };
      tick += 1;
      const updatedAt = `2026-10-09T11:00:0${tick}.12345${tick}+00:00`;
      stored.set(key, { code: String(args.p_code), updated_at: updatedAt });
      return { data: { saved: true, updatedAt }, error: null };
    },
    from: database.from,
  };
  const post = async (body: Record<string, unknown>) => {
    const out = response();
    calls.length = 0;
    await handleCodingDraft({ method: 'POST', headers: { authorization: 'Bearer stand-in-token' }, query: { user_id: 'account-c' }, body: { id: 'js-double-numbers', user_id: 'account-c', ...body } } as never, out as never, conditional as never);
    return { status: out.statusCode, body: out.body as { ok?: boolean; updatedAt?: string | null; error?: { code?: string; updatedAt?: string } }, args: calls.find((one) => one.fn === 'save_coding_draft_v2')?.args };
  };
  const first = await post({ code: '// first', base: null });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.deepEqual([first.args?.p_base, first.args?.p_force], [null, false], 'a save names its base and is not forced');
  const t1 = first.body.updatedAt!;
  assert.ok(t1, 'a first save answers with its time');
  const second = await post({ code: '// second', base: t1 });
  assert.equal(second.status, 200, 'a save built on the stored time is written');
  assert.equal(second.args?.p_base, t1, 'the base reaches the routine as sent, microseconds and all');
  const t2 = second.body.updatedAt!;
  const stale = await post({ code: '// a tab that loaded before', base: t1 });
  assert.equal(stale.status, 409, 'a save built on an older time is refused');
  assert.equal(stale.body.error?.code, 'draft_conflict');
  assert.equal(stale.body.error?.updatedAt, t2, 'the refusal names the stored time');
  assert.ok(!JSON.stringify(stale.body).includes('// second'), 'the refusal does not carry the other device\'s code');
  assert.equal(stored.get('account-c:js-double-numbers')?.code, '// second', 'nothing was written');
  const mine = await post({ code: '// a tab that loaded before', base: stale.body.error?.updatedAt });
  assert.equal(mine.status, 200, 'keeping this code is a save built on the time the refusal named');
  const legacy = await post({ code: '// a client from before 059' });
  assert.equal(legacy.status, 200, 'a save without a base still writes');
  assert.equal(legacy.args?.p_force, true, 'a save without a base is forced, as every save was before');
  for (const base of ['yesterday', 42, '2026-10-09', { at: t1 }]) {
    const bad = await post({ code: '// x', base });
    assert.deepEqual([bad.status, bad.body.error?.code, bad.args], [400, 'bad_request', undefined], `base ${JSON.stringify(base)} is refused before the database`);
  }
  console.log('Coding draft conflict passed: a save built on an older draft time is refused with 409 and the stored time, never its code; no base writes as before.');

  // An evolving stage's Submit stores the submitted code as the stage draft,
  // forced, and hands the time back, so the browser's next save builds on it
  // instead of meeting the stage's own write as a conflict.
  const stageId = 'js-evolving-calculator-1-start';
  const stageSession = encodeCodingSession({ taskId: stageId, track: 'javascript', userId: 'account-c' });
  const submitted = response();
  calls.length = 0;
  await handleCodingSubmit({ method: 'POST', headers: { authorization: 'Bearer stand-in-token', 'x-forwarded-for': '203.0.113.59' }, query: { user_id: 'account-c' }, body: { session: stageSession, code: '// not there yet', user_id: 'account-c' } } as never, submitted as never, conditional as never);
  assert.equal(submitted.statusCode, 200, JSON.stringify(submitted.body));
  const stageWrite = calls.find((one) => one.fn === 'save_coding_draft_v2');
  assert.equal(stageWrite?.args.p_force, true, 'the stage draft is written whatever the account held');
  assert.equal((submitted.body as { draftUpdatedAt?: string }).draftUpdatedAt, stored.get(`account-c:${stageId}`)?.updated_at, 'the verdict carries the time the stage draft was stored');
  console.log('Coding evolving stage draft passed: Submit stores the stage code and returns its time.');

  // V3-2: an id no task could have (/coding/javascript/no-such-task) is as
  // unknown as one that fits the pattern; both are 404, and the browser shows
  // its not-found page instead of retrying a 400. No id at all is a bad request.
  const ask = async (id: unknown) => {
    const out = response();
    await handleCodingTask({ method: 'GET', headers: {}, query: id === undefined ? {} : { id } } as never, out as never, null);
    return { status: out.statusCode, code: errorCode(out.body) };
  };
  for (const id of ['no-such-task', 'Counter', 'js_digit_sum', 'js-no-such-task-123']) {
    assert.deepEqual(await ask(id), { status: 404, code: 'not_found' }, `${id} is not found`);
  }
  assert.deepEqual(await ask(undefined), { status: 400, code: 'bad_request' }, 'a request without an id is refused');
  assert.deepEqual(await ask(['js-digit-sum', 'js-sum-array']), { status: 400, code: 'bad_request' }, 'two ids are refused');
  const retired = CODING_TASKS.find((task) => !codingTaskById(task.id) && task.track !== 'system-design');
  if (retired) assert.deepEqual(await ask(retired.id), { status: 410, code: 'task_retired' }, `${retired.id} is retired`);
  // A task on the hidden system design track is as unknown as one that never
  // existed: 404, not 410, so nothing tells a visitor it is there.
  const hidden = CODING_TASKS.filter((task) => task.track === 'system-design');
  assert.ok(hidden.length > 0);
  // One design walkthrough and one drill; the launch contracts ask for all of them.
  for (const task of [hidden.find((one) => one.design)!, hidden.find((one) => one.drill)!]) {
    assert.deepEqual(await ask(task.id), { status: 404, code: 'not_found' }, `${task.id} is not found`);
  }
  assert.equal((await ask('js-double-numbers')).status, 200, 'a task in the catalogue opens');
  console.log(`Coding task ids passed: unknown ids are 404 whatever their shape, system design ones included${retired ? ', a retired one 410' : ''}, and a missing id 400.`);

  // A star saved on system design before it was hidden stays in the table
  // and never comes back to the browser, in the saved list or a collection.
  const starred = {
    from: (table: string) => {
      const rows: Record<string, unknown[]> = {
        coding_bookmarks: [{ task_id: 'sd-url-shortener' }, { task_id: 'js-double-numbers' }],
        coding_collections: [{ collection_id: 'collection-0001', name: 'Later', position: 0 }],
        coding_collection_items: [{ collection_id: 'collection-0001', task_id: 'dd-requests-per-second', position: 0 }, { collection_id: 'collection-0001', task_id: 'js-digit-sum', position: 1 }],
      };
      const chain = {
        select: () => chain, eq: () => chain, order: () => chain, in: () => chain,
        then: (resolve: (value: unknown) => unknown) => resolve({ data: rows[table] ?? [], error: null }),
      };
      return chain;
    },
  };
  const listed = response();
  await handleCodingBookmarks({ method: 'GET', headers: { authorization: 'Bearer stand-in-token' }, query: { user_id: 'account-a' } } as never, listed as never, starred as never);
  assert.equal(listed.statusCode, 200, JSON.stringify(listed.body));
  assert.deepEqual(listed.body, { saved: ['js-double-numbers'], collections: [{ collectionId: 'collection-0001', name: 'Later', position: 0, taskIds: ['js-digit-sum'] }] }, 'no system design id comes back');
  console.log('Coding bookmarks passed: a star saved on system design is not listed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
