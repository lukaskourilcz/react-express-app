import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAnonClient, withTimeout } from '../lib/http';

const supabase = createAnonClient();

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
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  let supabaseStatus: 'ok' | 'down' | 'unconfigured' = 'unconfigured';

  if (supabase) {
    try {
      await withTimeout(supabase.from('user_stats').select('id').limit(1), 2000);
      supabaseStatus = 'ok';
    } catch {
      supabaseStatus = 'down';
    }
  }

  const degraded = supabaseStatus === 'down';
  res.setHeader('Cache-Control', 'no-store');
  if (degraded) res.setHeader('Retry-After', '30');
  res.status(degraded ? 503 : 200).json({
    ok: !degraded,
    supabase: supabaseStatus,
    ts: new Date().toISOString(),
  });
}
