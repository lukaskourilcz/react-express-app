// Experience-point store: the "quest" XP accumulator (localStorage-backed, with
// optional account sync) plus the live total (learning XP + quest XP) and the
// toaster event bus that announces XP gains and rank-ups.
//
// XP is counted PER SUBJECT (platform): each subject has its own quest
// accumulator, its own learning XP (derived from that subject's roadmap
// progress only) and its own rank. Every hook/getter here is scoped to the
// active subject, so switching platforms switches the whole XP picture.
//
// Learning XP is a pure function of roadmap progress, so it is never stored —
// only the quest accumulators are persisted and synced. Total XP and the rank
// are always recomputed from (subject progress + subject quest).

import { apiFetch } from './api';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { useRoadmapProgress, getRoadmapProgress, getCachedAccessTokenForBeacon } from './roadmap';
import {
  computeLearningXp,
  levelForXp,
  PRACTICE_XP,
  type LevelInfo,
} from './leveling';
import { rankLabelFor, getTrack } from './tracks';
import { awardTokens, tokensFromXp } from './tokens';
import { consumeDoubleXpCharge } from './shop';
import { getSubject, useSubject, isSubjectId, topicSetForSubject, type SubjectId } from './subjects';

// v1 held ONE global accumulator shared by every subject; v2 keys XP by subject.
const QUEST_KEY_LEGACY = 'devquiz:xp:quest:v1';
const QUEST_KEY = 'devquiz:xp:quest:v2';
// The highest rank the learner has been shown reaching (per subject), so we only
// celebrate a rank-up once (and stay quiet if a sync ever revises XP downward).
const RANK_SEEN_KEY_LEGACY = 'devquiz:xp:rank-seen:v1';
const RANK_SEEN_KEY = 'devquiz:xp:rank-seen:v2';
const XP_GET = '/api/user/xp';
const XP_PUT = '/api/user/xp';

const MAX_XP = 100_000_000;
const clampXp = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.min(MAX_XP, Math.round(n)) : 0);

type QuestMap = Partial<Record<SubjectId, number>>;

/* ──── quest XP store (per subject) ─────────────────────────────────────── */

function sanitizeQuestMap(raw: unknown): QuestMap {
  const out: QuestMap = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSubjectId(k)) continue;
    const xp = clampXp(typeof v === 'number' ? v : 0);
    if (xp > 0) out[k] = xp;
  }
  return out;
}

function readQuestMap(): QuestMap {
  const raw = readJSON<Record<string, unknown> | null>(QUEST_KEY, null);
  if (raw !== null) return sanitizeQuestMap(raw);
  // One-time migration: pre-split quest XP was a single accumulator shared by
  // all subjects. Attribute it to the subject active right now — exact on a
  // standalone deploy, and the learner's main platform on StudyShark.
  const legacy = clampXp(readJSON<number>(QUEST_KEY_LEGACY, 0));
  const migrated: QuestMap = legacy > 0 ? { [getSubject()]: legacy } : {};
  writeJSON(QUEST_KEY, migrated);
  return migrated;
}

const questStore = createStore<QuestMap>(readQuestMap);

/** Live quest-XP accumulator for the ACTIVE subject. */
export function useQuestXp(): number {
  const map = useStore(questStore);
  const [subject] = useSubject();
  return map[subject] ?? 0;
}

const readQuest = (subject: SubjectId = getSubject()): number => readQuestMap()[subject] ?? 0;

function writeQuest(subject: SubjectId, value: number): void {
  writeJSON(QUEST_KEY, { ...readQuestMap(), [subject]: clampXp(value) });
  questStore.emit();
}

function writeQuestMap(map: QuestMap): void {
  writeJSON(QUEST_KEY, sanitizeQuestMap(map));
  questStore.emit();
}

const sumQuest = (map: QuestMap): number =>
  clampXp(Object.values(map).reduce<number>((acc, v) => acc + (v ?? 0), 0));

/* ──── total + rank (per subject) ───────────────────────────────────────── */

/** Imperative total XP (learning + quest) for the active subject. */
export function getTotalXp(): number {
  const subject = getSubject();
  return computeLearningXp(getRoadmapProgress(), topicSetForSubject(subject)) + readQuest(subject);
}

/** Live total XP for the active subject; re-renders when progress, quest XP or the subject changes. */
export function useTotalXp(): number {
  const progress = useRoadmapProgress();
  const map = useStore(questStore);
  const [subject] = useSubject();
  return computeLearningXp(progress, topicSetForSubject(subject)) + (map[subject] ?? 0);
}

/** Live career rank info derived from the active subject's total XP. */
export function useLevelInfo(): LevelInfo {
  return levelForXp(useTotalXp());
}

/* ──── toaster event bus ────────────────────────────────────────────────── */

export type XpToast =
  | { kind: 'gain'; amount: number; source: 'learn' | 'quiz' | 'practice' }
  | { kind: 'rankup'; title: string; level: number };

const toastListeners = new Set<(t: XpToast) => void>();

