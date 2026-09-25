/** Server-only access to reference solutions and hidden tests. The launch
 * contracts assert that nothing under `client/` imports this directory. */

import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import type { CodingSolution } from '../types';
import { stripComments } from './strip-comments';
import { JAVASCRIPT_SOLUTIONS } from './javascript';
import { TYPESCRIPT_SOLUTIONS } from './typescript';
import { REACT_SOLUTIONS } from './react';
import { JAVASCRIPT_LOOP_SOLUTIONS } from './javascript-loops';
import { TYPESCRIPT_LOOP_SOLUTIONS } from './typescript-loops';
import { REACT_LOOP_SOLUTIONS } from './react-loops';
import { JAVASCRIPT_DEBUG_SOLUTIONS } from './javascript-debug';
import { ALGORITHM_SOLUTIONS } from './algorithms';
import { EASY_JAVASCRIPT_A_SOLUTIONS } from './easy-javascript-a';
import { EASY_JAVASCRIPT_B_SOLUTIONS } from './easy-javascript-b';
import { EASY_JAVASCRIPT_C_SOLUTIONS } from './easy-javascript-c';
import { EASY_TYPESCRIPT_A_SOLUTIONS } from './easy-typescript-a';
import { EASY_TYPESCRIPT_B_SOLUTIONS } from './easy-typescript-b';
import { EASY_REACT_A_SOLUTIONS } from './easy-react-a';
import { EASY_REACT_B_SOLUTIONS } from './easy-react-b';
import { EVOLVING_SOLUTIONS } from './evolving';
import { DEBUG_EVOLVING_SOLUTIONS } from './evolving-debug';
import { PATH_SOLUTIONS } from './paths';
import { REACT_EVOLVING_SOLUTIONS } from './evolving-react';
import { FULLSTACK_SOLUTIONS } from './fullstack';

const AUTHORED: Record<string, CodingSolution> = {
  ...EVOLVING_SOLUTIONS, ...REACT_EVOLVING_SOLUTIONS, ...DEBUG_EVOLVING_SOLUTIONS, ...PATH_SOLUTIONS,
  ...FULLSTACK_SOLUTIONS,
  ...JAVASCRIPT_SOLUTIONS, ...JAVASCRIPT_LOOP_SOLUTIONS, ...JAVASCRIPT_DEBUG_SOLUTIONS,
  ...TYPESCRIPT_SOLUTIONS, ...TYPESCRIPT_LOOP_SOLUTIONS,
  ...REACT_SOLUTIONS, ...REACT_LOOP_SOLUTIONS,
  ...ALGORITHM_SOLUTIONS,
  // The Easy-band waves of #226, in the order `EASY_BAND` lists them.
  ...EASY_JAVASCRIPT_A_SOLUTIONS,
  ...EASY_JAVASCRIPT_B_SOLUTIONS,
  ...EASY_JAVASCRIPT_C_SOLUTIONS,
  ...EASY_TYPESCRIPT_A_SOLUTIONS,
  ...EASY_TYPESCRIPT_B_SOLUTIONS,
  ...EASY_REACT_A_SOLUTIONS,
  ...EASY_REACT_B_SOLUTIONS,
};

// The junior and senior boards are read as code, so the authoring notes that
// explain them in the source do not travel. Stripping here rather than at the
// API boundary means the content contract proves the exact text that ships.
// The reference solution keeps its comments: it is the answer a learner reads
// after giving up, where the reasoning is the point.
const ALL: Record<string, CodingSolution> = Object.fromEntries(
  Object.entries(AUTHORED).map(([id, record]) => [id, {
    ...record,
    ...(record.junior ? { junior: stripComments(record.junior) } : {}),
    ...(record.senior ? { senior: stripComments(record.senior) } : {}),
  }]),
);

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
