import { delay, http, HttpResponse } from 'msw';
import apiSettings from '../../../tests/fixtures/api-settings.json';
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

// This month's XP (period=month, migration 056): month_xp_leaderboard rows,
// ranked by the server, equal XP sharing a rank.
export const monthData = {
  period: 'month', month: '2026-10', subject: 'webdev',
  entries: [
    { rank: 1, display_name: 'Night owl', picture: null, xp: 1240, is_viewer: false },
    { rank: 1, display_name: 'Early bird', picture: null, xp: 1240, is_viewer: false },
    { rank: 3, display_name: null, picture: null, xp: 980, is_viewer: false },
  ],
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
  if (period === 'month') return monthData;
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

// GET /api/user/leaderboard-visibility (op=leaderboard-visibility in
// api/user/[op].ts): whether the public boards show the signed-in learner's
// name and photo. Off until they switch it on.
export const visibilityHandler = (visible = false) =>
  http.get('*/api/user/leaderboard-visibility', () => HttpResponse.json({ visible }));

// GET /api/settings as api/settings.ts sends it for a launched deployment with
// the stored settings at their defaults: checkout on through Stripe Managed
// Payments, no launch coupon, both learning paths switched off, merchandise
// redemption closed and no Spreadshop promotion this month. The body lives in
// tests/fixtures/api-settings.json, which the responsive sweep answers with
// too, and test:launch checks it against the handler.
export const publicSettings = apiSettings;

export const settingsHandler = http.get('*/api/settings', () => HttpResponse.json(publicSettings));
