/** Friends operations on `api/user/[op].ts`: claim a handle, look one up, ask,
 * answer, remove, and read the list.
 *
 * The privacy decision is the whole design and it lives in migration 033, not
 * here. This product has never had a user directory, and it still does not:
 * a handle is opt-in, matching is exact equality on its lower-cased form, and
 * an account without a handle cannot be reached at all. There is no listing,
 * no prefix search and no suggestion. `user_stats.name` and `.email` are the
 * name and address the OAuth provider supplied — things nobody chose to
 * publish — and nothing on this path reads either of them.
 *
 * Every routine below is service-role only and reached exactly once, after the
 * caller's own token has been verified. A friend's numbers are assembled by the
 * database, scoped to this deployment's own categories, and never assembled
 * from anything the browser sent.
 */

import type { VercelRequest, VercelResponse } from './vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonError, requireAuthSub, withTimeout, createLogger } from './http';
import { defaultDeploymentCategories } from './product-scope';

const logEvent = createLogger('friends');

/** The same shape the database enforces, checked before the round trip so a
 * typo costs nothing and the error is the one the learner needs. */
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,22}[A-Za-z0-9]$/;

/** Errors the routines raise on purpose, mapped to a status and a message the
 * learner can act on. Anything not listed here is a 500: an unexpected
 * database error must not be reported as a user mistake. */
const KNOWN: Record<string, { status: number; code: string; message: string }> = {
  invalid_handle: { status: 400, code: 'invalid_handle', message: 'A handle is 3–24 letters, numbers, hyphens or underscores' },
  handle_taken: { status: 409, code: 'handle_taken', message: 'That handle is already taken' },
  handle_cooldown: { status: 409, code: 'handle_cooldown', message: 'A handle can be changed once every 30 days' },
  handle_not_found: { status: 404, code: 'not_found', message: 'No account with that handle' },
  cannot_friend_self: { status: 400, code: 'bad_request', message: 'That is your own handle' },
  friend_limit_reached: { status: 409, code: 'friend_limit', message: 'You have reached the friend limit' },
  pending_limit_reached: { status: 409, code: 'pending_limit', message: 'You have too many requests waiting for an answer' },
  request_declined: { status: 409, code: 'declined', message: 'That request was declined' },
  no_request: { status: 404, code: 'not_found', message: 'There is no request to answer' },
};

function rpcError(res: VercelResponse, error: { message?: string } | null, fallback: string) {
  const raised = Object.keys(KNOWN).find((key) => error?.message?.includes(key));
  if (raised) {
    const known = KNOWN[raised];
    return jsonError(res, known.status, known.code, known.message);
  }
  if (/does not exist|schema cache/i.test(error?.message ?? '')) {
    return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-033.sql to enable friends');
  }
  logEvent({ status: 500, error: error?.message ?? 'unknown' });
  return jsonError(res, 500, 'db_error', fallback);
}

const readHandle = (value: unknown): string | null => {
  const handle = typeof value === 'string' ? value.trim() : '';
  return HANDLE.test(handle) ? handle : null;
};

