import { expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { announceVerifiedQuestXp, onXpToast, primeRankMarker, syncXpWithServer, type XpToast } from '../src/lib/xp';
import { submitCoding } from '../src/coding/api';
import type { CodingVerdictResponse } from '../../shared/coding-api';

// The account already holds the quiz's XP (the verified result is recorded
// before the sync): 2020 crosses the 2000 XP rank that a fresh account has not
// reached yet.
const accountXp = (xp: number) =>
  server.use(http.get('*/api/user/xp', () => HttpResponse.json({ data: { quest_xp: xp, by_subject: { webdev: xp } } })));

function collectToasts() {
  const toasts: XpToast[] = [];
  const off = onXpToast((toast) => toasts.push(toast));
  return { toasts, off };
}

it('celebrates the rank a signed-in quiz result crosses, after its gain', async () => {
  primeRankMarker();
  accountXp(2020);
  const { toasts, off } = collectToasts();
  // The order Quiz.tsx follows once the verified result is saved.
  announceVerifiedQuestXp(30);
  await syncXpWithServer({ announceRankUp: true });
  off();
  expect(toasts.map((toast) => toast.kind)).toEqual(['gain', 'rankup']);
  expect(toasts[0]).toMatchObject({ kind: 'gain', amount: 30 });
});

it('celebrates a rank once, even when the next sync sees it again', async () => {
  primeRankMarker();
  accountXp(2020);
  const { toasts, off } = collectToasts();
  await syncXpWithServer({ announceRankUp: true });
  await syncXpWithServer({ announceRankUp: true });
  off();
  expect(toasts.filter((toast) => toast.kind === 'rankup')).toHaveLength(1);
});

it('stays quiet on a sign-in sync that brings in progress from another session', async () => {
  primeRankMarker();
  accountXp(2020);
  const { toasts, off } = collectToasts();
  await syncXpWithServer();
  off();
  expect(toasts).toEqual([]);
});

// A coding pass's XP is credited by the server alone. Without an announcing
// sync after the pass, the next silent one marked the rank as seen.
it('celebrates the rank a coding pass crosses', async () => {
  primeRankMarker();
  accountXp(2020);
  const passed: CodingVerdictResponse = {
    verdict: 'passed', results: [], hidden: null, check: null, logs: [], codeError: null,
    design: null, designReference: null, failureHint: null, puzzle: null, progress: null,
    firstPass: true, xpAwarded: 35, xpForfeited: false, applied: true, github: null, solutions: null,
  };
  server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json(passed)));
  const { toasts, off } = collectToasts();
  await submitCoding({ session: 'coding-session', code: 'x' });
  await vi.waitFor(() => expect(toasts.map((toast) => toast.kind)).toContain('rankup'));
  off();
});

it('reads no XP after a coding pass that earned none', async () => {
  primeRankMarker();
  let xpReads = 0;
  server.use(
    http.get('*/api/user/xp', () => { xpReads += 1; return HttpResponse.json({ data: { quest_xp: 2020, by_subject: { webdev: 2020 } } }); }),
    http.post('*/api/quiz/roadmap', () => HttpResponse.json({
      verdict: 'passed', results: [], hidden: null, check: null, logs: [], codeError: null,
      design: null, designReference: null, failureHint: null, puzzle: null, progress: null,
      firstPass: false, xpAwarded: 0, xpForfeited: false, applied: false, github: null, solutions: null,
    })),
  );
  await submitCoding({ session: 'coding-session', code: 'x' });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(xpReads).toBe(0);
});
