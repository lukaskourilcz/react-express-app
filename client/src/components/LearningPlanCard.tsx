// The learner's plan in Profile: what they answered, what it changes, and one
// way to change it. Shown on devShark, where the plan drives the Roadmap, the
// Today queue and every practice surface.

import { useEffect, useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { useLearnerProfile } from '../lib/learningPlan';
import { setTrackValue } from '../lib/tracks';
import LearnerProfileDialog from './LearnerProfileDialog';
import type { TranslationKey } from '../i18n/translations';

const trackLabel = (track: string): TranslationKey => `learnerProfile.track.${track}.label` as TranslationKey;

/**
 * Keep the roadmap track store in step with the saved plan, so the surfaces
 * that still read it (the roadmap tree, the career pillars) follow the same
 * answer instead of a second, local one.
 */
export function useLearnerPlanSync(): void {
  const { isAuthenticated } = useAuth();
  const plan = useLearnerProfile(isAuthenticated);
  const baseTrack = plan.data?.profile?.baseTrack;
  useEffect(() => {
    if (baseTrack) setTrackValue(baseTrack);
  }, [baseTrack]);
}

export default function LearningPlanCard() {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const plan = useLearnerProfile(isAuthenticated);
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  const state = plan.data;
  const profile = state?.profile ?? null;
  const extras = profile
    ? [profile.fde ? t('learnerProfile.fde.label') : null, profile.dsa ? t('learnerProfile.dsa.label') : null].filter(Boolean).join(' · ')
    : '';

  return (
    <>
      <Card variant="default" padding={3} width="100%">
        <VStack gap={1.5}>
          <HStack gap={1} align="center" justify="between">
            <Text weight="bold">{t('learnerProfile.editTitle')}</Text>
            {state && !state.complete && <Badge variant="warning" label={t('learnerProfile.incompleteTitle')} />}
          </HStack>

          {plan.isLoading && <Text type="supporting" color="secondary" role="status">{t('common.loading')}</Text>}
          {plan.isError && <Text type="supporting" color="secondary" role="alert">{t('learnerProfile.saveError')}</Text>}

          {state && !state.complete && (
            <Text type="supporting" color="secondary">{t('learnerProfile.incompleteBody')}</Text>
          )}

          {profile && (
            <VStack gap={0.5}>
              <Text type="supporting" color="secondary">{t('learnerProfile.summaryTrack', { track: t(trackLabel(profile.baseTrack)) })}</Text>
              <Text type="supporting" color="secondary">
                {extras ? t('learnerProfile.summaryExtras', { extras }) : t('learnerProfile.summaryNone')}
              </Text>
              <Text type="supporting" color="secondary">{t('learnerProfile.summaryTime', { n: profile.studyMinutes })}</Text>
            </VStack>
          )}

          <HStack>
            <Button
              variant={state && !state.complete ? 'primary' : 'secondary'}
              size="sm"
              label={state && !state.complete ? t('learnerProfile.incompleteCta') : t('learnerProfile.editCta')}
              onClick={() => setOpen(true)}
            />
          </HStack>
        </VStack>
      </Card>

      {state && (
        <LearnerProfileDialog
          open={open}
          onClose={() => setOpen(false)}
          draft={state.draft}
          profile={state.profile}
          onSaved={({ planChanged }) => { if (planChanged) void plan.refetch(); }}
        />
      )}
    </>
  );
}
