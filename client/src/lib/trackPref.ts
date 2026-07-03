// The learner's chosen learning track (Frontend / Backend / Fullstack), saved
// to the account so it follows them across devices. Stored in Supabase
// `user_metadata` alongside the language preference and sign-up bonus flag, so
// no DB migration is needed. The live track still lives in the tracks store;
// this module only handles the account-synced default.

import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Track } from './tracks';

const META_KEY = 'devquiz_track';
const isTrack = (v: unknown): v is Track =>
  v === 'frontend' || v === 'backend' || v === 'fullstack';

/** The track saved on the account, or null if none/invalid. */
export function preferredTrackOf(user: User | null): Track | null {
  const value = (user?.user_metadata ?? {})[META_KEY];
  return isTrack(value) ? value : null;
}

/** Persist the chosen track to the account (best-effort). */
export async function savePreferredTrack(track: Track): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.updateUser({ data: { [META_KEY]: track } });
  } catch {
    // Best-effort: the local track already changed.
  }
}
