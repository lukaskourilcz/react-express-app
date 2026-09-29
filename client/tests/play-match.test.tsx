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
  fetchDistribution: vi.fn(),
  controlMatch: vi.fn(),
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
const live = vi.hoisted(() => ({
  listeners: new Map<string, (payload?: unknown) => void>(),
  sent: [] as Array<{ event: string; payload: unknown }>,
}));
vi.mock('../src/lib/realtime', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/realtime')>(),
  joinMatchChannel: () => ({
    send: async (event: string, payload: unknown) => { live.sent.push({ event, payload }); },
    subscribe: (event: string, fn: (payload?: unknown) => void) => {
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
  live.sent.length = 0;
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

describe('the classroom presenter screen', () => {
  // The teacher's screen is often projected while the class answers, so the
  // answer key stays off it until the question closes or the teacher reveals it.
  const KEYED = [
    { ...QUESTIONS[0], correct_index: 1 },
    { ...QUESTIONS[1], correct_index: 0 },
  ];
  const presenting = (over: Partial<Match> = {}) => {
    const match = running({ mode: 'classroom', host_id: USER.id, questions: KEYED, ...over });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    api.fetchDistribution.mockResolvedValue({ buckets: [{ selected_idx: 0, count: 3 }, { selected_idx: 1, count: 5 }] });
    return match;
  };
  const tone = (name: string) => screen.getByRole('radio', { name }).getAttribute('data-tone');
  const histogramKey = () => document.querySelectorAll('[data-correct]');

  it('keeps an untimed question’s answer hidden until the teacher reveals it', async () => {
    presenting({ question_duration_s: 0 });
    await mount();
    await screen.findByText('Pick one?');
    await waitFor(() => expect(api.fetchDistribution).toHaveBeenCalled());
    // The counts per option are there, with nothing marked correct.
    expect(await screen.findByText('Live answers received: 8/0')).toBeInTheDocument();
    expect(tone('beta')).toBe('default');
    expect(tone('alpha')).toBe('default');
    expect(histogramKey()).toHaveLength(0);
    expect(screen.queryByText(/^Correct answer:/)).toBeNull();
    expect(screen.getByText('The correct answer stays hidden until you reveal it.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
    expect(tone('beta')).toBe('success');
    expect(tone('alpha')).toBe('default');
    expect(histogramKey()).toHaveLength(1);
    expect(histogramKey()[0]).toHaveTextContent('B');
    expect(screen.getByText('Correct answer: B. beta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal answer' })).toBeNull();
  });

  it('shows a timed question’s answer once the server stops taking answers, without the button', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    presenting({ question_started_at: new Date(Date.now() - 28_000).toISOString(), question_duration_s: 30 });
    await mount();
    await screen.findByText('Pick one?');
    expect(tone('beta')).toBe('default');
    expect(histogramKey()).toHaveLength(0);
    expect(screen.getByText('The correct answer stays hidden until time is up or you reveal it.')).toBeInTheDocument();

    // The clock is out, but an answer sent on the buzzer still counts for
    // two more seconds: the key stays off the projector until then.
    await act(async () => { await vi.advanceTimersByTimeAsync(2_500); });
    expect(screen.getByRole('timer')).toHaveTextContent('0s');
    expect(tone('beta')).toBe('default');
    expect(histogramKey()).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(tone('beta')).toBe('success');
    expect(histogramKey()).toHaveLength(1);
    expect(screen.getByText('Correct answer: B. beta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal answer' })).toBeNull();
  });

  it('hides the key again when the next question opens', async () => {
    const match = presenting({ question_duration_s: 0 });
    await mount();
    await screen.findByText('Pick one?');
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
    expect(tone('beta')).toBe('success');

    api.fetchMatchState.mockResolvedValue(stateOf({ ...match, current_index: 1, question_started_at: new Date().toISOString() }));
    await act(async () => { live.listeners.get('match_updated')!(); });
    await screen.findByText('Next one?');
    expect(tone('gamma')).toBe('default');
    expect(histogramKey()).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeInTheDocument();
  });

  it('never gives a player the key or the button', async () => {
    const match = running({ mode: 'classroom', questions: QUESTIONS });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    await screen.findByText('Pick one?');
    expect(screen.queryByRole('button', { name: 'Reveal answer' })).toBeNull();
    expect(api.fetchDistribution).not.toHaveBeenCalled();
  });
});

const KEYED_QUESTIONS = [
  { ...QUESTIONS[0], correct_index: 1 },
  { ...QUESTIONS[1], correct_index: 0 },
];
const reads = () => api.fetchMatchState.mock.calls.length;
// What this client broadcast, apart from the hello every client sends when
// its channel connects.
const roomEvents = () => live.sent.filter((one) => one.event !== 'participant_joined');
const fire = (event: string, payload?: unknown) => act(async () => { live.listeners.get(event)!(payload); });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('what a room broadcasts', () => {
  // A class of thirty used to send one broadcast per answer, and every
  // client read the room for each one: about 960 reads a question from one
  // school address. Only a change of question or phase is broadcast now,
  // with the state it changed to.

  it('tells only the host about an answer that leaves the room where it was', async () => {
    const match = running();
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    api.submitMatchAnswer.mockResolvedValue({ ok: true, is_correct: true, advanced: false });
    await mount();
    await screen.findByText('Pick one?');
    const before = reads();
    fireEvent.click(screen.getByRole('radio', { name: 'beta' }));
    await waitFor(() => expect(roomEvents()).toEqual([{ event: 'answered', payload: { question_idx: 0 } }]));
    await settle();
    expect(reads()).toBe(before);
  });

  it('announces the next question when an answer moves the room on, and the end after the last one', async () => {
    const match = running();
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValueOnce(stateOf(match)).mockResolvedValue(stateOf({ ...match, current_index: 1 }));
    api.submitMatchAnswer.mockResolvedValue({ ok: true, is_correct: true, advanced: true });
    await mount();
    await screen.findByText('Pick one?');
    fireEvent.click(screen.getByRole('radio', { name: 'beta' }));
    await screen.findByText('Next one?');
    expect(roomEvents()).toEqual([{ event: 'match_updated', payload: { status: 'running', current_index: 1 } }]);

    api.fetchMatchState.mockResolvedValue(stateOf({ ...match, status: 'finished', current_index: 1 }));
    fireEvent.click(screen.getByRole('radio', { name: 'delta' }));
    expect(await screen.findByRole('heading', { name: 'Match complete' })).toBeInTheDocument();
    expect(roomEvents()[1]).toEqual({ event: 'match_updated', payload: { status: 'finished', current_index: 1 } });
  });

  it('reads for a broadcast of a new question, and not for the one on screen or one already read', async () => {
    const match = running();
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    await screen.findByText('Pick one?');
    const before = reads();
    await fire('match_updated', { status: 'running', current_index: 0 });
    await settle();
    expect(reads()).toBe(before);

    api.fetchMatchState.mockResolvedValue(stateOf({ ...match, current_index: 1 }));
    await fire('match_updated', { status: 'running', current_index: 1 });
    await screen.findByText('Next one?');
    expect(reads()).toBe(before + 1);
    // The same change from a second sender.
    await fire('match_updated', { status: 'running', current_index: 1 });
    await settle();
    expect(reads()).toBe(before + 1);
  });

  it('lets the host read the room once for a burst of answers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const match = running({ host_id: USER.id });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    await screen.findByText('Pick one?');
    const before = reads();
    for (let i = 0; i < 12; i += 1) await fire('answered', { question_idx: 0 });
    expect(reads()).toBe(before);
    await tick(1_600);
    expect(reads()).toBe(before + 1);
    await tick(5_000);
    expect(reads()).toBe(before + 1);
  });

  it('leaves a player alone when someone else answers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const match = running();
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    await screen.findByText('Pick one?');
    const before = reads();
    for (let i = 0; i < 12; i += 1) await fire('answered', { question_idx: 0 });
    await tick(5_000);
    expect(reads()).toBe(before);
  });

  it('has the host announce a change of question that their own read found', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // An untimed multiplayer round whose last two answers raced: neither
    // answer moved the room on, and the host's read after them did.
    const match = running({ host_id: USER.id });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValueOnce(stateOf(match)).mockResolvedValue(stateOf({ ...match, current_index: 1 }));
    await mount();
    await screen.findByText('Pick one?');
    await fire('answered', { question_idx: 0 });
    await tick(1_600);
    await screen.findByText('Next one?');
    expect(roomEvents()).toEqual([{ event: 'match_updated', payload: { status: 'running', current_index: 1 } }]);
  });

  it('keeps a player quiet about a change their read found', async () => {
    const match = running();
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValueOnce(stateOf(match)).mockResolvedValue(stateOf({ ...match, current_index: 1 }));
    await mount();
    await screen.findByText('Pick one?');
    // A broadcast from a tab on the build before broadcasts carried the room.
    await fire('match_updated', { at: Date.now() });
    await screen.findByText('Next one?');
    expect(roomEvents()).toEqual([]);
  });

  it('announces the presenter’s next question and shows it', async () => {
    const match = running({ mode: 'classroom', host_id: USER.id, questions: KEYED_QUESTIONS });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValueOnce(stateOf(match)).mockResolvedValue(stateOf({ ...match, current_index: 1 }));
    api.fetchDistribution.mockResolvedValue({ buckets: [] });
    api.controlMatch.mockResolvedValue({ ok: true, status: 'running', current_index: 1 });
    await mount();
    await screen.findByText('Pick one?');
    fireEvent.click(screen.getByRole('button', { name: 'Next question →' }));
    await screen.findByText('Next one?');
    expect(api.controlMatch).toHaveBeenCalledWith(expect.objectContaining({ action: 'advance' }));
    expect(roomEvents()).toEqual([{ event: 'match_updated', payload: { status: 'running', current_index: 1 } }]);
  });
});

