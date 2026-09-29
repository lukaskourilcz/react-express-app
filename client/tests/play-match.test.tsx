import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ApiError } from '../src/lib/api';
import { DEFAULT_CONFIG, GAME_CONFIG_KEY } from '../src/lib/gameConfig';
import type { Match, ScoreboardEntry } from '../src/lib/play';

// A live room as one player sees it, with the play API and the Realtime
// channel replaced by stand-ins the test drives.

const api = vi.hoisted(() => ({
  joinMatch: vi.fn(),
  fetchMatchState: vi.fn(),
  submitMatchAnswer: vi.fn(),
  sendHeartbeat: vi.fn(async () => ({ ok: true })),
  createMatch: vi.fn(),
}));
vi.mock('../src/lib/play', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/play')>(),
  ...api,
}));
const USER = { id: 'player-1', user_metadata: {} };
vi.mock('../src/lib/auth', () => ({
  useAuth: () => ({ user: USER, isAuthenticated: true, isLoading: false, signInWithGoogle: vi.fn() }),
  getUserProfile: () => ({}),
  displayNameFromProfile: (_profile: unknown, fallback: string) => fallback,
}));
const live = vi.hoisted(() => ({ listeners: new Map<string, () => void>() }));
vi.mock('../src/lib/realtime', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/realtime')>(),
  joinMatchChannel: () => ({
    send: async () => undefined,
    subscribe: (event: string, fn: () => void) => {
      live.listeners.set(event, fn);
      return () => undefined;
    },
    // Realtime is connected for the whole test.
    onStatus: (fn: (status: string) => void) => {
      fn('SUBSCRIBED');
      return () => undefined;
    },
    unsubscribe: () => undefined,
  }),
}));

const { PlayMatch, PlayLanding } = await import('../src/components/Play');

const QUESTIONS = [
  { id: 'q0', question: 'Pick one?', options: ['alpha', 'beta'], category: 'javascript', difficulty: 1 },
  { id: 'q1', question: 'Next one?', options: ['gamma', 'delta'], category: 'javascript', difficulty: 1 },
];
const running = (over: Partial<Match> = {}): Match => ({
  id: 'm1', code: 'ABC123', mode: 'multiplayer', host_id: 'host-1', host_name: 'Hana', status: 'running',
  current_index: 0, questions: QUESTIONS, question_started_at: new Date().toISOString(), question_duration_s: 0,
  started_at: new Date().toISOString(), ...over,
});
const stateOf = (match: Match, scoreboard: ScoreboardEntry[] = []) => ({ match, participants: [], scoreboard });

async function mount(path = '/play/ABC123', multiplayerOn = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  client.setQueryData(GAME_CONFIG_KEY, { ...DEFAULT_CONFIG, features: { ...DEFAULT_CONFIG.features, multiplayer: multiplayerOn } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <LanguageProvider>
            <Routes>
              <Route path="/play" element={<PlayLanding />} />
              <Route path="/play/:code" element={<PlayMatch />} />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

const settle = () => act(async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); });

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.sendHeartbeat.mockResolvedValue({ ok: true });
  live.listeners.clear();
});
afterEach(() => vi.useRealTimers());

