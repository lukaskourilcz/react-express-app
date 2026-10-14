import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { CODING_TASKS } from '../../../../lib/coding/catalog';
import { solutionFor } from '../../../../lib/coding/solutions';
import { puzzleFor } from '../../../../lib/coding/puzzles';
import { approachesFor } from '../../../../lib/coding/approaches';
import { taskHash, taskTranslationHash } from '../../../../lib/curation';
import { levelCodingTasks } from '../../../../lib/coding/active';
import { complexityGuidance } from '../../../../shared/coding-complexity';

import { JAVASCRIPT_TASKS } from '../../../../lib/coding/tasks/javascript';
import { JAVASCRIPT_LOOP_TASKS } from '../../../../lib/coding/tasks/javascript-loops';
import { JAVASCRIPT_DEBUG_TASKS } from '../../../../lib/coding/tasks/javascript-debug';
import { TYPESCRIPT_TASKS } from '../../../../lib/coding/tasks/typescript';
import { TYPESCRIPT_LOOP_TASKS } from '../../../../lib/coding/tasks/typescript-loops';
import { REACT_TASKS } from '../../../../lib/coding/tasks/react';
import { REACT_LOOP_TASKS } from '../../../../lib/coding/tasks/react-loops';
import { SYSTEM_DESIGN_TASKS } from '../../../../lib/coding/tasks/system-design';
const SOURCE_OF = new Map<string, string>();
for (const [name, list] of [['javascript', [...JAVASCRIPT_TASKS, ...JAVASCRIPT_DEBUG_TASKS]], ['javascript-loops', JAVASCRIPT_LOOP_TASKS], ['typescript', [...TYPESCRIPT_TASKS, ...TYPESCRIPT_LOOP_TASKS]], ['react', REACT_TASKS], ['react-loops', REACT_LOOP_TASKS], ['system-design', SYSTEM_DESIGN_TASKS]] as const) {
  for (const t of list) SOURCE_OF.set(t.id, name);
}
const out = process.argv[2];
if (!out) throw new Error('Pass an output directory');
mkdirSync(out, { recursive: true, mode: 0o700 });
const batches: Record<string, unknown[]> = {};
for (const task of CODING_TASKS) {
  const solution = solutionFor(task.id);
  const key = SOURCE_OF.get(task.id) ?? task.track;
  const row = {
    id: task.id,
    track: task.track,
    topic: task.topic,
    level: task.level,
    surfaces: ['coding', 'challenge-run', ...(levelCodingTasks(task.topic, task.level).some(closer => closer.id === task.id) ? ['learn'] : [])],
    tier: task.tier,
    focus: task.focus,
    verify: task.verify,
    format: task.format ?? 'implement',
    estimatedMinutes: task.estimatedMinutes,
    difficulty: task.difficulty ?? null,
    taskHash: taskHash(task, solution),
    csHash: taskTranslationHash(task),
    title: task.title,
    prompt: task.prompt,
    complexityGuidance: complexityGuidance(task),
    starter: task.starter,
    previousRequirements: task.previousRequirements ?? null,
    references: task.references ?? null,
    skeleton: task.skeleton ?? null,
    hints: task.hints,
    approach: task.approach ?? null,
    tests: task.tests ?? null,
    typeTests: task.typeTests ?? null,
    suite: task.suite ?? null,
    checklist: task.checklist ?? null,
    api: task.api ?? null,
    design: task.design ?? null,
    drill: task.drill ?? null,
    failureHints: task.failureHints ?? null,
    pitfall: task.pitfall ?? null,
    solution: solution ?? null,
    puzzle: puzzleFor(task.id) ?? null,
    approaches: approachesFor(task.id),
  };
  (batches[key] ??= []).push(row);
}
// Real batch split: by source file membership rather than a guess.
for (const [name, rows] of Object.entries(batches)) {
  writeFileSync(path.join(out, `batch-coding-${name}.json`), JSON.stringify(rows, null, 1));
  console.log(name, rows.length);
}
