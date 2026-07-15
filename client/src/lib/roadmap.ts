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
export const STARTER_TOPICS: RoadmapTopic[] = ['html', 'css', 'javascript', 'continents', 'capitals', 'flags', 'arithmetic', 'fractions', 'prealgebra', 'prehistory', 'ancient', 'classical', 'rules', 'pieces', 'notation'];

// Levels of each prereq topic that must be passed before a topic unlocks.
// 5 = "first checkpoint cleared" — the natural milestone in each path.
export const LEVELS_TO_UNLOCK_NEXT = LEVELS_PER_CHECKPOINT;

export const TOPIC_PREREQS: Record<RoadmapTopic, RoadmapTopic[]> = {
  // Starters: no prereqs, always open.
  html: [],
  css: [],
  javascript: [],
  // Foundational concept paths anyone can start cold — no prereqs.
  internet: [],
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
  // Geography
  // Starters: no prereqs, always open.
  continents: [],
  capitals: [],
  flags: [],
  // Tier 2 — physical geography builds on knowing the continents & oceans.
  landforms: ['continents'],
  climate: ['continents'],
  cartography: ['continents'],
  // Tier 2 — human geography builds on knowing the countries & capitals.
  population: ['capitals'],
  political: ['capitals'],
  // Tier 3 — the deeper syntheses.
  economic: ['population'],
  earth: ['landforms'],
  // Math
  // Starters: no prereqs, always open.
  arithmetic: [],
  fractions: [],
  prealgebra: [],
  // Tier 2 — builds on the number sense from arithmetic/fractions/pre-algebra.
  algebra: ['prealgebra'],
  geometry: ['prealgebra'],
  statistics: ['fractions'],
  // Tier 3 — high-school math that leans on algebra & geometry.
  trigonometry: ['geometry', 'algebra'],
  precalculus: ['algebra'],
  // Tier 4 — higher math.
  calculus: ['precalculus', 'trigonometry'],
  'linear-algebra': ['algebra'],
  // History
  // Starters: no prereqs, always open (the earliest three eras).
  prehistory: [],
  ancient: [],
  classical: [],
  // Each later era unlocks once the previous one has cleared its first checkpoint.
  medieval: ['classical'],
  renaissance: ['medieval'],
  earlymodern: ['renaissance'],
  industrial: ['earlymodern'],
  worldwars: ['industrial'],
  coldwar: ['worldwars'],
  modern: ['coldwar'],
  // Chess
  // Starters: no prereqs, always open.
  rules: [],
  pieces: [],
  notation: [],
  // Tier 2 — build directly on knowing how the pieces move.
  specialmoves: ['pieces'],
  checkmate: ['pieces'],
  // Tier 3 — the competitive skills, once you can deliver mate.
  openings: ['pieces', 'checkmate'],
  tactics: ['pieces', 'checkmate'],
  endgames: ['checkmate'],
  // Tier 4 — the deepest topics.
  strategy: ['openings', 'tactics'],
  combinations: ['tactics'],
  'discrete-math': ['algebra'],
  'number-theory': ['algebra'],
  'multivariable-calculus': ['calculus'],
  'differential-equations': ['calculus'],
  'real-analysis': ['calculus'],
  'geomorphology': ['landforms'],
  'oceanography': ['earth'],
  'biogeography': ['climate'],
  'geopolitics': ['political'],
  'gis': ['cartography'],
  'historiography': ['ancient'],
  'history-of-science': ['renaissance'],
  'economic-history': ['industrial'],
  'intellectual-history': ['classical'],
  'military-history': ['classical'],
};

