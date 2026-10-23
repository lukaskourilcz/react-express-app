import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from './vercel-types';
import { confirmedEmail, type AuthResult } from './auth';
import { jsonError, requireAuthResult, withTimeout } from './http';
import { publicName, verifiedProfile } from './public-identity';
import { allocateSharkName } from './shark-name';

/** The account name a board may show: the verified Google name, else the
 * part of a confirmed address before the @. This preference never changes the
 * name or photo shared with friends. */
function leaderboardAccountName(auth: AuthResult, profile: { name: string | null }): string | null {
  if (profile.name && !profile.name.includes('@')) return profile.name;
  const email = confirmedEmail(auth.payload);
  return email ? publicName(email.split('@')[0]) : null;
}

export async function handleLeaderboardName(req: VercelRequest, res: VercelResponse, db: SupabaseClient) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const auth = await requireAuthResult(req, res);
  if (!auth) return;
  res.setHeader('Cache-Control', 'private, no-store');
  const mode = (req.body as { mode?: unknown } | undefined)?.mode;
  const showPhoto = (req.body as { showPhoto?: unknown } | undefined)?.showPhoto;
  if (req.method === 'PUT' && ((mode !== undefined && mode !== 'account' && mode !== 'nickname')
    || (showPhoto !== undefined && typeof showPhoto !== 'boolean') || (mode === undefined && showPhoto === undefined))) return jsonError(res, 400, 'bad_request', 'Choose account name or shark nickname');
  try {
    // The verified profile is read once, for the account name and the photo.
    const [nickname, profile] = await Promise.all([
      allocateSharkName(db, { userId: auth.sub }), verifiedProfile(auth, db),
    ]);
    const accountName = leaderboardAccountName(auth, profile);
    if (mode === 'account' && !accountName) return jsonError(res, 409, 'account_name_unavailable', 'Your account has no verified name or email');
    // The name mode and the photo switch are separate rows, so they are read
    // or written together; each write is idempotent, so a retry after a
    // failure of one of them settles both.
    const [saved, photo] = await Promise.all([
      req.method === 'PUT' && mode !== undefined
        ? withTimeout(db.from('user_handles').update({ leaderboard_name_mode: mode, leaderboard_account_name: accountName }).eq('user_id', auth.sub).select('leaderboard_name_mode').single())
        : withTimeout(db.from('user_handles').select('leaderboard_name_mode').eq('user_id', auth.sub).single()),
      typeof showPhoto === 'boolean' && req.method === 'PUT'
        ? withTimeout(db.from('user_stats').upsert({ user_id: auth.sub, name: profile.name, picture: profile.picture, show_on_leaderboards: showPhoto }, { onConflict: 'user_id' }).select('show_on_leaderboards,picture').single())
        : withTimeout(db.from('user_stats').select('show_on_leaderboards,picture').eq('user_id', auth.sub).maybeSingle()),
    ]);
    if (saved.error) return jsonError(res, 503, 'leaderboard_name_unavailable', 'Your leaderboard setting could not be loaded');
    if (photo.error && photo.error.code !== 'PGRST116') return jsonError(res, 503, 'leaderboard_name_unavailable', 'Your leaderboard setting could not be loaded');
    return res.json({ mode: saved.data?.leaderboard_name_mode ?? 'nickname', nickname: nickname.handle, accountName,
      showPhoto: photo.data?.show_on_leaderboards === true,
      picture: photo.data?.show_on_leaderboards === true ? photo.data?.picture ?? null : null });
  } catch {
    return jsonError(res, 503, 'leaderboard_name_unavailable', 'Your leaderboard setting is temporarily unavailable');
  }
}
