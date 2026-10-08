import assert from 'node:assert/strict';
import { HIDDEN_RUN_FAILED_MESSAGE, runChecks, runInSandbox } from '../lib/coding/sandbox';
import { checkTypes, TYPE_CHECK_DEADLINE_MS, TYPE_CHECK_STOPPED_MESSAGE } from '../lib/coding/ts-check-pool';
import { handleCodingReveal, handleCodingSubmit, handleCodingTask } from '../lib/coding/handlers';
import { encodeCodingSession } from '../lib/quiz-tokens';
import { solutionFor } from '../lib/coding/solutions';
import { puzzleFor } from '../lib/coding/puzzles';
import { CODING_TASKS } from '../lib/coding/catalog';
import { isFreeCodingTask } from '../shared/tiers';
import { evolvingStage } from '../shared/evolving';
import { createMiniJest } from '../shared/coding-mini-jest';
import { runReactSuite } from '../lib/coding/react-runner';
import { withHiddenCases } from '../lib/coding/react-hidden';
import { allPassed, evaluateCalls, LOG_LINE_CUT, LOG_OUTPUT_CUT, MAX_LOG_CHARS, MAX_LOG_LINE_CHARS, TIMEOUT_MESSAGE } from '../shared/coding-evaluate';
import { buildSandboxWorker } from './build-sandbox-worker.mjs';

// Every run below goes through the grader's worker thread, built fresh from
// the sources under test, exactly as the deployment runs it.
await buildSandboxWorker();

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
// account and task, XP once per account and task and only when p_xp is above
// zero, and a level link that only ever turns true. Every routine call is
// kept, with its arguments. `record_coding_reveal` counts a reveal the way
// migration 038 does, and `forfeitAfterReveal` adds migration 048's rule: a
// first pass after a reveal pays no XP.
type ProgressFake = { status: 'in_progress' | 'passed' | 'revealed'; passes: number; revealCount: number };
function codingDatabase(options: { forfeitAfterReveal?: boolean } = {}) {
  const attempts = new Set<string>();
  const progress = new Map<string, ProgressFake>();
  const links = new Map<string, boolean>();
  const xp = new Set<string>();
  const attemptIds: string[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const result = (data: unknown) => Promise.resolve({ data, error: null });
  const progressRow = (taskId: unknown, row: ProgressFake) => ({
    task_id: taskId, track: 'javascript', status: row.status, passes: row.passes,
    review_stage: 0, next_review_at: null, reveal_count: row.revealCount, best_passed_at: null,
  });
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
          return result(row ? progressRow(filters.task_id, row) : null);
        }
        return result(null);
      },
      // A list read of coding_progress returns the account's rows.
      then: (resolve: (value: unknown) => unknown) => resolve({
        data: table === 'coding_progress'
          ? [...progress].filter(([key]) => key.startsWith(`${filters.user_id}:`)).map(([key, row]) => progressRow(key.slice(key.indexOf(':') + 1), row))
          : [],
        error: null,
      }),
    };
    return chain;
  };
  const rpc = (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    if (name === 'record_coding_reveal') {
      const key = `${args.p_user_id}:${args.p_task_id}`;
      const row = progress.get(key) ?? { status: 'in_progress' as const, passes: 0, revealCount: 0 };
      row.revealCount += 1;
      if (row.status !== 'passed') row.status = 'revealed';
      progress.set(key, row);
      return result(null);
    }
    if (name !== 'record_coding_verdict') return result(null);
    const attemptId = String(args.p_attempt_id);
    attemptIds.push(attemptId);
    assert.match(attemptId, /^[A-Za-z0-9:_-]{8,128}$/, 'the attempt id fits the coding_attempts check');
    const key = `${args.p_user_id}:${args.p_task_id}`;
    if (attempts.has(attemptId)) return result({ applied: false, firstPass: false, xpAwarded: false, codeChanged: false });
    attempts.add(attemptId);
    const row = progress.get(key) ?? { status: 'in_progress' as const, passes: 0, revealCount: 0 };
    let firstPass = false;
    let xpAwarded = false;
    if (args.p_outcome === 'passed') {
      firstPass = row.passes === 0;
      row.status = 'passed';
      row.passes += 1;
      const forfeited = options.forfeitAfterReveal === true && row.revealCount > 0;
      if (firstPass && !forfeited && !xp.has(key) && Number(args.p_xp) > 0) { xp.add(key); xpAwarded = true; }
    }
    progress.set(key, row);
    if (args.p_roadmap_attempt_id) {
      const link = `${args.p_roadmap_attempt_id}:${args.p_task_id}`;
      links.set(link, links.get(link) === true || args.p_outcome === 'passed');
    }
    return result({ applied: true, firstPass, xpAwarded, codeChanged: firstPass });
  };
  return { client: { from, rpc }, progress, links, xp, attemptIds, rpcCalls };
}

