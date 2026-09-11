import { delay, http, HttpResponse } from 'msw';
// Invented test data only. These fixtures are imported by tests and Storybook,
// never by the production app, and use the real public response contract.
export const leaderboardData = { period: 'global', entries: [{
  user_id: 'fixture-learner', display_name: 'Workshop learner', picture: null,
  total_correct: 8, total_questions: 10, accuracy_pct: 80,
}] };
export const leaderboardHandlers = {
  populated: http.get('*/api/leaderboard', () => HttpResponse.json(leaderboardData)),
  empty: http.get('*/api/leaderboard', () => HttpResponse.json({ period: 'global', entries: [] })),
  loading: http.get('*/api/leaderboard', async () => { await delay('infinite'); return HttpResponse.json(leaderboardData); }),
  error: http.get('*/api/leaderboard', () => HttpResponse.json({ error: { code: 'unavailable' } }, { status: 503 })),
  offline: http.get('*/api/leaderboard', () => HttpResponse.error()),
};
