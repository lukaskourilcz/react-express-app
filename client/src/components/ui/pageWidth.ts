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
/** The one route-to-width map, as the CSS max-width of a route's page: its
 * width token, or none for /dev (the standalone admin console). /coding/* is
 * wide; home, /profile and /play(/*) are standard; everything else is
 * narrow. One expression, as it ships in the initial load. */
export function pageMaxWidth(pathname: string): string {
  return pathname.startsWith('/dev')
    ? 'none'
    : `var(--ss-width-${/^\/coding(\/|$)/.test(pathname) ? 'wide' : /^\/(profile|play(\/.*)?)?$/.test(pathname) ? 'standard' : 'narrow'})`;
}