/** Subscribe to XP toasts (gains + rank-ups). Returns an unsubscribe fn. */
export function onXpToast(listener: (t: XpToast) => void): () => void {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

const emitToast = (t: XpToast) => toastListeners.forEach((l) => l(t));

type RankSeenMap = Partial<Record<SubjectId, number>>;

function readRankSeen(subject: SubjectId): number {
  const map = readJSON<RankSeenMap | null>(RANK_SEEN_KEY, null);
  if (map && typeof map === 'object') {
    const v = map[subject];
    return typeof v === 'number' && Number.isFinite(v) ? v : 1;
  }
  // Migration: the old single marker tracked the mixed-total rank; carry it to
  // the subject active now (the one whose XP the legacy total migrated to).
  const legacy = readJSON<number>(RANK_SEEN_KEY_LEGACY, 1);
  writeJSON(RANK_SEEN_KEY, { [getSubject()]: legacy });
  return subject === getSubject() ? legacy : 1;
}

function writeRankSeen(subject: SubjectId, level: number): void {
  const map = readJSON<RankSeenMap>(RANK_SEEN_KEY, {});
  writeJSON(RANK_SEEN_KEY, { ...(map && typeof map === 'object' ? map : {}), [subject]: level });
}

// Compare the active subject's rank to the last one we celebrated for it;
// announce a rank-up the first time the learner crosses into a higher rank.
function reconcileRank(announce: boolean): LevelInfo {
  const subject = getSubject();
  const info = levelForXp(getTotalXp());
  const seen = readRankSeen(subject);
  if (info.level > seen) {
    writeRankSeen(subject, info.level);
    if (announce) {
      const title = rankLabelFor(info.rank, getTrack()).title;
      emitToast({ kind: 'rankup', title, level: info.level });
    }
  } else if (info.level < seen) {
    writeRankSeen(subject, info.level); // keep the marker honest after a revision
  }
  return info;
}

/* ──── awarding XP ──────────────────────────────────────────────────────── */

/** Award quest XP (quiz or practice) to the active subject, toast it, and check for a rank-up. */
export function awardQuestXp(amount: number, source: 'quiz' | 'practice'): void {
  let add = clampXp(amount);
  if (add <= 0) return;
  // A Double-XP booster bought in this subject's Shop doubles the next quiz's reward.
  if (source === 'quiz' && consumeDoubleXpCharge()) {
    add = clampXp(add * 2);
  }
  const subject = getSubject();
  writeQuest(subject, readQuest(subject) + add);
  awardTokens(tokensFromXp(add));
  emitToast({ kind: 'gain', amount: add, source });
  reconcileRank(true);
  scheduleSync();
}

/**
 * Record the outcome of a finished learning lesson. `deltaLearningXp` is the
 * increase in derived learning XP (compute it before/after recording the pass).
 * A new pass shows the big learning gain; anything else (replay, fail) grants a
 * small flat practice reward, so every completed session still pays out.
 */
export function awardLearningOutcome(deltaLearningXp: number): void {
  if (deltaLearningXp > 0) {
    const rounded = Math.round(deltaLearningXp);
    // Learning XP isn't stored — it's derived from progress — but tokens are a
    // separate accumulator, so credit 10% of the learning gain here.
    awardTokens(tokensFromXp(rounded));
    emitToast({ kind: 'gain', amount: rounded, source: 'learn' });
    reconcileRank(true);
  } else {
    awardQuestXp(PRACTICE_XP, 'practice');
  }
}

/* ──── account sync ─────────────────────────────────────────────────────── */

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    pushQuestXpToServer().catch(() => {});
  }, 1500);
}

// The PUT carries the whole per-subject map plus the legacy total (sum) so an
// old server / old client pair still max-merges something sensible.
function questPutBody(): string {
  const map = readQuestMap();
  return JSON.stringify({ quest_xp: sumQuest(map), by_subject: map });
}

/** PUT the local per-subject quest XP to the account (server keeps per-subject max). */
export async function pushQuestXpToServer(): Promise<void> {
  await apiFetch(XP_PUT, { method: 'PUT', body: questPutBody() });
}

/**
 * Beacon-style flush for pagehide: fire any queued quest-XP push with
 * `keepalive: true` so a fresh gain isn't lost when the tab closes. No-op
 * if nothing is queued.
 */
export function flushQuestXpBeacon(): void {
  if (!syncTimer) return;
  clearTimeout(syncTimer);
  syncTimer = null;
  try {
    const token = getCachedAccessTokenForBeacon();
    if (!token) return;
    void fetch(XP_PUT, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: questPutBody(),
    });
  } catch {
    /* best-effort */
  }
}

// On sign-in: pull the account's per-subject quest XP, keep the larger of
// local/server for each subject (XP only grows), store it, reconcile the rank
// marker, and push back. A legacy account blob (one pre-split total, no
// per-subject map) is attributed to the active subject, matching the local
// migration rule so the max-merge never double-counts.
export async function syncXpWithServer(): Promise<void> {
  let serverMap: QuestMap = {};
  try {
    const { data } = await apiFetch<{ data: { quest_xp: number; by_subject?: Record<string, number> } }>(XP_GET);
    serverMap = sanitizeQuestMap(data?.by_subject);
    const legacyTotal = clampXp(Number(data?.quest_xp ?? 0));
    if (Object.keys(serverMap).length === 0 && legacyTotal > 0) {
      serverMap = { [getSubject()]: legacyTotal };
    }
  } catch {
    return; // not signed in or offline — keep local only
  }
  const local = readQuestMap();
  const merged: QuestMap = { ...local };
  for (const [k, v] of Object.entries(serverMap) as [SubjectId, number][]) {
    merged[k] = Math.max(local[k] ?? 0, v);
  }
  writeQuestMap(merged);
  reconcileRank(false); // adopt the merged rank silently on sign-in
  try {
    await pushQuestXpToServer();
  } catch {
    // best-effort; local is already updated
  }
}

/**
 * Initialize the rank marker on first load so we never fire a rank-up toast for
 * progress earned in a previous session. Call once at startup.
 */
export function primeRankMarker(): void {
  reconcileRank(false);
}
