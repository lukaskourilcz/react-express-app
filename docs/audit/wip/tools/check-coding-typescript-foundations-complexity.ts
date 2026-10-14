// Selected advisory evidence only; this does not grade or score other tasks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codingTaskById } from '../../../../lib/coding/active';
import { solutionFor } from '../../../../lib/coding/solutions';
import { assessComplexity } from '../../../../lib/coding/complexity';
import { codingPassXp } from '../../../../shared/coding-complexity';

const candidates = JSON.parse(readFileSync(
  'docs/audit/wip/coding/candidates-2026-10-14-typescript-foundations.json', 'utf8',
)) as Record<string, Record<string, string>>;
let checked = 0;
for (const [id, manual] of Object.entries(candidates)) {
  const task = codingTaskById(id);
  const solution = solutionFor(id);
  assert(task && solution, id);
  for (const [label, code] of Object.entries({
    reference: solution.solution, junior: solution.junior,
    senior: solution.senior, alternative: manual.alternative,
  })) {
    assert(code, `${id}/${label}`);
    const report = assessComplexity(task, code);
    assert.notEqual(report.assessment, 'above-target', `${id}/${label}`);
    assert.equal(codingPassXp(report), 25, `${id}/${label}`);
    if (id === 'ts-greeting-with-a-default') {
      assert.equal(report.time, null, `${id}/${label}: unresolved string work`);
    }
    if (id === 'ts-optional-nickname') {
      assert.equal(report.time, 'O(1)', `${id}/${label}: ordinary field reads`);
    }
    checked++;
  }
}
assert.equal(checked, 20);
console.log(`PASS ${checked} selected TypeScript advisory/25 XP checks`);
