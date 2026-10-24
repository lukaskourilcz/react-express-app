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
import { accountEpoch } from './accountData';
import { readJSON, readString, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { useRoadmapProgress, getRoadmapProgress } from './roadmap';
import {
  computeLearningXp,
  levelForXp,
  PRACTICE_XP,
  type LevelInfo,
} from './leveling';
import { rankLabelKeyFor, getTrack } from './tracks';
import type { TranslationKey } from '../i18n/translations';
import { getSubject, useSubject, isSubjectId, topicSetForSubject, type SubjectId } from './subjects';
import type { LearnRepeatXp } from '../../../shared/repeat-xp';

// v1 held ONE global accumulator shared by every subject; v2 keys XP by subject.
const QUEST_KEY_LEGACY = 'devquiz:xp:quest:v1';
const QUEST_KEY = 'devquiz:xp:quest:v2';
// The highest rank the learner has been shown reaching (per subject), so we only
// celebrate a rank-up once (and stay quiet if a sync ever revises XP downward).
const RANK_SEEN_KEY_LEGACY = 'devquiz:xp:rank-seen:v1';
const RANK_SEEN_KEY = 'devquiz:xp:rank-seen:v2';
const XP_GET = '/api/user/xp';

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
  // One-time migration: pre-split quest XP was a single accumulator. Attribute
  // it to the subject.
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
  // `coding`: a coding challenge's first verified pass. `again`: a Learn step
  // or coding challenge paid its XP again, an hour after it last did.
  | { kind: 'gain'; amount: number; source: 'learn' | 'quiz' | 'practice' | 'coding' | 'again' }
  // Rank titles are carried as an i18n key + vars (not a composed string) so
  // the toaster renders them in the user's current language.
  | { kind: 'rankup'; titleKey: TranslationKey; titleVars: Record<string, string>; level: number }
  | { kind: 'held'; hold: XpHold };

/** XP the hour held back (migration 060), and when it can be earned again. */
export type XpHold =
  /** A Learn level or part test passed again inside its hour. */
  | { on: 'step'; availableAt: string }
  /** A coding challenge passed again without its XP: it needs a reset, and
   * from `availableAt` (null when the hour is already up) a pass pays. */
  | { on: 'task'; availableAt: string | null }
  /** Correct answers of a quiz, daily or Challenge result whose question paid
   * XP less than an hour ago. */
  | { on: 'questions'; count: number; availableAt: string };

/** An ISO time as the learner's own clock shows it ("14:32"). */
export const clockTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
      const { key, vars } = rankLabelKeyFor(info.rank, getTrack());
      emitToast({ kind: 'rankup', titleKey: key, titleVars: vars, level: info.level });
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
  const subject = getSubject();
  writeQuest(subject, readQuest(subject) + add);
  emitToast({ kind: 'gain', amount: add, source });
  reconcileRank(true);
}

/** Announce an award already committed by the verified server mutation. The
 * server credited its coins in the same request (#227); nothing is counted
 * here. */
export function announceVerifiedQuestXp(amount: number, source: 'quiz' | 'coding' | 'again' = 'quiz'): void {
  const verified = clampXp(amount);
  if (verified <= 0) return;
  emitToast({ kind: 'gain', amount: verified, source });
  reconcileRank(true);
}

/** Tell the learner the hour held XP back, and when it opens again. */
export function announceXpHeld(hold: XpHold): void {
  emitToast({ kind: 'held', hold });
}

/** A signed-in pass of a Learn step already passed (migration 060): the XP
 * it paid again, then the rank that XP crosses once the account's balance is
 * in, or when the step's XP opens again. */
export async function announceLearnRepeat(repeat: LearnRepeatXp): Promise<void> {
  if (repeat.xp > 0) {
    announceVerifiedQuestXp(repeat.xp, 'again');
    await syncXpWithServer({ announceRankUp: true });
  } else if (repeat.withheld === 'cooldown' && repeat.availableAt) {
    announceXpHeld({ on: 'step', availableAt: repeat.availableAt });
  }
}

/**
 * Record the outcome of a finished learning lesson. `deltaLearningXp` is the
 * increase in derived learning XP (compute it before/after recording the pass).
 * A new pass shows the big learning gain. A replay or a failed attempt earns a
 * small flat practice reward only in a signed-out browser, whose XP is local
 * anyway: no server route awards it, so a signed-in learner would see XP (and
 * possibly a rank-up) their account never gets.
 */
