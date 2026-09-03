/** Coding-challenge API resources. Mounted on the existing handlers to keep
 * the twelve-function budget: `api/quiz/roadmap.ts` serves coding-task,
 * coding-submit and coding-reveal; `api/user/[op].ts` serves
 * coding-progress and coding-draft. The server grades JavaScript and
 * TypeScript in the QuickJS sandbox and system design against the sealed key;
 * React verdicts come from the browser harness and are recorded as such. */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { AuthError, tryAuth } from '../auth';
import { isRpcMissing, jsonError, createLogger, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { secureShuffle } from '../quiz-runtime';
import { decodeCodingSession, encodeCodingSession, type CodingSession } from '../quiz-tokens';
import { CODING_SUMMARIES, codingTaskById, playable } from './catalog';
import { solutionFor } from './solutions';
import { runInSandbox } from './sandbox';
import { nodeTypeScriptChecker } from './ts-check-node';
import { codeOutcome, giveUpAfter, gradeDesign, ladderLength, prepareDesign } from './grade';
import { afterCodingPass } from '../github-garden';
import {
  CODING_TASK_XP,
  isCodingTaskId,
  tierLockReason,
  type CodingTask,
  type CodingTrack,
} from '../../shared/coding-catalog';
import type {
  CodingDraftResponse,
  CodingGardenStatus,
  CodingOutcome,
  CodingProgressResponse,
  CodingRevealRequest,
  CodingRevealResponse,
  CodingSubmitRequest,
  CodingTaskProgress,
  CodingTaskResponse,
  CodingVerdictResponse,
  DesignAnswer,
} from '../../shared/coding-api';
import type { EvaluateResult } from '../../shared/coding-evaluate';
import type { TypeCheckResult } from '../../shared/coding-ts-check';

const logEvent = createLogger('coding');
const MAX_CODE_BYTES = 20 * 1024;
const TRACKS: CodingTrack[] = ['javascript', 'typescript', 'react', 'system-design'];

const codingAvailable = () => deploymentSubjectIds().includes('webdev');
const notAvailable = (res: VercelResponse) => jsonError(res, 404, 'not_available', 'Coding challenges are not part of this product');

interface ProgressRow {
  task_id: string;
  track: string;
  status: CodingTaskProgress['status'];
  passes: number;
  review_stage: number;
  next_review_at: string | null;
  reveal_count: number;
  best_passed_at: string | null;
}
const PROGRESS_FIELDS = 'task_id,track,status,passes,review_stage,next_review_at,reveal_count,best_passed_at';

const toProgress = (row: ProgressRow): CodingTaskProgress => ({
  status: row.status,
  passes: Number(row.passes ?? 0),
  reviewStage: Number(row.review_stage ?? 0),
  nextReviewAt: row.next_review_at ?? null,
  revealCount: Number(row.reveal_count ?? 0),
  bestPassedAt: row.best_passed_at ?? null,
});

async function loadProgressRows(supabase: SupabaseClient, userId: string): Promise<ProgressRow[]> {
  const { data, error } = await withTimeout(supabase.from('coding_progress').select(PROGRESS_FIELDS).eq('user_id', userId));
  if (error) throw new Error('db_error');
  return (data ?? []) as ProgressRow[];
}

async function loadProgressRow(supabase: SupabaseClient, userId: string, taskId: string): Promise<CodingTaskProgress | null> {
  const { data, error } = await withTimeout(
    supabase.from('coding_progress').select(PROGRESS_FIELDS).eq('user_id', userId).eq('task_id', taskId).maybeSingle(),
  );
  if (error) throw new Error('db_error');
  return data ? toProgress(data as ProgressRow) : null;
}

/** Highest contiguous cleared `javascript` Learn level, from the roadmap blob. */
async function javascriptLevelsCleared(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await withTimeout(supabase.from('roadmap_progress').select('data').eq('user_id', userId).maybeSingle());
  if (error || !data?.data) return 0;
  const levels = ((data.data as Record<string, { levels?: Record<string, { passed?: boolean }> }>).javascript?.levels) ?? {};
  let cleared = 0;
  while (levels[String(cleared + 1)]?.passed === true) cleared++;
  return cleared;
}

async function optionalUser(req: VercelRequest, res: VercelResponse): Promise<string | null | undefined> {
  try {
    return (await tryAuth(req))?.sub ?? null;
  } catch (error) {
    if (error instanceof AuthError) {
      jsonError(res, error.status, error.code, error.message);
      return undefined;
    }
    throw error;
  }
}

function sessionFrom(raw: unknown): CodingSession | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 16_384) return null;
  return decodeCodingSession(raw);
}

