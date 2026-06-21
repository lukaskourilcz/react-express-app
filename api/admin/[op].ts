import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError, createLogger } from '../../lib/http';
import { requireDevPassword } from '../../lib/admin-auth';
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

const log = createLogger('admin');

const MAX_TEXT = 4000;
const MAX_OPTION = 2000;
const MAX_TAG = 60;
const MAX_TAGS = 20;
const MAX_OPTIONS = 8;
const MIN_OPTIONS = 2;

const boundedString = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Every admin op is password-gated.
  if (!requireDevPassword(req, res)) return;

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

async function listQuestions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const [questions, counts] = await Promise.all([listAdminQuestions(), reportCounts()]);
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ questions, categories: KNOWN_CATEGORIES, reportCounts: counts });
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
