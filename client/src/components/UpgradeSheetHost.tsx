// Mounts the one upgrade sheet. Light on purpose: it lives in the app shell,
// so the dialog itself loads only the first time something asks for it.
import { lazy, Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ENTITLEMENT_QUERY_ROOT, useUpgradeRequest } from '../lib/upgradeSheet';

const UpgradeSheet = lazy(() => import('./UpgradeSheet'));

export default function UpgradeSheetHost() {
  const request = useUpgradeRequest();
  const queryClient = useQueryClient();
  const requestId = request?.id;
  // A refusal can mean the cached plan is stale (Premium lapsed, or was bought
  // on another device), so every request refreshes it.
  useEffect(() => {
    if (requestId !== undefined) void queryClient.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_ROOT });
  }, [requestId, queryClient]);
  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <UpgradeSheet key={request.id} request={request} />
    </Suspense>
  );
}
