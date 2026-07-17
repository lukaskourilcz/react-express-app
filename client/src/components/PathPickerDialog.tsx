// The learning-path picker shown from the landing hero. Lets a signed-in
// learner choose Frontend / Backend / Fullstack, each with a short description.
// The parent (Home) handles applying + autosaving the choice; this component
// only presents the options and reports the selection.
//
// Redesigned on the Astryx design system: an Astryx Dialog whose options are
// SelectableCards. Selecting a card reports the choice immediately (the parent
// applies + closes), and the currently-applied track carries a "current" Badge.

import { useEffect, useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { trackLabelKey, trackBlurbKey, TRACK_ORDER, type Track } from '../lib/tracks';
import { useSubject } from '../lib/subjects';
import { useT } from '../i18n/LanguageContext';

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
      <VStack gap={1.5} padding={4} width="100%">
        {TRACK_ORDER.map((tk) => {
          const selected = tk === active;
          return (
            <SelectableCard
              key={tk}
              label={t(trackLabelKey(subject, tk))}
              isSelected={selected}
              variant={selected ? 'muted' : 'default'}
              width="100%"
              onChange={() => {
                setActive(tk);
                onChoose(tk);
              }}
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
            </SelectableCard>
          );
        })}
      </VStack>
    </Dialog>
  );
}
