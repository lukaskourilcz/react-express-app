// Builds the final roadmap ("Learn") question banks for GeoShark's ten geography
// topics. Each topic file supplies a compact `Seed[]` (80 seeds = 10 levels × 8,
// easiest → hardest); buildRoadmap expands them into full Question objects with
// deterministic ids (`rm-<prefix>-<n>`) and a level-derived difficulty. Every
// 5-level segment forms one checkpoint, so each topic has 2 checkpoints.

import { buildRoadmap } from './roadmap-build';
import { continentsSeeds } from './roadmap-questions-continents';
import { capitalsSeeds } from './roadmap-questions-capitals';
import { flagsSeeds } from './roadmap-questions-flags';
import { landformsSeeds } from './roadmap-questions-landforms';
import { climateSeeds } from './roadmap-questions-climate';
import { populationSeeds } from './roadmap-questions-population';
import { politicalSeeds } from './roadmap-questions-political';
import { economicSeeds } from './roadmap-questions-economic';
import { cartographySeeds } from './roadmap-questions-cartography';
import { earthSeeds } from './roadmap-questions-earth';

export const roadmapContinentsQuestions = buildRoadmap('rm-cont', 'continents', continentsSeeds);
export const roadmapCapitalsQuestions = buildRoadmap('rm-cap', 'capitals', capitalsSeeds);
export const roadmapFlagsQuestions = buildRoadmap('rm-flag', 'flags', flagsSeeds);
export const roadmapLandformsQuestions = buildRoadmap('rm-land', 'landforms', landformsSeeds);
export const roadmapClimateQuestions = buildRoadmap('rm-clim', 'climate', climateSeeds);
export const roadmapPopulationQuestions = buildRoadmap('rm-pop', 'population', populationSeeds);
export const roadmapPoliticalQuestions = buildRoadmap('rm-pol', 'political', politicalSeeds);
export const roadmapEconomicQuestions = buildRoadmap('rm-econ', 'economic', economicSeeds);
export const roadmapCartographyQuestions = buildRoadmap('rm-carto', 'cartography', cartographySeeds);
export const roadmapEarthQuestions = buildRoadmap('rm-earth', 'earth', earthSeeds);

// The full roadmap bank in topic order — consumed by lib/quiz-data.ts.
export const allRoadmapGeographyQuestions = [
  ...roadmapContinentsQuestions,
  ...roadmapCapitalsQuestions,
  ...roadmapFlagsQuestions,
  ...roadmapLandformsQuestions,
  ...roadmapClimateQuestions,
  ...roadmapPopulationQuestions,
  ...roadmapPoliticalQuestions,
  ...roadmapEconomicQuestions,
  ...roadmapCartographyQuestions,
  ...roadmapEarthQuestions,
];
