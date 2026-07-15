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
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';

export type SubjectId = 'webdev' | 'geography' | 'math' | 'history' | 'chess';
export const SUBJECT_ORDER: SubjectId[] = ['webdev', 'geography', 'math', 'history', 'chess'];

export interface SubjectDef {
  id: SubjectId;
  label: string;
  /** One-line pitch shown on the subject picker card. */
  blurb: string;
  /** Emoji glyph for the picker card / subject switcher. */
  emoji: string;
  /** Primary accent (light mode) — drives the MUI primary palette per subject. */
  accent: string;
  /** Legible accent for small text on dark surfaces. */
  accentBright: string;
  /** Roadmap ("Learn") topics for this subject, in path order. */
  topics: RoadmapTopic[];
  /** Categories available in the solo Quiz / Play pickers for this subject. */
  categories: CategoryType[];
}

export const SUBJECTS: Record<SubjectId, SubjectDef> = {
  webdev: {
    id: 'webdev',
    label: 'Web Dev',
    blurb: 'Frontend, backend and fullstack — the languages and tools of the modern web.',
    emoji: '💻',
    accent: '#2d7a2d',
    accentBright: '#4caf50',
    topics: [
      'javascript', 'typescript', 'react', 'nextjs', 'nodejs',
      'html', 'css', 'git', 'dsa', 'algorithms',
      'abbreviations', 'general', 'internet', 'ai', 'rhf-zod',
      'databases', 'system-design', 'testing', 'devops', 'security',
    ],
    categories: [
      'html', 'css', 'javascript', 'typescript', 'react', 'nextjs', 'nodejs',
      'git', 'dsa', 'algorithms', 'abbreviations', 'general', 'internet', 'ai',
      'rhf-zod', 'cool-stuff', 'databases', 'system-design', 'testing', 'devops',
      'security', 'dev-world', 'code-snippets',
    ],
  },
  geography: {
    id: 'geography',
    label: 'Geography',
    blurb: 'The whole world: continents, countries, capitals, climate and the Earth itself.',
    emoji: '🌍',
    accent: '#ea580c',
    accentBright: '#fb923c',
    topics: ['continents', 'capitals', 'flags', 'landforms', 'climate', 'population', 'political', 'economic', 'cartography', 'earth'],
    categories: ['continents', 'capitals', 'flags', 'landforms', 'climate', 'population', 'political', 'economic', 'cartography', 'earth'],
  },
  math: {
    id: 'math',
    label: 'Math',
    blurb: 'From arithmetic all the way to university analysis — build real fluency, level by level.',
    emoji: '➗',
    accent: '#1565c0',
    accentBright: '#42a5f5',
    topics: ['arithmetic', 'fractions', 'prealgebra', 'algebra', 'geometry', 'trigonometry', 'statistics', 'precalculus', 'calculus', 'linear-algebra', 'discrete-math', 'number-theory', 'multivariable-calculus', 'differential-equations', 'real-analysis'],
    categories: ['arithmetic', 'fractions', 'prealgebra', 'algebra', 'geometry', 'trigonometry', 'statistics', 'precalculus', 'calculus', 'linear-algebra', 'discrete-math', 'number-theory', 'multivariable-calculus', 'differential-equations', 'real-analysis'],
  },
  history: {
    id: 'history',
    label: 'History',
    blurb: 'The human story from prehistory to the modern era, age by age.',
    emoji: '📜',
    accent: '#4b5563',
    accentBright: '#9ca3af',
    topics: ['prehistory', 'ancient', 'classical', 'medieval', 'renaissance', 'earlymodern', 'industrial', 'worldwars', 'coldwar', 'modern'],
    categories: ['prehistory', 'ancient', 'classical', 'medieval', 'renaissance', 'earlymodern', 'industrial', 'worldwars', 'coldwar', 'modern'],
  },
  chess: {
    id: 'chess',
    label: 'Chess',
    blurb: 'Learn the game for real: rules, tactics, openings, endgames and strategy.',
    emoji: '♟️',
    accent: '#7b4b2a',
    accentBright: '#c8935f',
    topics: ['rules', 'pieces', 'specialmoves', 'checkmate', 'notation', 'openings', 'tactics', 'strategy', 'endgames', 'combinations'],
    categories: ['rules', 'pieces', 'specialmoves', 'checkmate', 'notation', 'openings', 'tactics', 'strategy', 'endgames', 'combinations'],
  },
};

const isSubject = (v: unknown): v is SubjectId =>
  typeof v === 'string' && (SUBJECT_ORDER as string[]).includes(v);

export const topicsForSubject = (id: SubjectId): RoadmapTopic[] => SUBJECTS[id].topics;
export const categoriesForSubject = (id: SubjectId): CategoryType[] => SUBJECTS[id].categories;

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

/* ──── Persisted, shared active-subject selection ───────────────────────── */

const SUBJECT_KEY = 'studyshark:subject';
// Whether the learner has explicitly picked a subject (vs. the default), which
// drives the landing gate: show the picker until a subject is chosen.
const SUBJECT_CHOSEN_KEY = 'studyshark:subject:chosen';

const readSubject = (): SubjectId => {
  const saved = readJSON<string>(SUBJECT_KEY, 'webdev');
  return isSubject(saved) ? saved : 'webdev';
};
const readChosen = (): boolean => readJSON<boolean>(SUBJECT_CHOSEN_KEY, false) === true;

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
