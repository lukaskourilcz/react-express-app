// First: no exported Supabase project or Redis may reach the handlers below.
import './launch-test-env';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { handleCodingSubmit, handleCodingTask } from '../lib/coding/handlers';
import { codingTaskById } from '../lib/coding/active';
import { solutionFor } from '../lib/coding/solutions';
import { runReactSuite } from '../lib/coding/react-runner';
import { withHiddenCases } from '../lib/coding/react-hidden';
import { gradingProbes, type GradingProbe } from './live-grading-check';

// The live grading monitor (scripts/check-live-grading.ts). It never calls
// production here. Part one holds its inputs to the real graders, locally: the
// probe tasks open to a signed-out visitor, each reference solution passes and
// each wrong solution fails rather than errors. Part two runs the built script
// against a stub of the roadmap API on 127.0.0.1 and checks what it reports
// for a healthy grader, a broken one, a React runner that is down, an HTTP
// error, rate limits and a dropped connection.

const CLI = 'node_modules/.cache/shark/live-grading.mjs';
const probes = gradingProbes();

/* ── part one: the probes against the real graders ────────────────────── */

let address = 0;
function response() {
  return { statusCode: 200, body: null as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
}
const anonymous = (extra: Record<string, unknown>) => ({ headers: { 'x-forwarded-for': `198.51.100.${++address}` }, ...extra });

async function openAnonymously(taskId: string): Promise<string> {
  const res = response();
  await handleCodingTask(anonymous({ method: 'GET', query: { id: taskId } }) as never, res as never, null);
  const body = res.body as { session?: string | null; locked?: string | null };
  assert.equal(res.statusCode, 200, `${taskId} opens for a signed-out visitor`);
  assert.equal(body.locked, null, `${taskId} is not locked for a signed-out visitor`);
  assert.ok(typeof body.session === 'string' && body.session, `${taskId} gives a signed-out visitor a session to submit with`);
  return body.session;
}

async function gradeAnonymously(taskId: string, code: string): Promise<string | undefined> {
  const res = response();
  await handleCodingSubmit(anonymous({ method: 'POST', query: {}, body: { session: await openAnonymously(taskId), code } }) as never, res as never, null);
  assert.equal(res.statusCode, 200, `${taskId}: an anonymous submit is graded (${JSON.stringify(res.body)})`);
  const body = res.body as { verdict?: string; progress?: unknown };
  assert.equal(body.progress, null, `${taskId}: an anonymous submit records nothing`);
  return body.verdict;
}

async function checkProbes() {
  assert.deepEqual(probes.map((probe) => probe.taskId), ['js-double-numbers', 'react-counter'], 'one JavaScript and one React task');
  for (const probe of probes) {
    const task = codingTaskById(probe.taskId)!;
    await openAnonymously(probe.taskId);
    if (task.track === 'react') {
      // Production runs this suite in the Vercel Sandbox; the trusted local
      // runner gives the same verdict for code the repository wrote itself.
      const suite = withHiddenCases(task.suite!, solutionFor(task.id)?.hiddenSuite);
      const passing = await runReactSuite({ suite, appSource: probe.reference });
      assert.ok(!passing.compileError && passing.failed === 0 && passing.total > 0, `${probe.taskId}: the reference solution passes its suite`);
      const failing = await runReactSuite({ suite, appSource: probe.wrong });
      assert.equal(failing.compileError, null, `${probe.taskId}: the wrong solution compiles, so the grader answers failed rather than error`);
      assert.ok(!failing.timedOut && failing.failed > 0, `${probe.taskId}: the wrong solution fails its suite`);
    } else {
      assert.equal(await gradeAnonymously(probe.taskId, probe.reference), 'passed', `${probe.taskId}: the reference solution passes`);
      assert.equal(await gradeAnonymously(probe.taskId, probe.wrong), 'failed', `${probe.taskId}: the wrong solution fails rather than errors`);
    }
  }
}

/* ── part two: the script against a stub ─────────────────────────────── */

type Mode = 'healthy' | 'lenient' | 'react-down' | 'server-error' | 'rate-limited-once' | 'always-rate-limited' | 'drop-once' | 'locked';
let mode: Mode = 'healthy';
let spent = false;
const byTask = new Map<string, GradingProbe>(probes.map((probe) => [probe.taskId, probe]));

function reply(res: import('node:http').ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function verdict(value: string, extra: Record<string, unknown> = {}) {
  return { verdict: value, results: [{ pass: value === 'passed', actual: null }], hidden: null, check: null, logs: [], codeError: null, design: null, designReference: null, failureHint: null, puzzle: null, progress: null, firstPass: false, xpAwarded: 0, applied: false, github: null, solutions: null, ...extra };
}

const stub: Server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://stub');
  if (mode === 'drop-once' && !spent) {
    spent = true;
    req.socket.destroy();
    return;
  }
  if (url.pathname !== '/api/quiz/roadmap') return reply(res, 404, { error: { code: 'not_found', message: 'Not found' } });
  const resource = url.searchParams.get('resource');
  if (resource === 'coding-task' && req.method === 'GET') {
    const id = url.searchParams.get('id') ?? '';
    if (!byTask.has(id)) return reply(res, 404, { error: { code: 'not_found', message: 'Unknown task' } });
    if (mode === 'locked') return reply(res, 200, { task: { id }, session: null, locked: 'tier3', progress: null, draft: null, signedIn: false });
    return reply(res, 200, { task: { id }, session: `stub-session:${id}`, locked: null, progress: null, draft: null, signedIn: false });
  }
  if (resource === 'coding-submit' && req.method === 'POST') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (mode === 'rate-limited-once' && !spent) {
        spent = true;
        return reply(res, 429, { error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.' } }, { 'retry-after': '0' });
      }
      if (mode === 'always-rate-limited') return reply(res, 429, { error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.' } });
      if (mode === 'server-error') return reply(res, 500, { error: { code: 'internal_error', message: 'Could not grade the submission' } });
      const body = JSON.parse(raw) as { session: string; code: string };
      const probe = byTask.get(body.session.replace('stub-session:', ''));
      if (!probe) return reply(res, 400, { error: { code: 'invalid_session', message: 'Coding session expired or invalid' } });
      if (mode === 'react-down' && probe.taskId.startsWith('react-')) {
        return reply(res, 200, verdict('error', { results: [], codeError: 'The React runner could not start, so this Submit was not recorded. Try again in a moment.' }));
      }
      return reply(res, 200, verdict(mode === 'lenient' || body.code === probe.reference ? 'passed' : 'failed'));
    });
    return;
  }
  reply(res, 405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });
});

