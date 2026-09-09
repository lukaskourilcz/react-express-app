/** Saved challenges, named collections, skip reasons and short practice
 * sessions. Mounted as `op=` branches on `api/user/[op].ts`, so the
 * twelve-function budget is unchanged.
 *
 * None of this is authority over anything. A saved challenge records interest,
 * not access: an item the learner may not open yet stays in their list with an
 * explanation and still refuses to launch, because launching goes through the
 * same eligibility check everything else does. A skip is feedback — a required
 * task that was skipped stays required and unlocks nothing. A session is a
 * queue and a position, chosen from what was already eligible; it can reorder
 * practice, never widen it.
 *
 * Every write goes through a service-role routine (migration 027) so the limits
 * live in one place instead of being trusted from a request. */

import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import { isRpcMissing, jsonError, createLogger, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { CODING_SUMMARIES } from './active';
import { isCodingSectionTrack, isCodingTaskId, tierUnlocked, type CodingTaskSummary } from '../../shared/coding-catalog';
import {
  isPracticeSessionMinutes,
  isSkipReason,
  type CodingBookmarkRequest,
  type CodingBookmarksResponse,
  type CodingCollection,
  type CodingSkipRequest,
  type CodingSkipResponse,
  type PracticeSession,
  type PracticeSessionAdvanceRequest,
  type PracticeSessionResponse,
  type PracticeSessionStartRequest,
} from '../../shared/coding-api';

const logEvent = createLogger('practice');

const available = () => deploymentSubjectIds().includes('webdev');
const notAvailable = (res: VercelResponse) =>
  jsonError(res, 404, 'not_available', 'Coding practice is not part of this product');
const migrationRequired = (res: VercelResponse) =>
  jsonError(res, 503, 'migration_required', 'Practice migration 027 is not installed');

/** Ids are opaque and generated here: a client never names a row. */
const newId = (): string => randomBytes(24).toString('base64url').slice(0, 32);

/** The tasks the section offers, in catalogue order. Retired tracks keep their
 * records but never come back as practice. */
const SECTION_TASKS: CodingTaskSummary[] = CODING_SUMMARIES.filter((task) => isCodingSectionTrack(task.track));

/* ── saved challenges and collections ─────────────────────────────────── */

async function readBookmarks(supabase: SupabaseClient, userId: string): Promise<CodingBookmarksResponse | 'missing'> {
  const saved = await withTimeout(
    supabase.from('coding_bookmarks').select('task_id').eq('user_id', userId).order('created_at', { ascending: false }),
  );
  if (saved.error) return isRpcMissing(saved.error) ? 'missing' : { saved: [], collections: [] };
  const collections = await withTimeout(
    supabase.from('coding_collections').select('collection_id,name,position').eq('user_id', userId).order('position'),
  );
  if (collections.error) return { saved: (saved.data ?? []).map((row) => String(row.task_id)), collections: [] };
  const ids = (collections.data ?? []).map((row) => String(row.collection_id));
  const items = ids.length
    ? await withTimeout(
        supabase.from('coding_collection_items').select('collection_id,task_id,position').in('collection_id', ids).order('position'),
      )
    : { data: [], error: null };
  const byCollection = new Map<string, string[]>();
  for (const row of (items.data ?? []) as { collection_id: string; task_id: string }[]) {
    const list = byCollection.get(row.collection_id) ?? [];
    list.push(String(row.task_id));
    byCollection.set(row.collection_id, list);
  }
  return {
    saved: (saved.data ?? []).map((row) => String(row.task_id)),
    collections: (collections.data ?? []).map((row): CodingCollection => ({
      collectionId: String(row.collection_id),
      name: String(row.name),
      position: Number(row.position ?? 0),
      taskIds: byCollection.get(String(row.collection_id)) ?? [],
    })),
  };
}

/** GET/PUT /api/user/[op]?op=coding-bookmarks */
export async function handleCodingBookmarks(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!available()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  if (req.method === 'GET') {
    const body = await readBookmarks(supabase, userId);
    if (body === 'missing') return migrationRequired(res);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(body);
  }

  if (req.method === 'PUT') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const body = (req.body || {}) as Partial<CodingBookmarkRequest> & Record<string, unknown>;

    if (body.op === 'save') {
      const taskId = body.taskId;
      if (!isCodingTaskId(taskId) || !SECTION_TASKS.some((task) => task.id === taskId)) {
        return jsonError(res, 400, 'bad_request', 'Unknown challenge');
      }
      const saved = await withTimeout(
        supabase.rpc('set_coding_bookmark', { p_user_id: userId, p_task_id: taskId, p_saved: body.saved === true }),
      );
      if (saved.error) {
        if (isRpcMissing(saved.error)) return migrationRequired(res);
        if (/bookmark_limit_reached/i.test(saved.error.message ?? '')) {
          return jsonError(res, 409, 'limit_reached', 'You have saved as many challenges as a list can hold');
        }
        return jsonError(res, 500, 'db_error', 'Could not save the challenge');
      }
    } else if (body.op === 'collection-upsert') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length === 0 || name.length > 60) {
        return jsonError(res, 400, 'bad_request', 'A collection needs a name of 1 to 60 characters');
      }
      const collectionId = typeof body.collectionId === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(body.collectionId)
        ? body.collectionId
        : newId();
      const position = Number.isInteger(body.position) ? Math.max(0, Math.min(999, Number(body.position))) : 0;
      const saved = await withTimeout(
        supabase.rpc('upsert_coding_collection', {
          p_collection_id: collectionId, p_user_id: userId, p_name: name, p_position: position,
        }),
      );
      if (saved.error) {
        if (isRpcMissing(saved.error)) return migrationRequired(res);
        if (/collection_limit_reached/i.test(saved.error.message ?? '')) {
          return jsonError(res, 409, 'limit_reached', 'You already have as many collections as an account can hold');
        }
        if (/collection_not_owned/i.test(saved.error.message ?? '')) {
          return jsonError(res, 403, 'forbidden', 'That collection belongs to another account');
        }
        if (/duplicate key/i.test(saved.error.message ?? '')) {
          return jsonError(res, 409, 'name_taken', 'You already have a collection with that name');
        }
        return jsonError(res, 500, 'db_error', 'Could not save the collection');
      }
    } else if (body.op === 'collection-delete') {
      if (typeof body.collectionId !== 'string') return jsonError(res, 400, 'bad_request', 'A collection is required');
      const removed = await withTimeout(
        supabase.rpc('delete_coding_collection', { p_collection_id: body.collectionId, p_user_id: userId }),
      );
      if (removed.error) {
        if (isRpcMissing(removed.error)) return migrationRequired(res);
        return jsonError(res, 500, 'db_error', 'Could not delete the collection');
      }
    } else if (body.op === 'collection-item') {
      const taskId = body.taskId;
      if (typeof body.collectionId !== 'string' || !isCodingTaskId(taskId)) {
        return jsonError(res, 400, 'bad_request', 'A collection and a challenge are required');
      }
      const changed = await withTimeout(
        supabase.rpc('set_coding_collection_item', {
          p_collection_id: body.collectionId, p_user_id: userId, p_task_id: taskId, p_present: body.present === true,
        }),
      );
      if (changed.error) {
        if (isRpcMissing(changed.error)) return migrationRequired(res);
        if (/collection_not_owned/i.test(changed.error.message ?? '')) {
          return jsonError(res, 403, 'forbidden', 'That collection belongs to another account');
        }
        if (/collection_item_limit_reached/i.test(changed.error.message ?? '')) {
          return jsonError(res, 409, 'limit_reached', 'That collection is full');
        }
        return jsonError(res, 500, 'db_error', 'Could not change the collection');
      }
    } else {
      return jsonError(res, 400, 'bad_request', 'Unknown operation');
    }

    const body2 = await readBookmarks(supabase, userId);
    if (body2 === 'missing') return migrationRequired(res);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(body2);
  }

  res.setHeader('Allow', 'GET, PUT');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/* ── skips ────────────────────────────────────────────────────────────── */

