/** Coding-challenge API resources. Mounted on the existing handlers to keep
 * the twelve-function budget: `api/quiz/roadmap.ts` serves coding-task,
 * coding-submit and coding-reveal; `api/user/[op].ts` serves
 * coding-progress and coding-draft. The server grades JavaScript and
 * TypeScript in the QuickJS sandbox and system design against the sealed key;
 * React submissions run authoritative suites in isolated server-side VMs. */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { AuthError } from '../auth';
import { isRpcMissing, jsonError, createLogger, requireAuthSub, tryAuthOnce, withTimeout } from '../http';
import { claimOnce, enforceClassRateLimit, enterInFlight, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { secureShuffle } from '../quiz-runtime';
import { decodeCodingSession, encodeCodingSession, type CodingSession } from '../quiz-tokens';
import { codingTaskForHistory, englishOnly, playable } from './catalog';
import { CODING_SUMMARIES, codingTaskById, isHiddenCodingTask } from './active';
import { codingTaskReview } from '../curation';
import { solutionFor } from './solutions';
import { splitHiddenCases, withHiddenCases } from './react-hidden';
import { runChecks } from './sandbox';
import { checkTypes, TRANSPILE_FAILED_MESSAGE, TYPE_CHECK_STOPPED_MESSAGE } from './ts-check-pool';
import { GRADING_PER_CALLER, GraderBusyError } from './grader-capacity';
import { codeOutcome, giveUpAfter, gradeDesign, ladderLength, prepareDesign } from './grade';
import { classifyFailure, failureHint, isSyntaxError, jsonKind } from '../../shared/coding-failure';
import { afterCodingPass } from '../github-garden';
import { approachesFor } from './approaches';
import { evolvingPassed, evolvingStage, evolvingUnlocked } from '../../shared/evolving';
import { codingContent, type GatedContent } from '../../shared/tiers';
import { refuseLocked } from '../access';
import { codingAwardId, creditVerifiedXp, settleMilestones } from '../rewards/coins';
import { prepareEvolvingDraft } from '../../shared/coding-fullstack-support';
import { presentPuzzle, puzzleFor, resolvePuzzleOrder } from './puzzles';
import { isAcceptedOrder, isCompleteOrder, PUZZLE_MAX_LINES } from '../../shared/coding-puzzle';
import {
  CODING_TASK_XP,
  CODING_TRACKS,
  isCodingTaskId,
  tierLockReason,
  type CodingTask,
  type CodingTrack,
} from '../../shared/coding-catalog';
import { CODING_CODE_LIMIT_BYTES } from '../../shared/coding-api';
import type {
  CodingDraftResponse,
  CodingDraftSaveRequest,
  CodingDraftSaveResponse,
  CodingGardenStatus,
  CodingOutcome,
  CodingProgressResponse,
  CodingRevealRequest,
  CodingRevealResponse,
  CodingSubmitRequest,
  CodingTaskProgress,
  CodingTaskResponse,
  CodingApproachesResponse,
  CodingSolutionPair,
  CodingVerdictResponse,
  DesignAnswer,
} from '../../shared/coding-api';
import type { EvaluateResult } from '../../shared/coding-evaluate';
import type { TypeCheckResult } from '../../shared/coding-ts-check';

const logEvent = createLogger('coding');
const MAX_CODE_BYTES = CODING_CODE_LIMIT_BYTES;

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
  // Completion is permanent. Legacy scheduling columns are no longer read.
  nextReviewAt: null,
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

/** Highest contiguous cleared `javascript` Learn level, from the roadmap blob.
 * Clearing the Learn foundations opens JavaScript tier 3 (`tierUnlocked`). */
export async function javascriptLevelsCleared(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await withTimeout(supabase.from('roadmap_progress').select('data').eq('user_id', userId).maybeSingle());
  if (error || !data?.data) return 0;
  const levels = ((data.data as Record<string, { levels?: Record<string, { passed?: boolean }> }>).javascript?.levels) ?? {};
  let cleared = 0;
  while (levels[String(cleared + 1)]?.passed === true) cleared++;
  return cleared;
}

async function optionalUser(req: VercelRequest, res: VercelResponse): Promise<string | null | undefined> {
  try {
    return (await tryAuthOnce(req))?.sub ?? null;
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

/** What a coding session starts, for the tier gate. A task issued inside a
 * Learn level (its session names the level attempt) belongs to that level,
 * which the level seal already checked; any other task is itself, or the
 * evolving stage it is. */
function codingSessionContent(task: CodingTask, session: CodingSession): GatedContent {
  return session.roadmapAttemptId && task.level > 0
    ? { kind: 'learn-level', topic: task.topic, level: task.level }
    : codingContent(task.id);
}

/** Whether the learner already passed a task (or the milestone that covers an
 * evolving start stage): cleared content stays open for review on any tier. */
async function taskCleared(supabase: SupabaseClient | null, userId: string, taskId: string): Promise<boolean> {
  if (!supabase) return false;
  const ids = taskId.endsWith('-start') ? [taskId, taskId.slice(0, -6)] : [taskId];
  const { data, error } = await withTimeout(
    supabase.from('coding_progress').select('task_id,status').eq('user_id', userId).in('task_id', ids),
  );
  if (error) return false;
  const passed = new Set(((data ?? []) as { task_id: string; status: string }[]).filter((row) => row.status === 'passed').map((row) => row.task_id));
  return evolvingPassed(taskId, passed);
}

/** How long a design session's single check is remembered: its whole life
 * (a coding session lasts three hours, lib/quiz-tokens.ts). */
const DESIGN_SESSION_TTL_S = 3 * 60 * 60;
const readLang = (value: unknown): 'en' | 'cs' => (value === 'cs' ? 'cs' : 'en');
const codeHash = (code: string) => createHash('sha256').update(code, 'utf8').digest('base64url').slice(0, 32);

/**
 * The verdict log's key for one graded submission.
 *
 * `record_coding_verdict` applies an attempt id once and reports every later
 * call with it as a replay. A workbench keeps one session for its whole life,
 * so the session's id alone recorded only the first Submit: fail, fix, pass
 * and the pass was never written — no completion, no XP, no Learn level. The
 * key is therefore the session plus what was graded, the code and the verdict
 * it earned: a retried request for the same submission stays a replay, and a
 * changed one is recorded. XP stays once per task and account either way; its
 * award id names the task, not the attempt.
 *
 * A system-design session keeps one graded verdict. A passing verdict returns
 * the key it was sealed with, so a second submission from the same session
 * could be answered from that key; it is reported and never applied. A failed
 * verdict returns no key (see `gradeDesign`), and a new attempt takes a new
 * session, with the options shuffled again.
 */
function submissionAttemptId(session: CodingSession, verdict: CodingOutcome, code: string | null): string {
  if (code === null) return session.attemptId;
  const graded = createHash('sha256').update(`${verdict}\n${code}`, 'utf8').digest('base64url').slice(0, 32);
  return `${session.attemptId}:${graded}`;
}

/* ── GET ?resource=coding-task&id=… ──────────────────────────────────── */

export async function handleCodingTask(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (!(await enforceClassRateLimit(req, res, RATE_LIMITS.codingTaskAddress, RATE_LIMITS.codingTask))) return;
  const id = req.query.id;
  if (typeof id !== 'string' || !id) return jsonError(res, 400, 'bad_request', 'A task id is required');
  // An id no task could have (`/coding/javascript/no-such-task`) is as
  // unknown as one that fits the pattern, and gets the same answer: the
  // browser shows its not-found page for a 404 and does not ask again.
  if (!isCodingTaskId(id)) return jsonError(res, 404, 'not_found', 'Unknown task');
  const task = codingTaskById(id);
  if (!task) {
    // A task that exists but is withheld by the content gate is told apart
    // from an unknown id, so a stale bookmark gets an honest answer rather
    // than a "not found" it will keep retrying. A task on a hidden track
    // (system design) is answered as unknown: nothing of it is reachable.
    const authored = codingTaskForHistory(id);
    if (authored && !isHiddenCodingTask(authored)) return jsonError(res, 410, 'task_retired', 'This challenge was retired from the active catalogue');
    return jsonError(res, 404, 'not_found', 'Unknown task');
  }

  const userId = await optionalUser(req, res);
  if (userId === undefined) return;

  let progress: CodingTaskProgress | null = null;
  let draft: string | null = null;
  let draftUpdatedAt: string | null = null;
  let locked: CodingTaskResponse['locked'] = null;
  let passedIds: ReadonlySet<string> = new Set();
  if (userId && supabase) {
    try {
      const [rows, cleared, draftRow] = await Promise.all([
        loadProgressRows(supabase, userId),
        javascriptLevelsCleared(supabase, userId),
        withTimeout(supabase.from('coding_drafts').select('code,updated_at').eq('user_id', userId).eq('task_id', task.id).maybeSingle()),
      ]);
      const passed = new Set(rows.filter((row) => row.status === 'passed').map((row) => row.task_id));
      passedIds = passed;
      const mine = rows.find((row) => row.task_id === task.id);
      progress = mine ? toProgress(mine) : null;
      draft = typeof draftRow.data?.code === 'string' ? draftRow.data.code : null;
      draftUpdatedAt = draft !== null && typeof draftRow.data?.updated_at === 'string' ? draftRow.data.updated_at : null;
      locked = tierLockReason({ track: task.track, tier: task.tier, progress: { passed }, tasks: CODING_SUMMARIES, javascriptLevelsCleared: cleared });
      const stage = evolvingStage(task.id);
      if (stage) {
        locked = evolvingUnlocked(task.id, passed) ? null : 'evolving';
        if (draft === null && stage.previous && !locked) {
          const previous = await withTimeout(supabase.from('coding_drafts').select('code').eq('user_id', userId).eq('task_id', stage.previous).maybeSingle());
          if (previous.error) throw new Error('db_error');
          draft = typeof previous.data?.code === 'string' ? prepareEvolvingDraft(previous.data.code, stage.challenge, stage.index) : null;
        }
      }
    } catch {
      return jsonError(res, 500, 'db_error', 'Could not load coding progress');
    }
  } else {
    // Anonymous visitors may open and run any free task without recording
    // it; the ladder's tiers lock only what a signed-in learner could
    // otherwise record. Everything above tier 2 is shown as locked so the
    // ladder reads the same way for everyone.
    locked = tierLockReason({ track: task.track, tier: task.tier, progress: { passed: new Set() }, tasks: CODING_SUMMARIES, javascriptLevelsCleared: 0 });
    if (evolvingStage(task.id)) locked = evolvingUnlocked(task.id, new Set()) ? null : 'evolving';
  }
  // Premium opens the rest of the catalogue; a guest and a free account are
  // refused it with 402. A task already passed stays open for review whatever
  // the tier.
  if (await refuseLocked(res, userId, codingContent(task.id), { cleared: async () => evolvingPassed(task.id, passedIds) })) return;

  const play = playable(task);
  // What is known about this brief: the version of it, and the execution
  // evidence that a reference solution passes its own grader. Not a review —
  // nobody has read it for clarity or judged whether it is worth doing.
  play.review = codingTaskReview(task, solutionFor(task.id));
  // The puzzle's lines go out shuffled under presentation ids, and both the
  // accepted orders and the id translation stay here — the translation in the
  // sealed session. The shuffle is per request, so reloading does not hand
  // back the same start.
  let key: CodingSession['key'];
  const authoredPuzzle = puzzleFor(task.id);
  if (authoredPuzzle) {
    const presented = presentPuzzle(authoredPuzzle, secureShuffle);
    play.puzzle = {
      taskId: task.id,
      variantId: 'v1',
      lines: presented.lines,
      competencies: [...authoredPuzzle.competencies],
      claim: englishOnly(authoredPuzzle.claim),
    };
    key = { puzzle: presented.map };
  }
  if (task.track === 'system-design') {
    const prepared = prepareDesign(task, secureShuffle);
    key = { ...(key ?? {}), ...prepared.key };
    if (prepared.design) {
      play.design = englishOnly({
        scenario: prepared.design.scenario,
        brief: prepared.design.brief,
        passMark: prepared.design.passMark,
        steps: prepared.design.steps.map((step) => ({ key: step.key, title: step.title, prompt: step.prompt, options: step.options })),
      });
    }
    if (prepared.drill) {
      const { format, scenario, prompt, unit, options, steps } = prepared.drill;
      play.drill = englishOnly({ format, scenario, prompt, ...(unit ? { unit } : {}), ...(options ? { options } : {}), ...(steps ? { steps } : {}) });
    }
  }
  const session = locked ? null : encodeCodingSession({ taskId: task.id, track: task.track, userId, ...(key ? { key } : {}) });

  res.setHeader('Cache-Control', 'private, no-store');
  const body: CodingTaskResponse = { task: play, session, locked, progress, draft, draftUpdatedAt, signedIn: Boolean(userId) };
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
  failureHint?: CodingVerdictResponse['failureHint'];
  puzzle?: CodingVerdictResponse['puzzle'];
  /** The grader itself failed: the React runner could not start or answer.
   * That says nothing about the learner's code, so nothing is recorded. */
  infra?: boolean;
  /** Nothing checked the code: a checklist task passes on the learner's own
   * confirmation. Such a pass is recorded as unverified, with no XP and so no
   * coins, links no Learn level attempt, and opens no solutions. */
  unverified?: boolean;
}

/** The authored hint for the way this attempt failed, or null.
 *
 * Everything the classifier sees is either the learner's own output or a fact
 * about the task's shape — the kind of an expected value, never the value, and
 * never anything from a hidden test. What comes back is a category name and
 * authored text. */
function hintForFailure(
  task: CodingTask,
  graded: Pick<Graded, 'verdict' | 'results' | 'check' | 'codeError'> & { timedOut?: boolean },
): CodingVerdictResponse['failureHint'] {
  // Code that never parsed: the error says what is wrong, and a hint about
  // the values it handles would not be true (V4-3).
  if (graded.verdict === 'passed' || isSyntaxError(graded.codeError)) return null;
  const tests = task.tests ?? [];
  const category = classifyFailure({
    timedOut: graded.verdict === 'timeout' || graded.timedOut === true,
    threw: Boolean(graded.codeError),
    typeErrors: Boolean(graded.check && (graded.check.codeErrors.length > 0 || graded.check.typeTests.some((one) => !one.pass))),
    results: graded.results.map((one) => ({ pass: one.pass, actual: one.actual })),
    edge: tests.map((one) => one.edge === true),
    expectedKinds: tests.map((one) => jsonKind(JSON.stringify(one.expected) ?? null)),
    pitfall: task.pitfall,
  });
  return failureHint(category, task.failureHints);
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
    // The compiler runs on a worker thread with a deadline: a few hundred
    // bytes of recursive types kept it busy for half a minute on this thread.
    const hiddenTypeTests = solution?.hiddenTypeTests ?? [];
    const typed = await checkTypes(code, hiddenTypeTests.length ? [task.typeTests ?? [], hiddenTypeTests] : [task.typeTests ?? []]);
    if (typed.stopped) {
      // The message names the cause, a type. The timeout hint would send the
      // learner looking for a loop that is not there, so there is none.
      return {
        verdict: 'timeout', results: [], check: null, logs: [], codeError: TYPE_CHECK_STOPPED_MESSAGE, design: null, designReference: null,
        hidden: hiddenTests.length + hiddenTypeTests.length > 0 ? { passed: 0, total: hiddenTests.length + hiddenTypeTests.length } : null,
        failureHint: null,
      };
    }
    check = typed.results[0];
    const hiddenCheck = typed.results[1];
    if (hiddenCheck) {
      hiddenTypeTotal = hiddenCheck.typeTests.length;
      hiddenTypeFailures = hiddenCheck.typeTests.filter((one) => !one.pass).length;
    }
    // Code nested too deeply for the compiler is the learner's error, like a
    // syntax error, not a failure of the handler.
    if (typed.javascript === null) {
      const graded: Graded = {
        verdict: 'error', results: [], check, logs: [], codeError: TRANSPILE_FAILED_MESSAGE, design: null, designReference: null,
        hidden: hiddenTests.length + hiddenTypeTotal > 0 ? { passed: 0, total: hiddenTests.length + hiddenTypeTotal } : null,
      };
      return { ...graded, failureHint: hintForFailure(task, graded) };
    }
    codeToRun = typed.javascript;
  }
  // Only the visible checks' console output comes back: a learner who logs
  // inside their function must not read the hidden checks' inputs. The hidden
  // checks run in a fresh program, in an order shuffled for this submission.
  const { visible, hidden: hiddenRun } = await runChecks({ code: codeToRun, visible: tests, hidden: hiddenTests, shuffle: secureShuffle });
  const run = { logs: visible.logs, codeError: visible.codeError ?? hiddenRun?.codeError ?? null, timedOut: Boolean(visible.timedOut || hiddenRun?.timedOut) };
  let verdict = codeOutcome({ visible, hidden: hiddenRun, check });
  if (verdict === 'passed' && hiddenTypeFailures > 0) verdict = 'failed';
  const hiddenPassed = (hiddenRun?.results.filter((r) => r.pass === true).length ?? 0) + (hiddenTypeTotal - hiddenTypeFailures);
  const hiddenTotal = hiddenTests.length + hiddenTypeTotal;
  const graded: Graded = {
    verdict,
    results: visible.results,
    hidden: hiddenTotal > 0 ? { passed: hiddenPassed, total: hiddenTotal } : null,
    check,
    logs: run.logs,
    codeError: run.codeError,
    design: null,
    designReference: null,
  };
  return { ...graded, failureHint: hintForFailure(task, { ...graded, timedOut: run.timedOut }) };
}

/**
 * React tasks: render the component and run the task's Testing Library suite
 * under jsdom. A task with no suite (`verify: 'checklist'`) has nothing to
 * assert, so the learner's own confirmation stands, marked unverified: it is
 * recorded, and pays nothing. Everything else is decided here from the code
 * alone.
 */
async function gradeReact(task: CodingTask, code: string): Promise<Graded> {
  if (task.verify === 'checklist' || !task.suite) {
    return { verdict: 'passed', results: [], hidden: null, check: null, logs: [], codeError: null, design: null, designReference: null, unverified: true };
  }
  let run;
  let loaded = false;
  try {
    const { runIsolatedReactSuite } = await import('./react-isolated');
    loaded = true;
    run = await runIsolatedReactSuite({ suite: withHiddenCases(task.suite, solutionFor(task.id)?.hiddenSuite), appSource: code });
  } catch (error) {
    // The runtime itself could not start; that is ours, not the learner's.
    const code = (error as { code?: unknown } | undefined)?.code;
    const missingModule = !loaded && error instanceof Error
      ? error.message.match(/^Cannot find (?:module|package) ['"]([^'"]+)['"]/)?.[1]
      : undefined;
    logEvent({ status: 500, kind: 'react_runtime', category: error instanceof Error ? error.name : 'unknown',
      phase: loaded ? 'run' : 'import',
      ...(typeof code === 'string' && /^ERR_[A-Z_]+$|^MODULE_NOT_FOUND$/.test(code) ? { code } : {}),
      ...(missingModule ? { missingModule } : {}),
    });
    return {
      verdict: 'error', results: [], hidden: null, check: null, logs: [],
      codeError: 'The React runner could not start, so this Submit was not recorded. Try again in a moment.',
      design: null, designReference: null, infra: true,
    };
  }
  // Hidden cases decide the verdict with the rest but go back only as a count,
  // never with their names or errors.
  const { visible, hidden } = splitHiddenCases(run.cases);
  const results = visible.map((one) => ({ pass: one.status === 'pass', actual: null, error: one.error }));
  const verdict: CodingOutcome = run.compileError
    ? 'error'
    : run.timedOut
      ? 'timeout'
      : run.failed === 0 && run.total > 0 ? 'passed' : 'failed';
  const graded: Graded = {
    verdict,
    results,
    hidden: hidden.length > 0 ? { passed: hidden.filter((one) => one.status === 'pass').length, total: hidden.length } : null,
    check: null,
    logs: [],
    codeError: run.compileError,
    design: null,
    designReference: null,
  };
  return { ...graded, failureHint: hintForFailure(task, { ...graded, timedOut: run.timedOut }) };
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
  xpForfeited: boolean;
  applied: boolean;
  codeChanged: boolean;
}

const clampInt = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;

async function recordVerdict(input: RecordInput, res: VercelResponse): Promise<Recorded | null> {
  const { supabase, userId, task, session } = input;
  // Only a verdict the server checked pays: an unverified pass (a checklist
  // task) records the attempt and the progress row with no XP, so no coins.
  const xp = input.verified ? CODING_TASK_XP[task.tier] : 0;
  // A coding task inside a Learn level links to the level attempt; the row
  // exists once the first question was answered. Without it the verdict is
  // still recorded, only unlinked. An unverified verdict is never linked, so
  // it cannot complete a Learn level.
  let roadmapAttemptId: string | null = null;
  if (session.roadmapAttemptId && input.verified) {
    const attempt = await withTimeout(supabase.from('roadmap_attempts').select('attempt_id').eq('attempt_id', session.roadmapAttemptId).eq('user_id', userId).maybeSingle());
    if (!attempt.error && attempt.data) roadmapAttemptId = session.roadmapAttemptId;
  }
  // Whether the solution was revealed before this pass, read before the pass
  // is written. Only a pass can forfeit XP, so nothing else pays for the read.
  let revealedBefore = false;
  if (input.verdict === 'passed') {
    try {
      const before = await loadProgressRow(supabase, userId, task.id);
      revealedBefore = before !== null && before.status !== 'passed' && before.revealCount > 0;
    } catch { /* unknown: the verdict then claims no forfeit */ }
  }
  const saved = await withTimeout(
    supabase.rpc('record_coding_verdict', {
      p_user_id: userId,
      p_attempt_id: submissionAttemptId(session, input.verdict, input.code),
      p_task_id: task.id,
      p_track: task.track,
      p_outcome: input.verdict,
      p_verified: input.verified,
      p_xp: xp,
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
  // Coins follow the XP the routine just awarded, under the same award id
  // (#227). The last stage of a project or short path is a Premium milestone.
  const xpAwarded = data.xpAwarded === true && xp > 0;
  if (xpAwarded) {
    await creditVerifiedXp(supabase, {
      userId, awardId: codingAwardId(userId, task.id), subject: 'webdev', xp,
    });
  }
  // From migration 048 every applied verified pass is also a streak day, which
  // can reach a Premium streak milestone; an unverified (checklist) pass
  // settles nothing.
  if (data.applied === true && input.verdict === 'passed' && input.verified) await settleMilestones(supabase, userId, 'webdev');
  const progress = await loadProgressRow(supabase, userId, task.id);
  return {
    progress,
    firstPass: data.firstPass === true,
    xpAwarded: xpAwarded ? xp : 0,
    // Migration 048 pays no XP, and so no coins, for a first pass after a
    // reveal. Before 048 the routine still pays it: xpAwarded is then true and
    // this stays false, so the verdict never claims a forfeit that did not
    // happen. An unverified (checklist) pass never pays, so it claims none.
    xpForfeited: revealedBefore && data.applied === true && data.firstPass === true && !xpAwarded && xp > 0,
    applied: data.applied === true,
    codeChanged: data.codeChanged === true,
  };
}

/** The junior and senior solutions for a task, when both are authored. Called
 * only where a pass has been established: by the grader just now, or by the
 * recorded progress row. */
const solutionPairFor = (id: string): CodingSolutionPair | null => {
  const record = solutionFor(id);
  return record?.junior && record.senior ? { junior: record.junior, senior: record.senior } : null;
};

function verdictBody(graded: Graded, recorded: Recorded | null, github: CodingGardenStatus | null, solutions: CodingSolutionPair | null): CodingVerdictResponse {
  return {
    verdict: graded.verdict,
    results: graded.results,
    hidden: graded.hidden,
    check: graded.check,
    logs: graded.logs,
    codeError: graded.codeError,
    design: englishOnly(graded.design),
    designReference: englishOnly(graded.designReference),
    failureHint: englishOnly(graded.failureHint ?? null),
    puzzle: englishOnly(graded.puzzle ?? null),
    progress: recorded?.progress ?? null,
    firstPass: recorded?.firstPass ?? false,
    xpAwarded: recorded?.xpAwarded ?? 0,
    xpForfeited: recorded?.xpForfeited ?? false,
    applied: recorded?.applied ?? false,
    github,
    solutions,
    ...(graded.infra ? { graderUnavailable: true as const } : {}),
  };
}

/** The grader could not take this Submit (`GraderBusyError`): nothing was
 * graded, so nothing is recorded, and the learner is asked to submit again. A
 * caller over its own limit hears 429; a Submit the instance's grader threads
 * could not take, 503. Both carry a Retry-After. */
function graderBusy(res: VercelResponse, status: 429 | 503, error: GraderBusyError, track: CodingTrack, hasUser: boolean) {
  logEvent({ status, kind: 'submit_unrecorded', reason: error.reason, track, hasUser });
  res.setHeader('Retry-After', String(error.retryAfterSeconds));
  return jsonError(res, status, 'grader_busy', error.message);
}

/* ── POST ?resource=coding-submit ────────────────────────────────────── */

export async function handleCodingSubmit(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (!(await enforceClassRateLimit(req, res, RATE_LIMITS.codingRunAddress, RATE_LIMITS.codingRun))) return;
  const body = (req.body || {}) as Partial<CodingSubmitRequest> & { lang?: unknown };
  const session = sessionFrom(body.session);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Coding session expired or invalid');
  const task = codingTaskById(session.taskId);
  if (!task || task.track !== session.track) return jsonError(res, 400, 'invalid_session', 'Coding session does not match a task');
  const userId = await optionalUser(req, res);
  if (userId === undefined) return;
  if (session.userId && session.userId !== userId) return jsonError(res, 403, 'invalid_session', 'Coding session belongs to another account');
  if (await refuseLocked(res, userId, codingSessionContent(task, session), { cleared: () => taskCleared(supabase, userId!, task.id) })) return;

  let graded: Graded;
  let code: string | null = null;
  // A code-ordering submission. The server neither reads nor believes a
  // viewport: it accepts an order from any device and grades it the same way,
  // and what it produces is ordering evidence, never a code pass.
  const puzzle = puzzleFor(task.id);
  if (Array.isArray(body.order) && puzzle) {
    // The browser arranged presentation ids; the session says what they stand
    // for. An id this session never issued fails the whole submission.
    const map = session.key?.puzzle;
    if (!map) return jsonError(res, 400, 'invalid_session', 'This session did not issue a puzzle');
    const resolved = resolvePuzzleOrder(body.order.filter((id): id is string => typeof id === 'string').slice(0, PUZZLE_MAX_LINES), map);
    const order = resolved.filter((id): id is string => id !== null);
    if (order.length !== resolved.length || !isCompleteOrder(order, puzzle.lines)) {
      return jsonError(res, 400, 'bad_request', 'Arrange every line exactly once');
    }
    const accepted = isAcceptedOrder(order, puzzle.accepted);
    if (userId && supabase) {
      const written = await withTimeout(supabase.rpc('record_coding_puzzle', {
        p_user_id: userId, p_task_id: task.id, p_competencies: puzzle.competencies, p_passed: accepted,
      }));
      if (written.error && isRpcMissing(written.error)) {
        return jsonError(res, 503, 'migration_required', 'Practice migration 027 is not installed');
      }
    }
    logEvent({ status: 200, kind: 'puzzle', track: task.track, accepted });
    res.setHeader('Cache-Control', 'private, no-store');
    // coding_progress is deliberately untouched: the task stays open for the
    // implementation it actually asks for.
    return res.json(verdictBody({
      verdict: accepted ? 'passed' : 'failed',
      results: [],
      hidden: null,
      check: null,
      logs: [],
      codeError: null,
      design: null,
      designReference: null,
      puzzle: { accepted, competencies: puzzle.competencies, claim: puzzle.claim },
    }, null, null, null));
  }
  if (task.track === 'system-design') {
    if (!Array.isArray(body.answers) || body.answers.length > 12) return jsonError(res, 400, 'bad_request', 'answers must be an array');
    // One check per design session. A failed check names which answers were
    // right, so sending the same session again with other answers would read
    // the key off it step by step, and a pass would then hand over the whole
    // walkthrough. A new attempt opens the task again, under a new shuffle.
    if (!(await claimOnce(`design:${session.attemptId}`, DESIGN_SESSION_TTL_S))) {
      return jsonError(res, 409, 'design_session_used', 'This walkthrough was already checked. Open it again for a new attempt.');
    }
    graded = gradeDesignTask(task, session, body.answers);
  } else {
    if (typeof body.code !== 'string' || body.code.length === 0) return jsonError(res, 400, 'bad_request', 'code is required');
    if (Buffer.byteLength(body.code, 'utf8') > MAX_CODE_BYTES) return jsonError(res, 413, 'too_large', 'Code is limited to 20 kB');
    code = body.code;
    const done = enterInFlight(req, 'grading', GRADING_PER_CALLER, userId ? `user:${userId}` : undefined);
    if (!done) return graderBusy(res, 429, new GraderBusyError('caller_in_flight'), task.track, Boolean(userId));
    try {
      graded = task.track === 'react' ? await gradeReact(task, code) : await gradeCode(task, code);
    } catch (error) {
      if (!(error instanceof GraderBusyError)) throw error;
      return graderBusy(res, 503, error, task.track, Boolean(userId));
    } finally {
      done();
    }
  }
  // A grader outage is not the learner's error: it is neither recorded nor
  // counted against the attempt, and the message asks for another Submit.
  if (graded.infra) {
    logEvent({ status: 200, kind: 'submit_unrecorded', track: task.track, hasUser: Boolean(userId) });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(verdictBody(graded, null, null, null));
  }

  let recorded: Recorded | null = null;
  let github: CodingGardenStatus | null = null;
  let draftUpdatedAt: string | null = null;
  if (userId) {
    if (!supabase) return jsonError(res, 503, 'not_configured', 'Coding progress is not configured');
    if (evolvingStage(task.id)) {
      const rows = await loadProgressRows(supabase, userId);
      const passed = new Set(rows.filter(row => row.status === 'passed').map(row => row.task_id));
      if (!evolvingUnlocked(task.id, passed)) return jsonError(res, 403, 'stage_locked', 'Complete earlier stages first');
      // Persist the exact submitted code before publishing completion. A next
      // stage can then resume from this draft even on another device. It is
      // written whatever the draft holds, and the time goes back with the
      // verdict, so the browser's next save builds on it.
      if (code !== null) {
        const draft = await storeDraft(supabase, userId, task.id, code, 'force');
        if (!draft || draft === 'missing') return jsonError(res, 500, 'db_error', 'Could not save stage code');
        if (draft.saved && draft.updatedAt) draftUpdatedAt = draft.updatedAt;
      }
    }
    recorded = await recordVerdict({ supabase, userId, task, session, verdict: graded.verdict, verified: graded.unverified !== true, code, runCount: body.runCount, hintsUsed: body.hintsUsed, durationMs: body.durationMs }, res);
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
  // A pass opens the two authored solutions. The grader decided the pass a
  // moment ago in this same request, which is the only reason they are here;
  // an unverified pass checked nothing, so it opens nothing.
  const checkedPass = graded.verdict === 'passed' && code !== null && graded.unverified !== true;
  const out: CodingVerdictResponse = verdictBody(graded, recorded, github, checkedPass ? solutionPairFor(task.id) : null);
  if (draftUpdatedAt) out.draftUpdatedAt = draftUpdatedAt;
  return res.json(out);
}

/* ── POST ?resource=coding-reveal ────────────────────────────────────── */

export async function handleCodingReveal(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (!(await enforceClassRateLimit(req, res, RATE_LIMITS.codingRevealAddress, RATE_LIMITS.codingReveal))) return;
  const body = (req.body || {}) as Partial<CodingRevealRequest>;
  const session = sessionFrom(body.session);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Coding session expired or invalid');
  const task = codingTaskById(session.taskId);
  if (!task) return jsonError(res, 400, 'invalid_session', 'Coding session does not match a task');
  const hintsUsed = clampInt(body.hintsUsed, 20) ?? 0;
  const userId = await optionalUser(req, res);
  if (userId === undefined) return;
  if (session.userId && session.userId !== userId) return jsonError(res, 403, 'invalid_session', 'Coding session belongs to another account');

  let progress: CodingTaskProgress | null = null;
  if (userId && supabase) {
    try { progress = await loadProgressRow(supabase, userId, task.id); } catch { return jsonError(res, 500, 'db_error', 'Could not load coding progress'); }
  }
  if (progress?.status !== 'passed' && await refuseLocked(res, userId, codingSessionContent(task, session))) return;
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
  const out: CodingRevealResponse = { solution, reference: englishOnly(reference), progress };
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
    const tasks: Record<string, CodingTaskProgress> = {};
    const passedByTrack = Object.fromEntries(CODING_TRACKS.map((track) => [track, 0])) as Record<CodingTrack, number>;
    for (const row of rows) {
      tasks[row.task_id] = toProgress(row);
      if (row.status === 'passed' && CODING_TRACKS.includes(row.track as CodingTrack)) passedByTrack[row.track as CodingTrack] += 1;
    }
    const due: string[] = [];
    res.setHeader('Cache-Control', 'private, no-store');
    const out: CodingProgressResponse = { tasks, due, javascriptLevelsCleared: cleared, passedByTrack };
    return res.json(out);
  } catch {
    return jsonError(res, 500, 'db_error', 'Could not load coding progress');
  }
}

/* ── GET/POST ?op=coding-draft&id=… ──────────────────────────────────── */

/** An account draft's updated_at as Postgres hands it out, ISO 8601 with up
 * to microseconds: kept as a string, since a Date would drop them. */
const isDraftTime = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/.test(value) && !Number.isNaN(Date.parse(value));

type StoredDraft = { saved: true; updatedAt: string | null } | { saved: false; updatedAt: string };

/** Write a task's draft: only while the account's draft still has `base`
 * (null: none yet), or whatever it holds with 'force'. Migration 059's
 * save_coding_draft_v2 decides under a row lock. Before that migration the
 * save goes through save_coding_draft (025), which always writes, and the
 * time is read back: none when another save overtook it. Null for a database
 * error, 'missing' when neither routine exists. */
async function storeDraft(supabase: SupabaseClient, userId: string, taskId: string, code: string, base: string | null | 'force'): Promise<StoredDraft | 'missing' | null> {
  const force = base === 'force';
  const result = await withTimeout(supabase.rpc('save_coding_draft_v2', { p_user_id: userId, p_task_id: taskId, p_code: code, p_base: force ? null : base, p_force: force }));
  if (!result.error) {
    const answer = result.data as { saved?: unknown; conflict?: unknown; updatedAt?: unknown } | null;
    const updatedAt = typeof answer?.updatedAt === 'string' ? answer.updatedAt : null;
    if (answer?.saved === false && answer.conflict === true && updatedAt) return { saved: false, updatedAt };
    return { saved: true, updatedAt };
  }
  if (!isRpcMissing(result.error)) return null;
  const saved = await withTimeout(supabase.rpc('save_coding_draft', { p_user_id: userId, p_task_id: taskId, p_code: code }));
  if (saved.error) return isRpcMissing(saved.error) ? 'missing' : null;
  let updatedAt: string | null = null;
  try {
    const row = await withTimeout(supabase.from('coding_drafts').select('code,updated_at').eq('user_id', userId).eq('task_id', taskId).maybeSingle());
    if (!row.error && row.data?.code === code && typeof row.data.updated_at === 'string') updatedAt = row.data.updated_at;
  } catch { /* saved all the same; the browser learns no time */ }
  return { saved: true, updatedAt };
}

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
    // Rate limited as every write to api/user/[op].ts is (`limitUserWrite`):
    // per account, behind a class-sized address bucket. A second bucket here,
    // keyed by address alone, held a whole class to one person's saves.
    const body = (req.body ?? {}) as Partial<Record<keyof CodingDraftSaveRequest, unknown>>;
    const code = body.code;
    if (typeof code !== 'string' || Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) return jsonError(res, 400, 'bad_request', 'code is required and limited to 20 kB');
    // The account draft's time this code builds on (owner decision 10). A
    // client from before it sends none and writes as it always did.
    const base = !('base' in body) ? 'force' : body.base === null ? null : isDraftTime(body.base) ? body.base : undefined;
    if (base === undefined) return jsonError(res, 400, 'bad_request', 'base must be a draft time or null');
    const saved = await storeDraft(supabase, userId, id, code, base);
    if (!saved) return jsonError(res, 500, 'db_error', 'Could not save the draft');
    if (saved === 'missing') return jsonError(res, 503, 'migration_required', 'Coding progress migration 025 is not installed');
    // Saved from another device or tab since: nothing was written, and the
    // browser asks the learner which code to keep. The other code stays on
    // the server until the browser asks for it.
    if (!saved.saved) return jsonError(res, 409, 'draft_conflict', 'Your account holds a draft of this task saved since this code was opened', { updatedAt: saved.updatedAt });
    // The time the account now holds this code, so the browser's next save
    // builds on it (client/src/coding/drafts.ts).
    const out: CodingDraftSaveResponse = { ok: true, updatedAt: saved.updatedAt };
    return res.json(out);
  }
  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}


/* ── GET ?resource=coding-approaches ─────────────────────────────────── */

/**
 * Curated approach comparisons for a task the learner has passed.
 *
 * The gate is the recorded verdict, not a flag from the browser and not the
 * reveal: giving up shows the reference solution and ends the attempt, and it
 * still does. Passing is what opens the comparison, because the comparison only
 * teaches anything to someone who already has a working answer of their own.
 */
export async function handleCodingApproaches(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!codingAvailable()) return notAvailable(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!isCodingTaskId(id) || !codingTaskById(id)) return jsonError(res, 404, 'not_found', 'Unknown challenge');
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  const row = await withTimeout(
    supabase.from('coding_progress').select('status').eq('user_id', userId).eq('task_id', id).maybeSingle(),
  );
  if (row.error) {
    if (isRpcMissing(row.error)) return jsonError(res, 503, 'migration_required', 'Coding progress migration 025 is not installed');
    return jsonError(res, 500, 'db_error', 'Could not read your progress');
  }
  if (row.data?.status !== 'passed') {
    return jsonError(res, 403, 'not_passed', 'Approach comparisons open once you have passed the challenge');
  }

  res.setHeader('Cache-Control', 'private, no-store');
  const body: CodingApproachesResponse = { taskId: id, approaches: englishOnly(approachesFor(id)), solutions: solutionPairFor(id) };
  return res.json(body);
}