describe('the room clock', () => {
  // A device clock 31 s ahead of the server's. The server says what its clock
  // reads in every join and state response.
  const SKEW = 31_000;
  const serverClock = () => new Date(Date.now() - SKEW).toISOString();
  function openedOnServer(over: Partial<Match>) {
    const serverNow = Date.now();
    vi.useFakeTimers({ shouldAdvanceTime: true, now: serverNow + SKEW });
    const match = running({ question_started_at: new Date(serverNow).toISOString(), question_duration_s: 30, ...over });
    api.joinMatch.mockImplementation(async () => ({ ...match, server_now: serverClock() }));
    api.fetchMatchState.mockImplementation(async () => ({ ...stateOf(match), server_now: serverClock() }));
    api.fetchDistribution.mockResolvedValue({ buckets: [] });
    return match;
  }
  const tone = (name: string) => screen.getByRole('radio', { name }).getAttribute('data-tone');

  it('keeps the key off a projector whose clock runs fast until the question closes', async () => {
    openedOnServer({ mode: 'classroom', host_id: USER.id, questions: KEYED_QUESTIONS });
    await mount();
    await screen.findByText('Pick one?');
    expect(screen.getByRole('timer')).toHaveTextContent('30s');
    expect(tone('beta')).toBe('default');
    await tick(31_000);
    expect(tone('beta')).toBe('default');
    await tick(2_000);
    expect(tone('beta')).toBe('success');
  });

  it('lets a player whose phone runs fast answer a question that just opened', async () => {
    openedOnServer({});
    api.submitMatchAnswer.mockResolvedValue({ ok: true, is_correct: true, advanced: false });
    await mount();
    await screen.findByText('Pick one?');
    expect(screen.getByRole('timer')).toHaveTextContent('30s');
    expect(screen.queryByText('Time is up for this question.')).toBeNull();
    expect(screen.getByRole('radio', { name: 'beta' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'beta' }));
    await waitFor(() => expect(api.submitMatchAnswer).toHaveBeenCalledTimes(1));
  });

  it('reads the room when the server’s clock runs out, not the phone’s', async () => {
    openedOnServer({});
    await mount();
    await screen.findByText('Pick one?');
    const before = reads();
    await tick(20_000);
    expect(reads()).toBe(before);
    await tick(13_000);
    expect(reads()).toBe(before + 2); // the 30 s healing poll and the expiry read
  });
});

describe('the questions a player holds', () => {
  // A player receives only the questions already shown; `question_count`
  // says how long the round is.
  it('counts the round from question_count', async () => {
    const match = running({ questions: [QUESTIONS[0]], question_count: 5 });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    expect(await screen.findByText('Question 1 of 5 · JavaScript · difficulty 1')).toBeInTheDocument();
  });

  it('offers a competing host a skip, not the results, on the first of five', async () => {
    const match = running({ host_id: USER.id, questions: [QUESTIONS[0]], question_count: 5 });
    api.joinMatch.mockResolvedValue(match);
    api.fetchMatchState.mockResolvedValue(stateOf(match));
    await mount();
    expect(await screen.findByRole('button', { name: 'Skip question →' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show results' })).toBeNull();
  });

  it('names the round’s length on the lobby’s start button', async () => {
    const lobby = running({ status: 'lobby', started_at: null, host_id: USER.id, questions: [], question_count: 10 });
    api.joinMatch.mockResolvedValue(lobby);
    api.fetchMatchState.mockResolvedValue(stateOf(lobby));
    await mount();
    expect(await screen.findByRole('button', { name: 'Start (10 questions)' })).toBeInTheDocument();
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
