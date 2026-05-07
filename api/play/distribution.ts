import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, jsonError } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Match backend is not configured');

  const code = (req.query.code as string)?.toUpperCase();
  const qParam = parseInt(req.query.q as string, 10);
  if (!code) return jsonError(res, 400, 'bad_request', 'code required');
  if (!Number.isFinite(qParam) || qParam < 0)
    return jsonError(res, 400, 'bad_request', 'q (question index) required');

  const { data: match } = await supabase
    .from('matches')
    .select('id, host_sub')
    .eq('code', code)
    .maybeSingle();

  if (!match) return jsonError(res, 404, 'not_found', 'Match not found');

  const sub = req.query.auth0_sub as string;
  if (sub !== match.host_sub) {
    return jsonError(res, 403, 'forbidden', 'Only the host can view distribution');
  }

  const { data, error } = await supabase.rpc('match_question_distribution', {
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
