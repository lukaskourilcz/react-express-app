import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError, createLogger } from '../../lib/http';
import { requireDevPassword } from '../../lib/admin-auth';
import {
  listAdminQuestions,
  saveQuestion,
  setQuestionDeleted,
  resetQuestion,
  KNOWN_CATEGORIES,
} from '../../lib/questions-store';
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
      case 'reset':
        return await resetQuestionOp(req, res);
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
  const questions = await listAdminQuestions();
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ questions, categories: KNOWN_CATEGORIES });
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

  const tags = Array.isArray(b.tags)
    ? b.tags.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= MAX_TAG).slice(0, MAX_TAGS)
    : [];

  const explanation = typeof b.explanation === 'string' ? b.explanation.slice(0, MAX_TEXT) : '';
  const introduction = typeof b.introduction === 'string' ? b.introduction.slice(0, MAX_TEXT) : '';
  const id = boundedString(b.id, 64) ?? undefined;

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