const readLang = (value: unknown): 'en' | 'cs' => (value === 'cs' ? 'cs' : 'en');
const codeHash = (code: string) => createHash('sha256').update(code, 'utf8').digest('base64url').slice(0, 32);

/* ── GET ?resource=coding-task&id=… ──────────────────────────────────── */

export async function handleCodingTask(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;
  const id = req.query.id;
  if (!isCodingTaskId(id)) return jsonError(res, 400, 'bad_request', 'A task id is required');
  const task = codingTaskById(id);
  if (!task) return jsonError(res, 404, 'not_found', 'Unknown task');

  const userId = await optionalUser(req, res);
  if (userId === undefined) return;

  let progress: CodingTaskProgress | null = null;
  let draft: string | null = null;
  let locked: CodingTaskResponse['locked'] = null;
  if (userId && supabase) {
    try {
      const [rows, cleared, draftRow] = await Promise.all([
        loadProgressRows(supabase, userId),
        javascriptLevelsCleared(supabase, userId),
        withTimeout(supabase.from('coding_drafts').select('code').eq('user_id', userId).eq('task_id', task.id).maybeSingle()),
      ]);
      const passed = new Set(rows.filter((row) => row.status === 'passed').map((row) => row.task_id));
      const mine = rows.find((row) => row.task_id === task.id);
      progress = mine ? toProgress(mine) : null;
      draft = typeof draftRow.data?.code === 'string' ? draftRow.data.code : null;
      locked = tierLockReason({ track: task.track, tier: task.tier, progress: { passed }, tasks: CODING_SUMMARIES, javascriptLevelsCleared: cleared });
    } catch {
      return jsonError(res, 500, 'db_error', 'Could not load coding progress');
    }
  } else {
    // Anonymous visitors may open and run any task; tiers lock only what a
    // signed-in learner could otherwise record. Everything above tier 2 is
    // shown as locked so the ladder reads the same way for everyone.
    locked = tierLockReason({ track: task.track, tier: task.tier, progress: { passed: new Set() }, tasks: CODING_SUMMARIES, javascriptLevelsCleared: 0 });
  }

  const play = playable(task);
  let key: CodingSession['key'];
  if (task.track === 'system-design') {
    const prepared = prepareDesign(task, secureShuffle);
    key = prepared.key;
    if (prepared.design) {
      play.design = {
        scenario: prepared.design.scenario,
        brief: prepared.design.brief,
        passMark: prepared.design.passMark,
        steps: prepared.design.steps.map((step) => ({ key: step.key, title: step.title, prompt: step.prompt, options: step.options })),
      };
    }
    if (prepared.drill) {
      const { format, scenario, prompt, unit, options, steps } = prepared.drill;
      play.drill = { format, scenario, prompt, ...(unit ? { unit } : {}), ...(options ? { options } : {}), ...(steps ? { steps } : {}) };
    }
  }
  const session = locked ? null : encodeCodingSession({ taskId: task.id, track: task.track, userId, ...(key ? { key } : {}) });

  res.setHeader('Cache-Control', 'private, no-store');
  const body: CodingTaskResponse = { task: play, session, locked, progress, draft, signedIn: Boolean(userId) };
  return res.json(body);
}

/* ── grading ─────────────────────────────────────────────────────────── */

interface Graded {
  verdict: CodingOutcome;
  results: EvaluateResult['results'];
  hidden: { passed: number; total: number } | null;
  check: TypeCheckResult | null;
  logs: string[];
  codeError: string | null;
  design: CodingVerdictResponse['design'];
  designReference: CodingVerdictResponse['designReference'];
}