/** The learner's passed tasks, for choosing what to offer next. */
async function passedTaskIds(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const rows = await withTimeout(
    supabase.from('coding_progress').select('task_id,status').eq('user_id', userId).eq('status', 'passed'),
  );
  if (rows.error) return new Set();
  return new Set((rows.data ?? []).map((row) => String(row.task_id)));
}

/** POST /api/user/[op]?op=coding-skip */
export async function handleCodingSkip(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!available()) return notAvailable(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as Partial<CodingSkipRequest>;
  if (!isCodingTaskId(body.taskId) || !isSkipReason(body.reason)) {
    return jsonError(res, 400, 'bad_request', 'A challenge and a reason are required');
  }
  const task = SECTION_TASKS.find((one) => one.id === body.taskId);
  if (!task) return jsonError(res, 400, 'bad_request', 'Unknown challenge');
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 280) : '';

  const recorded = await withTimeout(
    supabase.rpc('record_coding_skip', {
      p_user_id: userId, p_task_id: task.id, p_reason: body.reason, p_note: note || null, p_task_version: 1,
    }),
  );
  if (recorded.error) {
    if (isRpcMissing(recorded.error)) return migrationRequired(res);
    return jsonError(res, 500, 'db_error', 'Could not record the skip');
  }

  // Something else to do, from what the learner can already open. A skip never
  // opens anything: the tier gate is applied here exactly as it is everywhere.
  const passed = await passedTaskIds(supabase, userId);
  const next = SECTION_TASKS.find((one) =>
    one.id !== task.id
    && one.track === task.track
    && !passed.has(one.id)
    && tierUnlocked({ track: one.track, tier: one.tier, progress: { passed }, tasks: SECTION_TASKS, javascriptLevelsCleared: 0 }),
  ) ?? null;

  logEvent({ status: 200, kind: 'skip_recorded', reason: body.reason });
  res.setHeader('Cache-Control', 'private, no-store');
  const answer: CodingSkipResponse = {
    recorded: true,
    next: next?.id ?? null,
    // Every task in a Learn level's coding phase is required by that level, so
    // a skip postpones it rather than clearing it. Section tasks are optional.
    required: task.level > 0,
  };
  return res.json(answer);
}

