// The solo quiz (Quiz.tsx) and the results that wait to be saved
// (PendingQuizResults). Invented question fixtures; the wire shapes are the
// real ones from api/quiz/questions, daily, submit and api/user/stats.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { queryClient } from '../src/lib/queryClient';
import { DEFAULT_CONFIG } from '../src/lib/gameConfig';
import { server } from './mocks/server';
import { localDayChangeTime } from '../src/lib/utcDay';

// Each test renders the whole quiz and walks through it.
vi.setConfig({ testTimeout: 30_000 });

const auth = vi.hoisted(() => ({
  value: { user: null as null | { id: string; email: string; user_metadata: object }, isAuthenticated: false, isLoading: false },
}));
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuth: () => ({ ...auth.value, signInWithGoogle: async () => {}, signOut: async () => {}, signInResumeFailed: false }),
}));
// The loading screen holds for over a second so it never flickers; nothing
// here is about that.
vi.mock('../src/components/LoadingScreen', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  holdLoadingScreen: () => Promise.resolve(),
}));

import Quiz from '../src/components/Quiz';
import PendingQuizResults from '../src/components/PendingQuizResults';
import Leaderboard from '../src/components/Leaderboard';
import { onXpToast } from '../src/lib/xp';

const LEARNER = { id: 'user-quiz-test-0001', email: 'learner@example.test', user_metadata: {} };
const PROGRESS_KEY = 'devquiz:in-progress';
const PENDING_KEY = 'devshark:pending-quiz-receipts:v2';
const LEGACY_PENDING_KEY = 'studyshark:pending-quiz-receipt:v1';

