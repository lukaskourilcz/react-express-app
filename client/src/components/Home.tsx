// The landing page at "/". Instead of dropping visitors straight into the quiz,
// it explains what devShark offers and the first thing to do: sign in (so
// progress is remembered), pick a dev path (Frontend / Backend / Fullstack),
// then start learning. It also makes clear the whole app is free.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Chip, Snackbar, Alert } from '@mui/material';
import { BRAND, brandButtonSx } from '../theme/MuiTheme';
import { SwimmingFin } from './SharkFin';
import { useT } from '../i18n/LanguageContext';
import { useAuth } from '../lib/auth';

export default function Home() {
  const t = useT();
  const navigate = useNavigate();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    }
  };

  const ctaSx = { px: 3, py: 1.25, fontWeight: 700, textTransform: 'none' as const };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, sm: 6 } }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SwimmingFin size={34} />
          <Typography variant="overline" sx={{ color: BRAND.green, fontWeight: 800, letterSpacing: 1.5 }}>
            devShark
          </Typography>
        </Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 900, mb: 1.5, lineHeight: 1.1, fontSize: { xs: '2rem', sm: '2.75rem' } }}>
          {t('home.title')}
        </Typography>
        <Typography variant="h6" component="p" sx={{ color: 'text.secondary', fontWeight: 400, maxWidth: 680, mx: 'auto', mb: 2.5 }}>
          {t('home.subtitle')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
          <Chip label={t('home.freeBadge')} sx={{ fontWeight: 800, backgroundColor: BRAND.green, color: '#fff' }} />
          <Chip label="Frontend · Backend · Fullstack" variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <>
              <Button variant="contained" size="large" onClick={() => navigate('/profile')} sx={{ ...brandButtonSx, ...ctaSx }}>
                {t('home.ctaChoosePath')}
              </Button>
              <Button variant="outlined" size="large" component={Link} to="/learn" sx={ctaSx}>
                {t('home.ctaLearn')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="contained" size="large" onClick={handleSignIn} sx={{ ...brandButtonSx, ...ctaSx }}>
                {t('home.ctaSignIn')}
              </Button>
              <Button variant="outlined" size="large" component={Link} to="/quiz" sx={ctaSx}>
                {t('home.ctaQuiz')}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Free banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: { xs: 4, sm: 5 },
          border: '1px solid',
          borderColor: BRAND.green,
          borderRadius: 2,
          backgroundColor: BRAND.greenSoft,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ fontSize: 30, lineHeight: 1 }} aria-hidden>
          🆓
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{t('home.freeTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('home.freeText')}
          </Typography>
        </Box>
      </Paper>

      {/* How to get started */}
      <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 2, textAlign: 'center' }}>
        {t('home.stepsTitle')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: { xs: 4, sm: 5 } }}>
        <StepCard n={1} done={isAuthenticated} title={t('home.step1Title')} text={t('home.step1Text')} />
        <StepCard n={2} title={t('home.step2Title')} text={t('home.step2Text')} />
        <StepCard n={3} title={t('home.step3Title')} text={t('home.step3Text')} />
      </Box>

      {/* What's inside */}
      <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 2, textAlign: 'center' }}>
        {t('home.featuresTitle')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FeatureCard emoji="📚" title={t('home.featureLearnTitle')} text={t('home.featureLearnText')} />
        <FeatureCard emoji="⚡" title={t('home.featureQuizTitle')} text={t('home.featureQuizText')} />
        <FeatureCard emoji="🗺️" title={t('home.featureRoadmapTitle')} text={t('home.featureRoadmapText')} />
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
    </Box>
  );
}

function StepCard({ n, title, text, done }: { n: number; title: string; text: string; done?: boolean }) {
  return (
    <Paper elevation={0} sx={{ flex: '1 1 220px', minWidth: 200, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box
          aria-hidden
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#fff',
            backgroundColor: done ? BRAND.green : 'text.secondary',
            flexShrink: 0,
          }}
        >
          {done ? '✓' : n}
        </Box>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Paper>
  );
}

function FeatureCard({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <Paper elevation={0} sx={{ flex: '1 1 220px', minWidth: 220, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ fontSize: 28, lineHeight: 1, mb: 1 }} aria-hidden>
        {emoji}
      </Box>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Paper>
  );
}
