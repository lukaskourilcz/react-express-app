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
};

export const GAME_CONFIG_KEY = ['game-config'] as const;

async function fetchConfig(): Promise<GameConfig> {
  const c = await apiFetch<GameConfig>('/api/settings');
  // Apply the configured career-rank thresholds to the leveling module.
  setRankThresholds(c.leveling?.rankThresholds);
  // Defensively fill in any section an older server might omit (e.g. shop).
  return { ...DEFAULT_CONFIG, ...c, shop: c.shop ?? DEFAULT_CONFIG.shop };
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
