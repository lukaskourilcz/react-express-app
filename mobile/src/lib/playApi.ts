// Multiplayer "Play" — the player flow (join + answer). Hosting/controlling a
// match stays on the web; mobile users join by code and play. Same endpoints.
import { apiFetch } from './api';

export interface MatchQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index?: number; // only after the match finishes
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
  question_started_at?: string | null;
  question_duration_s?: number;
  ended_at?: string | null;
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

export const joinMatch = (input: { code: string; user_id: string; display_name: string }) =>
  apiFetch<Match>('/api/play/join', { method: 'POST', body: JSON.stringify(input) });

export const fetchMatchState = (code: string, user_id?: string) =>
  apiFetch<{ match: Match; participants: Participant[]; scoreboard: ScoreboardEntry[] }>(
    `/api/play/state?code=${encodeURIComponent(code)}${user_id ? `&user_id=${encodeURIComponent(user_id)}` : ''}`,
  );

export const submitMatchAnswer = (input: {
  code: string;
  user_id: string;
  question_idx: number;
  selected_idx: number;
  duration_ms: number;
}) =>
  apiFetch<{ ok: true; is_correct: boolean; speed_bonus?: number; advanced?: boolean }>('/api/play/answer', {
    method: 'POST',
    body: JSON.stringify(input),
  });
