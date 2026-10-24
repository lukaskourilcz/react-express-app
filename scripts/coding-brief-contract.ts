// The task brief apart from the caller's part (#587 C23, inventory F07):
// GET /api/quiz/roadmap?resource=coding-brief&id= and ?resource=coding-state&id=.
//
// A task page used to read one answer, the brief together with the caller's
// sealed session, lock, progress and draft, so every visit paid the token
// check and the progress and draft reads for content that is the same for
// everyone, and the brief could not be cached. The brief is now a public read
// the CDN shares, and the caller's part a read of its own with every limit and
// gate of `coding-task`, which still answers both together for the Learn link
// and for Premium tasks. Run from scripts/test-launch-contracts.ts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import roadmapHandler from '../api/quiz/roadmap';
import { CODING_BRIEF_CACHE } from '../lib/coding/handlers';
import { CODING_TASKS } from '../lib/coding/catalog';
import { codingTaskById } from '../lib/coding/active';
import { solutionFor } from '../lib/coding/solutions';
import { CODING_INDEX } from '../shared/coding-index';
import { EVOLVING_CHALLENGES } from '../shared/evolving';
import { codingContent, isFreeCodingTask, PREMIUM_REQUIRED } from '../shared/tiers';
import type { CodingBriefResponse, CodingTaskResponse, CodingTaskStateResponse } from '../shared/coding-api';
import { joinCodingTaskRead } from '../shared/coding-task-read';

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), String(value)); },
    getHeader(name: string) { return headers.get(name.toLowerCase()); },
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    end() { return this; },
    headers,
  };
}

// Each request comes from an address of its own, so no bucket fills up.
let addresses = 0;
const nextAddress = () => { addresses += 1; return `198.18.${200 + (addresses >> 8)}.${addresses & 255}`; };

type As = { as: 'guest' } | { as: 'account'; id: string };
const GUEST: As = { as: 'guest' };
const account = (id: string): As => ({ as: 'account', id });

async function ask(resource: string, id: string | undefined, who: As = GUEST, method = 'GET') {
  const res = mockResponse();
  await roadmapHandler({
    method,
    headers: { 'x-forwarded-for': nextAddress(), ...(who.as === 'account' ? { authorization: 'Bearer contract' } : {}) },
    query: { resource, ...(id === undefined ? {} : { id }), ...(who.as === 'account' ? { user_id: who.id } : {}) },
    url: '/api/quiz/roadmap',
    socket: {},
  } as never, res as never);
  return res;
}
const errorOf = (res: ReturnType<typeof mockResponse>) => (res.body as { error?: { code?: string; kind?: string; ref?: string } } | undefined)?.error;

/** What of a task answer one request deals at random: the session and the
 * puzzle lines' order and ids. Everything else must match exactly. */
function settled(body: CodingTaskResponse) {
  const { puzzle, ...task } = body.task;
  return {
    ...body,
    session: body.session === null ? null : 'sealed',
    task: { ...task, ...(puzzle ? { puzzle: { ...puzzle, lines: puzzle.lines.map((line) => line.code).sort() } } : {}) },
  };
}

/** Keys an answer, a key or the caller's state would travel under. */
const FORBIDDEN_KEYS = ['solution', 'junior', 'senior', 'boardPlan', 'hiddenTests', 'hiddenTypeTests', 'hiddenSuite', 'key', 'accepted', 'map',
  'session', 'puzzle', 'design', 'drill', 'draft', 'draftUpdatedAt', 'progress', 'locked', 'signedIn', 'userId'];
function keysOf(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const one of value) keysOf(one, into);
  else if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) { into.add(key); keysOf(inner, into); }
  return into;
}

