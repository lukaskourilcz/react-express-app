// Mounts the one sign-in dialog. Light on purpose: it lives in the app shell,
// so the dialog itself loads only the first time something asks for it, as
// the upgrade sheet does (UpgradeSheetHost.tsx).
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  clearSignInDialogResume,
  closeSignIn,
  markSignInDialogResume,
  openSignIn,
  takeSignInDialogResume,
  takeSignInOpener,
  useSignInRequest,
  type SignInRequest,
} from '../../lib/signInDialog';
import { RELOAD_GRACE_MS, browserRecovery, isChunkLoadError, lazyShellPart, reloadOnPress, type Recovery } from '../../lib/routeRecovery';
import { useAuth } from '../../lib/auth';
import { useT } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import { ShellPartBoundary } from '../ShellPartBoundary';
import { AppToast } from '../ui/AppToast';

// `lazyShellPart`, not `lazy`: a dialog whose code failed is asked for again
// the next time something opens it (lib/routeRecovery.ts).
const SignInDialog = lazyShellPart(() => import('./SignInDialog'));

/**
 * A dialog whose code fails closes with a toast, and the next press asks for
 * it again; a second failure in this document reloads the page through
 * `reloadOnPress`, and the next document opens the dialog that was asked for.
 * The account arriving (an email sign-in here, or a sign-in in another tab)
 * closes the dialog and says so to a screen reader.
 */
export default function SignInDialogHost({ recovery = browserRecovery }: { recovery?: Recovery }) {
  const request = useSignInRequest();
  const { isAuthenticated } = useAuth();
  const t = useT();
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const clearFailure = useCallback(() => setFailure(null), []);
  // Said, not shown: the header's account button already shows the sign-in,
  // and a toast here would sit on the welcome-coins toast of a first one.
  const [signedIn, setSignedIn] = useState(false);
  const failedBefore = useRef(false);

  // The document before this one reloaded to open the dialog: open it now.
  useEffect(() => {
    const resume = takeSignInDialogResume();
    if (resume) openSignIn(resume);
  }, []);

  const open = request !== null;
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    closeSignIn();
    setSignedIn(true);
  }, [open, isAuthenticated]);
  useEffect(() => {
    if (!signedIn) return;
    const timer = window.setTimeout(() => setSignedIn(false), 5000);
    return () => window.clearTimeout(timer);
  }, [signedIn]);

  // Closed: focus goes back to what opened the dialog, now that it has left
  // the page. A "Log in" button that the sign-in replaced is gone, so focus
  // goes to the page instead of being dropped on <body>.
  useEffect(() => {
    if (open) return;
    const opener = takeSignInOpener();
    if (opener?.isConnected) opener.focus();
    else if (opener) document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [open]);

  const reloadFor = useCallback(async (asked: SignInRequest) => {
    markSignInDialogResume(asked);
    const reloading = await reloadOnPress(recovery);
    const giveUp = () => {
      clearSignInDialogResume();
      setFailure('error.network');
    };
    if (!reloading) giveUp();
    else window.setTimeout(giveUp, RELOAD_GRACE_MS);
  }, [recovery]);

  return (
    <>
      {request && !isAuthenticated && (
        <Suspense fallback={null}>
          <ShellPartBoundary
            key={request.id}
            fallback={() => null}
            onError={(error) => {
              closeSignIn();
              const chunk = isChunkLoadError(error);
              if (chunk && failedBefore.current) {
                void reloadFor(request);
                return;
              }
              if (chunk) failedBefore.current = true;
              setFailure(chunk ? 'error.network' : 'error.generic');
            }}
          >
            <SignInDialog request={request} />
          </ShellPartBoundary>
        </Suspense>
      )}
      <AppToast open={failure !== null} onClose={clearFailure} severity="error" autoHideDuration={8000} message={failure ? t(failure) : null} />
      <p className="ss-sr-only" role="status">{signedIn ? t('auth.signedIn') : ''}</p>
    </>
  );
}
