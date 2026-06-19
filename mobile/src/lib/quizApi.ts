// Typed calls against the existing quiz + leaderboard endpoints. The solo quiz
// falls back to local selection + grading from the bundled dataset when there's
// no connection, so it works fully offline (the leaderboard stays online-only).
import { apiFetch, isOfflineError } from './api';
import { offlineQuizSelect, offlineGrade, isOfflineSession } from '../data/offline';
import type { CategoryType, DifficultyMode, Question, QuizResult, LeaderboardGlobalEntry } from '../types';

export interface FetchQuestionsArgs {
  count: number;
  difficulty: DifficultyMode;
  categories: CategoryType[];
  lang?: string;
}

export async function fetchQuestions(args: FetchQuestionsArgs) {
  const params = new URLSearchParams({
    count: String(args.count),
    difficulty: args.difficulty,
    categories: args.categories.join(','),
    lang: args.lang ?? 'en',
  });
  try {
    return await apiFetch<{ sessionId: string; questions: Question[] }>(`/api/quiz/questions?${params}`);
  } catch (err) {
    if (isOfflineError(err)) {
      return offlineQuizSelect({ count: args.count, difficulty: args.difficulty, categories: args.categories });
    }
    throw err;
  }
}

export function submitQuiz(sessionId: string, answers: Record<string, number>, lang = 'en') {
  // An offline session was selected locally, so grade it locally too.
  if (isOfflineSession(sessionId)) return Promise.resolve(offlineGrade(sessionId, answers));
  return apiFetch<QuizResult>('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, answers, lang }),
  });
}

export function fetchGlobalLeaderboard(limit = 50) {
  return apiFetch<{ period: string; entries: LeaderboardGlobalEntry[] }>(
    `/api/leaderboard?period=global&limit=${limit}`,
  );
}
