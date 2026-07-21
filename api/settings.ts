import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';
import { jsonError, withRequestContext } from '../lib/http';
import { getGameSettings } from '../lib/settings-store';
import { isAiExplanationConfigured } from '../lib/ai-provider';

// Public, read-only subset of the game settings, so the client can render the
// configured count/time options and hide disabled features. Deliberately omits
// server-only fields (e.g. ownerEmail). Falls back to defaults if the DB is down.
async function routeHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const s = await getGameSettings();
  // This server-only flag is the production master switch. An administrator
  // may prepare truthful amounts and provider URLs in app_settings, but no
  // financial link can become public until the deployment explicitly opts in.
  const supportMasterEnabled = process.env.SUPPORT_ENABLED === 'true';
  const publicSupport = {
    ...s.support,
    enabled: supportMasterEnabled && s.support.enabled,
    ...(!supportMasterEnabled ? {
      kofiUrl: '',
      githubSponsorsUrl: '',
      publicThanksEnabled: false,
    } : {}),
  };
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
  return res.json({
    quiz: {
      defaultCount: s.quiz.defaultCount,
      countOptions: s.quiz.countOptions,
      maxCount: s.quiz.maxCount,
      defaultDifficulty: s.quiz.defaultDifficulty,
      defaultCategoryIds: s.quiz.defaultCategoryIds,
    },
    daily: { count: s.daily.count },
    play: {
      defaultDurationS: s.play.defaultDurationS,
      durationOptionsS: s.play.durationOptionsS,
      countOptions: s.play.countOptions,
    },
    features: s.features,
    leveling: s.leveling,
    shop: s.shop,
    support: publicSupport,
    ai: {
      explanationsEnabled: isAiExplanationConfigured(),
    },
    devTips: s.devTips,
  });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