const Q = (id: string, extra: object = {}) => ({
  id, introduction: '', question: `Question ${id}?`, options: [`alpha ${id}`, `beta ${id}`, `gamma ${id}`, `delta ${id}`],
  category: 'javascript', difficulty: 2, ...extra,
});
/** A sealed-looking session id; the last 22 characters tell attempts apart. */
const sessionFor = (tag: string) => `v2.aaaaaaaaaaaaaaaa.bbbbbbbbbbbb.${tag.padEnd(22, '0')}`;
const graded = (questions: { id: string }[], extra: object = {}) => ({
  totalQuestions: questions.length, correctAnswers: questions.length, percentage: 100, questXp: 6 * questions.length,
  results: questions.map((q) => ({ questionId: q.id, selectedIndex: 0, correctAnswer: 0, isCorrect: true, explanation: `Why ${q.id}` })),
  ...extra,
});

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function quizTree(path = '/quiz') {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes>
            <Route path="/quiz" element={<><Quiz /><PendingQuizResults /></>} />
            <Route path="/leaderboard" element={<LocationProbe />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
function renderQuiz(path = '/quiz') {
  return render(quizTree(path));
}

const counter = () => screen.getAllByText(/^Question \d+ of \d+$/)[0].textContent;
/** The answer cards of the question on screen (the setup screen has radios too). */
const answerCards = () => screen.getAllByRole('radio').filter((radio) => radio.closest('fieldset'));
const checked = () => answerCards().map((radio) => radio.getAttribute('aria-checked') === 'true');
/** Waits for a question, then lets its effects run: the shortcuts listen
 * from an effect, and a key pressed before it runs is lost. */
const questionOnScreen = async () => {
  await screen.findAllByText(/^Question \d+ of \d+$/);
  await act(async () => {});
};

async function startQuiz(questions = [Q('a'), Q('b')], extra: object = {}) {
  server.use(http.get('*/api/quiz/questions', () => HttpResponse.json({ sessionId: sessionFor('standard'), expiresAt: Date.now() + 3_600_000, questions, ...extra })));
  renderQuiz();
  fireEvent.click(await screen.findByRole('button', { name: /start quiz/i }));
  await questionOnScreen();
}

function answerAll(count: number) {
  for (let i = 0; i < count; i++) {
    fireEvent.keyDown(document.body, { key: '1' });
    if (i < count - 1) fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  }
}

function signIn() {
  auth.value = { user: LEARNER, isAuthenticated: true, isLoading: false };
  server.use(http.get('*/api/user/xp', () => HttpResponse.json({ data: { quest_xp: 0, by_subject: {} } })));
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  queryClient.clear();
  localStorage.setItem('devquiz:quiz-setup:v1', JSON.stringify({ count: 10, difficulty: 'mixed', categories: ['javascript'] }));
  auth.value = { user: null, isAuthenticated: false, isLoading: false };
  server.use(http.get('*/api/settings', () => HttpResponse.json(DEFAULT_CONFIG)));
});

describe('keyboard shortcuts', () => {
  it('keep working after a click leaves focus on an answer or a button, and leave Enter on a button to the browser', async () => {
    let submits = 0;
    server.use(http.post('*/api/quiz/submit', () => { submits++; return HttpResponse.json(graded([Q('a'), Q('b')])); }));
    await startQuiz();

    const first = answerCards()[0];
    first.focus();
    fireEvent.click(first);
    fireEvent.keyDown(first, { key: '3' });
    expect(checked()).toEqual([false, false, true, false]);
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(counter()).toBe('Question 2 of 2');

    const previous = screen.getByRole('button', { name: /^previous$/i });
    previous.focus();
    fireEvent.keyDown(previous, { key: '4' });
    expect(checked()).toEqual([false, false, false, true]);
    // Every question is answered, so Enter would submit; on a focused button
    // it is the button's own, and the quiz does not act as well.
    fireEvent.keyDown(previous, { key: 'Enter' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(submits).toBe(0);
    expect(counter()).toBe('Question 2 of 2');
  });
});

describe('starting', () => {
  it('keeps Start quiz focusable without a category, and pressing it says what is missing', async () => {
    localStorage.setItem('devquiz:quiz-setup:v1', JSON.stringify({ count: 10, difficulty: 'mixed', categories: [] }));
    let fetched = 0;
    server.use(http.get('*/api/quiz/questions', () => { fetched++; return HttpResponse.json({}); }));
    renderQuiz();
    const start = await screen.findByRole('button', { name: /start quiz/i });
    expect(start).not.toBeDisabled();
    expect(start).toHaveAttribute('aria-disabled', 'true');
    start.focus();
    expect(document.activeElement).toBe(start);
    fireEvent.click(start);
    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one category');
    expect(start).toHaveAccessibleDescription('Select at least one category');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetched).toBe(0);
  });

  it('moves focus to the first question, not to the page', async () => {
    server.use(http.get('*/api/quiz/questions', () => HttpResponse.json({ sessionId: sessionFor('standard'), expiresAt: Date.now() + 3_600_000, questions: [Q('a'), Q('b')] })));
    renderQuiz();
    const start = await screen.findByRole('button', { name: /start quiz/i });
    expect(start).not.toHaveAttribute('aria-disabled');
    start.focus();
    fireEvent.click(start);
    await questionOnScreen();
    expect(document.activeElement).toHaveTextContent('Question a?');
    expect(document.activeElement?.id).toBe('question-text-a');
  });
});

describe('a question retired while the quiz was open', () => {
  it('reads as not counted, with no answers and no bookmark', async () => {
    server.use(http.post('*/api/quiz/submit', () => HttpResponse.json({ ...graded([Q('a')]), voided: ['b'] })));
    await startQuiz();
    answerAll(2);
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    await screen.findByText('1 / 1');

    expect(screen.getByText('Retired, not counted')).toBeInTheDocument();
    expect(screen.queryByText('alpha b')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /bookmark this question/i })).toHaveLength(1);
  });
});

