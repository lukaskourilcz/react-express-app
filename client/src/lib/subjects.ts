// The learning *subject*. devShark teaches one, web development (`webdev`).
// It stays an explicit key because progress, XP, tokens, the shop and the
// database are all keyed by subject, and stored progress keeps those keys.

import type { CategoryType, RoadmapTopic } from '../types/quiz';
import type { TranslationKey } from '../i18n/translations';
import { SUBJECT_SCOPE_CATALOG, deliveryCategories } from '../../../shared/subject-catalog';

/**
 * i18n keys for a subject's display name / blurb — the registry's `label` and
 * `blurb` fields are the English fallbacks; user-visible surfaces should
 * render `t(subjectNameKey(id))`.
 */
export const subjectNameKey = (id: SubjectId): TranslationKey => `subject.${id}.name` as TranslationKey;

export type SubjectId = 'webdev';
export const SUBJECT_ORDER: SubjectId[] = ['webdev'];

export interface SubjectDef {
  id: SubjectId;
  label: string;
  /** One-line pitch for the subject. */
  blurb: string;
  /** Primary accent (light mode) — drives the product tokens. */
  accent: string;
  /** Legible accent for small text on dark surfaces. */
  accentBright: string;
  /** Roadmap ("Learn") topics, in path order. */
  topics: RoadmapTopic[];
  /** Categories available in the solo Quiz / Play pickers. */
  categories: CategoryType[];
  /** The product wordmark. */
  standaloneBrand: string;
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
};

/** Type guard for a SubjectId — used by the per-subject XP/token/shop stores. */
export const isSubjectId = (v: unknown): v is SubjectId =>
  typeof v === 'string' && (SUBJECT_ORDER as string[]).includes(v);

export const topicsForSubject = (id: SubjectId): RoadmapTopic[] => SUBJECTS[id].topics;
export const categoriesForSubject = (id: SubjectId): CategoryType[] => SUBJECTS[id].categories;
/** The categories to ask the server for questions from. `categoriesForSubject`
 * still lists the retired sections, which is right for reading history (the
 * leaderboards) and wrong for a request for questions: the server refuses a
 * retired category, and with it the whole request. */
export const deliveryCategoriesForSubject = (id: SubjectId): CategoryType[] => deliveryCategories(id) as CategoryType[];

// Cached topic set, for scoping XP computations to the subject.
const TOPIC_SETS = new Map<SubjectId, ReadonlySet<string>>();
export function topicSetForSubject(id: SubjectId): ReadonlySet<string> {
  let set = TOPIC_SETS.get(id);
  if (!set) {
    set = new Set<string>(SUBJECTS[id].topics);
    TOPIC_SETS.set(id, set);
  }
  return set;
}

/** The active subject. There is one, so it never changes. */
const ACTIVE_SUBJECT: SubjectId = 'webdev';

/** Imperative snapshot of the active subject (for non-React callers). */
export const getSubject = (): SubjectId => ACTIVE_SUBJECT;

/** The active subject, in the tuple shape the per-subject stores destructure. */
export function useSubject(): [SubjectId] {
  return [ACTIVE_SUBJECT];
}

/** The active subject's definition. */
export function useActiveSubject(): SubjectDef {
  return SUBJECTS[ACTIVE_SUBJECT];
}
