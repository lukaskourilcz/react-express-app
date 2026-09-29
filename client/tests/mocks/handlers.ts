import { delay, http, HttpResponse } from 'msw';
import { DEFAULT_COIN_SETTINGS } from '../../../shared/rewards';
// Invented test data only. These fixtures are imported by tests and Storybook,
// never by the production app, and use the real public response contract:
// the bodies api/leaderboard.ts and api/settings.ts send, with the same keys,
// the same row columns the SQL routines return and the same error codes.

// The 30-day board (period=30d), the default tab: window_leaderboard rows.
export const leaderboardData = {
  period: '30d', days: 30, category: null, min_answers: 5,
  entries: [
    { rank: 1, display_name: 'Workshop learner', picture: null, correct: 8, answered: 10, accuracy_pct: 80, is_viewer: false },
    { rank: 2, display_name: 'Harbour reader', picture: null, correct: 6, answered: 9, accuracy_pct: 67, is_viewer: false },
  ],
};

// The all-time rows (subject_leaderboard and category_leaderboard).
const allTimeEntries = [{ display_name: 'Long-time learner', picture: null, total_correct: 412, total_questions: 520, accuracy_pct: 79 }];

// The all-time board (period=global): the categories it summed are echoed.
export const allTimeData = {
  period: 'global',
  categories: ['javascript', 'typescript', 'react', 'html', 'css'],
  entries: allTimeEntries,
};

// One topic's all-time board (period=category).
export const categoryData = (category: string) => ({ period: 'category', category, min_attempts: 5, entries: allTimeEntries });

// Today's daily challenge (period=daily): daily_leaderboard_v2 rows.
export const dailyData = {
  period: 'daily', date: '2026-09-25', subject: 'webdev',
  entries: [{ display_name: 'Early riser', picture: null, correct: 9, total: 10, duration_ms: 84_000, attempted_at: '2026-09-25T07:12:00Z' }],
};

// A signed-in learner below the visible top: their own line comes back as `me`.
export const pinnedData = { ...leaderboardData, me: { rank: 14, correct: 3, answered: 6, accuracy_pct: 50 } };
// A signed-in learner with no answers in the window.
export const noActivityData = { ...leaderboardData, me: { rank: null, correct: 0, answered: 0, accuracy_pct: 0 } };

/** The body api/leaderboard.ts sends for the period (and topic) asked for. */
export function boardFor(request: Request, windowBoard: object = leaderboardData) {
  const params = new URL(request.url).searchParams;
  const period = params.get('period');
  if (period === 'global') return allTimeData;
  if (period === 'category') return categoryData(params.get('category') ?? '');
  if (period === 'daily') return { ...dailyData, date: params.get('date') ?? dailyData.date };
  return { ...windowBoard, category: params.get('category') };
}

export const leaderboardHandlers = {
  populated: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json(boardFor(request, leaderboardData))),
  pinned: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json(boardFor(request, pinnedData))),
  noActivity: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json(boardFor(request, noActivityData))),
  empty: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json({ ...boardFor(request), entries: [] })),
  loading: http.get('*/api/leaderboard', async () => { await delay('infinite'); return HttpResponse.json(leaderboardData); }),
  error: http.get('*/api/leaderboard', () =>
    HttpResponse.json({ error: { code: 'db_error', message: 'Could not load leaderboard' } }, { status: 500 })),
  offline: http.get('*/api/leaderboard', () => HttpResponse.error()),
  windowMissing: http.get('*/api/leaderboard', ({ request }) =>
    new URL(request.url).searchParams.get('period') === '30d'
      ? HttpResponse.json({ error: { code: 'rpc_missing', message: 'Run supabase/supabase-schema-040.sql to enable the 30-day leaderboard' } }, { status: 503 })
      : HttpResponse.json(boardFor(request))),
};

// GET /api/settings as api/settings.ts sends it for a launched deployment with
// the stored settings at their defaults: checkout on through Stripe Managed
// Payments, no launch coupon, both learning paths switched off, merchandise
// redemption closed and no Spreadshop promotion this month.
export const publicSettings = {
  quiz: {
    defaultCount: 10,
    countOptions: [10, 20, 30, 40, 50],
    maxCount: 50,
    defaultDifficulty: 'zero-to-hero',
    defaultCategoryIds: ['javascript', 'typescript', 'react', 'nodejs', 'nextjs', 'html', 'css', 'git', 'dsa', 'databases', 'system-design', 'devops'],
  },
  daily: { count: 5 },
  play: { defaultDurationS: 60, durationOptionsS: [30, 60, 120, 300, 0], countOptions: [5, 10, 15, 20] },
  features: { dailyChallenge: true, multiplayer: true, leaderboard: true, flashcards: true },
  leveling: { rankThresholds: [0, 2000, 6000, 14000, 26000, 44000, 68000, 100000, 144000, 200000] },
  shop: {
    prices: { 'double-xp': 75, 'ring-emerald': 200, 'ring-gold': 250, 'ring-violet': 375, 'flair-rocket': 150, 'flair-flame': 300, 'flair-crown': 500 },
    pathUnlockPrice: 200,
  },
  coins: DEFAULT_COIN_SETTINGS,
  merch: { redemptionOpen: false },
  devTips: ['Remember to code.'],
  learningPaths: {
    paths: {
      fde: { enabled: false, version: 1, availability: 'disabled' },
      'dsa-foundations': { enabled: false, version: 1, availability: 'disabled' },
    },
  },
  billing: { enabled: true, cancellable: true, cancelByEmail: true, seller: 'link', launchOffer: false },
  merchPromo: null,
};

export const settingsHandler = http.get('*/api/settings', () => HttpResponse.json(publicSettings));
