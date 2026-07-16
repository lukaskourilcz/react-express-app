// The StudyShark landing: pick what to study. Choosing a subject sets the
// active subject (persisted) and drops the learner into the normal app, now
// scoped to that subject's roadmap, quiz, categories and accent. Reachable any
// time at /subjects to switch subjects.
//
// Redesigned on the Astryx design system: subjects render as ClickableCards in
// a responsive auto-fitting Grid, each carrying its own accent.

import { useNavigate } from 'react-router-dom';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { SwimmingFin } from './SharkFin';
import { useT } from '../i18n/LanguageContext';
import {
  SUBJECTS,
  SUBJECT_ORDER,
  useSubject,
  setSubjectValue,
  type SubjectId,
} from '../lib/subjects';

// Each subject maps to the closest Astryx colour variant for its "Current"
// badge; the exact brand hex still drives the emoji tile + title colour.
const BADGE_VARIANT: Record<SubjectId, 'green' | 'orange' | 'blue' | 'neutral' | 'yellow' | 'teal' | 'red'> = {
  webdev: 'green',
  geography: 'orange',
  math: 'blue',
  history: 'neutral',
  chess: 'yellow',
  biology: 'teal',
  poker: 'red',
};

export default function SubjectPicker() {
  const navigate = useNavigate();
  const [current] = useSubject();
  const t = useT();

  const choose = (id: SubjectId) => {
    setSubjectValue(id);
    navigate('/');
  };

  return (
    <div style={{ width: '100%', maxWidth: 980, margin: '0 auto' }}>
      <VStack gap={5} align="center">
        <VStack gap={2} align="center">
          <HStack gap={1.5} align="center">
            <SwimmingFin size={30} />
            <Heading level={1} type="display-2" justify="center">
              StudyShark
            </Heading>
          </HStack>
          <Heading level={2} justify="center">
            {t('subject.prompt')}
          </Heading>
          <Text type="large" color="secondary" justify="center">
            {t('subject.subtitle')}
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 262, max: 3 }} gap={3} width="100%">
          {SUBJECT_ORDER.map((id, i) => {
            const s = SUBJECTS[id];
            const active = id === current;
            return (
              <div
                key={id}
                className="ss-lift ss-pop"
                style={{ display: 'flex', animationDelay: `${i * 55}ms` }}
              >
                <ClickableCard
                  label={t('subject.study', { subject: s.label })}
                  onClick={() => choose(id)}
                  variant={active ? 'muted' : 'default'}
                  padding={5}
                  width="100%"
                >
                  <VStack gap={2}>
                    <HStack gap={2} align="center">
                      <div
                        aria-hidden
                        className="ss-tile"
                        style={{
                          width: 52,
                          height: 52,
                          fontSize: '1.75rem',
                          background: `${s.accent}14`,
                          boxShadow: `inset 0 0 0 1px ${s.accent}33`,
                        }}
                      >
                        {s.emoji}
                      </div>
                      <Heading level={3}>
                        <span style={{ color: s.accent }}>{s.label}</span>
                      </Heading>
                      {active && (
                        <div style={{ marginLeft: 'auto' }}>
                          <Badge variant={BADGE_VARIANT[id]} label={t('subject.current')} />
                        </div>
                      )}
                    </HStack>
                    <Text type="supporting" color="secondary">
                      {s.blurb}
                    </Text>
                    <div
                      style={{
                        marginTop: 2,
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        padding: '3px 10px',
                        fontFamily: 'var(--font-family-body)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        color: s.accent,
                        background: `${s.accent}14`,
                      }}
                    >
                      {t('subject.meta', { count: s.topics.length })}
                    </div>
                  </VStack>
                </ClickableCard>
              </div>
            );
          })}
        </Grid>
      </VStack>
    </div>
  );
}
