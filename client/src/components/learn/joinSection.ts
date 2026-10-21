// Joining a Learn section from its header. Two writes the server owns:
//
// - Software Engineer is an opt-in saved in the profile's `sections`. The
//   server replaces the saved list with the one a save sends, so the save
//   sends the union with what the account already holds.
// - Forward Deployed Engineer is the `fde` specialization. When the FDE path is
//   open, the learner enrols first and the specialization is saved after, the
//   order the Profile card's picker uses (LearningPathsCard): a free account
//   gets the upgrade sheet and nothing is saved. With the path closed, or its
//   catalogue unreadable, the specialization is saved on its own.
//
// Neither changes a tier, a grade or any progress.

import type { QueryClient } from '@tanstack/react-query';
import { isPremiumRequired } from '../../lib/api';
import { eligibilityKeys } from '../../lib/eligibility';
import { changeEnrollment, isOpen, learningPathKeys } from '../../lib/learningPaths';
import { saveLearningPreference } from '../../lib/trackPref';
import { openUpgradeSheet } from '../../lib/upgradeSheet';
import type { LearnerProfile } from '../../../../shared/learning-paths';
import type { PathCatalogEntry, PathEnrollment } from '../../../../shared/learning-path-api';

export type JoinStep = 'save' | 'enroll' | 'premium';
export type JoinOutcome = { ok: true } | { ok: false; step: JoinStep };

export async function joinSoftwareEngineer(userId: string, profile: LearnerProfile, queryClient: QueryClient): Promise<JoinOutcome> {
  const sections = [...new Set([...(profile.sections ?? []), 'software-engineer' as const])];
  const saved = await saveLearningPreference(
    userId,
    { schemaVersion: 1, baseTrack: profile.baseTrack, specialization: profile.specialization },
    { sections },
  );
  if (!saved.ok) return { ok: false, step: 'save' };
  await queryClient.invalidateQueries({ queryKey: eligibilityKeys.all });
  return { ok: true };
}

export async function joinFde({
  userId,
  profile,
  entry,
  enrollment,
  barred,
  queryClient,
  skipEnroll = false,
}: {
  userId: string;
  profile: LearnerProfile;
  entry: PathCatalogEntry | undefined;
  enrollment: PathEnrollment | undefined;
  barred: boolean;
  queryClient: QueryClient;
  /** A retry after a failed save: the enrollment already exists. */
  skipEnroll?: boolean;
}): Promise<JoinOutcome> {
  if (!skipEnroll && entry && isOpen(entry.availability) && enrollment?.status !== 'active') {
    if (barred) {
      openUpgradeSheet({ kind: 'learning-path', ref: 'fde' });
      return { ok: false, step: 'premium' };
    }
    try {
      await changeEnrollment({
        pathId: 'fde',
        curriculumVersion: entry.manifest.version,
        baseTrack: profile.baseTrack,
        action: enrollment ? 'resume' : 'enroll',
      });
    } catch (error) {
      // The API client opens the upgrade sheet for a 402 itself.
      return { ok: false, step: isPremiumRequired(error) ? 'premium' : 'enroll' };
    }
    await queryClient.invalidateQueries({ queryKey: learningPathKeys.enrollments(userId) });
  }
  const saved = await saveLearningPreference(
    userId,
    { schemaVersion: 1, baseTrack: profile.baseTrack, specialization: 'fde' },
  );
  if (!saved.ok) return { ok: false, step: 'save' };
  await queryClient.invalidateQueries({ queryKey: eligibilityKeys.all });
  return { ok: true };
}
