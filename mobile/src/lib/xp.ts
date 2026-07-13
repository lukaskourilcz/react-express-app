// Experience-point store — ported from client/src/lib/xp.ts (browser beacon
// flush dropped; RN has no pagehide). Quest XP is persisted + synced; learning
// XP is always recomputed from roadmap progress. A toaster bus announces gains
// and rank-ups for the XpToaster component.
import { apiFetch } from './api';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { useRoadmapProgress, getProgress } from './roadmapProgress';
import { computeLearningXp, levelForXp, displayTitle, PRACTICE_XP, type LevelInfo } from './leveling';
import { specializationForTrack, getTrack } from './tracks';
import { awardTokens, tokensFromXp } from './tokens';
import { consumeDoubleXpCharge } from './shop';

const QUEST_KEY = 'devquiz:xp:quest:v1';
const RANK_SEEN_KEY = 'devquiz:xp:rank-seen:v1';
const XP_GET = '/api/user/xp';
const XP_PUT = '/api/user/xp';

const MAX_XP = 100_000_000;
const clampXp = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.min(MAX_XP, Math.round(n)) : 0);

const readQuest = (): number => clampXp(readJSON<number>(QUEST_KEY, 0));
const questStore = createStore<number>(readQuest);

export function useQuestXp(): number {
  return useStore(questStore);
}

function writeQuest(value: number): void {
  writeJSON(QUEST_KEY, clampXp(value));
  questStore.emit();
}

/** Imperative total XP (learning + quest) from current local state. */
export function getTotalXp(): number {
  return computeLearningXp(getProgress()) + readQuest();
}

/** Live total XP; re-renders when either roadmap progress or quest XP changes. */
export function useTotalXp(): number {
  const progress = useRoadmapProgress();
  const quest = useQuestXp();
  return computeLearningXp(progress) + quest;
}

export function useLevelInfo(): LevelInfo {
  return levelForXp(useTotalXp());
}

/* ──── toaster event bus ────────────────────────────────────────────────── */

export type XpToast =
  | { kind: 'gain'; amount: number; source: 'learn' | 'quiz' | 'practice' }
  | { kind: 'rankup'; title: string; level: number };

const toastListeners = new Set<(t: XpToast) => void>();

export function onXpToast(listener: (t: XpToast) => void): () => void {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

const emitToast = (t: XpToast) => toastListeners.forEach((l) => l(t));

function reconcileRank(announce: boolean): LevelInfo {
  const info = levelForXp(getTotalXp());
  const seen = readJSON<number>(RANK_SEEN_KEY, 1);
  if (info.level > seen) {
    writeJSON(RANK_SEEN_KEY, info.level);
    if (announce) {
      const title = displayTitle(info.rank.title, specializationForTrack(getTrack()));
      emitToast({ kind: 'rankup', title, level: info.level });
    }
  } else if (info.level < seen) {
    writeJSON(RANK_SEEN_KEY, info.level);
  }
  return info;
}

/* ──── awarding XP ──────────────────────────────────────────────────────── */

export function awardQuestXp(amount: number, source: 'quiz' | 'practice'): void {
  let add = clampXp(amount);
  if (add <= 0) return;
  if (source === 'quiz' && consumeDoubleXpCharge()) {
    add = clampXp(add * 2);
  }
  writeQuest(readQuest() + add);
  awardTokens(tokensFromXp(add));
  emitToast({ kind: 'gain', amount: add, source });
  reconcileRank(true);
  scheduleSync();
}

export function awardLearningOutcome(deltaLearningXp: number): void {
  if (deltaLearningXp > 0) {
    const rounded = Math.round(deltaLearningXp);
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

export async function pushQuestXpToServer(): Promise<void> {
  await apiFetch(XP_PUT, { method: 'PUT', body: JSON.stringify({ quest_xp: readQuest() }) });
}

export async function syncXpWithServer(): Promise<void> {
  let server = 0;
  try {
    const { data } = await apiFetch<{ data: { quest_xp: number } }>(XP_GET);
    server = clampXp(data?.quest_xp ?? 0);
  } catch {
    return;
  }
  writeQuest(Math.max(readQuest(), server));
  reconcileRank(false);
  try {
    await pushQuestXpToServer();
  } catch {
    // best-effort
  }
}

export function primeRankMarker(): void {
  reconcileRank(false);
}
