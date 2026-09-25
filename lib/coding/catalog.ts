/** The merged coding catalogue: every task with English and Czech copy, plus
 * the projections the API serves. Never imports the solutions module, so a
 * client bundle that pulled this in by mistake would still carry no answers;
 * the launch contracts forbid that import anyway.
 *
 * Two modules, on purpose. This one holds everything authored, which the
 * content contract keeps proving solvable and which history (a passed record,
 * a bookmark, an imported attempt) still resolves against. `./active` holds
 * what may be issued: the same list with the audit's eligibility gate applied
 * through the registry (`lib/curation.ts`). Every issuing path — a task by id,
 * a Learn level's quota, the section lists, the practice queue, the browser
 * index — reads `./active`, so a retired task cannot be reached by any of
 * them, and nothing here offers an issuing lookup to forget the gate with. */

import type {
  CodingTask,
  CodingTaskSummary,
  CodingTrack,
  PlayableCodingTask,
} from '../../shared/coding-catalog';
import { difficultyOf } from '../../shared/coding-catalog';
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
import { JAVASCRIPT_DEBUG_TASKS } from './tasks/javascript-debug';
import { JAVASCRIPT_DEBUG_TASKS_CS } from './tasks/javascript-debug.cs';
import { ALGORITHM_TASKS } from './tasks/algorithms';
import { ALGORITHM_TASKS_CS } from './tasks/algorithms.cs';
import { EASY_JAVASCRIPT_A_TASKS } from './tasks/easy-javascript-a';
import { SPECS, buildEvolvingTasks } from './tasks/evolving';
import { TYPESCRIPT_EVOLVING } from './tasks/evolving-typescript';
import { REACT_EVOLVING } from './tasks/evolving-react';
import { extendSpecs } from './tasks/evolving-advanced';
import { buildFullStackTasks } from './tasks/fullstack';
import { expandEvolvingTasks } from './tasks/evolving-checkpoints';
import { DEBUG_EVOLVING } from './tasks/evolving-debug';
import { PATH_SPECS } from './tasks/paths';
import { buildFullStackPathTasks } from './tasks/paths-fullstack';

/** The Easy-band waves of #226, one file per track and wave
 * (`tasks/easy-<track>-<wave>.ts`, solutions under the same name). They fill
 * the Coding section's Easy band and stay out of every Learn level's quota:
 * that quota takes the first tasks of a level in catalogue order, so a new
 * tier 1 task would otherwise replace the one a level has always asked for.
 * English only, with no Czech overlay. */
const EASY_BAND: CodingTaskSource[][] = [
  EASY_JAVASCRIPT_A_TASKS,
];

/** Ids of the Easy-band tasks; `tasksForLevel` in `./active` skips them. */
export const EASY_BAND_TASK_IDS: ReadonlySet<string> = new Set(EASY_BAND.flat().map((task) => task.id));

const sources: { tasks: CodingTaskSource[]; cs: Record<string, CodingTaskCs> }[] = [
  { tasks: JAVASCRIPT_TASKS, cs: JAVASCRIPT_TASKS_CS },
  { tasks: JAVASCRIPT_LOOP_TASKS, cs: JAVASCRIPT_LOOP_TASKS_CS },
  { tasks: JAVASCRIPT_DEBUG_TASKS, cs: JAVASCRIPT_DEBUG_TASKS_CS },
  { tasks: TYPESCRIPT_TASKS, cs: TYPESCRIPT_TASKS_CS },
  { tasks: TYPESCRIPT_LOOP_TASKS, cs: TYPESCRIPT_LOOP_TASKS_CS },
  { tasks: REACT_TASKS, cs: REACT_TASKS_CS },
  { tasks: REACT_LOOP_TASKS, cs: REACT_LOOP_TASKS_CS },
  { tasks: SYSTEM_DESIGN_TASKS, cs: SYSTEM_DESIGN_TASKS_CS },
  { tasks: ALGORITHM_TASKS, cs: ALGORITHM_TASKS_CS },
  ...EASY_BAND.map((tasks) => ({ tasks, cs: {} })),
];

/** Every task: tracks in catalogue order, then level, tier, and authored order
 * within a track, so a Learn level always picks its gentlest tasks first. */
const TRACK_ORDER: Record<string, number> = { javascript: 0, typescript: 1, react: 2, 'system-design': 3, algorithms: 4 };
export const CODING_TASKS: readonly CodingTask[] = sources
  .flatMap(({ tasks, cs }) => tasks.map((task, order) => ({ task: mergeTask(task, cs[task.id]), order })))
  .concat(expandEvolvingTasks([...buildEvolvingTasks({ ...extendSpecs({ ...SPECS, ...TYPESCRIPT_EVOLVING, ...REACT_EVOLVING }), ...DEBUG_EVOLVING, ...PATH_SPECS }), ...buildFullStackTasks(), ...buildFullStackPathTasks()]).map((task, order) => ({ task, order })))
  .sort((a, b) => (TRACK_ORDER[a.task.track] - TRACK_ORDER[b.task.track]) || (a.task.level - b.task.level) || (a.task.tier - b.task.tier) || (a.order - b.order))
  .map(({ task }) => task);

const ALL_BY_ID = new Map(CODING_TASKS.map((task) => [task.id, task]));
const BY_LEGACY = new Map(CODING_TASKS.filter((task) => task.legacyId).map((task) => [task.legacyId!, task]));

/** Any authored task by id, retired ones included. For history only — a
 * passed record, a bookmark, a garden path, an imported attempt — never for
 * issuing. The issuing lookup is `codingTaskById` in `./active`. */
export const codingTaskForHistory = (id: string): CodingTask | undefined => ALL_BY_ID.get(id);
export const codingTaskByLegacyId = (legacyId: string): CodingTask | undefined => BY_LEGACY.get(legacyId);

/** How many tasks a Learn level asks for: one for levels 1–5, two for 6–15,
 * up to three for 16–25. Deterministic: the first tasks in catalogue order. */
export function levelTaskQuota(level: number): number {
  if (level <= 5) return 1;
  if (level <= 15) return 2;
  return 3;
}

export function summarize(task: CodingTask): CodingTaskSummary {
  return {
    id: task.id,
    track: task.track,
    level: task.level,
    tier: task.tier,
    difficulty: difficultyOf(task),
    focus: task.focus,
    title: task.title,
    verify: task.verify,
    ...(task.format ? { format: task.format } : {}),
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
    ...(task.previousRequirements ? { previousRequirements: task.previousRequirements } : {}),
    ...(task.references ? { references: task.references } : {}),
    starter: task.starter,
    ...(task.skeleton ? { skeleton: task.skeleton } : {}),
    hints: task.hints,
    ...(task.approach ? { approach: task.approach } : {}),
    ...(task.tests ? { tests: task.tests } : {}),
    ...(task.typeTests ? { typeTests: task.typeTests } : {}),
    ...(task.suite ? { suite: task.suite } : {}),
    ...(task.checklist ? { checklist: task.checklist } : {}),
    ...(task.api ? { api: task.api } : {}),
    ...(task.failureHints ? { failureHints: task.failureHints } : {}),
    ...(task.pitfall ? { pitfall: task.pitfall } : {}),
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
