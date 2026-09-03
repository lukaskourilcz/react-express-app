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
import {
  SUBJECT_SCOPE_CATALOG,
  isScopeSubject,
  subjectForCategory,
  type ScopeSubjectId,
} from '../../shared/subject-catalog';
import { deploymentSubjectIds } from '../../lib/product-scope';
import { rollPack, subjectCardCount } from '../../shared/cards';
import { eligibleServerBadges, type BadgeStatsSummary } from '../../shared/badges';
import { isMastered, type LevelMasteryEntry } from '../../shared/mastery';
import { handleCodingDraft, handleCodingProgress } from '../../lib/coding/handlers';
import { handleGithub } from '../../lib/github-handlers';

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
  if (op === 'cards') return cards(req, res);
  if (op === 'badges') return badges(req, res);
  if (op === 'freezes') return freezes(req, res);
  if (op === 'advisor') return advisor(req, res);
  if (op === 'coding-progress') return handleCodingProgress(req, res, supabase);
  if (op === 'coding-draft') return handleCodingDraft(req, res, supabase);
  if (op.startsWith('github-')) return handleGithub(op, req, res, supabase);
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
        if (!deploymentSubjectIds().includes(receipt.subject)) {
          return jsonError(res, 400, 'invalid_receipt', 'Quiz result belongs to another product deployment');
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

/* ──── daily habit: cards, badges, freezes, advisor ─────────────────────────── */

// Finishing a subject's Today queue is defined as reaching this many verified
// learning results on a single UTC day (mirrors the client's Today target).
// Server-authoritative: the pack gate is re-checked here, never trusted from
// the client.
const DAILY_TARGET = 3;
const OFF_DAYS_DEFAULT = [0, 6];
const ADVISOR_MIN_SAMPLE = 4;
const ADVISOR_MAX_WEAK = 6;
const ADVISOR_WEEK_DAYS = 7;

const utcToday = (): string => new Date().toISOString().slice(0, 10);
const utcMonth = (): string => new Date().toISOString().slice(0, 7);

// Resolve the active subject the same way flashcards/submit do: from the query
// on reads, from the body on writes, and only if it belongs to this deployment.
function resolveSubject(req: VercelRequest): ScopeSubjectId | null {
  const raw = req.method === 'GET'
    ? req.query.subject
    : (req.body as { subject?: unknown } | undefined)?.subject;
  return isScopeSubject(raw) && deploymentSubjectIds().includes(raw) ? raw : null;
}

// GET /api/user/[op]?op=cards&subject=… — the collection + a server-verified
// "a pack is ready" flag. POST claims today's pack once the Today target is met.
async function cards(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  const subject = resolveSubject(req);
  if (!subject) return jsonError(res, 400, 'invalid_subject_scope', 'A subject from this deployment is required');
  const today = utcToday();

  try {
    if (req.method === 'GET') {
      const [owned, streakRow, completion] = await Promise.all([
        withTimeout(
          supabase!.from('user_cards').select('card_id, count, first_earned_at').eq('user_id', userId).eq('subject', subject),
        ),
        withTimeout(supabase!.from('user_streak').select('days').eq('user_id', userId).maybeSingle()),
        withTimeout(
          supabase!.from('daily_queue_completions').select('queue_date').eq('user_id', userId).eq('subject', subject).eq('queue_date', today).maybeSingle(),
        ),
      ]);
      if (owned.error) return jsonError(res, 500, 'db_error', 'Could not load cards');
      const days = (streakRow.data?.days as Record<string, number> | undefined) ?? {};
      const reachedTarget = Number(days[today] ?? 0) >= DAILY_TARGET;
      const alreadyClaimed = !completion.error && !!completion.data;
      return res.json({
        cards: (owned.data ?? []).map((c) => ({
          card_id: c.card_id,
          count: Number(c.count),
          first_earned_at: c.first_earned_at,
        })),
        packAvailable: reachedTarget && !alreadyClaimed,
        target: DAILY_TARGET,
        total: subjectCardCount(subject),
      });
    }

    if (req.method === 'POST') {
      const streakRow = await withTimeout(
        supabase!.from('user_streak').select('days').eq('user_id', userId).maybeSingle(),
      );
      if (streakRow.error) return jsonError(res, 500, 'db_error', 'Could not verify daily progress');
      const days = (streakRow.data?.days as Record<string, number> | undefined) ?? {};
      if (Number(days[today] ?? 0) < DAILY_TARGET) {
        return res.json({ status: 'not-yet', target: DAILY_TARGET });
      }
      const pack = rollPack(subject, `${userId}:${today}`);
      if (pack.length === 0) return jsonError(res, 500, 'internal_error', 'Could not roll a card pack');
      const granted = await withTimeout(
        supabase!.rpc('grant_daily_queue_cards', {
          p_user_id: userId,
          p_subject: subject,
          p_date: today,
          p_card_ids: pack,
        }),
      );
      if (granted.error) {
        if (isRpcMissing(granted.error)) return jsonError(res, 503, 'migration_required', 'Card packs are not configured');
        logEvent('cards', { status: 500, reason: 'grant_failed', error: granted.error.message });
        return jsonError(res, 500, 'db_error', 'Could not grant the card pack');
      }
      const row = Array.isArray(granted.data) ? granted.data[0] : granted.data;
      const status = row?.status === 'granted' || row?.status === 'claimed' ? row.status : 'granted';
      const grantedCards = Array.isArray(row?.granted_cards) ? (row.granted_cards as string[]) : pack;
      logEvent('cards', { status: 200, op: status, subject });
      return res.json({ status, cards: grantedCards });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

// Count Learn levels the learner has mastered in a subject, from the verified
// roadmap-progress blob and the shared mastery rule. Never trusts the client.
function countMasteredLevels(data: unknown, subject: ScopeSubjectId): number {
  if (!data || typeof data !== 'object') return 0;
  const root = data as Record<string, unknown>;
  let count = 0;
  for (const topic of SUBJECT_SCOPE_CATALOG[subject].topics) {
    const t = root[topic];
    if (!t || typeof t !== 'object') continue;
    const levels = (t as Record<string, unknown>).levels;
    if (!levels || typeof levels !== 'object') continue;
    for (const entry of Object.values(levels as Record<string, unknown>)) {
      if (entry && typeof entry === 'object' && isMastered(entry as LevelMasteryEntry)) count++;
    }
  }
  return count;
}

// GET/POST /api/user/[op]?op=badges — recompute eligibility from verified stats
// + mastery, persist newly earned ones with a stable date, and return the earned
// set. Badge ids are never accepted from the client.
async function badges(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const subject = resolveSubject(req);
  if (!subject) return jsonError(res, 400, 'invalid_subject_scope', 'A subject from this deployment is required');

  try {
    const [statsRow, progressRow] = await Promise.all([
      withTimeout(
        supabase!.from('user_stats').select('total_quizzes, total_correct, total_questions, longest_streak').eq('user_id', userId).maybeSingle(),
      ),
      withTimeout(supabase!.from('roadmap_progress').select('data').eq('user_id', userId).maybeSingle()),
    ]);
    if (statsRow.error || progressRow.error) return jsonError(res, 500, 'db_error', 'Could not load badge stats');

    const s = statsRow.data;
    const masteredLevels = countMasteredLevels(progressRow.data?.data, subject);
    const summary: BadgeStatsSummary = {
      totalQuizzes: Number(s?.total_quizzes ?? 0),
      longestStreak: Number(s?.longest_streak ?? 0),
      totalCorrect: Number(s?.total_correct ?? 0),
      totalQuestions: Number(s?.total_questions ?? 0),
      masteredLevels,
    };
    const eligible = eligibleServerBadges(summary);

    const synced = await withTimeout(
      supabase!.rpc('sync_user_badges', { p_user_id: userId, p_subject: subject, p_badge_ids: eligible }),
    );
    if (synced.error) {
      if (isRpcMissing(synced.error)) return jsonError(res, 503, 'migration_required', 'Badges are not configured');
      return jsonError(res, 500, 'db_error', 'Could not sync badges');
    }
    const rows = Array.isArray(synced.data) ? (synced.data as { badge_id: string; earned_at: string }[]) : [];
    return res.json({
      earned: rows.map((r) => ({ id: r.badge_id, earnedAt: r.earned_at })),
      masteredLevels,
    });
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

function sanitizeOffDays(input: unknown): number[] | null {
  if (!Array.isArray(input) || input.length > 7) return null;
  const set = new Set<number>();
  for (const value of input) {
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 6) return null;
    set.add(value as number);
  }
  return [...set].sort((a, b) => a - b);
}

// GET /api/user/[op]?op=freezes — the live monthly freeze budget + off-days.
// PUT updates only the off-days; freezes themselves are never client-settable.
async function freezes(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  try {
    if (req.method === 'PUT') {
      const body = (req.body || {}) as { offDays?: unknown };
      const offDays = sanitizeOffDays(body.offDays);
      if (offDays === null) {
        return jsonError(res, 400, 'bad_request', 'offDays must be integers 0–6 (at most 7 entries)');
      }
      const up = await withTimeout(
        supabase!.from('user_streak_config').upsert(
          { user_id: userId, off_days: offDays, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        ),
      );
      if (up.error) return jsonError(res, 500, 'db_error', 'Could not save off-days');
    }

    const refreshed = await withTimeout(supabase!.rpc('refresh_streak_freezes', { p_user_id: userId }));
    if (refreshed.error) {
      if (isRpcMissing(refreshed.error)) return jsonError(res, 503, 'migration_required', 'Streak freezes are not configured');
      return jsonError(res, 500, 'db_error', 'Could not load streak freezes');
    }
    const freezeRow = Array.isArray(refreshed.data) ? refreshed.data[0] : refreshed.data;
    const remaining = Number(freezeRow?.remaining ?? 2);
    const period = String(freezeRow?.period ?? utcMonth());
    const used = Array.isArray(freezeRow?.used) ? (freezeRow.used as string[]) : [];

    const cfg = await withTimeout(
      supabase!.from('user_streak_config').select('off_days').eq('user_id', userId).maybeSingle(),
    );
    const offDays = !cfg.error && Array.isArray(cfg.data?.off_days)
      ? (cfg.data!.off_days as unknown[]).map(Number)
      : OFF_DAYS_DEFAULT;

    return res.json({ remaining, period, used, offDays });
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

const focusFor = (accuracyPct: number): 'recall' | 'practice' | 'apply' =>
  accuracyPct < 40 ? 'recall' : accuracyPct < 70 ? 'practice' : 'apply';

// Read-only "weakest areas + suggested week". Never mutates, never diagnoses:
// it only ranks the subject's verified per-category accuracy and lays the
// weakest categories across a practice week. `focus` is a stable token
// ('recall' | 'practice' | 'apply') the client localizes.
async function advisor(req: VercelRequest, res: VercelResponse) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const subject = resolveSubject(req);
  if (!subject) return jsonError(res, 400, 'invalid_subject_scope', 'A subject from this deployment is required');

  try {
    const categories = [...SUBJECT_SCOPE_CATALOG[subject].categories];
    const statsRes = await withTimeout(
      supabase!.from('user_category_stats').select('category, total_correct, total_questions').eq('user_id', userId).in('category', categories),
    );
    if (statsRes.error) return jsonError(res, 500, 'db_error', 'Could not load study advisor');

    const ranked = (statsRes.data ?? [])
      .map((r) => {
        const answered = Number(r.total_questions);
        const correct = Number(r.total_correct);
        return { category: String(r.category), answered, accuracyPct: answered > 0 ? Math.round((100 * correct) / answered) : 0 };
      })
      .filter((r) => r.answered >= ADVISOR_MIN_SAMPLE)
      .sort((a, b) => a.accuracyPct - b.accuracyPct || b.answered - a.answered || a.category.localeCompare(b.category));

    const weakAreas = ranked.slice(0, ADVISOR_MAX_WEAK);
    const suggestedWeek = weakAreas.length === 0
      ? []
      : Array.from({ length: ADVISOR_WEEK_DAYS }, (_, i) => {
          const area = weakAreas[i % weakAreas.length];
          return { day: i + 1, category: area.category, focus: focusFor(area.accuracyPct) };
        });

    return res.json({ weakAreas, suggestedWeek, generatedAt: new Date().toISOString() });
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}
