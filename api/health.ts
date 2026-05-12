import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
