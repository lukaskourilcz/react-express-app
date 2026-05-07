import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, jsonError } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const code = (req.query.code as string)?.toUpperCase();
  const sub = req.query.auth0_sub as string;
  if (!code) return jsonError(res, 400, 'bad_request', 'code required');

  const { data: match } = await supabase
    .from('matches')
    .select(
      'id, code, mode, host_sub, host_name, status, current_index, questions, ended_at, question_started_at, question_duration_s',
    )
    .eq('code', code)
    .maybeSingle();

  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');

  const { data: participants } = await supabase
    .from('match_participants')
    .select('auth0_sub, display_name, joined_at')
    .eq('match_id', match.id)
    .order('joined_at', { ascending: true });

  const { data: scoreboard } = await supabase.rpc('match_scoreboard', { p_match_id: match.id });

  const isHost = sub === match.host_sub;
  const sanitizedQuestions = (match.questions as Array<Record<string, unknown>>).map((q) => {
    if (isHost || match.status === 'finished') return q;
    const { correct_index, explanation, ...rest } = q;
    return rest;
  });

  return res.json({
    match: { ...match, questions: sanitizedQuestions },
    participants: participants ?? [],
    scoreboard: scoreboard ?? [],
  });
}
