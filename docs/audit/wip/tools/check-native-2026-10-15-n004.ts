import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { gradeCheck } from '../../../../lib/learning-paths/grade';

const path = LEARNING_PATHS.find(p => p.id === 'dsa-foundations')!;
const d06 = path.modules.find(m => m.id === 'dsa-v1-d06')!;
const check = d06.activities.find(a => a.id === 'dsa-v1-d06-checks')!;
assert.equal(check.questions!.length, 4);
assert.equal(check.purpose, 'exercise');
const key = check.questions!.map(q => q.correct);
assert.equal(gradeCheck(check, key, key).state, 'verified_pass');
for (let miss = 0; miss < 4; miss++) {
  const answers = [...key]; answers[miss] = (answers[miss] + 1) % 4;
  const result = gradeCheck(check, key, answers);
  assert.equal(result.state, 'needs_revision');
  assert.equal(result.keyWithheld, false);
  assert.equal(result.verdicts.filter(v => !v.correct).length, 1);
  assert(result.verdicts.every(v => v.explanation && typeof v.correctIndex === 'number'));
}
const codeActivities = d06.activities.filter(a => a.kind === 'code');
const workers = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { id: string; state: string; expected: string; contentHash: string; gradingHash: string }[];
assert.equal(workers.length, 21);
for (const result of workers) {
  const activity = codeActivities.find(a => a.id === result.id)!;
  assert.equal(result.state, result.expected);
  assert.equal(result.contentHash, nativeContentHash(activity));
  assert.equal(result.gradingHash, nativeGradingHash(activity));
}
const lesson = path.modules.find(m => m.id === 'dsa-v1-d07')!.lessons[0];
const snippets = lesson.sections.flatMap(s => s.kind === 'code' || s.kind === 'example' ? [s.code] : []);
// These authored snippets were read individually; this never runs learner code on the host.
const linear = new Function(snippets[0] + '\nreturn linearScan;')() as (values: unknown[], target: unknown) => number;
const traceValues = [12, 5, 9, 5, 7, 3];
const readsFor = (values: number[], target: number) => {
  let reads = 0;
  const proxy = new Proxy(values, { get(values, key) {
    if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) reads++;
    return Reflect.get(values, key);
  } });
  return { index: linear(proxy, target), reads };
};
assert.deepEqual(readsFor(traceValues, 7), { index: 4, reads: 5 });
assert.deepEqual(readsFor(traceValues, 99), { index: -1, reads: 6 });
assert.equal(linear([NaN], NaN), -1);
assert.equal(linear([-0], 0), 0);
for (const n of [1, 2, 8, 32]) {
  const values = Array.from({ length: n }, (_, i) => i);
  const total = values.reduce((sum, target) => sum + readsFor(values, target).reads, 0);
  assert.equal(total / n, (n + 1) / 2);
}
const trace = lesson.sections.find(s => s.kind === 'trace');
assert(trace?.kind === 'trace');
assert.deepEqual(trace.trace.frames.map(f => f.counter?.value), [0, 1, 2, 3, 4, 5]);
const logs: unknown[][] = [];
new Function('console', snippets[1])({ log: (...values: unknown[]) => logs.push(values) });
assert.deepEqual(logs, [['found 44:', { index: 8, probes: 3 }], ['missing 43:', { index: -1, probes: 3 }]]);
assert.equal(new Function(snippets[2] + '\nreturn findFirst(orders, order => order.total > 500);')(), 1);
assert.equal([NaN].indexOf(NaN), -1);
assert(new Set([NaN]).has(NaN));
// Count copied suffix sizes without asserting any particular engine's live heap.
for (const n of [0, 1, 2, 10, 100]) {
  let copied = 0;
  for (let remaining = n - 1; remaining >= 0; remaining--) copied += remaining;
  assert.equal(copied, n < 2 ? 0 : n * (n - 1) / 2);
}
const records = [check, ...codeActivities].map(a => ({ id: a.id, contentHash: nativeContentHash(a), gradingHash: nativeGradingHash(a) }));
records.push({ id: lesson.id, contentHash: nativeContentHash(lesson), gradingHash: null });
assert.equal(records.length, 5);
assert(process.argv[3]);
writeFileSync(process.argv[3], JSON.stringify({ checkedRecords: 5, records, checks: [
  'four-question exercise threshold and review policy', '21 exact-hash real sandbox verdicts',
  'linear scan trace and successful uniform mean', 'runnable binary/predicate examples',
  'strict equality versus Set membership', 'suffix-copy count, without engine heap claims',
] }, null, 2), { mode: 0o600 });
console.log('PASS five native records: four D06 activities and the individually read D07 linear-search lesson');
