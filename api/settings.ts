import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError } from '../lib/http';
import { getGameSettings } from '../lib/settings-store';

// Public, read-only subset of the game settings, so the client can render the
// configured count/time options and hide disabled features. Deliberately omits
// server-only fields (e.g. ownerEmail). Falls back to defaults if the DB is down.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const s = await getGameSettings();
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
  });
}
