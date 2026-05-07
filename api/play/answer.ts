import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, jsonError, isShortString, logEvent } from './_lib';

interface MatchQuestion {
  id: string;
  correct_index: number;
}

const MAX_BONUS = 50; // points awarded for instant correct answer
const DEFAULT_DURATION_S = 30;

function computeSpeedBonus(elapsedMs: number, durationS: number): number {
  if (elapsedMs <= 0) return MAX_BONUS;
  const fraction = Math.max(0, 1 - elapsedMs / (durationS * 1000));
  return Math.round(fraction * MAX_BONUS);
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

  const clientDuration =
    typeof body.duration_ms === 'number' && body.duration_ms >= 0 && body.duration_ms < 5 * 60 * 1000
      ? Math.round(body.duration_ms)
      : null;

  const code = body.code.toUpperCase();
  const { data: match } = await supabase
    .from('matches')
    .select('id, status, current_index, questions, question_started_at, question_duration_s')
    .eq('code', code)
    .maybeSingle();
  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
  if (match.status !== 'running') return jsonError(res, 409, 'bad_state', 'Match is not in progress');
  if (body.question_idx !== match.current_index)
    return jsonError(res, 409, 'wrong_question', 'That is not the current question');

  const questions = match.questions as MatchQuestion[];
  const q = questions[body.question_idx];
  if (!q) return jsonError(res, 400, 'bad_request', 'question_idx out of range');

  // Authoritative elapsed time from question_started_at; fall back to
  // client-supplied duration_ms if the column isn't populated yet.
  let serverElapsedMs = 0;
  if (match.question_started_at) {
    serverElapsedMs = Date.now() - new Date(match.question_started_at).getTime();
  } else if (clientDuration !== null) {
    serverElapsedMs = clientDuration;
  }

  const isCorrect = q.correct_index === body.selected_idx;
  const durationS = match.question_duration_s ?? DEFAULT_DURATION_S;
  const speedBonus = isCorrect ? computeSpeedBonus(serverElapsedMs, durationS) : 0;

  const { error } = await supabase.from('match_answers').upsert({
    match_id: match.id,
    auth0_sub: body.auth0_sub,
    question_id: q.id,
    question_idx: body.question_idx,
    selected_idx: body.selected_idx,
    is_correct: isCorrect,
    duration_ms: serverElapsedMs,
    speed_bonus: speedBonus,
  });

  if (error) {
    logEvent('play/answer', { status: 500, error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not record answer');
  }

  logEvent('play/answer', { status: 200, code, q: body.question_idx, ok: isCorrect, bonus: speedBonus });
  return res.json({ ok: true, is_correct: isCorrect, speed_bonus: speedBonus });
}
