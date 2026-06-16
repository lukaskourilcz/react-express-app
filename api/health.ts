import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAnon as supabase, withTimeout } from '../lib/http';

/**
 * GET /api/health
 *
 * Lightweight liveness probe. Returns:
 *   { ok: true, supabase: 'ok' | 'down' | 'unconfigured', ts: ISO }
 *
 * Uptime monitors should treat status 200 as healthy regardless of the
 * supabase field, and check the body for cross-dep health.
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

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    supabase: supabaseStatus,
    ts: new Date().toISOString(),
  });
}
