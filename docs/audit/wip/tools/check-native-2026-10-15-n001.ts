import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash } from '../../../../lib/learning-paths/audit';

// Execute only these individually read, trusted authored contexts. This is
// content evidence, never an evaluator for learner-submitted programs.
const questions = LEARNING_PATHS.find(path => path.id === 'dsa-foundations')!
  .modules.find(module => module.id === 'dsa-v1-entry')!.activities[0].questions!;
const question = (id: string) => {
  const found = questions.find(item => item.id === id);
  assert(found, id);
  return found;
};
const source = (id: string) => {
  const context = question(id).context;
  assert(context?.language === 'javascript' && context.code);
  return context.code;
};
const uniqueLabel = (id: string, expected: string) => {
  const q = question(id);
  assert.deepEqual(q.options.flatMap((option, index) => option.en === expected ? [index] : []), [q.correct], id);
};

const logs: unknown[] = [];
new Function('console', source('dsa-v1-entry-q1'))({ log: (value: unknown) => logs.push(value) });
assert.deepEqual(logs, [8]);
uniqueLabel('dsa-v1-entry-q1', String(logs[0]));

const after = new Function(source('dsa-v1-entry-q2') + '\nreturn values;')() as unknown;
assert.deepEqual(after, [2, 3, 4]);
const q2 = question('dsa-v1-entry-q2');
assert.deepEqual(q2.options.flatMap((option, index) => isDeepStrictEqual(JSON.parse(option.en), after) ? [index] : []), [q2.correct]);
const methods = [1, 2, 3];
assert.equal(methods.push(4), 4);
assert.equal(methods.shift(), 1);
assert.deepEqual(methods, [2, 3, 4]);

const q3 = question('dsa-v1-entry-q3');
assert.deepEqual(q3.options.map(option => option.en), [
  'values[values.length - 1]', 'values[values.length]', 'values[values.length - 2]', 'values[-1]',
]);
const expressions = q3.options.map(option => new Function(source(q3.id) + '\nreturn ' + option.en + ';')() as unknown);
assert.deepEqual(expressions, [30, undefined, 20, undefined]);
assert.deepEqual(expressions.flatMap((value, index) => value === 30 ? [index] : []), [q3.correct]);
assert.equal(new Function(source(q3.id) + '\nreturn values.at(-1);')(), 30);
assert.deepEqual(new Function(source(q3.id) + '\nvalues[-1] = "named"; return [values[-1], values.at(-1)];')(), ['named', 30]);

for (const n of [0, 1, 4]) {
  const result = new Function(source('dsa-v1-entry-q4') + '\nreturn describe(' + n + ');')() as unknown;
  assert.equal(result, 'done');
}
uniqueLabel('dsa-v1-entry-q4', JSON.stringify('done'));

const mapResult = new Function(source('dsa-v1-entry-q5') + '\nreturn { value: counts.get("a"), size: counts.size };')() as { value: number; size: number };
assert.deepEqual(mapResult, { value: 2, size: 1 });
uniqueLabel('dsa-v1-entry-q5', String(mapResult.value));

assert(process.argv[2], 'Pass a private evidence output file');
writeFileSync(process.argv[2], JSON.stringify({
  checkedQuestions: 5,
  records: questions.slice(0, 5).map(q => ({ id: q.id, contentHash: nativeContentHash(q), correct: q.correct })),
  checks: ['literal loop output', 'push/shift state and return values', 'every offered bracket expression and at(-1)', 'recursive base-case returns', 'Map overwrite and size'],
}, null, 2), { mode: 0o600 });
console.log('PASS five native entry questions: authored contexts, unique keys, array return semantics, relative indexing and Map overwrite');