{
  const db = codingDatabase();
  const learner = 'user-aaaa-1111';
  const levelAttempt = 'levelattempt0123456789';
  const session = encodeCodingSession({ taskId: 'js-double-numbers', track: 'javascript', userId: null, roadmapAttemptId: levelAttempt });
  const reference = solutionFor('js-double-numbers')!;
  type Verdict = { verdict?: string; applied?: boolean; firstPass?: boolean; xpAwarded?: number; xpForfeited?: boolean; progress?: { status?: string } | null };
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
  assert.equal(passed.xpForfeited, false, 'a paid pass claims no forfeit');
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

  // A grader outage is not the learner's error (CODE-14). Without a runner
  // snapshot the isolated React runner cannot start: the Submit says so and
  // records nothing, so the next Submit from the same session still counts.
  delete process.env.REACT_RUNNER_SNAPSHOT_ID;
  const reactTask = CODING_TASKS.find((task) => task.track === 'react' && task.verify === 'tests' && task.suite && isFreeCodingTask(task.id) && !evolvingStage(task.id))!;
  const before = db.attemptIds.length;
  const outage = { statusCode: 200, body: null as null | { verdict?: string; applied?: boolean; codeError?: string | null; failureHint?: unknown; graderUnavailable?: boolean }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
  await handleCodingSubmit({
    method: 'POST', headers: { authorization: 'Bearer local-test' }, query: {},
    body: { session: encodeCodingSession({ taskId: reactTask.id, track: 'react', userId: null }), code: solutionFor(reactTask.id)!.solution, user_id: learner },
  } as never, outage as never, db.client as never);
  assert.equal(outage.statusCode, 200);
  assert.equal(outage.body?.verdict, 'error');
  assert.equal(outage.body?.applied, false);
  assert.match(outage.body?.codeError ?? '', /not recorded/, 'the learner is told nothing was recorded');
  assert.equal(outage.body?.failureHint, null, 'no hint blames the code');
  // The workbench shows it as a problem to retry, not as a build error (CODE-9).
  assert.equal(outage.body?.graderUnavailable, true, 'the verdict says the grader could not run');
  assert.equal(db.attemptIds.length, before, 'a runner outage writes no verdict');
  console.log('PASS integrity: a React runner outage is not recorded as the learner\'s error');
}

// ── a pass after a reveal says it paid nothing, and only then ───────────
// Migration 048 pays no XP (and so no coins) for a first pass after the
// learner revealed that task's solution. The verdict says so in
// `xpForfeited`, read from the progress row before the pass. Before 048 the
// routine still pays: xpAwarded is then true and nothing claims a forfeit.
{
  type Verdict = { verdict?: string; firstPass?: boolean; xpAwarded?: number; xpForfeited?: boolean };
  const reference = solutionFor('js-double-numbers')!;
  const reply = () => ({ statusCode: 200, body: null as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } });
  // An address of its own, so these requests spend none of the other tests' rate budget.
  const auth = { authorization: 'Bearer local-test', 'x-forwarded-for': '203.0.113.21' };
  const play = (db: ReturnType<typeof codingDatabase>, learner: string) => {
    const session = encodeCodingSession({ taskId: 'js-double-numbers', track: 'javascript', userId: null });
    return {
      reveal: async () => {
        const out = reply();
        await handleCodingReveal({ method: 'POST', headers: auth, query: {}, body: { session, hintsUsed: 20, user_id: learner } } as never, out as never, db.client as never);
        assert.equal(out.statusCode, 200, JSON.stringify(out.body));
      },
      submit: async (code: string) => {
        const out = reply();
        await handleCodingSubmit({ method: 'POST', headers: auth, query: {}, body: { session, code, user_id: learner } } as never, out as never, db.client as never);
        assert.equal(out.statusCode, 200, JSON.stringify(out.body));
        return out.body as Verdict;
      },
    };
  };

  const after048 = codingDatabase({ forfeitAfterReveal: true });
  const learner = 'user-bbbb-2222';
  const run = play(after048, learner);
  await run.reveal();
  assert.equal(after048.progress.get(`${learner}:js-double-numbers`)?.status, 'revealed');
  const forfeited = await run.submit(reference.solution);
  assert.equal(forfeited.verdict, 'passed');
  assert.equal(forfeited.firstPass, true);
  assert.equal(forfeited.xpAwarded, 0, 'migration 048 pays nothing for a first pass after a reveal');
  assert.equal(forfeited.xpForfeited, true, 'the verdict says the reveal cost the XP');
  const later = await run.submit(reference.senior!);
  assert.equal(later.verdict, 'passed');
  assert.equal(later.xpForfeited, false, 'a later pass forfeits nothing: nothing was on offer');

  const before048 = codingDatabase();
  const early = play(before048, learner);
  await early.reveal();
  const paid = await early.submit(reference.solution);
  assert.equal(paid.firstPass, true);
  assert.ok((paid.xpAwarded ?? 0) > 0, 'before 048 the routine still pays');
  assert.equal(paid.xpForfeited, false, 'a paid pass never claims a forfeit');

  // XP withheld for another reason, with no reveal on record, is no forfeit.
  const ledger = codingDatabase({ forfeitAfterReveal: true });
  ledger.xp.add(`${learner}:js-double-numbers`);
  const unpaid = await play(ledger, learner).submit(reference.solution);
  assert.equal(unpaid.firstPass, true);
  assert.equal(unpaid.xpAwarded, 0);
  assert.equal(unpaid.xpForfeited, false, 'no reveal, no claim');
  console.log('PASS integrity: a pass after a reveal says it earned no XP, and nothing else does');
}

