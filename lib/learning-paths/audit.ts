/** Exact review bindings for authored English path material. Expected values
 * and hidden assertions are data: do not apply locale filtering to them. */
import { createHash } from 'node:crypto';
import { englishOnly } from '../coding/catalog';
import { codingTaskById } from '../coding/active';
import { solutionFor as codingSolutionFor } from '../coding/solutions';
import { taskHash } from '../curation';
import { solutionFor } from './solutions';
import type { MergedActivity } from './types';

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

export const nativeContentHash = (value: unknown): string => hash(englishOnly(value));

export function nativeGradingHash(activity: MergedActivity): string | null {
  if (!activity.code && !activity.reuseTaskId) return null;
  const material = [
    'native-grading:v1', englishOnly(activity),
    activity.code?.tests.map(test => ({ ...test, label: test.label?.en })),
    activity.code?.typeTests, solutionFor(activity.id),
  ];
  if (activity.reuseTaskId) {
    const task = codingTaskById(activity.reuseTaskId);
    if (!task) throw new Error(`Unknown canonical coding task: ${activity.reuseTaskId}`);
    material.push(taskHash(task, codingSolutionFor(task.id)));
  }
  return hash(material);
}
