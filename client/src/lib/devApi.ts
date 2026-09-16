// Client for authenticated /api/admin endpoints. apiFetch always attaches the
// current Supabase token; a legacy password can additionally be kept in
// sessionStorage when that migration fallback is explicitly enabled server-side.

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
  /** What the content audit says about this exact wording: served or not,
   * why, and the decision on record. Mirrors `AdminReviewState` on the server. */
  review: {
    active: boolean;
    reason: 'not-in-scope' | 'reviewed' | 'unreviewed' | 'superseded' | 'retired' | 'quarantined' | 'failed-gate' | 'invalid-record';
    csApproved: boolean;
    decision?: 'retain' | 'rewrite' | 'retire' | 'quarantine';
    retireReason?: string;
    relevance?: number;
    quality?: number;
    reviewedAt?: string;
    revision?: number;
  };
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
  support: {
    enabled: boolean;
    kofiUrl: string;
    githubSponsorsUrl: string;
    monthlyTarget: number;
    amountCovered: number;
    lastUpdatedAt: string;
    costBreakdown: Array<{ label: string; amount: number }>;
    publicThanksEnabled: boolean;
  };
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

/** One day of the day-over-day return rate: of the people who learned something
 *  the day before, how many came back. Counts only — never an account. */
export interface RetentionDay {
  day: string;
  priorActive: number;
  returned: number;
  ratePct: number;
}

export const getRetention = (days = 14) =>
  adminFetch<{ days: number; rows: RetentionDay[] }>(`retention?days=${days}`);

/** One row of the progression-velocity review list. Counts, durations and a
 *  decision — never an answer, a name or an address. */
export interface IntegrityFlag {
  userId: string | null;
  surface: string;
  signal: string;
  severity: 'review' | 'urgent' | string;
  status: 'open' | 'reviewed' | 'cleared' | 'confirmed' | string;
  subject: string | null;
  hits: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  evidence: Record<string, unknown>;
  answersLastHour: number;
}

/** The floors the server applied, returned beside the rows so the console
 *  never restates a threshold the server could have changed. */
export interface VelocityRules {
  minSample: number;
  readingFloorMs: number;
  accuracyFloorPct: number;
  reactionFloorMs: number;
  sustainedAnswersPerHour: number;
}

export const getIntegrityFlags = (status = 'open', limit = 100) =>
  adminFetch<{ status: string; rules: VelocityRules; flags: IntegrityFlag[] }>(
    `integrity?status=${encodeURIComponent(status)}&limit=${limit}`,
  );

/** Record the owner's decision on one flag. It writes to the review list and to
 *  nothing else: no score, rank or account changes because of this call. */
export const resolveIntegrityFlag = (input: {
  userId: string | null;
  surface: string;
  signal: string;
  status: 'open' | 'reviewed' | 'cleared' | 'confirmed';
  note?: string | null;
}) => adminFetch<{ flag: IntegrityFlag }>('integrity', { method: 'POST', body: input });

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

export interface QuestionQualityIssue {
  questionId: string;
  questionHash: string;
  kind: 'missing_translation' | 'translation_parity' | 'weak_distractor' | 'duplicate' | 'ambiguous_wording' | 'freshness_review' | 'importance_mismatch';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

export interface QuestionQualityScan {
  enabled: boolean;
  scanned: number;
  issues: QuestionQualityIssue[];
  stored?: number;
}

export const scanQuestionQuality = (categories: readonly string[], store = false) =>
  adminFetch<QuestionQualityScan>(`quality?categories=${encodeURIComponent(categories.join(','))}`, {
    method: store ? 'POST' : 'GET',
  });

export interface LearningPathIssue {
  level: 'error' | 'warning';
  code: string;
  at: string;
  message: string;
}

export interface LearningPathReadiness {
  pathId: string;
  version: number;
  /** The content validator found no errors. */
  contentReady: boolean;
  /** The deployment switch for this path is on. Separate from contentReady:
   * a path can validate and still be deliberately closed. */
  enabledInEnv: boolean;
  inventory: {
    modules: number;
    lessons: number;
    checks: number;
    codeExercises: number;
    artifacts: number;
    estimatedMinutes: number;
    moduleChecks: number;
    moduleCodeExercises: number;
    finalChecks: number;
    finalCodeExercises: number;
    diagnosticChecks: number;
    diagnosticCodeExercises: number;
  };
  issues: LearningPathIssue[];
}

export const listLearningPathReadiness = () =>
  adminFetch<{ paths: LearningPathReadiness[] }>('learning-paths');