// Unlock tiers granted by the skill-check assessment. Each correct-answer band
// merges the listed topics into `extraUnlocked` so the learner can skip prereqs.
export const ASSESSMENT_QUESTION_COUNT = 20;
const ASSESSMENT_TIERS: { minCorrect: number; unlocks: RoadmapTopic[] }[] = [
  {
    minCorrect: 18,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'security',
      'react', 'nextjs', 'rhf-zod',
      'databases', 'system-design', 'devops',
    ],
  },
  {
    minCorrect: 14,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'react',
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

/* ──── Parts ("learning paths" split) ───────────────────────────────────────
 * Each topic is shown as PARTS_PER_TOPIC shorter, sequential paths instead of
 * one long ladder — every part ends with its own test. A part is a contiguous
 * slice of the topic's GLOBAL levels, derived from the (live) level count so the
 * split stays in sync with the server. Per-part progress reuses the existing
 * per-topic maps: level passes stay keyed by their global level number, and a
 * part test is stored in the topic's `checkpoints` map keyed by the part number
 * (1..PARTS_PER_TOPIC). For the common 15-level topics the part ranges line up
 * exactly with the old 5-level checkpoints, so existing progress carries over.
 * ─────────────────────────────────────────────────────────────────────────── */

export const PARTS_PER_TOPIC = 3;
export const PART_TEST_PASS = CHECKPOINT_PASS;

/** Split a level count into PARTS_PER_TOPIC contiguous sizes (extra → earlier parts). */
export function partSizes(levelCount: number): number[] {
  const n = Math.max(0, Math.floor(levelCount));
  const base = Math.floor(n / PARTS_PER_TOPIC);
  const rem = n % PARTS_PER_TOPIC;
  return Array.from({ length: PARTS_PER_TOPIC }, (_, i) => base + (i < rem ? 1 : 0));
}

export interface PartRange {
  /** 1-based part number (1..PARTS_PER_TOPIC). */
  part: number;
  /** First / last GLOBAL level (1-based, inclusive) covered by this part. */
  startLevel: number;
  endLevel: number;
  size: number;
}

/** Contiguous global-level ranges for each part of a topic with `levelCount` levels. */
export function partRanges(levelCount: number): PartRange[] {
  const sizes = partSizes(levelCount);
  const ranges: PartRange[] = [];
  let start = 1;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    ranges.push({ part: i + 1, startLevel: start, endLevel: start + size - 1, size });
    start += size;
  }
  return ranges;
}

/** Build a path id ("javascript-2") and parse it back, family ids may contain '-'. */
export const makePathId = (family: RoadmapTopic, part: number): string => `${family}-${part}`;
export function parsePathId(id: string): { family: RoadmapTopic; part: number } | null {
  const idx = id.lastIndexOf('-');
  if (idx <= 0) return null;
  const family = id.slice(0, idx) as RoadmapTopic;
  const part = parseInt(id.slice(idx + 1), 10);
  if (!Number.isInteger(part) || part < 1 || part > PARTS_PER_TOPIC) return null;
  if (!(Object.keys(TOPIC_PREREQS) as string[]).includes(family)) return null;
  return { family, part };
}

