/* GENERATED FILE — written by `npm run import:chess-puzzles -- --csv <file> --write`.
 * Do not edit by hand; the next import overwrites it.
 *
 * The bank is empty until somebody runs the import against a local copy of the
 * Lichess puzzle database (https://database.lichess.org/, CC0). An empty bank
 * is a working state, not a broken one: chessShark serves its authored chess
 * questions exactly as before and no puzzle appears anywhere.
 *
 * This module is server-side only. It carries each puzzle's solution, and the
 * client never imports it — `lib/chess-puzzle-questions.ts` is the projection
 * that reaches the delivery pipeline, and it drops every solution field.
 */
import type { ImportedPuzzle } from '../shared/chess-puzzles';

export interface ChessPuzzleImportMeta {
  /** ISO date of the last import, or null when it has never been run. */
  generatedAt: string | null;
  /** The database file the bank came from, by name only. */
  source: string | null;
  /** How many puzzles were kept per topic per tier. */
  perTier: number;
}

export const CHESS_PUZZLE_IMPORT: ChessPuzzleImportMeta = {
  generatedAt: null,
  source: null,
  perTier: 0,
};

export const IMPORTED_CHESS_PUZZLES: ImportedPuzzle[] = [];