export async function handleFriends(
  op: string,
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  // Nothing here is cacheable: every response is one person's own view of
  // their own relationships.
  res.setHeader('Cache-Control', 'private, no-store');

  const body = (req.body || {}) as Record<string, unknown>;

  // ── the caller's own handle ────────────────────────────────────────────
  if (op === 'friends-handle') {
    if (req.method === 'GET') {
      const { data, error } = await withTimeout(supabase.rpc('get_user_handle', { p_user_id: userId }));
      if (error) return rpcError(res, error, 'Could not read your handle');
      const row = Array.isArray(data) ? data[0] : data;
      return res.json({
        handle: row?.handle ?? null,
        discoverable: row?.discoverable ?? true,
        canChangeAt: row?.can_change_at ?? null,
      });
    }
    if (req.method === 'PUT') {
      // Two independent settings on one op: the handle itself, and whether a
      // stranger who types it can find you.
      if (typeof body.discoverable === 'boolean' && body.handle === undefined) {
        const { data, error } = await withTimeout(
          supabase.rpc('set_handle_discoverable', { p_user_id: userId, p_discoverable: body.discoverable }),
        );
        if (error) return rpcError(res, error, 'Could not save the setting');
        return res.json({ discoverable: data === true });
      }
      const handle = readHandle(body.handle);
      if (!handle) return jsonError(res, 400, 'invalid_handle', KNOWN.invalid_handle.message);
      const { data, error } = await withTimeout(
        supabase.rpc('set_user_handle', { p_user_id: userId, p_handle: handle }),
      );
      if (error) return rpcError(res, error, 'Could not save your handle');
      logEvent({ status: 200, op: 'handle_set' });
      return res.json({ handle: data ?? handle });
    }
    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  // ── looking somebody up ────────────────────────────────────────────────
  // One handle in, at most one row out, carrying a handle and a relationship
  // state. No account id, no name, no picture, no crown, no statistic: a
  // stranger learns only what the other person published by claiming it.
  if (op === 'friends-lookup') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
    }
    const handle = readHandle(req.query.handle);
    if (!handle) return res.json({ found: false });
    const { data, error } = await withTimeout(
      supabase.rpc('friend_lookup', { p_user_id: userId, p_handle: handle }),
    );
    if (error) return rpcError(res, error, 'Could not search');
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return res.json({ found: false });
    return res.json({ found: true, handle: row.handle, state: row.state });
  }

  // ── asking, answering, removing ────────────────────────────────────────
  if (op === 'friends-request' || op === 'friends-respond' || op === 'friends-remove') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
    }
    const handle = readHandle(body.handle);
    if (!handle) return jsonError(res, 400, 'invalid_handle', KNOWN.invalid_handle.message);

    if (op === 'friends-request') {
      const { data, error } = await withTimeout(
        supabase.rpc('request_friend', { p_user_id: userId, p_handle: handle }),
      );
      if (error) return rpcError(res, error, 'Could not send the request');
      logEvent({ status: 200, op: 'request', state: String(data) });
      return res.json({ state: data });
    }

    if (op === 'friends-respond') {
      const { data, error } = await withTimeout(
        supabase.rpc('respond_friend', { p_user_id: userId, p_handle: handle, p_accept: body.accept === true }),
      );
      if (error) return rpcError(res, error, 'Could not answer the request');
      logEvent({ status: 200, op: 'respond', state: String(data) });
      return res.json({ state: data });
    }

    const { data, error } = await withTimeout(
      supabase.rpc('remove_friend', { p_user_id: userId, p_handle: handle, p_block: body.block === true }),
    );
    if (error) return rpcError(res, error, 'Could not remove');
    logEvent({ status: 200, op: 'remove', blocked: body.block === true });
    return res.json({ removed: data === true });
  }

  // ── the list ───────────────────────────────────────────────────────────
  if (op === 'friends-list') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
    }
    // The categories are this deployment's own, never the browser's: a
    // devShark friend list sums webdev and a geoShark one sums geography.
    const categories = defaultDeploymentCategories();
    const [list, requests] = await Promise.all([
      withTimeout(supabase.rpc('friend_list', { p_user_id: userId, p_categories: categories })),
      withTimeout(supabase.rpc('friend_requests', { p_user_id: userId })),
    ]);
    if (list.error) return rpcError(res, list.error, 'Could not load your friends');
    if (requests.error) return rpcError(res, requests.error, 'Could not load your requests');
    return res.json({
      friends: (list.data ?? []).map((row: Record<string, unknown>) => ({
        handle: row.handle,
        picture: row.picture ?? null,
        crown: row.crown === true,
        currentStreak: Number(row.current_streak ?? 0),
        longestStreak: Number(row.longest_streak ?? 0),
        totalCorrect: Number(row.total_correct ?? 0),
        totalQuestions: Number(row.total_questions ?? 0),
        accuracyPct: Number(row.accuracy_pct ?? 0),
        activeToday: row.active_today === true,
      })),
      requests: (requests.data ?? []).map((row: Record<string, unknown>) => ({
        handle: row.handle,
        direction: row.direction,
      })),
    });
  }

  return jsonError(res, 404, 'unknown_op', `Unknown friends op: ${op}`);
}
