// Client for authenticated /api/admin endpoints. apiFetch always attaches the
// current Supabase token; a legacy password can additionally be kept in
// sessionStorage when that migration fallback is explicitly enabled server-side.

import type { CoinSettings, MerchSettings, MerchSku } from '../../../shared/rewards';
import type { AdminVoucher, CreatedVoucher } from '../../../shared/vouchers';
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
  /** The merchandise configuration, edited under /dev → Merchandise (#229).
   * The Settings form sends it back unchanged; leaving it out would reset it
   * on every save. */
  merch?: MerchSettings;
  /** What earns coins (#227). */
  coins: CoinSettings;
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

/* ── merchandise operations (#229) ─────────────────────────────────────── */

/** One order in the fulfilment queue: what a parcel needs, and nothing more. */
export interface FulfilmentOrder {
  order_id: string;
  payment_kind: string;
  state: string;
  total_minor: number | null;
  currency: string | null;
  token_total: number | null;
  ship_name: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_city: string;
  ship_postal: string;
  ship_country: string;
  carrier: string | null;
  tracking_ref: string | null;
  test_mode: boolean;
  created_at: string;
  /** A claimed learning-path package, paid at zero. */
  package: boolean;
}

export interface MerchStockRow {
  sku: MerchSku;
  variant: string;
  /** Units the owner will still post this month. */
  onHand: number;
  /** Units paid orders already hold. */
  reserved: number;
  updatedAt?: string;
}

export interface FulfilmentResponse {
  orders: FulfilmentOrder[];
  items: { order_id: string; sku: MerchSku; variant: string; quantity: number }[];
  stock: MerchStockRow[];
}

/** `queue` is the picking list (paid redemptions and claimed packages); any
 * other value is one order state. */
export type FulfilmentView = 'queue' | 'submitted' | 'shipped' | 'awaiting_payment' | 'cancelled' | 'refunded';

// op=fulfilment lives on the user handler and checks the same admin identity.
const fulfilmentFetch = <T,>(init: { method?: string; body?: unknown; query?: string } = {}) =>
  apiFetch<T>(`/api/user/[op]?op=fulfilment${init.query ?? ''}`, {
    method: init.method ?? 'GET',
    headers: { 'x-dev-password': getDevPassword() },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

export const getFulfilment = (view: FulfilmentView = 'queue') =>
  fulfilmentFetch<FulfilmentResponse>({ query: `&state=${encodeURIComponent(view)}` });

export const advanceOrder = (orderId: string, op: 'submit' | 'ship' | 'cancel', tracking?: { carrier: string; trackingRef: string }) =>
  fulfilmentFetch<{ applied?: boolean; outcome?: string }>({ method: 'POST', body: { orderId, op, ...(tracking ?? {}) } });

export const setMerchStock = (sku: MerchSku, variant: string, onHand: number) =>
  fulfilmentFetch<{ stock: MerchStockRow }>({ method: 'POST', body: { op: 'stock', sku, variant, onHand } });

/* ── Premium vouchers (migration 045) ─────────────────────────────────── */

export const listVouchers = () => adminFetch<{ vouchers: AdminVoucher[] }>('vouchers');

export interface VoucherInput {
  note: string;
  /** Days of Premium from the redemption; null for no end. */
  premiumDays: number | null;
  maxRedemptions: number;
  /** ISO time after which the code cannot be redeemed; null for none. */
  redeemableUntil: string | null;
  /** A custom code; null for a random one. */
  code: string | null;
}

/** The answer carries the code, the one time it is ever shown. */
export const createVoucher = (input: VoucherInput) =>
  adminFetch<CreatedVoucher>('vouchers', { method: 'POST', body: { action: 'create', ...input } });

export const revokeVoucher = (voucherId: string) =>
  adminFetch<{ voucher: AdminVoucher }>('vouchers', { method: 'POST', body: { action: 'revoke', voucherId } });
