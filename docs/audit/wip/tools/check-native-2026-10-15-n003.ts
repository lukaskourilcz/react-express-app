import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';

// Only the individually read authored examples below execute on this host.
const module = LEARNING_PATHS.find(p => p.id === 'dsa-foundations')!.modules.find(m => m.id === 'dsa-v1-d06')!;
const reads = module.activities.filter(a => a.kind === 'lesson');
assert.equal(reads.length, 2);
for (const activity of reads) {
  assert.equal(activity.verification, 'self_reviewed');
  assert.equal(activity.purpose, 'exercise');
  assert(module.lessons.some(l => l.id === activity.lessonId));
}
const questions = module.activities.flatMap(a => a.questions ?? []);
const q = (id: string) => questions.find(q => q.id === id)!;
const q2 = q('dsa-v1-d06-q2');
const measured = q2.context!.code.replace('const halvings = n => {', 'let open = 0, peak = 0; const halvings = n => { open++; peak = Math.max(peak, open); try {')
  .replace(/};\s*$/, '} finally { open--; } };');
const measure = new Function('n', measured + '\nconst result = halvings(n); return { result, peak, open };') as (n: number) => { result: number; peak: number; open: number };
assert.deepEqual(measure(1000), { result: 9, peak: 10, open: 0 });
for (let exponent = 0; exponent <= 15; exponent++) assert.equal(measure(2 ** exponent).peak, exponent + 1);
assert.equal(q2.correct, 0);
assert(q2.options[0].en.includes('10 frames') && q2.options[0].en.includes('O(log n)'));
const q3 = q('dsa-v1-d06-q3');
const sumFunctions = new Function(q3.context!.code + '\nreturn [totalA, totalB];')() as [(h: unknown) => number, (h: unknown) => number];
const frozenList = (values: number[]) => values.reduceRight<unknown>((next, value) => Object.freeze({ value, next }), null);
for (const values of [[], [7], [3, 1, 4], [-3, 0, 2], Array.from({ length: 100 }, (_, i) => i)]) {
  const head = frozenList(values);
  assert.equal(sumFunctions[0](head), values.reduce((a, b) => a + b, 0));
  assert.equal(sumFunctions[1](head), sumFunctions[0](head));
}
assert.equal(q3.correct, 0);
assert(q3.options[0].en.includes('O(n) time') && q3.options[0].en.includes('B needs O(1)'));
const q4 = q('dsa-v1-d06-q4');
const counted = q4.context!.code.replace('const factorial = n => {', 'let multiplies = 0; const factorial = n => {').replace('product *= i', '(multiplies++, product *= i)');
const factorial = new Function('n', counted + '\nreturn { value: factorial(n), multiplies };') as (n: number) => { value: number; multiplies: number };
let exact = 1n;
for (let n = 0; n <= 20; n++) {
  if (n > 0) exact *= BigInt(n);
  const result = factorial(n);
  assert.equal(result.multiplies, Math.max(0, n - 1));
  assert.equal(BigInt(result.value), exact);
}
assert.equal(q4.correct, 0);
assert(q4.prompt.en.includes('ignoring Number range limits'));
assert(q4.options[0].en.startsWith('O(n):') && q4.options[0].en.includes('at least 2'));
for (const question of [q2, q3, q4]) assert(!/the (?:first|second|third|fourth) option/i.test(question.explanation.en));
const records = [...reads.map(a => ({ id: a.id, contentHash: nativeContentHash(a), gradingHash: nativeGradingHash(a) })),
  ...[q2, q3, q4].map(q => ({ id: q.id, contentHash: nativeContentHash(q), gradingHash: null }))];
assert(process.argv[2]);
writeFileSync(process.argv[2], JSON.stringify({ checkedRecords: 5, records, checks: [
  'two existing lesson links, self-reviewed policy', '1000 and powers-of-two recursive depths',
  'actual recursive/iterative sums on frozen lists', 'variable operation count with exact bounded values',
  'nonpositional explanations preserve shuffle independence',
] }, null, 2), { mode: 0o600 });
console.log('PASS five native records: reading links, ten-frame halving, list costs and factorial operation counts');
