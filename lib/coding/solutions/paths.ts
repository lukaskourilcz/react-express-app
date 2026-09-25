/** Every short path's solutions, keyed by level id. */

import type { CodingSolution } from '../types';
import { JAVASCRIPT_PATH_SOLUTIONS } from './paths-javascript';
import { TYPESCRIPT_PATH_SOLUTIONS } from './paths-typescript';
import { REACT_PATH_SOLUTIONS } from './paths-react';
import { ALGORITHM_PATH_SOLUTIONS } from './paths-algorithms';
import { FULLSTACK_PATH_SOLUTIONS } from './paths-fullstack';
import { DEBUGGING_PATH_SOLUTIONS } from './paths-debugging';

export const PATH_SOLUTIONS: Record<string, CodingSolution> = {
  ...JAVASCRIPT_PATH_SOLUTIONS,
  ...TYPESCRIPT_PATH_SOLUTIONS,
  ...REACT_PATH_SOLUTIONS,
  ...ALGORITHM_PATH_SOLUTIONS,
  ...FULLSTACK_PATH_SOLUTIONS,
  ...DEBUGGING_PATH_SOLUTIONS,
};
