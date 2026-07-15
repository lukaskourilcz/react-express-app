// One-time-per-session nudge inviting guests to sign in. Fires shortly after
// the homepage renders, only for users who:
//   - aren't authenticated, and
//   - haven't already dismissed it this session.
//
// Docked to the top-right so it never covers the hero CTA. Rendered on a
// crisp white surface (the same in light + dark modes) so it reads as a
// distinct product moment against the dark chrome.

import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Slide, Snackbar, Stack, Typography } from '@mui/material';
import type { SlideProps } from '@mui/material/Slide';
import { useAuth } from '../lib/auth';
import { useT } from '../i18n/LanguageContext';
import { SIGNUP_BONUS_TOKENS } from '../lib/tokens';
import { SharkFin } from './SharkFin';

const SESSION_FLAG = 'devquiz:register-prompt:dismissed:v1';
const SHOW_DELAY_MS = 2500;

const CloseIcon = () => (
  <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // ignore — storage is best-effort
  }
}

function SlideDown(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

function RegisterPromptSnackbar() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    if (readDismissed()) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  const handleClose = () => {
    setOpen(false);
    markDismissed();
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  };

  if (isAuthenticated) return null;

  return (
    <>
      <Snackbar
        open={open}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        // Sits below the toolbar's floating utility icons, leaves a comfortable
        // gutter from the right edge on desktop and phones.
        sx={{ top: { xs: 12, sm: 20 }, right: { xs: 12, sm: 20 } }}
        TransitionComponent={SlideDown}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          handleClose();
        }}
      >
        <Box
          role="dialog"
          aria-label={t('register.title')}
          sx={{
            position: 'relative',
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            // Always white, both themes — that's the "catch the eye" ask.
            backgroundColor: '#ffffff',
            color: '#111827',
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06)',
            // Brand-green shark-fin accent on the leading edge.
            borderLeft: `4px solid var(--brand-accent)`,
            p: 2,
            pr: 2.5,
          }}
        >
          <IconButton
            aria-label={t('register.dismiss')}
            onClick={handleClose}
            size="small"
            sx={{ position: 'absolute', top: 6, right: 6, color: 'rgba(0, 0, 0, 0.42)', p: 0.5 }}
          >
            <CloseIcon />
          </IconButton>
          <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1.25, pr: 3 }}>
            <Box sx={{ mt: '2px' }}>
              <SharkFin size={22} color={'var(--brand-accent)'} />
            </Box>
            <Stack spacing={0.25}>
              <Typography sx={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', lineHeight: 1.25 }}>
                {t('register.title')}
              </Typography>
              <Typography sx={{ color: '#4b5563', fontSize: '0.82rem', lineHeight: 1.35 }}>
                {t('register.body', { tokens: String(SIGNUP_BONUS_TOKENS) })}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="contained"
              onClick={handleSignIn}
              sx={{
                backgroundColor: 'var(--brand-accent)',
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.75,
                boxShadow: 'none',
                '&:hover': { backgroundColor: 'var(--brand-accent-hover)', boxShadow: 'none' },
              }}
            >
              {t('register.cta')}
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={handleClose}
              sx={{ color: 'rgba(0, 0, 0, 0.6)', textTransform: 'none' }}
            >
              {t('register.dismiss')}
            </Button>
          </Stack>
        </Box>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={8000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ top: { xs: 12, sm: 20 } }}
      >
        <Box
          sx={{
            backgroundColor: '#fee2e2',
            color: '#7f1d1d',
            border: '1px solid #fecaca',
            borderRadius: 2,
            px: 2,
            py: 1.25,
            fontSize: '0.85rem',
            maxWidth: 320,
          }}
        >
          {error}
        </Box>
      </Snackbar>
    </>
  );
}

export default RegisterPromptSnackbar;
