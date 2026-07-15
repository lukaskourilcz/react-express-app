// Czech translations for every Math question, merged by id.
import type { QuestionTranslation } from './quiz-data';
import { arithmeticTranslationsCs } from './roadmap-questions-arithmetic.cs';
import { fractionsTranslationsCs } from './roadmap-questions-fractions.cs';
import { preAlgebraTranslationsCs } from './roadmap-questions-prealgebra.cs';
import { algebraTranslationsCs } from './roadmap-questions-algebra.cs';
import { geometryTranslationsCs } from './roadmap-questions-geometry.cs';
import { trigonometryTranslationsCs } from './roadmap-questions-trigonometry.cs';
import { statisticsTranslationsCs } from './roadmap-questions-statistics.cs';
import { preCalculusTranslationsCs } from './roadmap-questions-precalculus.cs';
import { calculusTranslationsCs } from './roadmap-questions-calculus.cs';
import { linearAlgebraTranslationsCs } from './roadmap-questions-linear-algebra.cs';
import { discreteMathTranslationsCs } from './roadmap-questions-discrete-math.cs';
import { numberTheoryTranslationsCs } from './roadmap-questions-number-theory.cs';
import { multivariableCalculusTranslationsCs } from './roadmap-questions-multivariable-calculus.cs';
import { differentialEquationsTranslationsCs } from './roadmap-questions-differential-equations.cs';
import { realAnalysisTranslationsCs } from './roadmap-questions-real-analysis.cs';

export const mathTranslationsCs: Record<string, QuestionTranslation> = {
  ...arithmeticTranslationsCs,
  ...fractionsTranslationsCs,
  ...preAlgebraTranslationsCs,
  ...algebraTranslationsCs,
  ...geometryTranslationsCs,
  ...trigonometryTranslationsCs,
  ...statisticsTranslationsCs,
  ...preCalculusTranslationsCs,
  ...calculusTranslationsCs,
  ...linearAlgebraTranslationsCs,
  ...discreteMathTranslationsCs,
  ...numberTheoryTranslationsCs,
  ...multivariableCalculusTranslationsCs,
  ...differentialEquationsTranslationsCs,
  ...realAnalysisTranslationsCs,
};
