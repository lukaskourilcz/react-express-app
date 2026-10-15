import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash } from '../../../../lib/learning-paths/audit';

const module = LEARNING_PATHS.find(p => p.id === 'dsa-foundations')!.modules.find(m => m.id === 'dsa-v1-d07')!;
const lesson = module.lessons[1];
const code = lesson.sections.find(s => s.kind === 'code');
assert(code?.kind === 'code');
// Trusted authored context, read individually; never a host learner-code grader.
const binary = new Function(code.code + '\nreturn binarySearch;')() as (values: number[], target: number) => number;
const readAt: number[] = [];
const values = [2, 5, 8, 12, 16, 23, 28, 31, 35, 42, 47, 53, 58, 61, 67, 70];
const proxy = new Proxy(values, { get(target, key) {
  if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) readAt.push(Number(key));
  return Reflect.get(target, key);
} });
assert.equal(binary(proxy, 47), 10);
assert.deepEqual(readAt, [7, 11, 9, 10]);
const trace = lesson.sections.find(s => s.kind === 'trace');
assert(trace?.kind === 'trace');
assert.deepEqual(trace.trace.frames.map(f => f.counter?.value), [0, 1, 2, 3, 4]);
assert.deepEqual(trace.trace.frames.map(f => f.marks?.find(m => m.role === 'compare' || m.role === 'settled')?.index), [7, 11, 9, 10, 10]);
const measured = code.code.replace('    const middle =', '    if (sorted.includes(target)) { let matches = false; for (let i = low; i <= high; i++) if (sorted[i] === target) matches = true; if (!matches) throw Error("lost invariant"); }\n    const middle =');
const invariantBinary = new Function(measured + '\nreturn binarySearch;')() as typeof binary;
for (const sorted of [[], [1], [1, 1], [2, 4, 4, 4, 4, 7], [-2, 0, 0, 3, 9]]) {
  for (const target of [-3, -2, 0, 1, 2, 3, 4, 7, 9, 10]) {
    const result = invariantBinary(sorted, target);
    assert.equal(result === -1, !sorted.includes(target));
    if (result >= 0) assert.equal(sorted[result], target);
  }
}
// Virtual indexed values check arithmetic/probe bounds without allocating a billion-cell array.
for (const [n, expected] of [[16, 5], [100, 7], [1000, 10], [1000000, 20], [1000000000, 30]]) {
  let reads = 0;
  const virtual = new Proxy([] as number[], { get(_target, key) {
    if (key === 'length') return n;
    if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) { reads++; return Number(key); }
    return undefined;
  } });
  assert.equal(binary(virtual, n - 1), n - 1);
  assert.equal(reads, expected);
}
assert.deepEqual([10, 9, 100].sort(), [10, 100, 9]);
const questions = module.activities.flatMap(a => a.questions ?? []);
assert.equal(questions.length, 4);
const q1 = questions[0];
assert.equal(new Function(q1.context!.code + '\nreturn binarySearch([8,3,5,1,9],3);')(), -1);
assert.equal(q1.correct, 0);
const q2 = questions[1];
assert(q2.options[0].en.includes('at least one matching index'));
assert.equal(q2.correct, 0);
assert(!(2 <= 1 && 6 >= 1)); // Bracketing is not an initial invariant for absent low targets.
assert.notEqual(5 / 2, Math.floor(5 / 2)); // Exact halving is not required.
const q3 = questions[2];
assert.equal(binary([2, 4, 4, 4, 4, 7], 4), 2);
assert.equal(q3.correct, 0);
assert(q3.prompt.en.includes('floor((low + high) / 2)'));
const q4 = questions[3];
const n = 100000, log = Math.log2(n);
assert(n * log + log > n);
assert(n * log + 100 * log < 100 * n);
assert.equal(q4.correct, 0);
assert(q4.options[0].en.includes('Count the sort once'));
assert(process.argv[2]);
writeFileSync(process.argv[2], JSON.stringify({ checkedRecords: 5,
  records: [lesson, ...questions].map(r => ({ id: r.id, contentHash: nativeContentHash(r), gradingHash: null })),
  checks: ['actual cached read trace', 'matching-index invariant on bounded sorted samples',
    'virtual indexed worst-case probe arithmetic, not allocation/performance evidence',
    'unsorted failure and duplicate lower-middle return', 'explicit amortization cost examples, not measured crossover'],
}, null, 2), { mode: 0o600 });
console.log('PASS five native binary-search records: trace, invariant, duplicate index, precondition and preparation model');
