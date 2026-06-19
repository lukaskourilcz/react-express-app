import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient, jsonError, withTimeout, requireAuthSub } from '../../lib/http';
import { ROADMAP_TOPICS, ROADMAP_LEVELS, CHECKPOINT_COUNT } from '../../lib/roadmap';

const supabase = createServiceClient();
const TABLE = 'roadmap_progress';

interface Entry {
  passed: boolean;
  bestPct: number;
}
type TopicProgress = { levels: Record<string, Entry>; checkpoints: Record<string, Entry> };
type ProgressBlob = Record<string, TopicProgress>;

const clampPct = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0;
  return v < 0 ? 0 : v > 100 ? 100 : v;
};

// Rebuild a clean blob from untrusted input: only known topics, valid level /
// checkpoint numbers, and bounded values are kept. This bounds the stored size
// and shape regardless of what the client sends. Exported for tests.
export function sanitize(input: unknown): ProgressBlob {
  const out: ProgressBlob = {};
  if (!input || typeof input !== 'object') return out;
  const root = input as Record<string, unknown>;

  for (const topic of ROADMAP_TOPICS) {
    const t = root[topic];
    if (!t || typeof t !== 'object') continue;
    const levelsIn = (t as Record<string, unknown>).levels;
    const checkpointsIn = (t as Record<string, unknown>).checkpoints;
    const levels: Record<string, Entry> = {};
    const checkpoints: Record<string, Entry> = {};

    if (levelsIn && typeof levelsIn === 'object') {
      for (const [k, v] of Object.entries(levelsIn as Record<string, unknown>)) {
        const n = parseInt(k, 10);
        if (!Number.isInteger(n) || n < 1 || n > ROADMAP_LEVELS) continue;
        if (!v || typeof v !== 'object') continue;
        const e = v as Record<string, unknown>;
        levels[String(n)] = { passed: e.passed === true, bestPct: clampPct(e.bestPct) };
      }
    }
    if (checkpointsIn && typeof checkpointsIn === 'object') {
      for (const [k, v] of Object.entries(checkpointsIn as Record<string, unknown>)) {
        const n = parseInt(k, 10);
        if (!Number.isInteger(n) || n < 1 || n > CHECKPOINT_COUNT) continue;
        if (!v || typeof v !== 'object') continue;
        const e = v as Record<string, unknown>;
        checkpoints[String(n)] = { passed: e.passed === true, bestPct: clampPct(e.bestPct) };
      }
    }
    if (Object.keys(levels).length > 0 || Object.keys(checkpoints).length > 0) {
      out[topic] = { levels, checkpoints };
    }
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  try {
    if (req.method === 'GET') {
      const { data, error } = await withTimeout(
        supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle(),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not load progress');
      return res.json({ data: (data?.data as ProgressBlob) ?? {} });
    }

    if (req.method === 'PUT') {
      const body = (req.body || {}) as Record<string, unknown>;
      const clean = sanitize(body.data);
      const { error } = await withTimeout(
        supabase
          .from(TABLE)
          .upsert({ user_id: userId, data: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not save progress');
      return res.json({ ok: true, data: clean });
    }

    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}
