import { afterEach, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Leaderboard from '../src/components/Leaderboard';
import { server } from './mocks/server';
import { leaderboardHandlers, leaderboardData, pinnedData } from './mocks/handlers';
import { firstDraw } from './firstDraw';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('../src/lib/auth')>()), useAuth: () => auth.value }));
afterEach(() => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; });

// The screen holds its first render for the default board (lib/routeData.ts);
// a render that suspends has to start inside an awaited act. Each mount is a
// visit of its own, with a key that stays put while the held render is
// retried, so each holds as a first visit does.
let visits = 0;
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/leaderboard', key: `visit-${++visits}` }]}>
        <LanguageProvider><Leaderboard /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

const last = <T,>(items: T[]): T => items[items.length - 1];

/** Records every leaderboard request's query string, answering with the populated fixtures. */
function recordRequests(): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  server.use(http.get('*/api/leaderboard', ({ request }) => {
    const params = new URL(request.url).searchParams;
    seen.push(params);
    const period = params.get('period');
    if (period === '30d') return HttpResponse.json(leaderboardData);
    return HttpResponse.json(period === 'daily'
      ? { period: 'daily', entries: [] }
      : { period, entries: [{ display_name: 'Long-time learner', picture: null, total_correct: 412, total_questions: 520, accuracy_pct: 79 }] });
  }));
  return seen;
}

it('opens on the 30-day board and says what it counts', async () => {
  const seen = recordRequests(); await mount();
  expect(await screen.findByText('Workshop learner')).toBeVisible();
  expect(seen[0].get('period')).toBe('30d');
  expect(seen[0].get('category')).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeVisible();
  expect(screen.getByText(/Learn answers from the last 30 days. Five answers put you on the board./)).toBeVisible();
  // The multi-subject pill is gone.
  expect(screen.queryByText('Web Dev')).toBeNull();
});

it('draws the default board in its first frame instead of a skeleton the board replaces', async () => {
  const seen = recordRequests();
  const drawn = firstDraw('h1', () => ({
    skeleton: document.querySelector('.lb-skeleton') !== null,
    board: screen.queryByText('Workshop learner') !== null,
  }));
  await mount();
  expect(drawn()).toEqual({ skeleton: false, board: true });
  // The hold and the screen share one key, so the board is asked for once.
  expect(seen).toHaveLength(1);
});

it('holds a signed-in learner for the board that carries their own line', async () => {
  auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false };
  const seen: URLSearchParams[] = [];
  server.use(http.get('*/api/leaderboard', ({ request }) => {
    seen.push(new URL(request.url).searchParams);
    return HttpResponse.json(pinnedData);
  }));
  const drawn = firstDraw('h1', () => document.querySelector('tfoot tr[aria-current="true"]') !== null);
  await mount();
  expect(drawn()).toBe(true);
  expect(seen).toHaveLength(1);
  expect(seen[0].get('period')).toBe('30d');
  expect(seen[0].get('me')).toBe('1');
});

it('draws every rank as a number, with a heavier disc for the top three', async () => {
  server.use(leaderboardHandlers.populated); await mount();
  const table = await screen.findByRole('table');
  const [first, second] = within(table).getAllByRole('row').slice(1);
  expect(within(first).getByText('1')).toHaveClass('lb-rank', 'lb-rank--top');
  expect(within(second).getByText('2')).toHaveClass('lb-rank--top');
  expect(within(first).getByText('80%')).toBeVisible();
});

it('keeps the all-time board one click away, and filters it by topic', async () => {
  const seen = recordRequests(); await mount();
  await screen.findByText('Workshop learner');
  fireEvent.click(screen.getByRole('radio', { name: 'All time' }));
  expect(await screen.findByText('Long-time learner')).toBeVisible();
  expect(last(seen).get('period')).toBe('global');
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'css' } });
  await waitFor(() => expect(last(seen).get('period')).toBe('category'));
  expect(last(seen).get('category')).toBe('css');
});

it('filters the 30-day board by topic and hides the filter on Today', async () => {
  const seen = recordRequests(); await mount();
  await screen.findByText('Workshop learner');
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'html' } });
  await waitFor(() => expect(last(seen).get('category')).toBe('html'));
  expect(last(seen).get('period')).toBe('30d');
  fireEvent.click(screen.getByRole('radio', { name: 'Today' }));
  expect(await screen.findByText(/finished today’s daily challenge/)).toBeVisible();
  expect(last(seen).get('period')).toBe('daily');
  expect(screen.queryByLabelText('Topic')).toBeNull();
});

it('pins the learner’s own line below the list when they are outside the top', async () => {
  server.use(leaderboardHandlers.pinned); await mount();
  const table = await screen.findByRole('table');
  const pinned = table.querySelector('tfoot tr');
  expect(pinned).not.toBeNull();
  expect(pinned).toHaveAttribute('aria-current', 'true');
  expect(within(pinned as HTMLElement).getByText('14')).toBeVisible();
  expect(within(pinned as HTMLElement).getAllByText('You').length).toBeGreaterThan(0);
});

it('tells a signed-in learner with no answers in the window how to appear', async () => {
  server.use(leaderboardHandlers.noActivity); await mount();
  expect(await screen.findByText('Answer a few questions to appear here.')).toBeVisible();
});

it('shows an empty board with a real practice action', async () => {
  server.use(leaderboardHandlers.empty); await mount();
  expect(await screen.findByRole('button', { name: /quiz|practice/i })).toBeVisible();
  expect(screen.getByText('Nobody has answered a question in the last 30 days yet.')).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('recovers the actual leaderboard from a server failure through Retry', async () => {
  server.use(leaderboardHandlers.error); await mount();
  expect(await screen.findByRole('alert')).toBeVisible();
  server.use(leaderboardHandlers.populated);
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByText('Workshop learner')).toBeVisible();
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

it('shows the last board it loaded, marked stale, when offline', async () => {
  server.use(leaderboardHandlers.populated);
  const first = await mount();
  await screen.findByText('Workshop learner');
  first.unmount();
  server.use(leaderboardHandlers.offline); await mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(/offline\. This is the board as it was at/);
  expect(screen.getByText('Workshop learner')).toBeVisible();
});

it('shows the cached board when the browser already reports no connection', async () => {
  server.use(leaderboardHandlers.populated);
  const first = await mount();
  await screen.findByText('Workshop learner');
  first.unmount();
  onlineManager.setOnline(false);
  try {
    await mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(/This is the board as it was at/);
    expect(screen.getByText('Workshop learner')).toBeVisible();
  } finally {
    onlineManager.setOnline(true);
  }
});

it('says so when offline with nothing cached', async () => {
  server.use(leaderboardHandlers.offline); await mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(/offline, so the board can’t load/);
});

it('falls back to the all-time board until the 30-day board exists', async () => {
  server.use(leaderboardHandlers.windowMissing); await mount();
  expect(await screen.findByText('Long-time learner')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('The 30-day board isn’t switched on yet');
});
