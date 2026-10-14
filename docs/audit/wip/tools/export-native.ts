import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { englishOnly } from '../../../../lib/coding/catalog';

const output = process.argv[2];
if (!output) throw new Error('Pass an output JSON file');
const records = LEARNING_PATHS.flatMap(path => path.modules.flatMap(module => [
  ...module.lessons.map(lesson => ({
    id: lesson.id, path: path.id, module: module.id, kind: 'native-lesson',
    contentHash: nativeContentHash(lesson), gradingHash: null, material: englishOnly(lesson),
  })),
  ...module.activities.flatMap(activity => [{
    id: activity.id, path: path.id, module: module.id, kind: 'native-activity',
    contentHash: nativeContentHash(activity), gradingHash: nativeGradingHash(activity),
    material: englishOnly(activity), solution: solutionFor(activity.id) ?? null,
  }, ...(activity.questions ?? []).map(question => ({
    id: question.id, path: path.id, module: module.id, kind: 'native-check-question',
    contentHash: nativeContentHash(question), gradingHash: null, material: englishOnly(question),
  }))]),
]));
writeFileSync(output, JSON.stringify(records, null, 2), { mode: 0o600 });
console.log(`Exported ${records.length} native records; execution is not editorial approval.`);
