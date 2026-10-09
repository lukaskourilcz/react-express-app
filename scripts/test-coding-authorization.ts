// First: no exported Supabase project may verify the stand-in tokens below.
import './launch-test-env';
import assert from 'node:assert/strict';
import { handleCodingSubmit, handleCodingReveal, handleCodingTask } from '../lib/coding/handlers';
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
}
main().catch(error=>{console.error(error);process.exitCode=1;});
