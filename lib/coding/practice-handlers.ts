/** Short practice sessions and skip feedback (issues #159, #160).
 *
 * Mounted on `api/user/[op].ts`, so the twelve-function budget is unchanged:
 *   GET  ?op=practice-session   → the session in progress, if any
 *   POST ?op=practice-session   → start, advance or end a session
 *   POST ?op=coding-skip        → record a skip and offer a next step
 *
 * The queue is composed by the pure builder in `shared/practice-session.ts`
 * from tasks the progression policy already allows; choosing a session can
 * never open something the policy has not. A skip records feedback and nothing
 * else — no XP, no evidence, no unlock.
 */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { createLogger, jsonError, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { CODING_SUMMARIES, codingTaskById, levelCodingTasks } from './catalog';
import { puzzleFor } from './puzzles';
import { progressionFor } from '../progression';
import { nextStep, topicUnlocked } from '../../shared/progression';
import { isCodingTaskId, tierUnlocked } from '../../shared/coding-catalog';
import {
  buildPracticeSession,
  isSessionMinutes,
  SESSION_MINUTES,
  type PracticeCandidate,
  type PracticeSessionResponse,
  type PracticeSessionState,
} from '../../shared/practice-session';
import {
  MAX_SKIP_NOTE,
  isSkipReason,
  type CodingSkipResponse,
} from '../../shared/coding-skip';

const logEvent = createLogger('user/practice');

const available = () => deploymentSubjectIds().includes('webdev');

const tableMissing = (error: { message?: string; code?: string } | null | undefined): boolean =>
  !!error && (error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? ''));

const migrationError = (res: VercelResponse) =>
  jsonError(res, 503, 'migration_required', 'Practice session migration 028 is not installed');

interface SessionRow {
  session_id: string;
  minutes: number;
  task_ids: string[];
  position: number;
  started_at: string;
  completed_at: string | null;
}

const toState = (row: SessionRow): PracticeSessionState => ({
  sessionId: row.session_id,
  minutes: isSessionMinutes(row.minutes) ? row.minutes : 10,
  taskIds: Array.isArray(row.task_ids) ? row.task_ids : [],
  position: Number(row.position ?? 0),
  startedAt: row.started_at,
  completedAt: row.completed_at,
});

async function openSession(supabase: SupabaseClient, userId: string): Promise<SessionRow | null | 'missing'> {
  const { data, error } = await withTimeout(
    supabase.from('practice_sessions').select('session_id,minutes,task_ids,position,started_at,completed_at')
      .eq('user_id', userId).is('completed_at', null)
      .order('started_at', { ascending: false }).limit(1).maybeSingle(),
  );
  if (error) {
    if (tableMissing(error)) return 'missing';
    throw new Error('db_error');
  }
  return (data as SessionRow | null) ?? null;
}

/** The tasks this learner may practise right now, in plan order. */
async function candidatesFor(supabase: SupabaseClient, userId: string): Promise<{
  candidates: PracticeCandidate[];
  passed: string[];
  due: string[];
}> {
  const input = await progressionFor(supabase, userId);
  const rows = await withTimeout(
    supabase.from('coding_progress').select('task_id,status,next_review_at').eq('user_id', userId),
  );
  if (rows.error) throw new Error('db_error');
  const progressRows = (rows.data ?? []) as { task_id: string; status: string; next_review_at: string | null }[];
  const passed = progressRows.filter((row) => row.status === 'passed').map((row) => row.task_id);
  const passedSet = new Set(passed);
  const now = Date.now();
  const due = progressRows
    .filter((row) => row.status === 'passed' && row.next_review_at && Date.parse(row.next_review_at) <= now)
    .sort((a, b) => Date.parse(a.next_review_at!) - Date.parse(b.next_review_at!))
    .map((row) => row.task_id);

  const cleared = (() => {
    const levels = input.completions.levels.javascript ?? [];
    const set = new Set(levels);
    let n = 0;
    while (set.has(n + 1)) n += 1;
    return n;
  })();

  const candidates = CODING_SUMMARIES
    .filter((task) => task.track !== 'system-design')
    .map((task): PracticeCandidate => ({
      taskId: task.id,
      track: task.track,
      estimatedMinutes: task.estimatedMinutes,
      tier: task.tier,
      eligible:
        (!input.profile || topicUnlocked(input, task.track)) &&
        tierUnlocked({ track: task.track, tier: task.tier, progress: { passed: passedSet }, tasks: CODING_SUMMARIES, javascriptLevelsCleared: cleared }),
      hasPuzzle: Boolean(puzzleFor(task.id)),
    }));
  return { candidates, passed, due };
}