// ── a failed system-design submission carries no key ────────────────────
// A failed or partly right submission says which answers were wrong and
// nothing of the key: no correct option, order or range, no explanation and
// no reference answer. Otherwise the key could be read, the task reopened
// under a new shuffle and passed for full XP. A pass carries all of it. The
// learner below has passed these tasks before, which keeps the Premium tasks
// open for review; the grading does not depend on that.
{
  type Step = { correct: boolean; given: unknown; correctIndex?: number; correctOrder?: number[]; acceptedRange?: unknown; explanation?: { en: string } };
  type Verdict = { verdict?: string; design?: Step[] | null; designReference?: { en: string } | null };
  type Opened = { session: string; task: { design?: { steps: { options: { en: string }[] }[] }; drill?: { options?: { en: string }[]; steps?: { en: string }[] } } };
  const db = codingDatabase();
  const learner = 'user-cccc-3333';
  const auth = { authorization: 'Bearer local-test', 'x-forwarded-for': '203.0.113.22' };
  const reply = () => ({ statusCode: 200, body: null as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } });
  const open = async (id: string) => {
    const out = reply();
    await handleCodingTask({ method: 'GET', headers: auth, query: { id, user_id: learner } } as never, out as never, db.client as never);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    return out.body as Opened;
  };
  const submit = async (session: string, answers: unknown[]) => {
    const out = reply();
    await handleCodingSubmit({ method: 'POST', headers: auth, query: {}, body: { session, answers, user_id: learner } } as never, out as never, db.client as never);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    return out.body as Verdict;
  };
  const withheld = (verdict: Verdict, secrets: string[], label: string) => {
    assert.equal(verdict.designReference, null, `${label}: no reference answer`);
    for (const step of verdict.design ?? []) {
      assert.deepEqual(Object.keys(step).sort(), ['correct', 'given'], `${label}: a step carries whether it was right and the answer given, nothing else`);
    }
    const wire = JSON.stringify(verdict);
    for (const secret of secrets) assert.ok(!wire.includes(secret.slice(0, 60)), `${label}: no explanation or reference text`);
  };
  const byId = (id: string) => CODING_TASKS.find((task) => task.id === id)!;
  const guided = CODING_TASKS.find((task) => task.track === 'system-design' && task.design)!;
  const estimate = CODING_TASKS.find((task) => task.drill?.format === 'estimate')!;
  const choice = CODING_TASKS.find((task) => task.drill?.format === 'tradeoff')!;
  const sequence = CODING_TASKS.find((task) => task.drill?.format === 'sequence')!;
  for (const task of [guided, estimate, choice, sequence]) db.progress.set(`${learner}:${task.id}`, { status: 'passed', passes: 1, revealCount: 0 });

  // A guided walkthrough: all wrong, then one short of the pass mark.
  const design = guided.design!;
  const secrets = [...design.steps.map((step) => step.explanation.en), design.reference.en];
  const rightFor = (opened: Opened) => opened.task.design!.steps.map((step, index) =>
    step.options.findIndex((option) => option.en === design.steps[index].options[design.steps[index].correct].en));
  const first = await open(guided.id);
  const right = rightFor(first);
  assert.ok(right.every((index) => index >= 0));
  const wrong = right.map((index, step) => (index + 1) % design.steps[step].options.length);
  const allWrong = await submit(first.session, wrong);
  assert.equal(allWrong.verdict, 'failed');
  assert.deepEqual(allWrong.design?.map((step) => step.correct), right.map(() => false));
  assert.deepEqual(allWrong.design?.map((step) => step.given), wrong, 'the learner\'s own answers come back');
  withheld(allWrong, secrets, 'all wrong');
  // The same session is checked once: sending it again, even with the right
  // answers, is refused, so the key cannot be read off it step by step.
  {
    const out = reply();
    await handleCodingSubmit({ method: 'POST', headers: auth, query: {}, body: { session: first.session, answers: right, user_id: learner } } as never, out as never, db.client as never);
    assert.equal(out.statusCode, 409, JSON.stringify(out.body));
    assert.equal((out.body as { error?: { code?: string } }).error?.code, 'design_session_used');
    const wire = JSON.stringify(out.body);
    for (const secret of secrets) assert.ok(!wire.includes(secret.slice(0, 60)), 'a refused resubmission carries no key');
  }
  const second = await open(guided.id);
  const secondRight = rightFor(second);
  const shortBy = design.passMark - 1;
  const partly = await submit(second.session, secondRight.map((index, step) => (step < shortBy ? index : (index + 1) % design.steps[step].options.length)));
  assert.equal(partly.verdict, 'failed');
  assert.equal(partly.design?.filter((step) => step.correct).length, shortBy, 'the right steps are marked right');
  withheld(partly, secrets, 'partly right');
  const third = await open(guided.id);
  const thirdRight = rightFor(third);
  const pass = await submit(third.session, thirdRight);
  assert.equal(pass.verdict, 'passed');
  assert.deepEqual(pass.design?.map((step) => step.correctIndex), thirdRight, 'a pass carries the correct options');
  assert.deepEqual(pass.design?.map((step) => step.explanation?.en), design.steps.map((step) => step.explanation.en), 'and the explanations');
  assert.equal(pass.designReference?.en, design.reference.en, 'and the reference answer');

  // An estimate drill.
  const band = byId(estimate.id).drill!;
  const estimateOpened = await open(estimate.id);
  const tooHigh = (band.max ?? 0) * 10 + 1;
  const missed = await submit(estimateOpened.session, [tooHigh]);
  assert.equal(missed.verdict, 'failed');
  assert.deepEqual(missed.design, [{ correct: false, given: tooHigh }]);
  withheld(missed, [band.explanation.en], 'estimate');
  const inBand = await submit((await open(estimate.id)).session, [band.answer!]);
  assert.equal(inBand.verdict, 'passed');
  assert.deepEqual(inBand.design?.[0].acceptedRange, { min: band.min, max: band.max, answer: band.answer }, 'a pass carries the accepted range');
  assert.equal(inBand.design?.[0].explanation?.en, band.explanation.en);

  // A trade-off drill.
  const pick = byId(choice.id).drill!;
  const choiceOpened = await open(choice.id);
  const choiceRight = choiceOpened.task.drill!.options!.findIndex((option) => option.en === pick.options![pick.correct!].en);
  const choiceWrong = (choiceRight + 1) % pick.options!.length;
  const wrongPick = await submit(choiceOpened.session, [choiceWrong]);
  assert.deepEqual(wrongPick.design, [{ correct: false, given: choiceWrong }]);
  withheld(wrongPick, [pick.explanation.en], 'trade-off');
  const choiceAgain = await open(choice.id);
  const rightPick = await submit(choiceAgain.session, [choiceAgain.task.drill!.options!.findIndex((option) => option.en === pick.options![pick.correct!].en)]);
  assert.equal(rightPick.verdict, 'passed');
  assert.equal(typeof rightPick.design?.[0].correctIndex, 'number', 'a pass carries the correct option');

  // A sequence drill.
  const order = byId(sequence.id).drill!;
  const orderFor = (opened: Opened) => order.steps!.map((step) => opened.task.drill!.steps!.findIndex((shown) => shown.en === step.en));
  const sequenceOpened = await open(sequence.id);
  const reversed = [...orderFor(sequenceOpened)].reverse();
  const outOfOrder = await submit(sequenceOpened.session, [reversed]);
  assert.deepEqual(outOfOrder.design, [{ correct: false, given: reversed }]);
  withheld(outOfOrder, [order.explanation.en], 'sequence');
  const sequenceAgain = await open(sequence.id);
  const inOrder = await submit(sequenceAgain.session, [orderFor(sequenceAgain)]);
  assert.equal(inOrder.verdict, 'passed');
  assert.deepEqual(inOrder.design?.[0].correctOrder, orderFor(sequenceAgain), 'a pass carries the correct order');
  console.log('PASS integrity: a failed system-design submission carries no key, a pass carries all of it');
}

