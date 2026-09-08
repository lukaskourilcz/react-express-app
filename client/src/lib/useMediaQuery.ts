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
 * True on the phone and tablet screens where a code editor between quizzes is
 * the wrong tool (issue #154). Presentation only: the server never reads this,
 * and it never decides what a learner is allowed to do.
 *
 * Width alone would be wrong. Zooming a desktop page to 200% halves its CSS
 * width, and a learner who has just made the text bigger has not swapped their
 * keyboard for a thumb — withholding the editor from them would take a feature
 * away for using zoom. So the narrow viewport has to come with no precise
 * pointer anywhere on the device.
 */
export function useIsCompactPractice(): boolean {
  const narrow = useMediaQuery('(max-width: 899.95px)');
  const noPrecisePointer = !useMediaQuery('(any-pointer: fine)');
  return narrow && noPrecisePointer;
}
