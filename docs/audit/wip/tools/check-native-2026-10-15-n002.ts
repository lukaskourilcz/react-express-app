import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { gradeCheck } from '../../../../lib/learning-paths/grade';

// These are individually read authored snippets, never learner submissions.
const path = LEARNING_PATHS.find(p => p.id === 'dsa-foundations')!;
const entry = path.modules.find(m => m.id === 'dsa-v1-entry')!;
const diagnostic = entry.activities[0];
const q6 = diagnostic.questions!.find(q => q.id === 'dsa-v1-entry-q6')!;
assert.equal(new Function(q6.context!.code + '\nreturn node.next.value;')(), 2);
assert.deepEqual(q6.options.flatMap((o, i) => o.en === '2' ? [i] : []), [q6.correct]);
assert.equal(diagnostic.questions!.length, 6);
assert.equal(diagnostic.purpose, 'diagnostic');
assert.equal(entry.optional, true);
assert(!path.modules.some(m => m.requires.some(r => r.activityId === diagnostic.id)));
const key = diagnostic.questions!.map(q => q.correct);
const pass = gradeCheck(diagnostic, key, key);
assert.equal(pass.score, 1);
assert.equal(pass.state, 'verified_pass');
assert.equal(pass.verdicts.length, 6);
const miss = gradeCheck(diagnostic, key, key.map(k => (k + 1) % 4));
assert.equal(miss.score, 0);
assert.equal(miss.keyWithheld, false);
assert(miss.verdicts.every(v => v.explanation && typeof v.correctIndex === 'number'));
assert.equal(gradeCheck(diagnostic, key, [0, 0, 0, 0, 0, 1]).state, 'verified_pass');
assert.equal(gradeCheck(diagnostic, key, [0, 0, 0, 0, 1, 1]).state, 'needs_revision');

const module = path.modules.find(m => m.id === 'dsa-v1-d06')!;
const [l1, l2] = module.lessons;
const snippets = (lesson: typeof l1) => lesson.sections.flatMap(s => s.kind === 'code' ? [s.code] : []);
const [sumToSource, brokenSource, sumListSource] = snippets(l1);
for (const n of [0, 1, 7, 10, 100]) {
  assert.equal(new Function(sumToSource + '\nreturn sumTo(' + n + ');')(), n * (n + 1) / 2);
}
assert.equal(new Function(brokenSource + '\nreturn sumToB(10);')(), 30);
assert.throws(() => new Function(brokenSource + '\nreturn sumToB(7);')(), RangeError);
assert.throws(() => new Function(brokenSource + '\nreturn sumToA(1);')(), RangeError);
const build = (values: number[]): unknown => values.reduceRight<unknown>((next, value) => ({ value, next }), null);
const recursive = new Function(sumListSource + '\nreturn sumList;')() as (head: unknown) => number;
const [sameSum, loopSource, factorialSource] = snippets(l2);
assert.equal(sameSum, sumListSource);
const loop = new Function(loopSource + '\nreturn sumListLoop;')() as (head: unknown) => number;
for (const values of [[], [0], [3, 1, 4], [-3, 1, 2], Array.from({ length: 100 }, (_, i) => i)]) {
  assert.equal(recursive(build(values)), values.reduce((a, b) => a + b, 0));
  assert.equal(loop(build(values)), recursive(build(values)));
}
const trace = l2.sections.find(s => s.kind === 'trace');
assert(trace?.kind === 'trace');
assert.deepEqual(trace.trace.frames.map(f => f.cells.length), [1, 2, 3, 4, 3, 2, 1, 0]);
assert.deepEqual(trace.trace.frames.map(f => f.counter?.value), [1, 2, 3, 4, 3, 2, 1, 0]);
const factorial = new Function(factorialSource + '\nreturn factorial;')() as (n: number) => number;
let exact = 1n;
for (let n = 0; n <= 23; n++) {
  if (n > 0) exact *= BigInt(n);
  if (n <= 20) assert.equal(BigInt(factorial(n)), exact);
  if (n === 18) assert(exact <= BigInt(Number.MAX_SAFE_INTEGER));
  if (n === 19) assert(exact > BigInt(Number.MAX_SAFE_INTEGER));
  if (n === 23) assert.notEqual(BigInt(factorial(n)), exact);
}
const q1 = module.activities.flatMap(a => a.questions ?? []).find(q => q.id === 'dsa-v1-d06-q1')!;
const countDown = new Function(q1.context!.code + '\nreturn countDown;')() as (n: number) => unknown;
assert.equal(countDown(10), 'done');
assert.throws(() => countDown(7), RangeError); // This run is V8, not a cross-engine guarantee.
assert.equal(q1.correct, 0);
assert(q1.prompt.en.includes('without tail-call elimination'));
assert(q1.options[0].en.includes('stack exhaustion'));
assert(process.argv[2]);
const records = [q6, diagnostic, l1, l2, q1].map(record => ({
  id: record.id, contentHash: nativeContentHash(record),
  gradingHash: 'kind' in record ? nativeGradingHash(record) : null,
}));
writeFileSync(process.argv[2], JSON.stringify({ checkedRecords: 5, records, checks: [
  'nested field and unique keyed label', 'optional diagnostic, six reviews, 5/6 versus 4/6 threshold',
  'bounded recursion, both broken examples fail in V8', 'recursive/iterative sums and stack trace',
  'exact BigInt factorial cross-checks and unsafe-integer boundary', 'engine-scoped unreachable-base-case question',
] }, null, 2), { mode: 0o600 });
console.log('PASS five native records: diagnostic policy, contexts, recursive costs, stack trace and factorial claims');
