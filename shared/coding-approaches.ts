/** Curated solution comparisons, shown after a verified pass (issue #158).
 *
 * Two or three original approaches per supported task, each with its cost, the
 * assumptions it makes and what it trades away — so a learner who has already
 * solved the task can see what a different choice would have bought them.
 *
 * The comparison is gated on evidence, not on a local flag: the server checks
 * the recorded verdict before it sends anything. A learner who gave up and read
 * the reference solution still sees the comparison, labelled as such, because
 * seeing how it could be written is not the same claim as having written it. */

import type { Localized } from './coding-catalog';

/** How the approach reads, not how clever it is. */
export type ApproachStyle = 'straightforward' | 'compact' | 'explicit' | 'in-place';

export const APPROACH_STYLES: readonly ApproachStyle[] = ['straightforward', 'compact', 'explicit', 'in-place'];

export interface CodingApproach {
  key: string;
  style: ApproachStyle;
  title: Localized;
  /** The code itself. Original devShark authoring, never a learner's answer. */
  code: string;
  /** Big-O in the notation the curriculum uses, e.g. `O(n)`. */
  time: string;
  space: string;
  /** What this approach takes for granted about the input. */
  assumptions: Localized;
  /** What it gives up to get what it gets. */
  tradeoffs: Localized;
}

/** Why the comparison is open. `revealed` is deliberately not `passed`. */
export type ApproachUnlock = 'passed' | 'revealed';

/** GET ?resource=coding-approaches&id=… */
export interface CodingApproachesResponse {
  taskId: string;
  unlockedBy: ApproachUnlock;
  approaches: CodingApproach[];
}

/** Big-O strings are content; this keeps them to a shape the tests can check. */
export const isComplexity = (value: string): boolean =>
  /^O\(1\)$|^O\(log n\)$|^O\(n\)$|^O\(n log n\)$|^O\(n\^2\)$|^O\(n \+ m\)$/.test(value);
