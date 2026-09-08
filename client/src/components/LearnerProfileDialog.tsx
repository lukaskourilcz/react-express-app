// The learner profile: asked once during registration, editable in Profile.
//
// Four required answers (base track, goals, experience, sitting length) and two
// optional enrolments (the FDE specialisation, DSA Foundations). Every question
// says what it changes, because a learner should never have to guess why they
// are being asked. Answers save as they are given, so an interrupted
// registration resumes exactly where it stopped, and a change that moves the
// learner to a different plan asks for confirmation first — verified history is
// kept either way.

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { useT } from '../i18n/LanguageContext';
import { CheckCard, RadioCard, RadioCardGroup } from './ui/RadioCards';
import { fieldErrorsOf, useSaveLearnerProfile } from '../lib/learningPlan';
import {
  BASE_TRACKS,
  LEARNER_EXPERIENCES,
  LEARNER_GOALS,
  MAX_LEARNER_GOALS,
  STUDY_MINUTES,
  planChanged,
  type BaseTrack,
  type LearnerExperience,
  type LearnerGoal,
  type LearnerProfile,
  type LearnerProfileDraft,
  type StudyMinutes,
} from '../../../shared/learner-profile';
import type { TranslationKey } from '../i18n/translations';

export interface LearnerProfileDialogProps {
  open: boolean;
  onClose: () => void;
  /** What is already answered; an interrupted registration resumes from here. */
  draft: LearnerProfileDraft;
  /** The stored profile, when there is one (edit mode). */
  profile: LearnerProfile | null;
  onSaved?: (input: { planChanged: boolean }) => void;
  /** Registration cannot be dismissed without an answer; editing can. */
  dismissible?: boolean;
}

type Step = 'track' | 'extras' | 'goals' | 'experience' | 'time';
const STEPS: Step[] = ['track', 'extras', 'goals', 'experience', 'time'];

const trackKey = (track: BaseTrack, part: 'label' | 'blurb'): TranslationKey =>
  `learnerProfile.track.${track}.${part}` as TranslationKey;
const goalKey = (goal: LearnerGoal): TranslationKey => `learnerProfile.goal.${goal}` as TranslationKey;
const experienceKey = (level: LearnerExperience, part: 'label' | 'blurb'): TranslationKey =>
  `learnerProfile.experience.${level}.${part}` as TranslationKey;

