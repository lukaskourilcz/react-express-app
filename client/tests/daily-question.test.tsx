// The public question of the day (#239). Invented question
// fixtures; the wire shapes are the real ones.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import DailyQuestionPage from '../src/components/DailyQuestionPage';
import { en } from '../src/i18n/translations';
import { addDays, qotdTrack, utcToday } from '../../shared/daily-question';
import { server } from './mocks/server';

const analytics = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('../src/lib/analytics', async (importOriginal) => ({ ...(await importOriginal<object>()), capture: analytics.capture }));

const today = utcToday();
const trackName = (date: string) => en[`category.${qotdTrack(date)}` as keyof typeof en];
const QUESTION = {
  date: today,
  track: qotdTrack(today),
  sessionId: 'sealed-session',
  question: { id: 'q-1', question: 'Which value does `typeof null` return?', options: ['"null"', '"object"', '"undefined"', '"number"'], category: qotdTrack(today), difficulty: 2 },
};

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes>
            <Route path="/daily" element={<DailyQuestionPage />} />
            <Route path="/daily/:date" element={<DailyQuestionPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const clipboard = { writeText: vi.fn(async (_text: string) => undefined) };
beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
  clipboard.writeText.mockClear();
  analytics.capture.mockClear();
});

describe('/daily', () => {
  it('shows the day’s question, checks one answer on the server and records nothing', async () => {
    const asked: string[] = [];
    const sent: unknown[] = [];
    server.use(
      http.get('*/api/quiz/daily', ({ request }) => {
        asked.push(new URL(request.url).search);
        return HttpResponse.json(QUESTION);
      }),
      http.post('*/api/quiz/submit', async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({
          totalQuestions: 1, correctAnswers: 1, percentage: 100, questXp: 2,
          results: [{ questionId: 'q-1', selectedIndex: 1, correctAnswer: 1, isCorrect: true, explanation: 'typeof null is "object", a historical quirk.' }],
        });
      }),
    );
    renderAt('/daily');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`${trackName(today)} question of the day`);
    const options = await screen.findAllByRole('radio');
    expect(options).toHaveLength(4);
    expect(asked).toEqual(['?qotd=today']);
    const check = screen.getByRole('button', { name: 'Check answer' });
    expect(check).toBeDisabled();
    fireEvent.click(options[1]);
    fireEvent.click(check);
    expect(await screen.findByText('Right answer')).toBeInTheDocument();
    expect(screen.getByText('typeof null is "object", a historical quirk.')).toBeInTheDocument();
    expect(sent).toEqual([{ sessionId: 'sealed-session', answers: { 'q-1': 1 }, lang: 'en' }]);
    expect(screen.getByRole('radio', { name: /"object", correct answer/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: `Practice ${trackName(today)} questions` })).toHaveAttribute('href', `/quiz?category=${qotdTrack(today)}`);
    expect(screen.getByText(/nothing is recorded/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Share this question' }));
    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/daily/${today}`));
    expect(analytics.capture).toHaveBeenCalledWith('share_initiated', { kind: 'daily_question', source: 'daily', method: 'copy' });
    expect(await screen.findByText('Link copied.')).toBeInTheDocument();
  });

  it('marks a wrong pick in words, not colour alone', async () => {
    server.use(
      http.get('*/api/quiz/daily', () => HttpResponse.json(QUESTION)),
      http.post('*/api/quiz/submit', () => HttpResponse.json({
        totalQuestions: 1, correctAnswers: 0, percentage: 0, questXp: 0,
        results: [{ questionId: 'q-1', selectedIndex: 0, correctAnswer: 1, isCorrect: false, explanation: 'It is "object".' }],
      })),
    );
    renderAt('/daily');
    fireEvent.click((await screen.findAllByRole('radio'))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('Not this one')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /"null", your answer/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /"object", correct answer/ })).toBeInTheDocument();
  });

  it('does not ask the server for a day that has not come yet', () => {
    const tomorrow = addDays(today, 1);
    renderAt(`/daily/${tomorrow}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`${trackName(tomorrow)} question of the day`);
    expect(screen.getByText(/is not out yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Today’s question' })).toHaveAttribute('href', '/daily');
  });

  it('says there is no question for a date that is not one', () => {
    renderAt('/daily/not-a-date');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Question of the day');
    expect(screen.getByText('There is no question of the day for that date.')).toBeInTheDocument();
  });

  // The server seals a fresh session on every read and one check claims it.
  // The old mock answered every read with the same session, so the test
  // passed while a reload that got the claimed session back stayed stuck on
  // the expired banner.
  it.each([
    ['has expired', 'invalid_session', 400],
    ['was already checked', 'attempt_already_graded', 409],
  ])('loads the question again, with a fresh session, when its session %s', async (_, code, status) => {
    const reads: RequestCache[] = [];
    const checkedWith: string[] = [];
    server.use(
      http.get('*/api/quiz/daily', ({ request }) => {
        reads.push(request.cache);
        return HttpResponse.json({ ...QUESTION, sessionId: `sealed-session-${reads.length}` });
      }),
      http.post('*/api/quiz/submit', async ({ request }) => {
        const { sessionId } = await request.json() as { sessionId: string };
        checkedWith.push(sessionId);
        if (sessionId === 'sealed-session-1') return HttpResponse.json({ error: { code, message: 'That session cannot be checked' } }, { status });
        return HttpResponse.json({
          totalQuestions: 1, correctAnswers: 1, percentage: 100,
          results: [{ questionId: 'q-1', selectedIndex: 1, correctAnswer: 1, isCorrect: true, explanation: '`typeof null` is "object", a quirk kept for compatibility.' }],
        });
      }),
    );
    renderAt('/daily');
    fireEvent.click((await screen.findAllByRole('radio'))[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load it again' }));
    // The question is back, unanswered, and checks against the new session.
    fireEvent.click((await screen.findAllByRole('radio'))[1]);
    expect(screen.queryByRole('button', { name: 'Load it again' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('Right answer')).toBeInTheDocument();
    expect(checkedWith).toEqual(['sealed-session-1', 'sealed-session-2']);
    // Each read goes to the server, never to a response the browser kept.
    expect(reads).toEqual(['no-store', 'no-store']);
  });

  it('starts the question over even if a reload brings back the same session', async () => {
    // What a browser that still holds a cached response hands back.
    let reads = 0;
    server.use(
      http.get('*/api/quiz/daily', () => { reads++; return HttpResponse.json(QUESTION); }),
      http.post('*/api/quiz/submit', () => HttpResponse.json({ error: { code: 'attempt_already_graded', message: 'already graded' } }, { status: 409 })),
    );
    renderAt('/daily');
    fireEvent.click((await screen.findAllByRole('radio'))[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load it again' }));
    await waitFor(() => expect(reads).toBe(2));
    expect(await screen.findByRole('button', { name: 'Check answer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load it again' })).toBeNull();
  });

  it('shows an alert with Retry when the question cannot load', async () => {
    let reads = 0;
    server.use(http.get('*/api/quiz/daily', () => { reads++; return HttpResponse.json({ error: { code: 'db_error', message: 'x' } }, { status: 500 }); }));
    renderAt('/daily');
    // One quiet retry for a server error, then the alert.
    expect(await screen.findByText('The question could not load. Try again in a moment.', undefined, { timeout: 5000 })).toBeInTheDocument();
    const before = reads;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(reads).toBeGreaterThan(before));
  });
});
