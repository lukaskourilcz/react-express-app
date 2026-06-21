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

/* ──── Topic gating ────────────────────────────────────────────────────────
 * Brand-new learners shouldn't be confronted with 20 paths at once. Only the
 * three "starter" paths are available out of the box; the rest unlock as the
 * learner progresses, or all at once via the skill-check assessment.
 *
 * A topic unlocks when:
 *   (a) it is a starter, or
 *   (b) every prereq topic has cleared its first checkpoint (5 levels passed), or
 *   (c) the skill-check assessment has explicitly unlocked it.
 *
 * Prereqs are intentionally a shallow graph so the path from zero → hero stays
 * obvious: master JS basics, then HTML+CSS for React, then specialise.
 */
export const STARTER_TOPICS: RoadmapTopic[] = ['html', 'css', 'javascript'];

// Levels of each prereq topic that must be passed before a topic unlocks.
// 5 = "first checkpoint cleared" — the natural milestone in each path.
export const LEVELS_TO_UNLOCK_NEXT = LEVELS_PER_CHECKPOINT;

export const TOPIC_PREREQS: Record<RoadmapTopic, RoadmapTopic[]> = {
  // Starters: no prereqs, always open.
  html: [],
  css: [],
  javascript: [],
  // Tier 2 — anything that builds directly on JS fundamentals.
  typescript: ['javascript'],
  abbreviations: ['javascript'],
  general: ['javascript'],
  git: ['javascript'],
  dsa: ['javascript'],
  algorithms: ['javascript'],
  nodejs: ['javascript'],
  testing: ['javascript'],
  ai: ['javascript'],
  'cool-stuff': ['javascript'],
  security: ['javascript'],
  // React needs the page-building trio (HTML + CSS + JS).
  react: ['javascript', 'html', 'css'],
  // Topics that build on React or Node.
  nextjs: ['react'],
  'rhf-zod': ['react'],
  databases: ['nodejs'],
  'system-design': ['nodejs'],
  devops: ['nodejs'],
};

// Unlock tiers granted by the skill-check assessment. Each correct-answer band
// merges the listed topics into `extraUnlocked` so the learner can skip prereqs.
export const ASSESSMENT_QUESTION_COUNT = 20;
const ASSESSMENT_TIERS: { minCorrect: number; unlocks: RoadmapTopic[] }[] = [
  {
    minCorrect: 18,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'cool-stuff', 'security',
      'react', 'nextjs', 'rhf-zod',
      'databases', 'system-design', 'devops',
    ],
  },
  {
    minCorrect: 14,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'cool-stuff', 'react',
    ],
  },
  {
    minCorrect: 10,
    unlocks: ['typescript', 'abbreviations', 'general', 'git'],
  },
];

/** Topics granted by an assessment scoring `correct` out of `total`. */
export function topicsFromAssessment(correct: number): RoadmapTopic[] {
  const tier = ASSESSMENT_TIERS.find((t) => correct >= t.minCorrect);
  return tier ? tier.unlocks : [];
}

const PROGRESS_KEY = 'devquiz:roadmap:v2';
const UNLOCKS_KEY = 'devquiz:roadmap:unlocks:v1';
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

/** Imperative snapshot of the current roadmap progress (for XP computations). */
export function getRoadmapProgress(): RoadmapProgress {
  return readProgress();
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

/* ──── Topic unlock state ───────────────────────────────────────────────── */

// Extra-unlocked topics live in their own localStorage entry so resetting
// roadmap progress doesn't accidentally relock skill-check rewards.
const readExtraUnlocks = (): RoadmapTopic[] =>
  readJSON<RoadmapTopic[]>(UNLOCKS_KEY, []);

const writeExtraUnlocks = (next: RoadmapTopic[]): void => {
  writeJSON(UNLOCKS_KEY, next);
  unlocksStore.emit();
};

const unlocksStore = createStore<RoadmapTopic[]>(readExtraUnlocks);

/** Live view of the topics unlocked by the skill-check assessment. */
export function useExtraUnlocks(): RoadmapTopic[] {
  return useStore(unlocksStore);
}

/** Imperative snapshot of skill-check-unlocked topics. */
export function getExtraUnlocks(): RoadmapTopic[] {
  return readExtraUnlocks();
}

/** Merge `topics` into the extra-unlocks set. Returns the topics that were new. */
export function unlockExtraTopics(topics: RoadmapTopic[]): RoadmapTopic[] {
  const current = new Set(readExtraUnlocks());
  const added: RoadmapTopic[] = [];
  for (const t of topics) {
    if (!current.has(t)) {
      current.add(t);
      added.push(t);
    }
  }
  if (added.length > 0) writeExtraUnlocks(Array.from(current));
  return added;
}

/** True if every prereq of `topic` has cleared its first checkpoint. */
function prereqsMet(p: RoadmapProgress, topic: RoadmapTopic): boolean {
  const reqs = TOPIC_PREREQS[topic] ?? [];
  if (reqs.length === 0) return true;
  return reqs.every((req) => passedLevelCount(p, req) >= LEVELS_TO_UNLOCK_NEXT);
}

/**
 * Whether the learner can open `topic`'s path. Starters are always unlocked;
 * other topics unlock once their prereqs are cleared OR they were granted by
 * the skill-check assessment.
 */
export function isTopicUnlocked(
  p: RoadmapProgress,
  topic: RoadmapTopic,
  extra: RoadmapTopic[] | Set<RoadmapTopic> = [],
): boolean {
  if (STARTER_TOPICS.includes(topic)) return true;
  const set = extra instanceof Set ? extra : new Set(extra);
  if (set.has(topic)) return true;
  return prereqsMet(p, topic);
}

/** Human-readable reason a topic is locked (e.g. "Pass JavaScript level 5"). */
export function topicUnlockHint(
  p: RoadmapProgress,
  topic: RoadmapTopic,
  topicLabel: (t: RoadmapTopic) => string,
): string {
  const reqs = TOPIC_PREREQS[topic] ?? [];
  const unmet = reqs.filter((req) => passedLevelCount(p, req) < LEVELS_TO_UNLOCK_NEXT);
  if (unmet.length === 0) return '';
  return unmet
    .map((req) => `${topicLabel(req)} · ${passedLevelCount(p, req)}/${LEVELS_TO_UNLOCK_NEXT}`)
    .join(' · ');
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
