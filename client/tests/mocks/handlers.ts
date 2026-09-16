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

// The weekly league. Invented rows in the real response contract: the server
// decides the order, so the fixture is already ranked and the panel renders it
// as given — a fixture that needed sorting would be testing the wrong thing.
export const leagueData = {
  subject: 'geography',
  optedOut: false,
  weekStart: '2026-09-14',
  tier: 2,
  entries: [
    { displayName: 'Workshop learner', picture: null, correct: 42, answered: 50, accuracyPct: 84, isSelf: false },
    { displayName: 'Fixture reader', picture: null, correct: 31, answered: 40, accuracyPct: 78, isSelf: true },
    { displayName: 'Third seat', picture: null, correct: 12, answered: 20, accuracyPct: 60, isSelf: false },
  ],
};

export const leagueHandlers = {
  populated: http.get('*/api/user/league-board', () => HttpResponse.json(leagueData)),
  empty: http.get('*/api/user/league-board', () =>
    HttpResponse.json({ subject: 'geography', optedOut: false, weekStart: '2026-09-14', tier: 1, entries: [] })),
  loading: http.get('*/api/user/league-board', async () => { await delay('infinite'); return HttpResponse.json(leagueData); }),
  /** The migration has not been applied yet — an honest "not on" and not a failure. */
  migrationRequired: http.get('*/api/user/league-board', () =>
    HttpResponse.json({ error: { code: 'migration_required', message: 'Run supabase/supabase-schema-038.sql to enable weekly leagues' } }, { status: 503 })),
  signedOut: http.get('*/api/user/league-board', () =>
    HttpResponse.json({ error: { code: 'unauthorized', message: 'Sign in required' } }, { status: 401 })),
  error: http.get('*/api/user/league-board', () =>
    HttpResponse.json({ error: { code: 'db_error', message: 'Could not load your league' } }, { status: 500 })),
  offline: http.get('*/api/user/league-board', () => HttpResponse.error()),
  optedOut: http.get('*/api/user/league-board', () =>
    HttpResponse.json({ subject: 'geography', optedOut: true, weekStart: null, tier: null, entries: [] })),
  setOptout: http.put('*/api/user/league-optout', async ({ request }) => {
    const body = (await request.json()) as { optedOut?: boolean };
    return HttpResponse.json({ optedOut: body.optedOut === true });
  }),
};

// The puzzle sprint. Invented questions in the real response contract, and the
// same one-answer-at-a-time grading the server does: the fixture decides what
// is correct, exactly as the server would, and the screen is only ever told the
// verdict. `startedAt` and `durationMs` are the server's clock.
const sprintQuestion = (id: string, question: string, options: string[]) => ({
  id, tags: ['tactics'], introduction: '', question, options, category: 'tactics', difficulty: 2,
});

// Seven questions, so a run can reach the first combo step (five in a row),
// miss one, and still have a question left before the buffer runs dry.
export const sprintBatchData = {
  sessionId: 'fixture-sprint-session',
  runToken: 'fixture-sprint-run',
  startedAt: Date.now(),
  durationMs: 180_000,
  questions: Array.from({ length: 7 }, (_, index) =>
    sprintQuestion(`sprint-${index + 1}`, `Sprint question ${index + 1}`, [`right ${index + 1}`, `wrong ${index + 1}`])),
};

/** The fixture's answer key: option 0 is always the correct one. */
const SPRINT_CORRECT_INDEX = 0;

export const sprintHandlers = {
  board: http.get('*/api/quiz/challenge', ({ request }) => {
    const resource = new URL(request.url).searchParams.get('resource');
    if (resource !== 'sprint-board') return passthroughSprint(request);
    return HttpResponse.json({
      top: [{ id: 'fixture-sprint-score', name: 'Workshop sprinter', score: 34, createdAt: '2026-09-16T10:00:00Z' }],
      champion: { id: 'fixture-sprint-score', name: 'Workshop sprinter', score: 34, createdAt: '2026-09-16T10:00:00Z' },
    });
  }),
  boardMigrationRequired: http.get('*/api/quiz/challenge', ({ request }) => {
    const resource = new URL(request.url).searchParams.get('resource');
    if (resource !== 'sprint-board') return passthroughSprint(request);
    return HttpResponse.json(
      { error: { code: 'migration_required', message: 'Run supabase/supabase-schema-042.sql to enable the sprint board' } },
      { status: 503 },
    );
  }),
  boardError: http.get('*/api/quiz/challenge', ({ request }) => {
    const resource = new URL(request.url).searchParams.get('resource');
    if (resource !== 'sprint-board') return passthroughSprint(request);
    return HttpResponse.json({ error: { code: 'leaderboard_unavailable' } }, { status: 503 });
  }),
  /** The first batch of a run arrives; a top-up for the same run finds nothing
   *  left, which ends the run rather than failing it. */
  batch: http.get('*/api/quiz/challenge', ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get('resource') !== 'sprint') return passthroughSprint(request);
    if (params.get('runToken')) {
      return HttpResponse.json({ error: { code: 'no_questions', message: 'No sprint questions available' } }, { status: 404 });
    }
    return HttpResponse.json({ ...sprintBatchData, startedAt: Date.now() });
  }),
  grade: http.post('*/api/quiz/submit', async ({ request }) => {
    const body = (await request.json()) as { answers: Record<string, number> };
    const [questionId, selectedIndex] = Object.entries(body.answers)[0] ?? ['', -1];
    const correctAnswer = SPRINT_CORRECT_INDEX;
    const isCorrect = selectedIndex === correctAnswer;
    return HttpResponse.json({
      totalQuestions: 1,
      correctAnswers: isCorrect ? 1 : 0,
      percentage: isCorrect ? 100 : 0,
      questXp: isCorrect ? 6 : 0,
      results: [{
        questionId,
        selectedIndex,
        correctAnswer,
        isCorrect,
        explanation: 'Fixture explanation.',
        scoreProof: `fixture-proof-${questionId}`,
      }],
    });
  }),
  complete: http.post('*/api/quiz/challenge', ({ request }) => {
    const resource = new URL(request.url).searchParams.get('resource');
    if (resource !== 'sprint-complete') return passthroughSprint(request);
    return HttpResponse.json({
      ok: true, score: 6, wrong: 1, longestCombo: 5, bonusMs: 3000, awarded: false, xp: 0, record: null,
    });
  }),
};

/** A sprint handler that was asked for something else lets the next handler try. */
function passthroughSprint(_request: Request) {
  return undefined;
}
