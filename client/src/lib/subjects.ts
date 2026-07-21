// The learning *subject* the user is exploring — Web Dev, Geography, Math,
// History or Chess. This is the top-level choice on StudyShark: pick a subject
// and the whole app (roadmap, quiz, categories, tracks, accent) scopes to it.
//
// Subjects are disjoint by construction: every topic id and category string
// belongs to exactly one subject, so lookups stay unambiguous and a single
// backend serves them all. The active subject is persisted to localStorage and
// exposed through the same tiny observable-store pattern as the roadmap track
// (see tracks.ts), so every surface re-renders together when it changes.

import type { CategoryType, RoadmapTopic } from '../types/quiz';
import type { TranslationKey } from '../i18n/translations';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { SUBJECT_SCOPE_CATALOG } from '../../../shared/subject-catalog';

/**
 * i18n keys for a subject's display name / blurb — the registry's `label` and
 * `blurb` fields are the English fallbacks; user-visible surfaces should
 * render `t(subjectNameKey(id))` so Czech gets Czech subject names.
 */
export const subjectNameKey = (id: SubjectId): TranslationKey => `subject.${id}.name` as TranslationKey;
export const subjectBlurbKey = (id: SubjectId): TranslationKey => `subject.${id}.blurb` as TranslationKey;

export type SubjectId = 'webdev' | 'geography' | 'math' | 'history' | 'chess' | 'biology' | 'poker';
export const SUBJECT_ORDER: SubjectId[] = ['webdev', 'geography', 'math', 'history', 'chess', 'biology', 'poker'];
/** Subjects that belong to the StudyShark portal. Developer learning is a
 * sibling product (devShark), never a StudyShark subject card. */
export const STUDYSHARK_SUBJECT_ORDER: SubjectId[] = SUBJECT_ORDER.filter((id) => id !== 'webdev');

export interface SubjectDef {
  id: SubjectId;
  label: string;
  /** One-line pitch shown on the subject picker card. */
  blurb: string;
  /** Primary accent (light mode) — drives product tokens per subject. */
  accent: string;
  /** Legible accent for small text on dark surfaces. */
  accentBright: string;
  /** Roadmap ("Learn") topics for this subject, in path order. */
  topics: RoadmapTopic[];
  /** Categories available in the solo Quiz / Play pickers for this subject. */
  categories: CategoryType[];
  /**
   * Wordmark to use when this subject runs as its *own* standalone site (see
   * the locked-subject mode below) — e.g. "devShark". Falls back to `label`.
   */
  standaloneBrand?: string;
}

