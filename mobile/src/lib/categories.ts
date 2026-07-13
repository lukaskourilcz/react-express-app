// Category metadata, ported from the web client so labels and logo colors
// match across web and mobile. Kept framework-agnostic (plain data + helpers).

import type { CategoryType } from '../types';
import { BRAND } from '../theme';

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

// Casual/fun categories that belong in social Play mode only — hidden from the
// solo Quiz picker and with no Learn path (mirrors the web client).
export const PLAY_ONLY_CATEGORIES: CategoryType[] = ['cool-stuff'];

const LOOKUP = new Map(CATEGORY_OPTIONS.map((c) => [c.value, c]));

// Categories whose logo color is light, so they need dark text for contrast.
const DARK_TEXT_CATEGORIES = new Set(['javascript', 'react', 'abbreviations', 'general', 'cool-stuff']);

export const getCategoryColor = (category: string) => LOOKUP.get(category as CategoryType)?.color || '#888';
export const getCategoryHexColor = (category: string) => LOOKUP.get(category as CategoryType)?.color || '#666';
export const getCategoryLabel = (category: string) => LOOKUP.get(category as CategoryType)?.label || category;
export const onCategoryColorText = (category: string) =>
  DARK_TEXT_CATEGORIES.has(category) ? '#1a1a1a' : '#fff';

/** Category options for the solo quiz picker (Play-only categories excluded). */
export const quizCategoryOptions = (): CategoryOption[] =>
  CATEGORY_OPTIONS.filter((c) => !PLAY_ONLY_CATEGORIES.includes(c.value));