export default function LearnerProfileDialog(props: LearnerProfileDialogProps) {
  const { open, onClose, draft, profile, onSaved, dismissible = true } = props;
  const t = useT();
  const save = useSaveLearnerProfile();

  const [answers, setAnswers] = useState<LearnerProfileDraft>(draft);
  const [step, setStep] = useState<Step>('track');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAnswers(draft);
    setConfirming(false);
    setStep(STEPS.find((one) => !answered(draft, one)) ?? 'track');
    // Re-seed only when the dialog opens; typing must not be overwritten by a
    // background refetch of the same answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errors = fieldErrorsOf(save.error);
  const stepIndex = STEPS.indexOf(step);
  const complete = STEPS.every((one) => answered(answers, one));
  const wouldChangePlan = useMemo(() => {
    if (!profile) return false;
    const next = { ...profile, ...answers } as LearnerProfile;
    return planChanged(profile, next);
  }, [profile, answers]);

  const set = (patch: LearnerProfileDraft) => setAnswers((prev) => ({ ...prev, ...patch }));

  const commit = (patch: LearnerProfileDraft, advance: boolean) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    // Every answer is saved as it is given: a registration interrupted here
    // resumes with what the learner already told us.
    save.mutate(patch, {
      onSuccess: (result) => {
        if (result.complete && !advance) onSaved?.({ planChanged: result.planChanged === true });
      },
    });
    if (advance && stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  };

  const finish = () => {
    if (!complete) return;
    if (wouldChangePlan && !confirming) { setConfirming(true); return; }
    save.mutate(answers, {
      onSuccess: (result) => {
        onSaved?.({ planChanged: result.planChanged === true });
        onClose();
      },
    });
  };

  const toggleGoal = (goal: LearnerGoal) => {
    const current = answers.goals ?? [];
    const next = current.includes(goal)
      ? current.filter((one) => one !== goal)
      : current.length >= MAX_LEARNER_GOALS ? current : [...current, goal];
    set({ goals: next });
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => { if (!next && dismissible) onClose(); }}
      purpose="form"
      width="min(620px, 94vw)"
    >
      <DialogHeader
        title={t('learnerProfile.title')}
        subtitle={t('learnerProfile.subtitle')}
        onOpenChange={(next) => { if (!next && dismissible) onClose(); }}
      />
      <VStack gap={1.5} style={{ padding: 16, width: '100%' }}>
        <Text type="supporting" color="secondary">
          {t('learnerProfile.step', { n: stepIndex + 1, total: STEPS.length })}
        </Text>

        {step === 'track' && (
          <section aria-labelledby="lp-track">
            <Heading level={4} id="lp-track">{t('learnerProfile.trackQuestion')}</Heading>
            <Text type="supporting" color="secondary">{t('learnerProfile.trackWhy')}</Text>
            <RadioCardGroup
              value={answers.baseTrack ?? null}
              onChange={(value) => set({ baseTrack: value as BaseTrack })}
              onActivate={(value) => commit({ baseTrack: value as BaseTrack }, true)}
              label={t('learnerProfile.trackQuestion')}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}
            >
              {BASE_TRACKS.map((track, index) => (
                <RadioCard key={track} value={track} index={index} label={t(trackKey(track, 'label'))} width="100%">
                  <VStack gap={0.5}>
                    <HStack gap={1} align="center" justify="between">
                      <Heading level={5}>{t(trackKey(track, 'label'))}</Heading>
                      {profile?.baseTrack === track && <Badge variant="cyan" label={t('learnerProfile.current')} />}
                    </HStack>
                    <Text type="supporting" color="secondary">{t(trackKey(track, 'blurb'))}</Text>
                  </VStack>
                </RadioCard>
              ))}
            </RadioCardGroup>
          </section>
        )}

        {step === 'extras' && (
          <section aria-labelledby="lp-extras">
            <Heading level={4} id="lp-extras">{t('learnerProfile.extrasQuestion')}</Heading>
            <Text type="supporting" color="secondary">{t('learnerProfile.extrasWhy')}</Text>
            <VStack gap={1} style={{ marginTop: 12 }}>
              <CheckCard checked={answers.fde === true} onChange={() => set({ fde: !(answers.fde === true) })} label={t('learnerProfile.fde.label')}>
                <VStack gap={0.5}>
                  <Heading level={5}>{t('learnerProfile.fde.label')}</Heading>
                  <Text type="supporting" color="secondary">{t('learnerProfile.fde.blurb')}</Text>
                </VStack>
              </CheckCard>
              <CheckCard checked={answers.dsa === true} onChange={() => set({ dsa: !(answers.dsa === true) })} label={t('learnerProfile.dsa.label')}>
                <VStack gap={0.5}>
                  <Heading level={5}>{t('learnerProfile.dsa.label')}</Heading>
                  <Text type="supporting" color="secondary">{t('learnerProfile.dsa.blurb')}</Text>
                </VStack>
              </CheckCard>
            </VStack>
          </section>
        )}

        {step === 'goals' && (
          <section aria-labelledby="lp-goals">
            <Heading level={4} id="lp-goals">{t('learnerProfile.goalsQuestion')}</Heading>
            <Text type="supporting" color="secondary">{t('learnerProfile.goalsWhy', { n: MAX_LEARNER_GOALS })}</Text>
            <VStack gap={1} style={{ marginTop: 12 }}>
              {LEARNER_GOALS.map((goal) => (
                <CheckCard key={goal} checked={(answers.goals ?? []).includes(goal)} onChange={() => toggleGoal(goal)} label={t(goalKey(goal))}>
                  <Text>{t(goalKey(goal))}</Text>
                </CheckCard>
              ))}
            </VStack>
            {errors.goals && <Text type="supporting" color="secondary" role="alert">{t('learnerProfile.goalsError')}</Text>}
          </section>
        )}

        {step === 'experience' && (
          <section aria-labelledby="lp-experience">
            <Heading level={4} id="lp-experience">{t('learnerProfile.experienceQuestion')}</Heading>
            <Text type="supporting" color="secondary">{t('learnerProfile.experienceWhy')}</Text>
            <RadioCardGroup
              value={answers.experience ?? null}
              onChange={(value) => set({ experience: value as LearnerExperience })}
              onActivate={(value) => commit({ experience: value as LearnerExperience }, true)}
              label={t('learnerProfile.experienceQuestion')}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}
            >
              {LEARNER_EXPERIENCES.map((level, index) => (
                <RadioCard key={level} value={level} index={index} label={t(experienceKey(level, 'label'))} width="100%">
                  <VStack gap={0.5}>
                    <Heading level={5}>{t(experienceKey(level, 'label'))}</Heading>
                    <Text type="supporting" color="secondary">{t(experienceKey(level, 'blurb'))}</Text>
                  </VStack>
                </RadioCard>
              ))}
            </RadioCardGroup>
          </section>
        )}

        {step === 'time' && (
          <section aria-labelledby="lp-time">
            <Heading level={4} id="lp-time">{t('learnerProfile.timeQuestion')}</Heading>
            <Text type="supporting" color="secondary">{t('learnerProfile.timeWhy')}</Text>
            <RadioCardGroup
              value={answers.studyMinutes ?? null}
              onChange={(value) => set({ studyMinutes: Number(value) as StudyMinutes })}
              label={t('learnerProfile.timeQuestion')}
              orientation="horizontal"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}
            >
              {STUDY_MINUTES.map((minutes, index) => (
                <RadioCard key={minutes} value={minutes} index={index} label={t('learnerProfile.minutes', { n: minutes })}>
                  <Text>{t('learnerProfile.minutes', { n: minutes })}</Text>
                </RadioCard>
              ))}
            </RadioCardGroup>
          </section>
        )}

        {confirming && (
          <div role="alertdialog" aria-label={t('learnerProfile.planChangeTitle')} className="cd-note cd-note--warn">
            <Text>{t('learnerProfile.planChangeBody')}</Text>
          </div>
        )}
        {save.isError && !errors.goals && (
          <Text type="supporting" color="secondary" role="alert">{t('learnerProfile.saveError')}</Text>
        )}

        <HStack gap={1} justify="between" style={{ width: '100%', marginTop: 8 }}>
          <button
            type="button"
            className="cd-btn"
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
            disabled={stepIndex === 0}
          >
            {t('learnerProfile.back')}
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              className="cd-btn cd-btn--primary"
              onClick={() => commit(pick(answers, STEPS[stepIndex]), true)}
              disabled={!answered(answers, step)}
            >
              {t('learnerProfile.next')}
            </button>
          ) : (
            <button type="button" className="cd-btn cd-btn--primary" onClick={finish} disabled={!complete || save.isPending}>
              {confirming ? t('learnerProfile.planChangeConfirm') : save.isPending ? t('learnerProfile.saving') : t('learnerProfile.finish')}
            </button>
          )}
        </HStack>
      </VStack>
    </Dialog>
  );
}

/** The optional step counts as answered the moment it is shown. */
function answered(draft: LearnerProfileDraft, step: Step): boolean {
  switch (step) {
    case 'track': return draft.baseTrack !== undefined;
    case 'extras': return true;
    case 'goals': return (draft.goals?.length ?? 0) > 0;
    case 'experience': return draft.experience !== undefined;
    case 'time': return draft.studyMinutes !== undefined;
    default: return false;
  }
}

function pick(draft: LearnerProfileDraft, step: Step): LearnerProfileDraft {
  switch (step) {
    case 'track': return { baseTrack: draft.baseTrack };
    case 'extras': return { fde: draft.fde === true, dsa: draft.dsa === true };
    case 'goals': return { goals: draft.goals ?? [] };
    case 'experience': return { experience: draft.experience };
    case 'time': return { studyMinutes: draft.studyMinutes };
    default: return {};
  }
}
