import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import {
  createServiceClient,
  jsonError,
  withTimeout,
  isRpcMissing,
  requireAuthSub,
  logEvent as emit,
  withRequestContext,
} from '../../lib/http';
import { requireAuth } from '../../lib/auth';
import { recordAuthEvent } from '../../lib/auth-events-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { decodeQuizResultReceipt } from '../../lib/quiz-tokens';
import { subjectForCategory } from '../../shared/subject-catalog';

const supabase = createServiceClient();

const STATS_FIELDS =
  'id,user_id,email,name,picture,total_quizzes,total_correct,total_questions,current_streak,longest_streak,last_quiz_date,created_at,updated_at';

const MAX_STR = 512;

// Log under a `user/<op>` route so stats and category-stats are distinguishable.
const logEvent = (op: string, event: Record<string, unknown>) => emit(`user/${op}`, event);

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const op = String(req.query.op || '').toLowerCase();
  if (
    req.method !== 'GET' &&
    !(await enforceRateLimit(
      req,
      res,
      op === 'delete-account' ? RATE_LIMITS.accountDelete : RATE_LIMITS.userMutation,
    ))
  ) return;
  if (op === 'stats') return stats(req, res);
  if (op === 'category-stats') return categoryStats(req, res);
  if (op === 'streak') return streak(req, res);
  if (op === 'xp') return xp(req, res);
  if (op === 'authevent') return authEvent(req, res);
  if (op === 'delete-account') return deleteAccount(req, res);
  return jsonError(res, 404, 'unknown_op', `Unknown user op: ${op}`);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}

async function deleteAccount(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const auth = await requireAuth(req);
  const body = (req.body || {}) as { confirmation?: unknown };
  if (body.confirmation !== 'DELETE') {
    return jsonError(res, 400, 'confirmation_required', 'Account deletion must be confirmed');
  }

  try {
    const cleanup = await withTimeout(
      supabase!.rpc('delete_user_data', { p_user_id: auth.sub }),
      8000,
    );
    if (cleanup.error) {
      if (isRpcMissing(cleanup.error)) {
        return jsonError(res, 503, 'migration_required', 'Account deletion is not configured yet');
      }
      logEvent('delete-account', { status: 500, reason: 'cleanup_failed', error: cleanup.error.message });
      return jsonError(res, 500, 'db_error', 'Could not delete account data');
    }

    const { error } = await withTimeout(supabase!.auth.admin.deleteUser(auth.sub), 8000);
    if (error) {
      logEvent('delete-account', { status: 500, reason: 'auth_delete_failed', error: error.message });
      return jsonError(res, 500, 'auth_delete_failed', 'Account data was removed, but the sign-in identity could not be deleted');
    }

    logEvent('delete-account', { status: 200, user_id: auth.sub });
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('delete-account', { status: 504, reason: 'timeout', error: message });
    return jsonError(res, 504, 'upstream_timeout', 'Account deletion timed out; please try again');
  }
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
      return jsonError(
        res,
        409,
        'verified_result_required',
        'XP is awarded only from server-verified quiz and learning results',
      );
    }

    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
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
      return jsonError(
        res,
        409,
        'verified_result_required',
        'Activity streaks are updated only from server-verified learning results',
      );
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
        result_receipt?: unknown;
        profile?: unknown;
      };

      if (body.result_receipt !== undefined) {
        if (typeof body.result_receipt !== 'string') {
          return jsonError(res, 400, 'bad_request', 'Invalid result receipt');
        }
        const receipt = decodeQuizResultReceipt(body.result_receipt);
        if (!receipt || receipt.userId !== user_id) {
          return jsonError(res, 400, 'invalid_receipt', 'Quiz result receipt expired or invalid');
        }
        if (receipt.purpose !== 'quiz' && receipt.purpose !== 'daily') {
          return jsonError(res, 400, 'invalid_receipt', 'This result does not update quiz statistics');
        }
        if (Object.keys(receipt.breakdown).some((category) => subjectForCategory(category) !== receipt.subject)) {
          return jsonError(res, 400, 'invalid_receipt', 'Quiz result receipt has mixed product scope');
        }
        if (receipt.outcomes.some((outcome) => subjectForCategory(outcome.category) !== receipt.subject)) {
          return jsonError(res, 400, 'invalid_receipt', 'Quiz result receipt has mixed question scope');
        }
        const rawProfile = body.profile && typeof body.profile === 'object'
          ? body.profile as Record<string, unknown>
          : {};
        const safePicture =
          typeof rawProfile.picture === 'string' && rawProfile.picture.length <= 2048 && /^https:\/\//i.test(rawProfile.picture)
            ? rawProfile.picture
            : null;

        const { data, error } = await withTimeout(
          supabase!.rpc('record_verified_quiz_result_v2', {
            p_user_id: user_id,
            p_attempt_id: receipt.attemptId,
            p_correct: receipt.correct,
            p_total: receipt.total,
            p_breakdown: receipt.breakdown,
            p_outcomes: receipt.outcomes,
            p_subject: receipt.subject,
            p_quest_xp: receipt.questXp,
            p_daily_date: receipt.daily?.date ?? null,
            p_duration_ms: receipt.daily?.durationMs ?? null,
            p_email: typeof rawProfile.email === 'string' && rawProfile.email.length <= MAX_STR ? rawProfile.email : null,
            p_name: typeof rawProfile.name === 'string' && rawProfile.name.length <= MAX_STR ? rawProfile.name : null,
            p_picture: safePicture,
          }),
        );

        if (error) {
          if (isRpcMissing(error)) {
            logEvent('stats', { status: 200, op: 'submit_fallback', warn: 'rpc_missing' });
            return jsonError(res, 503, 'migration_required', 'Verified statistics migration is not installed');
          }
          logEvent('stats', { status: 500, reason: 'rpc_failed', error: error.message });
          return jsonError(res, 500, 'db_error', 'Could not record quiz result');
        }

        logEvent('stats', { status: 200, op: 'submit', latency_ms: Date.now() - started });
        const [row, xpRow] = await Promise.all([
          withTimeout(supabase!.from('user_stats').select(STATS_FIELDS).eq('user_id', user_id).maybeSingle()),
          withTimeout(supabase!.from('user_xp').select('quest_xp, quest_xp_by_subject').eq('user_id', user_id).maybeSingle()),
        ]);
        if (row.error || xpRow.error) return jsonError(res, 500, 'db_error', 'Result saved but account progress could not be loaded');
        return res.json({ data: row.data, xp: xpRow.data, applied: data === true });
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
  return jsonError(
    res,
    409,
    'verified_result_required',
    'Category statistics are recorded only from a server-verified quiz result',
  );
}
