// Typed calls against the existing quiz + leaderboard endpoints.
import { apiFetch } from './api';
import type { CategoryType, DifficultyMode, Question, QuizResult, LeaderboardGlobalEntry } from '../types';

export interface FetchQuestionsArgs {
  count: number;
  difficulty: DifficultyMode;
  categories: CategoryType[];
  lang?: string;
}

export function fetchQuestions(args: FetchQuestionsArgs) {
  const params = new URLSearchParams({
    count: String(args.count),
    difficulty: args.difficulty,
    categories: args.categories.join(','),
    lang: args.lang ?? 'en',
  });
  return apiFetch<{ sessionId: string; questions: Question[] }>(`/api/quiz/questions?${params}`);
}

export function submitQuiz(sessionId: string, answers: Record<string, number>, lang = 'en') {
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
