/** Authored Parsons puzzles. Server-only: the accepted orderings are answers.
 *
 * Each puzzle stands in for one coding task on a screen where an editor does
 * not belong. `lines` are authored in a natural reading order; `accepted` lists
 * every arrangement that assembles into working code, so a puzzle with two
 * genuinely equivalent orderings accepts both instead of insisting on the one
 * the author happened to type first. */

import type { PuzzleCompetency } from '../../../shared/coding-puzzle';

export interface PuzzleLine {
  id: string;
  code: string;
  /** Indent steps, presentation only. */
  indent?: number;
  /** A block that must be left out of a correct arrangement. */
  distractor?: boolean;
}

export interface AuthoredPuzzle {
  taskId: string;
  version: number;
  competencies: PuzzleCompetency[];
  lines: PuzzleLine[];
  /** Accepted arrangements, each a list of line ids in order. */
  accepted: string[][];
  /** Czech has no separate copy: the blocks are code. */
}

/** Join an accepted arrangement into the source it stands for. */
export function assemble(puzzle: AuthoredPuzzle, order: readonly string[]): string {
  const byId = new Map(puzzle.lines.map((line) => [line.id, line]));
  return order
    .map((id) => {
      const line = byId.get(id);
      if (!line) return '';
      return `${'  '.repeat(line.indent ?? 0)}${line.code}`;
    })
    .join('\n');
}
