import assert from 'node:assert/strict';
import { runInSandbox } from '../lib/coding/sandbox';
import { handleCodingSubmit } from '../lib/coding/handlers';
import { encodeCodingSession } from '../lib/quiz-tokens';
import { solutionFor } from '../lib/coding/solutions';

const attacks = [
  ['replace comparison', 'globalThis.__deepEqual=()=>true; function answer(){return 0}'],
  ['replace expected answer', 'globalThis.__expect=[0]; function answer(){return 0}'],
  ['replace evaluator', 'globalThis.eval=()=>1; function answer(){return 0}'],
  ['replace intrinsic equality', 'Object.is=()=>true; function answer(){return 0}'],
  ['replace serializer', 'JSON.stringify=()=>\'[ {"pass":true,"actual":"1","error":null} ]\'; function answer(){return 0}'],
  ['forge completion', 'function answer(){globalThis.__done=true;globalThis.__out=\'[ {"pass":true,"actual":"1","error":null} ]\';return new Promise(()=>{})}'],
  ['replace promise combinator', 'Promise.all=()=>Promise.resolve([{ok:true,value:1}]);function answer(){return 0}'],
  ['poison prototype serializer', 'Array.prototype.toJSON=()=>[{pass:true,actual:"1",error:null}];function answer(){return 0}'],
  ['read controller closure', 'function answer(){return __expect[0]}'],
  ['read caller arguments', 'function answer(){return answer.caller.arguments[0]}'],
] as const;
for (const [name, code] of attacks) {
  const run = await runInSandbox({ code, calls: ['answer()'], expectations: [1] });
  assert(!run.results.some(result => result.pass === true), `${name}: forged a pass`);
  console.log(`PASS integrity: ${name}`);
}
const special = await runInSandbox({code:'function answer(){return {a:undefined,b:[NaN,Infinity,-Infinity,-0]}}',calls:['answer()'],expectations:[{a:undefined,b:[NaN,Infinity,-Infinity,-0]}]});
assert.equal(special.results[0]?.pass, true);
const clean = await runInSandbox({code:'function answer(){return 1}',calls:['answer()'],expectations:[1]});
assert.equal(clean.results[0]?.pass, true, 'an attack must not poison the next run');
console.log('PASS integrity: lossless values and fresh run');

// Hidden checks run in the same program as the visible ones. What they print
// must never reach the learner: a console.log inside the function would
// otherwise hand back every hidden input after Submit.
const echo = 'const echo = x => { console.log("saw", x); return x; };';
const everyCall = await runInSandbox({ code: echo, calls: ['echo(1)', 'echo(2)', 'echo(424242)'], expectations: [1, 2, 424242] });
assert.deepEqual(everyCall.logs, ['saw 1', 'saw 2', 'saw 424242'], 'without a split every call is shown');
const split = await runInSandbox({ code: echo, calls: ['echo(1)', 'echo(2)', 'echo(424242)'], expectations: [1, 2, 424242], shownCalls: 2 });
assert.deepEqual(split.results.map((result) => result.pass), [true, true, true], 'hidden calls are still graded');
assert.deepEqual(split.logs, ['saw 1', 'saw 2'], 'a hidden call prints nothing the learner sees');
const later = await runInSandbox({
  code: 'const echo = async x => { await new Promise((done) => setTimeout(done, x === 424242 ? 1 : 50)); console.log("after", x); return x; };',
  calls: ['echo(1)', 'echo(424242)'], expectations: [1, 424242], shownCalls: 1,
});
assert.deepEqual(later.results.map((result) => result.pass), [true, true]);
assert.deepEqual(later.logs, ['after 1'], 'a hidden call cannot print before a slower shown call settles');
const hung = await runInSandbox({
  code: 'const echo = x => { console.log("saw", x); if (x === 424242) while (true) {} return x; };',
  calls: ['echo(1)', 'echo(424242)'], expectations: [1, 424242], shownCalls: 1, deadlineMs: 300,
});
assert.equal(hung.timedOut, true);
assert(!hung.logs.some((line) => line.includes('424242')), 'a hidden call that hangs still prints nothing');
console.log('PASS integrity: hidden calls print nothing the learner sees');

