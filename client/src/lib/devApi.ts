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
  /** Resolved importance (1–10): DB override → hand-judged score → heuristic. */
  importance: number;
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
  /** Optional importance override (1–10). */
  importance?: number;
  cs?: Partial<CsFields>;
}

export interface GameSettings {
  quiz: {
    defaultCount: number;
    countOptions: number[];
    maxCount: number;
    defaultDifficulty: string;
    minImportance: number;
    defaultCategoryIds: string[];
  };
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
  leveling: { rankThresholds: number[] };
  shop: { prices: Record<string, number>; pathUnlockPrice: number };
  /** One-liner dev tips shown on the loading screen (empty = none). */
  devTips: string[];
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
  adminFetch<{ questions: AdminQuestion[]; categories: string[]; reportCounts: Record<string, number> }>('questions');

export const saveQuestion = (payload: QuestionPayload) =>
  adminFetch<{ ok: true; id: string }>('save', { method: 'POST', body: payload });

export const setQuestionDeleted = (id: string, deleted: boolean) =>
  adminFetch<{ ok: true }>('delete', { method: 'POST', body: { id, deleted } });

/** Soft-hide all (non-custom) questions scoring ≤ maxImportance. Returns count. */
export const bulkHideByImportance = (maxImportance: number) =>
  adminFetch<{ ok: true; hidden: number }>('bulkhide', { method: 'POST', body: { maxImportance } });

/** A single auth action (registration or login) for the Logs tab. */
export interface AuthEvent {
  id: string;
  user_id: string;
  email: string | null;
  provider: string | null;
  event_type: 'register' | 'login';
  created_at: string;
}

export const listAuthEvents = () => adminFetch<{ events: AuthEvent[] }>('logs');

export const resetQuestion = (id: string) =>
  adminFetch<{ ok: true }>('reset', { method: 'POST', body: { id } });

export const getAdminSettings = () => adminFetch<{ settings: GameSettings }>('settings');

export const saveAdminSettings = (settings: GameSettings) =>
  adminFetch<{ settings: GameSettings }>('settings', { method: 'POST', body: { settings } });

/** A learner-submitted report or red-flag, as shown in the /dev Flags tab. */
export interface AdminReport {
  id: string;
  questionId: string;
  reason: string;
  detail: string | null;
  reporterSub: string | null;
  createdAt: string | null;
  questionSummary: string | null;
}

export const listReports = () => adminFetch<{ reports: AdminReport[] }>('reports');

export const dismissReport = (id: string) =>
  adminFetch<{ ok: true }>('reports', { method: 'POST', body: { id } });
