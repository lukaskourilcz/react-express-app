// How often a Learn map reads the account's XP (lib/xp.ts syncXpUnlessFresh).
// Every client-side return to a map read it again, seconds after the last
// read: perf baseline #587 C22. A read that wrote in the last minute, for the
// same account, with no other sync started since and the browser's copy as it
// left it, answers the map's next ask. Every other caller still reads.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { awardQuestXp, syncXpUnlessFresh, syncXpWithServer, XP_SYNC_FRESH_MS } from '../src/lib/xp';
import { clearAccountData } from '../src/lib/accountData';

/** Every XP GET; `status` answers them with an error instead. */
function countXpReads(status = 200) {
  const reads = { count: 0 };
  server.use(http.get('*/api/user/*', ({ request }) => {
    expect(new URL(request.url).pathname).toMatch(/\/api\/user\/xp$/);
    reads.count += 1;
    return status === 200
      ? HttpResponse.json({ data: { quest_xp: 40, by_subject: { webdev: 40 } } })
      : HttpResponse.json({ error: { code: 'upstream_timeout' } }, { status });
  }));
  return reads;
}

afterEach(() => {
  vi.useRealTimers();
  // Every test starts as a new account, so no window carries over.
  clearAccountData();
});

describe('the Learn map’s XP sync', () => {
  it('reads once for a map and its return, and once more after the window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const reads = countXpReads();
    await syncXpUnlessFresh();
    vi.setSystemTime(Date.now() + 2_500);
    await syncXpUnlessFresh();
    expect(reads.count).toBe(1);
    vi.setSystemTime(Date.now() + XP_SYNC_FRESH_MS);
    await syncXpUnlessFresh();
    expect(reads.count).toBe(2);
  });

  it('leaves every other caller reading, and reads again after another sync started', async () => {
    const reads = countXpReads();
    await syncXpUnlessFresh();
    // A verified result's sync (a quiz, a coding pass) always reads.
    await syncXpWithServer({ announceRankUp: true });
    expect(reads.count).toBe(2);
    // That read wrote, so the map's next ask is fresh again.
    await syncXpUnlessFresh();
    expect(reads.count).toBe(2);
    // A sync whose read failed wrote nothing: the map reads.
    const failed = countXpReads(503);
    await syncXpWithServer();
    expect(failed.count).toBe(1);
    const again = countXpReads();
    await syncXpUnlessFresh();
    expect(again.count).toBe(1);
  });

  it('reads again when the browser’s copy changed after the read', async () => {
    const reads = countXpReads();
    await syncXpUnlessFresh();
    awardQuestXp(10, 'practice');
    await syncXpUnlessFresh();
    expect(reads.count).toBe(2);
  });

  it('asks for the next account at once', async () => {
    const reads = countXpReads();
    await syncXpUnlessFresh();
    clearAccountData();
    await syncXpUnlessFresh();
    expect(reads.count).toBe(2);
  });
});
