// Sentry wiring — error + performance monitoring for the deployed app.
//
// The SDK is loaded via a dynamic `import()` inside initSentry(), guarded by
// the DSN check, so Sentry never lands in the shell chunk: without a DSN the
// import is never evaluated, and with one the SDK arrives as its own lazy
// chunk. initSentry() stays a sync fire-and-forget call for main.tsx.
//
// The 48 KB chunk used to load at boot, beside the route chunk, on every page
// view (perf baseline #587 C09). It now loads once the page has loaded and the
// browser is idle, or at once when an error comes first. An error before that
// is not lost: reportError() and the window's `error` and
// `unhandledrejection` events queue it in memory (nothing is stored, so
// monitoring stays consent-free), and the SDK reports the queue as it starts,
// through the same scrubbing as every event (lib/sentry-sdk.ts).
//
// The SDK posts straight to the DSN's ingest host. The CSP `connect-src` in
// vercel.json allows only the EU one (`https://*.ingest.de.sentry.io`), and
// `npm run check:security` asserts it; a DSN in another region needs its host
// added there, or every event is refused by the browser.
//
// Source maps are already emitted as 'hidden' in vite.config.ts; upload them
// with @sentry/vite-plugin + SENTRY_AUTH_TOKEN in CI for readable stack traces
// (optional, not required at runtime). To shrink the prod bundle further, drop
// browserTracingIntegration in lib/sentry-sdk.ts for errors-only reporting.

type SentryModule = typeof import('./sentry-sdk');
type Hint = Parameters<SentryModule['captureException']>[1];

/** The longest the SDK waits for an idle moment once the page has loaded. */
export const SENTRY_IDLE_TIMEOUT_MS = 4_000;
/** Errors kept before the SDK starts; a page that throws in a loop sends the first ones. */
export const EARLY_ERROR_LIMIT = 20;

let sentry: SentryModule | null = null;
let dsnInUse: string | null = null;
let loading = false;
const early: { error: unknown; hint?: Hint }[] = [];

function queue(error: unknown, hint?: Hint): void {
  if (early.length < EARLY_ERROR_LIMIT) early.push({ error, hint });
  load();
}

// The SDK installs its own global handlers when it starts; until then these
// keep what the window reports.
function onError(event: ErrorEvent): void {
  queue(event.error ?? event.message, { mechanism: { type: 'onerror', handled: false } });
}
function onRejection(event: PromiseRejectionEvent): void {
  queue(event.reason, { mechanism: { type: 'onunhandledrejection', handled: false } });
}

function load(): void {
  if (loading || !dsnInUse) return;
  loading = true;
  const dsn = dsnInUse;
  void import('./sentry-sdk')
    .then((Sentry) => {
      // The options, consent-free monitoring's privacy rules among them, are
      // in lib/sentry-sdk.ts with the SDK.
      Sentry.start(dsn, import.meta.env.MODE);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      sentry = Sentry;
      for (const { error, hint } of early.splice(0)) Sentry.captureException(error, hint);
    })
    .catch(() => {});
}

/** After the load event, at the browser's next idle moment (or a beat later
 * where there is no requestIdleCallback, as in Safari). */
function whenIdle(run: () => void): void {
  const later = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: SENTRY_IDLE_TIMEOUT_MS });
    else window.setTimeout(run, 200);
  };
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || dsnInUse) return;
  dsnInUse = dsn;
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  whenIdle(load);
}

/** Report a caught error. Before the SDK has loaded it is queued, and the
 * SDK starts loading at once; without a DSN it does nothing. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const hint = context ? { extra: context } : undefined;
  if (sentry) sentry.captureException(error, hint);
  else if (dsnInUse) queue(error, hint);
}
