/** The authored puzzle registry and its grading (issue #154).
 *
 * Server-only: `accepted` is an answer key. The playable projection carries the
 * blocks in the server's shuffled order and nothing else. */

import type {
  PlayableCodingPuzzle,
  PuzzleBlock,
  PuzzleCompetency,
} from '../../../shared/coding-puzzle';
import { MAX_PUZZLE_BLOCKS } from '../../../shared/coding-puzzle';
import { JAVASCRIPT_PUZZLES } from './javascript';
import { assemble, type AuthoredPuzzle } from './types';

const ALL: AuthoredPuzzle[] = [...JAVASCRIPT_PUZZLES];
const BY_TASK = new Map(ALL.map((puzzle) => [puzzle.taskId, puzzle]));

export const puzzleFor = (taskId: string): AuthoredPuzzle | undefined => BY_TASK.get(taskId);
export const puzzleTaskIds = (): string[] => [...BY_TASK.keys()];
export const allPuzzles = (): readonly AuthoredPuzzle[] => ALL;
export { assemble };
export type { AuthoredPuzzle };

/**
 * The playable projection plus the permutation to seal into the session.
 * `permutation[presented] = authored line index`, so a submission of presented
 * ids is translated back on the server and the browser learns nothing.
 */
export function preparePuzzle(
  puzzle: AuthoredPuzzle,
  shuffle: <T>(items: T[]) => T[],
): { playable: PlayableCodingPuzzle; permutation: number[] } {
  const indices = shuffle(puzzle.lines.map((_, index) => index));
  const blocks: PuzzleBlock[] = indices.map((authored, position) => ({
    // Presentation ids: the authored ids are never sent, so a learner who reads
    // the payload cannot infer the intended order from the naming.
    id: `b${position}`,
    code: puzzle.lines[authored].code,
    indent: puzzle.lines[authored].indent ?? 0,
  }));
  return {
    playable: {
      taskId: puzzle.taskId,
      version: puzzle.version,
      competencies: [...puzzle.competencies],
      blocks,
      distractorCount: puzzle.lines.filter((line) => line.distractor).length,
    },
    permutation: indices,
  };
}

export interface PuzzleGrade {
  passed: boolean;
  /** null when the arrangement was not complete; see `gradePuzzle`. */
  correctPrefix: number | null;
  expectedLength: number;
  usedDistractor: boolean;
  competencies: PuzzleCompetency[];
}

/**
 * Grade an arrangement of presented block ids against the authored orderings.
 * Any accepted arrangement passes; the reported prefix is the best partial
 * match, which is what the learner is told (never which block is wrong).
 *
 * The prefix is reported only for a complete arrangement. On a partial one it
 * is an oracle: submit a single block, read back whether it is the first, and
 * the whole ordering falls out in as many submissions as there are blocks,
 * without the learner reading a line of the code.
 */
export function gradePuzzle(
  puzzle: AuthoredPuzzle,
  permutation: readonly number[],
  submitted: readonly string[],
): PuzzleGrade {
  const authoredIds = submitted.map((id) => {
    const position = Number.parseInt(id.replace(/^b/, ''), 10);
    const authored = Number.isInteger(position) ? permutation[position] : undefined;
    return authored === undefined ? null : puzzle.lines[authored]?.id ?? null;
  });
  const distractors = new Set(puzzle.lines.filter((line) => line.distractor).map((line) => line.id));
  const usedDistractor = authoredIds.some((id) => id !== null && distractors.has(id));

  let best = 0;
  let passed = false;
  let expectedLength = puzzle.lines.length;
  for (const accepted of puzzle.accepted) {
    expectedLength = Math.min(expectedLength, accepted.length);
    let prefix = 0;
    while (prefix < accepted.length && prefix < authoredIds.length && authoredIds[prefix] === accepted[prefix]) prefix += 1;
    best = Math.max(best, prefix);
    if (!usedDistractor && authoredIds.length === accepted.length && prefix === accepted.length) passed = true;
  }
  const complete = authoredIds.length === expectedLength && authoredIds.every((id) => id !== null);
  return {
    passed,
    correctPrefix: complete ? best : null,
    expectedLength,
    usedDistractor,
    competencies: [...puzzle.competencies],
  };
}

/** Every authored puzzle is small enough for the sealed key and for a phone. */
export function puzzleProblems(): string[] {
  const problems: string[] = [];
  for (const puzzle of ALL) {
    if (puzzle.lines.length > MAX_PUZZLE_BLOCKS) problems.push(`${puzzle.taskId}: too many blocks`);
    if (puzzle.accepted.length === 0) problems.push(`${puzzle.taskId}: no accepted arrangement`);
    if (puzzle.competencies.length === 0) problems.push(`${puzzle.taskId}: declares no competency`);
    const ids = new Set(puzzle.lines.map((line) => line.id));
    if (ids.size !== puzzle.lines.length) problems.push(`${puzzle.taskId}: duplicate block id`);
    const distractors = new Set(puzzle.lines.filter((line) => line.distractor).map((line) => line.id));
    for (const accepted of puzzle.accepted) {
      for (const id of accepted) {
        if (!ids.has(id)) problems.push(`${puzzle.taskId}: accepted order names unknown block ${id}`);
        if (distractors.has(id)) problems.push(`${puzzle.taskId}: accepted order uses distractor ${id}`);
      }
      if (new Set(accepted).size !== accepted.length) problems.push(`${puzzle.taskId}: accepted order repeats a block`);
    }
    const used = new Set(puzzle.accepted.flat());
    for (const line of puzzle.lines) {
      if (!line.distractor && !used.has(line.id)) problems.push(`${puzzle.taskId}: block ${line.id} is unused and not marked a distractor`);
    }
  }
  return problems;
}
