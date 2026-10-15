// Execute selected manually authored alternatives/counterexamples in the real sandbox.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { LEARNING_PATHS, activityIn } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
import { gradePathCode } from '../../../../lib/learning-paths/grade';
const candidates = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Record<string, Record<string, string>>;
const results = [];
for (const [id, manual] of Object.entries(candidates)) {
  const path = LEARNING_PATHS.find(p => p.modules.some(m => m.activities.some(a => a.id === id)))!;
  const activity = activityIn(path, id)!.activity;
  for (const [label, source] of Object.entries({ reference: solutionFor(id)!.solution, starter: activity.code!.starter, ...manual })) {
    const result = await gradePathCode(activity, activity.code!, source);
    const expected = label === 'starter' || label.startsWith('wrong-') ? 'needs_revision' : 'verified_pass';
    results.push({ id, label, state: result.state, expected, outcome: result.code.outcome,
      contentHash: nativeContentHash(activity), gradingHash: nativeGradingHash(activity) });
    console.log(`${result.state === expected ? 'PASS' : 'MISMATCH'} ${id}/${label}: ${result.state}`);
  }
}
writeFileSync(process.argv[3], JSON.stringify(results, null, 2), { mode: 0o600 });
if (process.argv[4] !== '--baseline') assert(results.every(r => r.state === r.expected), 'Selected expected verdicts');
console.log(`${results.filter(r => r.state === r.expected).length}/${results.length} selected verdicts agree; execution never supplies editorial scores`);
