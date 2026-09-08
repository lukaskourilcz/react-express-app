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
import { htmlCoreSeeds } from './roadmap-questions-html-core';
import { cssCoreSeeds } from './roadmap-questions-css-core';
import { dsaSeeds } from './roadmap-questions-dsa';
import { algorithmsSeeds } from './roadmap-questions-algorithms';
import { abbreviationsSeeds } from './roadmap-questions-abbreviations';
import { generalSeeds } from './roadmap-questions-general';
import { testingFoundationsSeeds } from './roadmap-questions-testing-foundations';
import { aiSeeds } from './roadmap-questions-ai';
import { coolStuffSeeds } from './roadmap-questions-cool-stuff';
import { databasesSeeds } from './roadmap-questions-databases';
import { systemDesignSeeds } from './roadmap-questions-system-design';
import { testingSeeds } from './roadmap-questions-testing';
import { devopsSeeds } from './roadmap-questions-devops';
import { securitySeeds } from './roadmap-questions-security';

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
// HTML and CSS were rescoped in #180: six levels each, aimed at what the
// browser actually decides rather than at tag recall and one library's
// vocabulary. The previous banks stay in the repository, unreferenced by any
// delivery path, until the item-level audit (#176) dispositions them.
export const roadmapHtmlQuestions = buildRoadmap('rm-html', 'html', htmlCoreSeeds);
export const roadmapCssQuestions = buildRoadmap('rm-css', 'css', cssCoreSeeds);
export const roadmapDsaQuestions = buildRoadmap('rm-dsa', 'dsa', dsaSeeds);
export const roadmapAlgorithmsQuestions = buildRoadmap('rm-algorithms', 'algorithms', algorithmsSeeds);
export const roadmapAbbreviationsQuestions = buildRoadmap('rm-abbr', 'abbreviations', abbreviationsSeeds);
// General runs fifteen levels of how-the-web-works plus the four Testing
// Foundations levels that replaced the standalone Testing path (#179). The
// order is the level order, so the testing material is levels 16-19.
export const roadmapGeneralQuestions = buildRoadmap('rm-general', 'general', [...generalSeeds, ...testingFoundationsSeeds]);
// AI & LLMs runs 20 levels (160 questions), authored as a single 8-per-level list.
export const roadmapAiQuestions = buildRoadmap('rm-ai', 'ai', aiSeeds);
// Cool Stuff (dev-world fun facts) runs 15 levels (120 questions).
export const roadmapCoolStuffQuestions = buildRoadmap('rm-cool', 'cool-stuff', coolStuffSeeds);
// "Beyond the basics" career topics, each 15 levels (120 questions), single
// 8-per-level lists built directly.
export const roadmapDatabasesQuestions = buildRoadmap('rm-db', 'databases', databasesSeeds);
export const roadmapSystemDesignQuestions = buildRoadmap('rm-sysdesign', 'system-design', systemDesignSeeds);
export const roadmapTestingQuestions = buildRoadmap('rm-testing', 'testing', testingSeeds);
export const roadmapDevopsQuestions = buildRoadmap('rm-devops', 'devops', devopsSeeds);
export const roadmapSecurityQuestions = buildRoadmap('rm-security', 'security', securitySeeds);
