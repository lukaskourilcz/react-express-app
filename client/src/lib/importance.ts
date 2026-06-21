// Importance scoring — "how important is this question for a student to know?"
//
// The source of truth is a per-question score (1–10) hand-judged for every
// question in the bank, stored in question-importance.ts. computeImportance()
// looks a question up by id; the category/difficulty/tag heuristic below is only
// a fallback for questions with no hand-assigned score (e.g. brand-new custom
// questions created in /dev). Higher = more essential to day-to-day web work;
// low scores are "filler" trivia (obscure acronyms, puzzles, contrived gotchas).

import { QUESTION_IMPORTANCE } from './question-importance';

export interface ScorableQuestion {
  id?: string;
  category: string;
  difficulty: number;
  tags: string[];
}

// Category is the dominant signal: the bread-and-butter of the modern stack
// (JS/TS/React/HTML/CSS/Node/Next/Git) scores high; interview-style DSA sits in
// the middle; acronym trivia and logic puzzles are the classic "fillers".
const CATEGORY_WEIGHT: Record<string, number> = {
  javascript: 9,
  react: 9,
  typescript: 8,
  html: 7,
  css: 7,
  nodejs: 7,
  nextjs: 7,
  git: 7,
  general: 6,
  'code-snippets': 6,
  dsa: 5,
  custom: 5,
  apt: 5,
  'dev-world': 4,
  algorithms: 3,
  abbreviations: 3,
};
const DEFAULT_CATEGORY_WEIGHT = 5;

// Importance ≈ how essential the knowledge is, which skews toward fundamentals:
// reward the basics, gently dock very advanced edge cases that rarely come up.
const DIFFICULTY_ADJUST: Record<number, number> = { 1: 1, 2: 0.5, 3: 0, 4: -0.5, 5: -1 };

// Tag keywords that nudge the score up (core, evergreen concerns) or down
// (trivia / legacy / niche gotchas). Matched case-insensitively as substrings.
const BOOST_TAGS = ['security', 'performance', 'accessibility', 'a11y', 'async', 'promise', 'hooks', 'fundamental', 'core', 'fetch', 'state'];
const PENALTY_TAGS = ['trivia', 'history', 'deprecated', 'legacy', 'gotcha', 'edge case', 'obscure', 'acronym'];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function tagAdjustment(tags: string[]): number {
  const hay = tags.map((t) => t.toLowerCase());
  const has = (list: string[]) => list.some((kw) => hay.some((t) => t.includes(kw)));
  let adj = 0;
  if (has(BOOST_TAGS)) adj += 1;
  if (has(PENALTY_TAGS)) adj -= 1;
  return adj;
}

/** Heuristic fallback for questions with no hand-assigned score. */
function heuristicImportance(q: ScorableQuestion): number {
  const base = CATEGORY_WEIGHT[q.category] ?? DEFAULT_CATEGORY_WEIGHT;
  const diff = DIFFICULTY_ADJUST[Math.round(q.difficulty)] ?? 0;
  const score = base + diff + tagAdjustment(q.tags);
  return clamp(Math.round(score), 1, 10);
}

/**
 * Importance score (1–10) for a question. Uses the hand-judged per-question
 * score when available (the common case for the built-in bank), falling back to
 * the heuristic for questions not in the map (e.g. newly created custom ones).
 */
export function computeImportance(q: ScorableQuestion): number {
  if (q.id && QUESTION_IMPORTANCE[q.id] != null) return QUESTION_IMPORTANCE[q.id];
  return heuristicImportance(q);
}

/** Coarse band used for filtering/labelling in the dev console. */
export type ImportanceBand = 'filler' | 'low' | 'medium' | 'high' | 'essential';

export function importanceBand(score: number): ImportanceBand {
  if (score <= 3) return 'filler';
  if (score <= 5) return 'low';
  if (score <= 7) return 'medium';
  if (score <= 9) return 'high';
  return 'essential';
}

export const IMPORTANCE_BAND_LABEL: Record<ImportanceBand, string> = {
  filler: 'Filler (1–3)',
  low: 'Low (4–5)',
  medium: 'Medium (6–7)',
  high: 'High (8–9)',
  essential: 'Essential (10)',
};
