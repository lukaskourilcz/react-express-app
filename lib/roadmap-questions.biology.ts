// Builds the Human Biology roadmap question banks from each topic's seed list.
import { buildRoadmap } from './roadmap-build';
import { cellBiologySeeds } from './roadmap-questions-cell-biology';
import { skeletalSystemSeeds } from './roadmap-questions-skeletal-system';
import { muscularSystemSeeds } from './roadmap-questions-muscular-system';
import { nervousSystemSeeds } from './roadmap-questions-nervous-system';
import { endocrineSystemSeeds } from './roadmap-questions-endocrine-system';
import { cardiovascularSystemSeeds } from './roadmap-questions-cardiovascular-system';
import { respiratorySystemSeeds } from './roadmap-questions-respiratory-system';
import { digestiveSystemSeeds } from './roadmap-questions-digestive-system';
import { immuneSystemSeeds } from './roadmap-questions-immune-system';
import { reproductiveSystemSeeds } from './roadmap-questions-reproductive-system';

export const roadmapCellBiologyQuestions = buildRoadmap('rm-cellbio', 'cell-biology', cellBiologySeeds);
export const roadmapSkeletalSystemQuestions = buildRoadmap('rm-skel', 'skeletal-system', skeletalSystemSeeds);
export const roadmapMuscularSystemQuestions = buildRoadmap('rm-musc', 'muscular-system', muscularSystemSeeds);
export const roadmapNervousSystemQuestions = buildRoadmap('rm-nervous', 'nervous-system', nervousSystemSeeds);
export const roadmapEndocrineSystemQuestions = buildRoadmap('rm-endo', 'endocrine-system', endocrineSystemSeeds);
export const roadmapCardiovascularSystemQuestions = buildRoadmap('rm-cardio', 'cardiovascular-system', cardiovascularSystemSeeds);
export const roadmapRespiratorySystemQuestions = buildRoadmap('rm-resp', 'respiratory-system', respiratorySystemSeeds);
export const roadmapDigestiveSystemQuestions = buildRoadmap('rm-digest', 'digestive-system', digestiveSystemSeeds);
export const roadmapImmuneSystemQuestions = buildRoadmap('rm-immune', 'immune-system', immuneSystemSeeds);
export const roadmapReproductiveSystemQuestions = buildRoadmap('rm-repro', 'reproductive-system', reproductiveSystemSeeds);

export const allRoadmapBiologyQuestions = [
  ...roadmapCellBiologyQuestions,
  ...roadmapSkeletalSystemQuestions,
  ...roadmapMuscularSystemQuestions,
  ...roadmapNervousSystemQuestions,
  ...roadmapEndocrineSystemQuestions,
  ...roadmapCardiovascularSystemQuestions,
  ...roadmapRespiratorySystemQuestions,
  ...roadmapDigestiveSystemQuestions,
  ...roadmapImmuneSystemQuestions,
  ...roadmapReproductiveSystemQuestions,
];
