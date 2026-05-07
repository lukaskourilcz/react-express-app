import * as Sentry from '@sentry/node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

let initialised = false;

function init() {
  if (initialised || !SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.05,
    // Cap event payloads — Vercel logs already capture the request, we just
    // need the exception fingerprint.
    maxBreadcrumbs: 20,
    beforeSend(event) {
      // Strip raw bodies that may contain user input.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
  initialised = true;
}

init();

/** Wrap a Vercel handler so uncaught errors flow into Sentry (when configured). */
export function withSentry(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (SENTRY_DSN) {
        Sentry.captureException(err, {
          tags: { route: req.url ?? 'unknown', method: req.method ?? 'GET' },
        });
        await Sentry.flush(2000).catch(() => undefined);
      }
      console.error('handler_uncaught', {
        route: req.url,
        method: req.method,
        message: err instanceof Error ? err.message : String(err),
      });
      if (!res.headersSent) {
        res.status(500).json({ error: { code: 'internal_error', message: 'Internal error' } });
      }
    }
  };
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return;
  Sentry.captureException(err, { extra: context });
}
