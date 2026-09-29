// From migration 048 a finished Learn level, a recorded coding pass and an
// awarded Challenge run are streak days too, so each marks the Profile's
// cached stats stale and the streak card reads the new count. Work that moved
// nothing leaves the cache alone.
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { queryClient } from '../src/lib/queryClient';
import { profileStatsQueryKey } from '../src/lib/queries';
import { completeRoadmapAttempt } from '../src/lib/roadmap';
import { completeChallengeRun } from '../src/lib/challengeApi';
import { submitCoding } from '../src/coding/api';
import type { CodingVerdictResponse } from '../../shared/coding-api';
import { server } from './mocks/server';

const KEY = profileStatsQueryKey('user-streak-sources-1');
const stale = () => queryClient.getQueryState(KEY)?.isInvalidated === true;

const verdict = (over: Partial<CodingVerdictResponse>): CodingVerdictResponse => ({
  verdict: 'passed', results: [], hidden: null, check: null, logs: [], codeError: null,
  design: null, designReference: null, failureHint: null, puzzle: null, progress: null,
  firstPass: false, xpAwarded: 0, applied: true, github: null, solutions: null, ...over,
});

beforeEach(() => {
  queryClient.clear();
  queryClient.setQueryData(KEY, { current_streak: 5, last_quiz_date: '2026-09-28' });
});

describe('a streak day outside the quiz', () => {
  it('a finished Learn level, passed or not', async () => {
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json({ correctAnswers: 1, totalQuestions: 2, percentage: 50, passed: false, applied: true })));
    await completeRoadmapAttempt('learn-session');
    expect(stale()).toBe(true);
  });

  it('not a Learn completion that was already recorded', async () => {
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json({ correctAnswers: 2, totalQuestions: 2, percentage: 100, passed: true, applied: false })));
    await completeRoadmapAttempt('learn-session');
    expect(stale()).toBe(false);
  });

  it('a recorded coding pass, and not a failed run or a replay', async () => {
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json(verdict({ verdict: 'failed' }))));
    await submitCoding({ session: 'coding-session', code: 'x' });
    expect(stale()).toBe(false);
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json(verdict({ applied: false }))));
    await submitCoding({ session: 'coding-session', code: 'x' });
    expect(stale()).toBe(false);
    server.use(http.post('*/api/quiz/roadmap', () => HttpResponse.json(verdict({}))));
    await submitCoding({ session: 'coding-session', code: 'x' });
    expect(stale()).toBe(true);
  });

  it('an awarded Challenge run, and not one that earned nothing', async () => {
    server.use(http.post('*/api/quiz/challenge', () => HttpResponse.json({ ok: true, awarded: false, score: 0, xp: 0 })));
    await completeChallengeRun({ runToken: 'run', proofs: [] });
    expect(stale()).toBe(false);
    server.use(http.post('*/api/quiz/challenge', () => HttpResponse.json({ ok: true, awarded: true, score: 4, xp: 20 })));
    await completeChallengeRun({ runToken: 'run', proofs: [] });
    expect(stale()).toBe(true);
  });
});
