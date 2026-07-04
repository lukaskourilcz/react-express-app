// Sentry wiring — error + performance monitoring for the deployed app.
//
// The SDK is loaded via a dynamic `import()` inside initSentry(), guarded by
// the DSN check, so Sentry never lands in the shell chunk: without a DSN the
// import is never evaluated, and with one the SDK arrives as its own lazy
// chunk after first paint. initSentry() stays a sync fire-and-forget call for
// main.tsx; reportError() no-ops until the SDK has loaded.
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
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.1,
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