// The same through the Submit handler: js-digit-sum has three hidden checks
// (99999, 305 and 10). An anonymous submit grades without a database.
const response = { statusCode: 200, body: null as null | { verdict?: string; hidden?: unknown; logs?: string[] }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
await handleCodingSubmit({
  method: 'POST', headers: {},
  body: {
    session: encodeCodingSession({ taskId: 'js-digit-sum', track: 'javascript', userId: null }),
    code: 'const digitSum = n => { console.log("digitSum of", n); let total = 0; while (n > 0) { total += n % 10; n = Math.floor(n / 10); } return total; };',
  },
} as never, response as never, null);
assert.equal(response.statusCode, 200, JSON.stringify(response.body));
assert.equal(response.body?.verdict, 'passed');
assert.deepEqual(response.body?.hidden, { passed: 3, total: 3 });
assert.deepEqual(response.body?.logs, ['digitSum of 493', 'digitSum of 1234', 'digitSum of 0', 'digitSum of 7', 'digitSum of 1000'], 'Submit returns only the visible calls\' console output');
console.log('PASS integrity: Submit shows the visible checks\' console only');

// ── every changed submission in one session is recorded (CODE-1) ─────────
// A workbench keeps one coding session for its whole life. The verdict log
// must still record a fix: fail, then pass, in the same session has to end as
// a passed task, XP once, and a passed Learn level link. A retried request for
// the same submission stays a replay. The fake below keeps the routine's
// contract from migration 041: one application per attempt id, progress per
// account and task, XP once per account and task, and a level link that only
// ever turns true.
function codingDatabase() {
  const attempts = new Set<string>();
  const progress = new Map<string, { status: 'in_progress' | 'passed'; passes: number }>();
  const links = new Map<string, boolean>();
  const xp = new Set<string>();
  const attemptIds: string[] = [];
  const result = (data: unknown) => Promise.resolve({ data, error: null });
  const from = (table: string) => {
    const filters: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => { filters[column] = value; return chain; },
      in: () => chain,
      maybeSingle: () => {
        if (table === 'roadmap_attempts') return result({ attempt_id: filters.attempt_id });
        if (table === 'coding_progress') {
          const row = progress.get(`${filters.user_id}:${filters.task_id}`);
          return result(row ? {
            task_id: filters.task_id, track: 'javascript', status: row.status, passes: row.passes,
            review_stage: 0, next_review_at: null, reveal_count: 0, best_passed_at: null,
          } : null);
        }
        return result(null);
      },
      then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }),
    };
    return chain;
  };
  const rpc = (name: string, args: Record<string, unknown>) => {
    if (name !== 'record_coding_verdict') return result(null);
    const attemptId = String(args.p_attempt_id);
    attemptIds.push(attemptId);
    assert.match(attemptId, /^[A-Za-z0-9:_-]{8,128}$/, 'the attempt id fits the coding_attempts check');
    const key = `${args.p_user_id}:${args.p_task_id}`;
    if (attempts.has(attemptId)) return result({ applied: false, firstPass: false, xpAwarded: false, codeChanged: false });
    attempts.add(attemptId);
    const row = progress.get(key) ?? { status: 'in_progress' as const, passes: 0 };
    let firstPass = false;
    let xpAwarded = false;
    if (args.p_outcome === 'passed') {
      firstPass = row.passes === 0;
      row.status = 'passed';
      row.passes += 1;
      if (firstPass && !xp.has(key)) { xp.add(key); xpAwarded = true; }
    }
    progress.set(key, row);
    if (args.p_roadmap_attempt_id) {
      const link = `${args.p_roadmap_attempt_id}:${args.p_task_id}`;
      links.set(link, links.get(link) === true || args.p_outcome === 'passed');
    }
    return result({ applied: true, firstPass, xpAwarded, codeChanged: firstPass });
  };
  return { client: { from, rpc }, progress, links, xp, attemptIds };
}

{
  const db = codingDatabase();
  const learner = 'user-aaaa-1111';
  const levelAttempt = 'levelattempt0123456789';
  const session = encodeCodingSession({ taskId: 'js-double-numbers', track: 'javascript', userId: null, roadmapAttemptId: levelAttempt });
  const reference = solutionFor('js-double-numbers')!;
  type Verdict = { verdict?: string; applied?: boolean; firstPass?: boolean; xpAwarded?: number; progress?: { status?: string } | null };
  const submit = async (code: string) => {
    const out = { statusCode: 200, body: null as null | Verdict, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
    await handleCodingSubmit({
      method: 'POST', headers: { authorization: 'Bearer local-test' }, query: {},
      body: { session, code, user_id: learner },
    } as never, out as never, db.client as never);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    return out.body!;
  };
  const failed = await submit('const double = numbers => numbers;');
  assert.equal(failed.verdict, 'failed');
  assert.equal(failed.applied, true, 'the first submission is recorded');
  const passed = await submit(reference.solution);
  assert.equal(passed.verdict, 'passed');
  assert.equal(passed.applied, true, 'a fix submitted from the same session is recorded');
  assert.equal(passed.firstPass, true);
  assert.ok((passed.xpAwarded ?? 0) > 0, 'the first pass earns the task XP');
  assert.equal(passed.progress?.status, 'passed', 'the task reads as passed');
  assert.equal(db.links.get(`${levelAttempt}:js-double-numbers`), true, 'the Learn level sees the coding task passed');
  const replay = await submit(reference.solution);
  assert.equal(replay.applied, false, 'a retried request for the same submission is a replay');
  assert.equal(replay.xpAwarded, 0);
  const again = await submit(reference.senior!);
  assert.equal(again.verdict, 'passed');
  assert.equal(again.applied, true, 'another passing submission is recorded as another pass');
  assert.equal(again.xpAwarded, 0, 'XP is paid once per task and account');
  assert.equal(db.xp.size, 1);
  assert.equal(db.progress.get(`${learner}:js-double-numbers`)?.passes, 2);
  assert.equal(new Set(db.attemptIds).size, 3, 'three distinct submissions, one replay');
  console.log('PASS integrity: a fix submitted from the same session is recorded, a replay is not');
}
