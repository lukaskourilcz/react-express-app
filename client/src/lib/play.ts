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
  host_id: string;
  host_name: string;
  status: 'lobby' | 'running' | 'finished';
  current_index: number;
  questions: MatchQuestion[];
  ended_at?: string | null;
  question_started_at?: string | null;
  question_duration_s?: number;
}

export interface Participant {
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface ScoreboardEntry {
  user_id: string;
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
  host_id: string;
  host_name: string;
  mode: 'multiplayer' | 'classroom';
  count: number;
  /** Must be non-empty: the active subject's topics (or a subset of them). */
  categories: string[];
  /** Per-question time limit in seconds. 0 = no limit. */
  duration_s: number;
  /** Question language for the whole match (host's UI language). */
  lang: 'en' | 'cs';
}) =>
  apiFetch<{ id: string; code: string; mode: string; status: string }>('/api/play/create', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const joinMatch = (input: { code: string; user_id: string; display_name: string }) =>
  apiFetch<Match>('/api/play/join', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchMatchState = (code: string, user_id?: string) =>
  apiFetch<{ match: Match; participants: Participant[]; scoreboard: ScoreboardEntry[] }>(
    `/api/play/state?code=${encodeURIComponent(code)}${user_id ? `&user_id=${encodeURIComponent(user_id)}` : ''}`,
  );

export const controlMatch = (input: {
  code: string;
  host_id: string;
  action: 'start' | 'advance' | 'finish';
}) =>
  apiFetch<{ ok: true; status?: string; current_index?: number }>('/api/play/control', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const submitMatchAnswer = (input: {
  code: string;
  user_id: string;
  question_idx: number;
  selected_idx: number;
  duration_ms: number;
  client_received_at?: string;
}) =>
  apiFetch<{ ok: true; is_correct: boolean; speed_bonus?: number; advanced?: boolean }>('/api/play/answer', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const sendHeartbeat = (code: string, host_id: string) =>
  apiFetch<{ ok: true }>('/api/play/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ code, host_id }),
  });

export const fetchLeaderboard = (
  period: 'global' | 'daily' | 'category' = 'global',
  options: { date?: string; category?: string; categories?: string[] } = {},
) => {
  const qs = new URLSearchParams({ period });
  if (options.date && period === 'daily') qs.set('date', options.date);
  if (options.category && period === 'category') qs.set('category', options.category);
  // Scope both cumulative and daily boards to the active subject. Subjects'
  // categories are disjoint, so the server can validate a single owner and
  // never blend results from two products.
  if (options.categories?.length && (period === 'global' || period === 'daily')) {
    qs.set('categories', options.categories.join(','));
  }
  return apiFetch<{
    period: string;
    date?: string;
    category?: string;
    entries: LeaderboardGlobalEntry[] | LeaderboardDailyEntry[] | CategoryLeaderboardEntry[];
  }>(`/api/leaderboard?${qs}`);
};

export const fetchDistribution = (code: string, questionIdx: number, hostId: string) =>
  apiFetch<{ buckets: DistributionBucket[] }>(
    `/api/play/distribution?code=${encodeURIComponent(code)}&q=${questionIdx}&user_id=${encodeURIComponent(hostId)}`,
  );
