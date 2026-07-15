// Czech translations for every Geography question, merged by id.
import type { QuestionTranslation } from './quiz-data';
import { continentsTranslationsCs } from './roadmap-questions-continents.cs';
import { capitalsTranslationsCs } from './roadmap-questions-capitals.cs';
import { flagsTranslationsCs } from './roadmap-questions-flags.cs';
import { landformsTranslationsCs } from './roadmap-questions-landforms.cs';
import { climateTranslationsCs } from './roadmap-questions-climate.cs';
import { populationTranslationsCs } from './roadmap-questions-population.cs';
import { politicalTranslationsCs } from './roadmap-questions-political.cs';
import { economicTranslationsCs } from './roadmap-questions-economic.cs';
import { cartographyTranslationsCs } from './roadmap-questions-cartography.cs';
import { earthTranslationsCs } from './roadmap-questions-earth.cs';
import { geomorphologyTranslationsCs } from './roadmap-questions-geomorphology.cs';
import { oceanographyTranslationsCs } from './roadmap-questions-oceanography.cs';
import { biogeographyTranslationsCs } from './roadmap-questions-biogeography.cs';
import { geopoliticsTranslationsCs } from './roadmap-questions-geopolitics.cs';
import { gisTranslationsCs } from './roadmap-questions-gis.cs';

export const geographyTranslationsCs: Record<string, QuestionTranslation> = {
  ...continentsTranslationsCs,
  ...capitalsTranslationsCs,
  ...flagsTranslationsCs,
  ...landformsTranslationsCs,
  ...climateTranslationsCs,
  ...populationTranslationsCs,
  ...politicalTranslationsCs,
  ...economicTranslationsCs,
  ...cartographyTranslationsCs,
  ...earthTranslationsCs,
  ...geomorphologyTranslationsCs,
  ...oceanographyTranslationsCs,
  ...biogeographyTranslationsCs,
  ...geopoliticsTranslationsCs,
  ...gisTranslationsCs,
};
