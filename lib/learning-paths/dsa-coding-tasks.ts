/** One coding record per DSA exercise (#493), server-only.
 *
 * E2 turned the DSA path's code exercises into coding tasks
 * (`lib/coding/tasks/dsa-foundations.ts`). Until E5 retires the path, a learner
 * can pass the same exercise in the path and in the Coding section. Both
 * passes go through `record_coding_verdict`, keyed by task id, so the path
 * records its pass under the Coding task's id: one coding_progress row and one
 * first-pass award per exercise, whichever surface it came from. Learn
 * completion is unaffected; it counts only the coding rows of its own level
 * attempt.
 *
 * The queue is left out on purpose. The path exercise stores values in a
 * buffer its harness declares (`newQueueBuffer`), the Coding task takes the
 * buffer factory as an argument (`createQueue(newBuffer)`), so a path pass is
 * not a pass of the task and keeps its own path id.
 *
 * E5 deletes this file with the path. */

import { createHash } from 'node:crypto';

/** DSA path activity id → the Coding task id its pass is recorded under. */
export const DSA_PATH_CODING_TASKS: Readonly<Record<string, string>> = {
  'dsa-v1-d01-linear-accumulator': 'alg-dsa-sum-of-evens',
  'dsa-v1-d01-halving-counter': 'alg-dsa-halving-steps',
  'dsa-v1-d01-pair-versus-pass': 'alg-dsa-max-gap',
  'dsa-v1-d02-reverse-in-place': 'alg-dsa-reverse-in-place',
  'dsa-v1-d02-palindrome-two-pointer': 'alg-dsa-palindrome',
  'dsa-v1-d02-dedupe-sorted': 'alg-dsa-dedupe-sorted',
  'dsa-v1-d03-frequency-map': 'alg-dsa-frequency-map',
  'dsa-v1-d03-first-unique': 'alg-dsa-first-unique',
  'dsa-v1-d03-set-intersection': 'alg-dsa-set-intersection',
  'dsa-v1-d04-stack-api': 'alg-dsa-stack',
  'dsa-v1-d04-balanced-brackets': 'alg-dsa-balanced-brackets',
  'dsa-v1-d05-prepend-and-find': 'alg-dsa-prepend-and-find',
  'dsa-v1-d05-delete-first-match': 'alg-dsa-delete-first-match',
  'dsa-v1-d05-reverse-list': 'alg-dsa-reverse-list',
  'dsa-v1-d06-recursive-list-sum': 'alg-dsa-recursive-list-sum',
  'dsa-v1-d06-bounded-factorial': 'alg-dsa-factorial',
  'dsa-v1-d06-iterative-countdown': 'alg-dsa-iterative-countdown',
  'dsa-v1-d07-linear-search': 'alg-dsa-linear-search',
  'dsa-v1-d07-first-occurrence': 'alg-dsa-first-occurrence',
  'dsa-v1-d08-selection-sort': 'alg-dsa-selection-sort',
  'dsa-v1-d08-insertion-sort': 'alg-dsa-insertion-sort',
  'dsa-v1-d08-merge-sort': 'alg-dsa-merge-sort',
  'dsa-v1-d09-height-and-size': 'alg-dsa-tree-size-height',
  'dsa-v1-d09-traversals': 'alg-dsa-tree-traversals',
  'dsa-v1-d09-bst-search-insert': 'alg-dsa-bst-search-insert',
  'dsa-v1-d10-record-index': 'alg-dsa-record-index',
  'dsa-v1-d10-repair-traversal': 'alg-dsa-repair-level-order',
  'dsa-v1-d10-frequency-index': 'alg-dsa-frequency-index',
};

/** The coding task id a path code activity's verdict is recorded under: the
 * task it reuses, the DSA Coding task it became, or an id derived from the
 * path and the activity. */
export function canonicalCodingTaskId(pathId: string, activity: { id: string; reuseTaskId?: string }): string {
  return activity.reuseTaskId
    ?? (pathId === 'dsa-foundations' ? DSA_PATH_CODING_TASKS[activity.id] : undefined)
    ?? `path-code-${createHash('sha256').update(`${pathId}:${activity.id}`).digest('hex').slice(0, 32)}`;
}
