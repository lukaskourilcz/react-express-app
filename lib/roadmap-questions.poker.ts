// Builds the Poker roadmap question banks from each topic's seed list.
import { buildRoadmap } from './roadmap-build';
import { positionsSeeds } from './roadmap-questions-positions';
import { startingHandsSeeds } from './roadmap-questions-starting-hands';
import { potOddsSeeds } from './roadmap-questions-pot-odds';
import { bettingStrategySeeds } from './roadmap-questions-betting-strategy';
import { postflopSeeds } from './roadmap-questions-postflop';
import { tournamentPlaySeeds } from './roadmap-questions-tournament-play';
import { psychologySeeds } from './roadmap-questions-psychology';
import { gtoAdvancedSeeds } from './roadmap-questions-gto-advanced';

export const roadmapPositionsQuestions = buildRoadmap('rm-pkpos', 'positions', positionsSeeds);
export const roadmapStartingHandsQuestions = buildRoadmap('rm-pkstart', 'starting-hands', startingHandsSeeds);
export const roadmapPotOddsQuestions = buildRoadmap('rm-pkodds', 'pot-odds', potOddsSeeds);
export const roadmapBettingStrategyQuestions = buildRoadmap('rm-pkbet', 'betting-strategy', bettingStrategySeeds);
export const roadmapPostflopQuestions = buildRoadmap('rm-pkpost', 'postflop', postflopSeeds);
export const roadmapTournamentPlayQuestions = buildRoadmap('rm-pktourn', 'tournament-play', tournamentPlaySeeds);
export const roadmapPsychologyQuestions = buildRoadmap('rm-pkpsych', 'psychology', psychologySeeds);
export const roadmapGtoAdvancedQuestions = buildRoadmap('rm-pkgto', 'gto-advanced', gtoAdvancedSeeds);

export const allRoadmapPokerQuestions = [
  ...roadmapPositionsQuestions,
  ...roadmapStartingHandsQuestions,
  ...roadmapPotOddsQuestions,
  ...roadmapBettingStrategyQuestions,
  ...roadmapPostflopQuestions,
  ...roadmapTournamentPlayQuestions,
  ...roadmapPsychologyQuestions,
  ...roadmapGtoAdvancedQuestions,
];
