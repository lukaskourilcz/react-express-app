/** Failure categories and the authored advice attached to them (issue #156).
 *
 * When a run or a submission fails, devShark says something more useful than
 * "wrong": it names the shape of the failure and offers the hint the author
 * wrote for exactly that shape. The categories are derived on the server from
 * what the graders already report — never from the hidden fixtures, which are
 * counted and never described.
 *
 * devShark ships no AI tutor. Every string here is authored, versioned with the
 * task, and shown as-is. */

import type { Localized } from './coding-catalog';

export type FailureStage = 'compile' | 'runtime' | 'test';

export type FailureCategory =
  /** An edge case fails while the ordinary cases pass. */
  | 'boundary'
  /** The input was changed in place instead of a new value being returned. */
  | 'mutation'
  /** TypeScript rejected the code or a type test failed. */
  | 'types'
  /** The right values in the wrong container, or the wrong number of them. */
  | 'output-shape'
  /** The function produced nothing. */
  | 'missing-return'
  /** The code threw before any assertion could run. */
  | 'threw'
  /** The code did not finish in time. */
  | 'timeout'
  /** Visible tests pass; something the visible tests do not cover fails. */
  | 'hidden-only';

export const FAILURE_CATEGORIES: readonly FailureCategory[] = [
  'boundary', 'mutation', 'types', 'output-shape', 'missing-return', 'threw', 'timeout', 'hidden-only',
];

export interface FailureAdvice {
  category: FailureCategory;
  stage: FailureStage;
  /** The authored advice. Never contains a hidden input or expected value. */
  body: Localized;
  /** Bumped with the task whenever its authored advice changes. */
  version: number;
  /** True when the advice was written for this task rather than the category. */
  taskSpecific: boolean;
}

/** What the classifier is allowed to look at. Deliberately narrow: counts and
 * flags from the visible run, never a hidden test's call or expectation. */
export interface FailureSignals {
  /** The verdict the grader reached. */
  outcome: 'failed' | 'error' | 'timeout';
  /** Per visible test: did it pass, and is it an edge case? */
  visible: { pass: boolean | null; edge: boolean }[];
  /** Hidden tests, as counts only. */
  hidden: { passed: number; total: number } | null;
  /** TypeScript rejected the code, or a type test failed. */
  typeErrors: number;
  /** The code threw before the assertions ran. */
  threw: boolean;
  /** Every visible failure produced `undefined`. */
  allUndefined: boolean;
  /** A visible failure returned the right values in the wrong container. */
  shapeMismatch: boolean;
  /** A visible test observed its input changed in place. */
  mutated: boolean;
}

export const stageOf = (category: FailureCategory): FailureStage =>
  category === 'types' ? 'compile' : category === 'threw' || category === 'timeout' ? 'runtime' : 'test';

/**
 * Pick the failure category. Order matters: a compile failure explains
 * everything after it, a thrown error explains every assertion, and a passing
 * visible run with a failing hidden run is its own, deliberately vague case.
 */
export function classifyFailure(signals: FailureSignals): FailureCategory {
  if (signals.outcome === 'timeout') return 'timeout';
  if (signals.typeErrors > 0) return 'types';
  if (signals.threw) return 'threw';
  if (signals.allUndefined) return 'missing-return';
  if (signals.mutated) return 'mutation';
  if (signals.shapeMismatch) return 'output-shape';
  const failedVisible = signals.visible.filter((one) => one.pass === false);
  if (failedVisible.length > 0 && failedVisible.every((one) => one.edge)) return 'boundary';
  if (failedVisible.length === 0 && signals.hidden && signals.hidden.passed < signals.hidden.total) return 'hidden-only';
  return 'output-shape';
}
