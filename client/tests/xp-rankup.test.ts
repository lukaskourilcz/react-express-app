import { expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { announceVerifiedQuestXp, onXpToast, primeRankMarker, syncXpWithServer, type XpToast } from '../src/lib/xp';

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
