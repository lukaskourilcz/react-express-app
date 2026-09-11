// The Profile card that owns the track-plus-specialization choice and shows
// the learner's active learning paths.
//
// Two operations, not one: saving the account preference and enrolling in a
// path are separate server calls, and either can fail on its own. The card
// says which one failed and offers to retry that one, because "saved" when
// only half of it landed is the kind of quiet lie that costs a learner their
// work later.
//
// devShark only. On StudyShark the card renders nothing: there is no role
// specialization and no learning path outside the developer product.

import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
const PathRewardClaim = lazy(() => import('./PathRewardClaim'));
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { useAuth } from '../../lib/auth';
import { useT } from '../../i18n/LanguageContext';
import { friendlyError } from '../../lib/api';
import { CURRENT_PRODUCT } from '../../lib/products';
import { useSubject } from '../../lib/subjects';
import { trackLabelKey, useTrack, type Track } from '../../lib/tracks';
import { learnerProfileOf, preferredLearningOf, profileGapsOf, saveLearningPreference } from '../../lib/trackPref';
import PathPickerDialog, { type PathPickerResult } from '../PathPickerDialog';
import {
  changeEnrollment,
  entryFor,
  isOpen,
  learningPathKeys,
  pathHref,
  useEnrollments,
  usePathCatalog,
} from '../../lib/learningPaths';
import { useLoc } from './ActivityViews';
import type { LearningPathId } from '../../../../shared/learning-paths';
import './LearningPaths.css';