describe('the daily challenge', () => {
  it('says today’s challenge is played when the server reports it, and links to today’s board', async () => {
    signIn();
    server.use(http.get('*/api/quiz/daily', () => HttpResponse.json({ date: '2026-09-29', sessionId: sessionFor('daily'), questions: [Q('d1')], completed: true })));
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /today’s challenge/i }));
    expect(await screen.findByText('You’ve played today’s challenge')).toBeInTheDocument();
    expect(screen.queryByText('Question d1?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /see today’s leaderboard/i }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/leaderboard?tab=today');
  });

  it('says when the next one starts on the learner’s own clock', async () => {
    signIn();
    server.use(http.get('*/api/quiz/daily', () => HttpResponse.json({ date: '2026-09-29', sessionId: sessionFor('daily'), questions: [Q('d1')], completed: true })));
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /today’s challenge/i }));
    expect(await screen.findByText(`Each day’s challenge counts once. The next one starts at ${localDayChangeTime()} your time.`)).toBeInTheDocument();
  });

  it('says the same under a finished challenge', async () => {
    server.use(
      http.get('*/api/quiz/daily', () => HttpResponse.json({ date: '2026-09-29', sessionId: sessionFor('daily'), questions: [Q('d1')] })),
      http.post('*/api/quiz/submit', () => HttpResponse.json(graded([Q('d1')]))),
    );
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /today’s challenge/i }));
    await questionOnScreen();
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    expect(await screen.findByText(`Today’s challenge complete. The next one starts at ${localDayChangeTime()} your time.`)).toBeInTheDocument();
  });

  it('links to a leaderboard that opens on today’s board', async () => {
    const periods: (string | null)[] = [];
    server.use(http.get('*/api/leaderboard', ({ request }) => {
      const period = new URL(request.url).searchParams.get('period');
      periods.push(period);
      return HttpResponse.json(period === 'daily'
        ? { period: 'daily', subject: 'webdev', entries: [{ display_name: 'Early riser', picture: null, correct: 5, total: 5, duration_ms: 84_000, attempted_at: '2026-09-29T07:12:00Z' }] }
        : { period, entries: [] });
    }));
    await act(async () => render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leaderboard?tab=today']}>
          <LanguageProvider><Leaderboard /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(await screen.findByText('Early riser')).toBeInTheDocument();
    expect(periods).toContain('daily');
  });

  it('turns a second submit of the day into that message, not the raw 409', async () => {
    server.use(
      http.get('*/api/quiz/daily', () => HttpResponse.json({ date: '2026-09-29', sessionId: sessionFor('daily'), questions: [Q('d1')] })),
      http.post('*/api/quiz/submit', () => HttpResponse.json({ error: { code: 'attempt_already_graded', message: 'This answer has already been graded and cannot be changed' } }, { status: 409 })),
    );
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /today’s challenge/i }));
    await questionOnScreen();
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(await screen.findByText('You’ve played today’s challenge')).toBeInTheDocument();
    expect(screen.queryByText(/already been graded/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit quiz/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('Retry after a failed daily fetch asks for the daily again', async () => {
    const hits: string[] = [];
    server.use(
      http.get('*/api/quiz/daily', () => { hits.push('daily'); return HttpResponse.json({ error: { code: 'x', message: 'Daily unavailable' } }, { status: 500 }); }),
      http.get('*/api/quiz/questions', () => { hits.push('questions'); return HttpResponse.json({ sessionId: sessionFor('q'), questions: [Q('z')] }); }),
    );
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /today’s challenge/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^retry$/i }));
    await waitFor(() => expect(hits).toHaveLength(2));
    expect(hits).toEqual(['daily', 'daily']);
  });

  // The Home "Daily challenge" tile opened the survival Challenge, and the
  // leaderboard's empty Today board opened a plain quiz. Both link here now.
  it('starts from the leaderboard’s empty Today board, once, and drops the parameter', async () => {
    const hits: string[] = [];
    server.use(
      http.get('*/api/leaderboard', ({ request }) => HttpResponse.json({ period: new URL(request.url).searchParams.get('period'), subject: 'webdev', entries: [] })),
      http.get('*/api/quiz/daily', () => { hits.push('daily'); return HttpResponse.json({ date: '2026-09-29', sessionId: sessionFor('daily'), questions: [Q('d1')] }); }),
    );
    await act(async () => render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leaderboard?tab=today']}>
          <LanguageProvider>
            <Routes>
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/quiz" element={<><Quiz /><LocationProbe /></>} />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(await screen.findByText('Nobody has finished today’s daily challenge yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Today’s challenge' }));
    expect(await screen.findByText('Question d1?')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/quiz$/);
    await act(async () => {});
    expect(hits).toEqual(['daily']);
  });

  it('waits for the sign-in before starting a linked daily, so it is not fetched as practice', async () => {
    const hits: string[] = [];
    server.use(http.get('*/api/quiz/daily', () => { hits.push('daily'); return HttpResponse.json({ date: '2026-09-29', sessionId: sessionFor('daily'), questions: [Q('d1')] }); }));
    auth.value = { user: null, isAuthenticated: false, isLoading: true };
    const view = renderQuiz('/quiz?mode=daily');
    await screen.findByRole('button', { name: /start quiz/i });
    await act(async () => {});
    expect(hits).toEqual([]);
    signIn();
    view.rerender(quizTree('/quiz?mode=daily'));
    expect(await screen.findByText('Question d1?')).toBeInTheDocument();
    expect(hits).toEqual(['daily']);
  });

  it('is hidden when the /dev switch turns it off', async () => {
    server.use(http.get('*/api/settings', () => HttpResponse.json({ ...DEFAULT_CONFIG, features: { ...DEFAULT_CONFIG.features, dailyChallenge: false } })));
    renderQuiz();
    await screen.findByRole('button', { name: /start quiz/i });
    await waitFor(() => expect(screen.queryByRole('button', { name: /today’s challenge/i })).not.toBeInTheDocument());
  });
});

