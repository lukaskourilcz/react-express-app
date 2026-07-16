// One-time-per-session nudge inviting guests to sign in. Fires shortly after
// the homepage renders, only for users who:
//   - aren't authenticated, and
//   - haven't already dismissed it this session.
//
// Docked to the top-right so it never covers the hero CTA. Rendered on a
// crisp white surface (the same in light + dark modes) so it reads as a
// distinct product moment against the dark chrome.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { m, AnimatePresence } from '../lib/motion';
import { useIsMobile } from '../lib/useMediaQuery';
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

function RegisterPromptSnackbar() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const t = useT();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    if (readDismissed()) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  // Auto-hide the error toast (was the Snackbar's autoHideDuration).
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 8000);
    return () => window.clearTimeout(id);
  }, [error]);

  const handleClose = () => {
    setOpen(false);
    markDismissed();
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signInFailed'));
    }
  };

  if (isAuthenticated) return null;
  if (typeof document === 'undefined') return null;

  // Sits below the toolbar's floating utility icons, leaves a comfortable gutter
  // from the right edge on desktop and phones.
  const gutter = isMobile ? 12 : 20;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: gutter,
        right: gutter,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        zIndex: 1400,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {open && (
          <m.div
            key="register-card"
            role="dialog"
            aria-label={t('register.title')}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              pointerEvents: 'auto',
              position: 'relative',
              width: 320,
              maxWidth: 'calc(100vw - 24px)',
              // Always white, both themes — that's the "catch the eye" ask. Pin
              // color-scheme to light so the nested Astryx Text/Button resolve
              // their light-theme (dark-on-white) tokens even in dark mode.
              colorScheme: 'light',
              backgroundColor: '#ffffff',
              color: '#111827',
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06)',
              // Brand-green shark-fin accent on the leading edge.
              borderLeft: '4px solid var(--brand-accent)',
              padding: '16px 20px 16px 16px',
            }}
          >
            <button
              type="button"
              aria-label={t('register.dismiss')}
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'rgba(0, 0, 0, 0.6)',
                cursor: 'pointer',
                padding: 4,
                lineHeight: 0,
              }}
            >
              <CloseIcon />
            </button>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10, paddingRight: 24 }}>
              <div style={{ marginTop: 2 }}>
                <SharkFin size={22} color={'var(--brand-accent)'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text as="div" type="body" weight="bold" color="primary">
                  {t('register.title')}
                </Text>
                <Text as="div" type="supporting" color="secondary">
                  {t('register.body', { tokens: String(SIGNUP_BONUS_TOKENS) })}
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="sm" variant="ghost" label={t('register.dismiss')} onClick={handleClose} />
              <Button size="sm" variant="primary" label={t('register.cta')} onClick={handleSignIn} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <m.div
            key="register-error"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#fee2e2',
              color: '#7f1d1d',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: '0.85rem',
              maxWidth: 320,
            }}
          >
            {error}
          </m.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export default RegisterPromptSnackbar;
