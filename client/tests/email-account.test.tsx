// An account made with an email and password has no name and no picture from
// Google (owner decision 3). The Profile, Friends and the boards draw it
// without either: the Profile heading falls back to the address's first
// part, the boards say "Learner" even with the name switch on, and the
// address never reaches a board.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { getUserProfile } from '../src/lib/auth';
import Profile from '../src/components/Profile';
import Leaderboard from '../src/components/Leaderboard';
import { server } from './mocks/server';
import { emailUser } from './mocks/gotrue';
import { leaderboardHandlers, settingsHandler, visibilityHandler } from './mocks/handlers';

const USER = emailUser({ email: 'ada.lovelace@example.com' });
const auth = vi.hoisted(() => ({ value: { user: null as unknown, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ ...auth.value, signOut: async () => undefined, signInResumeFailed: false, passwordRecovery: false }),
}));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

// What the API answers this account, in the handlers' own shapes. The stats
// row has no name and no picture: `verifiedProfile` in api/user/[op].ts reads
// them from a Google identity, and this account has none.
const STATS = {
  id: 'stats-1', user_id: USER.id, email: USER.email, name: null, picture: null,
  total_quizzes: 3, total_correct: 21, total_questions: 30, current_streak: 2, longest_streak: 4,
  last_quiz_date: '2026-09-30', created_at: '2026-09-28T10:00:00Z', updated_at: '2026-09-30T10:00:00Z',
};
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const NOT_CONNECTED = { available: true, status: 'not_connected', accountLogin: null, repoFullName: null, defaultBranch: null, lastCommitAt: null, queued: 0, lastError: null };
const FRIENDS = {
  friends: [{ handle: 'grace_h', picture: null, country: 'GB', crown: false, currentStreak: 5, longestStreak: 9, totalCorrect: 140, totalQuestions: 180, accuracyPct: 78, activeToday: true }],
  requests: [],
};

function serveAccount(visible: boolean) {
  server.use(
    settingsHandler,
    visibilityHandler(visible),
    http.get('*/api/user/stats', () => HttpResponse.json({ data: STATS })),
    http.get('*/api/user/xp', () => HttpResponse.json({ data: { quest_xp: 0, by_subject: {} } })),
    http.get('*/api/user/freezes', () => HttpResponse.json({
      remaining: 2, period: '2026-10', used: [], shieldUntil: null, shieldDays: [], shieldSupported: true,
    })),
    http.get('*/api/user/advisor', () => HttpResponse.json({ weakAreas: [], suggestedWeek: [], generatedAt: '2026-10-01T09:00:00Z' })),
    http.get('*/api/user/friends-handle', () => HttpResponse.json({ handle: 'ada_l', discoverable: true, country: null, canChangeAt: null })),
    http.get('*/api/user/friends-list', () => HttpResponse.json(FRIENDS)),
    http.get('*/api/quiz/roadmap', ({ request }) => {
      const resource = new URL(request.url).searchParams.get('resource');
      if (resource === 'progress') return HttpResponse.json({ data: {}, extra: { unlocked: [] } });
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      return undefined;
    }),
    http.get('*/api/user/*', ({ request }) => {
      const op = new URL(request.url).searchParams.get('op');
      if (op === 'entitlement') return HttpResponse.json(FREE);
      if (op === 'github-connection') return HttpResponse.json(NOT_CONNECTED);
      if (op === 'learning-path-enrollment') return HttpResponse.json({ enrollments: [] });
      return undefined;
    }),
  );
}

let visits = 0;
function mount(path: string, node: ReactNode) {
  auth.value = { user: USER, isAuthenticated: true, isLoading: false };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, key: `visit-${++visits}` }]}>
        <LanguageProvider>{node}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

describe('an account made with an email and password', () => {
  it('has no name or picture to show', () => {
    expect(getUserProfile(USER as never)).toEqual({ name: undefined, email: 'ada.lovelace@example.com', picture: undefined });
  });

  it('gets a Profile heading from the address, and its Friends tab draws', async () => {
    serveAccount(false);
    await mount('/profile', <Profile />);
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('ada.lovelace');
    expect(screen.getByText('ada.lovelace@example.com')).toBeInTheDocument();
    // No picture: the avatar draws the initial instead of an image.
    expect(document.querySelector('img[src*="googleusercontent"]')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Friends' }));
    // A friend's row names them by handle, never by a Google name.
    expect(await screen.findByRole('button', { name: /grace_h/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('ada_l')).toBeInTheDocument();
  });

  it('stays “Learner” on the boards, even with the name switch on, and its address never shows', async () => {
    serveAccount(true);
    server.use(leaderboardHandlers.pinned);
    await mount('/leaderboard', <Leaderboard />);
    const pinned = (await screen.findByRole('table')).querySelector('tfoot tr') as HTMLElement;
    expect(within(pinned).getByText('Learner')).toBeVisible();
    expect(within(pinned).getByText('You')).toBeVisible();
    expect(within(pinned).queryByRole('img')).toBeNull();
    expect(document.body).not.toHaveTextContent(/ada\.lovelace|@example\.com/);
  });
});
