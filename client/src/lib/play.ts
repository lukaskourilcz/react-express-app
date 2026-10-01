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
  /** A player gets only the questions already shown: none in the lobby, up
   * to the current one while the room runs, all of them once it is over. */
  questions: MatchQuestion[];
  /** How many questions the round has. Absent from a server before it sent
   * only the questions already shown, whose `questions` held all of them. */
  question_count?: number;
  ended_at?: string | null;
  /** Null while the room is a lobby, and for a lobby closed before it started. */
  started_at?: string | null;
  question_started_at?: string | null;
  question_duration_s?: number;
  /** Classroom only: the question whose answer the teacher revealed, which
   * closed it to answers (migration 056). Null before the first reveal. */
  revealed_idx?: number | null;
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

// On every public board a learner's name and picture are null unless they
// switched on "Show my name and photo on leaderboards" (migration 049); the
// Leaderboard screen then shows "Learner" and the default avatar.
export interface CategoryLeaderboardEntry {
  display_name: string | null;
  picture: string | null;
  total_correct: number;
  total_questions: number;
  accuracy_pct: number;
}

export interface LeaderboardGlobalEntry {
  display_name: string | null;
  picture: string | null;
  total_correct: number;
  total_quizzes: number;
  longest_streak: number;
  current_streak: number;
}

export interface LeaderboardDailyEntry {
  display_name: string | null;
  picture: string | null;
  correct: number;
  total: number;
  duration_ms: number;
  attempted_at: string;
}

/** One row of a windowed board (the 30-day default). The server ranks it:
 *  equal results share a rank, so `rank` is not always the row's position. */
export interface WindowLeaderboardEntry {
  rank: number;
  display_name: string | null;
  picture: string | null;
  correct: number;
  answered: number;
  accuracy_pct: number;
  /** True only on the signed-in learner's own row of a personal request. */
  is_viewer?: boolean;
}

/** The signed-in learner's own line on a windowed board. `rank` is null when
 *  they have fewer answers in the window than the board's minimum. */
export interface LeaderboardMe {
  rank: number | null;
  correct: number;
  answered: number;
  accuracy_pct: number;
}

export type LeaderboardPeriod = '30d' | 'global' | 'daily' | 'category';

export interface LeaderboardResponse {
  period: string;
  date?: string;
  category?: string | null;
  days?: number;
  min_answers?: number;
  entries: LeaderboardGlobalEntry[] | LeaderboardDailyEntry[] | CategoryLeaderboardEntry[] | WindowLeaderboardEntry[];
  /** Present on a personal 30-day request; null when the session was not verified. */
  me?: LeaderboardMe | null;
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

/** The number of questions in the round: the server's count, or, from a
 * server that still sent every question, the length of the list. */
export const questionCountOf = (match: Pick<Match, 'questions' | 'question_count'>): number =>
  match.question_count ?? match.questions.length;

/** `server_now` is the server's clock when it answered (ISO). */
export const joinMatch = (input: { code: string; user_id: string; display_name: string }) =>
  apiFetch<Match & { server_now?: string }>('/api/play/join', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchMatchState = (code: string, user_id?: string) =>
  apiFetch<{ match: Match; participants: Participant[]; scoreboard: ScoreboardEntry[]; server_now?: string }>(
    `/api/play/state?code=${encodeURIComponent(code)}${user_id ? `&user_id=${encodeURIComponent(user_id)}` : ''}`,
  );

/** How far the server's clock runs ahead of this device's, in ms, from a
 * response that carries `server_now`. The server read its clock about halfway
 * through the round trip. Null when the response has no clock. */
export function serverClockOffset(serverNow: string | undefined, sentAt: number, receivedAt: number): number | null {
  const server = typeof serverNow === 'string' ? Date.parse(serverNow) : Number.NaN;
  if (!Number.isFinite(server)) return null;
  return server - (sentAt + receivedAt) / 2;
}

export const controlMatch = (input: {
  code: string;
  host_id: string;
  /** `reveal` closes the classroom question on screen and shows its answer. */
  action: 'start' | 'advance' | 'finish' | 'reveal';
}) =>
  apiFetch<{ ok: true; status?: string; current_index?: number; revealed_idx?: number }>('/api/play/control', {
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
  period: LeaderboardPeriod = 'global',
  options: { date?: string; category?: string | null; categories?: string[]; personal?: boolean; signal?: AbortSignal } = {},
) => {
  const qs = new URLSearchParams({ period });
  if (options.date && period === 'daily') qs.set('date', options.date);
  if (options.category && (period === 'category' || period === '30d')) qs.set('category', options.category);
  // Scope both cumulative and daily boards to the active subject. Subjects'
  // categories are disjoint, so the server can validate a single owner and
  // never blend results from two products.
  if (options.categories?.length && (period === 'global' || period === 'daily')) {
    qs.set('categories', options.categories.join(','));
  }
  // A signed-in learner's 30-day board carries their own line. `me=1` gives
  // that personal variant its own URL, so a shared cache never serves the
  // anonymous board in its place.
  if (options.personal && period === '30d') qs.set('me', '1');
  return apiFetch<LeaderboardResponse>(`/api/leaderboard?${qs}`, { signal: options.signal });
};

export const fetchDistribution = (code: string, questionIdx: number, hostId: string) =>
  apiFetch<{ buckets: DistributionBucket[] }>(
    `/api/play/distribution?code=${encodeURIComponent(code)}&q=${questionIdx}&user_id=${encodeURIComponent(hostId)}`,
  );
