import { apiFetch } from './api';

export interface MatchQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index?: number; // host only / after finish
  explanation?: string;
  category: string;
  difficulty: number;
}

export interface Match {
  id: string;
  code: string;
  mode: 'multiplayer' | 'classroom';
  host_sub: string;
  host_name: string;
  status: 'lobby' | 'running' | 'finished';
  current_index: number;
  questions: MatchQuestion[];
  ended_at?: string | null;
  question_started_at?: string | null;
  question_duration_s?: number;
}

export interface Participant {
  auth0_sub: string;
  display_name: string;
  joined_at: string;
}

export interface ScoreboardEntry {
  auth0_sub: string;
  display_name: string;
  correct: number;
  score: number;
  total_ms: number;
}

export interface DistributionBucket {
  selected_idx: number;
  count: number;
  correct: boolean;
}

export interface CategoryLeaderboardEntry {
  display_name: string;
  picture: string | null;
  total_correct: number;
  total_questions: number;
  accuracy_pct: number;
}

export interface LeaderboardGlobalEntry {
  display_name: string;
  picture: string | null;
  total_correct: number;
  total_quizzes: number;
  longest_streak: number;
  current_streak: number;
}

export interface LeaderboardDailyEntry {
  display_name: string;
  picture: string | null;
  correct: number;
  total: number;
  duration_ms: number;
  attempted_at: string;
}

export const createMatch = (input: {
  host_sub: string;
  host_name: string;
  mode: 'multiplayer' | 'classroom';
  count: number;
  categories: string[];
}) =>
  apiFetch<{ id: string; code: string; mode: string; status: string }>('/api/play/create', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const joinMatch = (input: { code: string; auth0_sub: string; display_name: string }) =>
  apiFetch<Match>('/api/play/join', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchMatchState = (code: string, auth0_sub?: string) =>
  apiFetch<{ match: Match; participants: Participant[]; scoreboard: ScoreboardEntry[] }>(
    `/api/play/state?code=${encodeURIComponent(code)}${auth0_sub ? `&auth0_sub=${encodeURIComponent(auth0_sub)}` : ''}`,
  );

export const controlMatch = (input: {
  code: string;
  host_sub: string;
  action: 'start' | 'advance' | 'finish';
}) =>
  apiFetch<{ ok: true; status?: string; current_index?: number }>('/api/play/control', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const submitMatchAnswer = (input: {
  code: string;
  auth0_sub: string;
  question_idx: number;
  selected_idx: number;
  duration_ms: number;
}) =>
  apiFetch<{ ok: true; is_correct: boolean }>('/api/play/answer', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchLeaderboard = (
  period: 'global' | 'daily' | 'category' = 'global',
  options: { date?: string; category?: string } = {},
) => {
  const qs = new URLSearchParams({ period });
  if (options.date && period === 'daily') qs.set('date', options.date);
  if (options.category && period === 'category') qs.set('category', options.category);
  return apiFetch<{
    period: string;
    date?: string;
    category?: string;
    entries: LeaderboardGlobalEntry[] | LeaderboardDailyEntry[] | CategoryLeaderboardEntry[];
  }>(`/api/leaderboard?${qs}`);
};

export const fetchDistribution = (code: string, q: number, hostSub: string) =>
  apiFetch<{ buckets: DistributionBucket[] }>(
    `/api/play/distribution?code=${encodeURIComponent(code)}&q=${q}&auth0_sub=${encodeURIComponent(hostSub)}`,
  );

export const recordCategoryStats = (auth0_id: string, by_category: Record<string, { correct: number; total: number }>) =>
  apiFetch<{ ok: true; applied: number }>('/api/user/category-stats', {
    method: 'POST',
    body: JSON.stringify({ auth0_id, by_category }),
  });
