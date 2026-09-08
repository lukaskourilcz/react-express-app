/** Server-only reference solutions and hidden assertions for FDE M01.
 *
 * M01 has no code activity. Its practical is `fde-v1-m01-scope-brief`, a
 * written artifact: the grader records it as self-reviewed after checking that
 * every required field is present and inside its length cap, and there is no
 * reference implementation to seal or hidden assertion to run. The four
 * objective questions of `fde-v1-m01-checks` keep their answer key in the
 * module source, where every check activity keeps it.
 *
 * The export exists so `solutions/index.ts` can spread it unconditionally
 * alongside every other module, and so adding a code activity to M01 later
 * needs no change anywhere else. */

import type { PathCodeSolution } from '../types';

export const FDE_M01_SOLUTIONS: Record<string, PathCodeSolution> = {};
