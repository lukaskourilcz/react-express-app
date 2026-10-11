// The XP toaster says when the hour held XP back (migration 060, owner
// decision of 9 Oct 2026), in the learner's own clock time: a Learn level or
// part test passed again inside its hour, a coding challenge passed again
// without a reset or inside its hour, and the answers of a quiz, daily or
// Challenge result whose question paid XP less than an hour ago. A coding
// pass that paid XP says so too, first pass or repeat. The coding verdicts
// are the real shapes of api/quiz/roadmap.ts, resource=coding-submit.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import XpToaster from '../src/components/XpToaster';
import { announceVerifiedQuestXp, announceXpHeld, onXpToast, type XpHold, type XpToast } from '../src/lib/xp';
import { submitCoding } from '../src/coding/api';
import type { CodingRepeatXp, CodingVerdictResponse } from '../../shared/coding-api';

const sent = vi.hoisted(() => ({ verdict: null as unknown }));
vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api')>();
  return {
    ...actual,
    apiFetch: async (url: string) => {
      if (url.includes('resource=coding-submit')) return sent.verdict;
      if (url.startsWith('/api/user/xp')) return { data: { quest_xp: 0, by_subject: {} } };
      throw new actual.ApiError('Not found', 404, 'not_found');
    },
  };
});

const clock = (at: Date) => at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// 14:32 on the learner's own clock.
const AT = new Date(2026, 9, 9, 14, 32);

function mountToaster() {
  render(<LanguageProvider><XpToaster /></LanguageProvider>);
}

const heldCases: [string, XpHold, string][] = [
  ['a Learn step inside its hour', { on: 'step', availableAt: AT.toISOString() },
    `No XP this time: you can earn it again from ${clock(AT)}, an hour after you last earned it.`],
  ['a coding task that needs a reset and the hour', { on: 'task', availableAt: AT.toISOString() },
    `No XP this time: reset the task and pass it from ${clock(AT)} to earn it again.`],
  ['a coding task that needs a reset only', { on: 'task', availableAt: null },
    'No XP this time: reset the task and pass it again to earn it.'],
  ['one answer of a result', { on: 'questions', count: 1, availableAt: AT.toISOString() },
    `No XP for 1 answer this time: you can earn it again from ${clock(AT)}, an hour after you last earned it.`],
  ['several answers of a result', { on: 'questions', count: 3, availableAt: AT.toISOString() },
    `No XP for 3 answers this time: you can earn it again from ${clock(AT)}, an hour after you last earned it.`],
];

for (const [label, hold, text] of heldCases) {
  it(`toasts ${label}`, () => {
    mountToaster();
    act(() => announceXpHeld(hold));
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });
}

it('toasts XP paid again', () => {
  mountToaster();
  act(() => announceVerifiedQuestXp(50, 'again'));
  expect(screen.getByRole('status')).toHaveTextContent('+50 XP again');
});

it('keeps a held toast up long enough to read its time', async () => {
  vi.useFakeTimers();
  try {
    mountToaster();
    act(() => announceXpHeld({ on: 'step', availableAt: AT.toISOString() }));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole('status')).toHaveTextContent('No XP this time');
  } finally {
    vi.useRealTimers();
  }
});

describe('a coding Submit', () => {
  const toasts: XpToast[] = [];
  let stop: () => void = () => {};
  beforeEach(() => {
    toasts.length = 0;
    stop = onXpToast((toast) => toasts.push(toast));
    return () => stop();
  });
  const verdict = (extra: Partial<CodingVerdictResponse>): CodingVerdictResponse => ({
    verdict: 'passed', results: [{ pass: true, actual: '1', error: null }], hidden: null, check: null, logs: [], codeError: null,
    design: null, designReference: null, failureHint: null, puzzle: null, progress: null,
    firstPass: false, xpAwarded: 0, xpForfeited: false, repeatXp: null, applied: true, github: null, solutions: null, ...extra,
  });
  const submit = async (body: CodingVerdictResponse) => {
    sent.verdict = body;
    await submitCoding({ session: 'test-session', code: 'const one = () => 1;' });
  };
  const repeat = (withheld: CodingRepeatXp['withheld'], availableAt: string | null): CodingRepeatXp => ({ availableAt, needsReset: true, withheld });

  it('toasts a first pass’s XP', async () => {
    await submit(verdict({ firstPass: true, xpAwarded: 25, repeatXp: repeat(null, AT.toISOString()) }));
    expect(toasts).toEqual([{ kind: 'gain', amount: 25, source: 'coding' }]);
  });

  it('toasts XP paid again after a reset and the hour', async () => {
    await submit(verdict({ xpAwarded: 25, repeatXp: repeat(null, AT.toISOString()) }));
    expect(toasts).toEqual([{ kind: 'gain', amount: 25, source: 'again' }]);
  });

  it('toasts a pass inside the hour with the time to pass from', async () => {
    const later = new Date(Date.now() + 30 * 60_000).toISOString();
    await submit(verdict({ repeatXp: repeat('cooldown', later) }));
    expect(toasts).toEqual([{ kind: 'held', hold: { on: 'task', availableAt: later } }]);
  });

  it('toasts a pass without a reset once the hour is up with the reset alone', async () => {
    const earlier = new Date(Date.now() - 30 * 60_000).toISOString();
    await submit(verdict({ repeatXp: repeat('reset', earlier) }));
    expect(toasts).toEqual([{ kind: 'held', hold: { on: 'task', availableAt: null } }]);
  });

  it('toasts nothing for a pass after a reveal, a guest’s pass or a failed run', async () => {
    await submit(verdict({ firstPass: true, xpForfeited: true, repeatXp: repeat(null, AT.toISOString()) }));
    await submit(verdict({ applied: false, repeatXp: null }));
    await submit(verdict({ verdict: 'failed', repeatXp: null }));
    expect(toasts).toEqual([]);
  });
});
