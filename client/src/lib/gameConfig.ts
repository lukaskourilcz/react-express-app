import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { setRankThresholds, DEFAULT_RANK_THRESHOLDS } from './leveling';
import { queryClient } from './queryClient';

// Public, read-only game configuration (from /api/settings) that the UI uses to
// render the configured count/time options and hide disabled features. Backed by
// TanStack Query so it's fetched once and shared by every consumer (replacing a
// hand-rolled module cache + in-flight de-dup), while DEFAULT_CONFIG renders the
// app correctly before the fetch resolves or if it fails.

export interface GameConfig {
  quiz: {
    defaultCount: number;
    countOptions: number[];
    maxCount: number;
    defaultDifficulty: string;
    /** Category ids shown by default on the quiz home; empty = show all. */
    defaultCategoryIds: string[];
  };
  daily: { count: number };
  play: { defaultDurationS: number; durationOptionsS: number[]; countOptions: number[] };
  features: { dailyChallenge: boolean; multiplayer: boolean; leaderboard: boolean; flashcards: boolean };
  leveling: { rankThresholds: number[] };
  /** Token prices for the shop — per-product overrides + the path-unlock price. */
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
  ai: { explanationsEnabled: boolean };
  /** One-liner dev tips shown on the full-page loading screen; empty = none. */
  devTips: string[];
}

const DEFAULT_QUIZ_CATEGORY_IDS = [
  'javascript', 'typescript', 'react', 'nodejs', 'nextjs', 'html',
  'css', 'git', 'dsa', 'databases', 'system-design', 'devops',
];

// Default shop token prices (mirrors lib/settings-store.ts and the shop catalogue).
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

// Default loading-screen dev tips (mirrors lib/settings-store.ts DEFAULT_DEV_TIPS).
// Baked into DEFAULT_CONFIG so a tip is available the instant a load is slow,
// before /api/settings resolves; the dev's saved list replaces these once fetched.
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

// Czech twins of the built-in tips, index-aligned with DEFAULT_DEV_TIPS.
const DEFAULT_DEV_TIPS_CS = [
  'Nezapomeň programovat.',
  'Stavět projekty je víc než talent.',
  'Přečti si chybovou hlášku — a pak ještě jednou.',
  'Vydávej po malých kouscích a často.',
  'Pojmenovávej věci tak, jako by po tobě kód četl zase ty.',
  'Hotové je lepší než dokonalé.',
  'Commituj brzy, commituj často.',
  'Nejlepší debugger je pořádně se vyspat.',
  'Napiš test, který sis přál mít.',
  'Pravidelnost se sčítá.',
];

const TIP_CS = new Map(DEFAULT_DEV_TIPS.map((tip, i) => [tip, DEFAULT_DEV_TIPS_CS[i]]));

/**
 * The tips list to show on loading screens: built-in default tips swap to
 * their Czech twins when the UI language is Czech; dev-customized tips pass
 * through untouched (per tip, so a partially customized list keeps its
 * remaining defaults translated).
 */
export function localizedDevTips(tips: string[], lang: string): string[] {
  if (lang !== 'cs') return tips;
  return tips.map((tip) => TIP_CS.get(tip) ?? tip);
}

export const DEFAULT_CONFIG: GameConfig = {
  quiz: {
    defaultCount: 10,
    countOptions: [10, 20, 30, 40, 50],
    maxCount: 50,
    defaultDifficulty: 'zero-to-hero',
    defaultCategoryIds: DEFAULT_QUIZ_CATEGORY_IDS,
  },
  daily: { count: 5 },
  play: { defaultDurationS: 60, durationOptionsS: [30, 60, 120, 300, 0], countOptions: [5, 10, 15, 20] },
  features: { dailyChallenge: true, multiplayer: true, leaderboard: true, flashcards: true },
  leveling: { rankThresholds: DEFAULT_RANK_THRESHOLDS },
  shop: { prices: { ...DEFAULT_SHOP_PRICES }, pathUnlockPrice: DEFAULT_PATH_UNLOCK_PRICE },
  support: {
    enabled: false,
    kofiUrl: '',
    githubSponsorsUrl: '',
    monthlyTarget: 0,
    amountCovered: 0,
    lastUpdatedAt: '',
    costBreakdown: [],
    publicThanksEnabled: false,
  },
  ai: { explanationsEnabled: false },
  devTips: [...DEFAULT_DEV_TIPS],
};

export const GAME_CONFIG_KEY = ['game-config'] as const;

async function fetchConfig(): Promise<GameConfig> {
  const c = await apiFetch<GameConfig>('/api/settings');
  // Apply the configured career-rank thresholds to the leveling module.
  setRankThresholds(c.leveling?.rankThresholds);
  // Defensively fill in any section an older server might omit (e.g. shop).
  return {
    ...DEFAULT_CONFIG,
    ...c,
    shop: c.shop ?? DEFAULT_CONFIG.shop,
    support: c.support ?? DEFAULT_CONFIG.support,
    ai: c.ai ?? DEFAULT_CONFIG.ai,
  };
}

export function useGameConfig(): GameConfig {
  const { data } = useQuery({
    queryKey: GAME_CONFIG_KEY,
    queryFn: fetchConfig,
    // The config rarely changes within a session; fetch once and keep it.
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: DEFAULT_CONFIG,
  });
  return data ?? DEFAULT_CONFIG;
}

/** Imperative snapshot for non-React callers (e.g. shop purchase). */
export function getGameConfig(): GameConfig {
  return queryClient.getQueryData<GameConfig>(GAME_CONFIG_KEY) ?? DEFAULT_CONFIG;
}