describe('a timed question', () => {
  it('closes its options at 0 s and reads the room once just after the clock runs out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // A 30 s question with 2 s left when the page opens.
    const match = running({ question_started_at: new Date(Date.now() - 28_000).toISOString(), question_duration_s: 30 });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    await screen.findByText('Pick one?');
    const readsAtMount = api.fetchMatchState.mock.calls.length;
    const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

    await tick(2_500);
    expect(screen.getByRole('radio', { name: 'beta' })).toBeDisabled();
    expect(screen.getByText('Time is up for this question.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'beta' }));
    expect(api.submitMatchAnswer).not.toHaveBeenCalled();

    await tick(2_500);
    expect(api.fetchMatchState.mock.calls.length).toBe(readsAtMount + 1);
    await tick(15_000);
    expect(api.fetchMatchState.mock.calls.length).toBe(readsAtMount + 1);
  });

  it('says a refused late answer did not count and reads the room again', async () => {
    const match = running({ question_duration_s: 30 });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    api.submitMatchAnswer.mockRejectedValue(new ApiError('Time ran out for this question', 409, 'time_up'));
    await mount();
    await screen.findByText('Pick one?');
    const reads = api.fetchMatchState.mock.calls.length;
    fireEvent.click(screen.getByRole('radio', { name: 'beta' }));
    expect(await screen.findByText('Time ran out before your answer landed — it didn’t count.')).toBeInTheDocument();
    await waitFor(() => expect(api.fetchMatchState.mock.calls.length).toBe(reads + 1));
  });
});

describe('recovery', () => {
  it('runs the join again on Try again after a failed join', async () => {
    const match = running();
    api.joinMatch.mockRejectedValueOnce(new ApiError('Failed to fetch', 0, 'network')).mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    api.submitMatchAnswer.mockResolvedValue({ ok: true, is_correct: true, advanced: false });
    await mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByText('Pick one?');
    expect(api.joinMatch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('radio', { name: 'beta' }));
    await waitFor(() => expect(api.submitMatchAnswer).toHaveBeenCalledTimes(1));
  });

  it('shows the results of a room that finished instead of an error', async () => {
    const finished = running({ status: 'finished' });
    api.joinMatch.mockRejectedValue(new ApiError('Match is over', 410, 'finished'));
    api.fetchMatchState.mockResolvedValue(stateOf(finished, [{ user_id: 'player-1', display_name: 'Petr', correct: 1, score: 140, total_ms: 3000 }]));
    await mount();
    expect(await screen.findByRole('heading', { name: 'Match complete' })).toBeInTheDocument();
    expect(screen.getByText('Winner: Petr — 1/2')).toBeInTheDocument();
    expect(screen.queryByText('This match is already over.')).toBeNull();
  });

  it('clears the could-not-refresh warning once a read works again', async () => {
    const match = running();
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValueOnce(stateOf(match));
    await mount();
    await screen.findByText('Pick one?');
    api.fetchMatchState
      .mockRejectedValueOnce(new ApiError('Too many requests', 429, 'rate_limited'))
      .mockRejectedValueOnce(new ApiError('Too many requests', 429, 'rate_limited'))
      .mockRejectedValueOnce(new ApiError('Too many requests', 429, 'rate_limited'))
      .mockResolvedValue(stateOf(match));
    const broadcast = async () => {
      await act(async () => { live.listeners.get('match_updated')!(); });
      await settle();
    };
    for (let i = 0; i < 3; i += 1) await broadcast();
    expect(screen.getByText(/could not refresh/)).toBeInTheDocument();
    await broadcast();
    expect(screen.queryByText(/could not refresh/)).toBeNull();
  });
});

describe('the end of a room', () => {
  it('names no winner when nobody scored', async () => {
    const finished = running({ status: 'finished', mode: 'classroom' });
    api.joinMatch.mockRejectedValue(new ApiError('Match is over', 410, 'finished'));
    api.fetchMatchState.mockResolvedValue(stateOf(finished, [{ user_id: 'player-1', display_name: 'Petr', correct: 0, score: 0, total_ms: 4000 }]));
    await mount();
    expect(await screen.findByRole('heading', { name: 'Match complete' })).toBeInTheDocument();
    expect(screen.queryByText(/^Winner:/)).toBeNull();
    expect(screen.getByText('Petr')).toBeInTheDocument();
  });

  it('says the host left when a lobby closed before it started', async () => {
    const lobby = running({ status: 'lobby', started_at: null });
    api.joinMatch.mockResolvedValue(lobby);
    api.fetchMatchState.mockResolvedValueOnce(stateOf(lobby));
    await mount();
    await screen.findByRole('heading', { name: 'Lobby' });
    api.fetchMatchState.mockResolvedValue(stateOf({ ...lobby, status: 'finished', ended_at: new Date().toISOString() }));
    await act(async () => { live.listeners.get('match_updated')!(); });
    expect(await screen.findByRole('heading', { name: 'The host left' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Match complete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });
});

describe('the Play switch', () => {
  it('shows live games as switched off on every Play page', async () => {
    await mount('/play/ABC123', false);
    expect(screen.getByRole('heading', { name: 'Live games are switched off' })).toBeInTheDocument();
    expect(api.joinMatch).not.toHaveBeenCalled();
  });

  it('shows the landing page as switched off too', async () => {
    await mount('/play', false);
    expect(screen.getByRole('heading', { name: 'Live games are switched off' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create/ })).toBeNull();
  });

  it('follows the server when it says Play is off', async () => {
    api.joinMatch.mockRejectedValue(new ApiError('Live games are switched off', 503, 'feature_disabled'));
    api.fetchMatchState.mockRejectedValue(new ApiError('Live games are switched off', 503, 'feature_disabled'));
    await mount();
    expect(await screen.findByRole('heading', { name: 'Live games are switched off' })).toBeInTheDocument();
  });
});