/* ── short practice sessions ──────────────────────────────────────────── */

const estimatedMinutes = (ids: readonly string[]): number =>
  ids.reduce((total, id) => total + (SECTION_TASKS.find((task) => task.id === id)?.estimatedMinutes ?? 0), 0);

const toSession = (row: Record<string, unknown>): PracticeSession => {
  const queue = Array.isArray(row.queue) ? (row.queue as unknown[]).filter((id): id is string => typeof id === 'string') : [];
  return {
    sessionId: String(row.session_id),
    minutes: Number(row.minutes) as PracticeSession['minutes'],
    topic: row.topic == null ? null : String(row.topic),
    queue,
    position: Number(row.position ?? 0),
    status: row.status as PracticeSession['status'],
    estimatedMinutes: estimatedMinutes(queue),
  };
};

/**
 * Build a queue that fits the time the learner has.
 *
 * Review comes first — work that is already due is the point of a short
 * session — then new work, in catalogue order. Every candidate has already
 * passed the tier gate, so the queue can only reorder what was available.
 * The total is an estimate and the response says so.
 */
function buildQueue(input: {
  minutes: number;
  topic: string | null;
  passed: Set<string>;
  due: Set<string>;
}): string[] {
  const eligible = SECTION_TASKS.filter((task) =>
    (!input.topic || task.track === input.topic)
    && tierUnlocked({
      track: task.track, tier: task.tier, progress: { passed: input.passed },
      tasks: SECTION_TASKS, javascriptLevelsCleared: 0,
    }),
  );
  const review = eligible.filter((task) => input.due.has(task.id));
  const fresh = eligible.filter((task) => !input.due.has(task.id) && !input.passed.has(task.id));
  const queue: string[] = [];
  let budget = input.minutes;
  for (const task of [...review, ...fresh]) {
    if (queue.length >= 40) break;
    // Always offer at least one task, even when it is longer than the session:
    // an empty queue helps nobody, and the estimate is labelled as an estimate.
    if (queue.length > 0 && task.estimatedMinutes > budget) continue;
    queue.push(task.id);
    budget -= task.estimatedMinutes;
    if (budget <= 0) break;
  }
  return queue;
}

