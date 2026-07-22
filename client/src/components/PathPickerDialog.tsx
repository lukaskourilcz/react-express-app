// The learning-path picker shown from the landing hero. Lets a signed-in
// learner choose Frontend / Backend / Fullstack, each with a short description.
// The parent (Home) handles applying + autosaving the choice; this component
// only presents the options and reports the selection.
//
// Redesigned on the Astryx design system: an Astryx Dialog whose options use
// the shared radio-card pattern. Activating a card applies + closes; arrow keys
// can browse the exclusive options without unexpectedly closing the dialog.

import { useEffect, useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { trackLabelKey, trackBlurbKey, TRACK_ORDER, type Track } from '../lib/tracks';
import { useSubject } from '../lib/subjects';
import { useT } from '../i18n/LanguageContext';
import { RadioCard, RadioCardGroup } from './ui/RadioCards';

export default function PathPickerDialog({
  open,
  onClose,
  current,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  current: Track;
  onChoose: (track: Track) => void;
}) {
  const t = useT();
  const [subject] = useSubject();
  // Track which option is visually highlighted; selecting a card reports the
  // choice up to the parent (which applies + closes).
  const [active, setActive] = useState<Track>(current);

  useEffect(() => {
    if (open) setActive(current);
  }, [open, current]);

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
        title={t('home.pathDialogTitle')}
        subtitle={t('home.pathDialogSubtitle')}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      />
      <RadioCardGroup
        value={active}
        onChange={(value) => setActive(value as Track)}
        onActivate={(value) => onChoose(value as Track)}
        label={t('home.pathDialogSubtitle')}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, width: '100%' }}
      >
        {TRACK_ORDER.map((tk) => {
          const selected = tk === active;
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
    </Dialog>
  );
}
