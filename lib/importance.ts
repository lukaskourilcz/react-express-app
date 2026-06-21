// Server-side importance resolver — the authority for "how important is this
// question for a student to know?" (1–10).
//
// The per-question hand-judged scores in question-importance.ts are the source
// of truth; the small category/difficulty/tag heuristic is only a fallback for
// questions with no hand-assigned score (e.g. brand-new custom questions created
// in /dev). A per-question DB override (question_edits.importance), when set, is
// applied by the questions store on top of this — see resolveImportance there.

import type { Question } from './quiz-data';
import { QUESTION_IMPORTANCE } from './question-importance';

const CATEGORY_WEIGHT: Record<string, number> = {
  javascript: 9, react: 9, typescript: 8, html: 7, css: 7, nodejs: 7, nextjs: 7,
  git: 7, general: 6, ai: 7, 'code-snippets': 6, dsa: 5,
  'dev-world': 4, algorithms: 3, abbreviations: 3,
};
const DEFAULT_CATEGORY_WEIGHT = 5;
const DIFFICULTY_ADJUST: Record<number, number> = { 1: 1, 2: 0.5, 3: 0, 4: -0.5, 5: -1 };
const BOOST_TAGS = ['security', 'performance', 'accessibility', 'a11y', 'async', 'promise', 'hooks', 'fundamental', 'core', 'fetch', 'state'];
const PENALTY_TAGS = ['trivia', 'history', 'deprecated', 'legacy', 'gotcha', 'edge case', 'obscure', 'acronym'];

export const clampImportance = (n: number): number => {
  const v = Math.round(n);
  return v < 1 ? 1 : v > 10 ? 10 : v;
};

function heuristic(q: Pick<Question, 'category' | 'difficulty' | 'tags'>): number {
  const base = CATEGORY_WEIGHT[q.category] ?? DEFAULT_CATEGORY_WEIGHT;
  const diff = DIFFICULTY_ADJUST[Math.round(q.difficulty)] ?? 0;
  const hay = (q.tags ?? []).map((t) => t.toLowerCase());
  const has = (list: string[]) => list.some((kw) => hay.some((t) => t.includes(kw)));
  let adj = 0;
  if (has(BOOST_TAGS)) adj += 1;
  if (has(PENALTY_TAGS)) adj -= 1;
  return clampImportance(base + diff + adj);
}

/** Hand-assigned score for the question id, or the heuristic if none exists. */
export function computeImportance(q: Pick<Question, 'id' | 'category' | 'difficulty' | 'tags'>): number {
  const hand = QUESTION_IMPORTANCE[q.id];
  return hand != null ? hand : heuristic(q);
}