export function awardLearningOutcome(deltaLearningXp: number, signedIn: boolean): void {
  if (deltaLearningXp > 0) {
    const rounded = Math.round(deltaLearningXp);
    // Learning XP isn't stored — it's derived from progress. Its coins are
    // credited by the server when it records the first pass (#227).
    emitToast({ kind: 'gain', amount: rounded, source: 'learn' });
    reconcileRank(true);
  } else if (!signedIn) {
    awardQuestXp(PRACTICE_XP, 'practice');
  }
}

/* ──── account sync ─────────────────────────────────────────────────────── */

/** @deprecated Account XP is server-authoritative; retained for old imports. */
export async function pushQuestXpToServer(): Promise<void> {
  await syncXpWithServer();
}

/**
 * Beacon-style flush for pagehide: fire any queued quest-XP push with
 * `keepalive: true` so a fresh gain isn't lost when the tab closes. No-op
 * if nothing is queued.
 */
export function flushQuestXpBeacon(): void {
  // Verified result receipts write account XP before the page can unload.
}

// On sign-in: pull the authoritative account XP and replace the optimistic
// browser cache. A legacy account blob (one pre-split total, no
// per-subject map) is attributed to the active subject, matching the local
// migration rule so the max-merge never double-counts.
//
// A sync only catches the rank marker up, so progress from another session
// is never celebrated. `announceRankUp` is for the one caller whose new XP
// exists only on the server: a verified quiz result it has just recorded. Its
// rank-up would otherwise be marked seen here without ever being shown.
//
// Syncs answer in any order. A read that left before a quiz result was
// recorded and answers after a later sync's read holds the balance from before
// that result: written over it, it lowered the XP and the rank marker until
// the next sync, and the later sync's rank-up was marked seen unannounced. So
// a read older than the last one written is dropped, and a rank-up a sync
// was asked to announce is announced by whichever write of a sync started
// with or after it comes first, for the same account.
let syncsStarted = 0;
let newestWritten = 0;
let announceOwed: { turn: number; epoch: number } | null = null;

export async function syncXpWithServer({ announceRankUp = false }: { announceRankUp?: boolean } = {}): Promise<void> {
  // The account this read is for. Signed out while it was out, its XP was
  // written back into the browser after the account's data was cleared.
  const epoch = accountEpoch();
  const turn = ++syncsStarted;
  if (announceRankUp) announceOwed = { turn, epoch };
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
  if (epoch !== accountEpoch() || turn < newestWritten) return;
  newestWritten = turn;
  writeQuestMap(serverMap);
  lastXpWrite = { epoch, turn, at: Date.now(), copy: readString(QUEST_KEY) };
  const announce = announceOwed !== null && announceOwed.epoch === epoch && turn >= announceOwed.turn;
  if (announce || announceOwed?.epoch !== epoch) announceOwed = null;
  reconcileRank(announce);
}

// The Learn map reads the account's XP on every mount (perf baseline #587
// C22): a client-side return to a map seconds after the last read asked
// again, each read an Auth getUser and an XP query. A read that wrote less
// than XP_SYNC_FRESH_MS ago answers the map's next ask, for the same account,
// while no other sync has started since and the browser's copy is the one it
// wrote. Every flow in this tab that changes the account's XP on the server
// (a quiz result, a coding pass, a Challenge, an FDE step, a repeated Learn
// step) syncs itself afterwards with syncXpWithServer, which always reads, and
// a local award changes the copy, so only a change made in another tab or on
// another device can wait, for at most the window. Only the map uses this.
export const XP_SYNC_FRESH_MS = 60_000;
let lastXpWrite: { epoch: number; turn: number; at: number; copy: string | null } | null = null;

/** The Learn map's XP sync: syncXpWithServer, unless a read wrote within
 * XP_SYNC_FRESH_MS and nothing has changed since (see above). */
export function syncXpUnlessFresh(): Promise<void> {
  const epoch = accountEpoch();
  const fresh = lastXpWrite !== null
    && lastXpWrite.epoch === epoch
    && lastXpWrite.turn === syncsStarted
    && Date.now() - lastXpWrite.at < XP_SYNC_FRESH_MS
    && lastXpWrite.copy === readString(QUEST_KEY);
  return fresh ? Promise.resolve() : syncXpWithServer();
}

/**
 * Initialize the rank marker on first load so we never fire a rank-up toast for
 * progress earned in a previous session. Call once at startup.
 */
export function primeRankMarker(): void {
  reconcileRank(false);
}
