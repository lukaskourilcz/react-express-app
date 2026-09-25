/** Every short path's solutions, keyed by level id. */

import type { CodingSolution } from '../types';
import { JAVASCRIPT_PATH_SOLUTIONS } from './paths-javascript';

export const PATH_SOLUTIONS: Record<string, CodingSolution> = {
  ...JAVASCRIPT_PATH_SOLUTIONS,
};
