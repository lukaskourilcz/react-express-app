/** Code-ordering (Parsons) puzzles: the practice format devShark uses where a
 * code editor does not belong (issue #154).
 *
 * A puzzle is authored per task. The learner arranges shuffled blocks into a
 * working solution by tapping, by the move buttons, or from the keyboard —
 * dragging is an extra, never the only way. The server shuffles, seals the
 * permutation into the coding session and grades the arrangement against the
 * authored orderings, so the browser never sees the answer and a replayed or
 * forged order cannot pass.
 *
 * A solved puzzle proves the competencies it declares — reading code, ordering
 * an algorithm, spotting the block that does not belong. It is deliberately NOT
 * evidence of writing the implementation unaided, and it is recorded
 * separately for exactly that reason. */

/** What a puzzle can honestly claim to have proved. */
export type PuzzleCompetency =
  | 'read-code'
  | 'order-algorithm'
  | 'choose-method'
  | 'reject-distractor'
  | 'trace-control-flow';

export const PUZZLE_COMPETENCIES: readonly PuzzleCompetency[] = [
  'read-code', 'order-algorithm', 'choose-method', 'reject-distractor', 'trace-control-flow',
];

/** One movable block, as the learner sees it. */
export interface PuzzleBlock {
  /** Stable id within the puzzle; also what a submission sends back. */
  id: string;
  code: string;
  /** Indent steps, rendered as leading space. Presentation only. */
  indent: number;
}

/** The puzzle the browser receives: blocks in the server's shuffled order. */
export interface PlayableCodingPuzzle {
  taskId: string;
  /** Bumped whenever the authored blocks change, so evidence stays honest. */
  version: number;
  competencies: PuzzleCompetency[];
  blocks: PuzzleBlock[];
  /** Blocks the learner must leave out. Counted, never named. */
  distractorCount: number;
}

export type PuzzleOutcome = 'passed' | 'failed';

export interface CodingPuzzleVerdict {
  verdict: PuzzleOutcome;
  /** How many leading blocks are in an accepted position — null until every
   * block has been placed, because a per-block answer would be an oracle. */
  correctPrefix: number | null;
  /** Total blocks in the shortest accepted arrangement. */
  expectedLength: number;
  /** True when a block that does not belong was used. */
  usedDistractor: boolean;
  competencies: PuzzleCompetency[];
  /** Recognition evidence, deliberately separate from writing the code. */
  evidence: 'puzzle';
  /** Whether the result was recorded (a signed-in learner with a live plan). */
  applied: boolean;
  /** True when this pass satisfied a Learn level's coding requirement. */
  satisfiesLevel: boolean;
}

/** The maximum blocks a puzzle may present; matches the sealed key's bound. */
export const MAX_PUZZLE_BLOCKS = 12;

/** Is this arrangement well-formed before it even reaches the server? */
export function isPuzzleOrder(value: unknown, blocks: readonly PuzzleBlock[]): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PUZZLE_BLOCKS) return false;
  const known = new Set(blocks.map((block) => block.id));
  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id !== 'string' || !known.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** The device policy (issue #154). The viewport decides what is comfortable to
 * use; it never decides what a learner is allowed to do, and the server never
 * reads it. */
export const PUZZLE_MAX_EDITOR_WIDTH = 900;
