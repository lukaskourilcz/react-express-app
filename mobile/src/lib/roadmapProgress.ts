// Per-user roadmap progress, stored locally (AsyncStorage) and, when signed in,
// synced to the same `roadmap_progress` account record the web app uses. Mirrors
// client/src/lib/roadmap.ts so the unlock rules match across web and mobile.
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';
import type { RoadmapTopic } from './roadmapApi';

export const LEVEL_PASS = 75;
export const CHECKPOINT_PASS = 85;
export const LEVELS_PER_CHECKPOINT = 5;

const KEY = 'devquiz:roadmap:v2';
const PROGRESS_GET = '/api/quiz/roadmap?resource=progress';
const PROGRESS_PUT = '/api/quiz/roadmap';

export interface Entry {
  passed: boolean;
  bestPct: number;
}
export interface TopicProgress {
  levels: Record<string, Entry>;
  checkpoints: Record<string, Entry>;
}
export type RoadmapProgress = Partial<Record<RoadmapTopic, TopicProgress>>;

let cache: RoadmapProgress = {};
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // best effort
  }
}

export async function loadProgress(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as RoadmapProgress) : {};
  } catch {
    cache = {};
  }
  loaded = true;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Live progress; loads from disk on first use. */
export function useRoadmapProgress(): RoadmapProgress {
  useEffect(() => {
    if (!loaded) void loadProgress();
  }, []);
  return useSyncExternalStore(subscribe, () => cache);
}

export function getProgress(): RoadmapProgress {
  return cache;
}

function topicOf(p: RoadmapProgress, topic: RoadmapTopic): TopicProgress {
  const t = p[topic];
  return { levels: { ...(t?.levels ?? {}) }, checkpoints: { ...(t?.checkpoints ?? {}) } };
}

function record(kind: 'levels' | 'checkpoints', topic: RoadmapTopic, ref: number, pct: number, passPct: number) {
  const tp = topicOf(cache, topic);
  const prev = tp[kind][String(ref)];
  tp[kind][String(ref)] = {
    passed: (prev?.passed ?? false) || pct >= passPct,
    bestPct: Math.max(prev?.bestPct ?? 0, pct),
  };
  cache = { ...cache, [topic]: tp };
  void persist();
  emit();
}

export const recordLevelResult = (topic: RoadmapTopic, level: number, pct: number, passPct = LEVEL_PASS) =>
  record('levels', topic, level, pct, passPct);
export const recordCheckpointResult = (topic: RoadmapTopic, checkpoint: number, pct: number, passPct = CHECKPOINT_PASS) =>
  record('checkpoints', topic, checkpoint, pct, passPct);

/* ──── derived helpers (match the web unlock rules) ─────────────────────── */

export const isLevelPassed = (p: RoadmapProgress, topic: RoadmapTopic, level: number): boolean =>
  p[topic]?.levels?.[String(level)]?.passed ?? false;
export const levelBestPct = (p: RoadmapProgress, topic: RoadmapTopic, level: number): number =>
  p[topic]?.levels?.[String(level)]?.bestPct ?? 0;
export const isCheckpointPassed = (p: RoadmapProgress, topic: RoadmapTopic, cp: number): boolean =>
  p[topic]?.checkpoints?.[String(cp)]?.passed ?? false;
export const checkpointBestPct = (p: RoadmapProgress, topic: RoadmapTopic, cp: number): number =>
  p[topic]?.checkpoints?.[String(cp)]?.bestPct ?? 0;

export function isLevelUnlocked(p: RoadmapProgress, topic: RoadmapTopic, level: number): boolean {
  if (level <= 1) return true;
  if (level % LEVELS_PER_CHECKPOINT === 1) {
    return isCheckpointPassed(p, topic, (level - 1) / LEVELS_PER_CHECKPOINT);
  }
  return isLevelPassed(p, topic, level - 1);
}
export function isCheckpointUnlocked(p: RoadmapProgress, topic: RoadmapTopic, cp: number): boolean {
  return isLevelPassed(p, topic, cp * LEVELS_PER_CHECKPOINT);
}
export function passedLevelCount(p: RoadmapProgress, topic: RoadmapTopic): number {
  return Object.values(p[topic]?.levels ?? {}).filter((e) => e.passed).length;
}

// What to play after finishing a level/checkpoint, given the topic's counts
// (JS/TS/React have 25 levels / 5 checkpoints; Git/HTML/CSS have 15 / 3).
export function nextAfter(
  kind: 'level' | 'checkpoint',
  ref: number,
  levelCount: number,
  checkpointCount: number,
): { kind: 'level' | 'checkpoint'; ref: number } | null {
  if (kind === 'level') {
    if (ref % LEVELS_PER_CHECKPOINT === 0) return { kind: 'checkpoint', ref: ref / LEVELS_PER_CHECKPOINT };
    if (ref < levelCount) return { kind: 'level', ref: ref + 1 };
    return null;
  }
  if (ref < checkpointCount) return { kind: 'level', ref: ref * LEVELS_PER_CHECKPOINT + 1 };
  return null;
}

/* ──── account sync ─────────────────────────────────────────────────────── */

function mergeMaps(a: Record<string, Entry> = {}, b: Record<string, Entry> = {}): Record<string, Entry> {
  const out: Record<string, Entry> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    out[k] = prev ? { passed: prev.passed || v.passed, bestPct: Math.max(prev.bestPct, v.bestPct) } : v;
  }
  return out;
}

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

export async function pushProgressToServer(): Promise<void> {
  try {
    await apiFetch(PROGRESS_PUT, { method: 'PUT', body: JSON.stringify({ data: cache }) });
  } catch {
    // not signed in / offline — local stays the source of truth
  }
}

export async function syncProgressWithServer(): Promise<void> {
  let server: RoadmapProgress = {};
  try {
    const { data } = await apiFetch<{ data: RoadmapProgress }>(PROGRESS_GET);
    server = data ?? {};
  } catch {
    return;
  }
  cache = mergeProgress(cache, server);
  await persist();
  emit();
  await pushProgressToServer();
}
