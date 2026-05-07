import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, jsonError, isShortString, logEvent } from './_lib';

interface MatchQuestion {
  id: string;
  correct_index: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const body = (req.body || {}) as {
    code?: unknown;
    auth0_sub?: unknown;
    question_idx?: unknown;
    selected_idx?: unknown;
    duration_ms?: unknown;
  };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  if (!isShortString(body.auth0_sub)) return jsonError(res, 400, 'bad_request', 'auth0_sub required');
  if (typeof body.question_idx !== 'number' || !Number.isInteger(body.question_idx) || body.question_idx < 0)
    return jsonError(res, 400, 'bad_request', 'question_idx must be a non-negative integer');
  if (typeof body.selected_idx !== 'number' || !Number.isInteger(body.selected_idx) || body.selected_idx < 0 || body.selected_idx > 25)
    return jsonError(res, 400, 'bad_request', 'selected_idx out of range');
  const duration = typeof body.duration_ms === 'number' && body.duration_ms >= 0 && body.duration_ms < 5 * 60 * 1000
    ? Math.round(body.duration_ms)
    : 0;

  const code = body.code.toUpperCase();
  const { data: match } = await supabase
    .from('matches')
    .select('id, status, current_index, questions')
    .eq('code', code)
    .maybeSingle();
  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
  if (match.status !== 'running') return jsonError(res, 409, 'bad_state', 'Match is not in progress');
  if (body.question_idx !== match.current_index)
    return jsonError(res, 409, 'wrong_question', 'That is not the current question');

  const questions = match.questions as MatchQuestion[];
  const q = questions[body.question_idx];
  if (!q) return jsonError(res, 400, 'bad_request', 'question_idx out of range');

  const isCorrect = q.correct_index === body.selected_idx;

  const { error } = await supabase.from('match_answers').upsert({
    match_id: match.id,
    auth0_sub: body.auth0_sub,
    question_id: q.id,
    question_idx: body.question_idx,
    selected_idx: body.selected_idx,
    is_correct: isCorrect,
    duration_ms: duration,
  });

  if (error) {
    logEvent('play/answer', { status: 500, error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not record answer');
  }

  logEvent('play/answer', { status: 200, code, q: body.question_idx, ok: isCorrect });
  return res.json({ ok: true, is_correct: isCorrect });
}
