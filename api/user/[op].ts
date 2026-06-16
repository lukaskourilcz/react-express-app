import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthError, requireAuth } from '../../lib/auth';
import { STAT_CATEGORIES } from '../../lib/quiz-data';
import { supabase, jsonError, logEvent, withTimeout } from '../../lib/http';

const STATS_FIELDS =
  'id,user_id,email,name,picture,total_quizzes,total_correct,total_questions,current_streak,longest_streak,last_quiz_date,created_at,updated_at';

const MAX_STR = 512;

const VALID_CATEGORIES = new Set<string>(STAT_CATEGORIES);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const op = String(req.query.op || '').toLowerCase();
  if (op === 'stats') return stats(req, res);
  if (op === 'category-stats') return categoryStats(req, res);
  return jsonError(res, 404, 'unknown_op', `Unknown user op: ${op}`);
}

async function stats(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  try {
    let auth: Awaited<ReturnType<typeof requireAuth>>;
    try {
      auth = await requireAuth(req);
    } catch (e) {
      if (e instanceof AuthError) return jsonError(res, e.status, e.code, e.message);
      throw e;
    }
    const user_id = auth.sub;

    if (req.method === 'GET') {
      const { data, error } = await withTimeout(
        supabase!.from('user_stats').select(STATS_FIELDS).eq('user_id', user_id).maybeSingle(),
      );
      if (error) {
        logEvent('user/stats', { status: 500, reason: 'select_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load stats');
      }
      logEvent('user/stats', { status: 200, op: 'get', latency_ms: Date.now() - started });
      return res.json({ data });
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as {
        email?: unknown;
        name?: unknown;
        picture?: unknown;
        quiz_result?: unknown;
      };

      if (body.quiz_result !== undefined) {
        const qr = body.quiz_result as { correct?: unknown; total?: unknown };
        if (
          typeof qr !== 'object' ||
          qr === null ||
          typeof qr.correct !== 'number' ||
          typeof qr.total !== 'number' ||
          !Number.isInteger(qr.correct) ||
          !Number.isInteger(qr.total) ||
          qr.correct < 0 ||
          qr.total <= 0 ||
          qr.correct > qr.total ||
          qr.total > 50
        ) {
          return jsonError(res, 400, 'bad_request', 'Invalid quiz_result');
        }

        const { data, error } = await withTimeout(
          supabase!.rpc('record_quiz_result', {
            p_user_id: user_id,
            p_correct: qr.correct,
            p_total: qr.total,
          }),
        );

        if (error) {
          if (/function .* does not exist/i.test(error.message)) {
            logEvent('user/stats', { status: 200, op: 'submit_fallback', warn: 'rpc_missing' });
            return res.json({ data: null, warning: 'rpc_missing' });
          }
          logEvent('user/stats', { status: 500, reason: 'rpc_failed', error: error.message });
          return jsonError(res, 500, 'db_error', 'Could not record quiz result');
        }

        logEvent('user/stats', { status: 200, op: 'submit', latency_ms: Date.now() - started });
        return res.json({ data });
      }

      const picture =
        typeof body.picture === 'string' && body.picture.length <= 2048 ? body.picture : null;
      // Only allow https:// URLs for the avatar so a stored 'javascript:' or
      // 'data:' URL cannot be rendered in an <img> as an XSS/exfil vector.
      const safePicture =
        picture && /^https:\/\//i.test(picture) ? picture : null;

      const profile = {
        user_id,
        email: typeof body.email === 'string' && body.email.length <= MAX_STR ? body.email : null,
        name: typeof body.name === 'string' && body.name.length <= MAX_STR ? body.name : null,
        picture: safePicture,
      };

      const { data, error } = await withTimeout(
        supabase!
          .from('user_stats')
          .upsert(profile, { onConflict: 'user_id' })
          .select(STATS_FIELDS)
          .single(),
      );

      if (error) {
        logEvent('user/stats', { status: 500, reason: 'upsert_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not save profile');
      }
      logEvent('user/stats', { status: 200, op: 'upsert', latency_ms: Date.now() - started });
      return res.json({ data });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('user/stats', { status: 500, reason: 'exception', error: message });
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

async function categoryStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  let auth: Awaited<ReturnType<typeof requireAuth>>;
  try {
    auth = await requireAuth(req);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(res, e.status, e.code, e.message);
    throw e;
  }

  const body = (req.body || {}) as { by_category?: unknown };
  if (!body.by_category || typeof body.by_category !== 'object' || Array.isArray(body.by_category)) {
    return jsonError(res, 400, 'bad_request', 'by_category must be an object');
  }

  const cleaned: Record<string, { correct: number; total: number }> = {};
  for (const [cat, raw] of Object.entries(body.by_category as Record<string, unknown>)) {
    if (!VALID_CATEGORIES.has(cat)) continue;
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as { correct?: unknown; total?: unknown };
    if (
      typeof r.correct !== 'number' ||
      typeof r.total !== 'number' ||
      !Number.isInteger(r.correct) ||
      !Number.isInteger(r.total) ||
      r.correct < 0 ||
      r.total <= 0 ||
      r.correct > r.total ||
      r.total > 100
    ) {
      continue;
    }
    cleaned[cat] = { correct: r.correct, total: r.total };
  }

  if (Object.keys(cleaned).length === 0) {
    return res.json({ ok: true, applied: 0 });
  }

  const { error } = await withTimeout(
    supabase!.rpc('record_category_stats', {
      p_user_id: auth.sub,
      p_breakdown: cleaned,
    }),
  );

  if (error) {
    if (/function .* does not exist/i.test(error.message)) {
      return res.json({ ok: true, applied: 0, warning: 'rpc_missing' });
    }
    return jsonError(res, 500, 'db_error', 'Could not record category stats');
  }

  return res.json({ ok: true, applied: Object.keys(cleaned).length });
}
