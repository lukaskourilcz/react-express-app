import type { VercelRequest, VercelResponse } from '@vercel/node';
import { questions, secureShuffle } from '../../lib/quiz-data';
import {
  supabase,
  jsonError,
  isShortString,
  logEvent,
  generateMatchCode,
} from '../../lib/play-helpers';
import { authenticate } from '../../lib/auth';
import { withSentry } from '../../lib/observability';

const MAX_QUESTIONS = 20;
const MIN_QUESTIONS = 3;
const QUESTION_DURATION_S = 30;
const MAX_BONUS = 50;
const PING_GRACE_MS = 1000;
const STALE_MATCH_MS = 5 * 60 * 1000;

interface MatchQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  category: string;
  difficulty: number;
}

function computeSpeedBonus(elapsedMs: number, durationS: number): number {
  if (elapsedMs <= 0) return MAX_BONUS;
  const fraction = Math.max(0, 1 - elapsedMs / (durationS * 1000));
  return Math.round(fraction * MAX_BONUS);
}

export default withSentry(async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const action = String(req.query.action || '').toLowerCase();

  switch (action) {
    case 'create':
      return create(req, res);
    case 'join':
      return join(req, res);
    case 'state':
      return state(req, res);
    case 'control':
      return control(req, res);
    case 'answer':
      return answer(req, res);
    case 'distribution':
      return distribution(req, res);
    case 'heartbeat':
      return heartbeat(req, res);
    default:
      return jsonError(res, 404, 'unknown_action', `Unknown play action: ${action}`);
  }
});

async function create(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const body = (req.body || {}) as {
    host_sub?: unknown;
    host_name?: unknown;
    mode?: unknown;
    count?: unknown;
    categories?: unknown;
  };

  const auth = await authenticate(
    req,
    typeof body.host_sub === 'string' ? body.host_sub : undefined,
  );
  if (!auth.ok) return jsonError(res, auth.status, auth.code, auth.message);
  const hostSub = auth.sub;
  const hostName = isShortString(body.host_name, 80) ? body.host_name : 'Host';
  const mode = body.mode === 'classroom' ? 'classroom' : 'multiplayer';
  const requestedCount = typeof body.count === 'number' ? body.count : 10;
  const count = Math.min(Math.max(Math.floor(requestedCount), MIN_QUESTIONS), MAX_QUESTIONS);
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === 'string')
    : [];

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

  let code = generateMatchCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase!.from('matches').select('id').eq('code', code).maybeSingle();
    if (!clash) break;
    code = generateMatchCode();
  }

  const { data, error } = await supabase!
    .from('matches')
    .insert({
      code,
      mode,
      host_sub: hostSub,
      host_name: hostName,
      status: 'lobby',
      questions: matchQuestions,
      current_index: 0,
      last_heartbeat_at: new Date().toISOString(),
    })
    .select('id, code, mode, host_sub, host_name, status')
    .single();

  if (error || !data) {
    logEvent('play/create', { status: 500, error: error?.message });
    return jsonError(res, 500, 'db_error', 'Could not create match');
  }

  await supabase!
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

