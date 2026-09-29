import { useEffect } from 'react';

/**
 * A page the browser restores from its back/forward cache comes back exactly
 * as it was left, React state included. A button that went busy as the page
 * left for Google or Stripe would come back busy after Back and never recover,
 * since the round trip it waited for is over. This clears such a flag when the
 * page is shown again from the cache.
 */
export function useClearOnPageRestore(setBusy: (busy: boolean) => void): void {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [setBusy]);
}
