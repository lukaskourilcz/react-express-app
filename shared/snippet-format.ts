/** Code snippets as a question format, rather than as a subject.
 *
 * Code Snippets used to be a devShark topic: a collection of language tricks
 * with nothing tying any of them to what the learner was building. The
 * confusion underneath it was between the *subject* — what is being learned —
 * and the *format* — how it is practised. Reading a piece of code and
 * predicting what it does is a format. It belongs inside JavaScript when it
 * teaches closures, inside React when it teaches state updates, and inside DSA
 * when it teaches what a queue costs.
 *
 * So the topic is retired and this is what replaced it: metadata a question in
 * any topic can carry, saying what language the code is in, which kind of
 * reading it asks for, and what it is teaching. Declared, not inferred — a
 * fenced code block is not by itself a snippet question, and guessing from the
 * text would make the count and the pacing meaningless.
 *
 * Reading is not writing. A snippet question is evidence that the learner can
 * follow code; the coding tasks remain the evidence that they can produce it,
 * and neither stands in for the other. That is why this lives beside the
 * question rather than inside the coding contracts. */

/** What kind of reading the snippet asks for. One per question. */
export const SNIPPET_SUBTYPES = [
  /** What does this produce, or what state does it end in? */
  'predict',
  /** Which line is wrong, or what is the smallest correct repair? */
  'find-bug',
  /** Which implementation satisfies the stated requirement? */
  'choose-implementation',
  /** Follow the order of execution, the data flow, or an operation on a structure. */
  'trace',
  /** Which expression or line completes it? */
  'complete',
] as const;
export type SnippetSubtype = (typeof SNIPPET_SUBTYPES)[number];
export const isSnippetSubtype = (value: unknown): value is SnippetSubtype =>
  typeof value === 'string' && (SNIPPET_SUBTYPES as readonly string[]).includes(value);

/** The notation the code is written in. `pseudocode` and `sql` are here because
 * not every readable snippet is a program in a language we run. */
export const SNIPPET_LANGUAGES = [
  'javascript', 'typescript', 'jsx', 'html', 'css', 'sql', 'bash', 'yaml', 'diff', 'pseudocode',
] as const;
export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number];
export const isSnippetLanguage = (value: unknown): value is SnippetLanguage =>
  typeof value === 'string' && (SNIPPET_LANGUAGES as readonly string[]).includes(value);

/** Versioned so a later change to what the metadata means is a new version
 * rather than a silent reinterpretation of what authors already wrote. */
export const SNIPPET_METADATA_VERSION = 1;

export interface SnippetMeta {
  version: typeof SNIPPET_METADATA_VERSION;
  language: SnippetLanguage;
  subtype: SnippetSubtype;
  /** One line on what this question teaches. Not shown to the learner; it is
   * what makes a coverage report possible and a duplicate obvious. */
  objective: string;
  /** Concepts the learner needs before this makes sense, so a snippet is never
   * placed ahead of the lesson that explains it. */
  requires?: string[];
  /** Anything the reader has to assume — a runtime, a version, an ordering —
   * stated rather than left for them to guess wrong. */
  assumes?: string;
}

/* ── pacing ────────────────────────────────────────────────────────────── */

/**
 * How many snippet questions a level of `total` questions should hold.
 *
 * Roughly one in four, which is an authoring guideline and not a quota: a
 * topic whose material does not suit code reading should have fewer, and the
 * validator reports a shortfall rather than failing on it. Filling a level with
 * weak snippets to reach a number is worse than having none.
 */
export const suggestedSnippetCount = (total: number): number => Math.max(1, Math.round(total / 4));

/**
 * Whether an ordering of questions paces its snippets acceptably: never more
 * than two in a row, and no two identical subtypes adjacent.
 *
 * Both rules exist for the same reason — a run of the same shape teaches the
 * shape rather than the material, and a strictly alternating sequence teaches
 * the pattern of the quiz.
 */
export function pacingProblems(sequence: readonly (SnippetMeta | undefined)[]): string[] {
  const problems: string[] = [];
  let run = 0;
  for (let index = 0; index < sequence.length; index++) {
    const current = sequence[index];
    run = current ? run + 1 : 0;
    if (run > 2) problems.push(`three snippets in a row at position ${index + 1}`);
    const previous = sequence[index - 1];
    if (current && previous && current.subtype === previous.subtype) {
      problems.push(`two ${current.subtype} snippets in a row at position ${index + 1}`);
    }
  }
  return problems;
}
