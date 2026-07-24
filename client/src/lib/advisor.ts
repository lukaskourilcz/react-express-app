// Study advisor — the read-only "weakest areas + suggested week" wrapper (S5).
// The server ranks the subject's verified per-category accuracy and lays the
// weakest categories across a practice week; it never mutates and never
// diagnoses. `focus` is a stable token the client localizes. Category ids are
// localized by the component via `categoryLabelKey`; `focus` via `advisorFocusKey`.

import { apiFetch } from './api';
import { categoryLabelKey } from './categories';
import type { SubjectId } from './subjects';
import type { TranslationKey } from '../i18n/translations';

export type AdvisorFocus = 'recall' | 'practice' | 'apply';

/** One weak area: a category, its rounded accuracy %, and how many answered. */
export interface WeakArea {
  category: string;
  accuracyPct: number;
  answered: number;
}

/** One day of the suggested practice week. */
export interface SuggestedDay {
  day: number;
  category: string;
  focus: AdvisorFocus;
}

/** GET /api/user/advisor result. */
export interface Advice {
  weakAreas: WeakArea[];
  suggestedWeek: SuggestedDay[];
  /** ISO timestamp; '' in the empty/offline fallback. */
  generatedAt: string;
}

const EMPTY_ADVICE: Advice = { weakAreas: [], suggestedWeek: [], generatedAt: '' };

const FOCUS_VALUES: readonly AdvisorFocus[] = ['recall', 'practice', 'apply'];
const isFocus = (v: unknown): v is AdvisorFocus =>
  typeof v === 'string' && (FOCUS_VALUES as readonly string[]).includes(v);

/** i18n key for a category's display name (same resolver Learn/Quiz use). */
export const advisorCategoryKey = (category: string): TranslationKey => categoryLabelKey(category);

/** i18n key for a focus token. */
export const advisorFocusKey = (focus: AdvisorFocus): TranslationKey =>
  `advisor.focus.${focus}` as TranslationKey;

interface RawAdvice {
  weakAreas?: unknown;
  suggestedWeek?: unknown;
  generatedAt?: unknown;
}

function normalize(res: RawAdvice): Advice {
  const weakAreas: WeakArea[] = Array.isArray(res.weakAreas)
    ? res.weakAreas
        .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
        .filter((w) => typeof w.category === 'string')
        .map((w) => ({
          category: String(w.category),
          accuracyPct: Number(w.accuracyPct) || 0,
          answered: Number(w.answered) || 0,
        }))
    : [];
  const suggestedWeek: SuggestedDay[] = Array.isArray(res.suggestedWeek)
    ? res.suggestedWeek
        .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
        .filter((d) => typeof d.category === 'string' && isFocus(d.focus))
        .map((d) => ({
          day: Number(d.day) || 0,
          category: String(d.category),
          focus: d.focus as AdvisorFocus,
        }))
    : [];
  return {
    weakAreas,
    suggestedWeek,
    generatedAt: typeof res.generatedAt === 'string' ? res.generatedAt : '',
  };
}

/**
 * Read the subject's weakest areas + a suggested practice week. Never throws:
 * offline / signed-out / migration-missing / too-little-data resolve to empty
 * advice (the component renders its "all strong / not enough data" state).
 */
export async function getAdvice(subject: SubjectId): Promise<Advice> {
  try {
    const res = await apiFetch<RawAdvice>(
      `/api/user/advisor?subject=${encodeURIComponent(subject)}`,
    );
    return normalize(res);
  } catch {
    return { ...EMPTY_ADVICE };
  }
}
