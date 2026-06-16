import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STAT_CATEGORIES } from '../lib/quiz-data';
import { supabaseAnon as supabase, jsonError, logEvent, withTimeout } from '../lib/http';

const VALID_CATEGORIES = new Set<string>(STAT_CATEGORIES);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!supabase) {
    return jsonError(res, 503, 'not_configured', 'Leaderboard backend is not configured');
  }

  const period = (req.query.period as string) || 'global';
  const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const limitParam = parseInt(req.query.limit as string, 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;

  try {
    if (period === 'global') {
      const { data, error } = await withTimeout(
        supabase.rpc('global_leaderboard', { p_limit: limit }),
      );
      if (error) {
        if (/function .* does not exist/i.test(error.message)) {
          return jsonError(res, 503, 'rpc_missing', 'Run supabase-schema-004.sql to enable leaderboards');
        }
        logEvent('leaderboard', { status: 500, error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load leaderboard');
      }
      // 60s SWR — leaderboards are eventually-consistent.
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ period: 'global', entries: data });
    }

    if (period === 'category') {
      const category = (req.query.category as string) || '';
      if (!VALID_CATEGORIES.has(category)) {
        return jsonError(res, 400, 'bad_request', 'Invalid category');
      }
      const minParam = parseInt(req.query.min_attempts as string, 10);
      const minAttempts = Number.isFinite(minParam)
        ? Math.min(Math.max(minParam, 1), 100)
        : 5;
      const { data, error } = await withTimeout(
        supabase.rpc('category_leaderboard', {
          p_category: category,
          p_limit: limit,
          p_min_attempts: minAttempts,
        }),
      );
      if (error) {
        if (/function .* does not exist/i.test(error.message)) {
          return jsonError(res, 503, 'rpc_missing', 'Run supabase-schema-005.sql');
        }
        logEvent('leaderboard', { status: 500, error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load category leaderboard');
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ period: 'category', category, min_attempts: minAttempts, entries: data });
    }

    if (period === 'daily') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return jsonError(res, 400, 'bad_request', 'date must be YYYY-MM-DD');
      }
      const { data, error } = await withTimeout(
        supabase.rpc('daily_leaderboard', {
          p_date: dateParam,
          p_limit: limit,
        }),
      );
      if (error) {
        if (/function .* does not exist/i.test(error.message)) {
          return jsonError(res, 503, 'rpc_missing', 'Run supabase-schema-004.sql to enable leaderboards');
        }
        logEvent('leaderboard', { status: 500, error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load daily leaderboard');
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ period: 'daily', date: dateParam, entries: data });
    }

    return jsonError(res, 400, 'bad_request', 'period must be "global", "daily", or "category"');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent('leaderboard', { status: 500, error: message });
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}
