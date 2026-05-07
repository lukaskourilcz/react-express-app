import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const STATS_FIELDS =
  'id,auth0_id,email,name,picture,total_quizzes,total_correct,total_questions,current_streak,longest_streak,last_quiz_date,created_at,updated_at';

const MAX_STR = 512;

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

function logEvent(op: string, event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), route: `user/${op}`, ...event }));
}

function isShortString(v: unknown, max = MAX_STR): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('supabase_timeout')), ms);
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const op = String(req.query.op || '').toLowerCase();
  if (op === 'stats') return stats(req, res);
  if (op === 'category-stats') return categoryStats(req, res);
  if (op === 'cards') return cards(req, res);
  return jsonError(res, 404, 'unknown_op', `Unknown user op: ${op}`);
}

async function stats(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  try {
    if (req.method === 'GET') {
      const { auth0_id } = req.query;
      if (!isShortString(auth0_id, 256)) {
        return jsonError(res, 400, 'bad_request', 'auth0_id is required');
      }
      const { data, error } = await withTimeout(
        supabase!.from('user_stats').select(STATS_FIELDS).eq('auth0_id', auth0_id).maybeSingle(),
      );
      if (error) {
        logEvent('stats', { status: 500, reason: 'select_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load stats');
      }
      logEvent('stats', { status: 200, op: 'get', latency_ms: Date.now() - started });
      return res.json({ data });
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as {
        auth0_id?: unknown;
        email?: unknown;
        name?: unknown;
        picture?: unknown;
        quiz_result?: unknown;
      };

      if (!isShortString(body.auth0_id, 256))
        return jsonError(res, 400, 'bad_request', 'auth0_id is required');
      const auth0_id = body.auth0_id;

      if (body.quiz_result !== undefined) {
        const qr = body.quiz_result as { correct?: unknown; total?: unknown };
        if (
          typeof qr !== 'object' ||
          qr === null ||
          typeof qr.correct !== 'number' ||
          typeof qr.total !== 'number' ||
          !Number.isInteger(qr.correct) ||
          !Number.isInteger(qr.total) ||
          qr.correct < 0 ||
          qr.total <= 0 ||
          qr.correct > qr.total ||
          qr.total > 50
        ) {
          return jsonError(res, 400, 'bad_request', 'Invalid quiz_result');
        }

        const { data, error } = await withTimeout(
          supabase!.rpc('record_quiz_result', {
            p_auth0_id: auth0_id,
            p_correct: qr.correct,
            p_total: qr.total,
          }),
        );

        if (error) {
          if (/function .* does not exist/i.test(error.message)) {
            logEvent('stats', { status: 200, op: 'submit_fallback', warn: 'rpc_missing' });
            return res.json({ data: null, warning: 'rpc_missing' });
          }
          logEvent('stats', { status: 500, reason: 'rpc_failed', error: error.message });
          return jsonError(res, 500, 'db_error', 'Could not record quiz result');
        }

        logEvent('stats', { status: 200, op: 'submit', latency_ms: Date.now() - started });
        return res.json({ data });
      }

      const profile = {
        auth0_id,
        email: typeof body.email === 'string' && body.email.length <= MAX_STR ? body.email : null,
        name: typeof body.name === 'string' && body.name.length <= MAX_STR ? body.name : null,
        picture:
          typeof body.picture === 'string' && body.picture.length <= 2048 ? body.picture : null,
      };

      const { data, error } = await withTimeout(
        supabase!
          .from('user_stats')
          .upsert(profile, { onConflict: 'auth0_id' })
          .select(STATS_FIELDS)
          .single(),
      );

      if (error) {
        logEvent('stats', { status: 500, reason: 'upsert_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not save profile');
      }
      logEvent('stats', { status: 200, op: 'upsert', latency_ms: Date.now() - started });
      return res.json({ data });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('stats', { status: 500, reason: 'exception', error: message });
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

async function categoryStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const body = (req.body || {}) as { auth0_id?: unknown; by_category?: unknown };
  if (typeof body.auth0_id !== 'string' || body.auth0_id.length === 0 || body.auth0_id.length > 256) {
    return jsonError(res, 400, 'bad_request', 'auth0_id required');
  }
  if (!body.by_category || typeof body.by_category !== 'object' || Array.isArray(body.by_category)) {
    return jsonError(res, 400, 'bad_request', 'by_category must be an object');
  }

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

  const { error } = await supabase!.rpc('record_category_stats', {
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

async function cards(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  if (req.method === 'GET') {
    const { auth0_id } = req.query;
    if (!isShortString(auth0_id, 256)) {
      return jsonError(res, 400, 'bad_request', 'auth0_id is required');
    }
    const { data, error } = await withTimeout(
      supabase!
        .from('user_cards')
        .select(
          'question_id, question, options, correct_index, explanation, category, added_at, right_streak, wrong_count, due_at, last_reviewed_at, updated_at',
        )
        .eq('auth0_id', auth0_id)
        .order('updated_at', { ascending: false }),
    );
    if (error) {
      // user_cards table missing — degrade gracefully so clients still work
      // before migration 007 is applied.
      if (/relation .* does not exist/i.test(error.message)) {
        return res.json({ data: [], warning: 'table_missing' });
      }
      logEvent('cards', { status: 500, reason: 'select_failed', error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not load cards');
    }
    logEvent('cards', { status: 200, op: 'get', count: data?.length ?? 0, latency_ms: Date.now() - started });
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as { auth0_id?: unknown; cards?: unknown };
    if (!isShortString(body.auth0_id, 256)) {
      return jsonError(res, 400, 'bad_request', 'auth0_id required');
    }
    if (!Array.isArray(body.cards)) {
      return jsonError(res, 400, 'bad_request', 'cards must be an array');
    }
    if (body.cards.length > 1000) {
      return jsonError(res, 413, 'too_many_cards', 'At most 1000 cards per sync');
    }

    const { error } = await withTimeout(
      supabase!.rpc('replace_user_cards', {
        p_auth0_id: body.auth0_id,
        p_cards: body.cards,
      }),
    );

    if (error) {
      if (/function .* does not exist/i.test(error.message)) {
        return res.json({ ok: true, warning: 'rpc_missing' });
      }
      logEvent('cards', { status: 500, reason: 'rpc_failed', error: error.message });
      return jsonError(res, 500, 'db_error', 'Could not save cards');
    }

    logEvent('cards', { status: 200, op: 'replace', count: body.cards.length, latency_ms: Date.now() - started });
    return res.json({ ok: true, count: body.cards.length });
  }

  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}
