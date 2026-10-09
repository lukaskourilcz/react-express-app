// Owner decision 5: the editor keeps a device copy about a second after the
// learner stops typing, for each task on its own, and never sends it to the
// account (coding/drafts.ts). What waits is written before the account
// changes, so a sign-out the learner did not choose keeps it for that account
// (owner decision 4), and nothing typed for one account is written after it
// left.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { accountEpoch, clearAccountData } from '../src/lib/accountData';
import { autosaveDraft, keepDeviceDraft, openingDraft } from '../src/coding/drafts';

const auth = vi.hoisted(() => ({ account: null as string | null }));
vi.mock('../src/lib/auth', () => ({ signedInAccount: () => auth.account }));
/** The account signs in again and opens a task. */
const signBackIn = (account: string) => { auth.account = account; openingDraft('js-digit-sum', null, null); };

const copy = (id: string) => localStorage.getItem(`devshark:coding:draft:${id}`);
const base = (id: string) => (JSON.parse(localStorage.getItem(`devshark:coding:draft-time:${id}`) ?? 'null') as { base: string | null } | null)?.base;

beforeEach(() => {
  auth.account = 'user-1';
  clearAccountData();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

it('waits for a second without keystrokes on each task, apart from the others', () => {
  const epoch = accountEpoch();
  autosaveDraft('js-digit-sum', 'a', null, epoch);
  vi.advanceTimersByTime(500);
  autosaveDraft('js-sum-array', 'x', null, epoch);
  vi.advanceTimersByTime(400);
  // Typing in one task does not hold back the other.
  autosaveDraft('js-sum-array', 'xy', null, epoch);
  vi.advanceTimersByTime(100);
  expect(copy('js-digit-sum')).toBe('a');
  expect(copy('js-sum-array')).toBeNull();
  vi.advanceTimersByTime(900);
  expect(copy('js-sum-array')).toBe('xy');
});

it('writes once per pause, not once per keystroke', () => {
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  const epoch = accountEpoch();
  for (const code of ['c', 'co', 'con', 'cons', 'const']) {
    autosaveDraft('js-digit-sum', code, null, epoch);
    vi.advanceTimersByTime(200);
  }
  expect(writes.mock.calls.filter(([key]) => key === 'devshark:coding:draft:js-digit-sum')).toEqual([]);
  vi.advanceTimersByTime(1_000);
  expect(writes.mock.calls.filter(([key]) => key === 'devshark:coding:draft:js-digit-sum')).toEqual([['devshark:coding:draft:js-digit-sum', 'const']]);
});

it('never moves the time the copy builds on', () => {
  // A copy built on the account draft of 10:00, whose save the account refused
  // because another device saved at 10:05.
  keepDeviceDraft('js-digit-sum', '// mine', '2026-10-09T10:00:00.000Z');
  autosaveDraft('js-digit-sum', '// mine, typed on', '2026-10-09T10:00:00.000Z', accountEpoch());
  vi.advanceTimersByTime(1_000);
  expect(base('js-digit-sum')).toBe('2026-10-09T10:00:00.000Z');
  // So the next visit still sees that the account moved on, and offers both.
  const opening = openingDraft('js-digit-sum', '// from the other device', '2026-10-09T10:05:00.000Z');
  expect(opening).toMatchObject({ code: '// from the other device', conflict: 'account', setAside: '// mine, typed on' });
});

it('writes what waits before an involuntary sign-out keeps the drafts, and nothing for the account after it left', () => {
  const epoch = accountEpoch();
  autosaveDraft('js-digit-sum', '// typed a moment before the session ended', null, epoch);
  auth.account = null;
  expect(clearAccountData('user-1')).toBe(true);
  expect(copy('js-digit-sum')).toBeNull();
  // The screen still open on the old account types on: nothing is written.
  autosaveDraft('js-digit-sum', '// typed into the old screen', null, epoch);
  vi.advanceTimersByTime(1_000);
  expect(copy('js-digit-sum')).toBeNull();
  signBackIn('user-1');
  expect(copy('js-digit-sum')).toBe('// typed a moment before the session ended');
});

it('drops what waits on a chosen sign-out', () => {
  autosaveDraft('js-digit-sum', '// typed', null, accountEpoch());
  auth.account = null;
  expect(clearAccountData()).toBe(false);
  vi.advanceTimersByTime(1_000);
  expect(copy('js-digit-sum')).toBeNull();
  signBackIn('user-1');
  expect(copy('js-digit-sum')).toBeNull();
});
