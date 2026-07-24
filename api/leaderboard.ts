import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';
import {
  createServiceClient,
  jsonError,
  createLogger,
  withTimeout,
  isRpcMissing,
  STATS_CATEGORIES,
  withRequestContext,
} from '../lib/http';
import {
  defaultDeploymentCategories,
  isDeploymentCategory,
  validateCategoryScope,
} from '../lib/product-scope';

// Public responses are served by this scoped API, but leaderboard RPCs are
// service-only so callers cannot bypass deployment/category validation through
// the Supabase Data API.
const supabase = createServiceClient();

const logEvent = createLogger('leaderboard');

async function routeHandler(req: VercelRequest, res: VercelResponse) {
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
      // Per-subject (platform) scoping: ?categories=a,b,c sums each user's
      // per-category lifetime stats over exactly those categories. The client
      // sends the active subject's category set; subjects are disjoint, so the
      // result is that platform's own all-time board.
      const catRaw = typeof req.query.categories === 'string' ? req.query.categories : '';
      const requested = catRaw
        ? catRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : defaultDeploymentCategories();
      const scope = validateCategoryScope(requested.slice(0, 64));
      if (!scope.ok) {
        return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
      }
      const cats = scope.categories.filter((category) => STATS_CATEGORIES.has(category));
      if (cats.length === 0) return jsonError(res, 400, 'bad_request', 'Invalid categories');
      const { data, error } = await withTimeout(
        supabase.rpc('subject_leaderboard', { p_categories: cats, p_limit: limit }),
      );
      if (error) {
        if (isRpcMissing(error)) {
          return jsonError(res, 503, 'rpc_missing', 'Run supabase/supabase-schema-020.sql to enable per-subject leaderboards');
        }
        logEvent({ status: 500, error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load leaderboard');
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ period: 'global', categories: cats, entries: data });
    }

    if (period === 'category') {
      const category = (req.query.category as string) || '';
      if (!STATS_CATEGORIES.has(category) || !isDeploymentCategory(category)) {
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
        if (isRpcMissing(error)) {
          return jsonError(res, 503, 'rpc_missing', 'Run supabase/supabase-schema-005.sql');
        }
        logEvent({ status: 500, error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load category leaderboard');
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ period: 'category', category, min_attempts: minAttempts, entries: data });
    }

    if (period === 'daily') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return jsonError(res, 400, 'bad_request', 'date must be YYYY-MM-DD');
      }
      const catRaw = typeof req.query.categories === 'string' ? req.query.categories : '';
      const requested = catRaw
        ? catRaw.split(',').map((value) => value.trim()).filter(Boolean)
        : defaultDeploymentCategories();
      const scope = validateCategoryScope(requested.slice(0, 64));
      if (!scope.ok) {
        return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
      }
      const { data, error } = await withTimeout(
        supabase.rpc('daily_leaderboard_v2', {
          p_date: dateParam,
          p_subject: scope.subject,
          p_limit: limit,
        }),
      );
      if (error) {
        if (isRpcMissing(error)) {
          return jsonError(res, 503, 'rpc_missing', 'Run supabase/supabase-schema-022.sql to enable subject-scoped daily leaderboards');
        }
        logEvent({ status: 500, error: error.message });
        return jsonError(res, 500, 'db_error', 'Could not load daily leaderboard');
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json({ period: 'daily', date: dateParam, subject: scope.subject, entries: data });
    }

    return jsonError(res, 400, 'bad_request', 'period must be "global", "daily", or "category"');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    logEvent({ status: 500, error: message });
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
