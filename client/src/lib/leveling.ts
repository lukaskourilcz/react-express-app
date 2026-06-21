// Career leveling + experience-point (XP) economy. Pure, dependency-free logic
// shared by the XP store, the Profile career card, and the toaster.
//
// Two sources of XP, combined into one total:
//   • Learning XP — derived deterministically from roadmap progress (which
//     levels/checkpoints you've PASSED). Because it's a pure function of
//     progress, it can't be farmed by replaying a level, and it's worth far
//     more than quiz XP.
//   • Quest XP — an accumulator earned from quizzes (and small "practice"
//     rewards for replaying already-passed lessons), synced to the account.
//
// The learner climbs a 10-rank ladder from Superjunior Developer to Software
// Architect, gated by total XP, with a Frontend/Backend/Full-Stack flavor
// derived from which tracks they've progressed in.

import type { RoadmapTopic } from '../types/quiz';
import type { RoadmapProgress } from './roadmap';

/* ──── XP economy ───────────────────────────────────────────────────────── */

// Learning rewards (first pass only — recomputed from progress, so replays add
// nothing here). A level is 8 questions; a checkpoint is a 40-question exam, so
// checkpoints are worth far more. Both scale with difficulty (1–5).
const LEVEL_XP_PER_DIFFICULTY = 50; // level d → 50·d  (50 … 250)
const CHECKPOINT_XP_PER_DIFFICULTY = 300; // checkpoint n → 300·n  (300 … 1500)

// Quiz rewards, per CORRECT answer, scaled by that question's difficulty. Tuned
// so a quiz question is worth meaningfully less than a learning question.
const QUIZ_XP_BASE = 2;
const QUIZ_XP_PER_DIFFICULTY = 2; // correct d → 2 + 2·d  (4 … 12)

// Flat consolation XP for completing a lesson that yields no new learning XP
// (a replay of an already-passed level, or a failed attempt) — so every session
// still rewards something, without making farming worthwhile.
export const PRACTICE_XP = 12;

const clampDifficulty = (d: number): number => Math.min(5, Math.max(1, Math.round(d) || 1));

/** Difficulty tier (1–5) of a 1-based roadmap level: levels 1–5 → 1, 6–10 → 2, … */
export const difficultyForLevel = (level: number): number => Math.min(5, Math.max(1, Math.ceil(level / 5)));

const levelXp = (difficulty: number): number => LEVEL_XP_PER_DIFFICULTY * clampDifficulty(difficulty);
// Checkpoint n covers levels (n-1)·5+1 … n·5, whose difficulty tier is exactly n.
const checkpointXp = (checkpoint: number): number => CHECKPOINT_XP_PER_DIFFICULTY * Math.max(1, checkpoint);

/** Total learning XP implied by a progress blob (only PASSED items count). */
export function computeLearningXp(progress: RoadmapProgress): number {
  let xp = 0;
  for (const tp of Object.values(progress)) {
    if (!tp) continue;
    for (const [lvl, entry] of Object.entries(tp.levels ?? {})) {
      if (entry?.passed) xp += levelXp(difficultyForLevel(Number(lvl)));
    }
    for (const [cp, entry] of Object.entries(tp.checkpoints ?? {})) {
      if (entry?.passed) xp += checkpointXp(Number(cp));
    }
  }
  return xp;
}

/** XP earned from one quiz, given each answered question's difficulty + result. */
export function computeQuizXp(items: ReadonlyArray<{ difficulty: number; correct: boolean }>): number {
  let xp = 0;
  for (const it of items) {
    if (it.correct) xp += QUIZ_XP_BASE + QUIZ_XP_PER_DIFFICULTY * clampDifficulty(it.difficulty);
  }
  return Math.round(xp);
}

/* ──── Career ladder ────────────────────────────────────────────────────── */

export interface CareerRank {
  /** Base rank title (specialization is composed on top for display). */
  title: string;
  /** Total XP required to reach this rank. */
  minXp: number;
  emoji: string;
}

// 10 ranks, Superjunior → Software Architect. Titles/emojis are fixed; the XP
// thresholds are configurable from /dev → Settings (defaults below).
const RANK_META: ReadonlyArray<{ title: string; emoji: string }> = [
  { title: 'Superjunior Developer', emoji: '🌱' },
  { title: 'Junior Developer', emoji: '🧑‍💻' },
  { title: 'Associate Developer', emoji: '💻' },
  { title: 'Developer', emoji: '⚙️' },
  { title: 'Mid-Level Developer', emoji: '🛠️' },
  { title: 'Senior Developer', emoji: '🚀' },
  { title: 'Staff Engineer', emoji: '⭐' },
  { title: 'Principal Engineer', emoji: '🎖️' },
  { title: 'Distinguished Engineer', emoji: '🏅' },
  { title: 'Software Architect', emoji: '🏛️' },
];

