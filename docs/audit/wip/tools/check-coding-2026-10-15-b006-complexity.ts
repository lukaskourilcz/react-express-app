import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codingTaskById } from '../../../../lib/coding/active';
import { solutionFor } from '../../../../lib/coding/solutions';
import { assessComplexity } from '../../../../lib/coding/complexity';
import { codingPassXp } from '../../../../shared/coding-complexity';
const targets: Record<string, string> = {
  'js-easy2-own-keys-only': 'O(n)',
  'js-easy3-count-types': 'O(n)',
  'js-letter-counts': 'O(n)',
  'js-count-vowels': 'O(n)',
  'js-easy4-count-digits': 'O(log n)',
};
const candidates = JSON.parse(readFileSync('docs/audit/wip/coding/candidates-2026-10-15-b006.json', 'utf8')) as Record<string, Record<string, string>>;
assert.deepEqual(Object.keys(candidates).sort(), Object.keys(targets).sort());
let checked = 0;
for (const [id, target] of Object.entries(targets)) {
  const task = codingTaskById(id)!, solution = solutionFor(id)!;
  for (const [label, code] of Object.entries({ reference: solution.solution, junior: solution.junior!, senior: solution.senior!, alternative: candidates[id].alternative })) {
    const report = assessComplexity(task, code);
    assert.equal(report.guidance.targetTime, target, id);
    assert.notEqual(report.assessment, 'above-target', id + '/' + label);
    assert.equal(codingPassXp(report), 25, id + '/' + label);
    checked++;
    console.log(JSON.stringify({ id, label, target, time: report.time, assessment: report.assessment, xp: codingPassXp(report) }));
  }
}
assert.equal(checked, 20);
console.log('PASS twenty authored-target/base-25-XP checks; unknown estimates remain unpenalized');
