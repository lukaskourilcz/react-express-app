import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from './vercel-types';
import { confirmedEmail, type AuthResult } from './auth';
import { jsonError, requireAuthResult, withTimeout } from './http';
import { publicName, verifiedProfile } from './public-identity';
import { allocateSharkName } from './shark-name';

/** This preference never changes the name or photo shared with friends. */
export async function leaderboardAccountName(auth: AuthResult, db: SupabaseClient): Promise<string | null> {
  const profile = await verifiedProfile(auth, db);
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
    const [nickname, accountName] = await Promise.all([
      allocateSharkName(db, { userId: auth.sub }), leaderboardAccountName(auth, db),
    ]);
    if (mode === 'account' && !accountName) return jsonError(res, 409, 'account_name_unavailable', 'Your account has no verified name or email');
    const saved = req.method === 'PUT' && mode !== undefined
      ? await withTimeout(db.from('user_handles').update({ leaderboard_name_mode: mode, leaderboard_account_name: accountName }).eq('user_id', auth.sub).select('leaderboard_name_mode').single())
      : await withTimeout(db.from('user_handles').select('leaderboard_name_mode').eq('user_id', auth.sub).single());
    if (saved.error) return jsonError(res, 503, 'leaderboard_name_unavailable', 'Your leaderboard setting could not be loaded');
    let photo;
    if (typeof showPhoto === 'boolean' && req.method === 'PUT') {
      const profile = await verifiedProfile(auth, db);
      photo = await withTimeout(db.from('user_stats').upsert({ user_id: auth.sub, name: profile.name, picture: profile.picture, show_on_leaderboards: showPhoto }, { onConflict: 'user_id' }).select('show_on_leaderboards,picture').single());
    } else photo = await withTimeout(db.from('user_stats').select('show_on_leaderboards,picture').eq('user_id', auth.sub).maybeSingle());
    if (photo.error && photo.error.code !== 'PGRST116') return jsonError(res, 503, 'leaderboard_name_unavailable', 'Your leaderboard setting could not be loaded');
    return res.json({ mode: saved.data?.leaderboard_name_mode ?? 'nickname', nickname: nickname.handle, accountName,
      showPhoto: photo.data?.show_on_leaderboards === true,
      picture: photo.data?.show_on_leaderboards === true ? photo.data?.picture ?? null : null });
  } catch {
    return jsonError(res, 503, 'leaderboard_name_unavailable', 'Your leaderboard setting is temporarily unavailable');
  }
}
