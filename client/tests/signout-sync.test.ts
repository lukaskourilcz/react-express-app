// A progress sync still in flight when the account signs out
// (lib/roadmap.ts syncProgressWithServer): the account's progress, unlocks and
// balances arrive after clearAccountData and must not be written back into
// the browser for the next person. The response is the real shape of
// GET /api/quiz/roadmap?resource=progress.
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { completeRoadmapAttempt, installProgressSyncFlusher, registerAccessTokenReader, syncProgressWithServer } from '../src/lib/roadmap';
import { clearAccountData } from '../src/lib/accountData';

const PROGRESS = 'devquiz:roadmap:v2';
const UNLOCKS = 'devquiz:roadmap:unlocks:v1';

/** The progress GET, held until the test answers it; each answer is one account's. */
function holdProgress() {
  const waiting: ((body: unknown) => void)[] = [];
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => {
    expect(new URL(request.url).searchParams.get('resource')).toBe('progress');
    return new Promise<Response>((resolve) => {
      waiting.push((body) => resolve(HttpResponse.json(body as Record<string, unknown>)));
    });
  }));
  return {
    answer: async (body: unknown) => {
      await expect.poll(() => waiting.length).toBeGreaterThan(0);
      waiting.shift()!(body);
    },
  };
}

const accountA = {
  data: { html: { levels: { 1: { passed: true, bestPct: 100 }, 2: { passed: true, bestPct: 90 } }, checkpoints: {} } },
  extra: { unlocked: ['css'] },
};
const accountB = {
  data: { javascript: { levels: { 1: { passed: true, bestPct: 80 } }, checkpoints: {} } },
  extra: { unlocked: [] },
};

describe('a progress sync in flight at sign-out', () => {
  it('writes nothing of the account that left', async () => {
    const progress = holdProgress();
    const sync = syncProgressWithServer();
    clearAccountData();
    await progress.answer(accountA);
    await sync;
    expect(localStorage.getItem(PROGRESS)).toBeNull();
    expect(localStorage.getItem(UNLOCKS)).toBeNull();
  });

  it('does not answer for the next account, which gets its own sync', async () => {
    const progress = holdProgress();
    const leaving = syncProgressWithServer();
    clearAccountData();
    // The next account signs in while the first sync is still out.
    const arriving = syncProgressWithServer();
    expect(arriving).not.toBe(leaving);
    await progress.answer(accountA);
    await progress.answer(accountB);
    await Promise.all([leaving, arriving]);
    const stored = JSON.parse(localStorage.getItem(PROGRESS) ?? '{}') as Record<string, unknown>;
    expect(Object.keys(stored)).toEqual(['javascript']);
  });

  it('still stores a sync that finishes for the account that asked', async () => {
    const progress = holdProgress();
    const sync = syncProgressWithServer();
    await progress.answer(accountA);
    await sync;
    expect(localStorage.getItem(PROGRESS)).toContain('"passed":true');
    expect(JSON.parse(localStorage.getItem(UNLOCKS) ?? '[]')).toEqual(['css']);
  });
});

// A Learn level's completion carries the account's progress back
// (lib/roadmap.ts completeRoadmapAttempt). One still out at sign-out wrote the
// account that left into the browser, and the level then recorded its pass
// for whoever is here now.
describe('a level completion in flight at sign-out', () => {
  it('writes nothing of the account that left and says the sign-in changed', async () => {
    const waiting: (() => void)[] = [];
    server.use(http.post('*/api/quiz/roadmap', ({ request }) => {
      expect(new URL(request.url).searchParams.get('resource')).toBe('complete');
      return new Promise<Response>((resolve) => {
        waiting.push(() => resolve(HttpResponse.json({ correctAnswers: 8, totalQuestions: 8, percentage: 100, passed: true, applied: true, codingPending: [], progress: accountA.data })));
      });
    }));
    const completion = completeRoadmapAttempt('session-1');
    await expect.poll(() => waiting.length).toBeGreaterThan(0);
    clearAccountData();
    waiting.shift()!();
    await expect(completion).rejects.toMatchObject({ code: 'session_owner_mismatch' });
    expect(localStorage.getItem(PROGRESS)).toBeNull();
  });
});

// A progress GET that left before a level completion and answers after it
// holds the account as it was before that pass. Written over the completion's
// record, it drew the level just passed as not passed until the next sync.
describe('a progress sync that answers after a level completion', () => {
  it('keeps the progress the completion wrote', async () => {
    const progress = holdProgress();
    const passed = { html: { levels: { 1: { passed: true, bestPct: 100 }, 2: { passed: true, bestPct: 90 }, 3: { passed: true, bestPct: 80 } }, checkpoints: {} } };
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json({ correctAnswers: 8, totalQuestions: 10, percentage: 80, passed: true, applied: true, codingPending: [], progress: passed })));
    const sync = syncProgressWithServer();
    await completeRoadmapAttempt('session-2');
    await progress.answer(accountA);
    await sync;
    const stored = JSON.parse(localStorage.getItem(PROGRESS) ?? '{}') as typeof passed;
    expect(stored.html.levels[3]).toEqual({ passed: true, bestPct: 80 });
    expect(JSON.parse(localStorage.getItem(UNLOCKS) ?? '[]')).toEqual(['css']);
  });

  it('still stores a sync that started after the completion', async () => {
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json({ correctAnswers: 8, totalQuestions: 10, percentage: 80, passed: true, applied: true, codingPending: [], progress: accountB.data })));
    await completeRoadmapAttempt('session-3');
    const progress = holdProgress();
    const sync = syncProgressWithServer();
    await progress.answer(accountA);
    await sync;
    const stored = JSON.parse(localStorage.getItem(PROGRESS) ?? '{}') as Record<string, unknown>;
    expect(Object.keys(stored)).toEqual(['html']);
  });
});

// The progress PUT writes nothing: the server keeps progress, unlocks and
// extras itself and answers it with the GET's read. Sent with keepalive on
// every hide of a signed-in tab, it cost a function call, a token check and
// two reads each time a learner switched tabs.
describe('a signed-in tab that is hidden or closed', () => {
  it('sends no progress PUT', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    registerAccessTokenReader(() => 'stand-in-token');
    try {
      installProgressSyncFlusher();
      window.dispatchEvent(new Event('pagehide'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      const puts = fetchSpy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
      expect(puts).toEqual([]);
    } finally {
      registerAccessTokenReader(() => null);
      Reflect.deleteProperty(document, 'visibilityState');
      fetchSpy.mockRestore();
    }
  });
});
