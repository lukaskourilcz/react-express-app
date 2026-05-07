import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { initCardSync, resetCardSync } from '../lib/cards-sync';
import { setAccessTokenProvider } from '../lib/api';

/**
 * Bridges Auth0 state to:
 *   1. apiFetch's token provider — every request carries the user's JWT so
 *      the server can verify identity instead of trusting body fields.
 *   2. the card sync layer (pull/merge/push on sign-in).
 *
 * Renders nothing.
 */
export function SyncBoot() {
  let isAuthenticated = false;
  let sub: string | undefined;
  let getAccessTokenSilently: (() => Promise<string>) | null = null;
  try {
    const auth0 = useAuth0();
    isAuthenticated = auth0.isAuthenticated;
    sub = auth0.user?.sub;
    getAccessTokenSilently = auth0.getAccessTokenSilently;
  } catch {
    // Auth0 not configured — both card sync and token provider stay disabled
  }

  useEffect(() => {
    if (isAuthenticated && getAccessTokenSilently) {
      setAccessTokenProvider(async () => {
        try {
          return await getAccessTokenSilently!();
        } catch {
          return null;
        }
      });
    } else {
      setAccessTokenProvider(null);
    }
    return () => setAccessTokenProvider(null);
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (isAuthenticated && sub) {
      initCardSync(sub);
    } else {
      resetCardSync();
    }
  }, [isAuthenticated, sub]);

  return null;
}
