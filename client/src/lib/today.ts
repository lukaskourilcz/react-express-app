// Today queue — the auto-built daily plan for one subject. PURE and offline:
// it composes the plan entirely from existing roadmap progress + the shared
// spaced-mastery rules, with no network. Priority is (1) unfinished work,
// (2) due-for-review levels, (3) the next new level — capped at the daily
// target for the headline plan, with the full lists also returned.
//
// Level topology (which levels are unlocked, which are passed) is read through
// `roadmap.ts` helpers so this module never hardcodes a per-topic level count.
// The frontier scan stops at the first locked level, so an in-progress topic is
// bounded naturally; pass `opts.levelCounts` (from the fetched RoadmapStructure)
// to also bound a fully-completed topic exactly — see BuildTodayOptions.

import {
  isLevelUnlocked,
  isLevelPassed,
  isTopicUnlocked,
  ROADMAP_LEVELS,
  type RoadmapProgress,
} from './roadmap';
import { topicsForSubject, type SubjectId } from './subjects';
import {
  masteryState,
  isDueForReview,
  masteryDayKey,
  type LevelMasteryEntry,
} from '../../../shared/mastery';
import { categoryLabelKey } from './categories';
import type { RoadmapTopic } from '../types/quiz';
import type { TranslationKey } from '../i18n/translations';

/** The daily plan target. Mirrors the server DAILY_TARGET (single source of 3). */
export const TODAY_TARGET = 3;

export type TodayKind = 'unfinished' | 'review' | 'new';

/** One planned item. `id` is stable + deep-linkable (`<topic>:<level>`). */
export interface TodayItem {
  id: string;
  kind: TodayKind;
  topic: RoadmapTopic;
  level: number;
  /** i18n KEY for the "why this is here" line (today.reason*). */
  reason: TranslationKey;
  /** i18n KEY for the topic label (`category.<topic>`), for convenience. */
  topicLabelKey: TranslationKey;
}

/** Full (uncapped) lists per bucket, for a richer UI than the capped plan. */
export interface TodayBuckets {
  unfinished: TodayItem[];
  review: TodayItem[];
  new: TodayItem[];
}

export interface TodayResult {
  /** The composed plan, priority-ordered and capped at `target`. */
  items: TodayItem[];
  /** First item's id (the "Start here" target), or null when nothing is due. */
  startHereId: string | null;
  /** Full bucket sizes (not the capped plan) for the summary line. */
  unfinishedCount: number;
  reviewCount: number;
  newCount: number;
  target: number;
  /** True when ≥ target distinct levels were passed today (needs lastPassDay). */
  completedToday: boolean;
  /** The full, uncapped bucket lists. */
  all: TodayBuckets;
}

export interface BuildTodayOptions {
  /** UTC day key ('YYYY-MM-DD'); defaults to today. Injectable for tests. */
  today?: string;
  /**
   * Real per-topic level counts (from the fetched RoadmapStructure). When
   * provided, the "new" frontier is bounded exactly so a fully-completed topic
   * never proposes a level past its last real one. When omitted, the scan falls
   * back to ROADMAP_LEVELS and relies on "stop at the first locked level",
   * which is exact for any topic the learner has not fully completed.
   */
  levelCounts?: Partial<Record<RoadmapTopic, number>>;
  /** Skill-check-unlocked topics (`getExtraUnlocks()`), so their "new" levels
   * can appear. Starter + prereq-met topics are unlocked without this. */
  extraUnlocks?: RoadmapTopic[];
}

const REASON: Record<TodayKind, TranslationKey> = {
  unfinished: 'today.reasonUnfinished',
  review: 'today.reasonReview',
  new: 'today.reasonNew',
};

function makeItem(topic: RoadmapTopic, level: number, kind: TodayKind): TodayItem {
  return {
    id: `${topic}:${level}`,
    kind,
    topic,
    level,
    reason: REASON[kind],
    topicLabelKey: categoryLabelKey(topic),
  };
}

// A roadmap level entry, read as a mastery entry (the mastery fields are added
// additively by migration 024 and are absent on older rows — all optional).
function asMastery(entry: unknown): LevelMasteryEntry {
  return entry && typeof entry === 'object' ? (entry as LevelMasteryEntry) : {};
}

