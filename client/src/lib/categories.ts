// Shared category metadata for the quiz and live-play flows.
//
// Single source of truth for the per-category label and brand/logo color so the
// solo quiz, the Play landing, and any future surface stay in sync.

import type { CategoryType } from '../types/quiz';
import { BRAND } from '../theme/MuiTheme';

export interface CategoryOption {
  value: CategoryType;
  label: string;
  /** Brand / programming-language logo color. */
  color: string;
}

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
  { value: 'internet', label: 'The Internet', color: '#0ca678' },
  { value: 'ai', label: 'AI & LLMs', color: '#7c3aed' },
  { value: 'rhf-zod', label: 'React Hook Form + Zod', color: '#ec5990' },
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

// Categories whose logo color is light, so they need dark text for contrast.
const DARK_TEXT_CATEGORIES = new Set(['javascript', 'react']);
export const onCategoryColorText = (cat: string) =>
  DARK_TEXT_CATEGORIES.has(cat) ? '#1a1a1a' : '#fff';
export const getCategoryHexColor = (category: string) =>
  CATEGORY_LOOKUP.get(category as CategoryType)?.color || '#666';
export const getCategoryLabel = (category: string) =>
  CATEGORY_LOOKUP.get(category as CategoryType)?.label || category;

// The categories the current user is allowed to see/pick.
export const visibleCategoryOptionsFor = (email?: string | null): CategoryOption[] =>
  (email ?? '').toLowerCase() === OWNER_EMAIL
    ? CATEGORY_OPTIONS
    : CATEGORY_OPTIONS.filter((c) => !PRIVATE_CATEGORIES.includes(c.value));

// Build a progress-bar fill from the categories actually present in a quiz.
// One category → its solid logo color (e.g. React → #61dafb); several → a
// gradient blending those categories' logo colors, ordered to match the picker.
const CATEGORY_ORDER = CATEGORY_OPTIONS.map((c) => c.value);
export function categoryProgressBackground(categories: string[]): string {
  const unique = Array.from(new Set(categories)).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a as CategoryType) - CATEGORY_ORDER.indexOf(b as CategoryType),
  );
  const colors = unique.map(getCategoryHexColor);
  if (colors.length === 0) return BRAND.green;
  if (colors.length === 1) return colors[0];
  return `linear-gradient(90deg, ${colors.join(', ')})`;
}
