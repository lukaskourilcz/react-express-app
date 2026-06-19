import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createServiceClient,
  jsonError,
  withTimeout,
  isRpcMissing,
  requireAuthSub,
  logEvent as emit,
  STATS_CATEGORIES,
} from '../../lib/http';

const supabase = createServiceClient();

const STATS_FIELDS =
  'id,user_id,email,name,picture,total_quizzes,total_correct,total_questions,current_streak,longest_streak,last_quiz_date,created_at,updated_at';

const MAX_STR = 512;

// Log under a `user/<op>` route so stats and category-stats are distinguishable.
const logEvent = (op: string, event: Record<string, unknown>) => emit(`user/${op}`, event);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const op = String(req.query.op || '').toLowerCase();
  if (op === 'stats') return stats(req, res);
  if (op === 'category-stats') return categoryStats(req, res);
  if (op === 'streak') return streak(req, res);
  if (op === 'xp') return xp(req, res);
  return jsonError(res, 404, 'unknown_op', `Unknown user op: ${op}`);
}

// Per-user "quest" XP (career leveling). Learning XP is derived from roadmap
// progress on the client; only the quiz/practice accumulator is persisted here.
// Kept on the existing user function so we don't add a Vercel Hobby function.
const MAX_XP = 100_000_000;

const clampXp = (n: unknown): number => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  const v = Math.round(n);
  return v < 0 ? 0 : v > MAX_XP ? MAX_XP : v;
};

async function xp(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await withTimeout(
        supabase!.from('user_xp').select('quest_xp').eq('user_id', userId).maybeSingle(),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not load XP');
      return res.json({ data: { quest_xp: Number(data?.quest_xp ?? 0) } });
    }

    if (req.method === 'PUT') {
      const body = (req.body || {}) as { quest_xp?: unknown };
      const incoming = clampXp(body.quest_xp);
      // XP only grows: never let a stale device lower the stored value.
      const { data: existing } = await withTimeout(
        supabase!.from('user_xp').select('quest_xp').eq('user_id', userId).maybeSingle(),
      );
      const merged = Math.max(Number(existing?.quest_xp ?? 0), incoming);
      const { error } = await withTimeout(
        supabase!
          .from('user_xp')
          .upsert({ user_id: userId, quest_xp: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not save XP');
      return res.json({ ok: true, data: { quest_xp: merged } });
    }

    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

// Daily activity map (date → lessons completed) backing the mobile streak garden.
// Kept on the existing user function so we don't add a Vercel Hobby function.
function sanitizeDays(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= 500) break; // bound stored size (~16 months of dates)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const num = typeof v === 'number' && Number.isFinite(v) ? Math.min(50, Math.max(0, Math.round(v))) : 0;
    if (num > 0) {
      out[k] = num;
      n++;
    }
  }
  return out;
}

async function streak(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await withTimeout(
        supabase!.from('user_streak').select('days').eq('user_id', userId).maybeSingle(),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not load streak');
      return res.json({ data: { days: (data?.days as Record<string, number>) ?? {} } });
    }

    if (req.method === 'PUT') {
      const body = (req.body || {}) as { days?: unknown };
      const days = sanitizeDays(body.days);
      const { error } = await withTimeout(
        supabase!
          .from('user_streak')
          .upsert({ user_id: userId, days, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not save streak');
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

async function stats(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  try {
    const user_id = await requireAuthSub(req, res);
    if (!user_id) return;

    if (req.method === 'GET') {
      const { data, error } = await withTimeout(
        supabase!.from('user_stats').select(STATS_FIELDS).eq('user_id', user_id).maybeSingle(),
      );
      if (error) {
        logEvent('stats', { status: 500, reason: 'select_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load stats');
      }
      logEvent('stats', { status: 200, op: 'get', latency_ms: Date.now() - started });
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
          if (isRpcMissing(error)) {
            logEvent('stats', { status: 200, op: 'submit_fallback', warn: 'rpc_missing' });
            return res.json({ data: null, warning: 'rpc_missing' });
          }
          logEvent('stats', { status: 500, reason: 'rpc_failed', error: error.message });
          return jsonError(res, 500, 'db_error', 'Could not record quiz result');
        }

        logEvent('stats', { status: 200, op: 'submit', latency_ms: Date.now() - started });
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
        logEvent('stats', { status: 500, reason: 'upsert_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not save profile');
      }
      logEvent('stats', { status: 200, op: 'upsert', latency_ms: Date.now() - started });
      return res.json({ data });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('stats', { status: 500, reason: 'exception', error: message });
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

async function categoryStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  const body = (req.body || {}) as { by_category?: unknown };
  if (!body.by_category || typeof body.by_category !== 'object' || Array.isArray(body.by_category)) {
    return jsonError(res, 400, 'bad_request', 'by_category must be an object');
  }

  const cleaned: Record<string, { correct: number; total: number }> = {};
  for (const [cat, raw] of Object.entries(body.by_category as Record<string, unknown>)) {
    if (!STATS_CATEGORIES.has(cat)) continue;
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
      p_user_id: userId,
      p_breakdown: cleaned,
    }),
  );

  if (error) {
    if (isRpcMissing(error)) {
      return res.json({ ok: true, applied: 0, warning: 'rpc_missing' });
    }
    return jsonError(res, 500, 'db_error', 'Could not record category stats');
  }

  return res.json({ ok: true, applied: Object.keys(cleaned).length });
}
