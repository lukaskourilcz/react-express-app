/** Server-only access to the authored solution comparisons (issue #158).
 * The launch contracts forbid importing this directory from client code. */

import type { CodingApproach } from '../../../shared/coding-approaches';
import { JAVASCRIPT_APPROACHES } from './javascript';

const ALL: Record<string, CodingApproach[]> = { ...JAVASCRIPT_APPROACHES };

export const approachesFor = (taskId: string): CodingApproach[] | undefined => ALL[taskId];

/** The coverage manifest: which tasks have a comparison authored. Surfaces read
 * it so a task without one never renders an empty comparison tab. */
export const approachCoverage = (): string[] => Object.keys(ALL).sort();
export const allApproaches = (): Record<string, CodingApproach[]> => ALL;
