// Mounts the one upgrade sheet. Light on purpose: it lives in the app shell,
// so the dialog itself loads only the first time something asks for it.
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ENTITLEMENT_QUERY_ROOT,
  clearUpgradeResume,
  closeUpgradeSheet,
  markUpgradeResume,
  openUpgradeSheet,
  takeUpgradeOpener,
  takeUpgradeResume,
  useUpgradeRequest,
  type UpgradeRequest,
} from '../lib/upgradeSheet';
import { RELOAD_GRACE_MS, browserRecovery, isChunkLoadError, lazyShellPart, reloadOnPress, type Recovery } from '../lib/routeRecovery';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { ShellPartBoundary } from './ShellPartBoundary';
import { AppToast } from './ui/AppToast';

// `lazyShellPart`, not `lazy`: a sheet whose code failed is asked for again
// the next time something opens it (lib/routeRecovery.ts).
const UpgradeSheet = lazyShellPart(() => import('./UpgradeSheet'));

/**
 * A sheet whose code fails closes with a toast, and the next request asks for
 * it again. Where the browser remembers a failed module fetch (Chromium up to
 * 155, Safari), asking again fails at once without a request, so a second
 * failure in this document on the learner's press reloads the page through
 * `reloadOnPress`, and the next document opens the sheet that was asked for.
 * A 402 from the API client never reloads: nobody pressed anything.
 */
export default function UpgradeSheetHost({ recovery = browserRecovery }: { recovery?: Recovery }) {
  const request = useUpgradeRequest();
  const queryClient = useQueryClient();
  const t = useT();
  // A sheet that fails closes, and says why here: the shell and the page stay.
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const clearFailure = useCallback(() => setFailure(null), []);
  // The sheet's code failed once already in this document.
  const failedBefore = useRef(false);
  // The document before this one reloaded to open the sheet: open it now.
  useEffect(() => {
    const resume = takeUpgradeResume();
    if (resume) openUpgradeSheet(resume);
  }, []);
  const reloadFor = useCallback(async (asked: UpgradeRequest) => {
    markUpgradeResume(asked);
    const reloading = await reloadOnPress(recovery);
    const giveUp = () => {
      clearUpgradeResume();
      setFailure('error.network');
    };
    // Offline or unanswered: nothing reloads. A refused reload (the leave-page
    // prompt) says why once the grace has passed.
    if (!reloading) giveUp();
    else window.setTimeout(giveUp, RELOAD_GRACE_MS);
  }, [recovery]);
  const requestId = request?.id;
  // A refusal can mean the cached plan is stale (Premium lapsed, or was bought
  // on another device), so every request refreshes it.
  useEffect(() => {
    if (requestId !== undefined) void queryClient.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_ROOT });
  }, [requestId, queryClient]);
  // Closed (Escape, Not now, or a sheet that failed): focus goes back to the
  // lock that opened it, now that the dialog has left the page.
  const open = request !== null;
  useEffect(() => {
    if (open) return;
    const opener = takeUpgradeOpener();
    if (opener?.isConnected) opener.focus();
  }, [open]);
  return (
    <>
      {request && (
        <Suspense fallback={null}>
          <ShellPartBoundary
            key={request.id}
            fallback={() => null}
            onError={(error) => {
              closeUpgradeSheet();
              const chunk = isChunkLoadError(error);
              if (chunk && failedBefore.current && !request.fromResponse) {
                void reloadFor(request);
                return;
              }
              if (chunk) failedBefore.current = true;
              setFailure(chunk ? 'error.network' : 'error.generic');
            }}
          >
            <UpgradeSheet request={request} />
          </ShellPartBoundary>
        </Suspense>
      )}
      <AppToast open={failure !== null} onClose={clearFailure} severity="error" autoHideDuration={8000} message={failure ? t(failure) : null} />
    </>
  );
}
