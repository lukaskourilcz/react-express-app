import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { onXpToast, type XpToast } from '../src/lib/xp';

// The Biggest Shark Challenge against a small stand-in for the three endpoints
// it calls: the batch (GET /api/quiz/challenge), grading (POST
// /api/quiz/submit, which refuses a question outside the given session, as
// api/quiz/submit.ts does) and the run completion.

type Body = { sessionId: string; answers: Record<string, number> };
type Grade = (body: Body, questionId: string, selected: number) => { status: number; code?: string; message?: string; json?: unknown } | null;

const api = vi.hoisted(() => ({
  batchSize: 6,
  batches: 0,
  runs: 0,
  sessions: new Map<string, Set<string>>(),
  batchRequests: [] as URLSearchParams[],
  submits: [] as { sessionId: string; questionId: string; selected: number; status: number }[],
  /** Replaces the default grade for one submit when it returns a response. */
  grade: null as Grade | null,
  completions: [] as { runToken: string; proofs: string[]; status: number }[],
  completeStatus: (_runToken: string): { status: number; code?: string } => ({ status: 200 }),
  auth: { user: null as null | { id: string }, isAuthenticated: false, isLoading: false },
}));

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api')>();
  const fail = (status: number, code: string, message = code) => Promise.reject(new actual.ApiError(message, status, code));
  const apiFetch = async (url: string, opts: RequestInit = {}) => {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.pathname === '/api/quiz/challenge' && (opts.method ?? 'GET') === 'GET') {
      if (parsed.searchParams.get('resource') === 'leaderboard') return { top: [], champion: null };
      api.batchRequests.push(parsed.searchParams);
      api.batches += 1;
      const batch = api.batches;
      const sessionId = `S${batch}`;
      const runToken = parsed.searchParams.get('runToken') ?? `RUN-${++api.runs}`;
      const questions = Array.from({ length: api.batchSize }, (_, i) => ({
        id: `b${batch}-q${i + 1}`,
        question: `Batch ${batch} question ${i + 1}?`,
        options: ['right', 'wrong'],
        category: 'javascript',
        difficulty: 1,
      }));
      api.sessions.set(sessionId, new Set(questions.map((q) => q.id)));
      return { sessionId, runToken, questions };
    }
    if (parsed.pathname === '/api/quiz/submit') {
      const body = JSON.parse(String(opts.body)) as Body;
      const [questionId, selected] = Object.entries(body.answers)[0];
      const override = api.grade?.(body, questionId, selected) ?? null;
      const record = (status: number) => api.submits.push({ sessionId: body.sessionId, questionId, selected, status });
      if (override) {
        record(override.status);
        if (override.status !== 200) return fail(override.status, override.code ?? 'error', override.message);
        return override.json;
      }
      if (!api.sessions.get(body.sessionId)?.has(questionId)) {
        record(400);
        return fail(400, 'bad_request', 'Answers contain a question outside this session');
      }
      record(200);
      const isCorrect = selected === 0;
      const run = body.sessionId.replace(/^S/, 'run');
      return {
        totalQuestions: 1, correctAnswers: isCorrect ? 1 : 0, percentage: 0, questXp: 0,
        results: [{ questionId, selectedIndex: selected, correctAnswer: 0, isCorrect, explanation: 'Because.', scoreProof: `${run}:${questionId}:${isCorrect}` }],
      };
    }
    if (parsed.pathname === '/api/quiz/challenge' && parsed.searchParams.get('resource') === 'complete') {
      const body = JSON.parse(String(opts.body)) as { runToken: string; proofs: string[] };
      const outcome = api.completeStatus(body.runToken);
      api.completions.push({ runToken: body.runToken, proofs: body.proofs, status: outcome.status });
      if (outcome.status !== 200) return fail(outcome.status, outcome.code ?? 'error');
      const score = body.proofs.filter((proof) => proof.endsWith(':true')).length;
      return { ok: true, awarded: score > 0, score, xp: score * 5 };
    }
    if (parsed.pathname === '/api/user/xp') return { data: { quest_xp: 0, by_subject: {} } };
    return fail(404, 'not_found');
  };
  return { ...actual, apiFetch };
});
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/auth')>(),
  useAuth: () => api.auth,
}));
vi.mock('../src/components/LoadingScreen', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/components/LoadingScreen')>(),
  holdLoadingScreen: async () => undefined,
}));

const { default: Challenge } = await import('../src/components/Challenge');

const PENDING = 'studyshark:pending-challenge-reward:v1';

// The page holds its first draw for the board read, so it renders inside act.
async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[{ pathname: '/challenge', key: `v${Math.random()}` }]}>
          <LanguageProvider><Challenge /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return view;
}

