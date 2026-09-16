/** The weekly micro-league, on `api/user/[op].ts`.
 *
 * Two ops: read the caller's own cohort, and leave or rejoin. That is the
 * whole surface, and the shape of it is the privacy decision:
 *
 *  - There is no parameter for somebody else's cohort and no way to list the
 *    rooms. `league_board` takes the caller's own verified id and returns the
 *    one room that id is seated in, or nothing.
 *  - Every number on every row is computed by the database from the results the
 *    server graded. Nothing here reads a score, a rank or a tier from the
 *    request, and the browser has no way to send one.
 *  - A tier is a label. It changes no access, no content, no XP, no token, no
 *    hint and no AI. If a handler in this file ever grants something, the league
 *    has stopped being free.
 *
 * Every routine is service-role only and reached once, after `requireAuthSub`
 * has verified the caller's own token.
 */

import type { VercelRequest, VercelResponse } from './vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, requireAuthSub, withTimeout, createLogger } from './http';
import { deploymentSubjectIds } from './product-scope';
import { isScopeSubject, type ScopeSubjectId } from '../shared/subject-catalog';

const logEvent = createLogger('league');

/** Errors the routines raise on purpose. Anything else is a 500: an unexpected
 * database error must not be reported back as a user mistake. */
const KNOWN: Record<string, { status: number; code: string; message: string }> = {
  invalid_league_request: { status: 400, code: 'bad_request', message: 'That league request was not valid' },
  invalid_league_result: { status: 400, code: 'bad_request', message: 'That result could not be scored' },
};

function rpcError(res: VercelResponse, error: { message?: string } | null, fallback: string) {
  const raised = Object.keys(KNOWN).find((key) => error?.message?.includes(key));
  if (raised) {
    const known = KNOWN[raised];
    return jsonError(res, known.status, known.code, known.message);
  }
  if (/does not exist|schema cache/i.test(error?.message ?? '')) {
    return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-038.sql to enable weekly leagues');
  }
  logEvent({ status: 500, error: error?.message ?? 'unknown' });
  return jsonError(res, 500, 'db_error', fallback);
}

/** The subject the board is read for. The browser names it, but it may only
 * name one this deployment actually serves — a geoShark tab cannot ask for the
 * webdev league. */
function readSubject(value: unknown): ScopeSubjectId | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!isScopeSubject(raw)) return null;
  return deploymentSubjectIds().includes(raw) ? raw : null;
}

interface BoardRow extends Record<string, unknown> {
  display_name?: unknown;
  picture?: unknown;
  correct?: unknown;
  answered?: unknown;
  accuracy_pct?: unknown;
  tier?: unknown;
  week_start?: unknown;
  is_self?: unknown;
}

export async function handleLeague(
  op: string,
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  // One person's own view of their own room. Never cacheable, never shared.
  res.setHeader('Cache-Control', 'private, no-store');

  if (op === 'league-board') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
    }
    const subject = readSubject(req.query.subject);
    if (!subject) {
      return jsonError(res, 400, 'invalid_subject_scope', 'That subject is not served by this deployment');
    }

    // Read the preference first so an opted-out learner is answered honestly
    // rather than being shown an empty room they think they are still in.
    const preference = await withTimeout(supabase.rpc('league_optout', { p_user_id: userId }));
    if (preference.error) return rpcError(res, preference.error, 'Could not load your league');
    if (preference.data === true) {
      return res.json({ subject, optedOut: true, weekStart: null, tier: null, entries: [] });
    }

    const { data, error } = await withTimeout(
      supabase.rpc('league_board', { p_user_id: userId, p_subject: subject }),
    );
    if (error) return rpcError(res, error, 'Could not load your league');

    const rows = (Array.isArray(data) ? data : []) as BoardRow[];
    const self = rows.find((row) => row.is_self === true);
    logEvent({ status: 200, op: 'board', subject, size: rows.length });
    return res.json({
      subject,
      optedOut: false,
      weekStart: (self?.week_start as string | undefined) ?? (rows[0]?.week_start as string | undefined) ?? null,
      tier: self ? Number(self.tier ?? 1) : null,
      entries: rows.map((row) => ({
        displayName: String(row.display_name ?? 'Anonymous'),
        picture: (row.picture as string | null) ?? null,
        correct: Number(row.correct ?? 0),
        answered: Number(row.answered ?? 0),
        accuracyPct: Number(row.accuracy_pct ?? 0),
        isSelf: row.is_self === true,
      })),
    });
  }

  // Write-only, because the read already exists: `league-board` answers
  // `optedOut` on every call, so a second endpoint for the same fact would be a
  // second place for it to be wrong.
  if (op === 'league-optout') {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
    }
    const body = (req.body || {}) as Record<string, unknown>;
    if (typeof body.optedOut !== 'boolean') {
      return jsonError(res, 400, 'bad_request', 'optedOut must be true or false');
    }
    const { data, error } = await withTimeout(
      supabase.rpc('set_league_optout', { p_user_id: userId, p_opted_out: body.optedOut }),
    );
    if (error) return rpcError(res, error, 'Could not save your league setting');
    logEvent({ status: 200, op: 'optout', opted_out: body.optedOut });
    return res.json({ optedOut: data === true });
  }

  return jsonError(res, 404, 'unknown_op', `Unknown league op: ${op}`);
}

/** Accumulate one verified quiz result into the caller's weekly league score.
 *
 * Called from `api/user/[op].ts` on exactly the condition the verified XP
 * credit uses: `record_verified_quiz_result_v2` returned TRUE, meaning this
 * attempt id was applied for the first time. A replay returns FALSE there and
 * never reaches here, so a resent request cannot score twice.
 *
 * It never fails the request. A league score is a secondary record of a result
 * that is already saved; losing one week's few points to a database hiccup is a
 * far smaller harm than telling a learner their quiz did not count.
 */
export async function recordLeagueResult(
  supabase: SupabaseClient,
  input: { userId: string; subject: string; correct: number; answered: number },
): Promise<void> {
  if (input.answered <= 0) return;
  try {
    const { error } = await withTimeout(
      supabase.rpc('league_record', {
        p_user_id: input.userId,
        p_subject: input.subject,
        p_correct: input.correct,
        p_answered: input.answered,
      }),
    );
    if (error) logEvent({ status: 200, op: 'record_skipped', warn: error.message });
  } catch (err) {
    logEvent({ status: 200, op: 'record_skipped', warn: err instanceof Error ? err.message : 'unknown' });
  }
}
