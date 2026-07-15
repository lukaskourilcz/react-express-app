// Czech translations for every History question, merged by id.
import type { QuestionTranslation } from './quiz-data';
import { prehistoryTranslationsCs } from './roadmap-questions-prehistory.cs';
import { ancientTranslationsCs } from './roadmap-questions-ancient.cs';
import { classicalTranslationsCs } from './roadmap-questions-classical.cs';
import { medievalTranslationsCs } from './roadmap-questions-medieval.cs';
import { renaissanceTranslationsCs } from './roadmap-questions-renaissance.cs';
import { earlymodernTranslationsCs } from './roadmap-questions-earlymodern.cs';
import { industrialTranslationsCs } from './roadmap-questions-industrial.cs';
import { worldwarsTranslationsCs } from './roadmap-questions-worldwars.cs';
import { coldwarTranslationsCs } from './roadmap-questions-coldwar.cs';
import { modernTranslationsCs } from './roadmap-questions-modern.cs';
import { historiographyTranslationsCs } from './roadmap-questions-historiography.cs';
import { historyOfScienceTranslationsCs } from './roadmap-questions-history-of-science.cs';
import { economicHistoryTranslationsCs } from './roadmap-questions-economic-history.cs';
import { intellectualHistoryTranslationsCs } from './roadmap-questions-intellectual-history.cs';
import { militaryHistoryTranslationsCs } from './roadmap-questions-military-history.cs';

export const historyTranslationsCs: Record<string, QuestionTranslation> = {
  ...prehistoryTranslationsCs,
  ...ancientTranslationsCs,
  ...classicalTranslationsCs,
  ...medievalTranslationsCs,
  ...renaissanceTranslationsCs,
  ...earlymodernTranslationsCs,
  ...industrialTranslationsCs,
  ...worldwarsTranslationsCs,
  ...coldwarTranslationsCs,
  ...modernTranslationsCs,
  ...historiographyTranslationsCs,
  ...historyOfScienceTranslationsCs,
  ...economicHistoryTranslationsCs,
  ...intellectualHistoryTranslationsCs,
  ...militaryHistoryTranslationsCs,
};
