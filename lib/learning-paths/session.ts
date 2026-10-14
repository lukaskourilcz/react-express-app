/** Exact native coding versions stay inside encrypted attempt sessions. */
import { createHash } from 'node:crypto';
import { encodeLearningPathSession, type LearningPathSession } from '../quiz-tokens';
import { nativeContentHash, nativeGradingHash } from './audit';
import { activityIn, pathById } from './catalog';
import type { MergedActivity } from './types';

export function pathCodeAttemptVersion(activity: MergedActivity, rubricVersion: number): string | undefined {
  if (activity.kind !== 'code') return undefined;
  return createHash('sha256').update(JSON.stringify([
    'path-code-attempt:v2', rubricVersion, nativeContentHash(activity), nativeGradingHash(activity),
  ])).digest('hex');
}

export function createLearningPathSession(input: Omit<LearningPathSession, 'issuedAt' | 'expiresAt' | 'version'> & { ttlMs?: number }) {
  const path = pathById(input.pathId);
  const found = path && activityIn(path, input.activityId);
  if (!found) throw new Error('Cannot issue a session for an unknown path activity');
  return encodeLearningPathSession({ ...input, version: pathCodeAttemptVersion(found.activity, path.rubric.version) });
}
