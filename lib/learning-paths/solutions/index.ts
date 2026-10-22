/** Server-only access to learning-path reference solutions and hidden
 * assertions. The launch contracts assert that nothing under `client/`
 * imports this directory, and that `lib/learning-paths/catalog.ts` — the
 * module the public projections come from — never imports it either. */

import type { PathCodeSolution } from '../types';
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
import { FDE_M11_SOLUTIONS } from './fde-m11';
import { FDE_M12_SOLUTIONS } from './fde-m12';
import { FDE_M13_SOLUTIONS } from './fde-m13';
import { FDE_M14_SOLUTIONS } from './fde-m14';
import { FDE_IP02_SOLUTIONS } from './fde-ip02';
import { FDE_IP01_SOLUTIONS } from './fde-ip01';
import { FDE_IP04_SOLUTIONS } from './fde-ip04';
import { FDE_IP03_SOLUTIONS } from './fde-ip03';
import { FDE_C01_SOLUTIONS } from './fde-c01';

const ALL: Record<string, PathCodeSolution> = {
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
  ...FDE_M11_SOLUTIONS,
  ...FDE_M12_SOLUTIONS,
  ...FDE_M13_SOLUTIONS,
  ...FDE_M14_SOLUTIONS,
  ...FDE_C01_SOLUTIONS,
  ...FDE_IP01_SOLUTIONS,
  ...FDE_IP02_SOLUTIONS,
  ...FDE_IP03_SOLUTIONS,
  ...FDE_IP04_SOLUTIONS,
};

export const solutionFor = (activityId: string): PathCodeSolution | undefined => ALL[activityId];
export const solutionIds = (): string[] => Object.keys(ALL);
