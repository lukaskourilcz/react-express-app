import { useEffect, useState } from 'react';

/**
 * Tiny matchMedia hook — drop-in replacement for MUI's useMediaQuery so we can
 * drop the MUI dependency. Pass a media query string, e.g. '(max-width: 599px)'.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True below the `sm` breakpoint (600px) — matches the old MUI theme.down('sm'). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 599.95px)');
}

/**
 * True where the coding workbench will not mount an editor: phones and
 * tablets, up to the width at which the two-column workspace appears.
 *
 * This is a presentation decision and only ever that. The server neither reads
 * a viewport nor believes one: it grades a code submission and an ordering
 * submission the same from any device, and a puzzle can never stand in for an
 * implementation a task actually requires.
 */
export function useIsNarrowForEditor(): boolean {
  return useMediaQuery('(max-width: 1023.95px)');
}
