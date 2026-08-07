// Types for the hook library this app receives from the quorum monorepo.
//
// Hook copy is NOT owned here. The library, its knowledge docs and its lint live next to the
// Carousel Studio in quorum and arrive as a bounded `hook-library/1` delivery (quiz.hooks.json
// plus conformance vectors, hash + receipt). This repo owns selection mechanics and per-user
// state and nothing else — a string edited here is overwritten by the next delivery, so a wrong
// line is reported upstream rather than fixed locally. See docs/hooks/README.md in quorum.

/** The two verticals of the quiz surface. devShark is `dev`; StudyShark/geoShark is `geo`. */
export type HookVertical = 'dev' | 'geo';

export type HookLang = 'en' | 'cs';

/**
 * A parsed gate.
 *
 * The library writes `truthRequires` as strings ("difficultyAtLeast:3") because the same JSON is
 * read by two implementations. Here it is a discriminated union with the `:N`/`:X` suffix parsed
 * once at load time, so the evaluator branches on `kind` and reads a number that is already a
 * number — nothing downstream re-splits a string.
 */
export type HookPredicate =
  | { readonly kind: 'always' }
  | { readonly kind: 'hasCode' }
  | { readonly kind: 'optionsAtLeast'; readonly count: number }
  | { readonly kind: 'difficultyAtLeast'; readonly level: number }
  | { readonly kind: 'categoryIn'; readonly list: string }
  | { readonly kind: 'questionStartsWith'; readonly prefix: string };

/** The quiz surface's whole vocabulary. A predicate outside it fails the library load. */
export const QUIZ_PREDICATE_ARITY: Readonly<Record<string, 'none' | 'number' | 'string'>> = {
  always: 'none',
  hasCode: 'none',
  optionsAtLeast: 'number',
  difficultyAtLeast: 'number',
  categoryIn: 'string',
  questionStartsWith: 'string',
};

/**
 * Predicates specified upstream but not built yet.
 *
 * Named so a hook gated on one reports "not built yet, see the Tier B issue" instead of "unknown
 * predicate" — the difference between a build order and a typo. None of them can be satisfied
 * here, so a hook carrying one must not be delivered until this app implements it.
 */
export const TIER_B_PREDICATES: readonly string[] = [
  'statsReady',
  'accuracyBelow',
  'accuracyAtLeast',
  'streakAtLeast',
  'missedTopicBefore',
  'timerEnabled',
  'optionsExactly',
];

export interface HookVariant {
  readonly en: string;
  readonly cs: string;
}

/** A hook with its gates parsed. `rawRequires` keeps the strings for logging and diagnostics. */
export interface Hook {
  readonly id: string;
  readonly cooldownDays: number;
  readonly truthRequires: readonly HookPredicate[];
  readonly rawRequires: readonly string[];
  readonly variants: Partial<Record<HookVertical, HookVariant>>;
}

/**
 * What a gate is evaluated against.
 *
 * `canonicalEnglishQuestion` is deliberately named. `questionStartsWith` is bound to the
 * question's English text whatever language the reader sees, a decision taken upstream and pinned
 * by the conformance vectors — a Czech question opening "Proč" whose English opens "What" is NOT
 * eligible, and English "Why" is eligible however the Czech reads. Do not re-decide it here; the
 * vectors are the spec and this implementation is what gets corrected if they disagree.
 */
export interface HookQuestionContext {
  readonly difficulty: number;
  readonly hasCode: boolean;
  readonly category: string;
  readonly optionCount: number;
  readonly canonicalEnglishQuestion: string;
}

/** List key → the categories it contains, as the brand declares them. */
export type HookCategoryLists = Readonly<Record<string, readonly string[]>>;

export interface HookEvalContext {
  readonly subject: HookQuestionContext;
  readonly categoryLists: HookCategoryLists;
}

/** A malformed delivery is a startup failure, never a silent render-time skip. */
export class HookLibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HookLibraryError';
  }
}
