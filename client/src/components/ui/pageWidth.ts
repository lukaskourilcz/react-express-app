/**
 * Page widths (UX audit U1, #573). The route shell in App.tsx picks ONE per
 * route and caps the route box (.ss-route) with it; a page never sets its own page
 * max-width. Each width is a token in astryx-theme.css (--ss-width-<name>):
 *
 * - narrow (800px): the route default.
 * - standard (1000px): two-column pages: home, /profile, /play.
 * - wide (1200px): operational screens: /coding/*, and a Learn or FDE coding
 *   phase while its editor is mounted: that part puts the class ss-wide-page
 *   on its root, and `.ss-route:has(.ss-wide-page)` in app-shell.css
 *   widens the route box for as long as it is there (no state, no effect, no
 *   extra render).
 *
 * The fourth token, --ss-width-task (640px), is the column INSIDE a page
 * (questions, auth, billing and checkout cards), never a route width.
 */
type RouteWidth = 'narrow' | 'standard' | 'wide';

/** The one route-to-width map. /dev is the standalone admin console and has
 * no cap ('none'). Everything not listed is narrow. */
function routePageWidth(pathname: string): RouteWidth | 'none' {
  if (pathname.startsWith('/dev')) return 'none';
  if (/^\/coding(\/|$)/.test(pathname)) return 'wide';
  if (/^\/(profile|play(\/.*)?)?$/.test(pathname)) return 'standard';
  return 'narrow';
}

/** The CSS max-width of a route's page: its width token, or none. */
export function pageMaxWidth(pathname: string): string {
  const width = routePageWidth(pathname);
  return width === 'none' ? width : `var(--ss-width-${width})`;
}
