import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { CODING_TASKS } from '/home/user/react-express-app/lib/coding/catalog';
import { solutionFor } from '/home/user/react-express-app/lib/coding/solutions';
import { puzzleFor } from '/home/user/react-express-app/lib/coding/puzzles';
import { approachesFor } from '/home/user/react-express-app/lib/coding/approaches';
import { taskHash, taskTranslationHash } from '/home/user/react-express-app/lib/curation';
import { levelCodingTasks } from '/home/user/react-express-app/lib/coding/active';

import { JAVASCRIPT_TASKS } from '/home/user/react-express-app/lib/coding/tasks/javascript';
import { JAVASCRIPT_LOOP_TASKS } from '/home/user/react-express-app/lib/coding/tasks/javascript-loops';
import { JAVASCRIPT_DEBUG_TASKS } from '/home/user/react-express-app/lib/coding/tasks/javascript-debug';
import { TYPESCRIPT_TASKS } from '/home/user/react-express-app/lib/coding/tasks/typescript';
import { TYPESCRIPT_LOOP_TASKS } from '/home/user/react-express-app/lib/coding/tasks/typescript-loops';
import { REACT_TASKS } from '/home/user/react-express-app/lib/coding/tasks/react';
import { REACT_LOOP_TASKS } from '/home/user/react-express-app/lib/coding/tasks/react-loops';
import { SYSTEM_DESIGN_TASKS } from '/home/user/react-express-app/lib/coding/tasks/system-design';
const SOURCE_OF = new Map<string, string>();
for (const [name, list] of [['javascript', [...JAVASCRIPT_TASKS, ...JAVASCRIPT_DEBUG_TASKS]], ['javascript-loops', JAVASCRIPT_LOOP_TASKS], ['typescript', [...TYPESCRIPT_TASKS, ...TYPESCRIPT_LOOP_TASKS]], ['react', REACT_TASKS], ['react-loops', REACT_LOOP_TASKS], ['system-design', SYSTEM_DESIGN_TASKS]] as const) {
  for (const t of list) SOURCE_OF.set(t.id, name);
}
const out = process.argv[2];
const batches: Record<string, unknown[]> = {};
for (const task of CODING_TASKS) {
  const solution = solutionFor(task.id);
  const key = SOURCE_OF.get(task.id) ?? task.track;
  const row = {
    id: task.id,
    track: task.track,
    topic: task.topic,
    level: task.level,
    tier: task.tier,
    focus: task.focus,
    verify: task.verify,
    format: task.format ?? 'implement',
    estimatedMinutes: task.estimatedMinutes,
    taskHash: taskHash(task, solution),
    csHash: taskTranslationHash(task),
    title: task.title,
    prompt: task.prompt,
    starter: task.starter,
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
