// Game-wide settings, managed from /dev → Settings and consumed by the quiz,
// daily-challenge and play endpoints. Stored as one JSON row in `app_settings`,
// cached briefly, and always falling back to DEFAULT_SETTINGS so the app keeps
// working if the DB (or a given field) is unavailable.

import { createServiceClient, withTimeout } from './http';
import type { DifficultyMode } from './quiz-data';

const supabase = createServiceClient();
const TABLE = 'app_settings';
const KEY = 'game';
const CACHE_TTL_MS = 15_000;

export interface GameSettings {
  quiz: {
    /** Pre-selected question count. */
    defaultCount: number;
    /** Count choices shown as buttons. */
    countOptions: number[];
    /** Hard upper bound the server clamps requests to. */
    maxCount: number;
    /** Pre-selected difficulty mode. */
    defaultDifficulty: DifficultyMode;
    /** Minimum importance (1–10) a question needs to appear in the quiz. 1 = no floor. */
    minImportance: number;
    /**
     * Category ids shown by default on the quiz home page. The remaining
     * categories are hidden behind a "Show all" toggle in the UI. Empty array
     * means show all categories by default (no filtering).
     */
    defaultCategoryIds: string[];
  };
  daily: {
    /** Number of questions in the daily challenge. */
    count: number;
  };
  play: {
    /** Pre-selected per-question time limit (seconds; 0 = no limit). */
    defaultDurationS: number;
    /** Time-limit choices shown as buttons (seconds; 0 = no limit). */
    durationOptionsS: number[];
    /** Question-count choices for a hosted match. */
    countOptions: number[];
    minQuestions: number;
    maxQuestions: number;
    /** Max speed-bonus points awarded for the fastest correct answer. */
    maxSpeedBonus: number;
  };
  features: {
    dailyChallenge: boolean;
    multiplayer: boolean;
    leaderboard: boolean;
    flashcards: boolean;
  };
  leveling: {
    /** Total XP required to reach each career rank (ascending; first is 0). */
    rankThresholds: number[];
  };
  shop: {
    /** Per-product token price, keyed by shop product id. */
    prices: Record<string, number>;
    /** Token price to instantly unlock any one learning path. */
    pathUnlockPrice: number;
  };
  /**
   * One-liner "dev tips" surfaced on the full-page loading screen (under the
   * swimming shark) on longer loads. Editable from /dev → Settings. An empty
   * list simply shows no tip.
   */
  devTips: string[];
  /** Email whose private categories (custom, apt) are visible. */
  ownerEmail: string;
}

// Default career-rank XP thresholds (10 ranks, Superjunior → Architect). Kept in
// sync with client/src/lib/leveling.ts DEFAULT_RANK_THRESHOLDS.
const DEFAULT_RANK_THRESHOLDS = [0, 2000, 6000, 14000, 26000, 44000, 68000, 100000, 144000, 200000];

// The 12 most "dev-focused" categories — shown on the quiz home page by
// default. The remaining categories are reachable via the "Show all" toggle.
const DEFAULT_QUIZ_CATEGORY_IDS = [
  'javascript',
  'typescript',
  'react',
  'nodejs',
  'nextjs',
  'html',
  'css',
  'git',
  'dsa',
  'databases',
  'system-design',
  'devops',
];

// Default token prices for the shop (kept in sync with the client catalogue in
// client/src/lib/shop.ts). Configurable from /dev → Settings.
const DEFAULT_SHOP_PRICES: Record<string, number> = {
  'double-xp': 75,
  'ring-emerald': 200,
  'ring-gold': 250,
  'ring-violet': 375,
  'flair-rocket': 150,
  'flair-flame': 300,
  'flair-crown': 500,
};
const DEFAULT_PATH_UNLOCK_PRICE = 200;

