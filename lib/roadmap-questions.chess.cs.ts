// Czech translations for every advanced-chess question, merged by id.
import type { QuestionTranslation } from './quiz-data';
import { openingsTranslationsCs } from './roadmap-questions-openings.cs';
import { tacticsTranslationsCs } from './roadmap-questions-tactics.cs';
import { strategyTranslationsCs } from './roadmap-questions-strategy.cs';
import { endgamesTranslationsCs } from './roadmap-questions-endgames.cs';
import { combinationsTranslationsCs } from './roadmap-questions-combinations.cs';
import { openingTheoryTranslationsCs } from './roadmap-questions-opening-theory.cs';
import { middlegameTranslationsCs } from './roadmap-questions-middlegame.cs';
import { pawnStructuresTranslationsCs } from './roadmap-questions-pawn-structures.cs';
import { endgameTechniqueTranslationsCs } from './roadmap-questions-endgame-technique.cs';
import { chessHistoryTranslationsCs } from './roadmap-questions-chess-history.cs';

export const chessTranslationsCs: Record<string, QuestionTranslation> = {
  ...openingsTranslationsCs,
  ...tacticsTranslationsCs,
  ...strategyTranslationsCs,
  ...endgamesTranslationsCs,
  ...combinationsTranslationsCs,
  ...openingTheoryTranslationsCs,
  ...middlegameTranslationsCs,
  ...pawnStructuresTranslationsCs,
  ...endgameTechniqueTranslationsCs,
  ...chessHistoryTranslationsCs,
};