/** GET/POST/PUT /api/user/[op]?op=practice-session */
export async function handlePracticeSession(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!available()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  if (req.method === 'GET') {
    const row = await withTimeout(
      supabase.from('practice_sessions').select('*').eq('user_id', userId).eq('status', 'active')
        .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    );
    if (row.error) {
      if (isRpcMissing(row.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not load your session');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    const body: PracticeSessionResponse = { session: row.data ? toSession(row.data) : null };
    return res.json(body);
  }

  if (req.method === 'POST') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const body = (req.body || {}) as Partial<PracticeSessionStartRequest>;
    if (!isPracticeSessionMinutes(body.minutes)) {
      return jsonError(res, 400, 'bad_request', 'Choose one of the offered session lengths');
    }
    const topic = typeof body.topic === 'string' && isCodingSectionTrack(body.topic) ? body.topic : null;

    const passed = await passedTaskIds(supabase, userId);
    const dueRows = await withTimeout(
      supabase.from('coding_progress').select('task_id,next_review_at').eq('user_id', userId).not('next_review_at', 'is', null),
    );
    const now = Date.now();
    const due = new Set(
      (dueRows.data ?? [])
        .filter((row) => Date.parse(String(row.next_review_at)) <= now)
        .map((row) => String(row.task_id)),
    );

    const queue = buildQueue({ minutes: body.minutes, topic, passed, due });
    if (queue.length === 0) {
      return jsonError(res, 409, 'nothing_eligible', 'There is nothing eligible to practise right now');
    }
    const sessionId = newId();
    const started = await withTimeout(
      supabase.rpc('start_practice_session', {
        p_session_id: sessionId, p_user_id: userId, p_subject: 'webdev',
        p_minutes: body.minutes, p_topic: topic, p_queue: queue,
      }),
    );
    if (started.error) {
      if (isRpcMissing(started.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not start the session');
    }
    logEvent({ status: 200, kind: 'session_started', minutes: body.minutes, size: queue.length });
    res.setHeader('Cache-Control', 'private, no-store');
    const answer: PracticeSessionResponse = {
      session: {
        sessionId, minutes: body.minutes, topic, queue, position: 0, status: 'active',
        estimatedMinutes: estimatedMinutes(queue),
      },
    };
    return res.json(answer);
  }

  if (req.method === 'PUT') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const body = (req.body || {}) as Partial<PracticeSessionAdvanceRequest>;
    if (typeof body.sessionId !== 'string') return jsonError(res, 400, 'bad_request', 'A session is required');
    if (body.status !== undefined && body.status !== 'finished' && body.status !== 'abandoned') {
      return jsonError(res, 400, 'bad_request', 'A session ends as finished or abandoned');
    }
    const moved = await withTimeout(
      supabase.rpc('advance_practice_session', {
        p_session_id: body.sessionId,
        p_user_id: userId,
        p_position: Number.isInteger(body.position) ? Number(body.position) : null,
        p_status: body.status ?? null,
      }),
    );
    if (moved.error) {
      if (isRpcMissing(moved.error)) return migrationRequired(res);
      return jsonError(res, 500, 'db_error', 'Could not save your place');
    }
    const row = await withTimeout(
      supabase.from('practice_sessions').select('*').eq('session_id', body.sessionId).eq('user_id', userId).maybeSingle(),
    );
    res.setHeader('Cache-Control', 'private, no-store');
    const answer: PracticeSessionResponse = { session: row.data ? toSession(row.data) : null };
    return res.json(answer);
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}
