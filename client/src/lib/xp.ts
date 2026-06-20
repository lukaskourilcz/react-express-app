// Experience-point store: the "quest" XP accumulator (localStorage-backed, with
// optional account sync) plus the live total (learning XP + quest XP) and the
// toaster event bus that announces XP gains and rank-ups.
//
// Learning XP is a pure function of roadmap progress, so it is never stored —
// only the quest accumulator is persisted and synced. Total XP and the career
// rank are always recomputed from (progress + quest).

import { apiFetch } from './api';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { useRoadmapProgress, getRoadmapProgress } from './roadmap';
import {
  computeLearningXp,
  levelForXp,
  specializationFor,
  displayTitle,
  PRACTICE_XP,
  type LevelInfo,
} from './leveling';
import { awardTokens, tokensFromXp } from './tokens';

const QUEST_KEY = 'devquiz:xp:quest:v1';
// The highest rank the learner has been shown reaching, so we only celebrate a
// rank-up once (and stay quiet if a sync ever revises XP downward).
const RANK_SEEN_KEY = 'devquiz:xp:rank-seen:v1';
const XP_GET = '/api/user/xp';
const XP_PUT = '/api/user/xp';

const MAX_XP = 100_000_000;
const clampXp = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.min(MAX_XP, Math.round(n)) : 0);

/* ──── quest XP store ───────────────────────────────────────────────────── */

const readQuest = (): number => clampXp(readJSON<number>(QUEST_KEY, 0));

const questStore = createStore<number>(readQuest);

/** Live quest-XP accumulator. */
export function useQuestXp(): number {
  return useStore(questStore);
}

function writeQuest(value: number): void {
  writeJSON(QUEST_KEY, clampXp(value));
  questStore.emit();
}

/* ──── total + rank ─────────────────────────────────────────────────────── */

/** Imperative total XP (learning + quest) from current local state. */
export function getTotalXp(): number {
  return computeLearningXp(getRoadmapProgress()) + readQuest();
}

/** Live total XP; re-renders when either roadmap progress or quest XP changes. */
export function useTotalXp(): number {
  const progress = useRoadmapProgress();
  const quest = useQuestXp();
  return computeLearningXp(progress) + quest;
}

/** Live career rank info derived from the live total XP. */
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

// Compare the current rank to the last one we celebrated; announce a rank-up the
// first time the learner crosses into a higher rank. Returns the level info.
function reconcileRank(announce: boolean): LevelInfo {
  const info = levelForXp(getTotalXp());
  const seen = readJSON<number>(RANK_SEEN_KEY, 1);
  if (info.level > seen) {
    writeJSON(RANK_SEEN_KEY, info.level);
    if (announce) {
      const title = displayTitle(info.rank.title, specializationFor(getRoadmapProgress()));
      emitToast({ kind: 'rankup', title, level: info.level });
    }
  } else if (info.level < seen) {
    writeJSON(RANK_SEEN_KEY, info.level); // keep the marker honest after a revision
  }
  return info;
}

/* ──── awarding XP ──────────────────────────────────────────────────────── */

/** Award quest XP (quiz or practice), toast it, and check for a rank-up. */
export function awardQuestXp(amount: number, source: 'quiz' | 'practice'): void {
  const add = clampXp(amount);
  if (add <= 0) return;
  writeQuest(readQuest() + add);
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
    pushQuestXpToServer().catch(() => {});
  }, 1500);
}

/** PUT the local quest XP to the account (server keeps the max). */
export async function pushQuestXpToServer(): Promise<void> {
  await apiFetch(XP_PUT, { method: 'PUT', body: JSON.stringify({ quest_xp: readQuest() }) });
}

// On sign-in: pull the account's quest XP, keep the larger of local/server
// (XP only grows), store it, reconcile the rank marker, and push back.
export async function syncXpWithServer(): Promise<void> {
  let server = 0;
  try {
    const { data } = await apiFetch<{ data: { quest_xp: number } }>(XP_GET);
    server = clampXp(data?.quest_xp ?? 0);
  } catch {
    return; // not signed in or offline — keep local only
  }
  writeQuest(Math.max(readQuest(), server));
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