export async function codingBriefContracts() {
  // ── placement: in the coding block, beside the combined read ───────────
  const route = readFileSync(join(process.cwd(), 'api/quiz/roadmap.ts'), 'utf8');
  const combined = route.indexOf("if (resource === 'coding-task' && (req.method === 'GET' || req.method === 'POST')) return await handleCodingTask(req, res, supabase);");
  const briefLine = route.indexOf("if (resource === 'coding-brief' && req.method === 'GET') return await handleCodingBrief(req, res);");
  const stateLine = route.indexOf("if (resource === 'coding-state' && req.method === 'GET') return await handleCodingState(req, res, supabase);");
  assert.ok(combined > 0 && briefLine > combined && stateLine > briefLine, 'the brief and state reads sit in the coding block, after the combined read');
  assert.ok(stateLine < route.indexOf("if (resource.startsWith('learning-path-')) {"), 'before the learning-path block');
  // The brief takes no supabase client: it cannot read a row.
  const handlers = readFileSync(join(process.cwd(), 'lib/coding/handlers.ts'), 'utf8');
  const briefSource = handlers.slice(handlers.indexOf('export async function handleCodingBrief('), handlers.indexOf('interface OpenedTask {'));
  assert.ok(briefSource.startsWith('export async function handleCodingBrief(req: VercelRequest, res: VercelResponse) {'), 'the brief handler takes no database client');
  for (const reader of ['optionalUser', 'tryAuthOnce', 'verifiedCallerId', 'requireAuthSub', 'enforceClassRateLimit', 'supabase']) {
    assert.equal(briefSource.includes(reader), false, `the brief handler never reads the caller (${reader})`);
  }
  assert.match(CODING_BRIEF_CACHE, /^public, max-age=\d+, s-maxage=\d+, stale-while-revalidate=\d+$/, 'the brief is cached publicly, by browsers and the CDN');

  // ── every free task: the brief, its headers, and nothing of an answer ──
  // The browser reads a brief for exactly the tasks the index marks free
  // (client/src/coding/taskRead.ts); the flag is the tier rule's projection.
  for (const task of CODING_INDEX) assert.equal(task.free === true, isFreeCodingTask(task.id), `${task.id}: the index's free flag is the tier rule's`);
  const freeTasks = CODING_INDEX.filter((task) => task.free && codingTaskById(task.id));
  assert.ok(freeTasks.length > 100, `the free tier opens the starter set (${freeTasks.length})`);
  for (const summary of freeTasks) {
    const brief = await ask('coding-brief', summary.id);
    assert.equal(brief.statusCode, 200, `${summary.id}: the brief opens to anyone (${JSON.stringify(brief.body)})`);
    assert.equal(brief.getHeader('cache-control'), CODING_BRIEF_CACHE, `${summary.id}: the brief carries the public cache header`);
    const body = brief.body as CodingBriefResponse;
    assert.deepEqual(Object.keys(body).sort(), ['task', 'version'], `${summary.id}: the brief is the task and its version`);
    assert.equal(body.task.id, summary.id);
    assert.equal(body.version, body.task.review?.version, `${summary.id}: the version is the brief's public content version`);
    const keys = keysOf(body);
    for (const key of FORBIDDEN_KEYS) assert.equal(keys.has(key), false, `${summary.id}: the brief carries no ${key}`);
    const text = JSON.stringify(body);
    const solution = solutionFor(summary.id);
    for (const secret of [solution?.solution, solution?.junior, solution?.senior, solution?.hiddenSuite]) {
      if (secret && secret.trim().length > 24) assert.equal(text.includes(JSON.stringify(secret).slice(1, -1)), false, `${summary.id}: the brief carries no reference code or hidden suite`);
    }
    // The tests it carries are the visible ones as authored, never a hidden
    // one added: hidden tests stay with the reference solution on the server.
    const authored = codingTaskById(summary.id)!;
    assert.deepEqual(body.task.tests, authored.tests, `${summary.id}: only the visible tests`);
    assert.deepEqual(body.task.typeTests, authored.typeTests, `${summary.id}: only the visible type tests`);
    assert.equal(body.task.suite, authored.suite, `${summary.id}: only the visible suite`);
  }

  // ── the brief is the same for every caller: a token changes nothing ────
  const freeTask = freeTasks.find((task) => task.track === 'javascript')!;
  const asGuest = await ask('coding-brief', freeTask.id);
  const asAccount = await ask('coding-brief', freeTask.id, account('contract-brief-reader'));
  assert.equal(asAccount.statusCode, 200);
  assert.deepEqual(asAccount.body, asGuest.body, 'a signed-in caller gets the guest\'s brief, byte for byte');
  assert.equal(asAccount.getHeader('cache-control'), CODING_BRIEF_CACHE);

  // ── Premium content: exactly as public as the guest's task page ────────
  const lockedTask = CODING_INDEX.find((task) => task.track === 'javascript' && !task.free && !codingContent(task.id).kind.startsWith('evolving'))!;
  const stageTwo = EVOLVING_CHALLENGES[0].stages[1];
  for (const [id, kind, ref] of [[lockedTask.id, 'coding-task', lockedTask.id], [stageTwo, 'evolving-stage', `${EVOLVING_CHALLENGES[0].id}:2`]] as const) {
    const guestPage = await ask('coding-task', id);
    assert.equal(guestPage.statusCode, 402, `${id}: a guest's task page is refused, as before`);
    for (const who of [GUEST, account('contract-brief-premium')]) {
      const brief = await ask('coding-brief', id, who);
      assert.equal(brief.statusCode, 402, `${id}: the brief of Premium content is refused (${who.as})`);
      assert.deepEqual({ code: errorOf(brief)?.code, kind: errorOf(brief)?.kind, ref: errorOf(brief)?.ref }, { code: PREMIUM_REQUIRED, kind, ref }, `${id}: with the guest's 402`);
      assert.deepEqual({ ...(brief.body as object), error: { ...errorOf(brief), requestId: null } }, { ...(guestPage.body as object), error: { ...errorOf(guestPage), requestId: null } }, `${id}: word for word what the guest's task page answers`);
      assert.notEqual(brief.getHeader('cache-control'), CODING_BRIEF_CACHE, `${id}: a refusal is not cached publicly`);
      assert.doesNotMatch(String(brief.getHeader('cache-control')), /public/);
    }
  }
  assert.equal(isFreeCodingTask(lockedTask.id), false);

  // ── unknown, malformed, missing and retired ids answer as the task page ─
  const retired = CODING_TASKS.find((task) => !codingTaskById(task.id) && task.track !== 'system-design');
  const hidden = CODING_TASKS.find((task) => task.track === 'system-design')!;
  for (const id of ['js-no-such-task', 'NOT A TASK', hidden.id, undefined, ...(retired ? [retired.id] : [])]) {
    const page = await ask('coding-task', id);
    for (const resource of ['coding-brief', 'coding-state']) {
      const read = await ask(resource, id);
      assert.equal(read.statusCode, page.statusCode, `${resource} ${id}: ${page.statusCode} as the task page`);
      assert.equal(errorOf(read)?.code, errorOf(page)?.code, `${resource} ${id}: ${errorOf(page)?.code}`);
    }
  }
  for (const resource of ['coding-brief', 'coding-state']) {
    const posted = await ask(resource, freeTask.id, GUEST, 'POST');
    assert.equal(posted.statusCode, 405, `${resource} is a GET`);
    assert.equal(posted.getHeader('allow'), 'GET');
  }

  // ── the caller's part keeps every gate of the task page ────────────────
  for (const [id, label] of [[lockedTask.id, 'a Premium task'], [stageTwo, 'stage two of a project']] as const) {
    for (const who of [GUEST, account('contract-state-free')]) {
      const page = await ask('coding-task', id, who);
      const state = await ask('coding-state', id, who);
      assert.equal(page.statusCode, 402, `${label}: the task page refuses a free ${who.as}`);
      assert.equal(state.statusCode, 402, `${label}: so does the state read (${who.as})`);
      assert.deepEqual({ code: errorOf(state)?.code, kind: errorOf(state)?.kind, ref: errorOf(state)?.ref }, { code: errorOf(page)?.code, kind: errorOf(page)?.kind, ref: errorOf(page)?.ref });
    }
  }
  // A signed-in read is the account's: private, and its lock is the ladder's.
  const milestone = await ask('coding-state', 'js-evolving-calculator-1', account('contract-state-ladder'));
  assert.equal(milestone.statusCode, 200, JSON.stringify(milestone.body));
  assert.equal((milestone.body as CodingTaskStateResponse).locked, 'evolving', 'stages still unlock in order');
  assert.equal((milestone.body as CodingTaskStateResponse).session, null, 'and a held stage seals no session');
  assert.equal(milestone.getHeader('cache-control'), 'private, no-store');
  assert.equal((milestone.body as CodingTaskStateResponse).signedIn, true);

  // ── a guest gets what it got before, and so does an account ────────────
  const puzzleTask = CODING_TASKS.find((task) => task.id === 'js-reverse-string')!;
  const samples = [freeTask.id, puzzleTask.id, EVOLVING_CHALLENGES[0].stages[0],
    ...['typescript', 'react', 'algorithms'].map((track) => freeTasks.find((task) => task.track === track)!.id)];
  for (const id of samples) {
    for (const who of [GUEST, account(`contract-join-${id}`)]) {
      const page = await ask('coding-task', id, who);
      const brief = await ask('coding-brief', id, who);
      const state = await ask('coding-state', id, who);
      assert.equal(page.statusCode, 200, `${id}: the task page opens (${who.as})`);
      assert.equal(state.statusCode, 200, `${id}: the state read opens (${who.as})`);
      assert.equal(state.getHeader('cache-control'), 'private, no-store', `${id}: the state read is private`);
      const stateBody = state.body as CodingTaskStateResponse;
      assert.equal('task' in stateBody, false, `${id}: the state read carries no brief`);
      assert.equal(stateBody.briefVersion, (brief.body as CodingBriefResponse).version, `${id}: the state names the brief it was sealed against`);
      assert.deepEqual(settled(joinCodingTaskRead(brief.body as CodingBriefResponse, stateBody)), settled(page.body as CodingTaskResponse),
        `${id}: brief and state together are the task page's answer (${who.as})`);
      assert.ok(stateBody.session, `${id}: the state read seals a session`);
    }
  }
  const dealt = (await ask('coding-state', puzzleTask.id)).body as CodingTaskStateResponse;
  assert.ok(dealt.dealt.puzzle && dealt.dealt.puzzle.lines.length > 1, 'the puzzle travels with the session that keys it');

  console.log(`PASS coding brief: ${freeTasks.length} free briefs are public and cached and carry no answer; Premium briefs are refused as a guest's task page; the state read keeps every gate; brief and state make the task page's answer`);
}
