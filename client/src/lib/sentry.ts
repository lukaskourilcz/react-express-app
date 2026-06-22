// Sentry wiring — error + performance monitoring for the deployed app.
//
// A static `import * as Sentry` is used deliberately: it lets Rollup tree-shake
// the SDK down to just what we call (~47 KB gzip with tracing). And because
// VITE_SENTRY_DSN is inlined at build time, an unconfigured build makes the
// whole init body dead code, so Sentry is tree-shaken OUT entirely (zero cost
// for local/preview builds without a DSN).
//
// Source maps are already emitted as 'hidden' in vite.config.ts; upload them
// with @sentry/vite-plugin + SENTRY_AUTH_TOKEN in CI for readable stack traces
// (optional, not required at runtime). To shrink the prod bundle further, drop
// browserTracingIntegration below for errors-only reporting.

import * as Sentry from '@sentry/react';

let initialised = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || initialised) return;
  initialised = true;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Performance tracing (Web Vitals + transactions) at a low sample rate,
    // without the cost of full sampling or Session Replay.
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

/** Report a caught error (no-op until initSentry has run with a DSN). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialised) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
