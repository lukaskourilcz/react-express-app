// One-time-per-session nudge inviting guests to sign in. Fires shortly after
// the homepage renders, only for users who:
//   - aren't authenticated, and
//   - haven't already dismissed it this session.
//
// Wording explicitly says the app is free and mentions the sign-up token bonus
// so the value is concrete, not just an upsell.

import { useEffect, useState } from 'react';
import { Alert, Button, Snackbar, Stack, Typography } from '@mui/material';
import { useAuth } from '../lib/auth';
import { useT } from '../i18n/LanguageContext';
import { SIGNUP_BONUS_TOKENS } from '../lib/tokens';
import { BRAND } from '../theme/MuiTheme';

const SESSION_FLAG = 'devquiz:register-prompt:dismissed:v1';
const SHOW_DELAY_MS = 2500;

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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          handleClose();
        }}
      >
        <Alert
          severity="info"
          variant="outlined"
          icon={false}
          onClose={handleClose}
          sx={{
            backgroundColor: 'background.paper',
            borderColor: BRAND.green,
            color: 'text.primary',
            alignItems: 'flex-start',
            maxWidth: 420,
          }}
        >
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('register.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('register.body', { tokens: String(SIGNUP_BONUS_TOKENS) })}
            </Typography>
            <Typography variant="caption" sx={{ color: BRAND.green, fontWeight: 600 }}>
              {t('register.freeBadge')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleSignIn}
                sx={{ backgroundColor: BRAND.green, '&:hover': { backgroundColor: BRAND.greenHover } }}
              >
                {t('register.cta')}
              </Button>
              <Button size="small" variant="text" onClick={handleClose} sx={{ color: 'text.secondary' }}>
                {t('register.dismiss')}
              </Button>
            </Stack>
          </Stack>
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={8000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

export default RegisterPromptSnackbar;
