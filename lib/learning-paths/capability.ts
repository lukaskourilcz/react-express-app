/** The per-path capability `api/settings.ts` publishes, without the
 * learning-path handlers.
 *
 * `/api/settings` answers every page load. It used to import
 * `./handlers` for `learningPathCapability()`, and with it the coding
 * catalogue and solutions, TypeScript and the QuickJS grader: about 340 ms of
 * every cold start of that function, against 18 ms for `api/health.ts`
 * (#587, server item 17). This module reads only the catalogue's availability
 * check, the environment switch and the deployment scope.
 *
 * `./handlers` keeps its own `learningPathCapability()`, which also knows
 * whether a request in its function found the storage migration missing.
 * The settings function never runs a learning-path op, so in it that flag
 * never leaves "not known to be missing" and both answer the same; the
 * cold-start contract (scripts/cold-start-contracts.ts) compares them for
 * every path and both states of the switch. */

import type { LearningPathCapability } from '../../shared/learning-path-api';
import { deploymentSubjectIds } from '../product-scope';
import { availabilityFor, LEARNING_PATHS, pathEnabledInEnv } from './catalog';

/** The capability for a function that has not found the storage missing. */
export function learningPathCapability(): LearningPathCapability {
  if (!deploymentSubjectIds().includes('webdev')) return { paths: {} };
  const paths: LearningPathCapability['paths'] = {};
  for (const path of LEARNING_PATHS) {
    const state = availabilityFor({ path, enabled: pathEnabledInEnv(path.id), storageInstalled: true });
    paths[path.id] = { enabled: state === 'available', version: path.version, availability: state };
  }
  return { paths };
}
