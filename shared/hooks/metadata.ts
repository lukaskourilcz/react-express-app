import type { HookQuestionContext } from './types';

/**
 * Does this question carry a code snippet?
 *
 * Fenced blocks, the same convention `renderQuestion` splits on and the same test the studio's
 * bank importer uses — the two have to agree or `hasCode` licenses a claim on one side that the
 * other would not.
 *
 * Evaluated against the **English** text. A translation can drop or mangle a fence, and `hasCode`
 * is a fact about the question rather than about its Czech rendering.
 */
export function hasFencedCode(input: { readonly question: string; readonly introduction?: string | null }): boolean {
  return input.question.includes('```') || (input.introduction ?? '').includes('```');
}

/**
 * The shape a served question needs to carry for its gates to be evaluable on the client.
 *
 * Two of these cannot be derived from what the API used to send, which is why they are sent
 * explicitly rather than guessed:
 *
 * - `hasCode` is computed server-side from the English source. The client only ever receives the
 *   localized question, so computing it there would read a translation.
 * - `questionEn` is the canonical English text, sent only when the reader is not on English.
 *   `questionStartsWith` is bound to canonical English — a decision taken upstream and pinned by
 *   the conformance vectors — so a Czech reader's card still needs the English to evaluate it.
 *
 * Nothing here has a default. A wrong `difficulty` silently makes a hook dishonest, so a missing
 * field is a build error rather than a zero.
 */
export interface HookServedQuestion {
  readonly question: string;
  readonly options: readonly string[];
  readonly category: string;
  readonly difficulty: number;
  readonly hasCode: boolean;
  /** Absent when the reader is already on English, in which case `question` is the English. */
  readonly questionEn?: string;
}

export function hookContextFrom(question: HookServedQuestion): HookQuestionContext {
  return {
    difficulty: question.difficulty,
    hasCode: question.hasCode,
    category: question.category,
    optionCount: question.options.length,
    canonicalEnglishQuestion: question.questionEn ?? question.question,
  };
}
