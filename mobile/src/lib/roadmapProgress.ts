// Per-user roadmap progress, stored locally (AsyncStorage) and, when signed in,
// synced to the same `roadmap_progress` account record the web app uses.
//
// This mirrors client/src/lib/roadmap.ts so the unlock rules AND the on-disk
// shape match across web and mobile. Two things it deliberately keeps identical
// to web (they used to diverge and caused cross-client bugs):
//   • The PARTS model — each topic is shown as PARTS_PER_TOPIC sequential parts,
//     and a part's end-of-part test is stored in the topic's `checkpoints` map
//     keyed by the PART number (1..3), exactly like web. Mobile previously keyed
//     by 5-level checkpoint number (1..5), which collided with web in the shared
//     record.
//   • The account `extra` blob (skill-check unlocks + token wallet + shop
//     inventory) is preserved on every push, so a mobile lesson never wipes what
//     the web app stored.
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import type { RoadmapTopic } from './roadmapApi';

// Pass thresholds (must match lib/roadmap.ts on the server).
export const LEVEL_PASS = 75;
export const CHECKPOINT_PASS = 85;
export const LEVELS_PER_CHECKPOINT = 5;

const KEY = 'devquiz:roadmap:v2';
const UNLOCKS_KEY = 'devquiz:roadmap:unlocks:v1';
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

/* ──── derived helpers (match the web unlock rules) ─────────────────────── */

export const isLevelPassed = (p: RoadmapProgress, topic: RoadmapTopic, level: number): boolean =>
  p[topic]?.levels?.[String(level)]?.passed ?? false;
export const levelBestPct = (p: RoadmapProgress, topic: RoadmapTopic, level: number): number =>
  p[topic]?.levels?.[String(level)]?.bestPct ?? 0;

export function passedLevelCount(p: RoadmapProgress, topic: RoadmapTopic): number {
  return Object.values(p[topic]?.levels ?? {}).filter((e) => e.passed).length;
}

/* ──── Parts ("learning paths" split) ───────────────────────────────────────
 * Each topic is shown as PARTS_PER_TOPIC shorter, sequential paths — every part
 * ends with its own test. A part is a contiguous slice of the topic's GLOBAL
 * levels. Level passes stay keyed by global level number; a part test is stored
 * in the topic's `checkpoints` map keyed by the part number (1..PARTS_PER_TOPIC),
 * identical to client/src/lib/roadmap.ts.
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

export function isValidPart(part: number): boolean {
  return Number.isInteger(part) && part >= 1 && part <= PARTS_PER_TOPIC;
}

/**
 * What to play after finishing a level or a part test, given the topic's level
 * count. After the last level of a part → that part's test. After a part test →
 * the first level of the next part (or nothing if it was the last).
 */
export function nextAfter(
  kind: 'level' | 'test',
  ref: number,
  levelCount: number,
): { kind: 'level' | 'test'; ref: number } | null {
  const ranges = partRanges(levelCount);
  if (kind === 'level') {
    const range = ranges.find((r) => ref >= r.startLevel && ref <= r.endLevel);
    if (!range) return null;
    if (ref < range.endLevel) return { kind: 'level', ref: ref + 1 };
    return { kind: 'test', ref: range.part };
  }
  const nextRange = ranges[ref]; // ref is 1-based part number → ranges[ref] is the next part
  if (nextRange && nextRange.size > 0) return { kind: 'level', ref: nextRange.startLevel };
  return null;
}

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

/** A global level is unlocked if it's the first of an (open) part, else the previous passed. */
export function isPartLevelUnlocked(p: RoadmapProgress, family: RoadmapTopic, range: PartRange, globalLevel: number): boolean {
  if (globalLevel <= range.startLevel) return true;
  return isLevelPassed(p, family, globalLevel - 1);
}