describe('submitting', () => {
  it('locks the answers once a submit was sent, and a retry sends the same ones', async () => {
    const bodies: { answers: Record<string, number> }[] = [];
    let fail = true;
    server.use(http.post('*/api/quiz/submit', async ({ request }) => {
      bodies.push(await request.json() as { answers: Record<string, number> });
      if (fail) { fail = false; return HttpResponse.json({ error: { code: 'upstream', message: 'Grading is busy' } }, { status: 503 }); }
      return HttpResponse.json(graded([Q('a')]));
    }));
    await startQuiz([Q('a')]);
    fireEvent.keyDown(document.body, { key: '2' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(await screen.findByText(/can’t be changed now/)).toBeInTheDocument();
    expect(answerCards().every((radio) => radio.hasAttribute('disabled'))).toBe(true);
    fireEvent.keyDown(document.body, { key: '4' });
    expect(checked()).toEqual([false, true, false, false]);

    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    await screen.findByText('1 / 1');
    expect(bodies.map((body) => body.answers)).toEqual([{ a: 1 }, { a: 1 }]);
  });

  it('says when advanced was asked of topics that have none', async () => {
    await startQuiz([Q('a')], { hardestAvailable: true });
    expect(screen.getByText(/no advanced questions yet/)).toBeInTheDocument();
  });
});

describe('an expired quiz session', () => {
  it('is dropped on return instead of resumed', async () => {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({
      sessionId: sessionFor('old'), questions: [Q('a')], answers: {}, currentIndex: 0, mode: 'standard', expiresAt: Date.now() - 1000,
    }));
    renderQuiz();
    expect(await screen.findByRole('button', { name: /start quiz/i })).toBeInTheDocument();
    expect(screen.queryByText('Question a?')).not.toBeInTheDocument();
    expect(await screen.findByText(/more than an hour old/)).toBeInTheDocument();
    expect(sessionStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('resumes with the hints that were opened, so they are reported', async () => {
    const bodies: { hinted: string[] }[] = [];
    server.use(http.post('*/api/quiz/submit', async ({ request }) => {
      bodies.push(await request.json() as { hinted: string[] });
      return HttpResponse.json(graded([Q('a'), Q('b')]));
    }));
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({
      sessionId: sessionFor('resume'), questions: [Q('a'), Q('b')], answers: { a: 0 }, currentIndex: 1, mode: 'standard',
      expiresAt: Date.now() + 600_000, hinted: ['a'],
    }));
    renderQuiz();
    await questionOnScreen();
    expect(JSON.parse(sessionStorage.getItem(PROGRESS_KEY)!).hinted).toEqual(['a']);
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    await screen.findByText('2 / 2');
    expect(bodies[0].hinted).toEqual(['a']);
  });

  it('refused at submit, clears the saved quiz and offers a new one with the same settings', async () => {
    const asked: string[] = [];
    server.use(
      http.get('*/api/quiz/questions', ({ request }) => {
        asked.push(new URL(request.url).search);
        return HttpResponse.json({ sessionId: sessionFor(`s${asked.length}`), expiresAt: Date.now() + 3_600_000, questions: [Q('a')] });
      }),
      http.post('*/api/quiz/submit', () => HttpResponse.json({ error: { code: 'invalid_session', message: 'Quiz session expired or invalid' } }, { status: 400 })),
    );
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /start quiz/i }));
    await questionOnScreen();
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(await screen.findByText('This quiz expired')).toBeInTheDocument();
    expect(sessionStorage.getItem(PROGRESS_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /new quiz, same settings/i }));
    await questionOnScreen();
    expect(asked).toHaveLength(2);
    expect(asked[1]).toBe(asked[0]);
    expect(new URLSearchParams(asked[1]).get('difficulty')).toBe('mixed');
    expect(new URLSearchParams(asked[1]).get('categories')).toBe('javascript');
  });
});

