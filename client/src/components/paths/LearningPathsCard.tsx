// The Profile card that owns the track-plus-specialization choice and shows
// the learner's active learning paths.
//
// Two operations, not one: saving the account preference and enrolling in a
// path are separate server calls, and either can fail on its own. The card
// says which one failed and offers to retry that one, because "saved" when
// only half of it landed is the kind of quiet lie that costs a learner their
// work later.

import { Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { useAuth } from '../../lib/auth';
import { useT } from '../../i18n/LanguageContext';
import { friendlyError, isPremiumRequired } from '../../lib/api';
import { isBarred, useLocks } from '../../lib/locks';
import { openUpgradeSheet } from '../../lib/upgradeSheet';
import { lazyShellPart } from '../../lib/routeRecovery';
import { ShellPartBoundary } from '../ShellPartBoundary';
import ErrorRetry from '../ErrorRetry';
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
import { useLoc } from './localized';
import type { LearningPathId } from '../../../../shared/learning-paths';
import type { PathCatalogEntry } from '../../../../shared/learning-path-api';
import { MERCH_ENABLED } from '../../../../shared/rewards';
import './LearningPaths.css';
import { Button } from '@astryxdesign/core/Button';

// The reward's code stays out of the profile until a path is enrolled. Its
// boundary keeps the card when that code does not load, with a Retry.
const PathRewardClaim = lazyShellPart(() => import('./PathRewardClaim'));

export default function LearningPathsCard() {
  const t = useT();
  const loc = useLoc();
  const [subject] = useSubject();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [track, setTrack] = useTrack();
  const catalog = usePathCatalog();
  const enrollments = useEnrollments(isAuthenticated ? user?.id : undefined);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const preference = useMemo(() => preferredLearningOf(user), [user]);
  const profile = useMemo(() => learnerProfileOf(user), [user]);
  const gaps = useMemo(() => profileGapsOf(user), [user]);
  // A signed-out visitor owes nothing: there is no account to personalise yet.
  const needsProfile = isAuthenticated && gaps.length > 0;
  const { lockOf } = useLocks();

  const fdeEntry = entryFor(catalog.data, 'fde');
  const dsaEntry = entryFor(catalog.data, 'dsa-foundations');

  const enrollmentFor = useCallback(
    (pathId: LearningPathId) => enrollments.data?.enrollments.find((one) => one.pathId === pathId),
    [enrollments.data],
  );
  const barred = useCallback(
    (pathId: LearningPathId) => isBarred(lockOf({ kind: 'learning-path', pathId })),
    [lockOf],
  );

  // What the learner has chosen is the account preference or a path they are
  // running, whichever says so: a path started from its own page is chosen
  // here too, so saving the picker does not pause it.
  const fdeActive = enrollmentFor('fde')?.status === 'active';
  const dsaActive = enrollmentFor('dsa-foundations')?.status === 'active';
  const specialization = preference?.specialization ?? (fdeActive ? 'fde' : null);
  const dsaChosen = (profile?.skillPaths.includes('dsa-foundations') ?? false) || dsaActive;

  const apply = useCallback(
    async (result: PathPickerResult) => {
      setBusy(true);
      setDialogError(null);
      setNotice(null);
      // The local track changes first so the roadmap reflects the choice even
      // if the account save fails; the failure is then reported, not hidden.
      setTrack(result.track);

      // Enrollment comes before the preference. Premium opens the paths, so a
      // path the plan does not open is left out of the saved preference rather
      // than recorded as the learner's role or path without the access to take
      // it; the upgrade sheet says why once the picker closes.
      const refused: LearningPathId[] = [];
      const follow = async (
        pathId: LearningPathId,
        entry: PathCatalogEntry | undefined,
        wants: boolean,
        wasChosen: boolean,
        baseTrack?: PathPickerResult['track'],
      ) => {
        if (!entry || !isOpen(entry.availability)) return;
        const existing = enrollmentFor(pathId);
        if (wants) {
          // Running already, or paused on its own page and left chosen here:
          // saving the picker changes neither.
          if (existing && (existing.status === 'active' || wasChosen)) return;
          // A choice the account already held is not asked about again.
          if (barred(pathId)) {
            if (!wasChosen) refused.push(pathId);
            return;
          }
          try {
            await changeEnrollment({
              pathId,
              curriculumVersion: entry.manifest.version,
              ...(baseTrack ? { baseTrack } : {}),
              action: existing ? 'resume' : 'enroll',
            });
          } catch (error) {
            if (!isPremiumRequired(error)) throw error;
            refused.push(pathId);
          }
        } else if (existing && existing.status === 'active') {
          // Choosing none pauses it and keeps every result.
          await changeEnrollment({ pathId, curriculumVersion: entry.manifest.version, action: 'pause' });
        }
      };
      try {
        await follow('fde', fdeEntry, result.specialization === 'fde', specialization === 'fde', result.track);
        // DSA Foundations is an independent enrollment: it never touches the
        // base track or the role.
        await follow('dsa-foundations', dsaEntry, result.skillPaths.includes('dsa-foundations'), dsaChosen);
        await queryClient.invalidateQueries({ queryKey: learningPathKeys.enrollments(user?.id) });
      } catch (error) {
        setBusy(false);
        setDialogError(`${t('paths.picker.enrollFailed')} ${friendlyError(error)}`);
        return;
      }

      const savedSpecialization = refused.includes('fde') ? preference?.specialization ?? null : result.specialization;
      const keepsDsa = profile?.skillPaths.includes('dsa-foundations') ?? false;
      const skillPaths = refused.includes('dsa-foundations')
        ? result.skillPaths.filter((one) => one !== 'dsa-foundations' || keepsDsa)
        : result.skillPaths;
      const saved = await saveLearningPreference(
        user?.id ?? null,
        { schemaVersion: 1, baseTrack: result.track, specialization: savedSpecialization },
        {
          goals: result.goals,
          experience: result.experience,
          studyTime: result.studyTime,
          skillPaths,
        },
      );
      if (!saved.ok) {
        setBusy(false);
        setDialogError(saved.reason === 'not_signed_in' ? t('paths.signInToRecord') : t('paths.picker.saveFailed'));
        return;
      }

      // The plan changed, so anything derived from it — what is eligible, what
      // Today offers — is stale until it is refetched.
      await queryClient.invalidateQueries({ queryKey: ['eligibility'] });

      setBusy(false);
      setOpen(false);
      setNotice(
        t('profile.pathSaved', {
          track: t(trackLabelKey(subject, result.track)),
          role: savedSpecialization === 'fde' ? ' + Forward Deployed Engineer' : '',
        }),
      );
      if (refused.length > 0) openUpgradeSheet({ kind: 'learning-path', ref: refused[0] });
    },
    [barred, dsaChosen, dsaEntry, enrollmentFor, fdeEntry, preference, profile, queryClient, setTrack, specialization, subject, t, user?.id],
  );

  const activePaths = [fdeEntry, dsaEntry].filter(Boolean).map((entry) => {
    const manifest = entry!.manifest;
    const enrollment = enrollmentFor(manifest.id);
    return { manifest, entry: entry!, enrollment };
  });

  return (
    // The same card stock as the GitHub card beside it (.ss-raised: the
    // container radius, the 2px edge and --shadow-low).
    <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
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

        <div className="lp-profile-choice">
          <Text className="lp-profile-choice__value">
            {t(trackLabelKey(subject, track as Track))}
            {' · '}
            {specialization === 'fde' ? 'Forward Deployed Engineer' : t('profile.pathNone')}
          </Text>
          <Button variant="secondary" onClick={() => setOpen(true)} label={needsProfile ? t('profile.completeAction') : t('profile.pathChoose')} />
        </div>

        {profile && !needsProfile && (
          <dl className="lp-profile-inventory">
            <dt>{t('profile.inventory.goals')}</dt>
            <dd>{profile.goals.map((goal) => t(`profile.goal.${goal}` as never)).join(' · ')}</dd>
            <dt>{t('profile.inventory.experience')}</dt>
            <dd>{t(`profile.experience.${profile.experience}` as never)}</dd>
            <dt>{t('profile.inventory.studyTime')}</dt>
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
                  {/* A short state that fits its slot: closed, resume a paused
                      enrollment, in progress, or start; with the Premium mark
                      when the plan does not open the path. */}
                  {!isOpen(entry.availability)
                    ? t('roadmap.unavailable')
                    : enrollment
                      ? t(enrollment.status === 'paused' ? 'paths.action.resume' : 'paths.state.in_progress')
                      : t('paths.action.start')}
                  {isOpen(entry.availability) && barred(manifest.id) && (
                    <> <span className="ss-premium-label">{t('premium.badge')}</span></>
                  )}
                </span>
              </Link>
              {/* Only ever visible once the server says the path is finished,
                  so a learner mid-path is not shown a prize they cannot take,
                  and never while merchandise is paused (MERCH_ENABLED). */}
              {MERCH_ENABLED && enrollment && (
                <Suspense fallback={null}>
                  <ShellPartBoundary fallback={(retry, busy) => <ErrorRetry message={t('paths.rewardLoadFailed')} onRetry={retry} busy={busy} />}>
                    <PathRewardClaim pathId={manifest.id} />
                  </ShellPartBoundary>
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
        dsaEnrolled={dsaActive}
        fdeLocked={barred('fde')}
        dsaLocked={barred('dsa-foundations')}
        onChoose={(result) => void apply(result)}
        busy={busy}
        error={dialogError}
      />
    </Card>
    </div>
  );
}