export async function handlePracticeSession(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return jsonError(res, 404, 'not_available', 'Coding challenges are not part of this product');
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const row = await openSession(supabase, userId);
      if (row === 'missing') return migrationError(res);
      res.setHeader('Cache-Control', 'private, no-store');
      const body: PracticeSessionResponse = { session: row ? toState(row) : null, available: [...SESSION_MINUTES] };
      return res.json(body);
    } catch {
      return jsonError(res, 500, 'db_error', 'Could not load your practice session');
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as { action?: unknown; minutes?: unknown; position?: unknown; touch?: unknown };
  const action = typeof body.action === 'string' ? body.action : 'start';

  try {
    if (action === 'start') {
      if (!isSessionMinutes(body.minutes)) return jsonError(res, 400, 'bad_request', 'Choose one of the offered session lengths');
      const [{ candidates, passed, due }, saved, skipped] = await Promise.all([
        candidatesFor(supabase, userId),
        withTimeout(supabase.from('coding_bookmarks').select('task_id').eq('user_id', userId)),
        withTimeout(supabase.from('coding_skips').select('task_id').eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 3_600_000).toISOString())),
      ]);
      const plan = buildPracticeSession({
        minutes: body.minutes,
        candidates,
        due,
        passed,
        saved: saved.error ? [] : ((saved.data ?? []) as { task_id: string }[]).map((row) => row.task_id),
        skipped: skipped.error ? [] : ((skipped.data ?? []) as { task_id: string }[]).map((row) => row.task_id),
        preferPuzzles: body.touch === true,
      });
      // Close whatever was open: one session at a time, so a resume is unambiguous.
      const closed = await withTimeout(
        supabase.from('practice_sessions').update({ completed_at: new Date().toISOString() }).eq('user_id', userId).is('completed_at', null),
      );
      if (closed.error && tableMissing(closed.error)) return migrationError(res);
      const sessionId = randomBytes(9).toString('base64url');
      const created = await withTimeout(supabase.from('practice_sessions').insert({
        session_id: sessionId,
        user_id: userId,
        minutes: plan.minutes,
        task_ids: plan.items.map((item) => item.taskId),
        position: 0,
      }));
      if (created.error) { if (tableMissing(created.error)) return migrationError(res); throw new Error('db_error'); }
      logEvent({ status: 200, kind: 'session_start', minutes: plan.minutes, items: plan.items.length, short: plan.short });
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json({
        session: {
          sessionId, minutes: plan.minutes, taskIds: plan.items.map((item) => item.taskId),
          position: 0, startedAt: new Date().toISOString(), completedAt: null,
        } satisfies PracticeSessionState,
        plan,
        available: [...SESSION_MINUTES],
      });
    }

    if (action === 'advance' || action === 'finish') {
      const row = await openSession(supabase, userId);
      if (row === 'missing') return migrationError(res);
      if (!row) return jsonError(res, 404, 'not_found', 'No practice session is open');
      const position = action === 'finish'
        ? row.task_ids.length
        : Math.max(0, Math.min(row.task_ids.length, Number.isInteger(body.position) ? Number(body.position) : row.position + 1));
      const patch: Record<string, unknown> = { position, updated_at: new Date().toISOString() };
      if (action === 'finish' || position >= row.task_ids.length) patch.completed_at = new Date().toISOString();
      const saved = await withTimeout(supabase.from('practice_sessions').update(patch).eq('session_id', row.session_id).eq('user_id', userId));
      if (saved.error) throw new Error('db_error');
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json({
        session: { ...toState(row), position, completedAt: (patch.completed_at as string) ?? null },
        available: [...SESSION_MINUTES],
      });
    }

    return jsonError(res, 400, 'bad_request', `Unknown session action: ${action}`);
  } catch {
    return jsonError(res, 500, 'db_error', 'Could not update your practice session');
  }
}

/* ── POST ?op=coding-skip ────────────────────────────────────────────────── */

export async function handleCodingSkip(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (!available()) return jsonError(res, 404, 'not_available', 'Coding challenges are not part of this product');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  // A skip is cheap to send and cheap to abuse, so it shares the report budget.
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.questionReport))) return;

  const body = (req.body || {}) as { taskId?: unknown; reason?: unknown; note?: unknown; sessionId?: unknown };
  if (!isCodingTaskId(body.taskId)) return jsonError(res, 400, 'bad_request', 'A task id is required');
  const task = codingTaskById(body.taskId);
  if (!task) return jsonError(res, 404, 'not_found', 'Unknown task');
  if (!isSkipReason(body.reason)) return jsonError(res, 400, 'bad_request', 'A known skip reason is required');
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_SKIP_NOTE) : null;

  try {
    const saved = await withTimeout(supabase.from('coding_skips').insert({
      user_id: userId,
      task_id: task.id,
      track: task.track,
      reason: body.reason,
      note: note && note.length > 0 ? note : null,
      session_id: typeof body.sessionId === 'string' && body.sessionId.length <= 64 ? body.sessionId : null,
    }));
    if (saved.error) { if (tableMissing(saved.error)) return migrationError(res); throw new Error('db_error'); }

    // A task a Learn level asks for stays required: skipping records why the
    // learner moved on, and the level still waits for it.
    const required = levelCodingTasks(task.topic, task.level).some((one) => one.id === task.id);

    const { candidates, passed } = await candidatesFor(supabase, userId);
    const passedSet = new Set(passed);
    const next = candidates.find((one) => one.eligible && one.taskId !== task.id && !passedSet.has(one.taskId)) ?? null;

    let remedial: CodingSkipResponse['remedial'] = null;
    if (body.reason === 'missing-prerequisite' || body.reason === 'too-hard') {
      const input = await progressionFor(supabase, userId);
      const step = nextStep(input);
      if (step && step.kind === 'level') remedial = { topic: step.topic, level: step.ref };
    }

    logEvent({ status: 200, kind: 'skip', reason: body.reason, required });
    res.setHeader('Cache-Control', 'private, no-store');
    const out: CodingSkipResponse = {
      recorded: true,
      awarded: { xp: 0, completion: false, unlock: false },
      required,
      next: next ? { taskId: next.taskId, track: next.track } : null,
      remedial,
    };
    return res.json(out);
  } catch {
    return jsonError(res, 500, 'db_error', 'Could not record that');
  }
}
