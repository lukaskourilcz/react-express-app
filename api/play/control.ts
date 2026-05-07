import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, jsonError, isShortString, logEvent } from './_lib';

// Host-only actions: start, advance, finish.
type Action = 'start' | 'advance' | 'finish';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const body = (req.body || {}) as { code?: unknown; host_sub?: unknown; action?: unknown };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  if (!isShortString(body.host_sub)) return jsonError(res, 400, 'bad_request', 'host_sub required');
  if (body.action !== 'start' && body.action !== 'advance' && body.action !== 'finish') {
    return jsonError(res, 400, 'bad_request', 'action must be start | advance | finish');
  }

  const action = body.action as Action;
  const code = body.code.toUpperCase();
  const { data: match } = await supabase
    .from('matches')
    .select('id, host_sub, status, current_index, questions')
    .eq('code', code)
    .maybeSingle();

  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');
  if (match.host_sub !== body.host_sub) return jsonError(res, 403, 'forbidden', 'Only the host can do this');

  const totalQuestions = Array.isArray(match.questions) ? match.questions.length : 0;
  const patch: Record<string, unknown> = {};

  if (action === 'start') {
    if (match.status !== 'lobby') return jsonError(res, 409, 'bad_state', 'Match already started');
    patch.status = 'running';
    patch.current_index = 0;
    patch.started_at = new Date().toISOString();
  } else if (action === 'advance') {
    if (match.status !== 'running') return jsonError(res, 409, 'bad_state', 'Match is not running');
    const next = (match.current_index ?? 0) + 1;
    if (next >= totalQuestions) {
      patch.status = 'finished';
      patch.ended_at = new Date().toISOString();
    } else {
      patch.current_index = next;
    }
  } else {
    patch.status = 'finished';
    patch.ended_at = new Date().toISOString();
  }

  const { error } = await supabase.from('matches').update(patch).eq('id', match.id);
  if (error) {
    logEvent('play/control', { status: 500, error: error.message, action });
    return jsonError(res, 500, 'db_error', 'Could not update match');
  }

  logEvent('play/control', { status: 200, code, action });
  return res.json({ ok: true, ...patch });
}
