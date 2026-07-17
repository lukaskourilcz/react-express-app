// The landing page at "/". Instead of dropping visitors straight into the quiz,
// it explains what StudyShark offers and the first thing to do: sign in (so
// progress is remembered), pick a dev path (Frontend / Backend / Fullstack),
// then start learning. It also makes clear the whole app is free.
//
// Redesigned on the Astryx design system: an OKLCH mesh hero with Astryx
// typography + buttons, and a responsive Grid of feature cards.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { SharkFin, SwimmingFin } from './SharkFin';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { MotionItem } from '../lib/motion';
import { useTrack, useHasChosenTrack, trackStarterTopics, trackLabelKey, type Track } from '../lib/tracks';
import { useActiveSubject, subjectNameKey, subjectBlurbKey } from '../lib/subjects';
import { unlockExtraTopics, pushProgressToServer } from '../lib/roadmap';
import { savePreferredTrack } from '../lib/trackPref';
import PathPickerDialog from './PathPickerDialog';
import { AppToast } from './ui/AppToast';
import { useIsMobile } from '../lib/useMediaQuery';
import { IconTile } from './ui/icons';
import { HOME_FEATURES } from '../lib/homeFeatures';


export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  // The hero adapts to the active subject: Web Dev keeps its curated copy;
  // other subjects use their registry label/blurb so the shell never assumes
  // "developer".
  const subject = useActiveSubject();
  const subjectName = t(subjectNameKey(subject.id));
  const heroTitle = subject.id === 'webdev' ? t('home.title') : t('home.titleSubject', { label: subjectName });
  const heroSubtitle = subject.id === 'webdev' ? t('home.subtitle') : t(subjectBlurbKey(subject.id));
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [track, setTrack] = useTrack();
  const hasChosenPath = useHasChosenTrack();
  const [pathOpen, setPathOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSnack, setSavedSnack] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const isMobile = useIsMobile();

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t('auth.signInFailed'));
      setSigningIn(false);
    }
  };

  // Commit to a learning path from the hero: set it as the shared track, unlock
  // its starting sections, and autosave the choice to the account so it follows
  // the learner across devices. Mirrors the profile path picker's side effects.
  const handleChoosePath = (next: Track) => {
    setTrack(next);
    unlockExtraTopics(trackStarterTopics(next));
    pushProgressToServer().catch(() => {});
    void savePreferredTrack(next);
    setSavedSnack(t('home.trackSavedSnack', { label: t(trackLabelKey(subject.id, next)) }));
    setPathOpen(false);
  };

  // Thematic, per-subject cards (History never advertises a dev career
  // roadmap). Phones show two cards so the landing stays one screen tall.
  const features = HOME_FEATURES[subject.id].slice(0, isMobile ? 2 : 3);

  return (
    // One-viewport landing: hero pitch + the things a new learner gets. Auto
    // margins (top on hero, bottom on cards) centre the block but collapse under
    // overflow so the page stays top-anchored and scrollable on small screens.
    <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        className="ss-panel ss-pop"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-page)',
          marginTop: 'auto',
          padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.25rem, 4vw, 2.5rem)',
        }}
      >
        {/* Brand watermark: an oversized fin ghosted into the card stock. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: '-5%',
            bottom: '-30%',
            opacity: 0.05,
            transform: 'rotate(-8deg)',
            pointerEvents: 'none',
            color: 'var(--ss-ink)',
          }}
        >
          <SharkFin size={560} color="currentColor" />
        </div>
        <VStack gap={2} align="center">
          <HStack gap={1} align="center">
            <SwimmingFin size={22} />
            <span className="ss-kicker ss-kicker--center">StudyShark</span>
          </HStack>
          <Heading level={1} type="display-2" justify="center">
            {heroTitle}
          </Heading>
          <div style={{ maxWidth: 640 }}>
            <Text type="large" color="secondary" justify="center">
              {heroSubtitle}
            </Text>
          </div>
          <HStack gap={1.5} justify="center" wrap="wrap">
            {isAuthenticated ? (
              hasChosenPath ? (
                <Button
                  variant="primary"
                  size="lg"
                  label={t('home.continueTrack', { track: t(trackLabelKey(subject.id, track)) })}
                  onClick={() => navigate('/learn')}
                />
              ) : (
                <>
                  <Button variant="primary" size="lg" label={t('home.ctaChoosePath')} onClick={() => setPathOpen(true)} />
                  <Button variant="secondary" size="lg" label={t('home.ctaLearn')} onClick={() => navigate('/learn')} />
                </>
              )
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  label={t('home.ctaSignIn')}
                  isLoading={signingIn}
                  onClick={handleSignIn}
                />
                <Button variant="secondary" size="lg" label={t('home.ctaQuiz')} onClick={() => navigate('/quiz')} />
              </>
            )}
          </HStack>
          <Text type="supporting" size="xsm" color="secondary" justify="center">
            {t('home.freeText')}
          </Text>
        </VStack>
      </div>

      {/* What a new learner gets. The career-roadmap card is desktop-only: on
          phones two cards keep the landing inside one screen. */}
      <div style={{ marginBottom: 'auto' }}>
        <Grid columns={{ minWidth: 220, max: 3 }} gap={2}>
          {features.map((f, i) => (
            <MotionItem key={f.titleKey} index={i} style={{ display: 'flex', width: '100%' }}>
              <div className="ss-raised" style={{ display: 'flex', width: '100%' }}>
                <Card variant={f.variant} padding={5} width="100%">
                  <VStack gap={2}>
                    <IconTile color={f.color} size={44} style={{ background: 'var(--ss-card-bg)' }}>
                      {f.icon}
                    </IconTile>
                    <Heading level={3}>{t(f.titleKey)}</Heading>
                    <Text type="supporting" color="secondary">
                      {t(f.textKey)}
                    </Text>
                  </VStack>
                </Card>
              </div>
            </MotionItem>
          ))}
        </Grid>
      </div>

      <AppToast
        open={!!authError}
        onClose={() => setAuthError(null)}
        severity="error"
        message={authError}
        autoHideDuration={5000}
      />

      <PathPickerDialog
        open={pathOpen}
        onClose={() => setPathOpen(false)}
        current={track}
        onChoose={handleChoosePath}
      />
      <AppToast
        open={!!savedSnack}
        onClose={() => setSavedSnack(null)}
        severity="success"
        message={savedSnack}
        autoHideDuration={3000}
      />
    </div>
  );
}