function runScript(baseUrl: string, env: Record<string, string> = {}): Promise<{ code: number | null; out: string; err: string }> {
  // The script's default is production; every run here names the stub.
  assert.match(baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/, 'the test only ever points the script at 127.0.0.1');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI], {
      env: { ...process.env, GITHUB_ACTIONS: '', ...env, LIVE_GRADING_BASE_URL: baseUrl, LIVE_GRADING_RETRY_DELAY_MS: '20' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

async function scenario(name: Mode, baseUrl: string, env: Record<string, string> = {}) {
  mode = name;
  spent = false;
  return runScript(baseUrl, env);
}

async function checkScript() {
  await new Promise<void>((resolve) => stub.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
  try {
    const healthy = await scenario('healthy', base);
    assert.equal(healthy.code, 0, `a healthy grader passes the check\n${healthy.out}${healthy.err}`);
    assert.equal(healthy.out.match(/ {2}ok {2}/g)?.length, 4, 'four submits: a reference and a wrong solution for each task');
    assert.match(healthy.out, /reference solutions pass and wrong solutions fail/);

    const lenient = await scenario('lenient', base, { GITHUB_ACTIONS: 'true' });
    assert.equal(lenient.code, 1, 'a grader that passes wrong code fails the check');
    assert.match(lenient.err, /::error title=Live grading::JavaScript \(QuickJS worker\), js-double-numbers, wrong solution: graded "passed", expected "failed"/);
    assert.match(lenient.err, /react-counter, wrong solution: graded "passed", expected "failed"/);
    assert.match(lenient.err, /HTTP 200: \{"verdict":"passed"/, 'the message carries the body');

    const reactDown = await scenario('react-down', base);
    assert.equal(reactDown.code, 1, 'a React runner that is down fails the check');
    assert.match(reactDown.err, /React \(Vercel Sandbox\), react-counter, reference solution: graded "error", expected "passed" \(codeError: The React runner could not start/);
    assert.match(reactDown.out, /ok {2}JavaScript \(QuickJS worker\), js-double-numbers, reference solution: passed/, 'the JavaScript grader is still reported working');

    const serverError = await scenario('server-error', base);
    assert.equal(serverError.code, 1, 'an HTTP error fails the check');
    assert.match(serverError.err, /POST http:\/\/127\.0\.0\.1:\d+\/api\/quiz\/roadmap\?resource=coding-submit answered HTTP 500 without a verdict: \{"error":\{"code":"internal_error","message":"Could not grade the submission"\}\}/);

    const locked = await scenario('locked', base);
    assert.equal(locked.code, 1, 'a task that stops opening for visitors fails the check');
    assert.match(locked.err, /answered HTTP 200 without a coding session; locked: tier3/);

    const limitedOnce = await scenario('rate-limited-once', base);
    assert.equal(limitedOnce.code, 0, `one 429 is retried\n${limitedOnce.out}${limitedOnce.err}`);
    assert.match(limitedOnce.out, /answered 429; retrying once in 0 ms/);

    const limited = await scenario('always-rate-limited', base);
    assert.equal(limited.code, 1, 'a second 429 fails the check');
    assert.match(limited.err, /answered HTTP 429 without a verdict: \{"error":\{"code":"rate_limited"/);

    const dropped = await scenario('drop-once', base);
    assert.equal(dropped.code, 0, `one dropped connection is retried\n${dropped.out}${dropped.err}`);
    assert.match(dropped.out, /failed \(.+\); retrying once in 20 ms/);
  } finally {
    await new Promise<void>((resolve) => stub.close(() => resolve()));
  }

  // Nothing listening at all: both attempts fail and the check says so.
  const closed = createServer();
  await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
  const nowhere = `http://127.0.0.1:${(closed.address() as AddressInfo).port}`;
  await new Promise<void>((resolve) => closed.close(() => resolve()));
  const unreachable = await runScript(nowhere);
  assert.equal(unreachable.code, 1, 'an unreachable site fails the check');
  assert.match(unreachable.err, /GET http:\/\/127\.0\.0\.1:\d+\/api\/quiz\/roadmap\?resource=coding-task&id=js-double-numbers failed twice without an answer/);
}

async function main() {
  await checkProbes();
  await checkScript();
  console.log('Live grading monitor passed: its probes pass and fail the real graders as expected, and the script reports a healthy grader, wrong verdicts, a React runner that is down, HTTP errors, rate limits and dropped connections correctly.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