async function gradeCode(task: CodingTask, code: string): Promise<Graded> {
  const tests = task.tests ?? [];
  const solution = solutionFor(task.id);
  const hiddenTests = solution?.hiddenTests ?? [];
  let check: TypeCheckResult | null = null;
  let hiddenTypeFailures = 0;
  let hiddenTypeTotal = 0;
  let codeToRun = code;
  if (task.track === 'typescript') {
    const checker = nodeTypeScriptChecker();
    check = checker.check(code, task.typeTests ?? []);
    if (solution?.hiddenTypeTests?.length) {
      const hiddenCheck = checker.check(code, solution.hiddenTypeTests);
      hiddenTypeTotal = hiddenCheck.typeTests.length;
      hiddenTypeFailures = hiddenCheck.typeTests.filter((one) => !one.pass).length;
    }
    codeToRun = checker.toJavaScript(code);
  }
  const run = await runInSandbox({
    code: codeToRun,
    calls: [...tests.map((t) => t.call), ...hiddenTests.map((t) => t.call)],
    expectations: [...tests.map((t) => t.expected), ...hiddenTests.map((t) => t.expected)],
  });
  const visible: EvaluateResult = { results: run.results.slice(0, tests.length), logs: run.logs, codeError: run.codeError, timedOut: run.timedOut };
  const hiddenRun: EvaluateResult | null = hiddenTests.length > 0
    ? { results: run.results.slice(tests.length), logs: [], codeError: run.codeError, timedOut: run.timedOut }
    : null;
  let verdict = codeOutcome({ visible, hidden: hiddenRun, check });
  if (verdict === 'passed' && hiddenTypeFailures > 0) verdict = 'failed';
  const hiddenPassed = (hiddenRun?.results.filter((r) => r.pass === true).length ?? 0) + (hiddenTypeTotal - hiddenTypeFailures);
  const hiddenTotal = hiddenTests.length + hiddenTypeTotal;
  return {
    verdict,
    results: visible.results,
    hidden: hiddenTotal > 0 ? { passed: hiddenPassed, total: hiddenTotal } : null,
    check,
    logs: run.logs,
    codeError: run.codeError,
    design: null,
    designReference: null,
  };
}

/**
 * React tasks: render the component and run the task's Testing Library suite
 * under jsdom. A task with no suite (`verify: 'checklist'`) has nothing to
 * assert, so the learner's own confirmation stands; everything else is decided
 * here from the code alone.
 */
async function gradeReact(task: CodingTask, code: string): Promise<Graded> {
  if (task.verify === 'checklist' || !task.suite) {
    return { verdict: 'passed', results: [], hidden: null, check: null, logs: [], codeError: null, design: null, designReference: null };
  }
  const { runReactSuite } = await import('./react-runner');
  let run;
  try {
    run = await runReactSuite({ suite: task.suite, appSource: code });
  } catch (error) {
    // The runtime itself could not start; that is ours, not the learner's.
    logEvent({ status: 500, kind: 'react_runtime', reason: error instanceof Error ? error.message : 'unknown' });
    return {
      verdict: 'error', results: [], hidden: null, check: null, logs: [],
      codeError: 'The React runner could not start. Try again in a moment.',
      design: null, designReference: null,
    };
  }
  const results = run.cases.map((one) => ({ pass: one.status === 'pass', actual: null, error: one.error }));
  const verdict: CodingOutcome = run.compileError
    ? 'error'
    : run.timedOut
      ? 'timeout'
      : run.failed === 0 && run.total > 0 ? 'passed' : 'failed';
  return {
    verdict,
    results,
    hidden: null,
    check: null,
    logs: [],
    codeError: run.compileError,
    design: null,
    designReference: null,
  };
}

function gradeDesignTask(task: CodingTask, session: CodingSession, answers: DesignAnswer[] | undefined): Graded {
  const graded = gradeDesign(task, session.key ?? {}, answers);
  return {
    verdict: graded.outcome,
    results: [],
    hidden: null,
    check: null,
    logs: [],
    codeError: null,
    design: graded.verdicts,
    designReference: graded.reference,
  };
}

interface RecordInput {
  supabase: SupabaseClient;
  userId: string;
  task: CodingTask;
  session: CodingSession;
  verdict: CodingOutcome;
  verified: boolean;
  code: string | null;
  runCount?: number;
  hintsUsed?: number;
  durationMs?: number;
}

interface Recorded {
  progress: CodingTaskProgress | null;
  firstPass: boolean;
  xpAwarded: number;
  applied: boolean;
  codeChanged: boolean;
}

const clampInt = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;

