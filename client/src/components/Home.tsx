// The landing page at "/". Instead of dropping visitors straight into the quiz,
// it explains what devShark offers and the first thing to do: sign in (so
// progress is remembered), pick a dev path (Frontend / Backend / Fullstack),
// then start learning. It also makes clear the whole app is free.

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Paper, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
import { heroMeshFor } from '../theme/meshGradient';
import { useColorMode } from '../theme/ColorModeContext';
import { SwimmingFin } from './SharkFin';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';
import { MotionItem } from '../lib/motion';
import { useTrack, useHasChosenTrack, trackStarterTopics, TRACKS, type Track } from '../lib/tracks';
import { unlockExtraTopics, pushProgressToServer } from '../lib/roadmap';
import { savePreferredTrack } from '../lib/trackPref';
import PathPickerDialog from './PathPickerDialog';

// The motion wrapper becomes the flex item, so it carries the card's flex
// sizing and lays the (flex) Paper out to fill it.
const CARD_MOTION_STYLE = { display: 'flex', flex: '1 1 220px', minWidth: 220 } as const;

export default function Home() {
  const t = useT();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const { mode } = useColorMode();
  const [track, setTrack] = useTrack();
  const hasChosenPath = useHasChosenTrack();
  const [pathOpen, setPathOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSnack, setSavedSnack] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

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
    setSavedSnack(t('home.trackSavedSnack', { label: TRACKS[next].label }));
    setPathOpen(false);
  };

  const ctaSx = { px: 3, py: 1.25, fontWeight: 700, textTransform: 'none' as const };

  return (
    // One-viewport landing: hero pitch + the three things a new learner gets.
    // Fills the shell exactly (no page scroll); vertically centred.
    <Box sx={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: { xs: 2, sm: 3 } }}>
      {/* Hero: Colorflow-style OKLCH mesh gradient behind the pitch. It's a
          pure CSS background-image (zero runtime, no dependency) and degrades to
          the flat theme background where oklch() isn't supported. */}
      <Box
        sx={{
          textAlign: 'center',
          backgroundImage: heroMeshFor(mode),
          borderRadius: 3,
          px: { xs: 2, sm: 4 },
          py: { xs: 3, sm: 5 },
          mx: { xs: -0.5, sm: 0 },
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: { xs: 1, sm: 2 } }}>
          <SwimmingFin size={34} />
          <Typography variant="overline" sx={{ color: BRAND.green, fontWeight: 800, letterSpacing: 1.5 }}>
            devShark
          </Typography>
        </Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 900, mb: 1.25, lineHeight: 1.1, fontSize: { xs: '1.85rem', sm: '2.75rem' } }}>
          {t('home.title')}
        </Typography>
        <Typography variant="h6" component="p" sx={{ color: 'text.secondary', fontWeight: 400, maxWidth: 680, mx: 'auto', mb: { xs: 2, sm: 2.5 }, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
          {t('home.subtitle')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            hasChosenPath ? (
              <Button variant="contained" size="large" component={Link} to="/learn" sx={{ ...brandButtonSx, ...ctaSx }}>
                {t('home.continueTrack', { track: TRACKS[track].label })}
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large" onClick={() => setPathOpen(true)} sx={{ ...brandButtonSx, ...ctaSx }}>
                  {t('home.ctaChoosePath')}
                </Button>
                <Button variant="outlined" size="large" component={Link} to="/learn" sx={ctaSx}>
                  {t('home.ctaLearn')}
                </Button>
              </>
            )
          ) : (
            <>
              <Button
                variant="contained"
                size="large"
                onClick={handleSignIn}
                disabled={signingIn}
                startIcon={signingIn ? <CircularProgress size={18} color="inherit" /> : undefined}
                sx={{ ...brandButtonSx, ...ctaSx }}
              >
                {t('home.ctaSignIn')}
              </Button>
              <Button variant="outlined" size="large" component={Link} to="/quiz" sx={ctaSx}>
                {t('home.ctaQuiz')}
              </Button>
            </>
          )}
        </Box>
        {/* The free promise lives right under the decision point — one quiet
            line instead of a whole banner section. */}
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
          {t('home.freeText')}
        </Typography>
      </Box>

      {/* What a new learner gets — three compact chalkboards. */}
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
        {[
          { title: t('home.featureLearnTitle'), text: t('home.featureLearnText') },
          { title: t('home.featureQuizTitle'), text: t('home.featureQuizText') },
          { title: t('home.featureRoadmapTitle'), text: t('home.featureRoadmapText') },
        ].map((f, i) => (
          <MotionItem key={f.title} index={i} style={CARD_MOTION_STYLE}>
            <FeatureCard title={f.title} text={f.text} />
          </MotionItem>
        ))}
      </Box>

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
        <Alert severity="success" variant="filled" onClose={() => setSavedSnack(null)} sx={{ backgroundColor: BRAND.green }}>
          {savedSnack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ──── Chalkboard cards ─────────────────────────────────────────────────────
 * The "how to get started" and "what's inside" cards are styled as little slate
 * chalkboards: a dark green slate inside a wooden frame, chalk-white text with a
 * faint chalk glow, and a hand-drawn underline beneath each heading. Sharp
 * corners (the wood frame) keep them in step with the rest of the redesign. The
 * dark surface is the same in light and dark mode by design — a chalkboard is a
 * chalkboard. */
const CHALK = '#f1f5ee';
const CHALK_DIM = 'rgba(241, 245, 238, 0.74)';

const chalkboardSx = {
  flex: '1 1 220px',
  minWidth: 220,
  p: { xs: 1.75, sm: 2.5 },
  borderRadius: 0,
  color: CHALK,
  backgroundColor: '#21302a',
  // Faint, uneven chalk dust so the slate isn't a flat fill.
  backgroundImage:
    'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.05), transparent 42%), radial-gradient(circle at 85% 88%, rgba(255,255,255,0.04), transparent 38%)',
  border: '6px solid #3b2c1e', // wooden frame
  boxShadow:
    'inset 0 0 0 2px rgba(255,255,255,0.06), inset 0 0 34px rgba(0,0,0,0.5), 0 4px 14px rgba(0,0,0,0.22)',
} as const;

// A chalky heading with a hand-drawn underline.
function ChalkHeading({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="h3"
      sx={{
        fontWeight: 800,
        color: CHALK,
        textShadow: '0 0 1px rgba(255,255,255,0.35)',
        display: 'inline-block',
        pb: 0.4,
        borderBottom: '2px solid rgba(241,245,238,0.4)',
        lineHeight: 1.3,
      }}
    >
      {children}
    </Typography>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <Paper elevation={0} sx={chalkboardSx}>
      <Box sx={{ mb: 0.75 }}>
        <ChalkHeading>{title}</ChalkHeading>
      </Box>
      <Typography variant="body2" sx={{ color: CHALK_DIM }}>
        {text}
      </Typography>
    </Paper>
  );
}