describe('saving a result to the account', () => {
  const pendingStore = () => JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}') as Record<string, { receipt: string }>;

  it('keeps one waiting result per attempt when the write fails, and says it is not saved yet', async () => {
    signIn();
    let run = 0;
    server.use(
      http.get('*/api/quiz/questions', () => { run++; return HttpResponse.json({ sessionId: sessionFor(`attempt${run}`), questions: [Q('a')] }); }),
      http.post('*/api/quiz/submit', () => HttpResponse.json({ ...graded([Q('a')]), resultReceipt: `receipt-${run}` })),
      http.post('*/api/user/stats', () => HttpResponse.json({ error: { code: 'db_error', message: 'Could not record quiz result' } }, { status: 500 })),
    );
    renderQuiz();
    fireEvent.click(await screen.findByRole('button', { name: /start quiz/i }));
    await questionOnScreen();
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    expect(await screen.findByText(/isn’t saved to your account yet/)).toBeInTheDocument();
    await waitFor(() => expect(Object.values(pendingStore()).map((pending) => pending.receipt)).toEqual(['receipt-1']));

    fireEvent.click(screen.getByRole('button', { name: /^new quiz$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /start quiz/i }));
    await questionOnScreen();
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    // The second failure is kept beside the first, not over it.
    await waitFor(() => expect(Object.values(pendingStore()).map((pending) => pending.receipt).sort()).toEqual(['receipt-1', 'receipt-2']));
  });

  it('drops a result the server refuses and says it could not be saved', async () => {
    signIn();
    server.use(
      http.post('*/api/quiz/submit', () => HttpResponse.json({ ...graded([Q('a')]), resultReceipt: 'refused-receipt' })),
      http.post('*/api/user/stats', () => HttpResponse.json({ error: { code: 'invalid_receipt', message: 'Quiz result receipt expired or invalid' } }, { status: 400 })),
    );
    await startQuiz([Q('a')]);
    fireEvent.keyDown(document.body, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    expect(await screen.findByText('This result could not be saved to your account.')).toBeInTheDocument();
    expect(pendingStore()).toEqual({});
  });

  it('announces the XP the account recorded and never says repeats earn less', async () => {
    // From migration 056 every answer earns XP, a repeat included, so the
    // result screen no longer explains a smaller award. A server from before
    // 056 may still record less than the result (here 6 of 12): the screen
    // announces what was recorded and adds no note about repeats.
    signIn();
    const gains: number[] = [];
    const stop = onXpToast((toast) => { if (toast.kind === 'gain') gains.push(toast.amount); });
    let saved = 0;
    server.use(
      http.post('*/api/quiz/submit', () => HttpResponse.json({ ...graded([Q('a'), Q('b')]), resultReceipt: 'repeat-receipt' })),
      http.post('*/api/user/stats', () => { saved++; return HttpResponse.json({ data: null, xp: { quest_xp: 6, quest_xp_by_subject: { webdev: 6 } }, applied: true, questXp: 6 }); }),
    );
    try {
      await startQuiz([Q('a'), Q('b')]);
      answerAll(2);
      fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
      await waitFor(() => expect(saved).toBe(1));
      await waitFor(() => expect(gains).toEqual([6]));
      await act(async () => {});
      expect(screen.queryByText(/earlier today|counts once a day/)).not.toBeInTheDocument();
    } finally {
      stop();
    }
  });

  it('sends waiting results once signed in, and drops the ones too old to record', async () => {
    signIn();
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      one: { userId: LEARNER.id, receipt: 'fresh', profile: {} },
      two: { userId: LEARNER.id, receipt: 'expired', profile: {} },
      other: { userId: 'someone-else-0001', receipt: 'theirs', profile: {} },
    }));
    localStorage.setItem(LEGACY_PENDING_KEY, JSON.stringify({ userId: LEARNER.id, receipt: 'from-the-old-slot', profile: {} }));
    const sent: string[] = [];
    server.use(http.post('*/api/user/stats', async ({ request }) => {
      const { result_receipt: receipt } = await request.json() as { result_receipt: string };
      sent.push(receipt);
      return receipt === 'expired'
        ? HttpResponse.json({ error: { code: 'invalid_receipt', message: 'Quiz result receipt expired or invalid' } }, { status: 400 })
        : HttpResponse.json({ data: null, xp: null, applied: true });
    }));
    const view = render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider><PendingQuizResults /></LanguageProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/earlier quiz result could not be saved/)).toBeInTheDocument();
    expect(sent.sort()).toEqual(['expired', 'fresh', 'from-the-old-slot']);
    expect(Object.keys(pendingStore())).toEqual(['other']);
    expect(localStorage.getItem(LEGACY_PENDING_KEY)).toBeNull();

    view.unmount();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider><PendingQuizResults /></LanguageProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sent).toHaveLength(3);
  });
});
