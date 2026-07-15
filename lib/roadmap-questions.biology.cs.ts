// Czech translations for every Human Biology question, merged by id.
import type { QuestionTranslation } from './quiz-data';
import { cellBiologyTranslationsCs } from './roadmap-questions-cell-biology.cs';
import { skeletalSystemTranslationsCs } from './roadmap-questions-skeletal-system.cs';
import { muscularSystemTranslationsCs } from './roadmap-questions-muscular-system.cs';
import { nervousSystemTranslationsCs } from './roadmap-questions-nervous-system.cs';
import { endocrineSystemTranslationsCs } from './roadmap-questions-endocrine-system.cs';
import { cardiovascularSystemTranslationsCs } from './roadmap-questions-cardiovascular-system.cs';
import { respiratorySystemTranslationsCs } from './roadmap-questions-respiratory-system.cs';
import { digestiveSystemTranslationsCs } from './roadmap-questions-digestive-system.cs';
import { immuneSystemTranslationsCs } from './roadmap-questions-immune-system.cs';
import { reproductiveSystemTranslationsCs } from './roadmap-questions-reproductive-system.cs';

export const biologyTranslationsCs: Record<string, QuestionTranslation> = {
  ...cellBiologyTranslationsCs,
  ...skeletalSystemTranslationsCs,
  ...muscularSystemTranslationsCs,
  ...nervousSystemTranslationsCs,
  ...endocrineSystemTranslationsCs,
  ...cardiovascularSystemTranslationsCs,
  ...respiratorySystemTranslationsCs,
  ...digestiveSystemTranslationsCs,
  ...immuneSystemTranslationsCs,
  ...reproductiveSystemTranslationsCs,
};
