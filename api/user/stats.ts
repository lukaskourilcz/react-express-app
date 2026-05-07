import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Module-scoped client so warm invocations reuse it.
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const STATS_FIELDS =
  'id,auth0_id,email,name,picture,total_quizzes,total_correct,total_questions,current_streak,longest_streak,last_quiz_date,created_at,updated_at';

const MAX_STR = 512;

function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

function logEvent(event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), route: 'user/stats', ...event }));
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
  const started = Date.now();
  if (!supabase) {
    return jsonError(res, 503, 'not_configured', 'Stats backend is not configured');
  }

  // NOTE: This endpoint currently trusts auth0_id from the request because
  // Auth0 audience verification has not been wired up yet. To finish hardening:
  //  1. Set VITE_AUTH0_AUDIENCE in client + Auth0 dashboard
  //  2. Verify Bearer token with `jose` against Auth0 JWKS
  //  3. Use verified `payload.sub` instead of body/query auth0_id
  // See supabase-schema-002.sql for matching RLS policies.

  try {
    if (req.method === 'GET') {
      const { auth0_id } = req.query;
      if (!isShortString(auth0_id, 256)) {
        return jsonError(res, 400, 'bad_request', 'auth0_id is required');
      }

      const { data, error } = await withTimeout(
        supabase.from('user_stats').select(STATS_FIELDS).eq('auth0_id', auth0_id).maybeSingle(),
      );

      if (error) {
        logEvent({ status: 500, reason: 'select_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load stats');
      }

      logEvent({ status: 200, op: 'get', latency_ms: Date.now() - started });
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

      if (!isShortString(body.auth0_id, 256)) {
        return jsonError(res, 400, 'bad_request', 'auth0_id is required');
      }
      const auth0_id = body.auth0_id;

      // Quiz result branch: increment counters atomically via RPC.
      if (body.quiz_result !== undefined) {
        const qr = body.quiz_result as { correct?: unknown; total?: unknown; sessionId?: unknown };
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
          supabase.rpc('record_quiz_result', {
            p_auth0_id: auth0_id,
            p_correct: qr.correct,
            p_total: qr.total,
          }),
        );

        if (error) {
          // Fall back gracefully if the RPC is not yet deployed: race-prone but
          // keeps the app functional during migration. Remove this branch once
          // supabase-schema-002.sql is applied everywhere.
          if (/function .* does not exist/i.test(error.message)) {
            logEvent({ status: 200, op: 'submit_fallback', warn: 'rpc_missing' });
            return res.json({ data: null, warning: 'rpc_missing' });
          }
          logEvent({ status: 500, reason: 'rpc_failed', error: error.message });
          return jsonError(res, 500, 'db_error', 'Could not record quiz result');
        }

        logEvent({ status: 200, op: 'submit', latency_ms: Date.now() - started });
        return res.json({ data });
      }

      // Profile upsert branch.
      const profile = {
        auth0_id,
        email: typeof body.email === 'string' && body.email.length <= MAX_STR ? body.email : null,
        name: typeof body.name === 'string' && body.name.length <= MAX_STR ? body.name : null,
        picture:
          typeof body.picture === 'string' && body.picture.length <= 2048 ? body.picture : null,
      };

      const { data, error } = await withTimeout(
        supabase
          .from('user_stats')
          .upsert(profile, { onConflict: 'auth0_id' })
          .select(STATS_FIELDS)
          .single(),
      );

      if (error) {
        logEvent({ status: 500, reason: 'upsert_failed', error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not save profile');
      }

      logEvent({ status: 200, op: 'upsert', latency_ms: Date.now() - started });
      return res.json({ data });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent({ status: 500, reason: 'exception', error: message });
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}
