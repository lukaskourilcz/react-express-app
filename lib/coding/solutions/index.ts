/** Server-only access to reference solutions and hidden tests. The launch
 * contracts assert that nothing under `client/` imports this directory. */

import type { CodingSolution } from '../types';
import { JAVASCRIPT_SOLUTIONS } from './javascript';
import { TYPESCRIPT_SOLUTIONS } from './typescript';
import { REACT_SOLUTIONS } from './react';
import { JAVASCRIPT_LOOP_SOLUTIONS } from './javascript-loops';
import { TYPESCRIPT_LOOP_SOLUTIONS } from './typescript-loops';
import { REACT_LOOP_SOLUTIONS } from './react-loops';

const ALL: Record<string, CodingSolution> = {
  ...JAVASCRIPT_SOLUTIONS, ...JAVASCRIPT_LOOP_SOLUTIONS,
  ...TYPESCRIPT_SOLUTIONS, ...TYPESCRIPT_LOOP_SOLUTIONS,
  ...REACT_SOLUTIONS, ...REACT_LOOP_SOLUTIONS,
};

export const solutionFor = (id: string): CodingSolution | undefined => ALL[id];
export const solutionIds = (): string[] => Object.keys(ALL);