/**
 * The next never-attempted, unlocked, unpassed level for a topic — the frontier.
 * Returns null when the frontier is locked (e.g. a part test must be passed
 * first) or already an entry (that level is "unfinished", not "new") or beyond
 * the topic's real levels. Bounded by `cap` and never scans past ROADMAP_LEVELS.
 */
function nextNewLevel(
  progress: RoadmapProgress,
  topic: RoadmapTopic,
  levels: Record<string, unknown>,
  cap: number,
): number | null {
  const max = Math.min(Math.max(0, Math.floor(cap)), ROADMAP_LEVELS);
  for (let level = 1; level <= max; level++) {
    if (!isLevelUnlocked(progress, topic, level)) return null; // frontier is gated → nothing new
    if (isLevelPassed(progress, topic, level)) continue; // cleared → look further along
    // Unlocked + not passed. If it already has an entry it's "unfinished" (not
    // new), and since it isn't passed no later level is unlocked → no new level.
    if (Object.prototype.hasOwnProperty.call(levels, String(level))) return null;
    return level; // unlocked, unpassed, never attempted → the next new level
  }
  return null;
}

/**
 * Build one subject's Today plan from roadmap progress. Pure — no network, no
 * storage writes. See BuildTodayOptions for how the "new" frontier is bounded.
 */
export function buildToday(
  progress: RoadmapProgress,
  subject: SubjectId,
  opts: BuildTodayOptions = {},
): TodayResult {
  const today = opts.today ?? masteryDayKey();
  const extra = opts.extraUnlocks ?? [];
  const topics = topicsForSubject(subject);

  const unfinished: TodayItem[] = [];
  const review: TodayItem[] = [];
  const fresh: TodayItem[] = [];
  const passedTodayLevels = new Set<string>();

  for (const topic of topics) {
    const levels = progress[topic]?.levels ?? {};

    // (1) + (2): scan existing entries for unfinished, due-review, and the
    // count of distinct levels passed today (for completedToday).
    for (const [key, rawEntry] of Object.entries(levels)) {
      const level = Number(key);
      if (!Number.isInteger(level) || level < 1) continue;
      const entry = asMastery(rawEntry);

      if (entry.lastPassDay === today) passedTodayLevels.add(`${topic}:${level}`);

      const state = masteryState(entry);
      if (state === 'notStarted') {
        // Has an entry but was never passed → unfinished (guard: still unlocked).
        if (isLevelUnlocked(progress, topic, level)) {
          unfinished.push(makeItem(topic, level, 'unfinished'));
        }
      } else if (state === 'cleared' && isDueForReview(entry, today)) {
        review.push(makeItem(topic, level, 'review'));
      }
      // 'mastered' and cleared-but-not-due levels contribute nothing.
    }

    // (3): the next new level, only for topics the learner can actually open.
    if (isTopicUnlocked(progress, topic, extra)) {
      const cap = opts.levelCounts?.[topic] ?? ROADMAP_LEVELS;
      const next = nextNewLevel(progress, topic, levels, cap);
      if (next !== null) fresh.push(makeItem(topic, next, 'new'));
    }
  }

  // Stable order: by subject topic order, then level ascending, within each bucket.
  const order = new Map(topics.map((t, i) => [t, i] as const));
  const cmp = (a: TodayItem, b: TodayItem): number =>
    (order.get(a.topic)! - order.get(b.topic)!) || (a.level - b.level);
  unfinished.sort(cmp);
  review.sort(cmp);
  fresh.sort(cmp);

  // Compose the capped headline plan: unfinished → review → new.
  const items: TodayItem[] = [];
  for (const item of [...unfinished, ...review, ...fresh]) {
    if (items.length >= TODAY_TARGET) break;
    items.push(item);
  }

  return {
    items,
    startHereId: items.length > 0 ? items[0].id : null,
    unfinishedCount: unfinished.length,
    reviewCount: review.length,
    newCount: fresh.length,
    target: TODAY_TARGET,
    completedToday: passedTodayLevels.size >= TODAY_TARGET,
    all: { unfinished, review, new: fresh },
  };
}
