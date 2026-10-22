/** Server-only access to learning-path reference solutions and hidden
 * assertions. The launch contracts assert that nothing under `client/`
 * imports this directory, and that `lib/learning-paths/catalog.ts` — the
 * module the public projections come from — never imports it either. */

import type { PathCodeSolution } from '../types';
import { DSA_D01_SOLUTIONS } from './dsa-d01';
import { DSA_D02_SOLUTIONS } from './dsa-d02';
import { DSA_D03_SOLUTIONS } from './dsa-d03';
import { DSA_D04_SOLUTIONS } from './dsa-d04';
import { DSA_D05_SOLUTIONS } from './dsa-d05';
import { DSA_D06_SOLUTIONS } from './dsa-d06';
import { DSA_D07_SOLUTIONS } from './dsa-d07';
import { DSA_D08_SOLUTIONS } from './dsa-d08';
import { DSA_D09_SOLUTIONS } from './dsa-d09';
import { DSA_D10_SOLUTIONS } from './dsa-d10';
import { FDE_DIAGNOSTIC_SOLUTIONS } from './fde-diagnostic';
import { FDE_BRIDGES_SOLUTIONS } from './fde-bridges';
import { FDE_M01_SOLUTIONS } from './fde-m01';
import { FDE_M02_SOLUTIONS } from './fde-m02';
import { FDE_M03_SOLUTIONS } from './fde-m03';
import { FDE_M04_SOLUTIONS } from './fde-m04';
import { FDE_M05_SOLUTIONS } from './fde-m05';
import { FDE_M06_SOLUTIONS } from './fde-m06';
import { FDE_M07_SOLUTIONS } from './fde-m07';
import { FDE_M08_SOLUTIONS } from './fde-m08';
import { FDE_M09_SOLUTIONS } from './fde-m09';
import { FDE_M10_SOLUTIONS } from './fde-m10';
import { FDE_C01_SOLUTIONS } from './fde-c01';

const ALL: Record<string, PathCodeSolution> = {
  ...DSA_D01_SOLUTIONS,
  ...DSA_D02_SOLUTIONS,
  ...DSA_D03_SOLUTIONS,
  ...DSA_D04_SOLUTIONS,
  ...DSA_D05_SOLUTIONS,
  ...DSA_D06_SOLUTIONS,
  ...DSA_D07_SOLUTIONS,
  ...DSA_D08_SOLUTIONS,
  ...DSA_D09_SOLUTIONS,
  ...DSA_D10_SOLUTIONS,
  ...FDE_DIAGNOSTIC_SOLUTIONS,
  ...FDE_BRIDGES_SOLUTIONS,
  ...FDE_M01_SOLUTIONS,
  ...FDE_M02_SOLUTIONS,
  ...FDE_M03_SOLUTIONS,
  ...FDE_M04_SOLUTIONS,
  ...FDE_M05_SOLUTIONS,
  ...FDE_M06_SOLUTIONS,
  ...FDE_M07_SOLUTIONS,
  ...FDE_M08_SOLUTIONS,
  ...FDE_M09_SOLUTIONS,
  ...FDE_M10_SOLUTIONS,
  ...FDE_C01_SOLUTIONS,
};

export const solutionFor = (activityId: string): PathCodeSolution | undefined => ALL[activityId];
export const solutionIds = (): string[] => Object.keys(ALL);
