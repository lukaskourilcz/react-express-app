// The learning-path picker: choose a base track, then — on devShark only —
// the optional Forward Deployed Engineer specialization, the independent DSA
// Foundations skill path, and the profile answers that let the product describe
// a plan instead of a catalogue.
//
// The profile answers are required before practice is personalised, so they are
// asked here once rather than in a second form somewhere else. Goals, the
// experience answer and the study-time band are all the learner telling us how
// to talk to them: none of them opens a level, and the experience answer least
// of all — progression comes from server-verified evidence and nothing else.
//
// Two explicit steps, not one list of six options. The base track is the
// career choice the roadmap has always had; the specialization sits above it
// and is genuinely optional, so the second step offers "Continue without a
// specialization" as a first-class answer rather than a way out.
//
// Redesigned on the Astryx design system: an Astryx Dialog whose options use
// the shared radio-card pattern. Arrow keys browse the exclusive options; the
// dialog advances only on an explicit Continue, so nobody is committed by
// keyboard navigation. Back returns to the first step with the choice intact.

import { useEffect, useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { trackLabelKey, trackBlurbKey, TRACK_ORDER, type Track } from '../lib/tracks';
import { useSubject } from '../lib/subjects';
import { CURRENT_PRODUCT } from '../lib/products';
import { useT } from '../i18n/LanguageContext';
import { RadioCard, RadioCardGroup } from './ui/RadioCards';
import {
  EXPERIENCE_LEVELS,
  LEARNER_GOALS,
  MAX_LEARNER_GOALS,
  STUDY_TIMES,
  type ExperienceLevel,
  type LearnerGoal,
  type LearnerProfile,
  type RoleSpecializationId,
  type SkillPathId,
  type StudyTime,
} from '../../../shared/learning-paths';
import type { TranslationKey } from '../i18n/translations';
import './paths/LearningPaths.css';

/** The second step's two answers. `none` is a real choice, not a dismissal. */
type RoleChoice = RoleSpecializationId | 'none';
const ROLE_ORDER: RoleChoice[] = ['none', 'fde'];

export interface PathPickerResult {
  track: Track;
  specialization: RoleSpecializationId | null;
  skillPaths: SkillPathId[];
  goals: LearnerGoal[];
  experience: ExperienceLevel;
  studyTime: StudyTime;
}

/** The steps devShark asks, in order. StudyShark asks only the first. */
const DEV_STEPS = ['track', 'role', 'paths', 'profile'] as const;
type Step = (typeof DEV_STEPS)[number];

const goalKey = (goal: LearnerGoal) => `profile.goal.${goal}` as TranslationKey;
const experienceKey = (level: ExperienceLevel) => `profile.experience.${level}` as TranslationKey;
const studyTimeKey = (band: StudyTime) => `profile.studyTime.${band}` as TranslationKey;

export default function PathPickerDialog({
  open,
  onClose,
  current,
  currentSpecialization,
  currentProfile = null,
  onChoose,
  /** Set while the parent is saving, so the dialog cannot be double-submitted. */
  busy = false,
  /** A save that failed, shown in the dialog so the learner can retry here. */
  error = null,
}: {
  open: boolean;
  onClose: () => void;
  current: Track;
  currentSpecialization?: RoleSpecializationId | null;
  /** The profile already on the account, so an edit starts from the learner's
   * own answers rather than a blank form. */
  currentProfile?: LearnerProfile | null;
  onChoose: (result: PathPickerResult) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const t = useT();
  const [subject] = useSubject();
  // devShark is the only product with a role specialization. Everywhere else
  // the dialog is the single-step track picker it has always been.
  const offersRole = CURRENT_PRODUCT.id === 'devshark';

  const [step, setStep] = useState<Step>('track');
  const [track, setTrack] = useState<Track>(current);
  const [role, setRole] = useState<RoleChoice>(currentSpecialization ?? 'none');
  const [dsa, setDsa] = useState(false);
  const [goals, setGoals] = useState<LearnerGoal[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [studyTime, setStudyTime] = useState<StudyTime | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('track');
    setTrack(current);
    setRole(currentSpecialization ?? 'none');
    setDsa(currentProfile?.skillPaths.includes('dsa-foundations') ?? false);
    setGoals(currentProfile?.goals ?? []);
    setExperience(EXPERIENCE_LEVELS.includes(currentProfile?.experience as ExperienceLevel)
      ? (currentProfile!.experience as ExperienceLevel)
      : null);
    setStudyTime(STUDY_TIMES.includes(currentProfile?.studyTime as StudyTime)
      ? (currentProfile!.studyTime as StudyTime)
      : null);
  }, [open, current, currentSpecialization, currentProfile]);

  const steps: Step[] = offersRole ? [...DEV_STEPS] : ['track'];
  const index = Math.max(0, steps.indexOf(step));
  const isLast = index === steps.length - 1;
  // The final step is the only one that can commit, and only once the three
  // required answers are there. Nothing is guessed on the learner's behalf.
  const canCommit = !offersRole || (goals.length > 0 && experience !== null && studyTime !== null);

  const toggleGoal = (goal: LearnerGoal) =>
    setGoals((current) => current.includes(goal)
      ? current.filter((one) => one !== goal)
      : current.length >= MAX_LEARNER_GOALS ? current : [...current, goal]);

  const commit = () =>
    onChoose({
      track,
      specialization: role === 'none' ? null : role,
      skillPaths: dsa ? ['dsa-foundations'] : [],
      goals,
      experience: (experience ?? 'unsure') as ExperienceLevel,
      studyTime: (studyTime ?? '15-30') as StudyTime,
    });

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      purpose="form"
      width="min(560px, 94vw)"
    >
      <DialogHeader
        title={t(
          step === 'track' ? 'home.pathDialogTitle'
            : step === 'role' ? 'paths.picker.roleTitle'
              : step === 'paths' ? 'paths.picker.skillTitle'
                : 'profile.picker.title',
        )}
        subtitle={t(
          step === 'track' ? 'home.pathDialogSubtitle'
            : step === 'role' ? 'paths.picker.roleSubtitle'
              : step === 'paths' ? 'paths.picker.skillSubtitle'
                : 'profile.picker.subtitle',
        )}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      />

      {error && (
        <div style={{ padding: '0 16px' }}>
          <div className="lp-notice lp-notice--error" role="alert">
            <span className="lp-notice__glyph" aria-hidden="true">
              !
            </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {step === 'track' && (
        <RadioCardGroup
          value={track}
          onChange={(value) => setTrack(value as Track)}
          label={t('home.pathDialogSubtitle')}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, width: '100%' }}
        >
          {TRACK_ORDER.map((tk) => {
            const selected = tk === track;
            return (
              <RadioCard
                key={tk}
                value={tk}
                index={TRACK_ORDER.indexOf(tk)}
                label={t(trackLabelKey(subject, tk))}
                width="100%"
                style={selected ? { background: 'var(--brand-accent-soft)' } : undefined}
              >
                <VStack gap={0.5}>
                  <HStack gap={1} align="center" justify="between">
                    <Heading level={4}>{t(trackLabelKey(subject, tk))}</Heading>
                    {tk === current && <Badge variant="cyan" label={t('home.pathCurrent')} />}
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {t(trackBlurbKey(subject, tk))}
                  </Text>
                </VStack>
              </RadioCard>
            );
          })}
        </RadioCardGroup>
      )}
      {step === 'role' && (
        <RadioCardGroup
          value={role}
          onChange={(value) => setRole(value as RoleChoice)}
          label={t('paths.picker.roleSubtitle')}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, width: '100%' }}
        >
          {ROLE_ORDER.map((option) => {
            const selected = option === role;
            return (
              <RadioCard
                key={option}
                value={option}
                index={ROLE_ORDER.indexOf(option)}
                label={t(option === 'none' ? 'paths.picker.noneLabel' : 'paths.picker.fdeLabel')}
                width="100%"
                style={selected ? { background: 'var(--brand-accent-soft)' } : undefined}
              >
                <VStack gap={0.5}>
                  <HStack gap={1} align="center" justify="between">
                    <Heading level={4}>
                      {t(option === 'none' ? 'paths.picker.noneLabel' : 'paths.picker.fdeLabel')}
                    </Heading>
                    {option === (currentSpecialization ?? 'none') && (
                      <Badge variant="cyan" label={t('home.pathCurrent')} />
                    )}
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {t(option === 'none' ? 'paths.picker.noneBlurb' : 'paths.picker.fdeBlurb')}
                  </Text>
                </VStack>
              </RadioCard>
            );
          })}
        </RadioCardGroup>
      )}
      {step === 'paths' && (
        <div style={{ padding: 16, width: '100%' }}>
          {/* A skill path is an opt-in, not one of a set: DSA Foundations runs
              beside any track and beside FDE, so it is a checkbox rather than
              another exclusive card. */}
          <label className="lp-check">
            <input type="checkbox" checked={dsa} onChange={(event) => setDsa(event.target.checked)} />
            <span>
              <Heading level={4}>{t('paths.picker.dsaLabel')}</Heading>
              <Text type="supporting" color="secondary">{t('paths.picker.dsaBlurb')}</Text>
            </span>
          </label>
        </div>
      )}
      {step === 'profile' && (
        <div style={{ padding: 16, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <fieldset className="lp-fieldset">
            <legend>{t('profile.picker.goalsLegend')}</legend>
            <Text type="supporting" size="xsm" color="secondary">
              {t('profile.picker.goalsHint', { max: MAX_LEARNER_GOALS })}
            </Text>
            <div className="lp-checks">
              {LEARNER_GOALS.map((goal) => {
                const checked = goals.includes(goal);
                return (
                  <label key={goal} className="lp-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      // A full set stops accepting new answers but never blocks
                      // clearing one, so the learner is not stuck at the cap.
                      disabled={!checked && goals.length >= MAX_LEARNER_GOALS}
                      onChange={() => toggleGoal(goal)}
                    />
                    <span>{t(goalKey(goal))}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <RadioCardGroup
            value={experience}
            onChange={(value) => setExperience(value as ExperienceLevel)}
            label={t('profile.picker.experienceLegend')}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}
          >
            <Text type="supporting" weight="bold">{t('profile.picker.experienceLegend')}</Text>
            <Text type="supporting" size="xsm" color="secondary">{t('profile.picker.experienceHint')}</Text>
            {EXPERIENCE_LEVELS.map((level, i) => (
              <RadioCard key={level} value={level} index={i} label={t(experienceKey(level))} width="100%">
                <Text>{t(experienceKey(level))}</Text>
              </RadioCard>
            ))}
          </RadioCardGroup>

          <RadioCardGroup
            value={studyTime}
            onChange={(value) => setStudyTime(value as StudyTime)}
            label={t('profile.picker.studyTimeLegend')}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}
          >
            <Text type="supporting" weight="bold">{t('profile.picker.studyTimeLegend')}</Text>
            <Text type="supporting" size="xsm" color="secondary">{t('profile.picker.studyTimeHint')}</Text>
            {STUDY_TIMES.map((band, i) => (
              <RadioCard key={band} value={band} index={i} label={t(studyTimeKey(band))} width="100%">
                <Text>{t(studyTimeKey(band))}</Text>
              </RadioCard>
            ))}
          </RadioCardGroup>

          {!canCommit && (
            <Text type="supporting" size="xsm" color="secondary" role="status">
              {t('profile.picker.incomplete')}
            </Text>
          )}
        </div>
      )}

      <div className="lp-actions" style={{ padding: '0 16px 16px' }}>
        {index > 0 && (
          <button type="button" className="lp-btn lp-btn--quiet" onClick={() => setStep(steps[index - 1])} disabled={busy}>
            {t('paths.picker.back')}
          </button>
        )}
        <button type="button" className="lp-btn lp-btn--quiet" onClick={onClose} disabled={busy}>
          {t('paths.picker.cancel')}
        </button>
        {isLast ? (
          <button
            type="button"
            className="lp-btn lp-btn--primary"
            onClick={commit}
            disabled={busy || !canCommit}
          >
            {busy ? t('paths.picker.saving') : t('paths.picker.save')}
          </button>
        ) : (
          <button type="button" className="lp-btn lp-btn--primary" onClick={() => setStep(steps[index + 1])} disabled={busy}>
            {t('paths.picker.continue')}
          </button>
        )}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <Text type="supporting" size="xsm" color="secondary">
          {t(
            step === 'role' ? 'paths.picker.roleFootnote'
              : step === 'paths' ? 'paths.picker.skillFootnote'
                : step === 'profile' ? 'profile.picker.footnote'
                  : 'paths.picker.trackFootnote',
          )}
        </Text>
      </div>
    </Dialog>
  );
}
