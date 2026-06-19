// Combines the two authored question sets (A + B) per topic into the final
// roadmap question banks. Each level is authored as 4 "A" + 4 "B" questions;
// we interleave them by level so the built ids (rm-<topic>-1 … 200) map 8 per
// level (see QUESTIONS_PER_LEVEL). This keeps the level ordering intact and
// gives each 5-level checkpoint a full 40-question pool.

import { buildRoadmap, HALF_LEVEL, type Seed } from './roadmap-build';
import { jsSeedsA } from './roadmap-questions-js';
import { jsSeedsB } from './roadmap-questions-js-b';
import { tsSeedsA } from './roadmap-questions-ts';
import { tsSeedsB } from './roadmap-questions-ts-b';
import { reactSeedsA } from './roadmap-questions-react';
import { reactSeedsB } from './roadmap-questions-react-b';
import { nextSeeds } from './roadmap-questions-next';
import { nodeSeeds } from './roadmap-questions-node';
import { gitSeeds } from './roadmap-questions-git';
import { htmlSeeds } from './roadmap-questions-html';
import { cssSeeds } from './roadmap-questions-css';
import { dsaSeeds } from './roadmap-questions-dsa';

// Interleave two equal-length seed lists in blocks of HALF_LEVEL, so each level
// ends up with its 4 A-questions followed by its 4 B-questions.
function interleaveByLevel(a: Seed[], b: Seed[]): Seed[] {
  const out: Seed[] = [];
  const levels = Math.max(a.length, b.length) / HALF_LEVEL;
  for (let l = 0; l < levels; l++) {
    const start = l * HALF_LEVEL;
    out.push(...a.slice(start, start + HALF_LEVEL), ...b.slice(start, start + HALF_LEVEL));
  }
  return out;
}

export const roadmapJsQuestions = buildRoadmap('rm-js', 'javascript', interleaveByLevel(jsSeedsA, jsSeedsB));
export const roadmapTsQuestions = buildRoadmap('rm-ts', 'typescript', interleaveByLevel(tsSeedsA, tsSeedsB));
export const roadmapReactQuestions = buildRoadmap('rm-react', 'react', interleaveByLevel(reactSeedsA, reactSeedsB));
// Next.js, Node.js, Git, HTML and CSS are each authored as a single 8-per-level
// list (Node runs 25 levels, the rest 15), so they build directly without
// interleaving.
export const roadmapNextQuestions = buildRoadmap('rm-next', 'nextjs', nextSeeds);
export const roadmapNodeQuestions = buildRoadmap('rm-node', 'nodejs', nodeSeeds);
export const roadmapGitQuestions = buildRoadmap('rm-git', 'git', gitSeeds);
export const roadmapHtmlQuestions = buildRoadmap('rm-html', 'html', htmlSeeds);
export const roadmapCssQuestions = buildRoadmap('rm-css', 'css', cssSeeds);
export const roadmapDsaQuestions = buildRoadmap('rm-dsa', 'dsa', dsaSeeds);
