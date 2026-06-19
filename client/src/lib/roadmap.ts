// Client-side roadmap ("Learn") helpers: fetch the level/checkpoint map and
// playable questions from the API, track per-level and per-checkpoint progress
// in localStorage, and (when signed in) sync that progress to the user's account.

import { apiFetch } from './api';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import type { RoadmapStructure, RoadmapPlayable, RoadmapTopic } from '../types/quiz';

// Pass thresholds (must match lib/roadmap.ts on the server).
export const LEVEL_PASS = 75;
export const CHECKPOINT_PASS = 85;
export const LEVELS_PER_CHECKPOINT = 5;
export const ROADMAP_LEVELS = 25;
export const CHECKPOINT_COUNT = ROADMAP_LEVELS / LEVELS_PER_CHECKPOINT;

const PROGRESS_KEY = 'devquiz:roadmap:v2';
// Progress lives on the same function as the rest of the roadmap (to stay within
// Vercel's Hobby 12-function limit): GET ?resource=progress to read, PUT to save.
const PROGRESS_GET = '/api/quiz/roadmap?resource=progress';
const PROGRESS_PUT = '/api/quiz/roadmap';

export interface Entry {
  /** Latches true once passed. */
  passed: boolean;
  /** Best score (percent). */
  bestPct: number;
}
export interface TopicProgress {
  levels: Record<string, Entry>;
  checkpoints: Record<string, Entry>;
}
export type RoadmapProgress = Partial<Record<RoadmapTopic, TopicProgress>>;

/* ──── API ──────────────────────────────────────────────────────────────── */

export function fetchRoadmapStructure(signal?: AbortSignal): Promise<RoadmapStructure> {
  return apiFetch<RoadmapStructure>('/api/quiz/roadmap', { signal });
}

export function fetchRoadmapLevel(topic: RoadmapTopic, level: number, lang: string, signal?: AbortSignal): Promise<RoadmapPlayable> {
  const params = new URLSearchParams({ topic, level: String(level), lang });
  return apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`, { signal });
}

export function fetchRoadmapCheckpoint(topic: RoadmapTopic, checkpoint: number, lang: string, signal?: AbortSignal): Promise<RoadmapPlayable> {
  const params = new URLSearchParams({ topic, checkpoint: String(checkpoint), lang });
  return apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`, { signal });
}

/* ──── Progress store (localStorage-backed) ─────────────────────────────── */

const readProgress = (): RoadmapProgress => readJSON<RoadmapProgress>(PROGRESS_KEY, {});

const store = createStore<RoadmapProgress>(readProgress);

/** Live view of roadmap progress; re-renders subscribers when it changes. */
export function useRoadmapProgress(): RoadmapProgress {
  return useStore(store);
}

function writeProgress(p: RoadmapProgress): void {
  writeJSON(PROGRESS_KEY, p);
  store.emit();
}

function topicOf(p: RoadmapProgress, topic: RoadmapTopic): TopicProgress {
  const t = p[topic];
  return { levels: { ...(t?.levels ?? {}) }, checkpoints: { ...(t?.checkpoints ?? {}) } };
}

function record(kind: 'levels' | 'checkpoints', topic: RoadmapTopic, ref: number, pct: number, passPct: number): void {
  const p = readProgress();
  const tp = topicOf(p, topic);
  const map = tp[kind];
  const prev = map[String(ref)];
  map[String(ref)] = {
    passed: (prev?.passed ?? false) || pct >= passPct,
    bestPct: Math.max(prev?.bestPct ?? 0, pct),
  };
  writeProgress({ ...p, [topic]: tp });
}

export const recordLevelResult = (topic: RoadmapTopic, level: number, pct: number, passPct = LEVEL_PASS) =>
  record('levels', topic, level, pct, passPct);

export const recordCheckpointResult = (topic: RoadmapTopic, checkpoint: number, pct: number, passPct = CHECKPOINT_PASS) =>
  record('checkpoints', topic, checkpoint, pct, passPct);

