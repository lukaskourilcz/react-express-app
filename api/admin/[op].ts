import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { isRetiredTopic } from '../../shared/retired-content';
import { createServiceClient, jsonError, createLogger, withTimeout, withRequestContext } from '../../lib/http';
import { requireAdmin } from '../../lib/admin-auth';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import {
  listAdminQuestions,
  saveQuestion,
  setQuestionDeleted,
  resetQuestion,
  bulkHideByImportance,
  KNOWN_CATEGORIES,
} from '../../lib/questions-store';
import { listReports, dismissReport, reportCounts } from '../../lib/reports-store';
import { listAuthEvents } from '../../lib/auth-events-store';
import { getGameSettings, saveGameSettings } from '../../lib/settings-store';
import {
  INTEGRITY_STATUSES,
  VELOCITY_RULES,
  listIntegrityFlags,
  resolveIntegrityFlag,
  type IntegrityStatus,
} from '../../lib/integrity';
import { inspectQuestionQuality } from '../../lib/question-quality';
import { allReadiness, pathEnabledInEnv } from '../../lib/learning-paths/catalog';

const log = createLogger('admin');
const supabase = createServiceClient();

const MAX_TEXT = 4000;
const MAX_OPTION = 2000;
const MAX_TAG = 60;
const MAX_TAGS = 20;
const MAX_OPTIONS = 8;
const MIN_OPTIONS = 2;

