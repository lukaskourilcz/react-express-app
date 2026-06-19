// Shared builder for the roadmap ("Learn") question sets.
//
// The roadmap is a Duolingo-style path: 25 levels per topic, 4 questions per
// level, ordered easiest → hardest. Rather than repeating the full Question
// shape 100× per topic, each topic file supplies a compact `Seed[]` and this
// helper expands it into real Question objects with deterministic ids
// (`<prefix>-<n>`), a level-derived difficulty, and a default hint.
//
// Level/difficulty mapping (4 questions per level, 25 levels):
//   question index i (0-based) → level = floor(i/4)+1 → difficulty = ceil(level/5)
// so levels 1-5 are difficulty 1, 6-10 are 2, … 21-25 are 5.

import type { Question, CategoryType } from './quiz-data';

export const QUESTIONS_PER_LEVEL = 4;
export const ROADMAP_LEVELS = 25;

export interface Seed {
  /** Question text; may embed a fenced code block (```js … ```). */
  q: string;
  /** Answer choices. */
  opts: string[];
  /** Index of the correct choice in `opts`. */
  a: number;
  /** Explanation shown after answering. */
  e: string;
  /** Topic tags (the builder always prepends "Roadmap"). */
  tags: string[];
  /** Optional per-question hint; falls back to a generic prompt. */
  intro?: string;
}

const DEFAULT_INTRO = 'Read the code carefully and predict what it does or returns.';

export function levelForIndex(i: number): number {
  return Math.floor(i / QUESTIONS_PER_LEVEL) + 1;
}

export function difficultyForLevel(level: number): Question['difficulty'] {
  return Math.min(5, Math.max(1, Math.ceil(level / 5))) as Question['difficulty'];
}

/** Expand a topic's compact seeds into full Question objects. */
export function buildRoadmap(prefix: string, category: CategoryType, seeds: Seed[]): Question[] {
  return seeds.map((s, i) => {
    const level = levelForIndex(i);
    return {
      id: `${prefix}-${i + 1}`,
      tags: ['Roadmap', ...s.tags],
      introduction: s.intro ?? DEFAULT_INTRO,
      question: s.q,
      options: s.opts,
      correctAnswer: s.a,
      category,
      explanation: s.e,
      difficulty: difficultyForLevel(level),
    } satisfies Question;
  });
}