// Default one-liner dev tips shown on the loading screen. Short and punchy so a
// learner can read one in the moment a slow load surfaces it. Kept in sync with
// client/src/lib/gameConfig.ts DEFAULT_DEV_TIPS.
const DEFAULT_DEV_TIPS = [
  'Remember to code.',
  'Building projects beats talent.',
  'Read the error message — then read it again.',
  'Ship small, ship often.',
  'Name things like the next dev is you.',
  'Done is better than perfect.',
  'Commit early, commit often.',
  'The best debugger is a good night of sleep.',
  'Write the test you wish you had.',
  'Consistency compounds.',
];

export const DEFAULT_SETTINGS: GameSettings = {
  quiz: {
    defaultCount: 10,
    countOptions: [10, 20, 30, 40, 50],
    maxCount: 50,
    defaultDifficulty: 'zero-to-hero',
    minImportance: 1,
    defaultCategoryIds: DEFAULT_QUIZ_CATEGORY_IDS,
  },
  daily: { count: 5 },
  play: {
    defaultDurationS: 60,
    durationOptionsS: [30, 60, 120, 300, 0],
    countOptions: [5, 10, 15, 20],
    minQuestions: 3,
    maxQuestions: 20,
    maxSpeedBonus: 50,
  },
  features: {
    dailyChallenge: true,
    multiplayer: true,
    leaderboard: true,
    flashcards: true,
  },
  leveling: { rankThresholds: DEFAULT_RANK_THRESHOLDS },
  shop: { prices: { ...DEFAULT_SHOP_PRICES }, pathUnlockPrice: DEFAULT_PATH_UNLOCK_PRICE },
  devTips: [...DEFAULT_DEV_TIPS],
  ownerEmail: (process.env.OWNER_EMAIL || 'kouril.lukas@gmail.com').toLowerCase(),
};

const DIFFICULTY_MODES: DifficultyMode[] = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return n < min ? min : n > max ? max : n;
};

// Whole-number choices, de-duplicated, in range. Falls back if nothing valid.
const cleanIntList = (v: unknown, min: number, max: number, fallback: number[]): number[] => {
  if (!Array.isArray(v)) return fallback;
  const out = Array.from(
    new Set(v.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max)),
  );
  return out.length > 0 ? out : fallback;
};

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

// Category-id list: strings only, de-duplicated, capped at 40 entries. We don't
// hard-validate ids here so a renamed category in the bank doesn't lock out the
// list — bad ids just don't match anything in the UI.
const cleanCategoryIds = (v: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(v)) return fallback;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().toLowerCase();
    if (!trimmed || trimmed.length > 60 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= 40) break;
  }
  return out;
};

// Career-rank XP thresholds: must be the same length as the default, all
// non-negative integers, strictly ascending, and start at 0. Otherwise fall back.
const cleanThresholds = (v: unknown, fallback: number[]): number[] => {
  if (!Array.isArray(v) || v.length !== fallback.length) return fallback;
  const out: number[] = [];
  for (let i = 0; i < v.length; i++) {
    const n = typeof v[i] === 'number' && Number.isFinite(v[i]) ? Math.round(v[i] as number) : NaN;
    if (Number.isNaN(n) || n < 0) return fallback;
    if (i === 0 && n !== 0) return fallback;
    if (i > 0 && n <= out[i - 1]) return fallback;
    out.push(n);
  }
  return out;
};

// Dev tips: trimmed, non-empty strings, de-duplicated, each length-capped and the
// list count-capped. A missing field (older stored row) falls back to defaults;
// an explicit empty array is kept as-is so a dev can switch the tips off.
const MAX_TIP_LENGTH = 200;
const MAX_TIPS = 40;
const cleanTips = (v: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(v)) return fallback;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > MAX_TIP_LENGTH || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_TIPS) break;
  }
  return out;
};

// Shop prices: for each KNOWN product id, take a clamped non-negative integer
// override or fall back to the default. Unknown keys are dropped so the stored
// shape can’t balloon. Prices may be 0 (a free item).
const cleanShopPrices = (v: unknown, fallback: Record<string, number>): Record<string, number> => {
  const src = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const out: Record<string, number> = {};
  for (const key of Object.keys(fallback)) {
    out[key] = clampInt(src[key], 0, 1_000_000, fallback[key]);
  }
  return out;
};

