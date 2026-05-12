import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { setAccessTokenGetter } from './api';

/**
 * Bridges Auth0's hook-based token API to the module-scoped getter used by
 * non-component code (lib/supabase.ts, lib/play.ts). Mounted once near the
 * tree root so all subsequent apiFetch calls receive the user's Bearer token.
 */
export function AuthBridge() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    if (!isAuthenticated) {
      setAccessTokenGetter(null);
      return;
    }
    setAccessTokenGetter(() =>
      getAccessTokenSilently().catch(() => null),
    );
    return () => setAccessTokenGetter(null);
  }, [isAuthenticated, getAccessTokenSilently]);

  return null;
}
