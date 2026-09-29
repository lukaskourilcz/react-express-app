// A progress sync still in flight when the account signs out
// (lib/roadmap.ts syncProgressWithServer): the account's progress, unlocks and
// balances arrive after clearAccountData and must not be written back into
// the browser for the next person. The response is the real shape of
// GET /api/quiz/roadmap?resource=progress.
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { syncProgressWithServer } from '../src/lib/roadmap';
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
