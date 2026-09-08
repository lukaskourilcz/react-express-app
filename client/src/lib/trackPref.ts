// The learner's account-synced learning preference: the base track (Frontend /
// Backend / Fullstack) and, on devShark, the optional Forward Deployed Engineer
// specialization above it.
//
// Two things live in `user_metadata`, not one:
//   * `devquiz_track` — the original field. Still written on every save, so a
//     client that predates the specialization keeps reading a track it
//     understands.
//   * `devquiz_learning_preference_v1` — the new record, validated on read.
//
// The live track still lives in the tracks store; this module owns the
// account-synced default and the cached copy. Saving is NOT best-effort any
// more: the caller gets a result it can show and retry, because a preference
// that saved while its enrollment failed is a state the learner has to see.

import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { readJSON, writeJSON } from './storage';
import { saveLearningPreference as savePreferenceToAccount } from './learningPaths';
import { CURRENT_PRODUCT } from './products';
import {
  LEARNING_PREFERENCE_META_KEY,
  LEGACY_TRACK_META_KEY,
  parseLearningPreference,
  type BaseTrack,
  type LearningPreference,
  type RoleSpecializationId,
} from '../../../shared/learning-paths';
import type { Track } from './tracks';

export type { BaseTrack, LearningPreference, RoleSpecializationId };

const isTrack = (value: unknown): value is Track =>
  value === 'frontend' || value === 'backend' || value === 'fullstack';

/** The track saved on the account, or null if none/invalid. Reads the new
 * record first and falls back to the legacy field, so an account written by an
 * older client still resolves. */
export function preferredTrackOf(user: User | null): Track | null {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const preference = parseLearningPreference(metadata[LEARNING_PREFERENCE_META_KEY]);
  if (preference) return preference.baseTrack;
  const legacy = metadata[LEGACY_TRACK_META_KEY];
  return isTrack(legacy) ? legacy : null;
}

/** The full preference saved on the account, or null when there is none. A
 * malformed record resolves to null rather than throwing: a bad value must
 * never block a learner from using the app. */
export function preferredLearningOf(user: User | null): LearningPreference | null {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const preference = parseLearningPreference(metadata[LEARNING_PREFERENCE_META_KEY]);
  if (preference) return preference;
  const legacy = metadata[LEGACY_TRACK_META_KEY];
  return isTrack(legacy) ? { schemaVersion: 1, baseTrack: legacy, specialization: null } : null;
}

/* ── the device cache ──────────────────────────────────────────────────── */

// Scoped by product AND account, so two people sharing a browser never inherit
// each other's choice, and StudyShark never reads devShark's.
const cacheKey = (userId: string | null) =>
  `devquiz:${CURRENT_PRODUCT.id}:learning-preference:${userId ?? 'guest'}`;

export const readCachedPreference = (userId: string | null): LearningPreference | null =>
  parseLearningPreference(readJSON<unknown>(cacheKey(userId), null));

export const writeCachedPreference = (userId: string | null, preference: LearningPreference): void => {
  writeJSON(cacheKey(userId), preference);
};

/** A guest's draft choice, applied to an account only through an explicit
 * action. Signing in never silently overwrites what the account already says. */
export const readGuestPreference = (): LearningPreference | null => readCachedPreference(null);

/* ── saving ────────────────────────────────────────────────────────────── */

export type SaveOutcome =
  | { ok: true; preference: LearningPreference }
  | { ok: false; reason: 'not_signed_in' | 'network' | 'rejected'; message: string };

/**
 * Persist the preference to the account.
 *
 * Returns an outcome rather than swallowing the failure. The caller shows it
 * and offers a retry: "saved locally, not on your account" is a state the
 * learner needs to know about, not one to paper over.
 */
export async function saveLearningPreference(
  userId: string | null,
  preference: LearningPreference,
): Promise<SaveOutcome> {
  writeCachedPreference(userId, preference);
  if (!supabase || !userId) {
    return { ok: false, reason: 'not_signed_in', message: 'not_signed_in' };
  }
  try {
    // One writer: the API validates the enums and derives the legacy track
    // field, so a malformed value cannot reach the account from any client.
    await savePreferenceToAccount({
      baseTrack: preference.baseTrack,
      specialization: preference.specialization,
    });
    // The local `user` object caches user_metadata, so refresh the session to
    // pick up what the server just wrote. A failed refresh is not a failed
    // save: the write already landed, and the next sign-in will see it.
    await supabase.auth.refreshSession().catch(() => null);
    return { ok: true, preference };
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    return {
      ok: false,
      reason: status === 0 || status === undefined ? 'network' : 'rejected',
      message: error instanceof Error ? error.message : 'network',
    };
  }
}

/** Persist just the track, keeping any specialization already chosen. Kept for
 * the existing Profile track toggle, which does not offer a role. */
export async function savePreferredTrack(track: Track, userId: string | null, user: User | null): Promise<SaveOutcome> {
  const current = preferredLearningOf(user);
  return saveLearningPreference(userId, {
    schemaVersion: 1,
    baseTrack: track,
    specialization: current?.specialization ?? null,
  });
}
