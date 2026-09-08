/** Storage for the versioned learner profile (issue #151).
 *
 * One row per account in `learner_profiles`: the accepted profile, plus the
 * answers of a registration that was interrupted. The server owns
 * `updatedAt` and the version; the browser may only propose answers, which are
 * re-validated here with the same shared validator the form uses. */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from './http';
import {
  LEARNER_PROFILE_VERSION,
  completeProfile,
  learnerProfileState,
  planChanged,
  validateLearnerProfile,
  type LearnerProfile,
  type LearnerProfileDraft,
  type LearnerProfileFieldError,
  type LearnerProfileState,
} from '../shared/learner-profile';

const TABLE = 'learner_profiles';

/** True when the profile table has not been migrated in yet. */
export const isTableMissing = (error: { message?: string; code?: string } | null | undefined): boolean =>
  !!error && (error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? ''));

export class ProfileMigrationMissing extends Error {
  constructor() {
    super('learner profile migration 026 is not installed');
    this.name = 'ProfileMigrationMissing';
  }
}

interface ProfileRow {
  version: number | null;
  profile: unknown;
  draft: unknown;
}

const readProfile = (raw: unknown, version: number | null): LearnerProfile | null => {
  const { draft, complete } = validateLearnerProfile(raw);
  if (!complete) return null;
  const updatedAt = typeof (raw as { updatedAt?: unknown })?.updatedAt === 'string'
    ? (raw as { updatedAt: string }).updatedAt
    : new Date(0).toISOString();
  const profile = completeProfile(draft, updatedAt);
  if (!profile) return null;
  return { ...profile, version: Number.isInteger(version) ? Number(version) : profile.version };
};

/** The learner's profile state, or an empty state when nothing is stored. */
export async function loadLearnerProfile(supabase: SupabaseClient, userId: string): Promise<LearnerProfileState> {
  const { data, error } = await withTimeout(
    supabase.from(TABLE).select('version,profile,draft').eq('user_id', userId).maybeSingle(),
  );
  if (error) {
    if (isTableMissing(error)) throw new ProfileMigrationMissing();
    throw new Error('db_error');
  }
  const row = (data ?? null) as ProfileRow | null;
  const profile = row ? readProfile(row.profile, row.version) : null;
  const draft = row ? validateLearnerProfile(row.draft).draft : {};
  return learnerProfileState(profile, draft);
}

export interface SaveResult {
  state: LearnerProfileState;
  errors: LearnerProfileFieldError[];
  /** True when the accepted write changed which paths the learner is on. */
  planChanged: boolean;
}

/**
 * Merge the proposed answers over what is stored and persist. A write that
 * completes every required field is promoted to the profile; anything less
 * stays a draft, so an interrupted registration resumes where it stopped.
 * Verified learning history is never touched here.
 */
export async function saveLearnerProfile(
  supabase: SupabaseClient,
  userId: string,
  input: unknown,
  now: string,
): Promise<SaveResult> {
  const before = await loadLearnerProfile(supabase, userId);
  const { draft: proposed, errors } = validateLearnerProfile(input);
  if (errors.length > 0) return { state: before, errors, planChanged: false };

  const merged: LearnerProfileDraft = { ...before.draft, ...proposed };
  const profile = completeProfile(merged, now);
  const row = {
    user_id: userId,
    version: LEARNER_PROFILE_VERSION,
    profile: profile ? { ...profile } : null,
    draft: merged,
    updated_at: now,
  };
  const { error } = await withTimeout(supabase.from(TABLE).upsert(row, { onConflict: 'user_id' }));
  if (error) {
    if (isTableMissing(error)) throw new ProfileMigrationMissing();
    throw new Error('db_error');
  }
  return {
    state: learnerProfileState(profile, merged),
    errors: [],
    planChanged: profile ? planChanged(before.profile, profile) : false,
  };
}