/* ──── Derived helpers (unlock / pass / progress) ───────────────────────── */

export const isLevelPassed = (p: RoadmapProgress, topic: RoadmapTopic, level: number): boolean =>
  p[topic]?.levels?.[String(level)]?.passed ?? false;

export const levelBestPct = (p: RoadmapProgress, topic: RoadmapTopic, level: number): number =>
  p[topic]?.levels?.[String(level)]?.bestPct ?? 0;

export const isCheckpointPassed = (p: RoadmapProgress, topic: RoadmapTopic, checkpoint: number): boolean =>
  p[topic]?.checkpoints?.[String(checkpoint)]?.passed ?? false;

export const checkpointBestPct = (p: RoadmapProgress, topic: RoadmapTopic, checkpoint: number): number =>
  p[topic]?.checkpoints?.[String(checkpoint)]?.bestPct ?? 0;

// Level 1 is always open. The first level of a new segment (6, 11, 16, 21)
// unlocks only when the preceding checkpoint is passed; otherwise a level
// unlocks when the previous one is passed.
export function isLevelUnlocked(p: RoadmapProgress, topic: RoadmapTopic, level: number): boolean {
  if (level <= 1) return true;
  if (level % LEVELS_PER_CHECKPOINT === 1) {
    const checkpoint = (level - 1) / LEVELS_PER_CHECKPOINT;
    return isCheckpointPassed(p, topic, checkpoint);
  }
  return isLevelPassed(p, topic, level - 1);
}

// A checkpoint unlocks once the last level of its segment is passed (which, by
// the sequential gating above, means all 5 of its levels are passed).
export function isCheckpointUnlocked(p: RoadmapProgress, topic: RoadmapTopic, checkpoint: number): boolean {
  return isLevelPassed(p, topic, checkpoint * LEVELS_PER_CHECKPOINT);
}

export function passedLevelCount(p: RoadmapProgress, topic: RoadmapTopic): number {
  return Object.values(p[topic]?.levels ?? {}).filter((e) => e.passed).length;
}

/* ──── Account sync ─────────────────────────────────────────────────────── */

function mergeMaps(a: Record<string, Entry> = {}, b: Record<string, Entry> = {}): Record<string, Entry> {
  const out: Record<string, Entry> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    out[k] = prev
      ? { passed: prev.passed || v.passed, bestPct: Math.max(prev.bestPct, v.bestPct) }
      : v;
  }
  return out;
}

/** Combine two progress blobs: passed latches true, bestPct takes the max. */
export function mergeProgress(a: RoadmapProgress, b: RoadmapProgress): RoadmapProgress {
  const out: RoadmapProgress = {};
  const topics = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<RoadmapTopic>;
  for (const topic of topics) {
    out[topic] = {
      levels: mergeMaps(a[topic]?.levels, b[topic]?.levels),
      checkpoints: mergeMaps(a[topic]?.checkpoints, b[topic]?.checkpoints),
    };
  }
  return out;
}

/** PUT the current (or given) local progress to the user's account. */
export async function pushProgressToServer(progress: RoadmapProgress = readProgress()): Promise<void> {
  await apiFetch(PROGRESS_PUT, { method: 'PUT', body: JSON.stringify({ data: progress }) });
}

// On sign-in: pull the account's progress, merge it with whatever is on this
// device, store the union locally, and push it back so both sides agree.
export async function syncProgressWithServer(): Promise<void> {
  let server: RoadmapProgress = {};
  try {
    const { data } = await apiFetch<{ data: RoadmapProgress }>(PROGRESS_GET);
    server = data ?? {};
  } catch {
    return; // not signed in or offline — keep local only
  }
  const merged = mergeProgress(readProgress(), server);
  writeProgress(merged);
  try {
    await pushProgressToServer(merged);
  } catch {
    // best-effort; local is already updated
  }
}