// Coerce arbitrary stored/posted JSON into a valid GameSettings, clamping every
// field so a bad value can never break the endpoints that consume it.
export function normalizeSettings(raw: unknown): GameSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const quiz = (r.quiz ?? {}) as Record<string, unknown>;
  const daily = (r.daily ?? {}) as Record<string, unknown>;
  const play = (r.play ?? {}) as Record<string, unknown>;
  const features = (r.features ?? {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;

  return {
    quiz: {
      defaultCount: clampInt(quiz.defaultCount, 1, 50, d.quiz.defaultCount),
      countOptions: cleanIntList(quiz.countOptions, 1, 50, d.quiz.countOptions),
      maxCount: clampInt(quiz.maxCount, 1, 50, d.quiz.maxCount),
      defaultDifficulty: DIFFICULTY_MODES.includes(quiz.defaultDifficulty as DifficultyMode)
        ? (quiz.defaultDifficulty as DifficultyMode)
        : d.quiz.defaultDifficulty,
      minImportance: clampInt(quiz.minImportance, 1, 10, d.quiz.minImportance),
      defaultCategoryIds: cleanCategoryIds(quiz.defaultCategoryIds, d.quiz.defaultCategoryIds),
    },
    daily: { count: clampInt(daily.count, 1, 20, d.daily.count) },
    play: {
      defaultDurationS: clampInt(play.defaultDurationS, 0, 600, d.play.defaultDurationS),
      durationOptionsS: cleanIntList(play.durationOptionsS, 0, 600, d.play.durationOptionsS),
      countOptions: cleanIntList(play.countOptions, 1, 50, d.play.countOptions),
      minQuestions: clampInt(play.minQuestions, 1, 50, d.play.minQuestions),
      maxQuestions: clampInt(play.maxQuestions, 1, 50, d.play.maxQuestions),
      maxSpeedBonus: clampInt(play.maxSpeedBonus, 0, 1000, d.play.maxSpeedBonus),
    },
    features: {
      dailyChallenge: bool(features.dailyChallenge, d.features.dailyChallenge),
      multiplayer: bool(features.multiplayer, d.features.multiplayer),
      leaderboard: bool(features.leaderboard, d.features.leaderboard),
      flashcards: bool(features.flashcards, d.features.flashcards),
    },
    leveling: {
      rankThresholds: cleanThresholds(
        (r.leveling as Record<string, unknown> | undefined)?.rankThresholds,
        d.leveling.rankThresholds,
      ),
    },
    shop: {
      prices: cleanShopPrices((r.shop as Record<string, unknown> | undefined)?.prices, d.shop.prices),
      pathUnlockPrice: clampInt(
        (r.shop as Record<string, unknown> | undefined)?.pathUnlockPrice,
        0,
        1_000_000,
        d.shop.pathUnlockPrice,
      ),
    },
    devTips: cleanTips(r.devTips, d.devTips),
    ownerEmail:
      typeof r.ownerEmail === 'string' && r.ownerEmail.includes('@')
        ? r.ownerEmail.toLowerCase()
        : d.ownerEmail,
  };
}

let cache: { at: number; value: GameSettings } | null = null;

export async function getGameSettings(): Promise<GameSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let value = DEFAULT_SETTINGS;
  if (supabase) {
    try {
      const { data } = await withTimeout(
        supabase.from(TABLE).select('value').eq('key', KEY).maybeSingle(),
        4000,
      );
      if (data?.value) value = normalizeSettings(data.value);
    } catch {
      // missing table / timeout — fall back to defaults
    }
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Persist a full settings object (already validated by normalizeSettings). */
export async function saveGameSettings(raw: unknown): Promise<GameSettings> {
  if (!supabase) throw new Error('not_configured');
  const value = normalizeSettings(raw);
  const { error } = await withTimeout(
    supabase.from(TABLE).upsert(
      { key: KEY, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    ),
    5000,
  );
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), value };
  return value;
}
