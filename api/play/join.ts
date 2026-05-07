import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, jsonError, isShortString, logEvent } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const body = (req.body || {}) as {
    code?: unknown;
    auth0_sub?: unknown;
    display_name?: unknown;
  };
  if (!isShortString(body.code, 16)) return jsonError(res, 400, 'bad_request', 'code required');
  if (!isShortString(body.auth0_sub)) return jsonError(res, 400, 'bad_request', 'auth0_sub required');
  if (!isShortString(body.display_name, 60))
    return jsonError(res, 400, 'bad_request', 'display_name required');

  const code = body.code.toUpperCase();
  const { data: match, error } = await supabase
    .from('matches')
    .select('id, code, mode, host_sub, host_name, status, current_index, questions')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    logEvent('play/join', { status: 500, error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not look up match');
  }
  if (!match) return jsonError(res, 404, 'not_found', 'No match with that code');
  if (match.status === 'finished') return jsonError(res, 410, 'finished', 'Match is over');

  await supabase.from('match_participants').upsert(
    {
      match_id: match.id,
      auth0_sub: body.auth0_sub,
      display_name: body.display_name,
    },
    { onConflict: 'match_id,auth0_sub' },
  );

  logEvent('play/join', { status: 200, code });

  // Strip correct_index from questions for non-host (we still need the host
  // to know answers for the projection screen).
  const isHost = match.host_sub === body.auth0_sub;
  const sanitized = (match.questions as Array<Record<string, unknown>>).map((q) => {
    const { correct_index, explanation, ...rest } = q;
    return isHost ? q : { ...rest, explanation };
  });

  return res.json({
    id: match.id,
    code: match.code,
    mode: match.mode,
    status: match.status,
    host_sub: match.host_sub,
    host_name: match.host_name,
    current_index: match.current_index,
    questions: sanitized,
  });
}