async function recordVerdict(input: RecordInput, res: VercelResponse): Promise<Recorded | null> {
  const { supabase, userId, task, session } = input;
  // A coding task inside a Learn level links to the level attempt; the row
  // exists once the first question was answered. Without it the verdict is
  // still recorded, only unlinked.
  let roadmapAttemptId: string | null = null;
  if (session.roadmapAttemptId) {
    const attempt = await withTimeout(supabase.from('roadmap_attempts').select('attempt_id').eq('attempt_id', session.roadmapAttemptId).maybeSingle());
    if (!attempt.error && attempt.data) roadmapAttemptId = session.roadmapAttemptId;
  }
  const saved = await withTimeout(
    supabase.rpc('record_coding_verdict', {
      p_user_id: userId,
      p_attempt_id: session.attemptId,
      p_task_id: task.id,
      p_track: task.track,
      p_outcome: input.verdict,
      p_verified: input.verified,
      p_xp: CODING_TASK_XP[task.tier],
      p_subject: 'webdev',
      p_roadmap_attempt_id: roadmapAttemptId,
      p_duration_ms: clampInt(input.durationMs, 86_400_000),
      p_run_count: clampInt(input.runCount, 10_000),
      p_hints_used: clampInt(input.hintsUsed, 20) ?? 0,
      p_code_hash: input.code ? codeHash(input.code) : null,
    }),
  );
  if (saved.error) {
    if (isRpcMissing(saved.error)) {
      jsonError(res, 503, 'migration_required', 'Coding progress migration 025 is not installed');
      return null;
    }
    jsonError(res, 500, 'db_error', 'Could not record the verdict');
    return null;
  }
  const data = (saved.data ?? {}) as { applied?: boolean; firstPass?: boolean; xpAwarded?: boolean; codeChanged?: boolean };
  const progress = await loadProgressRow(supabase, userId, task.id);
  return {
    progress,
    firstPass: data.firstPass === true,
    xpAwarded: data.xpAwarded === true ? CODING_TASK_XP[task.tier] : 0,
    applied: data.applied === true,
    codeChanged: data.codeChanged === true,
  };
}

function verdictBody(graded: Graded, recorded: Recorded | null, github: CodingGardenStatus | null): CodingVerdictResponse {
  return {
    verdict: graded.verdict,
    results: graded.results,
    hidden: graded.hidden,
    check: graded.check,
    logs: graded.logs,
    codeError: graded.codeError,
    design: graded.design,
    designReference: graded.designReference,
    progress: recorded?.progress ?? null,
    firstPass: recorded?.firstPass ?? false,
    xpAwarded: recorded?.xpAwarded ?? 0,
    applied: recorded?.applied ?? false,
    github,
  };
}

/* ── POST ?resource=coding-submit ────────────────────────────────────── */

export async function handleCodingSubmit(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.codingRun))) return;
  const body = (req.body || {}) as Partial<CodingSubmitRequest> & { lang?: unknown };
  const session = sessionFrom(body.session);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Coding session expired or invalid');
  const task = codingTaskById(session.taskId);
  if (!task || task.track !== session.track) return jsonError(res, 400, 'invalid_session', 'Coding session does not match a task');
  const userId = await optionalUser(req, res);
  if (userId === undefined) return;

  let graded: Graded;
  let code: string | null = null;
  if (task.track === 'system-design') {
    if (!Array.isArray(body.answers) || body.answers.length > 12) return jsonError(res, 400, 'bad_request', 'answers must be an array');
    graded = gradeDesignTask(task, session, body.answers);
  } else {
    if (typeof body.code !== 'string' || body.code.length === 0) return jsonError(res, 400, 'bad_request', 'code is required');
    if (Buffer.byteLength(body.code, 'utf8') > MAX_CODE_BYTES) return jsonError(res, 413, 'too_large', 'Code is limited to 20 kB');
    code = body.code;
    graded = task.track === 'react' ? await gradeReact(task, code) : await gradeCode(task, code);
  }

  let recorded: Recorded | null = null;
  let github: CodingGardenStatus | null = null;
  if (userId) {
    if (!supabase) return jsonError(res, 503, 'not_configured', 'Coding progress is not configured');
    recorded = await recordVerdict({ supabase, userId, task, session, verdict: graded.verdict, verified: true, code, runCount: body.runCount, hintsUsed: body.hintsUsed, durationMs: body.durationMs }, res);
    if (!recorded) return;
    if (graded.verdict === 'passed' && recorded.applied) {
      github = await afterCodingPass(supabase, {
        userId,
        task,
        code: code ?? '',
        passedCount: graded.results.filter((r) => r.pass === true).length + (graded.hidden?.passed ?? 0),
        totalCount: graded.results.length + (graded.hidden?.total ?? 0),
        locale: readLang(body.lang),
        firstPass: recorded.firstPass,
        codeChanged: recorded.codeChanged,
      });
    }
  }
  logEvent({ status: 200, kind: 'submit', track: task.track, verdict: graded.verdict, hasUser: Boolean(userId) });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json(verdictBody(graded, recorded, github));
}

/* ── POST ?resource=coding-reveal ────────────────────────────────────── */

