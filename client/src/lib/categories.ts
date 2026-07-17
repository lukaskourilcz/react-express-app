// Shared category metadata for the quiz and live-play flows.
//
// Single source of truth for the per-category label and brand/logo color so the
// solo quiz, the Play landing, and any future surface stay in sync.

import type { CategoryType } from '../types/quiz';
import type { TranslationKey } from '../i18n/translations';
import { getSubject, categoriesForSubject } from './subjects';

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
  // Geography
  { value: 'continents', label: 'Continents & Oceans', color: '#ea580c' },
  { value: 'capitals', label: 'Countries & Capitals', color: '#f97316' },
  { value: 'flags', label: 'Flags & Symbols', color: '#fb923c' },
  { value: 'landforms', label: 'Landforms', color: '#9a3412' },
  { value: 'climate', label: 'Climate & Biomes', color: '#d97706' },
  { value: 'population', label: 'Population & Cities', color: '#b45309' },
  { value: 'political', label: 'Political Geography', color: '#c2410c' },
  { value: 'economic', label: 'Economic Geography', color: '#f59e0b' },
  { value: 'cartography', label: 'Maps & Cartography', color: '#e8590c' },
  { value: 'earth', label: 'Earth & Geology', color: '#92400e' },
  // Math
  { value: 'arithmetic', label: 'Arithmetic', color: '#1565c0' },
  { value: 'fractions', label: 'Fractions & Decimals', color: '#0e7490' },
  { value: 'prealgebra', label: 'Pre-Algebra', color: '#2563eb' },
  { value: 'algebra', label: 'Algebra', color: '#7c3aed' },
  { value: 'geometry', label: 'Geometry', color: '#0891b2' },
  { value: 'trigonometry', label: 'Trigonometry', color: '#d97706' },
  { value: 'statistics', label: 'Statistics & Probability', color: '#db2777' },
  { value: 'precalculus', label: 'Pre-Calculus', color: '#059669' },
  { value: 'calculus', label: 'Calculus', color: '#4338ca' },
  { value: 'linear-algebra', label: 'Linear Algebra', color: '#0284c7' },
  // History
  { value: 'prehistory', label: 'Prehistory', color: '#a97142' },
  { value: 'ancient', label: 'Ancient Civilizations', color: '#64748b' },
  { value: 'classical', label: 'The Classical World', color: '#b08d57' },
  { value: 'medieval', label: 'The Middle Ages', color: '#6b7d4a' },
  { value: 'renaissance', label: 'Renaissance & Exploration', color: '#5b7a99' },
  { value: 'earlymodern', label: 'Early Modern & Revolutions', color: '#8c4a4a' },
  { value: 'industrial', label: 'The Industrial Age', color: '#b5651d' },
  { value: 'worldwars', label: 'The World Wars', color: '#7d7466' },
  { value: 'coldwar', label: 'The Cold War', color: '#5f8a8b' },
  { value: 'modern', label: 'The Modern World', color: '#6d5577' },
  // Chess
  { value: 'openings', label: 'Opening Principles', color: '#c8935f' },
  { value: 'tactics', label: 'Basic Tactics', color: '#d98a3d' },
  { value: 'strategy', label: 'Positional Strategy', color: '#8c5a3c' },
  { value: 'endgames', label: 'Essential Endgames', color: '#a0522d' },
  { value: 'combinations', label: 'Advanced Combinations', color: '#5e3820' },
  // Math (advanced)
  { value: 'discrete-math', label: 'Discrete Math', color: '#7c3aed' },
  { value: 'number-theory', label: 'Number Theory', color: '#b45309' },
  { value: 'multivariable-calculus', label: 'Multivariable Calculus', color: '#a21caf' },
  { value: 'differential-equations', label: 'Differential Equations', color: '#0891b2' },
  { value: 'real-analysis', label: 'Real Analysis', color: '#be123c' },
  // Geography (advanced)
  { value: 'geomorphology', label: 'Geomorphology', color: '#a16207' },
  { value: 'oceanography', label: 'Oceanography', color: '#0369a1' },
  { value: 'biogeography', label: 'Biogeography', color: '#15803d' },
  { value: 'geopolitics', label: 'Geopolitics', color: '#7c2d12' },
  { value: 'gis', label: 'GIS & Mapping', color: '#6d28d9' },
  // History (thematic)
  { value: 'historiography', label: 'Historiography', color: '#57534e' },
  { value: 'history-of-science', label: 'History of Science', color: '#0e7490' },
  { value: 'economic-history', label: 'Economic History', color: '#a16207' },
  { value: 'intellectual-history', label: 'Intellectual History', color: '#6d28d9' },
  { value: 'military-history', label: 'Military History', color: '#7f1d1d' },
  // Human Biology
  { value: 'cell-biology', label: 'Cell Biology', color: '#0d9488' },
  { value: 'skeletal-system', label: 'Skeletal System', color: '#64748b' },
  { value: 'muscular-system', label: 'Muscular System', color: '#dc2626' },
  { value: 'nervous-system', label: 'Nervous System', color: '#7c3aed' },
  { value: 'endocrine-system', label: 'Endocrine System', color: '#d946ef' },
  { value: 'cardiovascular-system', label: 'Cardiovascular System', color: '#e11d48' },
  { value: 'respiratory-system', label: 'Respiratory System', color: '#0891b2' },
  { value: 'digestive-system', label: 'Digestive System', color: '#ca8a04' },
  { value: 'immune-system', label: 'Immune System', color: '#16a34a' },
  { value: 'reproductive-system', label: 'Reproductive & Urinary', color: '#db2777' },
  // Chess (advanced)
  { value: 'opening-theory', label: 'Opening Theory', color: '#166534' },
  { value: 'middlegame', label: 'Middlegame', color: '#9a3412' },
  { value: 'pawn-structures', label: 'Pawn Structures', color: '#a16207' },
  { value: 'endgame-technique', label: 'Endgame Technique', color: '#7c2d12' },
  { value: 'chess-history', label: 'Chess History', color: '#4d7c0f' },
  // Poker
  { value: 'positions', label: 'Position', color: '#ea580c' },
  { value: 'starting-hands', label: 'Starting Hands', color: '#d97706' },
  { value: 'pot-odds', label: 'Pot Odds & Equity', color: '#ca8a04' },
  { value: 'betting-strategy', label: 'Betting Strategy', color: '#65a30d' },
  { value: 'postflop', label: 'Postflop Play', color: '#0d9488' },
  { value: 'tournament-play', label: 'Tournaments', color: '#0891b2' },
  { value: 'psychology', label: 'Psychology', color: '#7c3aed' },
  { value: 'gto-advanced', label: 'GTO & Theory', color: '#4338ca' },
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
// WCAG relative luminance instead of a hand-kept allowlist — with ~100
// category colours across subjects, the list drifted and ~40% of pairs failed
// the 4.5:1 contrast bar (e.g. white on Node green #339933 = 3.66:1).
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
  // Scope to the active subject so each subject's picker shows only its own
  // categories (subjects are disjoint, so this is an exact partition).
  const inSubject = new Set<string>(categoriesForSubject(getSubject()));
  const scoped = CATEGORY_OPTIONS.filter((c) => inSubject.has(c.value));
  const base =
    (email ?? '').toLowerCase() === OWNER_EMAIL
      ? scoped
      : scoped.filter((c) => !PRIVATE_CATEGORIES.includes(c.value));
  return opts.includePlayOnly ? base : base.filter((c) => !PLAY_ONLY_CATEGORIES.includes(c.value));
};

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
  if (colors.length === 0) return 'var(--brand-accent)';
  if (colors.length === 1) return colors[0];
  return `linear-gradient(90deg, ${colors.join(', ')})`;
}