export default function LearningPathsCard() {
  const t = useT();
  const loc = useLoc();
  const [subject] = useSubject();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [track, setTrack] = useTrack();
  const catalog = usePathCatalog(CURRENT_PRODUCT.id === 'devshark');
  const enrollments = useEnrollments(isAuthenticated ? user?.id : undefined);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const preference = useMemo(() => preferredLearningOf(user), [user]);
  const specialization = preference?.specialization ?? null;
  const profile = useMemo(() => learnerProfileOf(user), [user]);
  const gaps = useMemo(() => profileGapsOf(user), [user]);
  // A signed-out visitor owes nothing: there is no account to personalise yet.
  const needsProfile = isAuthenticated && gaps.length > 0;

  const fdeEntry = entryFor(catalog.data, 'fde');
  const dsaEntry = entryFor(catalog.data, 'dsa-foundations');

  const enrollmentFor = useCallback(
    (pathId: LearningPathId) => enrollments.data?.enrollments.find((one) => one.pathId === pathId),
    [enrollments.data],
  );

  const apply = useCallback(
    async (result: PathPickerResult) => {
      setBusy(true);
      setDialogError(null);
      setNotice(null);
      // The local track changes first so the roadmap reflects the choice even
      // if the account save fails; the failure is then reported, not hidden.
      setTrack(result.track);
      const saved = await saveLearningPreference(
        user?.id ?? null,
        { schemaVersion: 1, baseTrack: result.track, specialization: result.specialization },
        {
          goals: result.goals,
          experience: result.experience,
          studyTime: result.studyTime,
          skillPaths: result.skillPaths,
        },
      );
      if (!saved.ok) {
        setBusy(false);
        setDialogError(saved.reason === 'not_signed_in' ? t('paths.signInToRecord') : t('paths.picker.saveFailed'));
        return;
      }

      // Enrollment is the second, separate operation. Choosing the role opens
      // the enrollment; choosing none pauses it and keeps every result.
      if (fdeEntry && isOpen(fdeEntry.availability)) {
        try {
          const existing = enrollmentFor('fde');
          if (result.specialization === 'fde') {
            await changeEnrollment({
              pathId: 'fde',
              curriculumVersion: fdeEntry.manifest.version,
              baseTrack: result.track,
              action: existing ? 'resume' : 'enroll',
            });
          } else if (existing && existing.status === 'active') {
            await changeEnrollment({ pathId: 'fde', curriculumVersion: fdeEntry.manifest.version, action: 'pause' });
          }
          await queryClient.invalidateQueries({ queryKey: learningPathKeys.enrollments(user?.id) });
        } catch (error) {
          setBusy(false);
          setDialogError(`${t('paths.picker.enrollFailed')} ${friendlyError(error)}`);
          return;
        }
      }

      // DSA Foundations is an independent enrollment: opting in enrolls or
      // resumes it, opting out pauses it, and neither touches the base track
      // or the role. Every result already recorded survives both.
      if (dsaEntry && isOpen(dsaEntry.availability)) {
        try {
          const existing = enrollmentFor('dsa-foundations');
          const wants = result.skillPaths.includes('dsa-foundations');
          if (wants) {
            await changeEnrollment({
              pathId: 'dsa-foundations',
              curriculumVersion: dsaEntry.manifest.version,
              action: existing ? 'resume' : 'enroll',
            });
          } else if (existing && existing.status === 'active') {
            await changeEnrollment({
              pathId: 'dsa-foundations',
              curriculumVersion: dsaEntry.manifest.version,
              action: 'pause',
            });
          }
          await queryClient.invalidateQueries({ queryKey: learningPathKeys.enrollments(user?.id) });
        } catch (error) {
          setBusy(false);
          setDialogError(`${t('paths.picker.enrollFailed')} ${friendlyError(error)}`);
          return;
        }
      }

      // The plan changed, so anything derived from it — what is eligible, what
      // Today offers — is stale until it is refetched.
      await queryClient.invalidateQueries({ queryKey: ['eligibility'] });

      setBusy(false);
      setOpen(false);
      setNotice(
        t('profile.pathSaved', {
          track: t(trackLabelKey(subject, result.track)),
          role: result.specialization === 'fde' ? ' + Forward Deployed Engineer' : '',
        }),
      );
    },
    [dsaEntry, enrollmentFor, fdeEntry, queryClient, setTrack, subject, t, user?.id],
  );

  if (CURRENT_PRODUCT.id !== 'devshark') return null;

  const activePaths = [fdeEntry, dsaEntry].filter(Boolean).map((entry) => {
    const manifest = entry!.manifest;
    const enrollment = enrollmentFor(manifest.id);
    return { manifest, entry: entry!, enrollment };
  });

  return (
    <Card variant="default" padding={3} width="100%">
      <VStack gap={2}>
        <VStack gap={0.5}>
          <Text type="supporting" size="xsm" color="secondary">
            {t('profile.pathTitle')}
          </Text>
          <Text type="supporting" color="secondary">
            {t('profile.pathHelp')}
          </Text>
        </VStack>

        {needsProfile && (
          <div className="lp-notice lp-notice--info" role="status">
            <span className="lp-notice__glyph" aria-hidden="true">!</span>
            <span>{t('profile.completePrompt')}</span>
          </div>
        )}

        <HStack gap={1} align="center" justify="between">
          <Text>
            {t(trackLabelKey(subject, track as Track))}
            {' · '}
            {specialization === 'fde' ? 'Forward Deployed Engineer' : t('profile.pathNone')}
          </Text>
          <button type="button" className="lp-btn" onClick={() => setOpen(true)}>
            {needsProfile ? t('profile.completeAction') : t('profile.pathChoose')}
          </button>
        </HStack>

        {profile && !needsProfile && (
          <dl className="lp-inventory">
            <dt>{t('profile.picker.goalsLegend')}</dt>
            <dd>{profile.goals.map((goal) => t(`profile.goal.${goal}` as never)).join(' · ')}</dd>
            <dt>{t('profile.picker.experienceLegend')}</dt>
            <dd>{t(`profile.experience.${profile.experience}` as never)}</dd>
            <dt>{t('profile.picker.studyTimeLegend')}</dt>
            <dd>{t(`profile.studyTime.${profile.studyTime}` as never)}</dd>
          </dl>
        )}

        {notice && (
          <div className="lp-notice lp-notice--info" role="status">
            <span className="lp-notice__glyph" aria-hidden="true">
              ✓
            </span>
            <span>{notice}</span>
          </div>
        )}

        <ul className="lp-activities">
          {activePaths.map(({ manifest, entry, enrollment }) => (
            <li key={manifest.id}>
              <Link className="lp-activity" to={pathHref(manifest.id)}>
                <span className="lp-activity__kind">
                  {manifest.kind === 'role_specialization' ? t('paths.kicker.role') : t('paths.kicker.skill')}
                </span>
                <span className="lp-activity__title">{loc(manifest.title)}</span>
                <span className="lp-activity__minutes">
                  {enrollment
                    ? t(`paths.state.${enrollment.status === 'paused' ? 'in_progress' : 'in_progress'}` as never)
                    : isOpen(entry.availability)
                      ? t('paths.action.start')
                      : t('paths.availability.content_incomplete')}
                </span>
              </Link>
              {/* Only ever visible once the server says the path is finished,
                  so a learner mid-path is not shown a prize they cannot take. */}
              {enrollment && (
                <Suspense fallback={null}>
                  <PathRewardClaim pathId={manifest.id} />
                </Suspense>
              )}
            </li>
          ))}
        </ul>
      </VStack>

      <PathPickerDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setDialogError(null);
        }}
        current={track as Track}
        currentSpecialization={specialization}
        currentProfile={profile}
        onChoose={(result) => void apply(result)}
        busy={busy}
        error={dialogError}
      />
    </Card>
  );
}
