import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { gradeCheck } from '../../../../lib/learning-paths/grade';
const module = LEARNING_PATHS.find(p => p.id === 'dsa-foundations')!.modules.find(m => m.id === 'dsa-v1-d07')!;
const reads = module.activities.filter(a => a.kind === 'lesson');
assert.equal(reads.length, 2);
for (const activity of reads) {
  assert.equal(activity.verification, 'self_reviewed');
  assert.equal(activity.purpose, 'exercise');
  assert(module.lessons.some(l => l.id === activity.lessonId));
}
const check = module.activities.find(a => a.id === 'dsa-v1-d07-checks')!;
assert.equal(check.questions!.length, 4);
assert.equal(check.purpose, 'exercise');
const key = check.questions!.map(q => q.correct);
assert.equal(gradeCheck(check, key, key).state, 'verified_pass');
for (let i = 0; i < 4; i++) {
  const answers = [...key]; answers[i] = (answers[i] + 1) % 4;
  const result = gradeCheck(check, key, answers);
  assert.equal(result.state, 'needs_revision');
  assert.equal(result.keyWithheld, false);
  assert.equal(result.verdicts.length, 4);
  assert(result.verdicts.every(v => v.explanation && typeof v.correctIndex === 'number'));
}
const selected = ['dsa-v1-d07-linear-search', 'dsa-v1-d07-first-occurrence'].map(id => module.activities.find(a => a.id === id)!);
const worker = JSON.parse(readFileSync(process.argv[2], 'utf8')) as {id:string;state:string;expected:string;contentHash:string;gradingHash:string}[];
assert.equal(worker.length, 15);
for (const result of worker) {
  const activity = selected.find(a => a.id === result.id)!;
  assert(activity);
  assert.equal(result.state, result.expected);
  assert.equal(result.contentHash, nativeContentHash(activity));
  assert.equal(result.gradingHash, nativeGradingHash(activity));
}
assert(process.argv[3]);
const records = [...reads, check, ...selected].map(a => ({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)}));
assert.equal(records.length, 5);
writeFileSync(process.argv[3], JSON.stringify({ checkedRecords:5,records,checks:[
  'two actual reading links and self-reviewed status','four-question exercise threshold/review policy',
  'fifteen exact-hash real sandbox verdicts for two independently read coding activities',
  'reused canonical binary-search activity is deliberately outside this five-item batch',
]},null,2),{mode:0o600});
console.log('PASS five native records: two readings, search check and two executable search exercises');