export const fetchRoadmapPartTest = (family: RoadmapTopic, part: number, lang: string, signal?: AbortSignal): Promise<RoadmapPlayable> => {
  const params = new URLSearchParams({ topic: family, test: String(part), lang });
  return apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`, { signal });
};

/* part-test results live in the topic's checkpoints map, keyed by part number */
export const recordPartTestResult = (family: RoadmapTopic, part: number, pct: number, passPct = PART_TEST_PASS) =>
  record('checkpoints', family, part, pct, passPct);
export const isPartTestPassed = (p: RoadmapProgress, family: RoadmapTopic, part: number): boolean =>
  p[family]?.checkpoints?.[String(part)]?.passed ?? false;
export const partTestBestPct = (p: RoadmapProgress, family: RoadmapTopic, part: number): number =>
  p[family]?.checkpoints?.[String(part)]?.bestPct ?? 0;

/** Levels passed within a part's global range. */
export function partPassedLevels(p: RoadmapProgress, family: RoadmapTopic, range: PartRange): number {
  let n = 0;
  for (let l = range.startLevel; l <= range.endLevel; l++) if (isLevelPassed(p, family, l)) n++;
  return n;
}

/** A global level is unlocked if it's the first of an (already unlocked) part, else the previous passed. */
export function isPartLevelUnlocked(p: RoadmapProgress, family: RoadmapTopic, range: PartRange, globalLevel: number): boolean {
  if (globalLevel <= range.startLevel) return true;
  return isLevelPassed(p, family, globalLevel - 1);
}

/** A part's test unlocks once every level in the part is passed. */
export function isPartTestUnlocked(p: RoadmapProgress, family: RoadmapTopic, range: PartRange): boolean {
  if (range.size <= 0) return false;
  return partPassedLevels(p, family, range) >= range.size;
}

/**
 * Whether a path (part) is open: its family must be unlocked, and either it's
 * the first part or the previous part's test has been passed.
 */
export function isPathUnlocked(
  p: RoadmapProgress,
  family: RoadmapTopic,
  part: number,
  extra: RoadmapTopic[] | Set<RoadmapTopic> = [],
): boolean {
  if (!isTopicUnlocked(p, family, extra)) return false;
  if (part <= 1) return true;
  return isPartTestPassed(p, family, part - 1);
}

export type PathStatus = 'locked' | 'available' | 'in-progress' | 'complete';

/** Coarse state of a single path (part) for the tree + part selector. */
export function pathStatus(
  p: RoadmapProgress,
  family: RoadmapTopic,
  ranges: PartRange[],
  part: number,
  extra: RoadmapTopic[] | Set<RoadmapTopic> = [],
): PathStatus {
  const range = ranges[part - 1];
  if (!range || !isPathUnlocked(p, family, part, extra)) return 'locked';
  if (isPartTestPassed(p, family, part)) return 'complete';
  return partPassedLevels(p, family, range) > 0 ? 'in-progress' : 'available';
}

/** The part a learner should land on: the first unlocked, not-yet-complete part. */
export function currentPart(
  p: RoadmapProgress,
  family: RoadmapTopic,
  ranges: PartRange[],
  extra: RoadmapTopic[] | Set<RoadmapTopic> = [],
): number {
  let lastUnlocked = 1;
  for (let part = 1; part <= ranges.length; part++) {
    if (!isPathUnlocked(p, family, part, extra)) break;
    lastUnlocked = part;
    if (!isPartTestPassed(p, family, part)) return part;
  }
  return lastUnlocked;
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

/** Shape of what tokens.ts + shop.ts contribute to the account-synced blob. */
export interface AccountExtras {
  wallet: { balance: number };
  inventory: { owned: string[]; ring: string | null; flair: string | null; doubleXp: number };
}

// tokens.ts and shop.ts each register a getter here so this module can PUT
// the whole synced blob in one request without importing them (which would
// create a cycle: shop -> roadmap -> shop).
let accountExtrasSource: (() => AccountExtras) | null = null;
let onAccountExtrasReceived: ((extras: AccountExtras) => void) | null = null;

export function registerAccountExtras(
  source: () => AccountExtras,
  onReceive: (extras: AccountExtras) => void,
): void {
  accountExtrasSource = source;
  onAccountExtrasReceived = onReceive;
}

function readAccountExtras(): AccountExtras {
  return accountExtrasSource?.() ?? {
    wallet: { balance: 0 },
    inventory: { owned: [], ring: null, flair: null, doubleXp: 0 },
  };
}

/** PUT the current (or given) local progress + unlocks + wallet + inventory. */
export async function pushProgressToServer(
  progress: RoadmapProgress = readProgress(),
  extraUnlocks: RoadmapTopic[] = readExtraUnlocks(),
): Promise<void> {
  const account = readAccountExtras();
  await apiFetch(PROGRESS_PUT, {
    method: 'PUT',
    body: JSON.stringify({
      data: progress,
      extra: {
        unlocked: extraUnlocks,
        wallet: account.wallet,
        inventory: account.inventory,
      },
    }),
  });
}

/**
 * Fire the same PUT with `keepalive: true` so the request survives the tab
 * closing (Chrome/Safari finish it after unload). Used from the pagehide /
 * visibilitychange flush so no learner ever loses a lesson pass by closing
 * the tab a beat too early. Best-effort — errors are swallowed.
 *
 * Skips itself when signed out (the endpoint would 401 anyway) by only
 * running if a Supabase access token is already in memory.
 */
export function flushProgressBeacon(): void {
  try {
    const account = readAccountExtras();
    const payload = JSON.stringify({
      data: readProgress(),
      extra: {
        unlocked: readExtraUnlocks(),
        wallet: account.wallet,
        inventory: account.inventory,
      },
    });
    // The auth Bearer is read via getAccessToken() inside apiFetch, which is
    // async — we can't await here. Use the plain fetch with the stored token
    // reference; if missing we just skip (guest users have nothing to sync).
    const token = readCachedAccessToken();
    if (!token) return;
    void fetch(PROGRESS_PUT, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: payload,
    });
  } catch {
    // Absolutely best-effort — do not throw during unload.
  }
}

// Auth cache accessor set by lib/auth on session change so beacons can read
// the current token synchronously (supabase-js exposes an async getSession(),
// which is unusable inside pagehide).
let readCachedAccessToken: () => string | null = () => null;
export function registerAccessTokenReader(fn: () => string | null): void {
  readCachedAccessToken = fn;
}
/** Public wrapper for other modules (xp.ts) that need the cached token. */
export function getCachedAccessTokenForBeacon(): string | null {
  return readCachedAccessToken();
}

/**
 * Install one-time listeners that flush any pending sync when the tab
 * becomes hidden or unloads. `pagehide` covers Safari (which doesn't fire
 * `beforeunload` for the back/forward cache); `visibilitychange` covers
 * mobile Chrome swipes. Both use fetch keepalive so the request completes
 * even after the tab dies.
 */
export function installProgressSyncFlusher(): void {
  if (typeof window === 'undefined') return;
  const flush = () => flushProgressBeacon();
  window.addEventListener('pagehide', flush);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

// On sign-in: pull the account's progress + wallet + inventory, merge each
// with whatever is on this device (progress: latch pass + max score; unlocks:
// union; balance: max — tokens can only grow; owned items: union; equipped
// items: server wins if valid, otherwise local; doubleXp charges: max), store
// the union locally, and push it back so both sides agree.
export async function syncProgressWithServer(): Promise<void> {
  interface ServerExtras {
    unlocked?: string[];
    wallet?: { balance?: number };
    inventory?: { owned?: string[]; ring?: string | null; flair?: string | null; doubleXp?: number };
  }
  let serverProgress: RoadmapProgress = {};
  let serverExtras: ServerExtras = {};
  try {
    const res = await apiFetch<{ data: RoadmapProgress; extra?: ServerExtras }>(PROGRESS_GET);
    serverProgress = res.data ?? {};
    serverExtras = res.extra ?? {};
  } catch {
    return; // not signed in or offline — keep local only
  }
  const mergedProgress = mergeProgress(readProgress(), serverProgress);
  writeProgress(mergedProgress);

  const serverUnlocked = (serverExtras.unlocked ?? []).filter((id): id is RoadmapTopic =>
    (Object.keys(TOPIC_PREREQS) as string[]).includes(id),
  ) as RoadmapTopic[];
  const local = readExtraUnlocks();
  const union = Array.from(new Set<RoadmapTopic>([...local, ...serverUnlocked]));
  if (union.length !== local.length) writeExtraUnlocks(union);

  // Merge wallet + inventory via the registered receiver (tokens.ts + shop.ts).
  if (onAccountExtrasReceived) {
    const inv = serverExtras.inventory ?? {};
    onAccountExtrasReceived({
      wallet: { balance: typeof serverExtras.wallet?.balance === 'number' ? serverExtras.wallet.balance : 0 },
      inventory: {
        owned: Array.isArray(inv.owned) ? inv.owned : [],
        ring: typeof inv.ring === 'string' ? inv.ring : null,
        flair: typeof inv.flair === 'string' ? inv.flair : null,
        doubleXp: typeof inv.doubleXp === 'number' ? inv.doubleXp : 0,
      },
    });
  }

  try {
    await pushProgressToServer(mergedProgress, union);
  } catch {
    // best-effort; local is already updated
  }
}
