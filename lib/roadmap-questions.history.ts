// Builds the final roadmap ("Learn") question banks for all ten world-history
// eras. Each era file supplies a compact `Seed[]` (10 levels × 8 questions,
// easiest → hardest) which buildRoadmap expands into full Question objects with
// deterministic ids (`rm-<prefix>-1 … 80`), a level-derived difficulty, and a
// default hint. `allRoadmapQuestions` is the concatenation of all ten eras.

import { buildRoadmap } from './roadmap-build';
import { prehistorySeeds } from './roadmap-questions-prehistory';
import { ancientSeeds } from './roadmap-questions-ancient';
import { classicalSeeds } from './roadmap-questions-classical';
import { medievalSeeds } from './roadmap-questions-medieval';
import { renaissanceSeeds } from './roadmap-questions-renaissance';
import { earlymodernSeeds } from './roadmap-questions-earlymodern';
import { industrialSeeds } from './roadmap-questions-industrial';
import { worldwarsSeeds } from './roadmap-questions-worldwars';
import { coldwarSeeds } from './roadmap-questions-coldwar';
import { modernSeeds } from './roadmap-questions-modern';

export const roadmapPrehistoryQuestions = buildRoadmap('rm-prehist', 'prehistory', prehistorySeeds);
export const roadmapAncientQuestions = buildRoadmap('rm-ancient', 'ancient', ancientSeeds);
export const roadmapClassicalQuestions = buildRoadmap('rm-classic', 'classical', classicalSeeds);
export const roadmapMedievalQuestions = buildRoadmap('rm-medieval', 'medieval', medievalSeeds);
export const roadmapRenaissanceQuestions = buildRoadmap('rm-renais', 'renaissance', renaissanceSeeds);
export const roadmapEarlyModernQuestions = buildRoadmap('rm-earlymod', 'earlymodern', earlymodernSeeds);
export const roadmapIndustrialQuestions = buildRoadmap('rm-indust', 'industrial', industrialSeeds);
export const roadmapWorldWarsQuestions = buildRoadmap('rm-wwars', 'worldwars', worldwarsSeeds);
export const roadmapColdWarQuestions = buildRoadmap('rm-coldwar', 'coldwar', coldwarSeeds);
export const roadmapModernQuestions = buildRoadmap('rm-modern', 'modern', modernSeeds);

// The full roadmap bank: all ten eras concatenated in chronological order.
export const allRoadmapHistoryQuestions = [
  ...roadmapPrehistoryQuestions,
  ...roadmapAncientQuestions,
  ...roadmapClassicalQuestions,
  ...roadmapMedievalQuestions,
  ...roadmapRenaissanceQuestions,
  ...roadmapEarlyModernQuestions,
  ...roadmapIndustrialQuestions,
  ...roadmapWorldWarsQuestions,
  ...roadmapColdWarQuestions,
  ...roadmapModernQuestions,
];
