// One-time-per-session nudge inviting guests to sign in. Fires after their
// first interaction with the homepage, only for users who:
//   - aren't authenticated, and
//   - haven't already dismissed it this session.
//
// Docked to the top-right so it never covers the hero CTA. Rendered on a
// crisp white surface (the same in light + dark modes) so it reads as a
// distinct product moment against the dark chrome.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { m, AnimatePresence, useReducedMotion, stillIfReduced } from '../lib/motion';
import { useIsMobile } from '../lib/useMediaQuery';
import { useAuth } from '../lib/auth';
import { openSignIn, useSignInRequest } from '../lib/signInDialog';
import { useT } from '../i18n/LanguageContext';
import { useGameConfig } from '../lib/gameConfig';
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
  const reduce = useReducedMotion();
  const { isAuthenticated, isLoading } = useAuth();
  const t = useT();
  // The welcome coins as the owner configured them (#227); 0 drops the offer.
  const welcomeCoins = useGameConfig().coins.welcomeGrant;
  const isMobile = useIsMobile();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // A visitor who opened the sign-in dialog, from here or anywhere, has found
  // it: the prompt never comes up behind it or after it this session.
  const signInOpen = useSignInRequest() !== null;
  useEffect(() => {
    if (!signInOpen) return;
    markDismissed();
    setOpen(false);
  }, [signInOpen]);

  useEffect(() => {
    if (location.pathname !== '/' || isLoading || isAuthenticated) {
      setOpen(false);
      return;
    }
    if (readDismissed()) return;
    // Let a visitor read before asking them to register. A timed card on an
    // untouched page also became the largest paint, pushing mobile LCP past
    // five seconds even after the landing content had finished rendering.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interacted = () => {
      if (timer !== undefined) return;
      timer = setTimeout(() => { if (!readDismissed()) setOpen(true); }, SHOW_DELAY_MS);
    };
    window.addEventListener('pointerdown', interacted, { once: true });
    window.addEventListener('keydown', interacted, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', interacted);
      window.removeEventListener('keydown', interacted);
    };
  }, [location.pathname, isLoading, isAuthenticated]);

  const handleClose = () => {
    setOpen(false);
    markDismissed();
  };

  // The sign-in dialog takes over from here (Google, or an email and
  // password), so the prompt steps aside for this session.
  const handleSignIn = () => {
    handleClose();
    openSignIn();
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
            role="region"
            aria-label={t('register.title')}
            className="ss-register-prompt"
            initial={stillIfReduced(reduce, { opacity: 0, x: 40 })}
            animate={stillIfReduced(reduce, { opacity: 1, x: 0 })}
            exit={stillIfReduced(reduce, { opacity: 0, x: 40 })}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              pointerEvents: 'auto',
              position: 'relative',
              width: 320,
              maxWidth: 'calc(100vw - 24px)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-background-surface)',
              borderRadius: 18,
              boxShadow: '0 18px 48px rgba(var(--ss-ink-rgb), .2)',
              border: '1px solid var(--color-border)',
              borderBottom: '3px solid var(--brand-accent)',
              padding: '20px',
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
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
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                padding: 0,
                width: 44,
                height: 44,
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
                  {welcomeCoins > 0 ? t('register.body', { tokens: String(welcomeCoins) }) : t('register.bodyNoCoins')}
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
    </div>,
    document.body,
  );
}

export default RegisterPromptSnackbar;
