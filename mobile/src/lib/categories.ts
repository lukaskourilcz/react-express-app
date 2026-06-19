// Category metadata, ported from the web client so labels and logo colors
// match. Kept framework-agnostic (plain data + helpers).

import type { CategoryType } from '../types';

export interface CategoryOption {
  value: CategoryType;
  label: string;
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
  { value: 'dev-world', label: 'Dev World', color: '#8b5cf6' },
  { value: 'code-snippets', label: 'Code Snippets', color: '#ec4899' },
];

const LOOKUP = new Map(CATEGORY_OPTIONS.map((c) => [c.value, c]));

export const getCategoryColor = (category: string) => LOOKUP.get(category as CategoryType)?.color || '#888';
export const getCategoryLabel = (category: string) => LOOKUP.get(category as CategoryType)?.label || category;
