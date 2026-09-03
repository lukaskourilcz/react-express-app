/** The merged coding catalogue: every task with English and Czech copy, plus
 * the projections the API serves. Never imports the solutions module, so a
 * client bundle that pulled this in by mistake would still carry no answers;
 * the launch contracts forbid that import anyway. */

import type {
  CodingTask,
  CodingTaskSummary,
  CodingTrack,
  PlayableCodingTask,
} from '../../shared/coding-catalog';
import { mergeTask, type CodingTaskCs, type CodingTaskSource } from './types';
import { JAVASCRIPT_TASKS } from './tasks/javascript';
import { JAVASCRIPT_TASKS_CS } from './tasks/javascript.cs';
import { TYPESCRIPT_TASKS } from './tasks/typescript';
import { TYPESCRIPT_TASKS_CS } from './tasks/typescript.cs';
import { REACT_TASKS } from './tasks/react';
import { REACT_TASKS_CS } from './tasks/react.cs';
import { SYSTEM_DESIGN_TASKS } from './tasks/system-design';
import { SYSTEM_DESIGN_TASKS_CS } from './tasks/system-design.cs';
import { JAVASCRIPT_LOOP_TASKS } from './tasks/javascript-loops';
import { JAVASCRIPT_LOOP_TASKS_CS } from './tasks/javascript-loops.cs';
import { TYPESCRIPT_LOOP_TASKS } from './tasks/typescript-loops';
import { TYPESCRIPT_LOOP_TASKS_CS } from './tasks/typescript-loops.cs';
import { REACT_LOOP_TASKS } from './tasks/react-loops';
import { REACT_LOOP_TASKS_CS } from './tasks/react-loops.cs';

const sources: { tasks: CodingTaskSource[]; cs: Record<string, CodingTaskCs> }[] = [
  { tasks: JAVASCRIPT_TASKS, cs: JAVASCRIPT_TASKS_CS },
  { tasks: JAVASCRIPT_LOOP_TASKS, cs: JAVASCRIPT_LOOP_TASKS_CS },
  { tasks: TYPESCRIPT_TASKS, cs: TYPESCRIPT_TASKS_CS },
  { tasks: TYPESCRIPT_LOOP_TASKS, cs: TYPESCRIPT_LOOP_TASKS_CS },
  { tasks: REACT_TASKS, cs: REACT_TASKS_CS },
  { tasks: REACT_LOOP_TASKS, cs: REACT_LOOP_TASKS_CS },
  { tasks: SYSTEM_DESIGN_TASKS, cs: SYSTEM_DESIGN_TASKS_CS },
];

/** Every task: tracks in catalogue order, then level, tier, and authored order
 * within a track, so a Learn level always picks its gentlest tasks first. */
const TRACK_ORDER: Record<string, number> = { javascript: 0, typescript: 1, react: 2, 'system-design': 3 };
export const CODING_TASKS: readonly CodingTask[] = sources
  .flatMap(({ tasks, cs }) => tasks.map((task, order) => ({ task: mergeTask(task, cs[task.id]), order })))
  .sort((a, b) => (TRACK_ORDER[a.task.track] - TRACK_ORDER[b.task.track]) || (a.task.level - b.task.level) || (a.task.tier - b.task.tier) || (a.order - b.order))
  .map(({ task }) => task);

const BY_ID = new Map(CODING_TASKS.map((task) => [task.id, task]));
const BY_LEGACY = new Map(CODING_TASKS.filter((task) => task.legacyId).map((task) => [task.legacyId!, task]));

export const codingTaskById = (id: string): CodingTask | undefined => BY_ID.get(id);
export const codingTaskByLegacyId = (legacyId: string): CodingTask | undefined => BY_LEGACY.get(legacyId);
export const tasksForTrack = (track: CodingTrack): CodingTask[] => CODING_TASKS.filter((task) => task.track === track);

/** Tasks that belong to one Learn level, in catalogue order. Checklist tasks
 * cannot gate a level, so they are never part of one. */
export function tasksForLevel(topic: CodingTask['topic'], level: number): CodingTask[] {
  return CODING_TASKS.filter((task) => task.topic === topic && task.level === level && task.verify !== 'checklist');
}

/** How many tasks a Learn level asks for: one for levels 1–5, two for 6–15,
 * up to three for 16–25. Deterministic: the first tasks in catalogue order. */
export function levelTaskQuota(level: number): number {
  if (level <= 5) return 1;
  if (level <= 15) return 2;
  return 3;
}
export function levelCodingTasks(topic: CodingTask['topic'], level: number): CodingTask[] {
  return tasksForLevel(topic, level).slice(0, levelTaskQuota(level));
}

export function summarize(task: CodingTask): CodingTaskSummary {
  return {
    id: task.id,
    track: task.track,
    level: task.level,
    tier: task.tier,
    focus: task.focus,
    title: task.title,
    verify: task.verify,
    estimatedMinutes: task.estimatedMinutes,
  };
}

/** Strip everything a learner must not see before submitting: design answers,
 * drill keys and orders. Visible tests are part of the task and stay. */
export function playable(task: CodingTask): PlayableCodingTask {
  const out: PlayableCodingTask = {
    ...summarize(task),
    ...(task.legacyId ? { legacyId: task.legacyId } : {}),
    prompt: task.prompt,
    starter: task.starter,
    ...(task.skeleton ? { skeleton: task.skeleton } : {}),
    hints: task.hints,
    ...(task.approach ? { approach: task.approach } : {}),
    ...(task.tests ? { tests: task.tests } : {}),
    ...(task.typeTests ? { typeTests: task.typeTests } : {}),
    ...(task.suite ? { suite: task.suite } : {}),
    ...(task.checklist ? { checklist: task.checklist } : {}),
    ...(task.api ? { api: task.api } : {}),
  };
  if (task.design) {
    out.design = {
      scenario: task.design.scenario,
      brief: task.design.brief,
      passMark: task.design.passMark,
      steps: task.design.steps.map((step) => ({ key: step.key, title: step.title, prompt: step.prompt, options: step.options })),
    };
  }
  if (task.drill) {
    const { format, scenario, prompt, unit, options, steps } = task.drill;
    out.drill = { format, scenario, prompt, ...(unit ? { unit } : {}), ...(options ? { options } : {}), ...(steps ? { steps } : {}) };
  }
  return out;
}

export const CODING_SUMMARIES: readonly CodingTaskSummary[] = CODING_TASKS.map(summarize);
