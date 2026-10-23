import { createContext, useContext, useEffect, useId } from 'react';

/**
 * Page widths (UX audit U1, #573). The route shell in App.tsx picks ONE of
 * these per route and caps the route box with it; a page never sets its own
 * page max-width. The values are the tokens in astryx-theme.css, so a change
 * lands in one place.
 *
 * - task (640px): the column INSIDE a page (questions, auth, billing and
 *   checkout cards). Never a route width: a page uses it for its task card.
 * - narrow (800px): the route default.
 * - standard (1000px): two-column pages: home, /profile, /play.
 * - wide (1200px): operational screens: /coding/*, and a Learn or FDE coding
 *   phase while its editor is mounted (usePageWidthRequest).
 */
export const PAGE_WIDTH = {
  task: 'var(--ss-width-task)',
  narrow: 'var(--ss-width-narrow)',
  standard: 'var(--ss-width-standard)',
  wide: 'var(--ss-width-wide)',
} as const;

export type RouteWidth = 'narrow' | 'standard' | 'wide';

/** The one route-to-width map. /dev is the standalone admin console and has
 * no cap ('none'). Everything not listed is narrow (800px). */
export function routePageWidth(pathname: string): RouteWidth | 'none' {
  if (pathname === '/dev' || pathname.startsWith('/dev/')) return 'none';
  if (pathname === '/coding' || pathname.startsWith('/coding/')) return 'wide';
  if (pathname === '/' || pathname === '/profile' || pathname === '/play' || pathname.startsWith('/play/')) return 'standard';
  return 'narrow';
}

const ORDER: Record<RouteWidth, number> = { narrow: 0, standard: 1, wide: 2 };

/** The width the shell draws: the route's own, widened by any request a
 * mounted part has made (the widest wins). /dev stays uncapped. */
export function effectivePageWidth(route: RouteWidth | 'none', requests: Iterable<RouteWidth>): RouteWidth | 'none' {
  if (route === 'none') return 'none';
  let width = route;
  for (const request of requests) if (ORDER[request] > ORDER[width]) width = request;
  return width;
}

/** The CSS max-width for a route width. */
export function pageMaxWidth(width: RouteWidth | 'none'): string {
  return width === 'none' ? 'none' : PAGE_WIDTH[width];
}

type Request = (id: string, width: RouteWidth | null) => void;

/** Provided by the route shell (App.tsx). Outside it a request does nothing. */
export const PageWidthContext = createContext<Request>(() => {});

/**
 * Ask the route shell for a wider page while the caller is mounted, e.g. a
 * Learn or FDE coding phase asks for 'wide' so its editor opens at the same
 * 1200px as /coding (coding-03). Pass null to make no request. The request
 * ends when the caller unmounts or passes null.
 */
export function usePageWidthRequest(width: RouteWidth | null): void {
  const request = useContext(PageWidthContext);
  const id = useId();
  useEffect(() => {
    request(id, width);
    return () => request(id, null);
  }, [request, id, width]);
}