const boundedString = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  // Anti-brute-force: at most ~1 auth attempt per second per IP, small burst.
  // Runs before password check so wrong guesses count toward the budget.
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.admin))) return;
  // Prefer a verified Supabase admin/allowlist identity. The old shared
  // password is available in production only when explicitly enabled.
  if (!(await requireAdmin(req, res))) return;

  const op = String(req.query.op || '').toLowerCase();
  try {
    switch (op) {
      case 'questions':
        return await listQuestions(req, res);
      case 'save':
        return await saveQuestionOp(req, res);
      case 'delete':
        return await deleteQuestionOp(req, res);
      case 'bulkhide':
        return await bulkHideOp(req, res);
      case 'reset':
        return await resetQuestionOp(req, res);
      case 'reports':
        return await reportsOp(req, res);
      case 'logs':
        return await logsOp(req, res);
      case 'settings':
        return await settingsOp(req, res);
      case 'quality':
        return await qualityOp(req, res);
      case 'learning-paths':
        return await learningPathsOp(req, res);
      case 'retention':
        return await retentionOp(req, res);
      case 'integrity':
        return await integrityOp(req, res);
      default:
        return jsonError(res, 404, 'unknown_op', `Unknown admin op: ${op}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log({ op, status: 500, error: message });
    if (message === 'not_configured') {
      return jsonError(res, 503, 'not_configured', 'Admin backend (Supabase) is not configured');
    }
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}

/**
 * Learning-path content readiness.
 *
 * Read-only, and deliberately so: publishing authority stays with code review.
 * This reports what the validator found, the real inventory derived from the
 * manifest, and whether the deployment switch is on — three separate facts, so
 * an operator can tell "content incomplete" apart from "switched off". No
 * request can mark an invalid curriculum ready.
 */
async function learningPathsOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const paths = allReadiness().map((readiness) => ({
    pathId: readiness.pathId,
    version: readiness.version,
    contentReady: readiness.contentReady,
    enabledInEnv: pathEnabledInEnv(readiness.pathId),
    inventory: readiness.inventory,
    issues: readiness.issues,
  }));
  log({ op: 'learning-paths', status: 200, paths: paths.length });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({ paths });
}

/**
 * Day-over-day return rate: of the people who learned something yesterday, how
 * many came back today.
 *
 * Read-only, and operator-only on purpose. It is the one number the weekly
 * league is judged by, and it is a fact about the product rather than about the
 * learner reading it, so it appears on `/dev` and on no reader surface. Nothing
 * here can be turned into a ranking: the rows carry counts and a percentage,
 * never an account.
 */
async function retentionOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Retention data is not configured');

  const requested = parseInt(String(req.query.days ?? ''), 10);
  const days = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 90) : 14;

  const { data, error } = await withTimeout(supabase.rpc('daily_return_rate', { p_days: days }));
  if (error) {
    if (/does not exist|schema cache/i.test(error.message ?? '')) {
      log({ op: 'retention', status: 503, reason: 'migration_required' });
      return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-038.sql to enable the return rate');
    }
    log({ op: 'retention', status: 500, error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not load the return rate');
  }

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  log({ op: 'retention', status: 200, days, rows: rows.length });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    days,
    rows: rows.map((row) => ({
      day: String(row.day ?? ''),
      priorActive: Number(row.prior_active ?? 0),
      returned: Number(row.returned ?? 0),
      ratePct: Number(row.rate_pct ?? 0),
    })),
  });
}

/**
 * The progression-velocity review list.
 *
 * Read and decide, and nothing else. There is deliberately no path from this
 * endpoint to a score, a rank, an account or a board: the strongest verdict the
 * owner can record here is "confirmed", which marks the row and leaves every
 * number the flagged account earned exactly where it was. Removing a score, if
 * it ever comes to that, stays a separate, deliberate act.
 */
async function integrityOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'The review list is not configured');

  const migrationPending = (message: string | undefined): boolean =>
    /does not exist|schema cache/i.test(message ?? '');

  if (req.method === 'POST') {
    const body = (req.body || {}) as { userId?: unknown; surface?: unknown; signal?: unknown; status?: unknown; note?: unknown };
    const surface = boundedString(body.surface, 32);
    const signal = boundedString(body.signal, 64);
    const status = typeof body.status === 'string' && (INTEGRITY_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as IntegrityStatus)
      : null;
    if (!surface || !signal || !status) {
      return jsonError(res, 400, 'bad_request', `surface, signal and a status of ${INTEGRITY_STATUSES.join(', ')} are required`);
    }
    const userId = typeof body.userId === 'string' ? body.userId.slice(0, 128) : '';
    const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim().slice(0, 500) : null;
    try {
      const flag = await resolveIntegrityFlag(supabase, { userId, surface, signal, status, note });
      if (!flag) return jsonError(res, 404, 'not_found', 'No such flag');
      log({ op: 'integrity', status: 200, action: 'resolve', decision: status });
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json({ flag });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (migrationPending(message)) {
        return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-041.sql to enable the review list');
      }
      log({ op: 'integrity', status: 500, action: 'resolve', error: message });
      return jsonError(res, 500, 'db_error', 'Could not record the decision');
    }
  }

  const requestedStatus = typeof req.query.status === 'string' ? req.query.status : 'open';
  const status = (INTEGRITY_STATUSES as readonly string[]).includes(requestedStatus)
    ? (requestedStatus as IntegrityStatus)
    : 'all';
  const requestedLimit = parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 300) : 100;

  try {
    const flags = await listIntegrityFlags(supabase, { status, limit });
    log({ op: 'integrity', status: 200, action: 'list', flags: flags.length });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ status, rules: VELOCITY_RULES, flags });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (migrationPending(message)) {
      log({ op: 'integrity', status: 503, reason: 'migration_required' });
      return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-041.sql to enable the review list');
    }
    log({ op: 'integrity', status: 500, action: 'list', error: message });
    return jsonError(res, 500, 'db_error', 'Could not load the review list');
  }
}

async function qualityOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const rawCategories = typeof req.query.categories === 'string'
    ? req.query.categories.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
  const categorySet = new Set(rawCategories.filter((value) => (KNOWN_CATEGORIES as string[]).includes(value)));
  const questions = (await listAdminQuestions()).filter((question) => categorySet.size === 0 || categorySet.has(question.category));
  const issues = inspectQuestionQuality(questions);
  const enabled = process.env.QUESTION_QUALITY_ASSISTANT_ENABLED === 'true';

  if (req.method === 'POST') {
    if (!enabled) {
      return jsonError(res, 409, 'feature_disabled', 'Enable QUESTION_QUALITY_ASSISTANT_ENABLED to store suggestions');
    }
    if (!supabase) return jsonError(res, 503, 'not_configured', 'Suggestion storage is not configured');
    let stored = 0;
    for (let offset = 0; offset < issues.length; offset += 250) {
      const batch = issues.slice(offset, offset + 250).map((issue) => ({
        question_id: issue.questionId,
        question_hash: issue.questionHash,
        source: 'deterministic',
        kind: issue.kind,
        content: { severity: issue.severity, message: issue.message, suggestion: issue.suggestion },
        status: 'pending',
      }));
      const result = await withTimeout(
        supabase.from('question_quality_suggestions').upsert(batch, {
          onConflict: 'question_id,question_hash,source,kind',
          ignoreDuplicates: true,
        }),
        5000,
      );
      if (result.error) return jsonError(res, 500, 'db_error', 'Could not store quality suggestions');
      stored += batch.length;
    }
    log({ op: 'quality', status: 200, scanned: questions.length, issues: issues.length, stored });
    return res.json({ enabled, scanned: questions.length, issues, stored });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ enabled, scanned: questions.length, issues });
}

async function listQuestions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const [questions, counts] = await Promise.all([listAdminQuestions(), reportCounts()]);
  res.setHeader('Cache-Control', 'no-store');
  // A retired section is not offered as somewhere to publish. Existing
  // questions in one still load and still save — the category stays valid,
  // it is simply no longer a choice.
  return res.json({
    questions,
    categories: KNOWN_CATEGORIES.filter((category) => !isRetiredTopic(category)),
    reportCounts: counts,
  });
}

async function saveQuestionOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const b = (req.body || {}) as Record<string, unknown>;

  const question = boundedString(b.question, MAX_TEXT);
  if (!question) return jsonError(res, 400, 'bad_request', 'question is required');

  const options = Array.isArray(b.options)
    ? b.options.filter((o): o is string => typeof o === 'string' && o.length > 0 && o.length <= MAX_OPTION)
    : [];
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return jsonError(res, 400, 'bad_request', `Provide ${MIN_OPTIONS}–${MAX_OPTIONS} non-empty options`);
  }

  const correctIndex =
    typeof b.correctIndex === 'number' && Number.isInteger(b.correctIndex) ? b.correctIndex : -1;
  if (correctIndex < 0 || correctIndex >= options.length) {
    return jsonError(res, 400, 'bad_request', 'correctIndex is out of range');
  }

  const category = typeof b.category === 'string' && (KNOWN_CATEGORIES as string[]).includes(b.category)
    ? b.category
    : null;
  if (!category) return jsonError(res, 400, 'bad_request', 'invalid category');

  const difficulty = typeof b.difficulty === 'number' ? b.difficulty : 1;

  // Optional per-question importance override (1–10); omit to keep the score.
  const importance =
    typeof b.importance === 'number' && Number.isInteger(b.importance) && b.importance >= 1 && b.importance <= 10
      ? b.importance
      : undefined;

  const tags = Array.isArray(b.tags)
    ? b.tags.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= MAX_TAG).slice(0, MAX_TAGS)
    : [];

  const explanation = typeof b.explanation === 'string' ? b.explanation.slice(0, MAX_TEXT) : '';
  const introduction = typeof b.introduction === 'string' ? b.introduction.slice(0, MAX_TEXT) : '';
  const id = boundedString(b.id, 64) ?? undefined;

  // Optional Czech translation. Empty fields become null (fall back to English);
  // cs options must stay parallel to the English options or they are ignored.
  const csRaw = (b.cs && typeof b.cs === 'object' ? b.cs : {}) as Record<string, unknown>;
  const csText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.slice(0, MAX_TEXT) : null);
  const csOptions = Array.isArray(csRaw.options)
    ? csRaw.options.map((o) => (typeof o === 'string' ? o.slice(0, MAX_OPTION) : ''))
    : null;
  const cs = {
    question: csText(csRaw.question),
    options: csOptions && csOptions.some((o) => o.trim()) ? csOptions : null,
    introduction: csText(csRaw.introduction),
    explanation: csText(csRaw.explanation),
  };

  const saved = await saveQuestion({
    id,
    question,
    options,
    correctIndex,
    explanation,
    introduction,
    category,
    tags,
    difficulty,
    importance,
    cs,
  });
  log({ op: 'save', status: 200, id: saved.id });
  return res.json({ ok: true, id: saved.id });
}

async function deleteQuestionOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const b = (req.body || {}) as { id?: unknown; deleted?: unknown };
  const id = boundedString(b.id, 64);
  if (!id) return jsonError(res, 400, 'bad_request', 'id is required');
  // `deleted: false` restores a soft-deleted base question; default is delete.
  const deleted = b.deleted === false ? false : true;
  await setQuestionDeleted(id, deleted);
  log({ op: 'delete', status: 200, id, deleted });
  return res.json({ ok: true });
}

async function bulkHideOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const b = (req.body || {}) as { maxImportance?: unknown };
  const max =
    typeof b.maxImportance === 'number' && Number.isInteger(b.maxImportance) && b.maxImportance >= 1 && b.maxImportance <= 10
      ? b.maxImportance
      : null;
  if (max === null) return jsonError(res, 400, 'bad_request', 'maxImportance must be an integer 1–10');
  const hidden = await bulkHideByImportance(max);
  log({ op: 'bulkhide', status: 200, max, hidden });
  return res.json({ ok: true, hidden });
}

async function resetQuestionOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const b = (req.body || {}) as { id?: unknown };
  const id = boundedString(b.id, 64);
  if (!id) return jsonError(res, 400, 'bad_request', 'id is required');
  await resetQuestion(id);
  log({ op: 'reset', status: 200, id });
  return res.json({ ok: true });
}

async function reportsOp(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const reports = await listReports();
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ reports });
  }
  if (req.method === 'POST') {
    const b = (req.body || {}) as { id?: unknown };
    const id = boundedString(b.id, 64);
    if (!id) return jsonError(res, 400, 'bad_request', 'id is required');
    await dismissReport(id);
    log({ op: 'reports', status: 200, dismissed: id });
    return res.json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

// Auth events log (registrations + logins) for the Logs tab.
async function logsOp(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const events = await listAuthEvents(200);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ events });
}

async function settingsOp(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const settings = await getGameSettings();
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ settings });
  }
  if (req.method === 'POST') {
    const b = (req.body || {}) as { settings?: unknown };
    const settings = await saveGameSettings(b.settings ?? b);
    log({ op: 'settings', status: 200 });
    return res.json({ settings });
  }
  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}