/** A part's test unlocks once every level in the part is passed. */
export function isPartTestUnlocked(p: RoadmapProgress, family: RoadmapTopic, range: PartRange): boolean {
  if (range.size <= 0) return false;
  return partPassedLevels(p, family, range) >= range.size;
}

/** Whether a path (part) is open: family unlocked AND (first part OR prev part test passed). */
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

/* ──── Topic gating (starters + prereqs + skill-check unlocks) ───────────── */

export const STARTER_TOPICS: RoadmapTopic[] = ['html', 'css', 'javascript'];
export const LEVELS_TO_UNLOCK_NEXT = LEVELS_PER_CHECKPOINT;

export const TOPIC_PREREQS: Record<RoadmapTopic, RoadmapTopic[]> = {
  html: [],
  css: [],
  javascript: [],
  internet: [],
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
  react: ['javascript', 'html', 'css'],
  nextjs: ['react'],
  'rhf-zod': ['react'],
  databases: ['nodejs'],
  'system-design': ['nodejs'],
  devops: ['nodejs'],
};

export const ASSESSMENT_QUESTION_COUNT = 20;
const ASSESSMENT_TIERS: { minCorrect: number; unlocks: RoadmapTopic[] }[] = [
  {
    minCorrect: 18,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'security', 'react', 'nextjs', 'rhf-zod',
      'databases', 'system-design', 'devops',
    ],
  },
  {
    minCorrect: 14,
    unlocks: ['typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms', 'nodejs', 'testing', 'ai', 'react'],
  },
  { minCorrect: 10, unlocks: ['typescript', 'abbreviations', 'general', 'git'] },
];

export function topicsFromAssessment(correct: number): RoadmapTopic[] {
  const tier = ASSESSMENT_TIERS.find((t) => correct >= t.minCorrect);
  return tier ? tier.unlocks : [];
}

const readExtraUnlocks = (): RoadmapTopic[] => readJSON<RoadmapTopic[]>(UNLOCKS_KEY, []);
const unlocksStore = createStore<RoadmapTopic[]>(readExtraUnlocks);
const writeExtraUnlocks = (next: RoadmapTopic[]): void => {
  writeJSON(UNLOCKS_KEY, next);
  unlocksStore.emit();
};

export function useExtraUnlocks(): RoadmapTopic[] {
  return useStore(unlocksStore);
}
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
  if (added.length > 0) {
    writeExtraUnlocks(Array.from(current));
    void pushProgressToServer();
  }
  return added;
}

function prereqsMet(p: RoadmapProgress, topic: RoadmapTopic): boolean {
  const reqs = TOPIC_PREREQS[topic] ?? [];
  if (reqs.length === 0) return true;
  return reqs.every((req) => passedLevelCount(p, req) >= LEVELS_TO_UNLOCK_NEXT);
}

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

/** Human-readable reason a topic is locked (e.g. "JavaScript · 2/5"). */
export function topicUnlockHint(
  p: RoadmapProgress,
  topic: RoadmapTopic,
  topicLabel: (t: RoadmapTopic) => string,
): string {
  const reqs = TOPIC_PREREQS[topic] ?? [];
  const unmet = reqs.filter((req) => passedLevelCount(p, req) < LEVELS_TO_UNLOCK_NEXT);
  if (unmet.length === 0) return '';
  return unmet.map((req) => `${topicLabel(req)} · ${passedLevelCount(p, req)}/${LEVELS_TO_UNLOCK_NEXT}`).join(' · ');
}

/* ──── account sync (progress + extra: unlocks + wallet + inventory) ─────── */

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

/** Shape tokens + shop contribute to the account-synced blob. */
export interface AccountExtras {
  wallet: { balance: number };
  inventory: { owned: string[]; ring: string | null; flair: string | null; doubleXp: number };
}

interface RawExtra {
  unlocked: string[];
  wallet?: { balance: number };
  inventory?: { owned: string[]; ring: string | null; flair: string | null; doubleXp: number };
}

