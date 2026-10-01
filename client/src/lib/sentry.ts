// Sentry wiring — error + performance monitoring for the deployed app.
//
// The SDK is loaded via a dynamic `import()` inside initSentry(), guarded by
// the DSN check, so Sentry never lands in the shell chunk: without a DSN the
// import is never evaluated, and with one the SDK arrives as its own lazy
// chunk after first paint. initSentry() stays a sync fire-and-forget call for
// main.tsx; reportError() no-ops until the SDK has loaded.
//
// The SDK posts straight to the DSN's ingest host. The CSP `connect-src` in
// vercel.json allows only the EU one (`https://*.ingest.de.sentry.io`), and
// `npm run check:security` asserts it; a DSN in another region needs its host
// added there, or every event is refused by the browser.
//
// Source maps are already emitted as 'hidden' in vite.config.ts; upload them
// with @sentry/vite-plugin + SENTRY_AUTH_TOKEN in CI for readable stack traces
// (optional, not required at runtime). To shrink the prod bundle further, drop
// browserTracingIntegration below for errors-only reporting.

type SentryModule = typeof import('@sentry/react');

let sentry: SentryModule | null = null;
let initialised = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || initialised) return;
  initialised = true;
  void import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        // Performance tracing (Web Vitals + transactions) at a low sample rate,
        // without the cost of full sampling or Session Replay.
        // `linkPreviousTrace: 'in-memory'` is the SDK's default, pinned: the
        // other setting keeps the last trace in sessionStorage.
        integrations: [Sentry.browserTracingIntegration({ linkPreviousTrace: 'in-memory' })],
        tracesSampleRate: 0.1,
        // No IP address, cookies or user context. Error monitoring runs for
        // every visitor without asking (lib/consent.ts, "necessary") only
        // because it stores nothing in the browser and carries no identifier
        // of the person: no cookie, no storage key, no Session Replay, no
        // setUser. Keep it that way, or put it under analytics consent.
        sendDefaultPii: false,
      });
      sentry = Sentry;
    })
    .catch(() => {});
}

/** Report a caught error (no-op until initSentry has loaded the SDK). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}
