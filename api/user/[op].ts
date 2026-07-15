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
import { requireAuth } from '../../lib/auth';
import { recordAuthEvent } from '../../lib/auth-events-store';

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
  if (op === 'authevent') return authEvent(req, res);
  return jsonError(res, 404, 'unknown_op', `Unknown user op: ${op}`);
}

// Record a sign-in for the /dev "Logs" tab. The client calls this once per
// browser session after Supabase confirms a real sign-in; the server derives the
// (verified) user id, email and provider from the token — never trusting the
// client for identity. Best-effort: a failure here must not break sign-in.
async function authEvent(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  let auth;
  try {
    auth = await requireAuth(req);
  } catch {
    return jsonError(res, 401, 'unauthorized', 'Sign in required');
  }
  const email = typeof auth.payload.email === 'string' ? auth.payload.email : null;
  const meta = (auth.payload.app_metadata ?? {}) as { provider?: unknown };
  const provider = typeof meta.provider === 'string' ? meta.provider : null;
  const kind = await recordAuthEvent({ userId: auth.sub, email, provider });
  logEvent('authevent', { status: 200, kind });
  return res.json({ ok: true, kind });
}

// Per-user "quest" XP (career leveling), counted PER SUBJECT (platform).
// Learning XP is derived from roadmap progress on the client; only the
// quiz/practice accumulators are persisted here: a `quest_xp_by_subject`
// jsonb map plus the legacy `quest_xp` total kept as the map's sum so old
// clients still see a sensible (monotone) number.
// Kept on the existing user function so we don't add a Vercel Hobby function.
const MAX_XP = 100_000_000;

const clampXp = (n: unknown): number => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  const v = Math.round(n);
  return v < 0 ? 0 : v > MAX_XP ? MAX_XP : v;
};

const MAX_SUBJECT_KEYS = 16;
const SUBJECT_KEY_RE = /^[a-z][a-z0-9-]{0,31}$/;

function sanitizeBySubject(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= MAX_SUBJECT_KEYS) break;
    if (!SUBJECT_KEY_RE.test(k)) continue;
    const xp = clampXp(v);
    if (xp > 0) {
      out[k] = xp;
      n++;
    }
  }
  return out;
}

// Before migration 020 the `quest_xp_by_subject` column doesn't exist yet —
// detect that specific failure so the endpoint can fall back to legacy shape
// instead of erroring.
const isMissingBySubjectColumn = (error: { message?: string } | null | undefined): boolean =>
  typeof error?.message === 'string' && error.message.includes('quest_xp_by_subject');

async function readXpRow(userId: string): Promise<
  | { ok: true; questXp: number; bySubject: Record<string, number>; hasBySubjectColumn: boolean }
  | { ok: false }
> {
  const { data, error } = await withTimeout(
    supabase!.from('user_xp').select('quest_xp, quest_xp_by_subject').eq('user_id', userId).maybeSingle(),
  );
  if (!error) {
    return {
      ok: true,
      questXp: Number(data?.quest_xp ?? 0),
      bySubject: sanitizeBySubject(data?.quest_xp_by_subject),
      hasBySubjectColumn: true,
    };
  }
  if (!isMissingBySubjectColumn(error)) return { ok: false };
  const fallback = await withTimeout(
    supabase!.from('user_xp').select('quest_xp').eq('user_id', userId).maybeSingle(),
  );
  if (fallback.error) return { ok: false };
  return { ok: true, questXp: Number(fallback.data?.quest_xp ?? 0), bySubject: {}, hasBySubjectColumn: false };
}

async function xp(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  try {
    if (req.method === 'GET') {
      const row = await readXpRow(userId);
      if (!row.ok) return jsonError(res, 500, 'db_error', 'Could not load XP');
      return res.json({ data: { quest_xp: row.questXp, by_subject: row.bySubject } });
    }

    if (req.method === 'PUT') {
      const body = (req.body || {}) as { quest_xp?: unknown; by_subject?: unknown };
      const incomingTotal = clampXp(body.quest_xp);
      const incomingMap = sanitizeBySubject(body.by_subject);

      // XP only grows: never let a stale device lower a stored value — merge
      // per subject with max, and keep the legacy total monotone too.
      const row = await readXpRow(userId);
      if (!row.ok) return jsonError(res, 500, 'db_error', 'Could not load XP');

      const mergedMap: Record<string, number> = { ...row.bySubject };
      for (const [k, v] of Object.entries(incomingMap)) {
        mergedMap[k] = Math.max(mergedMap[k] ?? 0, v);
      }
      const mapSum = clampXp(Object.values(mergedMap).reduce((acc, v) => acc + v, 0));
      const mergedTotal = Math.max(row.questXp, incomingTotal, mapSum);

      const record: Record<string, unknown> = {
        user_id: userId,
        quest_xp: mergedTotal,
        updated_at: new Date().toISOString(),
      };
      if (row.hasBySubjectColumn) record.quest_xp_by_subject = mergedMap;

      const { error } = await withTimeout(
        supabase!.from('user_xp').upsert(record, { onConflict: 'user_id' }),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not save XP');
      return res.json({ ok: true, data: { quest_xp: mergedTotal, by_subject: row.hasBySubjectColumn ? mergedMap : {} } });
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
