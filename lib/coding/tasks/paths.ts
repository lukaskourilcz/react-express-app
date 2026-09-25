/** Every short path's task body, keyed by path id. */

import type { Spec } from './evolving';
import { JAVASCRIPT_PATHS } from './paths-javascript';

export const PATH_SPECS: Record<string, Spec> = {
  ...JAVASCRIPT_PATHS,
};