export const SUBJECTS: Record<SubjectId, SubjectDef> = {
  webdev: {
    id: 'webdev',
    label: 'Web Dev',
    standaloneBrand: 'devShark',
    blurb: 'Frontend, backend and fullstack: the languages and tools of the modern web.',
    accent: '#2d7a2d',
    accentBright: '#4caf50',
    topics: [...SUBJECT_SCOPE_CATALOG.webdev.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.webdev.categories] as CategoryType[],
  },
  geography: {
    id: 'geography',
    label: 'Geography',
    standaloneBrand: 'geoShark',
    blurb: 'The whole world: continents, countries, capitals, climate and the Earth itself.',
    // orange-700: white "on-accent" text on primary buttons passes 4.5:1
    // (the previous #ea580c sat at 3.56:1 in light mode).
    accent: '#c2410c',
    accentBright: '#fb923c',
    topics: [...SUBJECT_SCOPE_CATALOG.geography.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.geography.categories] as CategoryType[],
  },
  math: {
    id: 'math',
    label: 'Math',
    standaloneBrand: 'mathShark',
    blurb: 'From basic arithmetic all the way to university-level math, one level at a time.',
    accent: '#1565c0',
    accentBright: '#42a5f5',
    topics: [...SUBJECT_SCOPE_CATALOG.math.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.math.categories] as CategoryType[],
  },
  history: {
    id: 'history',
    label: 'History',
    standaloneBrand: 'historyShark',
    blurb: 'The human story from prehistory to the modern era, age by age.',
    accent: '#4b5563',
    accentBright: '#9ca3af',
    topics: [...SUBJECT_SCOPE_CATALOG.history.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.history.categories] as CategoryType[],
  },
  chess: {
    id: 'chess',
    label: 'Chess',
    standaloneBrand: 'chessShark',
    blurb: 'For players who know the rules: openings, tactics, strategy, endgames and advanced theory.',
    accent: '#7b4b2a',
    accentBright: '#c8935f',
    topics: [...SUBJECT_SCOPE_CATALOG.chess.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.chess.categories] as CategoryType[],
  },
  biology: {
    id: 'biology',
    label: 'Human Biology',
    standaloneBrand: 'bioShark',
    blurb: 'The human body from cells to whole systems: anatomy and physiology, step by step.',
    // teal-700: white "on-accent" text on primary buttons passes 4.5:1
    // (the previous #0d9488 sat at 3.74:1 in light mode).
    accent: '#0f766e',
    accentBright: '#2dd4bf',
    topics: [...SUBJECT_SCOPE_CATALOG.biology.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.biology.categories] as CategoryType[],
  },
  poker: {
    id: 'poker',
    label: 'Poker',
    standaloneBrand: 'pokerShark',
    blurb: "Get good at no-limit Texas Hold'em, from position and pot odds to advanced strategy.",
    accent: '#b91c1c',
    accentBright: '#ef4444',
    topics: [...SUBJECT_SCOPE_CATALOG.poker.topics] as RoadmapTopic[],
    categories: [...SUBJECT_SCOPE_CATALOG.poker.categories] as CategoryType[],
  },
};

const isSubject = (v: unknown): v is SubjectId =>
  typeof v === 'string' && (SUBJECT_ORDER as string[]).includes(v);

/** Type guard for a SubjectId — used by the per-subject XP/token/shop stores. */
export const isSubjectId = isSubject;

export const topicsForSubject = (id: SubjectId): RoadmapTopic[] => SUBJECTS[id].topics;
export const categoriesForSubject = (id: SubjectId): CategoryType[] => SUBJECTS[id].categories;

// Cached per-subject topic sets, for scoping XP computations to one subject.
const TOPIC_SETS = new Map<SubjectId, ReadonlySet<string>>();
export function topicSetForSubject(id: SubjectId): ReadonlySet<string> {
  let set = TOPIC_SETS.get(id);
  if (!set) {
    set = new Set<string>(SUBJECTS[id].topics);
    TOPIC_SETS.set(id, set);
  }
  return set;
}

// Reverse lookups: which subject owns a given topic / category. Because subjects
// are disjoint, these are unambiguous. Used to keep progress and pickers scoped.
const TOPIC_TO_SUBJECT = new Map<string, SubjectId>();
const CATEGORY_TO_SUBJECT = new Map<string, SubjectId>();
for (const id of SUBJECT_ORDER) {
  for (const t of SUBJECTS[id].topics) TOPIC_TO_SUBJECT.set(t, id);
  for (const c of SUBJECTS[id].categories) CATEGORY_TO_SUBJECT.set(c, id);
}
export const subjectOfTopic = (t: RoadmapTopic): SubjectId | undefined => TOPIC_TO_SUBJECT.get(t);
export const subjectOfCategory = (c: CategoryType): SubjectId | undefined => CATEGORY_TO_SUBJECT.get(c);

/* ──── Standalone (locked-subject) mode ─────────────────────────────────────
 * The same codebase powers both StudyShark (the full multi-subject picker) and
 * each subject's own standalone site (e.g. devShark). A standalone deploy sets
 * `VITE_LOCK_SUBJECT` to a subject id: the whole app then boots locked to that
 * one subject — no picker, no switcher, no `/subjects` route — and the Profile
 * links out to the umbrella site via `VITE_SIBLING_URL`. StudyShark sets
 * neither var and behaves as the full picker.
 */
