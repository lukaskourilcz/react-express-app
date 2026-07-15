// Czech translations for every Poker question, merged by id.
import type { QuestionTranslation } from './quiz-data';
import { handRankingsTranslationsCs } from './roadmap-questions-hand-rankings.cs';
import { rulesFormatsTranslationsCs } from './roadmap-questions-rules-formats.cs';
import { positionsTranslationsCs } from './roadmap-questions-positions.cs';
import { startingHandsTranslationsCs } from './roadmap-questions-starting-hands.cs';
import { potOddsTranslationsCs } from './roadmap-questions-pot-odds.cs';
import { bettingStrategyTranslationsCs } from './roadmap-questions-betting-strategy.cs';
import { postflopTranslationsCs } from './roadmap-questions-postflop.cs';
import { tournamentPlayTranslationsCs } from './roadmap-questions-tournament-play.cs';
import { psychologyTranslationsCs } from './roadmap-questions-psychology.cs';
import { gtoAdvancedTranslationsCs } from './roadmap-questions-gto-advanced.cs';

export const pokerTranslationsCs: Record<string, QuestionTranslation> = {
  ...handRankingsTranslationsCs,
  ...rulesFormatsTranslationsCs,
  ...positionsTranslationsCs,
  ...startingHandsTranslationsCs,
  ...potOddsTranslationsCs,
  ...bettingStrategyTranslationsCs,
  ...postflopTranslationsCs,
  ...tournamentPlayTranslationsCs,
  ...psychologyTranslationsCs,
  ...gtoAdvancedTranslationsCs,
};
