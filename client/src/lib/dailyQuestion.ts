// The question of the day in the browser (#239). The page asks the server for
// a day's question and sends back the learner's one answer; the server picks
// the question, holds the answer sealed in the session and grades it. The
// check is practice: `api/quiz/submit.ts` records nothing for a `qotd`
// session, signed in or not.
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api';
import type { QuizResult } from '../types/quiz';
import { QOTD_BEFORE_START, QOTD_NOT_YET, type QotdResponse } from '../../../shared/daily-question';

export const dailyQuestionQuery = (date: string | 'today') =>
  queryOptions({
    queryKey: ['daily-question', date] as const,
    queryFn: ({ signal }) => apiFetch<QotdResponse>(`/api/quiz/daily?qotd=${encodeURIComponent(date)}`, { signal }),
    // The session inside expires after an hour; a stale question is fetched
    // again rather than graded with a dead session.
    staleTime: 10 * 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
  });

export type QotdResult = QuizResult['results'][number];

/** Grade one answer. Resolves with the server's verdict for that question. */
export async function checkDailyAnswer(sessionId: string, questionId: string, selectedIndex: number): Promise<QotdResult> {
  const result = await apiFetch<QuizResult>('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answers: { [questionId]: selectedIndex }, lang: 'en' }),
  });
  const graded = result.results.find((one) => one.questionId === questionId);
  if (!graded) throw new ApiError('The question was retired while you answered it.', 409, 'qotd_voided');
  return graded;
}

/** Why a day's question cannot be shown, in the words the page uses. */
export type QotdProblem = 'not-yet' | 'before-start' | 'expired' | 'offline' | 'failed';
export function qotdProblem(error: unknown): QotdProblem {
  if (!(error instanceof ApiError)) return 'failed';
  if (error.code === QOTD_NOT_YET) return 'not-yet';
  if (error.code === QOTD_BEFORE_START) return 'before-start';
  if (error.code === 'invalid_session' || error.code === 'attempt_already_graded' || error.code === 'qotd_voided') return 'expired';
  if (error.status === 0) return 'offline';
  return 'failed';
}
