// Mounts the one upgrade sheet. Light on purpose: it lives in the app shell,
// so the dialog itself loads only the first time something asks for it.
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ENTITLEMENT_QUERY_ROOT, closeUpgradeSheet, useUpgradeRequest } from '../lib/upgradeSheet';
import { isChunkLoadError, lazyShellPart } from '../lib/routeRecovery';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { ShellPartBoundary } from './ShellPartBoundary';
import { AppToast } from './ui/AppToast';

// `lazyShellPart`, not `lazy`: a sheet whose code failed is asked for again
// the next time something opens it (lib/routeRecovery.ts).
const UpgradeSheet = lazyShellPart(() => import('./UpgradeSheet'));

export default function UpgradeSheetHost() {
  const request = useUpgradeRequest();
  const queryClient = useQueryClient();
  const t = useT();
  // A sheet that fails closes, and says why here: the shell and the page stay.
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const clearFailure = useCallback(() => setFailure(null), []);
  const requestId = request?.id;
  // A refusal can mean the cached plan is stale (Premium lapsed, or was bought
  // on another device), so every request refreshes it.
  useEffect(() => {
    if (requestId !== undefined) void queryClient.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_ROOT });
  }, [requestId, queryClient]);
  return (
    <>
      {request && (
        <Suspense fallback={null}>
          <ShellPartBoundary
            key={request.id}
            fallback={() => null}
            onError={(error) => {
              closeUpgradeSheet();
              setFailure(isChunkLoadError(error) ? 'error.network' : 'error.generic');
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
