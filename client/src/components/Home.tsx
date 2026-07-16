// The landing page at "/". Instead of dropping visitors straight into the quiz,
// it explains what StudyShark offers and the first thing to do: sign in (so
// progress is remembered), pick a dev path (Frontend / Backend / Fullstack),
// then start learning. It also makes clear the whole app is free.
//
// Redesigned on the Astryx design system: an OKLCH mesh hero with Astryx
// typography + buttons, and a responsive Grid of feature cards.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { heroMeshFor } from '../theme/meshGradient';
import { useColorMode } from '../theme/ColorModeContext';
import { SwimmingFin } from './SharkFin';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { MotionItem } from '../lib/motion';
import { useTrack, useHasChosenTrack, trackStarterTopics, tracksForActiveSubject, type Track } from '../lib/tracks';
import { useActiveSubject } from '../lib/subjects';
import { unlockExtraTopics, pushProgressToServer } from '../lib/roadmap';
import { savePreferredTrack } from '../lib/trackPref';
import PathPickerDialog from './PathPickerDialog';

type Feature = { emoji: string; title: string; text: string; variant: 'green' | 'blue' | 'purple' };

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  // The hero adapts to the active subject: Web Dev keeps its curated copy;
  // other subjects use their registry label/blurb so the shell never assumes
  // "developer".
  const subject = useActiveSubject();
  const heroTitle = subject.id === 'webdev' ? t('home.title') : `Learn ${subject.label}`;
  const heroSubtitle = subject.id === 'webdev' ? t('home.subtitle') : subject.blurb;
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const { mode } = useColorMode();
  const [track, setTrack] = useTrack();
  const hasChosenPath = useHasChosenTrack();
  const [pathOpen, setPathOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSnack, setSavedSnack] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
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
    setSavedSnack(t('home.trackSavedSnack', { label: tracksForActiveSubject()[next].label }));
    setPathOpen(false);
  };

  const features: Feature[] = [
    { emoji: '🧭', title: t('home.featureLearnTitle'), text: t('home.featureLearnText'), variant: 'green' },
    { emoji: '⚡', title: t('home.featureQuizTitle'), text: t('home.featureQuizText'), variant: 'blue' },
    ...(isMobile
      ? []
      : [{ emoji: '🗺️', title: t('home.featureRoadmapTitle'), text: t('home.featureRoadmapText'), variant: 'purple' as const }]),
  ];

  return (
    // One-viewport landing: hero pitch + the things a new learner gets. Auto
    // margins (top on hero, bottom on cards) centre the block but collapse under
    // overflow so the page stays top-anchored and scrollable on small screens.
    <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          backgroundImage: heroMeshFor(mode),
          borderRadius: 20,
          marginTop: 'auto',
          padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2.5rem)',
        }}
      >
        <VStack gap={2} align="center">
          <HStack gap={1} align="center">
            <SwimmingFin size={30} />
            <Text type="label" weight="bold" color="accent">
              STUDYSHARK
            </Text>
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
                  label={t('home.continueTrack', { track: tracksForActiveSubject()[track].label })}
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
            <MotionItem key={f.title} index={i} style={{ display: 'flex' }}>
              <Card variant={f.variant} padding={4} width="100%">
                <VStack gap={1}>
                  <HStack gap={1} align="center">
                    <span aria-hidden style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                      {f.emoji}
                    </span>
                    <Heading level={3}>{f.title}</Heading>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {f.text}
                  </Text>
                </VStack>
              </Card>
            </MotionItem>
          ))}
        </Grid>
      </div>

      <Snackbar
        open={!!authError}
        autoHideDuration={5000}
        onClose={() => setAuthError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setAuthError(null)}>
          {authError}
        </Alert>
      </Snackbar>

      <PathPickerDialog
        open={pathOpen}
        onClose={() => setPathOpen(false)}
        current={track}
        onChoose={handleChoosePath}
      />
      <Snackbar
        open={!!savedSnack}
        autoHideDuration={3000}
        onClose={() => setSavedSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSavedSnack(null)} sx={{ backgroundColor: 'var(--brand-accent)' }}>
          {savedSnack}
        </Alert>
      </Snackbar>
    </div>
  );
}
