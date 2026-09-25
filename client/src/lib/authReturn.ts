// Where to go after the Google sign-in round trip.
//
// Supabase sends every sign-in back to the site's origin, because that is the
// one redirect URL the project allow-lists. A page that asks the visitor to
// sign in first (/premium, the checkout success page) records its own path
// here; the app shell reads it once the account arrives and goes back there.
//
// The record lives in sessionStorage (this tab only), accepts same-origin
// paths only, and goes stale after fifteen minutes, so an abandoned sign-in
// never hijacks a later one.

const KEY = 'devshark:auth-return';
const MAX_AGE_MS = 15 * 60_000;

/** A path on this origin: one leading slash, no scheme, no backslash, no
 * whitespace, and short enough to be a real route. */
export function isSafeReturnPath(path: unknown): path is string {
  return typeof path === 'string'
    && path.length <= 512
    && /^\/(?![/\\])[^\s\\]*$/.test(path);
}

export function rememberAuthReturn(path: string, now = Date.now()): void {
  if (!isSafeReturnPath(path)) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, at: now }));
  } catch {
    // Storage may be off; the visitor then lands on the home page as before.
  }
}

export function clearAuthReturn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** The recorded path, removed as it is read; null when none is fresh. */
export function takeAuthReturn(now = Date.now()): string | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof value.at !== 'number' || now - value.at > MAX_AGE_MS || now < value.at) return null;
    return isSafeReturnPath(value.path) ? value.path : null;
  } catch {
    return null;
  }
}