// tokens.ts + shop.ts register a getter/receiver here so this module can PUT the
// whole synced blob without importing them (avoids a cycle).
let accountExtrasSource: (() => AccountExtras) | null = null;
let onAccountExtrasReceived: ((extras: AccountExtras) => void) | null = null;

export function registerAccountExtras(
  source: () => AccountExtras,
  onReceive: (extras: AccountExtras) => void,
): void {
  accountExtrasSource = source;
  onAccountExtrasReceived = onReceive;
}

// The last extras we saw from the server. Used as a floor so a push before the
// gamification libs are wired never wipes the account's wallet/inventory.
let lastServerExtra: RawExtra | null = null;

const mergeUnlocked = (a: string[] = [], b: string[] = []): string[] => Array.from(new Set([...a, ...b]));

function buildExtraForPush(): RawExtra {
  const localUnlocked = getExtraUnlocks();
  if (accountExtrasSource) {
    const a = accountExtrasSource();
    return {
      unlocked: mergeUnlocked(lastServerExtra?.unlocked, localUnlocked),
      wallet: a.wallet,
      inventory: a.inventory,
    };
  }
  if (lastServerExtra) {
    return { ...lastServerExtra, unlocked: mergeUnlocked(lastServerExtra.unlocked, localUnlocked) };
  }
  return { unlocked: localUnlocked };
}

/**
 * PUT local progress + extra to the account. CRITICAL: always sends the `extra`
 * blob (unlocks + wallet + inventory), never a bare `{ data }`. When we have no
 * knowledge of the server's extras yet (no gamification source registered and no
 * prior sync), it does a read-modify-write so it can't clobber wallet/inventory.
 */
export async function pushProgressToServer(): Promise<void> {
  try {
    if (!accountExtrasSource && !lastServerExtra) {
      // Unknown server extras — fetch them first so the PUT preserves them.
      try {
        const res = await apiFetch<{ extra?: RawExtra }>(PROGRESS_GET);
        lastServerExtra = res.extra ?? { unlocked: [] };
      } catch {
        return; // not signed in / offline — local stays source of truth
      }
    }
    await apiFetch(PROGRESS_PUT, {
      method: 'PUT',
      body: JSON.stringify({ data: cache, extra: buildExtraForPush() }),
    });
  } catch {
    // best effort
  }
}

export async function syncProgressWithServer(): Promise<void> {
  let server: RoadmapProgress = {};
  try {
    const res = await apiFetch<{ data: RoadmapProgress; extra?: RawExtra }>(PROGRESS_GET);
    server = res.data ?? {};
    lastServerExtra = res.extra ?? { unlocked: [] };
  } catch {
    return;
  }
  cache = mergeProgress(cache, server);
  await persist();
  emit();

  // Union skill-check unlocks (local + server).
  const known = new Set(Object.keys(TOPIC_PREREQS));
  const serverUnlocked = (lastServerExtra.unlocked ?? []).filter((id): id is RoadmapTopic => known.has(id));
  const local = getExtraUnlocks();
  const union = Array.from(new Set<RoadmapTopic>([...local, ...serverUnlocked]));
  if (union.length !== local.length) writeExtraUnlocks(union);

  // Hand wallet + inventory to the gamification libs (they max/union-merge).
  if (onAccountExtrasReceived) {
    const inv = lastServerExtra.inventory;
    onAccountExtrasReceived({
      wallet: { balance: typeof lastServerExtra.wallet?.balance === 'number' ? lastServerExtra.wallet.balance : 0 },
      inventory: {
        owned: Array.isArray(inv?.owned) ? inv!.owned : [],
        ring: typeof inv?.ring === 'string' ? inv!.ring : null,
        flair: typeof inv?.flair === 'string' ? inv!.flair : null,
        doubleXp: typeof inv?.doubleXp === 'number' ? inv!.doubleXp : 0,
      },
    });
  }

  await pushProgressToServer();
}
