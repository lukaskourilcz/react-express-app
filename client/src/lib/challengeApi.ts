import { apiFetch } from './api';
import type { Question } from '../types/quiz';

// Biggest Shark Challenge client. All resources live on one Vercel function
// (to stay within the 12-function Hobby limit), differentiated by method +
// `?resource=`:
//   GET  /api/quiz/challenge                       → fresh batch of mixed questions
//   GET  /api/quiz/challenge?resource=leaderboard  → top-10 + current champion
//   POST /api/quiz/challenge                       → submit a finished run's score

export interface ChallengeBatch {
  sessionId: string;
  questions: Question[];
}

export interface ChallengeScore {
  id: string;
  name: string;
  score: number;
  createdAt: string;
  userId: string | null;
}

export interface ChallengeLeaderboard {
  top: ChallengeScore[];
  champion: ChallengeScore | null;
}

export function fetchChallengeBatch(opts: { exclude?: string[]; lang?: string } = {}): Promise<ChallengeBatch> {
  const params = new URLSearchParams();
  if (opts.exclude && opts.exclude.length > 0) {
    // Cap the exclude payload — the server caps too, but no need to send more.
    params.set('exclude', opts.exclude.slice(0, 400).join(','));
  }
  if (opts.lang) params.set('lang', opts.lang);
  const qs = params.toString();
  return apiFetch<ChallengeBatch>(`/api/quiz/challenge${qs ? `?${qs}` : ''}`);
}

export function getChallengeLeaderboard(): Promise<ChallengeLeaderboard> {
  return apiFetch<ChallengeLeaderboard>('/api/quiz/challenge?resource=leaderboard');
}

export function submitChallengeScore(input: { name: string; score: number }): Promise<{ ok: true; record: ChallengeScore | null }> {
  return apiFetch<{ ok: true; record: ChallengeScore | null }>('/api/quiz/challenge', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