// ── a checklist pass is the learner's word, and pays nothing ─────────────
// A React task graded `verify: 'checklist'` has no suite, so any code passes.
// That pass is recorded as unverified: no XP and so no coins, no link to the
// Learn level attempt the session names, and no junior and senior solutions.
// No task in the catalogue uses the mode any more, so the case turns a free
// React task with both solutions into one and puts it back afterwards.
{
  const db = codingDatabase();
  const learner = 'user-bbbb-2222';
  const levelAttempt = 'levelattemptchecklist01';
  const task = CODING_TASKS.find((one) => one.track === 'react' && one.verify === 'tests' && one.suite && isFreeCodingTask(one.id)
    && !evolvingStage(one.id) && solutionFor(one.id)?.junior && solutionFor(one.id)?.senior)!;
  const { verify, suite } = task;
  task.verify = 'checklist';
  delete task.suite;
  try {
    const out = { statusCode: 200, body: null as null | { verdict?: string; xpAwarded?: number; applied?: boolean; solutions?: unknown }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
    await handleCodingSubmit({
      method: 'POST', headers: { authorization: 'Bearer local-test' }, query: {},
      body: { session: encodeCodingSession({ taskId: task.id, track: 'react', userId: null, roadmapAttemptId: levelAttempt }), code: 'const App = () => null;', user_id: learner },
    } as never, out as never, db.client as never);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    assert.equal(out.body?.verdict, 'passed', 'the learner\'s confirmation still stands');
    assert.equal(out.body?.applied, true, 'the attempt is recorded');
    const [verdict] = db.rpcCalls.filter((call) => call.name === 'record_coding_verdict');
    assert.equal(verdict?.args.p_verified, false, 'recorded as unverified');
    assert.equal(verdict?.args.p_xp, 0, 'with no XP');
    assert.equal(verdict?.args.p_roadmap_attempt_id, null, 'and linked to no Learn level attempt');
    assert.equal(db.links.size, 0, 'so the Learn level never counts it');
    assert.equal(out.body?.xpAwarded, 0);
    assert.equal(db.xp.size, 0);
    assert.ok(!db.rpcCalls.some((call) => call.name === 'credit_verified_xp_tokens'), 'no coins');
    assert.equal(out.body?.solutions, null, 'a pass nothing checked opens no solutions');
  } finally {
    task.verify = verify;
    task.suite = suite;
  }
  console.log('PASS integrity: a checklist pass is recorded unverified, with no XP, coins, Learn link or solutions');
}

// ── a code-ordering puzzle round-trips through its session (CODE-7) ──────
// The task handler seals the presentation-id translation into the session;
// the submit handler must find it there again, or every arrangement is
// refused as "this session did not issue a puzzle".
{
  type Body = { session?: string; task?: { puzzle?: { lines: { id: string; code: string }[] } }; puzzle?: { accepted?: boolean } };
  const reply = () => ({ statusCode: 200, body: null as null | Body, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } });
  for (const id of ['js-sum-array', 'js-count-vowels']) {
    const authored = puzzleFor(id)!;
    const opened = reply();
    await handleCodingTask({ method: 'GET', headers: {}, query: { id } } as never, opened as never, null);
    assert.equal(opened.statusCode, 200);
    const lines = opened.body!.task!.puzzle!.lines;
    const byCode = new Map(lines.map((line) => [line.code, line.id]));
    const arrange = async (authoredOrder: readonly string[]) => {
      const order = authoredOrder.map((line) => byCode.get(authored.lines.find((one) => one.id === line)!.code)!);
      const sent = reply();
      await handleCodingSubmit({ method: 'POST', headers: {}, body: { session: opened.body!.session, order } } as never, sent as never, null);
      return sent;
    };
    const right = await arrange(authored.accepted[0]);
    assert.equal(right.statusCode, 200, `${id}: ${JSON.stringify(right.body)}`);
    assert.equal(right.body?.puzzle?.accepted, true, `${id}: an accepted order is accepted`);
    const wrong = await arrange([...authored.accepted[0]].reverse());
    assert.equal(wrong.statusCode, 200);
    assert.equal(wrong.body?.puzzle?.accepted, false, `${id}: a reversed order is not`);
    const forged = reply();
    await handleCodingSubmit({ method: 'POST', headers: {}, body: { session: opened.body!.session, order: lines.map((_, index) => `b${index + 2}`) } } as never, forged as never, null);
    assert.equal(forged.statusCode, 400, `${id}: an id the session never issued is refused`);
  }
  console.log('PASS integrity: a code-ordering puzzle submits through the session that issued it');
}