/** Rank titles in order — used to label the dev configuration UI. */
export const RANK_TITLES: string[] = RANK_META.map((r) => r.title);

export const MAX_RANK = RANK_META.length;

// Total XP required to reach each rank (ascending; first is 0). Tuned so that
// completing a full learning path lifts you several ranks, while reaching
// Architect means mastering most paths.
export const DEFAULT_RANK_THRESHOLDS: number[] = [
  0, 2000, 6000, 14000, 26000, 44000, 68000, 100000, 144000, 200000,
];

let activeThresholds: number[] = [...DEFAULT_RANK_THRESHOLDS];

/**
 * Override the XP thresholds from the dev-configured game settings. Invalid
 * input (wrong length, non-ascending, first ≠ 0) is ignored so a bad config can
 * never break leveling.
 */
export function setRankThresholds(values: number[] | null | undefined): void {
  if (!Array.isArray(values) || values.length !== RANK_META.length) return;
  const cleaned: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const n = Math.round(Number(values[i]));
    if (!Number.isFinite(n) || n < 0) return;
    if (i === 0 && n !== 0) return;
    if (i > 0 && n <= cleaned[i - 1]) return;
    cleaned.push(n);
  }
  activeThresholds = cleaned;
}

/** The active career ladder: fixed titles/emojis with the current thresholds. */
export function getCareerRanks(): CareerRank[] {
  return RANK_META.map((m, i) => ({ title: m.title, emoji: m.emoji, minXp: activeThresholds[i] }));
}

export interface LevelInfo {
  /** 1-based rank number (1…10). */
  level: number;
  rank: CareerRank;
  /** The next rank, or null at the cap. */
  next: CareerRank | null;
  isMax: boolean;
  totalXp: number;
  /** XP accumulated within the current rank band. */
  xpIntoRank: number;
  /** Width of the current rank band (0 at the cap). */
  xpSpan: number;
  /** XP still needed to reach the next rank (0 at the cap). */
  xpToNext: number;
  /** Progress through the current band, 0–100 (100 at the cap). */
  progressPct: number;
}

/** Resolve a total XP value to its career rank + progress toward the next. */
export function levelForXp(totalXp: number): LevelInfo {
  const ranks = getCareerRanks();
  const xp = Math.max(0, Math.floor(totalXp));
  let idx = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (xp >= ranks[i].minXp) idx = i;
  }
  const rank = ranks[idx];
  const next = ranks[idx + 1] ?? null;
  const xpSpan = next ? next.minXp - rank.minXp : 0;
  const xpIntoRank = xp - rank.minXp;
  const xpToNext = next ? Math.max(0, next.minXp - xp) : 0;
  const progressPct = next && xpSpan > 0 ? Math.min(100, Math.round((xpIntoRank / xpSpan) * 100)) : 100;
  return { level: idx + 1, rank, next, isMax: !next, totalXp: xp, xpIntoRank, xpSpan, xpToNext, progressPct };
}

/* ──── Specialization (track flavor) ────────────────────────────────────── */

export type Specialization = 'Frontend' | 'Backend' | 'Full-Stack';

// Core languages count toward both tracks; the rest are track-specific.
const FRONTEND_TOPICS: RoadmapTopic[] = ['html', 'css', 'react', 'nextjs', 'javascript', 'typescript', 'rhf-zod'];
const BACKEND_TOPICS: RoadmapTopic[] = ['nodejs', 'javascript', 'typescript'];

const passedLevels = (progress: RoadmapProgress, topic: RoadmapTopic): number =>
  Object.values(progress[topic]?.levels ?? {}).filter((e) => e.passed).length;

/**
 * Derive the learner's specialization from where they've made progress.
 * Returns null until they've passed at least one front/back-end level.
 */
export function specializationFor(progress: RoadmapProgress): Specialization | null {
  let fe = 0;
  let be = 0;
  for (const topic of FRONTEND_TOPICS) fe += passedLevels(progress, topic);
  for (const topic of BACKEND_TOPICS) be += passedLevels(progress, topic);
  if (fe === 0 && be === 0) return null;
  if (fe >= be * 2) return 'Frontend';
  if (be >= fe * 2) return 'Backend';
  return 'Full-Stack';
}

/**
 * Compose the displayed title. For "…Developer" ranks the specialization reads
 * naturally inline ("Junior Frontend Developer"); senior ("Engineer"/"Architect")
 * ranks keep their title and surface the specialization separately as a chip.
 */
export function displayTitle(rankTitle: string, specialization: Specialization | null): string {
  if (specialization && rankTitle.includes('Developer')) {
    return rankTitle.replace('Developer', `${specialization} Developer`);
  }
  return rankTitle;
}
