/** Every short path's task body, keyed by path id. The FullStack path mixes
 * tracks level by level, so `./paths-fullstack` builds its tasks itself. */

import type { Spec } from './evolving';
import { JAVASCRIPT_PATHS } from './paths-javascript';
import { TYPESCRIPT_PATHS } from './paths-typescript';
import { REACT_PATHS } from './paths-react';
import { ALGORITHM_PATHS } from './paths-algorithms';
import { DEBUGGING_PATHS } from './paths-debugging';

export const PATH_SPECS: Record<string, Spec> = {
  ...JAVASCRIPT_PATHS,
  ...TYPESCRIPT_PATHS,
  ...REACT_PATHS,
  ...ALGORITHM_PATHS,
  ...DEBUGGING_PATHS,
};
