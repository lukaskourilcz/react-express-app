import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withSentry } from '../../lib/observability';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const REASONS = ['incorrect-answer', 'unclear', 'typo', 'outdated', 'duplicate', 'other'] as const;
type Reason = (typeof REASONS)[number];

function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

function logEvent(event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), route: 'quiz/report', ...event }));
}

export default withSentry(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) {
    return jsonError(res, 503, 'not_configured', 'Reporting backend is not configured');
  }

  const body = req.body as {
    question_id?: unknown;
    reason?: unknown;
    detail?: unknown;
    reporter_sub?: unknown;
  };

  if (!body || typeof body !== 'object') {
    return jsonError(res, 400, 'bad_request', 'Body must be JSON');
  }
  if (typeof body.question_id !== 'string' || body.question_id.length === 0 || body.question_id.length > 64) {
    return jsonError(res, 400, 'bad_request', 'question_id required');
  }
  if (typeof body.reason !== 'string' || !REASONS.includes(body.reason as Reason)) {
    return jsonError(res, 400, 'bad_request', `reason must be one of: ${REASONS.join(', ')}`);
  }
  const detail =
    typeof body.detail === 'string' && body.detail.length <= 1000 ? body.detail : null;
  const reporter_sub =
    typeof body.reporter_sub === 'string' && body.reporter_sub.length <= 256 ? body.reporter_sub : null;

  const { error } = await supabase.from('question_reports').insert({
    question_id: body.question_id,
    reason: body.reason,
    detail,
    reporter_sub,
  });

  if (error) {
    logEvent({ status: 500, reason: 'insert_failed', error: error.message });
    return jsonError(res, 500, 'db_error', 'Could not save report');
  }

  logEvent({ status: 200, question_id: body.question_id, reason: body.reason });
  return res.json({ ok: true });
});