const settle = () => act(async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); });

async function start() {
  fireEvent.click(await screen.findByRole('button', { name: 'Start' }));
  await screen.findByText(/^Batch \d+ question \d+\?$/);
}

/** Answer the question on screen and wait for its grade. */
async function answer(option: 'right' | 'wrong') {
  fireEvent.click(screen.getByRole('radio', { name: option }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByRole('button', { name: /Next question|See result/ });
}

async function next() {
  fireEvent.click(screen.getByRole('button', { name: /Next question|See result/ }));
  await settle();
}

const shownQuestion = () => screen.getByText(/^Batch \d+ question \d+\?$/).textContent;

beforeEach(() => {
  api.batchSize = 6;
  api.batches = 0;
  api.runs = 0;
  api.sessions.clear();
  api.batchRequests.length = 0;
  api.submits.length = 0;
  api.grade = null;
  api.completions.length = 0;
  api.completeStatus = () => ({ status: 200 });
  api.auth = { user: null, isAuthenticated: false, isLoading: false };
});
afterEach(() => vi.useRealTimers());

describe('the question buffer', () => {
  it('grades a question shown while the buffer refills against the batch that issued it', async () => {
    await mount();
    await start();
    for (let n = 0; n < 10; n += 1) {
      await answer('right');
      await next();
    }
    expect(api.batches).toBeGreaterThanOrEqual(2);
    expect(api.submits.filter((submit) => submit.status !== 200)).toEqual([]);
    for (const submit of api.submits) {
      expect(api.sessions.get(submit.sessionId)?.has(submit.questionId), `${submit.questionId} went to ${submit.sessionId}`).toBe(true);
    }
    // Batch one's questions were still answered after batch two arrived.
    expect(api.submits.map((submit) => submit.questionId)).toEqual(expect.arrayContaining(['b1-q6', 'b2-q1']));
    // The refill asked to skip what was seen and what was still queued.
    expect(api.batchRequests[1].get('exclude')?.split(',').sort()).toEqual(['b1-q1', 'b1-q2', 'b1-q3', 'b1-q4', 'b1-q5', 'b1-q6']);
    expect(screen.getByLabelText('3 shark fins left')).toBeInTheDocument();
  });

  it('lets a question whose batch session expired go without a strike, and moves on to a fresh batch', async () => {
    await mount();
    await start();
    api.grade = (body) => (body.sessionId === 'S1' ? { status: 400, code: 'invalid_session', message: 'Quiz session expired or invalid' } : null);
    await answer('wrong');
    expect(screen.getByText('This question expired before your answer was checked, so it does not count.')).toBeInTheDocument();
    expect(screen.getByLabelText('3 shark fins left')).toBeInTheDocument();
    await next();
    await screen.findByText('Batch 2 question 1?');
    expect(api.batchRequests[1].get('runToken')).toBe('RUN-1');
    await answer('right');
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(api.submits[api.submits.length - 1]).toMatchObject({ sessionId: 'S2', questionId: 'b2-q1', status: 200 });
  });

  it('lets a question retired mid-run go without a strike or a proof', async () => {
    api.auth = { user: { id: 'learner-1' }, isAuthenticated: true, isLoading: false };
    await mount();
    await start();
    api.grade = (_body, questionId) => (questionId === 'b1-q1'
      ? { status: 200, json: { totalQuestions: 0, correctAnswers: 0, percentage: 0, questXp: 0, results: [], voided: [questionId] } }
      : null);
    await answer('wrong');
    expect(screen.getByText('This question was retired while you were answering, so it does not count.')).toBeInTheDocument();
    expect(screen.getByLabelText('3 shark fins left')).toBeInTheDocument();
    await next();
    for (let strike = 0; strike < 3; strike += 1) {
      await answer('wrong');
      await next();
    }
    await screen.findByText('Run ended');
    // Three proven strikes: the run completes.
    await waitFor(() => expect(api.completions).toHaveLength(1));
    expect(api.completions[0].status).toBe(200);
    expect(api.completions[0].proofs).toHaveLength(3);
  });
});

describe('the timeout strike', () => {
  it('is sent once when the clock runs out, and again only after a growing pause', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let refuse = true;
    let timeouts = 0;
    api.grade = (body) => {
      if (Object.values(body.answers)[0] !== -1) return null;
      timeouts += 1;
      // A bound on the stand-in, so a client that loops ends the loop.
      return refuse && timeouts <= 50 ? { status: 429, code: 'rate_limited', message: 'Too many requests. Try again shortly.' } : null;
    };
    await mount();
    await start();
    const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    for (let second = 0; second < 90; second += 1) await tick(1000);
    await settle();
    expect(timeouts).toBe(1);
    expect(screen.getByText('Time ran out. The strike could not be saved yet and will be sent again in a moment.')).toBeInTheDocument();
    // Nothing can be picked or sent once the clock is out.
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'right' })).toBeDisabled();

    // Retries wait 2 s, then 4 s, then 8 s.
    await tick(1500);
    expect(timeouts).toBe(1);
    await tick(1000);
    expect(timeouts).toBe(2);
    await tick(2500);
    expect(timeouts).toBe(2);
    await tick(1500);
    expect(timeouts).toBe(3);

    refuse = false;
    await tick(9000);
    await settle();
    expect(timeouts).toBe(4);
    expect(screen.getByText('Time ran out. One strike.')).toBeInTheDocument();
    expect(screen.getByLabelText('2 shark fins left')).toBeInTheDocument();
    await tick(60_000);
    expect(timeouts).toBe(4);
  });
});

