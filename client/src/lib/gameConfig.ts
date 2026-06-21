import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import { setRankThresholds, DEFAULT_RANK_THRESHOLDS } from './leveling';

// Public, read-only game configuration (from /api/settings) that the UI uses to
// render the configured count/time options and hide disabled features. Mirrors
// the server defaults so the app renders correctly before the fetch resolves or
// if it fails.

export interface GameConfig {
  quiz: { defaultCount: number; countOptions: number[]; maxCount: number; defaultDifficulty: string };
  daily: { count: number };
  play: { defaultDurationS: number; durationOptionsS: number[]; countOptions: number[] };
  features: { dailyChallenge: boolean; multiplayer: boolean; leaderboard: boolean; flashcards: boolean };
  leveling: { rankThresholds: number[] };
}

export const DEFAULT_CONFIG: GameConfig = {
  quiz: { defaultCount: 10, countOptions: [10, 20, 30, 40, 50], maxCount: 50, defaultDifficulty: 'zero-to-hero' },
  daily: { count: 5 },
  play: { defaultDurationS: 60, durationOptionsS: [30, 60, 120, 300, 0], countOptions: [5, 10, 15, 20] },
  features: { dailyChallenge: true, multiplayer: true, leaderboard: true, flashcards: true },
  leveling: { rankThresholds: DEFAULT_RANK_THRESHOLDS },
};

// Module-level cache so the config is fetched once and shared by every consumer.
let cached: GameConfig | null = null;
let inflight: Promise<GameConfig> | null = null;

async function fetchConfig(): Promise<GameConfig> {
  try {
    const c = await apiFetch<GameConfig>('/api/settings');
    // Apply the configured career-rank thresholds to the leveling module.
    setRankThresholds(c.leveling?.rankThresholds);
    return c;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useGameConfig(): GameConfig {
  const [config, setConfig] = useState<GameConfig>(cached ?? DEFAULT_CONFIG);
  useEffect(() => {
    if (cached) return;
    let active = true;
    inflight ??= fetchConfig();
    inflight.then((c) => {
      cached = c;
      if (active) setConfig(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return config;
}