const rawLock = ((import.meta.env.VITE_LOCK_SUBJECT as string | undefined) ?? '').trim();
/** The subject this deploy is locked to, or `null` for the full multi-subject app. */
export const LOCKED_SUBJECT: SubjectId | null = isSubject(rawLock) ? rawLock : null;
/** True when this deploy is a single-subject standalone site. */
export const isSubjectLocked = (): boolean => LOCKED_SUBJECT !== null;
/** The subjects this public deployment may offer. Admin tooling deliberately
 * keeps using SUBJECT_ORDER so it can manage the shared bank in one place. */
export const AVAILABLE_SUBJECT_ORDER: SubjectId[] = LOCKED_SUBJECT
  ? [LOCKED_SUBJECT]
  : STUDYSHARK_SUBJECT_ORDER;
/** URL of the umbrella StudyShark site, surfaced on standalone deploys. Empty when unset. */
export const SIBLING_PLATFORMS_URL = ((import.meta.env.VITE_SIBLING_URL as string | undefined) ?? '').trim();

/* ──── Persisted, shared active-subject selection ───────────────────────── */

const SUBJECT_KEY = 'studyshark:subject';
// Whether the learner has explicitly picked a subject (vs. the default), which
// drives the landing gate: show the picker until a subject is chosen.
const SUBJECT_CHOSEN_KEY = 'studyshark:subject:chosen';

const readSubject = (): SubjectId => {
  // A locked deploy always resolves to its one subject, ignoring any stored value.
  if (LOCKED_SUBJECT) return LOCKED_SUBJECT;
  const saved = readJSON<string>(SUBJECT_KEY, 'geography');
  // Existing devShark learners keep all webdev data. On the StudyShark portal,
  // an old shared-browser `webdev` selection is simply mapped to the first
  // general subject instead of exposing developer content as a subject.
  return isSubject(saved) && STUDYSHARK_SUBJECT_ORDER.includes(saved) ? saved : 'geography';
};
// Locked deploys have nothing to choose, so the landing gate is always satisfied.
const readChosen = (): boolean => LOCKED_SUBJECT !== null || readJSON<boolean>(SUBJECT_CHOSEN_KEY, false) === true;

const subjectStore = createStore<SubjectId>(readSubject);
const chosenStore = createStore<boolean>(readChosen);

/** Imperative snapshot of the active subject (for non-React callers). */
export const getSubject = (): SubjectId => subjectStore.get();
/** Imperative snapshot of whether a subject has been explicitly chosen. */
export const getHasChosenSubject = (): boolean => chosenStore.get();
/** The active subject's definition (accent, topics, categories, …). */
export const getActiveSubject = (): SubjectDef => SUBJECTS[subjectStore.get()];
/** The active subject's primary accent color. */
export const getActiveAccent = (): string => SUBJECTS[subjectStore.get()].accent;

/**
 * Set the active subject and (by default) mark it as explicitly chosen. Writes
 * localStorage and notifies both stores so every surface re-renders.
 */
export function setSubjectValue(next: SubjectId, opts?: { markChosen?: boolean }): void {
  // Standalone deploys are pinned to a single subject; ignore switch attempts.
  if (LOCKED_SUBJECT) return;
  writeJSON(SUBJECT_KEY, next);
  subjectStore.emit();
  if (opts?.markChosen !== false) {
    writeJSON(SUBJECT_CHOSEN_KEY, true);
    chosenStore.emit();
  }
}

/** Live, persisted active subject plus a setter. */
export function useSubject(): [SubjectId, (next: SubjectId) => void] {
  const subject = useStore(subjectStore);
  return [subject, (next: SubjectId) => setSubjectValue(next)];
}

/** Live active-subject definition — re-renders when the subject changes. */
export function useActiveSubject(): SubjectDef {
  return SUBJECTS[useStore(subjectStore)];
}

/** Live flag: has the learner explicitly picked a subject yet? */
export function useHasChosenSubject(): boolean {
  return useStore(chosenStore);
}
