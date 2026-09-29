import { afterAll, afterEach, expect, it } from 'vitest';
import { awardLearningOutcome, onXpToast, type XpToast } from '../src/lib/xp';
import { PRACTICE_XP } from '../src/lib/leveling';

// A replayed or failed Learn level earns no XP on the server. A signed-in
// learner must not be shown XP (or a rank-up) the account never gets; a
// signed-out browser keeps its small local practice reward.

const toasts: XpToast[] = [];
const stop = onXpToast((toast) => toasts.push(toast));
afterEach(() => { toasts.length = 0; });
afterAll(stop);

const questXp = () => Object.values(JSON.parse(localStorage.getItem('devquiz:xp:quest:v2') ?? '{}') as Record<string, number>)
  .reduce((sum, xp) => sum + xp, 0);

it('grants no practice XP to a signed-in learner', () => {
  awardLearningOutcome(0, true);
  expect(toasts).toEqual([]);
  expect(questXp()).toBe(0);
});

it('keeps the local practice reward in a signed-out browser', () => {
  awardLearningOutcome(0, false);
  expect(toasts[0]).toEqual({ kind: 'gain', amount: PRACTICE_XP, source: 'practice' });
  expect(questXp()).toBe(PRACTICE_XP);
});

it('still announces a new pass, signed in or not', () => {
  awardLearningOutcome(50, true);
  expect(toasts[0]).toEqual({ kind: 'gain', amount: 50, source: 'learn' });
  expect(questXp()).toBe(0);
});
