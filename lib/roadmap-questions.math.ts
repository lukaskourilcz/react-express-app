// Builds the final roadmap ("Learn") question banks from each math topic's
// compact seed list. Every topic is authored as a single 8-per-level list
// (10 levels × 8 = 80 questions) and expanded by buildRoadmap into full
// Question objects with deterministic ids (rm-<topic>-1 … 80). See lib/roadmap.ts
// for the level titles and checkpoint structure that pair with these ids.

import { buildRoadmap } from './roadmap-build';
import { arithmeticSeeds } from './roadmap-questions-arithmetic';
import { fractionsSeeds } from './roadmap-questions-fractions';
import { preAlgebraSeeds } from './roadmap-questions-prealgebra';
import { algebraSeeds } from './roadmap-questions-algebra';
import { geometrySeeds } from './roadmap-questions-geometry';
import { trigonometrySeeds } from './roadmap-questions-trigonometry';
import { statisticsSeeds } from './roadmap-questions-statistics';
import { preCalculusSeeds } from './roadmap-questions-precalculus';
import { calculusSeeds } from './roadmap-questions-calculus';
import { linearAlgebraSeeds } from './roadmap-questions-linear-algebra';
import { discreteMathSeeds } from './roadmap-questions-discrete-math';
import { numberTheorySeeds } from './roadmap-questions-number-theory';
import { multivariableCalculusSeeds } from './roadmap-questions-multivariable-calculus';
import { differentialEquationsSeeds } from './roadmap-questions-differential-equations';
import { realAnalysisSeeds } from './roadmap-questions-real-analysis';

export const roadmapArithmeticQuestions = buildRoadmap('rm-arith', 'arithmetic', arithmeticSeeds);
export const roadmapFractionsQuestions = buildRoadmap('rm-frac', 'fractions', fractionsSeeds);
export const roadmapPreAlgebraQuestions = buildRoadmap('rm-prealg', 'prealgebra', preAlgebraSeeds);
export const roadmapAlgebraQuestions = buildRoadmap('rm-alg', 'algebra', algebraSeeds);
export const roadmapGeometryQuestions = buildRoadmap('rm-geo', 'geometry', geometrySeeds);
export const roadmapTrigonometryQuestions = buildRoadmap('rm-trig', 'trigonometry', trigonometrySeeds);
export const roadmapStatisticsQuestions = buildRoadmap('rm-stat', 'statistics', statisticsSeeds);
export const roadmapPreCalculusQuestions = buildRoadmap('rm-precalc', 'precalculus', preCalculusSeeds);
export const roadmapCalculusQuestions = buildRoadmap('rm-calc', 'calculus', calculusSeeds);
export const roadmapLinearAlgebraQuestions = buildRoadmap('rm-linalg', 'linear-algebra', linearAlgebraSeeds);
export const roadmapDiscreteMathQuestions = buildRoadmap('rm-discrete', 'discrete-math', discreteMathSeeds);
export const roadmapNumberTheoryQuestions = buildRoadmap('rm-numthy', 'number-theory', numberTheorySeeds);
export const roadmapMultivariableCalculusQuestions = buildRoadmap('rm-mvcalc', 'multivariable-calculus', multivariableCalculusSeeds);
export const roadmapDifferentialEquationsQuestions = buildRoadmap('rm-ode', 'differential-equations', differentialEquationsSeeds);
export const roadmapRealAnalysisQuestions = buildRoadmap('rm-analysis', 'real-analysis', realAnalysisSeeds);

// The full set, in canonical topic order — the solo quiz pool is composed from this.
export const allRoadmapMathQuestions = [
  ...roadmapArithmeticQuestions,
  ...roadmapFractionsQuestions,
  ...roadmapPreAlgebraQuestions,
  ...roadmapAlgebraQuestions,
  ...roadmapGeometryQuestions,
  ...roadmapTrigonometryQuestions,
  ...roadmapStatisticsQuestions,
  ...roadmapPreCalculusQuestions,
  ...roadmapCalculusQuestions,
  ...roadmapLinearAlgebraQuestions,
  ...roadmapDiscreteMathQuestions,
  ...roadmapNumberTheoryQuestions,
  ...roadmapMultivariableCalculusQuestions,
  ...roadmapDifferentialEquationsQuestions,
  ...roadmapRealAnalysisQuestions,
];
