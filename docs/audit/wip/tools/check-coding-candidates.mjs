// Execution evidence only. This never assigns editorial scores or writes the
// curation ledger. Compile grade-task.ts/export-coding.ts from the same tree
// first, and keep raw grader outputs in a private scratch directory.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const [grader, exportDir, candidatesFile, outputDir] = process.argv.slice(2);
assert(grader && exportDir && candidatesFile && outputDir, 'Pass grader bundle, export directory, candidates JSON and output directory');
mkdirSync(outputDir, { recursive: true, mode: 0o700 });
const tasks = new Map(readdirSync(exportDir).filter(file => /^batch-coding-.*\.json$/.test(file)).flatMap(file =>
  JSON.parse(readFileSync(join(exportDir, file), 'utf8')).map(task => [task.id, task])));
const candidates = JSON.parse(readFileSync(candidatesFile, 'utf8'));
const summary = [];
for (const [id, checks] of Object.entries(candidates)) {
  assert(/^[a-z0-9-]+$/.test(id), 'Task ID must be safe for scratch filenames');
  const task = tasks.get(id);
  assert(task && task.solution?.solution, `${id}: exported reference missing`);
  const comparisons = Object.fromEntries((task.approaches ?? []).map((approach, index) => [`approach-${index + 1}`, approach.code]));
  const lineById = new Map((task.puzzle?.lines ?? []).map(line => [line.id, line.code]));
  const puzzles = Object.fromEntries((task.puzzle?.accepted ?? []).map((order, index) => [`puzzle-${index + 1}`, order.map(id => {
    assert(lineById.has(id), `${task.id}: unknown accepted puzzle line`);
    return lineById.get(id);
  }).join('\n')]));
  const cases = { reference: task.solution.solution, junior: task.solution.junior, senior: task.solution.senior, starter: task.starter, ...comparisons, ...puzzles, ...checks };
  for (const [label, code] of Object.entries(cases)) {
    if (!code) continue;
    assert(/^[a-z0-9-]+$/.test(label), 'Candidate label must be safe for scratch filenames');
    const codeFile = join(outputDir, `${id}-${label}.js`);
    writeFileSync(codeFile, code, { mode: 0o600 });
    const run = spawnSync(process.execPath, [resolve(grader), id, resolve(codeFile)], { encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(run.status, 0, `${id} ${label}: grader command failed`);
    const result = JSON.parse(run.stdout);
    writeFileSync(join(outputDir, `${id}-${label}.json`), run.stdout, { mode: 0o600 });
    const expected = label === 'starter' || label.startsWith('wrong-') ? 'failed' : 'passed';
    summary.push({ id, contentHash: task.taskHash, label, expected, verdict: result.verdict, visible: result.visible?.length ?? result.cases?.length ?? 0, hidden: result.hidden?.length ?? 0 });
  }
}
writeFileSync(join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2), { mode: 0o600 });
const mismatches = summary.filter(row => row.verdict !== row.expected);
console.log(JSON.stringify({ tasks: Object.keys(candidates).length, cases: summary.length, matched: summary.length - mismatches.length, mismatches }, null, 2));
if (mismatches.length) process.exitCode = 1;
