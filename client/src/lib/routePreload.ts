// Page code that starts loading before the click lands.
//
// Every page is a lazy chunk. A navigation keeps the current page on screen
// until the next page's code is ready (the route Suspense boundary in App.tsx
// sits outside the keyed route box, and the router renders in a transition),
// so a cold chunk costs a wait but never a blank beat. This module shortens the
// wait: App builds each lazy route from a loader registered here, and a pointer
// resting on a link, a keyboard focus or the first touch starts the same import
// the route will run. The browser fetches and evaluates a module once, so a
// preload never downloads anything twice.

type Loader = () => Promise<unknown>;

const loaders: { matches: (pathname: string) => boolean; load: Loader }[] = [];

/** How long a mouse rests on a link before its page starts loading. Short
 * enough to finish before most clicks, long enough that sweeping across the
 * nav does not fetch every section. Touch, focus and press start at once. */
const HOVER_INTENT_MS = 65;

/** Register the module behind the paths `matches` accepts. The returned
 * loader is what `lazy()` calls: one import, shared with every preload, and a
 * failed fetch is forgotten so the next attempt asks the network again. */
export function routeChunk<T>(matches: (pathname: string) => boolean, load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  const once = () => {
    if (!pending) {
      pending = load();
      pending.catch(() => {
        pending = null;
      });
    }
    return pending;
  };
  loaders.push({ matches, load: once });
  return once;
}

/** Start loading everything registered for a same-origin path (a page, and a
 * page's own parts once its section has registered them). Unknown paths do
 * nothing, and a failure stays quiet: the navigation itself reports it. The
 * promise settles when every matching load has. */
export function preloadPath(pathname: string): Promise<void> {
  const loads = loaders.filter((entry) => entry.matches(pathname)).map((entry) => entry.load().catch(() => undefined));
  return Promise.all(loads).then(() => undefined);
}

/** The in-app path a link (or a chrome button carrying `data-route`) leads to. */
function pathOf(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>('a[href], [data-route]');
  if (!element) return null;
  if (element instanceof HTMLAnchorElement) {
    if ((element.target && element.target !== '_self') || element.hasAttribute('download')) return null;
    const url = new URL(element.href, window.location.href);
    return url.origin === window.location.origin ? url.pathname : null;
  }
  return element.dataset.route ?? null;
}

/** Preload on intent anywhere in the document. Returns the uninstaller. */
export function installIntentPreloading(): () => void {
  let hover = 0;
  const now = (event: Event) => {
    const path = pathOf(event.target);
    if (path && path !== window.location.pathname) void preloadPath(path);
  };
  const rest = (event: PointerEvent) => {
    window.clearTimeout(hover);
    if (event.pointerType !== 'mouse') return;
    const path = pathOf(event.target);
    if (path && path !== window.location.pathname) hover = window.setTimeout(() => void preloadPath(path), HOVER_INTENT_MS);
  };
  const options = { capture: true, passive: true } as const;
  document.addEventListener('pointerover', rest, options);
  document.addEventListener('pointerdown', now, options);
  document.addEventListener('touchstart', now, options);
  document.addEventListener('focusin', now, options);
  return () => {
    window.clearTimeout(hover);
    document.removeEventListener('pointerover', rest, options);
    document.removeEventListener('pointerdown', now, options);
    document.removeEventListener('touchstart', now, options);
    document.removeEventListener('focusin', now, options);
  };
}