export async function handleCodingReveal(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.codingReveal))) return;
  const body = (req.body || {}) as Partial<CodingRevealRequest>;
  const session = sessionFrom(body.session);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Coding session expired or invalid');
  const task = codingTaskById(session.taskId);
  if (!task) return jsonError(res, 400, 'invalid_session', 'Coding session does not match a task');
  const hintsUsed = clampInt(body.hintsUsed, 20) ?? 0;
  const userId = await optionalUser(req, res);
  if (userId === undefined) return;

  let progress: CodingTaskProgress | null = null;
  if (userId && supabase) {
    try { progress = await loadProgressRow(supabase, userId, task.id); } catch { return jsonError(res, 500, 'db_error', 'Could not load coding progress'); }
  }
  const allowed = progress?.status === 'passed' || hintsUsed >= giveUpAfter(ladderLength(task));
  if (!allowed) return jsonError(res, 403, 'reveal_locked', 'Take more of the hint ladder before revealing the solution');

  if (userId && supabase && progress?.status !== 'passed') {
    const marked = await withTimeout(supabase.rpc('record_coding_reveal', {
      p_user_id: userId, p_task_id: task.id, p_track: task.track, p_roadmap_attempt_id: session.roadmapAttemptId ?? null,
    }));
    if (marked.error) {
      if (isRpcMissing(marked.error)) return jsonError(res, 503, 'migration_required', 'Coding progress migration 025 is not installed');
      return jsonError(res, 500, 'db_error', 'Could not record the reveal');
    }
    try { progress = await loadProgressRow(supabase, userId, task.id); } catch { /* the reveal itself succeeded */ }
  }
  const solution = solutionFor(task.id)?.solution ?? '';
  const reference = task.design?.reference ?? task.drill?.explanation ?? null;
  logEvent({ status: 200, kind: 'reveal', track: task.track, hasUser: Boolean(userId) });
  res.setHeader('Cache-Control', 'private, no-store');
  const out: CodingRevealResponse = { solution, reference, progress };
  return res.json(out);
}

/* ── GET ?op=coding-progress ─────────────────────────────────────────── */

export async function handleCodingProgress(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!codingAvailable()) return notAvailable(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  try {
    const [rows, cleared] = await Promise.all([loadProgressRows(supabase, userId), javascriptLevelsCleared(supabase, userId)]);
    const now = Date.now();
    const tasks: Record<string, CodingTaskProgress> = {};
    const passedByTrack = Object.fromEntries(TRACKS.map((track) => [track, 0])) as Record<CodingTrack, number>;
    for (const row of rows) {
      tasks[row.task_id] = toProgress(row);
      if (row.status === 'passed' && TRACKS.includes(row.track as CodingTrack)) passedByTrack[row.track as CodingTrack] += 1;
    }
    const due = rows
      .filter((row) => row.status === 'passed' && row.next_review_at && Date.parse(row.next_review_at) <= now)
      .sort((a, b) => Date.parse(a.next_review_at!) - Date.parse(b.next_review_at!))
      .map((row) => row.task_id);
    res.setHeader('Cache-Control', 'private, no-store');
    const out: CodingProgressResponse = { tasks, due, javascriptLevelsCleared: cleared, passedByTrack };
    return res.json(out);
  } catch {
    return jsonError(res, 500, 'db_error', 'Could not load coding progress');
  }
}

/* ── GET/POST ?op=coding-draft&id=… ──────────────────────────────────── */

export async function handleCodingDraft(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!codingAvailable()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  const id = req.method === 'GET' ? req.query.id : (req.body as { id?: unknown } | undefined)?.id;
  if (!isCodingTaskId(id) || !codingTaskById(id)) return jsonError(res, 400, 'bad_request', 'A task id is required');
  if (req.method === 'GET') {
    const { data, error } = await withTimeout(supabase.from('coding_drafts').select('code,updated_at').eq('user_id', userId).eq('task_id', id).maybeSingle());
    if (error) return jsonError(res, 500, 'db_error', 'Could not load the draft');
    res.setHeader('Cache-Control', 'private, no-store');
    const out: CodingDraftResponse = { code: typeof data?.code === 'string' ? data.code : null, updatedAt: data?.updated_at ?? null };
    return res.json(out);
  }
  if (req.method === 'POST') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.codingDraft))) return;
    const code = (req.body as { code?: unknown })?.code;
    if (typeof code !== 'string' || Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) return jsonError(res, 400, 'bad_request', 'code is required and limited to 20 kB');
    const saved = await withTimeout(supabase.rpc('save_coding_draft', { p_user_id: userId, p_task_id: id, p_code: code }));
    if (saved.error) {
      if (isRpcMissing(saved.error)) return jsonError(res, 503, 'migration_required', 'Coding progress migration 025 is not installed');
      return jsonError(res, 500, 'db_error', 'Could not save the draft');
    }
    return res.json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}
