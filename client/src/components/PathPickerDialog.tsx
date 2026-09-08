// The learning-path picker: choose a base track, then — on devShark only —
// choose whether to add the Forward Deployed Engineer specialization on top.
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
import type { RoleSpecializationId } from '../../../shared/learning-paths';
import './paths/LearningPaths.css';

/** The second step's two answers. `none` is a real choice, not a dismissal. */
type RoleChoice = RoleSpecializationId | 'none';
const ROLE_ORDER: RoleChoice[] = ['none', 'fde'];

export interface PathPickerResult {
  track: Track;
  specialization: RoleSpecializationId | null;
}

export default function PathPickerDialog({
  open,
  onClose,
  current,
  currentSpecialization,
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
  onChoose: (result: PathPickerResult) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const t = useT();
  const [subject] = useSubject();
  // devShark is the only product with a role specialization. Everywhere else
  // the dialog is the single-step track picker it has always been.
  const offersRole = CURRENT_PRODUCT.id === 'devshark';

  const [step, setStep] = useState<'track' | 'role'>('track');
  const [track, setTrack] = useState<Track>(current);
  const [role, setRole] = useState<RoleChoice>(currentSpecialization ?? 'none');

  useEffect(() => {
    if (!open) return;
    setStep('track');
    setTrack(current);
    setRole(currentSpecialization ?? 'none');
  }, [open, current, currentSpecialization]);

  const commit = (chosenRole: RoleChoice) =>
    onChoose({ track, specialization: chosenRole === 'none' ? null : chosenRole });

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
        title={step === 'track' ? t('home.pathDialogTitle') : t('paths.picker.roleTitle')}
        subtitle={step === 'track' ? t('home.pathDialogSubtitle') : t('paths.picker.roleSubtitle')}
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

      {step === 'track' ? (
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
      ) : (
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

      <div className="lp-actions" style={{ padding: '0 16px 16px' }}>
        {step === 'role' && (
          <button type="button" className="lp-btn lp-btn--quiet" onClick={() => setStep('track')} disabled={busy}>
            {t('paths.picker.back')}
          </button>
        )}
        <button type="button" className="lp-btn lp-btn--quiet" onClick={onClose} disabled={busy}>
          {t('paths.picker.cancel')}
        </button>
        {step === 'track' && offersRole ? (
          <button type="button" className="lp-btn lp-btn--primary" onClick={() => setStep('role')} disabled={busy}>
            {t('paths.picker.continue')}
          </button>
        ) : (
          <button
            type="button"
            className="lp-btn lp-btn--primary"
            onClick={() => commit(offersRole ? role : 'none')}
            disabled={busy}
          >
            {busy ? t('paths.picker.saving') : t('paths.picker.save')}
          </button>
        )}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <Text type="supporting" size="xsm" color="secondary">
          {step === 'role' ? t('paths.picker.roleFootnote') : t('paths.picker.trackFootnote')}
        </Text>
      </div>
    </Dialog>
  );
}
