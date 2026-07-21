import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';
import { createAnonClient, createServiceClient, jsonError, withTimeout, logEvent, withRequestContext } from '../lib/http';

const supabase = createAnonClient();
const service = createServiceClient();

/**
 * GET /api/health
 *
 * Liveness + readiness probe. Returns:
 *   { ok, supabase: 'ok' | 'down' | 'unconfigured', ts: ISO }
 *
 * Status code reflects readiness so a plain uptime monitor (UptimeRobot,
 * Better Stack) alerts without body parsing:
 *   • 200 — healthy: Supabase reachable, or intentionally unconfigured
 *           (e.g. a preview deploy without DB env). `ok: true`.
 *   • 503 — degraded: Supabase is configured but unreachable. `ok: false`,
 *           `Retry-After: 30`. This is the case a monitor must catch.
 *
 * Previously this always returned 200, so downtime looked healthy — the whole
 * point of pointing a monitor here was defeated.
 */
async function routeHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  let supabaseStatus: 'ok' | 'down' | 'unconfigured' = 'unconfigured';
  let privilegedStatus: 'ok' | 'down' | 'unconfigured' = 'unconfigured';

  if (supabase) {
    try {
      const { error } = await withTimeout(supabase.from('user_stats').select('id').limit(1), 1500);
      supabaseStatus = error ? 'down' : 'ok';
    } catch (error) {
      supabaseStatus = 'down';
      logEvent('health', {
        level: 'error',
        category: 'dependency_check',
        dependency: 'database',
        reason: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  if (service) {
    try {
      const { error } = await withTimeout(service.from('quiz_submissions').select('grade_key').limit(1), 1500);
      privilegedStatus = error ? 'down' : 'ok';
    } catch {
      privilegedStatus = 'down';
    }
  }

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const degraded = supabaseStatus === 'down' || privilegedStatus === 'down' ||
    (isProduction && (supabaseStatus === 'unconfigured' || privilegedStatus === 'unconfigured'));
  res.setHeader('Cache-Control', 'no-store');
  if (degraded) res.setHeader('Retry-After', '30');
  res.status(degraded ? 503 : 200).json({
    ok: !degraded,
    status: degraded ? 'degraded' : 'healthy',
    dependencies: {
      database: supabaseStatus === 'ok' ? 'ok' : 'unavailable',
      serviceRole: privilegedStatus === 'ok' ? 'ok' : 'unavailable',
      rateLimiter: process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'configured' : 'in-memory-fallback',
    },
    ts: new Date().toISOString(),
  });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
