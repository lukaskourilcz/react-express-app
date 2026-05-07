import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { initCardSync, resetCardSync } from '../lib/cards-sync';

/**
 * Bridges Auth0 state to the card sync layer. Renders nothing.
 *
 * - On sign-in (or page load while signed in): pulls server cards, merges
 *   with local, pushes the merged result.
 * - On sign-out: stops debounced pushes.
 */
export function SyncBoot() {
  let isAuthenticated = false;
  let sub: string | undefined;
  try {
    const auth0 = useAuth0();
    isAuthenticated = auth0.isAuthenticated;
    sub = auth0.user?.sub;
  } catch {
    // Auth0 not configured — sync just doesn't run, local store is enough
  }

  useEffect(() => {
    if (isAuthenticated && sub) {
      initCardSync(sub);
    } else {
      resetCardSync();
    }
  }, [isAuthenticated, sub]);

  return null;
}
