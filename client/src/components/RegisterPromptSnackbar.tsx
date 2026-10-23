// One-time-per-session nudge inviting guests to sign in. Fires after their
// first interaction with the homepage, only for users who:
//   - aren't authenticated, and
//   - haven't already dismissed it this session.
//
// This part decides when, and ships with the shell. The card itself
// (RegisterPromptCard.tsx) loads when the nudge first opens: most visits never
// see it, and its markup does not belong in the first download. The first
// interaction starts that download, so the card is there when the delay ends.

import { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { openSignIn, useSignInRequest } from '../lib/signInDialog';
import { lazyShellPart } from '../lib/routeRecovery';
import { ShellPartBoundary } from './ShellPartBoundary';

const loadCard = () => import('./RegisterPromptCard');
// `lazyShellPart` + ShellPartBoundary: a card whose code did not load leaves
// nothing in its place, never the app's error screen.
const RegisterPromptCard = lazyShellPart(loadCard);

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
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // Opened once: the card stays mounted after, so it can animate out.
  const [shown, setShown] = useState(false);
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
      void loadCard().catch(() => {});
      timer = setTimeout(() => {
        if (readDismissed()) return;
        setShown(true);
        setOpen(true);
      }, SHOW_DELAY_MS);
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

  if (isAuthenticated || !shown) return null;

  return (
    <Suspense fallback={null}>
      <ShellPartBoundary fallback={() => null}>
        <RegisterPromptCard open={open} onClose={handleClose} onSignIn={handleSignIn} />
      </ShellPartBoundary>
    </Suspense>
  );
}

export default RegisterPromptSnackbar;
