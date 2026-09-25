/** How the short paths' solutions are assembled. */

import type { CodingSolution } from '../types';

/** One path's code on three boards, one entry per level. */
export interface Boards { reference: string[]; junior: string[]; senior: string[] }

/** Hidden checks per level, as `[call, expected]` pairs. */
export type Hidden = [string, unknown][][];

/** A path whose every level adds functions to the same file: each board entry
 * is only that level's new code, so a level's solution is every earlier
 * entry plus its own, and its hidden checks are every earlier level's too. */
export function cumulativeLevels(id: string, boards: Boards, hidden: Hidden): [string, CodingSolution][] {
  return boards.reference.map((_, index) => {
    const level = index + 1;
    return [`${id}-${level}`, {
      solution: boards.reference.slice(0, level).join('\n\n'),
      junior: boards.junior.slice(0, level).join('\n\n'),
      senior: boards.senior.slice(0, level).join('\n\n'),
      hiddenTests: hidden.slice(0, level).flat().map(([call, expected]) => ({ call, expected, edge: true })),
    }];
  });
}

/** A path whose every level is a whole module (a React `App`): each board
 * entry is already the complete file for its level. */
export function wholeLevels(id: string, boards: Boards): [string, CodingSolution][] {
  return boards.reference.map((solution, index) => [`${id}-${index + 1}`, {
    solution,
    junior: boards.junior[index],
    senior: boards.senior[index],
  }]);
}
