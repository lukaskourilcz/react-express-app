import type { VercelRequest, VercelResponse } from '@vercel/node';
import { questions, secureShuffle } from '../quiz/data';
import { supabase, jsonError, generateMatchCode, isShortString, logEvent } from './_lib';

const MAX_QUESTIONS = 20;
const MIN_QUESTIONS = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) {
    return jsonError(res, 503, 'not_configured', 'Match backend is not configured');
  }

  const body = (req.body || {}) as {
    host_sub?: unknown;
    host_name?: unknown;
    mode?: unknown;
    count?: unknown;
    categories?: unknown;
  };

  if (!isShortString(body.host_sub)) return jsonError(res, 400, 'bad_request', 'host_sub required');
  const hostSub = body.host_sub;
  const hostName =
    isShortString(body.host_name, 80) ? body.host_name : 'Host';
  const mode = body.mode === 'classroom' ? 'classroom' : 'multiplayer';
  const requestedCount = typeof body.count === 'number' ? body.count : 10;
  const count = Math.min(Math.max(Math.floor(requestedCount), MIN_QUESTIONS), MAX_QUESTIONS);
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === 'string')
    : [];

  // Pick questions (shuffle pool, slice, then shuffle each option set).
  const pool = categories.length
    ? questions.filter((q) => categories.includes(q.category))
    : questions;
  if (pool.length < MIN_QUESTIONS) {
    return jsonError(res, 400, 'too_few_questions', 'Not enough questions for these filters');
  }

  const selected = secureShuffle(pool).slice(0, count);
  const matchQuestions = selected.map((q) => {
    const correctText = q.options[q.correctAnswer];
    const opts = secureShuffle(q.options);
    return {
      id: q.id,
      question: q.question,
      options: opts,
      correct_index: opts.indexOf(correctText),
      explanation: q.explanation,
      category: q.category,
      difficulty: q.difficulty,
    };
  });

  // Generate a unique code (retry on collision; should be vanishingly rare).
  let code = generateMatchCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase.from('matches').select('id').eq('code', code).maybeSingle();
    if (!clash) break;
    code = generateMatchCode();
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({
      code,
      mode,
      host_sub: hostSub,
      host_name: hostName,
      status: 'lobby',
      questions: matchQuestions,
      current_index: 0,
    })
    .select('id, code, mode, host_sub, host_name, status')
    .single();

  if (error || !data) {
    logEvent('play/create', { status: 500, error: error?.message });
    return jsonError(res, 500, 'db_error', 'Could not create match');
  }

  // Host is always a participant.
  await supabase
    .from('match_participants')
    .insert({ match_id: data.id, auth0_sub: hostSub, display_name: hostName });

  logEvent('play/create', { status: 200, code, mode, count });
  return res.json({
    id: data.id,
    code: data.code,
    mode: data.mode,
    host_sub: data.host_sub,
    host_name: data.host_name,
    status: data.status,
  });
}
