// Shared builder for the roadmap ("Learn") question sets.
//
// The roadmap is a Duolingo-style path: 25 levels per topic, 4 questions per
// level, ordered easiest → hardest. Rather than repeating the full Question
// shape 100× per topic, each topic file supplies a compact `Seed[]` and this
// helper expands it into real Question objects with deterministic ids
// (`<prefix>-<n>`), a level-derived difficulty, and a default hint.
//
// Level/difficulty mapping (8 questions per level, 25 levels):
//   question index i (0-based) → level = floor(i/8)+1 → difficulty = ceil(level/5)
// so levels 1-5 are difficulty 1, 6-10 are 2, … 21-25 are 5. With 8 per level,
// every 5-level checkpoint covers exactly 40 questions.

import type { Question, CategoryType } from './quiz-data';

export const QUESTIONS_PER_LEVEL = 8;
export const ROADMAP_LEVELS = 25;
// Each level is authored as two sets of 4 (A + B); the combiner interleaves them.
export const HALF_LEVEL = 4;

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
  /** Optional per-question hint; falls back to a shape-aware nudge (see hintFor). */
  intro?: string;
}

// Broad topic/category tags that don't make a useful "think about X" nudge on
// their own — we only name a tag in the hint when it's more specific than these.
const BROAD_TAGS = new Set([
  'javascript', 'typescript', 'react', 'html', 'css', 'node.js', 'nodejs', 'next.js',
  'git', 'roadmap', 'dsa', 'algorithms', 'sql', 'databases', 'system design',
  'devops', 'security', 'testing', 'general', 'web', 'frontend', 'backend',
]);

const GENERIC_HINT = "Focus on the core idea being tested and rule out the options that clearly don't fit.";

/**
 * A short, non-spoiling "little push" derived from a question's shape, so every
 * question shows a relevant hint on how to approach it instead of one generic
 * line repeated across the whole bank. Code questions get a tracing nudge;
 * "which / what is" questions get an elimination / recall nudge, etc. We also
 * name the most specific tag when there is one ("…Think about closures.").
 */
function hintFor(seed: Seed): string {
  const lower = seed.q.toLowerCase();
  const hasCode = seed.q.includes('```');

  let base: string;
  if (hasCode && /(return|output|print|log|console|result|evaluate|value|what does|what will|what is)/.test(lower)) {
    base = 'Trace the code line by line, tracking how each value changes, then match your result to an option.';
  } else if (hasCode) {
    base = 'Read the code slowly and run it in your head before scanning the answers.';
  } else if (/^\s*which\b/.test(lower) || lower.includes('which of')) {
    base = "Eliminate the options you can rule out first — the answer is often what's left.";
  } else if (lower.includes('true or false') || /^\s*(is|are|does|do|can|will|should|has|have)\b/.test(lower)) {
    base = 'Decide whether it holds in general, and watch for the edge cases.';
  } else if (/(what is|what does|purpose of|used for|meaning of|stands? for|difference between|when (to|should))/.test(lower)) {
    base = 'Recall what the concept is for, then pick the option that matches its purpose.';
  } else {
    base = GENERIC_HINT;
  }

  // Name the most specific (non-broad) tag for a topic nudge, if any.
  const specific = [...seed.tags].reverse().find((tg) => !BROAD_TAGS.has(tg.toLowerCase().trim()));
  return specific ? `${base} Think about ${specific}.` : base;
}

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
      introduction: s.intro ?? hintFor(s),
      question: s.q,
      options: s.opts,
      correctAnswer: s.a,
      category,
      explanation: s.e,
      difficulty: difficultyForLevel(level),
    } satisfies Question;
  });
}
