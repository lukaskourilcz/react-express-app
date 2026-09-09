/** The coding tasks that may be issued: the authored catalogue with the audit's
 * eligibility gate applied.
 *
 * Server-only, because the gate hashes each task together with its reference
 * solution and hidden tests — the grader is part of what was reviewed, and a
 * changed hidden test is an edit the reviewer did not see. The launch
 * contracts keep `lib/coding/solutions` out of every client bundle, and this
 * module with it; the browser reads `shared/coding-index.ts`, which is
 * generated from `codingSummaries()` here and therefore lists active tasks
 * only.
 *
 * Every issuing path reads this module: a task by id, a Learn level's quota,
 * the section lists, the practice queue, the badge conditions. History reads
 * `./catalog` directly and never issues. */

import type { CodingTask, CodingTaskSummary, CodingTrack } from '../../shared/coding-catalog';
import { formatOf } from '../../shared/coding-catalog';
import type { EligibilityReason } from '../../shared/curation';
import { codingTaskEligibility } from '../curation';
import { CODING_TASKS, levelTaskQuota, summarize } from './catalog';
import { solutionFor } from './solutions';

const verdicts = CODING_TASKS.map((task) => ({ task, eligibility: codingTaskEligibility(task, solutionFor(task.id)) }));

/** Tasks that may be issued, in catalogue order. */
export const ACTIVE_CODING_TASKS: readonly CodingTask[] = verdicts.filter((v) => v.eligibility.active).map((v) => v.task);

/** Authored tasks the gate withheld, and why. For the admin view and the
 * audit report, never for issuing. */
export const WITHHELD_CODING_TASKS: ReadonlyMap<string, EligibilityReason> = new Map(
  verdicts.filter((v) => !v.eligibility.active).map((v) => [v.task.id, v.eligibility.reason]),
);

const BY_ID = new Map(ACTIVE_CODING_TASKS.map((task) => [task.id, task]));

/** An issuable task by id. Undefined for an unknown id and for a withheld one:
 * callers that want to tell the two apart ask `./catalog` for history. */
export const codingTaskById = (id: string): CodingTask | undefined => BY_ID.get(id);
export const tasksForTrack = (track: CodingTrack): CodingTask[] => ACTIVE_CODING_TASKS.filter((task) => task.track === track);

/** Tasks that belong to one Learn level, in catalogue order. Checklist tasks
 * cannot gate a level, so they are never part of one.
 *
 * Neither can a repair task. A debug exercise carries a `level` so it sorts into
 * the right place in the Coding section's ladder, but it is a format a learner
 * chooses, not a gate they must pass: letting one into the quota silently
 * *replaces* the implementation task the level was asking for, because the
 * quota takes the first N in catalogue order. That is what happened when the
 * repair tasks were added — JavaScript level 3, whose quota is one, swapped
 * `js-fizz-values` for `js-debug-average`, and level 10 dropped
 * `js-activate-user`. The launch contract now asserts no level can gate on one.
 */
export function tasksForLevel(topic: CodingTask['topic'], level: number): CodingTask[] {
  return ACTIVE_CODING_TASKS.filter(
    (task) =>
      task.topic === topic &&
      task.level === level &&
      task.verify !== 'checklist' &&
      formatOf(task) !== 'debug',
  );
}

export function levelCodingTasks(topic: CodingTask['topic'], level: number): CodingTask[] {
  return tasksForLevel(topic, level).slice(0, levelTaskQuota(level));
}

/** Summaries of the issuable tasks: what the section lists, the practice
 * queue, the badge conditions and the generated browser index are built from. */
export const CODING_SUMMARIES: readonly CodingTaskSummary[] = ACTIVE_CODING_TASKS.map(summarize);
