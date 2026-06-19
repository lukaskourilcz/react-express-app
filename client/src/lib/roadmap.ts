// Client-side roadmap ("Learn") helpers: fetch the level map / a level's
// questions from the API, and track per-level progress in localStorage so the
// path remembers which levels are completed and unlocked across sessions.

import { apiFetch } from './api';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import type {
  RoadmapStructure,
  RoadmapLevel,
  RoadmapTopic,
} from '../types/quiz';

// Passing score (percent) needed to clear a level and unlock the next one.
export const PASS_THRESHOLD = 75;

const PROGRESS_KEY = 'devquiz:roadmap:v1';

export interface LevelProgress {
  /** Latches true once the level has ever been passed. */
  passed: boolean;
  /** Best score (percent) achieved on this level. */
  bestPct: number;
}

// level number → progress, per topic.
export type RoadmapProgress = Partial<Record<RoadmapTopic, Record<number, LevelProgress>>>;

/* ──── API ──────────────────────────────────────────────────────────────── */

export function fetchRoadmapStructure(signal?: AbortSignal): Promise<RoadmapStructure> {
  return apiFetch<RoadmapStructure>('/api/quiz/roadmap', { signal });
}

export function fetchRoadmapLevel(
  topic: RoadmapTopic,
  level: number,
  lang: string,
  signal?: AbortSignal,
): Promise<RoadmapLevel> {
  const params = new URLSearchParams({ topic, level: String(level), lang });
  return apiFetch<RoadmapLevel>(`/api/quiz/roadmap?${params}`, { signal });
}

/* ──── Progress store ───────────────────────────────────────────────────── */

const readProgress = (): RoadmapProgress => readJSON<RoadmapProgress>(PROGRESS_KEY, {});

const store = createStore<RoadmapProgress>(readProgress);

/** Live view of roadmap progress; re-renders subscribers when a level is recorded. */
export function useRoadmapProgress(): RoadmapProgress {
  return useStore(store);
}

/** Record a finished level attempt. `passed` latches; `bestPct` keeps the max. */
export function recordLevelResult(topic: RoadmapTopic, level: number, pct: number): void {
  const progress = readProgress();
  const topicProgress = { ...(progress[topic] ?? {}) };
  const prev = topicProgress[level];
  topicProgress[level] = {
    passed: (prev?.passed ?? false) || pct >= PASS_THRESHOLD,
    bestPct: Math.max(prev?.bestPct ?? 0, pct),
  };
  writeJSON(PROGRESS_KEY, { ...progress, [topic]: topicProgress });
  store.emit();
}

/* ──── Derived helpers ──────────────────────────────────────────────────── */

export function isLevelPassed(progress: RoadmapProgress, topic: RoadmapTopic, level: number): boolean {
  return progress[topic]?.[level]?.passed ?? false;
}

export function levelBestPct(progress: RoadmapProgress, topic: RoadmapTopic, level: number): number {
  return progress[topic]?.[level]?.bestPct ?? 0;
}

// Level 1 is always open; every later level unlocks once the previous is passed.
export function isLevelUnlocked(progress: RoadmapProgress, topic: RoadmapTopic, level: number): boolean {
  return level <= 1 || isLevelPassed(progress, topic, level - 1);
}

/** How many of a topic's levels have been passed. */
export function passedCount(progress: RoadmapProgress, topic: RoadmapTopic): number {
  const topicProgress = progress[topic];
  if (!topicProgress) return 0;
  return Object.values(topicProgress).filter((p) => p.passed).length;
}
