import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthError, tryAuth } from '../../lib/auth';
import { supabaseAnon as supabase, jsonError, logEvent, withTimeout } from '../../lib/http';

const REASONS = ['incorrect-answer', 'unclear', 'typo', 'outdated', 'duplicate', 'other'] as const;
type Reason = (typeof REASONS)[number];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) {
    return jsonError(res, 503, 'not_configured', 'Reporting backend is not configured');
  }

  // Reports are allowed anonymously; if a token is present, the verified sub
  // is recorded so reporter_sub cannot be forged by the client.
  let reporter_sub: string | null = null;
  try {
    const auth = await tryAuth(req);
    if (auth) reporter_sub = auth.sub;
  } catch (e) {
    if (e instanceof AuthError) return jsonError(res, e.status, e.code, e.message);
  }

  const body = req.body as {
    question_id?: unknown;
    reason?: unknown;
    detail?: unknown;
  };

  if (!body || typeof body !== 'object') {
    return jsonError(res, 400, 'bad_request', 'Body must be JSON');
  }
  if (
    typeof body.question_id !== 'string' ||
    body.question_id.length === 0 ||
    body.question_id.length > 64
  ) {
    return jsonError(res, 400, 'bad_request', 'question_id required');
  }
  if (typeof body.reason !== 'string' || !REASONS.includes(body.reason as Reason)) {
    return jsonError(res, 400, 'bad_request', `reason must be one of: ${REASONS.join(', ')}`);
  }
  const detail =
    typeof body.detail === 'string' && body.detail.length <= 1000 ? body.detail : null;

  try {
    const { error } = await withTimeout(
      supabase.from('question_reports').insert({
        question_id: body.question_id,
        reason: body.reason,
        detail,
        reporter_sub,
      }),
    );

    if (error) {
      logEvent('quiz/report', { status: 500, reason: 'insert_failed', error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not save report');
    }

    logEvent('quiz/report', { status: 200, question_id: body.question_id, reason: body.reason });
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('quiz/report', { status: 504, error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Backend timed out');
  }
}
