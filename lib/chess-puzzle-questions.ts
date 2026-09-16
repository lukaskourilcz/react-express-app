/** The imported Lichess puzzles as the questions the delivery pipeline serves.
 *
 * This is the boundary the whole import exists to respect. `IMPORTED_CHESS_
 * PUZZLES` carries `solutionUci`, `solutionSan` and the full solution line;
 * a `Question` has no field for any of them, so projecting through
 * `puzzleQuestion` leaves the solution behind in the server module by
 * construction rather than by remembering to delete it. The correct option's
 * index then travels the same road as every other question's: into the signed
 * session token, never into the response body.
 *
 * Everything here degrades to nothing. With no import run the arrays are
 * empty, and chessShark serves exactly the authored bank it served before.
 */
import type { CategoryType, Question, QuestionTranslation } from './quiz-data';
import { IMPORTED_CHESS_PUZZLES } from './chess-puzzle-bank';
import { puzzleQuestion, puzzleTranslation, PUZZLE_TOPICS, type ImportedPuzzle } from '../shared/chess-puzzles';

/** The chess categories a puzzle may be filed under. A generated bank naming
 * anything else is dropped rather than served: the category decides subject
 * scope, and an unknown one would escape it. */
const PUZZLE_CATEGORIES = new Set<string>(PUZZLE_TOPICS);

export interface ChessPuzzleBank {
  questions: Question[];
  translations: Record<string, QuestionTranslation>;
}

/** Project a generated bank into the question and translation shapes the
 * loader serves. Exported so the launch contract can run a filled bank through
 * it: the committed bank is empty, and a path that only ever runs over an
 * empty array is a path nobody has tested. */
export function buildChessPuzzleBank(puzzles: readonly ImportedPuzzle[]): ChessPuzzleBank {
  const usable = puzzles.filter((puzzle) => PUZZLE_CATEGORIES.has(puzzle.topic));
  return {
    questions: usable.map((puzzle) => {
      const shape = puzzleQuestion(puzzle);
      return {
        id: shape.id,
        tags: shape.tags,
        introduction: shape.introduction,
        question: shape.question,
        options: shape.options,
        correctAnswer: shape.correctAnswer,
        category: shape.category as CategoryType,
        explanation: shape.explanation,
        difficulty: shape.difficulty,
      };
    }),
    translations: Object.fromEntries(
      usable.map((puzzle) => [puzzle.id, puzzleTranslation(puzzle) as QuestionTranslation]),
    ),
  };
}

const bank = buildChessPuzzleBank(IMPORTED_CHESS_PUZZLES);

export const chessPuzzleQuestions: Question[] = bank.questions;
export const chessPuzzleTranslationsCs: Record<string, QuestionTranslation> = bank.translations;
