import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const VALID_CATEGORIES = new Set([
  'html',
  'css',
  'javascript',
  'typescript',
  'react',
  'nodejs',
  'git',
  'dev-world',
  'custom',
  'code-snippets',
]);

function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend not configured');

  const body = (req.body || {}) as { auth0_id?: unknown; by_category?: unknown };
  if (typeof body.auth0_id !== 'string' || body.auth0_id.length === 0 || body.auth0_id.length > 256) {
    return jsonError(res, 400, 'bad_request', 'auth0_id required');
  }
  if (!body.by_category || typeof body.by_category !== 'object' || Array.isArray(body.by_category)) {
    return jsonError(res, 400, 'bad_request', 'by_category must be an object');
  }

  // Filter / validate the breakdown defensively.
  const cleaned: Record<string, { correct: number; total: number }> = {};
  for (const [cat, raw] of Object.entries(body.by_category as Record<string, unknown>)) {
    if (!VALID_CATEGORIES.has(cat)) continue;
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as { correct?: unknown; total?: unknown };
    if (
      typeof r.correct !== 'number' ||
      typeof r.total !== 'number' ||
      !Number.isInteger(r.correct) ||
      !Number.isInteger(r.total) ||
      r.correct < 0 ||
      r.total <= 0 ||
      r.correct > r.total ||
      r.total > 100
    ) {
      continue;
    }
    cleaned[cat] = { correct: r.correct, total: r.total };
  }

  if (Object.keys(cleaned).length === 0) {
    return res.json({ ok: true, applied: 0 });
  }

  const { error } = await supabase.rpc('record_category_stats', {
    p_auth0_id: body.auth0_id,
    p_breakdown: cleaned,
  });

  if (error) {
    if (/function .* does not exist/i.test(error.message)) {
      return res.json({ ok: true, applied: 0, warning: 'rpc_missing' });
    }
    return jsonError(res, 500, 'db_error', 'Could not record category stats');
  }

  return res.json({ ok: true, applied: Object.keys(cleaned).length });
}
