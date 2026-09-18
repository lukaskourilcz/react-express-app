/** Server-only access to reference solutions and hidden tests. The launch
 * contracts assert that nothing under `client/` imports this directory. */

import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import type { CodingSolution } from '../types';
import { JAVASCRIPT_SOLUTIONS } from './javascript';
import { TYPESCRIPT_SOLUTIONS } from './typescript';
import { REACT_SOLUTIONS } from './react';
import { JAVASCRIPT_LOOP_SOLUTIONS } from './javascript-loops';
import { TYPESCRIPT_LOOP_SOLUTIONS } from './typescript-loops';
import { REACT_LOOP_SOLUTIONS } from './react-loops';
import { JAVASCRIPT_DEBUG_SOLUTIONS } from './javascript-debug';
import { EVOLVING_SOLUTIONS } from './evolving';
import { DEBUG_EVOLVING_SOLUTIONS } from './evolving-debug';
import { REACT_EVOLVING_SOLUTIONS } from './evolving-react';
import { FULLSTACK_SOLUTIONS } from './fullstack';

const ALL: Record<string, CodingSolution> = {
  ...EVOLVING_SOLUTIONS, ...REACT_EVOLVING_SOLUTIONS, ...DEBUG_EVOLVING_SOLUTIONS,
  ...FULLSTACK_SOLUTIONS,
  ...JAVASCRIPT_SOLUTIONS, ...JAVASCRIPT_LOOP_SOLUTIONS, ...JAVASCRIPT_DEBUG_SOLUTIONS,
  ...TYPESCRIPT_SOLUTIONS, ...TYPESCRIPT_LOOP_SOLUTIONS,
  ...REACT_SOLUTIONS, ...REACT_LOOP_SOLUTIONS,
};

for (const id of EVOLVING_CHALLENGES.flatMap(project => project.stages).filter(id => id.endsWith('-start'))) {
  // A checkpoint checks only its smaller public contract, never future hidden requirements.
  const milestone = ALL[id.slice(0,-6)];
  ALL[id] = {
    solution: milestone.solution,
    ...(milestone.junior ? { junior: milestone.junior } : {}),
    ...(milestone.senior ? { senior: milestone.senior } : {}),
  };
}

export const solutionFor = (id: string): CodingSolution | undefined => ALL[id];
export const solutionIds = (): string[] => Object.keys(ALL);
