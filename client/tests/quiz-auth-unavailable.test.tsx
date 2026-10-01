// A signed-in learner whose sign-in cannot be read when they submit
// (lib/api.ts): the submit is not sent as a guest's, the quiz says why, and
// Submit sends the same answers again, signed in, once the session is back.
// Invented question fixtures; the wire shapes are the real ones from
// api/quiz/questions, submit and api/user/stats.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { queryClient } from '../src/lib/queryClient';
import { DEFAULT_CONFIG } from '../src/lib/gameConfig';
import { server } from './mocks/server';

vi.setConfig({ testTimeout: 30_000 });

const LEARNER = { id: 'user-quiz-auth-0001', email: 'learner@example.test', user_metadata: {} };

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuth: () => ({ user: LEARNER, isAuthenticated: true, isLoading: false, signInWithGoogle: async () => {}, signOut: async () => {}, signInResumeFailed: false }),
}));
vi.mock('../src/components/LoadingScreen', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  holdLoadingScreen: () => Promise.resolve(),
}));
// The session stored in this browser, and what reading it answers: nothing
// while the refresh is failing offline, the token once it is back.
const session = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../src/lib/supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  mayHaveSession: () => true,
  hasStoredSession: () => true,
  getSupabaseSession: async () => (session.token ? { access_token: session.token } : null),
}));

import Quiz from '../src/components/Quiz';

const Q = (id: string) => ({
  id, introduction: '', question: `Question ${id}?`, options: [`alpha ${id}`, `beta ${id}`, `gamma ${id}`, `delta ${id}`],
  category: 'javascript', difficulty: 2,
});
const SESSION = 'v2.aaaaaaaaaaaaaaaa.bbbbbbbbbbbb.authunavailable0000000';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  queryClient.clear();
  localStorage.setItem('devquiz:quiz-setup:v1', JSON.stringify({ count: 10, difficulty: 'mixed', categories: ['javascript'] }));
  session.token = 'learner-token';
  server.use(
    http.get('*/api/settings', () => HttpResponse.json(DEFAULT_CONFIG)),
    http.get('*/api/user/xp', () => HttpResponse.json({ data: { quest_xp: 6, by_subject: { webdev: 6 } } })),
    http.post(/\/api\/user\/(stats|\[op\])/, () => HttpResponse.json({ data: null, xp: null, applied: true, questXp: 6 })),
    http.get('*/api/quiz/questions', () => HttpResponse.json({ sessionId: SESSION, expiresAt: Date.now() + 3_600_000, questions: [Q('a')] })),
  );
});

describe('a submit whose sign-in cannot be read', () => {
  it('is not sent, says why, and Submit sends it again signed in', async () => {
    const sent: (string | null)[] = [];
    server.use(http.post('*/api/quiz/submit', ({ request }) => {
      sent.push(request.headers.get('authorization'));
      return HttpResponse.json({
        totalQuestions: 1, correctAnswers: 1, percentage: 100, questXp: 6, resultReceipt: 'receipt-auth-unavailable',
        results: [{ questionId: 'a', selectedIndex: 0, correctAnswer: 0, isCorrect: true, explanation: 'Why a' }],
      });
    }));
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/quiz']}>
          <LanguageProvider><Quiz /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /start quiz/i }));
    await screen.findByText('Question a?');
    fireEvent.click(screen.getAllByRole('radio').filter((radio) => radio.closest('fieldset'))[0]);

    session.token = null;
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    expect(await screen.findByText('We couldn’t confirm your sign-in, so nothing was saved. Check your connection and try again.')).toBeInTheDocument();
    expect(sent).toEqual([]);

    session.token = 'learner-token';
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    await screen.findByText('1 / 1');
    expect(sent).toEqual(['Bearer learner-token']);
  });
});
