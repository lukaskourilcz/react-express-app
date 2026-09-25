// Shared category metadata for the quiz and live-play flows.
//
// Single source of truth for the per-category label and brand/logo color so the
// solo quiz, the Play landing, and any future surface stay in sync.

import type { CategoryType } from '../types/quiz';
import type { TranslationKey } from '../i18n/translations';
import { getSubject, categoriesForSubject } from './subjects';
import { isRetiredTopic } from '../../../shared/retired-content';

export interface CategoryOption {
  value: CategoryType;
  label: string;
  /** Brand / programming-language logo color. */
  color: string;
}

/**
 * i18n key for a category's display name. The registry's `label` field is the
 * English fallback; user-visible surfaces should render
 * `t(categoryLabelKey(cat))` so Czech gets Czech topic names (same pattern as
 * subjectNameKey in subjects.ts).
 */
export const categoryLabelKey = (cat: string): TranslationKey => `category.${cat}` as TranslationKey;

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'html', label: 'HTML', color: '#e34c26' },
  { value: 'css', label: 'CSS', color: '#264de4' },
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6' },
  { value: 'react', label: 'React', color: '#61dafb' },
  { value: 'nextjs', label: 'Next.js', color: '#0b7285' },
  { value: 'nodejs', label: 'Node.js', color: '#339933' },
  { value: 'git', label: 'Git', color: '#f05032' },
  { value: 'dsa', label: 'DSA', color: '#6741d9' },
  { value: 'algorithms', label: 'Algorithms', color: '#ae3ec9' },
  { value: 'abbreviations', label: 'Abbreviations', color: '#0ea5e9' },
  { value: 'general', label: 'General', color: '#14b8a6' },
  { value: 'ai', label: 'AI & LLMs', color: '#7c3aed' },
  { value: 'cool-stuff', label: 'Cool Stuff', color: '#f97316' },
  { value: 'databases', label: 'Databases', color: '#336791' },
  { value: 'system-design', label: 'System Design', color: '#e8590c' },
  { value: 'testing', label: 'Testing', color: '#15803d' },
  { value: 'devops', label: 'DevOps & Cloud', color: '#2496ed' },
  { value: 'security', label: 'Security', color: '#b02a37' },
  { value: 'dev-world', label: 'Dev World', color: '#8b5cf6' },
  { value: 'code-snippets', label: 'Code Snippets', color: '#ec4899' },
];

export const CATEGORY_LOOKUP = new Map(CATEGORY_OPTIONS.map((c) => [c.value, c]));

// Categories shown only to the owner. The server enforces this too; hiding the
// chips here is UX only (not a security boundary).
export const OWNER_EMAIL = 'kouril.lukas@gmail.com';
export const PRIVATE_CATEGORIES: CategoryType[] = [];

// Casual/fun categories that belong in the social Play mode only — they are
// hidden from the solo Quiz picker and have no Learn path.
export const PLAY_ONLY_CATEGORIES: CategoryType[] = ['cool-stuff'];

// Categories whose logo color is light, so they need dark text for contrast.
// Text colour for content sitting on a category's brand hex. Computed from
// WCAG relative luminance instead of a hand-kept allowlist, which drifted and
// failed the 4.5:1 contrast bar (e.g. white on Node green #339933 = 3.66:1).
const onColorTextCache = new Map<string, string>();
function textOnColor(hex: string): string {
  const cached = onColorTextCache.get(hex);
  if (cached) return cached;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const chan = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
  // Contrast vs white = (1.05)/(lum+0.05); vs near-black #1a1a1a ≈ (lum+0.05)/(0.0602).
  const white = 1.05 / (lum + 0.05);
  const dark = (lum + 0.05) / 0.0602;
  const result = white >= dark ? '#fff' : '#1a1a1a';
  onColorTextCache.set(hex, result);
  return result;
}
export const onCategoryColorText = (cat: string) => textOnColor(getCategoryHexColor(cat));
export const getCategoryHexColor = (category: string) =>
  CATEGORY_LOOKUP.get(category as CategoryType)?.color || '#666';
export const getCategoryLabel = (category: string) =>
  CATEGORY_LOOKUP.get(category as CategoryType)?.label || category;

// The categories the current user is allowed to see/pick. Play-only categories
// (Cool Stuff) appear only when the caller opts in — the Play landing does,
// the solo Quiz picker doesn't.
export const visibleCategoryOptionsFor = (
  email?: string | null,
  opts: { includePlayOnly?: boolean } = {},
): CategoryOption[] => {
  // Scope to the subject's categories: the option list also names categories
  // that are not offered as quiz topics.
  const inSubject = new Set<string>(categoriesForSubject(getSubject()));
  // A retired section keeps its category — history and scope checks depend on
  // it — but it is never offered as something to choose. The label and colour
  // lookups below still resolve it, so an old attempt still renders with its
  // own name rather than as a blank.
  const scoped = CATEGORY_OPTIONS.filter((c) => inSubject.has(c.value) && !isRetiredTopic(c.value));
  const base =
    (email ?? '').toLowerCase() === OWNER_EMAIL
      ? scoped
      : scoped.filter((c) => !PRIVATE_CATEGORIES.includes(c.value));
  return opts.includePlayOnly ? base : base.filter((c) => !PLAY_ONLY_CATEGORIES.includes(c.value));
};

