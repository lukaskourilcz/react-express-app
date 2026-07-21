import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';
import { createServiceClient, jsonError, withTimeout, requireAuthSub, withRequestContext } from '../lib/http';
import { enforceRateLimit, RATE_LIMITS } from '../lib/rate-limit';
import { deploymentSubjectIds } from '../lib/product-scope';
import { isScopeSubject, subjectForCategory } from '../shared/subject-catalog';
import { getEffectiveQuestionsById } from '../lib/questions-store';

const supabase = createServiceClient();

const FIELDS = 'question_id,question,category,correct_answer,explanation,created_at,subject';
const MAX = { id: 64, short: 128, text: 4000, answer: 2000 };

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  const rawSubject = req.method === 'POST'
    ? (req.body as { subject?: unknown } | undefined)?.subject
    : req.query.subject;
  if (!isScopeSubject(rawSubject) || !deploymentSubjectIds().includes(rawSubject)) {
    return jsonError(res, 400, 'invalid_subject_scope', 'A subject from this deployment is required');
  }
  const subject = rawSubject;
  if (req.method !== 'GET' && !(await enforceRateLimit(req, res, RATE_LIMITS.flashcardMutation))) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await withTimeout(
        supabase
          .from('flashcards')
          .select(FIELDS)
          .eq('user_id', userId)
          .eq('subject', subject)
          .order('created_at', { ascending: false }),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not load cards');
      return res.json({ cards: data ?? [] });
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as Record<string, unknown>;
      const question_id = str(body.question_id, MAX.id);
      const question = str(body.question, MAX.text);
      const correct_answer = str(body.correct_answer, MAX.answer);
      if (!question_id || !question || !correct_answer) {
        return jsonError(res, 400, 'bad_request', 'question_id, question and correct_answer are required');
      }
      const bank = await getEffectiveQuestionsById(subject, false);
      const source = bank.get(question_id);
      if (!source || subjectForCategory(source.category) !== subject) {
        return jsonError(res, 400, 'invalid_question', 'Question does not belong to this subject');
      }
      const row = {
        user_id: userId,
        subject,
        question_id,
        question,
        category: source.category,
        correct_answer,
        explanation: str(body.explanation, MAX.text),
      };
      const { data, error } = await withTimeout(
        supabase.from('flashcards').upsert(row, { onConflict: 'user_id,question_id' }).select(FIELDS).single(),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not save card');
      return res.json({ card: data });
    }

    if (req.method === 'DELETE') {
      const qid =
        (typeof req.query.question_id === 'string' && req.query.question_id) ||
        (typeof (req.body as { question_id?: unknown })?.question_id === 'string' &&
          (req.body as { question_id: string }).question_id);
      if (!qid) return jsonError(res, 400, 'bad_request', 'question_id is required');
      const { error } = await withTimeout(
        supabase.from('flashcards').delete().eq('user_id', userId).eq('subject', subject).eq('question_id', qid),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not delete card');
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