describe('the run reward', () => {
  async function strikeOut(correctFirst = 0) {
    for (let n = 0; n < correctFirst; n += 1) {
      await answer('right');
      await next();
    }
    for (let strike = 0; strike < 3; strike += 1) {
      await answer('wrong');
      await next();
    }
    await screen.findByText('Run ended');
    await settle();
  }

  it('keeps a run whose completion failed and sends it again at the next game over', async () => {
    api.auth = { user: { id: 'learner-1' }, isAuthenticated: true, isLoading: false };
    api.completeStatus = (runToken) => (runToken === 'RUN-1' && api.completions.length === 0 ? { status: 429, code: 'rate_limited' } : { status: 200 });
    await mount();
    await start();
    await strikeOut();
    expect(JSON.parse(localStorage.getItem(PENDING) ?? '[]')).toEqual([expect.objectContaining({ runToken: 'RUN-1' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await screen.findByText(/^Batch \d+ question \d+\?$/);
    await strikeOut();
    await waitFor(() => expect(localStorage.getItem(PENDING)).toBeNull());
    expect(api.completions.map(({ runToken, status }) => [runToken, status])).toEqual([['RUN-1', 429], ['RUN-1', 200], ['RUN-2', 200]]);
  });

  it('drops a saved run the server can never credit, and keeps one it only turned away for now', async () => {
    api.auth = { user: { id: 'learner-1' }, isAuthenticated: true, isLoading: false };
    // The first version stored one run, not a list.
    localStorage.setItem(PENDING, JSON.stringify({ userId: 'learner-1', runToken: 'EXPIRED', proofs: [] }));
    api.completeStatus = (runToken) => (runToken === 'EXPIRED' ? { status: 400, code: 'invalid_run' } : { status: 200 });
    const first = await mount();
    await waitFor(() => expect(localStorage.getItem(PENDING)).toBeNull());
    expect(api.completions.map((one) => one.runToken)).toEqual(['EXPIRED']);
    first.unmount();

    localStorage.setItem(PENDING, JSON.stringify([{ userId: 'learner-1', runToken: 'OFFLINE', proofs: [] }]));
    api.completeStatus = () => ({ status: 503, code: 'backend_unavailable' });
    await mount();
    await waitFor(() => expect(api.completions.map((one) => one.runToken)).toEqual(['EXPIRED', 'OFFLINE']));
    await settle();
    expect(JSON.parse(localStorage.getItem(PENDING) ?? '[]')).toEqual([expect.objectContaining({ runToken: 'OFFLINE' })]);
  });

  it('announces the XP the server credited to a signed-in learner, and counts the same amount signed out', async () => {
    const gains: number[] = [];
    const stop = onXpToast((toast: XpToast) => { if (toast.kind === 'gain') gains.push(toast.amount); });
    try {
      api.auth = { user: { id: 'learner-1' }, isAuthenticated: true, isLoading: false };
      const first = await mount();
      await start();
      await strikeOut(2);
      await waitFor(() => expect(gains).toEqual([10]));
      expect(api.completions).toHaveLength(1);
      first.unmount();

      api.auth = { user: null, isAuthenticated: false, isLoading: false };
      await mount();
      await start();
      await strikeOut(2);
      expect(gains).toEqual([10, 10]);
      expect(api.completions).toHaveLength(1);
    } finally {
      stop();
    }
  });

  it('calls the board what it is: all-time top scores', async () => {
    await mount();
    expect(await screen.findByRole('heading', { name: 'Top scores' })).toBeInTheDocument();
    expect(screen.queryByText(/today/i)).toBeNull();
  });
});