// ── the code cannot swallow its type tests (CODE-6) ──────────────────────
// Code typed `any` throughout fails the assertion that must reject a wrong
// argument. Ending the code inside an unterminated template literal, block
// comment or string used to pull every type-test line into that token, so
// the rejecting assertion "passed" and so did the task.
{
  const anyShipping = 'type Speed = any;\nconst shippingDays = (speed: any, weekend: any): any => (speed === "standard" ? 5 : speed === "express" ? 2 : 1) + (weekend ? 1 : 0);';
  const anyGroupBy = 'function groupBy(items: any, keyOf: any): any { const m = new Map(); for (const i of items) { const k = keyOf(i); m.has(k) ? m.get(k).push(i) : m.set(k, [i]); } return m; }';
  const submitTs = async (taskId: string, code: string) => {
    const out = { statusCode: 200, body: null as null | { verdict?: string; solutions?: unknown }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
    await handleCodingSubmit({ method: 'POST', headers: {}, body: { session: encodeCodingSession({ taskId, track: 'typescript', userId: null }), code } } as never, out as never, null);
    assert.equal(out.statusCode, 200);
    return out.body!;
  };
  assert.equal((await submitTs('ts-shipping-speed', anyShipping)).verdict, 'failed', '`any` everywhere fails the rejecting type test');
  for (const tail of ['\ntype __Z = `', '\n/*', '\nconst __z = "', '\n// @ts-ignore']) {
    for (const [taskId, code] of [['ts-shipping-speed', anyShipping], ['ts-path-generics-1', anyGroupBy]] as const) {
      const verdict = await submitTs(taskId, code + tail);
      assert.notEqual(verdict.verdict, 'passed', `${taskId}: code ending in ${JSON.stringify(tail.trim())} must not pass its type tests`);
      assert.equal(verdict.solutions, null, `${taskId}: no solutions released`);
    }
  }
  console.log('PASS integrity: the code cannot swallow its type tests');
}

// ── React suites compare values the way Jest does (CODE-12) ──────────────
// toEqual compared JSON text: key order failed correct answers, any two Maps
// or Sets were equal, and NaN equalled null.
{
  const jest = createMiniJest();
  const { test, expect } = jest.globals as unknown as {
    test: (name: string, body: () => void) => void;
    expect: (value: unknown) => Record<string, (...args: unknown[]) => void> & { not: Record<string, (...args: unknown[]) => void> };
  };
  class Point { constructor(public x: number) {} }
  const cyclic: { self?: unknown; n: number } = { n: 1 };
  cyclic.self = cyclic;
  const cyclicToo: { self?: unknown; n: number } = { n: 1 };
  cyclicToo.self = cyclicToo;
  const expectations: [string, () => void][] = [
    ['key order does not matter', () => expect([{ id: 7, type: 'toggled' }]).toEqual([{ type: 'toggled', id: 7 }])],
    ['different Maps differ', () => expect(new Map([['a', 1]])).not.toEqual(new Map())],
    ['Maps compare entries', () => expect(new Map<unknown, unknown>([['a', 1], [{ k: 1 }, [2]]])).toEqual(new Map<unknown, unknown>([[{ k: 1 }, [2]], ['a', 1]]))],
    ['different Sets differ', () => expect(new Set([1, 2])).not.toEqual(new Set([3]))],
    ['Sets compare members', () => expect(new Set([1, { a: 2 }])).toEqual(new Set([{ a: 2 }, 1]))],
    ['NaN is not null', () => expect([NaN]).not.toEqual([null])],
    ['NaN equals NaN', () => expect({ v: NaN }).toEqual({ v: NaN })],
    ['0 and -0 differ', () => expect(0).not.toEqual(-0)],
    ['Dates compare by time', () => expect(new Date(5)).toEqual(new Date(5))],
    ['different Dates differ', () => expect(new Date(5)).not.toEqual(new Date(6))],
    ['an undefined property is ignored', () => expect({ a: 1, b: undefined }).toEqual({ a: 1 })],
    ['but not by toStrictEqual', () => expect({ a: 1, b: undefined }).not.toStrictEqual({ a: 1 })],
    ['toStrictEqual checks the class', () => expect(new Point(1)).not.toStrictEqual({ x: 1 })],
    ['toEqual does not', () => expect(new Point(1)).toEqual({ x: 1 })],
    ['arrays keep their order', () => expect([1, 2]).not.toEqual([2, 1])],
    ['an array is not an object', () => expect([1]).not.toEqual({ 0: 1 })],
    ['cycles are followed', () => expect(cyclic).toEqual(cyclicToo)],
  ];
  for (const [name, body] of expectations) test(name, body);
  const run = await jest.run();
  assert.deepEqual(run.cases.filter((one) => one.status === 'fail').map((one) => `${one.name}: ${one.error}`), [], 'mini-jest equality follows Jest');

  // A correct answer that builds its action with the keys in another order.
  const dispatchTask = CODING_TASKS.find((task) => task.id === 'react-easy3-dispatch-through-context')!;
  const dispatchSolution = solutionFor(dispatchTask.id)!;
  const reordered = dispatchSolution.solution.replace("dispatch({ type: 'toggled', id: task.id })", "dispatch({ id: task.id, type: 'toggled' })");
  assert.notEqual(reordered, dispatchSolution.solution);
  const reorderedRun = await runReactSuite({ suite: withHiddenCases(dispatchTask.suite!, dispatchSolution.hiddenSuite), appSource: reordered });
  assert.equal(reorderedRun.failed, 0, `key order passes the suite: ${reorderedRun.cases.filter((one) => one.status === 'fail').map((one) => one.error).join('; ')}`);
  console.log('PASS integrity: React suites compare values the way Jest does');
}

// ── a form the page lets submit fails its case ───────────────────────────
// In the preview a submission the component does not cancel reloads the
// frame and loses what it showed, yet 48 React tasks passed without
// preventDefault(). The runner fails the case that submitted, whatever the
// checks read, and the browser harness applies the same rule.
{
  const { FORM_SUBMIT_NOT_PREVENTED } = await import('../shared/coding-react-support');
  const suite = `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
test('adding shows the item', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('Item'), { target: { value: 'Tea' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('listitem').textContent).toBe('Tea');
});
test('a check that fails after a submit', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
test('the box starts empty', () => {
  render(<App />);
  expect(screen.getByLabelText('Item').value).toBe('');
});`;
  const page = (handler: string) => `import React, { useState } from 'react';
export default function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  return <form onSubmit={(event) => { ${handler} setItems([...items, text]); }}>
    <label>Item <input value={text} onChange={(event) => setText(event.target.value)} /></label>
    <button>Add</button>
    <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
  </form>;
}`;
  // The middle case fails on its own check, which skips its afterEach hooks;
  // the watch it leaves open must not reach the case after it.
  const failed = 'expected length 1 to be 2';
  const errors = async (handler: string) => (await runReactSuite({ suite, appSource: page(handler) })).cases.map((one) => one.error);
  assert.deepEqual(await errors('event.preventDefault();'), [null, failed, null], 'a form that cancels its submit passes');
  assert.deepEqual(await errors(''), [FORM_SUBMIT_NOT_PREVENTED, failed, null], 'a form left to submit fails the case that submitted it');
  assert.deepEqual(await errors('event.stopPropagation();'), [FORM_SUBMIT_NOT_PREVENTED, failed, null], 'stopping the submit on its way up does not hide it');
  console.log('PASS integrity: a form the page lets submit fails its case');
}

// ── Run and Submit agree (CODE-10) ───────────────────────────────────────
// The browser's Run and the server's Submit have to reach the same verdict:
// both in strict mode, one clock however the code asks for the time, and a
// structuredClone that copies what the browser's copies.
{
  const checks = (id: string) => {
    const task = CODING_TASKS.find((one) => one.id === id)!;
    const all = [...task.tests!, ...(solutionFor(id)?.hiddenTests ?? [])];
    return { calls: all.map((one) => one.call), expectations: all.map((one) => one.expected), shown: task.tests!.length };
  };
  const agree = async (id: string, code: string) => {
    const { calls, expectations, shown } = checks(id);
    const run = await evaluateCalls({ code, calls: calls.slice(0, shown), expectations: expectations.slice(0, shown) });
    const submit = await runInSandbox({ code, calls, expectations, shownCalls: shown });
    assert.deepEqual(submit.results.slice(0, shown).map((one) => one.pass), run.results.map((one) => one.pass), `${id}: Run and Submit disagree`);
    return { run, submit };
  };
  const sloppy = await agree('js-sum-array', 'function sum(numbers) {\n  total = 0;\n  for (const n of numbers) total += n;\n  return total;\n}');
  assert.ok(sloppy.run.results.every((one) => one.pass === false && /total/.test(one.error ?? '')), 'Run reports an undeclared assignment, as Submit does');
  const timed = await agree('js-throttle-calls', 'const throttle = (fn, ms) => { let last = -Infinity; return (...args) => { const now = new Date().getTime(); if (now - last >= ms) { last = now; fn(...args); } }; };');
  assert.ok(allPassed(timed.submit), `new Date() reads the same clock as the timers: ${JSON.stringify(timed.submit.results)}`);
  const cloned = await agree('alg-deep-clone', 'const deepClone = (value) => structuredClone(value);');
  assert.ok(allPassed(cloned.submit), `structuredClone copies like the browser's: ${JSON.stringify(cloned.submit.results)}`);
  const semantics = await runInSandbox({
    code: '',
    calls: [
      'Date.now() === new Date().getTime() && new Date() instanceof Date && new Date(0).getTime() === 0 && typeof Date() === "string"',
      '(() => { const start = Date.now(); return new Promise((done) => setTimeout(() => done(new Date().getTime() - start), 250)); })()',
      '(() => { const inner = { n: 1 }; const m = new Map([["k", inner]]); const c = structuredClone(m); return [c instanceof Map, c.get("k").n, c.get("k") !== inner]; })()',
      '(() => { const s = structuredClone(new Set([1, 2])); return [s instanceof Set, s.size]; })()',
      '(() => { const o = { d: new Date(5), r: /a/g, u: undefined, n: NaN }; o.self = o; const c = structuredClone(o); return [c.self === c, c.d instanceof Date, c.d.getTime(), c.r.flags, "u" in c, Number.isNaN(c.n)]; })()',
      '(() => { try { structuredClone({ f() {} }); return "cloned"; } catch (error) { return error.name; } })()',
    ],
    expectations: [true, 250, [true, 1, true], [true, 2], [true, true, 5, 'g', true, true], 'DataCloneError'],
  });
  assert.deepEqual(semantics.results.map((one) => one.pass), [true, true, true, true, true, true], JSON.stringify(semantics.results));
  console.log('PASS integrity: Run and Submit agree on strict mode, the clock and structuredClone');
}

// ── console output is capped by size (CODE-13) ───────────────────────────
// A hundred megabyte-long lines made a 20 MB Submit response, past what the
// platform sends, after the verdict was already recorded.
{
  // 200 lines of 20 000 characters: ten times the line cap and sixty times the
  // total cap, small enough to finish well inside the 2.5 s run deadline on a
  // loaded CI runner.
  const flood = 'const shout = () => { for (let i = 0; i < 200; i++) console.log("x".repeat(20_000)); return 1; };';
  const run = await evaluateCalls({ code: flood, calls: ['shout()'], expectations: [1] });
  const submit = await runInSandbox({ code: flood, calls: ['shout()'], expectations: [1] });
  for (const [where, logs] of [['Run', run.logs], ['Submit', submit.logs]] as const) {
    const total = logs.reduce((sum, line) => sum + line.length, 0);
    assert.ok(logs.every((line) => line.length <= MAX_LOG_LINE_CHARS + LOG_LINE_CUT.length), `${where}: every line is cut to size`);
    assert.ok(total <= MAX_LOG_CHARS + LOG_OUTPUT_CUT.length, `${where}: the output is capped in all (${total})`);
    assert.equal(logs.at(-1), LOG_OUTPUT_CUT, `${where}: the cut is marked`);
  }
  assert.deepEqual(submit.logs, run.logs, 'both runners cut the same way');
  assert.equal(submit.results[0]?.pass, true, 'the calls still grade');
  const response = { statusCode: 200, body: null as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
  await handleCodingSubmit({
    method: 'POST', headers: {},
    body: { session: encodeCodingSession({ taskId: 'js-sum-array', track: 'javascript', userId: null }), code: 'function sum(numbers) { for (let i = 0; i < 100; i++) console.log("y".repeat(50_000)); return numbers.reduce((a, b) => a + b, 0); }' },
  } as never, response as never, null);
  assert.equal(response.statusCode, 200);
  assert.ok(JSON.stringify(response.body).length < 200_000, `the Submit response stays small (${JSON.stringify(response.body).length} bytes)`);
  console.log('PASS integrity: console output is capped by size');
}

// ── hidden checks cannot be answered by call order (CODE-11) ─────────────
// Every call used to share one program, visible first, so `A[k++]` served
// the hidden checks their answers in authored order, and the hidden pass
// count told a prober which guesses were right. Hidden checks now run in a
// fresh program, in an order shuffled per submission.
{
  const task = CODING_TASKS.find((one) => one.id === 'js-digit-sum')!;
  const hidden = solutionFor(task.id)!.hiddenTests!;
  const answers = [...task.tests!.map((one) => one.expected), ...hidden.map((one) => one.expected)];
  const response = { statusCode: 200, body: null as null | { verdict?: string; hidden?: { passed: number; total: number } }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
  await handleCodingSubmit({
    method: 'POST', headers: {},
    body: { session: encodeCodingSession({ taskId: task.id, track: 'javascript', userId: null }), code: `let k = 0; const A = ${JSON.stringify(answers)}; const digitSum = () => A[k++];` },
  } as never, response as never, null);
  assert.equal(response.statusCode, 200);
  assert.notEqual(response.body?.verdict, 'passed', 'answers served by call count do not pass');
  assert.equal(response.body?.hidden?.passed, 0, 'the hidden run starts from a fresh program');

  // Even knowing the hidden answers, serving them in authored order depends on
  // an order the learner never sees. Reversed here, so the check is exact.
  const known = Object.fromEntries(task.tests!.map((one) => [one.call, one.expected]));
  const byOrder = `const known = ${JSON.stringify(known)}; const H = ${JSON.stringify(hidden.map((one) => one.expected))}; let k = 0; const digitSum = (n) => { const seen = known["digitSum(" + n + ")"]; return seen === undefined ? H[k++] : seen; };`;
  const graded = await runChecks({ code: byOrder, visible: task.tests!, hidden, shuffle: (list) => [...list].reverse() });
  assert.ok(allPassed(graded.visible));
  assert.ok(!allPassed(graded.hidden!), 'hidden answers served in authored order fail a shuffled run');
  const fair = await runChecks({ code: solutionFor(task.id)!.solution, visible: task.tests!, hidden, shuffle: (list) => [...list].reverse() });
  assert.ok(allPassed(fair.visible) && allPassed(fair.hidden!), 'a real solution passes in any order');
  console.log('PASS integrity: hidden checks cannot be answered by call order');
}

// ── a run that outlives its deadline is stopped (CODE-5) ─────────────────
// QuickJS checks its deadline between bytecode instructions. A loop whose
// time goes into native calls ran for 54 s on the request thread, and a
// split-heavy one for nearly ten minutes, blocking every other request the
// instance served. The thread running it is stopped at the deadline plus a
// short grace, and the request thread keeps answering meanwhile.
{
  let worstLag = 0;
  let last = Date.now();
  const beat = setInterval(() => { const now = Date.now(); worstLag = Math.max(worstLag, now - last - 20); last = now; }, 20);
  const started = Date.now();
  const [native, split] = await Promise.all([
    runInSandbox({ code: 'let s = 0; while (true) { s += "x".repeat(2e6).length; } const f = () => 1;', calls: ['f()'], expectations: [1], deadlineMs: 300 }),
    runInSandbox({ code: 'const f = () => { let s = 0; while (true) { s += "ab".repeat(1e6).split("").length; } };', calls: ['f()'], expectations: [1], deadlineMs: 300 }),
  ]);
  const took = Date.now() - started;
  clearInterval(beat);
  assert.equal(native.timedOut, true);
  assert.equal(split.timedOut, true);
  assert.ok(took < 4_000, `both runaway runs were stopped near their deadline (${took} ms)`);
  assert.ok(worstLag < 500, `the request thread kept answering (worst lag ${worstLag} ms)`);
  const after = await runInSandbox({ code: 'const f = () => 1;', calls: ['f()'], expectations: [1] });
  assert.equal(after.results[0]?.pass, true, 'the next run gets a working thread');
  console.log(`PASS integrity: a runaway run is stopped in ${took} ms without blocking the request thread`);
}

// ── type checking runs off the request thread (CODE-2) ───────────────────
// The compiler checks types synchronously. A kilobyte and a half of
// recursive conditional types kept it busy for about half a minute on the
// request thread, which also serves Learn. The check now runs on a worker
// thread, is stopped at its deadline, and the verdict says so.
{
  const recursive = "type B<N extends number, E, A extends unknown[] = []> = A['length'] extends N ? A : B<N, E, [...A, E]>;\n"
    + Array.from({ length: 30 }, (_, index) => `const q${index}: B<999, 'k${index}'>['length'] = 999;\n`).join('');
  const submit = async (code: string) => {
    const out = { statusCode: 200, body: null as null | { verdict?: string; codeError?: string | null; solutions?: unknown; failureHint?: unknown }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
    await handleCodingSubmit({ method: 'POST', headers: {}, body: { session: encodeCodingSession({ taskId: 'ts-typed-slug', track: 'typescript', userId: null }), code } } as never, out as never, null);
    assert.equal(out.statusCode, 200, JSON.stringify(out.body));
    return out.body!;
  };
  // A first check loads the compiler on the thread before its clock starts.
  assert.equal((await submit(solutionFor('ts-typed-slug')!.solution)).verdict, 'passed', 'the reference passes on the worker thread');
  let worstLag = 0;
  let last = Date.now();
  const beat = setInterval(() => { const now = Date.now(); worstLag = Math.max(worstLag, now - last - 20); last = now; }, 20);
  const started = Date.now();
  const stuck = await submit(recursive + solutionFor('ts-typed-slug')!.solution);
  const took = Date.now() - started;
  clearInterval(beat);
  assert.equal(stuck.verdict, 'timeout', JSON.stringify(stuck));
  assert.equal(stuck.codeError, TYPE_CHECK_STOPPED_MESSAGE);
  assert.equal(stuck.solutions, null, 'a stopped check releases no solutions');
  // Audit C5-2: the timeout hint sent the learner looking for an endless loop.
  assert.equal(stuck.failureHint, null, 'a stopped type check carries no loop hint; its message names the type');
  assert.ok(took < TYPE_CHECK_DEADLINE_MS + 3_000, `the check was stopped near its deadline (${took} ms)`);
  // On this thread the same check held the event loop for half a minute; the
  // bound leaves room for a loaded CI machine.
  assert.ok(worstLag < 2_000, `the request thread kept answering (worst lag ${worstLag} ms)`);
  assert.equal((await submit(solutionFor('ts-typed-slug')!.solution)).verdict, 'passed', 'the next check gets a working thread');
  // The pool reports a stop the same way for every caller.
  const direct = await checkTypes(recursive, [[]], 300);
  assert.equal(direct.stopped, true);
  console.log(`PASS integrity: a runaway type check is stopped in ${took} ms without blocking the request thread`);
}

// ── a hidden run's error carries nothing the program wrote (CODE-3) ──────
// The controller called `then` on each call's promise after the call had
// run. Code that put a throwing getter on Promise.prototype.constructor
// threw there, during the hidden run, with the hidden inputs in the message,
// and the verdict returned it as the error.
{
  const leak = 'const seen = []; const digitSum = n => { seen.push(n); return 0; }; const visible = [493, 1234, 0, 7, 1000]; let reads = 0; Object.defineProperty(Promise.prototype, "constructor", { configurable: true, get() { reads++; if (seen.some(n => !visible.includes(n)) && reads === 3) throw new Error("HIDDEN " + JSON.stringify(seen)); return Promise; } });';
  const out = { statusCode: 200, body: null as null | { verdict?: string; codeError?: string | null; hidden?: unknown }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
  await handleCodingSubmit({ method: 'POST', headers: {}, body: { session: encodeCodingSession({ taskId: 'js-digit-sum', track: 'javascript', userId: null }), code: leak } } as never, out as never, null);
  assert.equal(out.statusCode, 200, JSON.stringify(out.body));
  assert.doesNotMatch(JSON.stringify(out.body), /HIDDEN|99999|305/, `no hidden input comes back: ${JSON.stringify(out.body)}`);
  assert.equal(out.body?.verdict, 'failed');
  // Whatever else stops a hidden run, only a fixed message comes back: here a
  // hidden call that does not compile, which the visible run never sees.
  const garbled = await runChecks({ code: 'const f = (x) => x;', visible: [{ call: 'f(1)', expected: 1 }], hidden: [{ call: 'f(', expected: 2 }], shuffle: (list) => list });
  assert.equal(garbled.visible.codeError, null);
  assert.equal(garbled.hidden?.codeError, HIDDEN_RUN_FAILED_MESSAGE);
  const hung = await runChecks({ code: 'const f = (x) => { if (x === 2) while (true) {} return x; };', visible: [{ call: 'f(1)', expected: 1 }], hidden: [{ call: 'f(2)', expected: 2 }], shuffle: (list) => list });
  assert.equal(hung.hidden?.timedOut, true);
  assert.equal(hung.hidden?.codeError, TIMEOUT_MESSAGE, 'a fixed message still comes back');
  console.log('PASS integrity: a hidden run reports no text the program wrote');
}

// ── a probe counts with the built-ins it started with (PATH-1) ───────────
// js-binary-search's hidden check counts array reads through a Proxy. Code
// that replaced the global Proxy, or RegExp.prototype.test, made every count
// zero, so a linear scan passed the binary-search budget.
{
  const task = CODING_TASKS.find((one) => one.id === 'js-binary-search')!;
  const hidden = solutionFor(task.id)!.hiddenTests!;
  const linear = 'const binarySearch = (sorted, target) => { for (let i = 0; i < sorted.length; i++) if (sorted[i] === target) return i; return -1; };';
  for (const [name, tamper] of [
    ['no tampering', ''],
    ['Proxy replaced', 'var Proxy = function (target) { return target; };'],
    ['global Proxy replaced', 'globalThis.Proxy = function (target) { return target; };'],
    ['RegExp test replaced', 'RegExp.prototype.test = function () { return false; };'],
  ] as const) {
    const run = await runChecks({ code: `${tamper}\n${linear}`, visible: task.tests!, hidden, shuffle: (list) => list });
    assert.ok(!allPassed(run.hidden!), `${name}: a linear scan passes the read budget`);
  }
  const reference = await runChecks({ code: solutionFor(task.id)!.solution, visible: task.tests!, hidden, shuffle: (list) => list });
  assert.ok(allPassed(reference.visible) && allPassed(reference.hidden!), 'the reference still passes');
  const redeclared = await runInSandbox({ code: 'var __probe = { Proxy: function (target) { return target; } };', calls: ['1'], expectations: [1] });
  assert.match(redeclared.codeError ?? '', /^SyntaxError: .*redefinition/, `the probe cannot be redeclared: ${redeclared.codeError}`);
  console.log('PASS integrity: a replaced Proxy or RegExp test does not zero a read count');
}
