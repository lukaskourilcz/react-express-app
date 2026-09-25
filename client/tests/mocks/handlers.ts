import { delay, http, HttpResponse } from 'msw';
// Invented test data only. These fixtures are imported by tests and Storybook,
// never by the production app, and use the real public response contract.

// The 30-day board (period=30d), the default tab.
export const leaderboardData = {
  period: '30d', days: 30, category: null, min_answers: 5,
  entries: [
    { rank: 1, display_name: 'Workshop learner', picture: null, correct: 8, answered: 10, accuracy_pct: 80, is_viewer: false },
    { rank: 2, display_name: 'Harbour reader', picture: null, correct: 6, answered: 9, accuracy_pct: 67, is_viewer: false },
  ],
};

// The all-time board (period=global) and one topic's board (period=category).
export const allTimeData = {
  period: 'global',
  entries: [{ display_name: 'Long-time learner', picture: null, total_correct: 412, total_questions: 520, accuracy_pct: 79 }],
};

// Today's daily challenge (period=daily).
export const dailyData = {
  period: 'daily', subject: 'webdev',
  entries: [{ display_name: 'Early riser', picture: null, correct: 9, total: 10, duration_ms: 84_000, attempted_at: '2026-09-25T07:12:00Z' }],
};

// A signed-in learner below the visible top: their own line comes back as `me`.
export const pinnedData = { ...leaderboardData, me: { rank: 14, correct: 3, answered: 6, accuracy_pct: 50 } };
// A signed-in learner with no answers in the window.
export const noActivityData = { ...leaderboardData, me: { rank: null, correct: 0, answered: 0, accuracy_pct: 0 } };

function boardFor(request: Request, windowBoard: object) {
  const period = new URL(request.url).searchParams.get('period');
  if (period === 'global' || period === 'category') return allTimeData;
  if (period === 'daily') return dailyData;
  return windowBoard;
}

export const leaderboardHandlers = {
  populated: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json(boardFor(request, leaderboardData))),
  pinned: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json(boardFor(request, pinnedData))),
  noActivity: http.get('*/api/leaderboard', ({ request }) => HttpResponse.json(boardFor(request, noActivityData))),
  empty: http.get('*/api/leaderboard', ({ request }) =>
    HttpResponse.json({ period: new URL(request.url).searchParams.get('period') ?? '30d', entries: [] })),
  loading: http.get('*/api/leaderboard', async () => { await delay('infinite'); return HttpResponse.json(leaderboardData); }),
  error: http.get('*/api/leaderboard', () => HttpResponse.json({ error: { code: 'unavailable' } }, { status: 503 })),
  offline: http.get('*/api/leaderboard', () => HttpResponse.error()),
  windowMissing: http.get('*/api/leaderboard', ({ request }) =>
    new URL(request.url).searchParams.get('period') === '30d'
      ? HttpResponse.json({ error: { code: 'rpc_missing', message: 'Run supabase/supabase-schema-040.sql' } }, { status: 503 })
      : HttpResponse.json(allTimeData)),
};