async function join(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const body = (req.body || {}) as { code?: unknown; auth0_sub?: unknown; display_name?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  const auth = await authenticate(
    req,
    typeof body.auth0_sub === 'string' ? body.auth0_sub : undefined,
  );
  if (!auth.ok) return jsonError(res, auth.status, auth.code, auth.message);
  if (!isShortString(body.display_name, 60))
    return jsonError(res, 400, 'bad_request', 'display_name required');

  const code = body.code.toUpperCase();
  const { data: match, error } = await supabase!
    .from('matches')
    .select('id, code, mode, host_sub, host_name, status, current_index, questions, question_started_at, question_duration_s')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    logEvent('play/join', { status: 500, error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not look up match');
  }
  if (!match) return jsonError(res, 404, 'not_found', 'No match with that code');
  if (match.status === 'finished') return jsonError(res, 410, 'finished', 'Match is over');

  await supabase!.from('match_participants').upsert(
    { match_id: match.id, auth0_sub: auth.sub, display_name: body.display_name },
    { onConflict: 'match_id,auth0_sub' },
  );

  const isHost = match.host_sub === auth.sub;
  const sanitized = (match.questions as Array<Record<string, unknown>>).map((q) => {
    if (isHost) return q;
    const { correct_index: _ci, explanation: _e, ...rest } = q as Record<string, unknown> & {
      correct_index?: unknown;
      explanation?: unknown;
    };
    return { ...rest, explanation: _e };
  });

  logEvent('play/join', { status: 200, code });
  return res.json({
    id: match.id,
    code: match.code,
    mode: match.mode,
    status: match.status,
    host_sub: match.host_sub,
    host_name: match.host_name,
    current_index: match.current_index,
    question_started_at: match.question_started_at,
    question_duration_s: match.question_duration_s,
    questions: sanitized,
  });
}

async function state(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const code = (req.query.code as string)?.toUpperCase();
  const sub = req.query.auth0_sub as string;
  if (!code) return jsonError(res, 400, 'bad_request', 'code required');

  let { data: match } = await supabase!
    .from('matches')
    .select(
      'id, code, mode, host_sub, host_name, status, current_index, questions, ended_at, question_started_at, question_duration_s, last_heartbeat_at, started_at',
    )
    .eq('code', code)
    .maybeSingle();

  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');

  // Lazy auto-finish ghost matches.
  if (match.status === 'running') {
    const ref = match.last_heartbeat_at ?? match.started_at;
    if (ref && Date.now() - new Date(ref).getTime() > STALE_MATCH_MS) {
      const { data: updated } = await supabase!
        .from('matches')
        .update({ status: 'finished', ended_at: new Date().toISOString() })
        .eq('id', match.id)
        .select(
          'id, code, mode, host_sub, host_name, status, current_index, questions, ended_at, question_started_at, question_duration_s, last_heartbeat_at, started_at',
        )
        .single();
      if (updated) match = updated;
    }
  }

  const { data: participants } = await supabase!
    .from('match_participants')
    .select('auth0_sub, display_name, joined_at')
    .eq('match_id', match.id)
    .order('joined_at', { ascending: true });

  const { data: scoreboard } = await supabase!.rpc('match_scoreboard', { p_match_id: match.id });

  const isHost = sub === match.host_sub;
  const sanitizedQuestions = (match.questions as Array<Record<string, unknown>>).map((q) => {
    if (isHost || match.status === 'finished') return q;
    const { correct_index: _ci, explanation: _e, ...rest } = q;
    return rest;
  });

  return res.json({
    match: { ...match, questions: sanitizedQuestions },
    participants: participants ?? [],
    scoreboard: scoreboard ?? [],
  });
}

async function control(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const body = (req.body || {}) as { code?: unknown; host_sub?: unknown; action?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  const auth = await authenticate(
    req,
    typeof body.host_sub === 'string' ? body.host_sub : undefined,
  );
  if (!auth.ok) return jsonError(res, auth.status, auth.code, auth.message);
  if (body.action !== 'start' && body.action !== 'advance' && body.action !== 'finish') {
    return jsonError(res, 400, 'bad_request', 'action must be start | advance | finish');
  }
  const ctrl = body.action as 'start' | 'advance' | 'finish';
  const code = body.code.toUpperCase();

  const { data: match } = await supabase!
    .from('matches')
    .select('id, host_sub, status, current_index, questions')
    .eq('code', code)
    .maybeSingle();

  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
  if (match.host_sub !== auth.sub)
    return jsonError(res, 403, 'forbidden', 'Only the host can do this');

  const totalQuestions = Array.isArray(match.questions) ? match.questions.length : 0;
  const patch: Record<string, unknown> = {};
  const now = new Date().toISOString();

  if (ctrl === 'start') {
    if (match.status !== 'lobby') return jsonError(res, 409, 'bad_state', 'Match already started');
    patch.status = 'running';
    patch.current_index = 0;
    patch.started_at = now;
    patch.question_started_at = now;
    patch.question_duration_s = QUESTION_DURATION_S;
  } else if (ctrl === 'advance') {
    if (match.status !== 'running') return jsonError(res, 409, 'bad_state', 'Match is not running');
    const next = (match.current_index ?? 0) + 1;
    if (next >= totalQuestions) {
      patch.status = 'finished';
      patch.ended_at = now;
    } else {
      patch.current_index = next;
      patch.question_started_at = now;
    }
  } else {
    patch.status = 'finished';
    patch.ended_at = now;
  }
  patch.last_heartbeat_at = now;

  const { error } = await supabase!.from('matches').update(patch).eq('id', match.id);
  if (error) {
    logEvent('play/control', { status: 500, error: error.message, action: ctrl });
    return jsonError(res, 500, 'db_error', 'Could not update match');
  }

  logEvent('play/control', { status: 200, code, action: ctrl });
  return res.json({ ok: true, ...patch });
}

async function answer(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const body = (req.body || {}) as {
    code?: unknown;
    auth0_sub?: unknown;
    question_idx?: unknown;
    selected_idx?: unknown;
    duration_ms?: unknown;
    client_received_at?: unknown;
  };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  const auth = await authenticate(
    req,
    typeof body.auth0_sub === 'string' ? body.auth0_sub : undefined,
  );
  if (!auth.ok) return jsonError(res, auth.status, auth.code, auth.message);
  if (typeof body.question_idx !== 'number' || !Number.isInteger(body.question_idx) || body.question_idx < 0)
    return jsonError(res, 400, 'bad_request', 'question_idx must be a non-negative integer');
  if (typeof body.selected_idx !== 'number' || !Number.isInteger(body.selected_idx) || body.selected_idx < 0 || body.selected_idx > 25)
    return jsonError(res, 400, 'bad_request', 'selected_idx out of range');

  const clientDuration =
    typeof body.duration_ms === 'number' && body.duration_ms >= 0 && body.duration_ms < 5 * 60 * 1000
      ? Math.round(body.duration_ms)
      : null;
  const clientReceivedAt =
    typeof body.client_received_at === 'string' && body.client_received_at.length <= 64
      ? new Date(body.client_received_at).getTime()
      : null;

  const code = body.code.toUpperCase();
  const { data: match } = await supabase!
    .from('matches')
    .select('id, status, current_index, questions, question_started_at, question_duration_s')
    .eq('code', code)
    .maybeSingle();
  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
  if (match.status !== 'running') return jsonError(res, 409, 'bad_state', 'Match is not in progress');
  if (body.question_idx !== match.current_index)
    return jsonError(res, 409, 'wrong_question', 'That is not the current question');

  const matchQuestions = match.questions as MatchQuestion[];
  const q = matchQuestions[body.question_idx];
  if (!q) return jsonError(res, 400, 'bad_request', 'question_idx out of range');

  const questionStartMs = match.question_started_at
    ? new Date(match.question_started_at).getTime()
    : null;

  let serverElapsedMs = 0;
  if (questionStartMs) {
    serverElapsedMs = Date.now() - questionStartMs;
    if (clientReceivedAt !== null && Number.isFinite(clientReceivedAt)) {
      const cappedReceived = Math.min(
        Math.max(clientReceivedAt, questionStartMs),
        questionStartMs + PING_GRACE_MS,
      );
      serverElapsedMs = Math.max(0, Date.now() - cappedReceived);
    }
  } else if (clientDuration !== null) {
    serverElapsedMs = clientDuration;
  }

  const isCorrect = q.correct_index === body.selected_idx;
  const durationS = match.question_duration_s ?? QUESTION_DURATION_S;
  const speedBonus = isCorrect ? computeSpeedBonus(serverElapsedMs, durationS) : 0;

  const { error } = await supabase!.from('match_answers').upsert({
    match_id: match.id,
    auth0_sub: auth.sub,
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

async function distribution(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const code = (req.query.code as string)?.toUpperCase();
  const qParam = parseInt(req.query.q as string, 10);
  if (!code) return jsonError(res, 400, 'bad_request', 'code required');
  if (!Number.isFinite(qParam) || qParam < 0)
    return jsonError(res, 400, 'bad_request', 'q (question index) required');

  const { data: match } = await supabase!
    .from('matches')
    .select('id, host_sub')
    .eq('code', code)
    .maybeSingle();

  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');

  const claimedSub = req.query.auth0_sub as string;
  const auth = await authenticate(req, claimedSub);
  if (!auth.ok) return jsonError(res, auth.status, auth.code, auth.message);
  if (auth.sub !== match.host_sub) {
    return jsonError(res, 403, 'forbidden', 'Only the host can view distribution');
  }

  const { data, error } = await supabase!.rpc('match_question_distribution', {
    p_match_id: match.id,
    p_question_idx: qParam,
  });

  if (error) {
    if (/function .* does not exist/i.test(error.message)) {
      return jsonError(res, 503, 'rpc_missing', 'Run supabase-schema-005.sql');
    }
    return jsonError(res, 500, 'db_error', 'Could not load distribution');
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ buckets: data ?? [] });
}

async function heartbeat(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const body = (req.body || {}) as { code?: unknown; host_sub?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  const auth = await authenticate(
    req,
    typeof body.host_sub === 'string' ? body.host_sub : undefined,
  );
  if (!auth.ok) return jsonError(res, auth.status, auth.code, auth.message);

  const code = body.code.toUpperCase();
  const { data: match } = await supabase!
    .from('matches')
    .select('id, host_sub, status')
    .eq('code', code)
    .maybeSingle();
  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
  if (match.host_sub !== auth.sub)
    return jsonError(res, 403, 'forbidden', 'Only the host can send heartbeats');
  if (match.status !== 'running' && match.status !== 'lobby')
    return jsonError(res, 409, 'bad_state', 'Match is not active');

  const { error } = await supabase!
    .from('matches')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', match.id);

  if (error) {
    logEvent('play/heartbeat', { status: 500, error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not record heartbeat');
  }

  return res.json({ ok: true });
}
