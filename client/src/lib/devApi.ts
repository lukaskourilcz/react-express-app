// Client for the password-gated /api/admin endpoints used by the /dev console.
// The password the user types is kept in sessionStorage (cleared on lock/close)
// and sent with every request in the x-dev-password header.

import { apiFetch, ApiError } from './api';

const PW_KEY = 'devquiz:dev-password';

export const getDevPassword = (): string => {
  try {
    return sessionStorage.getItem(PW_KEY) ?? '';
  } catch {
    return '';
  }
};

export const setDevPassword = (pw: string) => {
  try {
    sessionStorage.setItem(PW_KEY, pw);
  } catch {
    // ignore
  }
};

export const clearDevPassword = () => {
  try {
    sessionStorage.removeItem(PW_KEY);
  } catch {
    // ignore
  }
};

function adminFetch<T>(
  op: string,
  init: { method?: string; body?: unknown; password?: string } = {},
): Promise<T> {
  return apiFetch<T>(`/api/admin/${op}`, {
    method: init.method ?? 'GET',
    headers: { 'x-dev-password': init.password ?? getDevPassword() },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/** The four translatable Czech fields edited in the console. */
export interface CsFields {
  question: string;
  options: string[];
  introduction: string;
  explanation: string;
}

export interface AdminQuestion {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  explanation: string;
  difficulty: number;
  source: 'base' | 'edited' | 'custom';
  deleted: boolean;
  /** Current Czech translation (db override, else static bank), for editing. */
  cs: CsFields;
}

export interface QuestionPayload {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  introduction: string;
  category: string;
  tags: string[];
  difficulty: number;
  cs?: Partial<CsFields>;
}

export interface GameSettings {
  quiz: { defaultCount: number; countOptions: number[]; maxCount: number; defaultDifficulty: string };
  daily: { count: number };
  play: {
    defaultDurationS: number;
    durationOptionsS: number[];
    countOptions: number[];
    minQuestions: number;
    maxQuestions: number;
    maxSpeedBonus: number;
  };
  features: { dailyChallenge: boolean; multiplayer: boolean; leaderboard: boolean; flashcards: boolean };
  ownerEmail: string;
}

/** Check a password against the server. Returns false on 401, throws on network errors. */
export async function verifyPassword(pw: string): Promise<boolean> {
  try {
    await adminFetch('settings', { password: pw });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return false;
    throw err;
  }
}

export const listQuestions = () =>
  adminFetch<{ questions: AdminQuestion[]; categories: string[] }>('questions');

export const saveQuestion = (payload: QuestionPayload) =>
  adminFetch<{ ok: true; id: string }>('save', { method: 'POST', body: payload });

export const setQuestionDeleted = (id: string, deleted: boolean) =>
  adminFetch<{ ok: true }>('delete', { method: 'POST', body: { id, deleted } });

export const resetQuestion = (id: string) =>
  adminFetch<{ ok: true }>('reset', { method: 'POST', body: { id } });

export const getAdminSettings = () => adminFetch<{ settings: GameSettings }>('settings');

export const saveAdminSettings = (settings: GameSettings) =>
  adminFetch<{ settings: GameSettings }>('settings', { method: 'POST', body: { settings } });
