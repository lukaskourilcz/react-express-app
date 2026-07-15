// Builds the final roadmap ("Learn") question banks for ChessShark's 10 chess
// topics. Each topic file supplies a single 8-per-level `Seed[]` (10 levels = 80
// questions, easiest → hardest); `buildRoadmap` expands each into full Question
// objects with deterministic ids (`rm-<prefix>-<n>`) and a level-derived
// difficulty. `allRoadmapQuestions` is the concatenation used by quiz-data.ts.

import { buildRoadmap } from './roadmap-build';
import { rulesSeeds } from './roadmap-questions-rules';
import { piecesSeeds } from './roadmap-questions-pieces';
import { specialMovesSeeds } from './roadmap-questions-specialmoves';
import { checkmateSeeds } from './roadmap-questions-checkmate';
import { notationSeeds } from './roadmap-questions-notation';
import { openingsSeeds } from './roadmap-questions-openings';
import { tacticsSeeds } from './roadmap-questions-tactics';
import { strategySeeds } from './roadmap-questions-strategy';
import { endgamesSeeds } from './roadmap-questions-endgames';
import { combinationsSeeds } from './roadmap-questions-combinations';
import { openingTheorySeeds } from './roadmap-questions-opening-theory';
import { middlegameSeeds } from './roadmap-questions-middlegame';
import { pawnStructuresSeeds } from './roadmap-questions-pawn-structures';
import { endgameTechniqueSeeds } from './roadmap-questions-endgame-technique';
import { chessHistorySeeds } from './roadmap-questions-chess-history';

export const roadmapRulesQuestions = buildRoadmap('rm-rules', 'rules', rulesSeeds);
export const roadmapPiecesQuestions = buildRoadmap('rm-piece', 'pieces', piecesSeeds);
export const roadmapSpecialMovesQuestions = buildRoadmap('rm-spec', 'specialmoves', specialMovesSeeds);
export const roadmapCheckmateQuestions = buildRoadmap('rm-mate', 'checkmate', checkmateSeeds);
export const roadmapNotationQuestions = buildRoadmap('rm-notat', 'notation', notationSeeds);
export const roadmapOpeningsQuestions = buildRoadmap('rm-open', 'openings', openingsSeeds);
export const roadmapTacticsQuestions = buildRoadmap('rm-tac', 'tactics', tacticsSeeds);
export const roadmapStrategyQuestions = buildRoadmap('rm-strat', 'strategy', strategySeeds);
export const roadmapEndgamesQuestions = buildRoadmap('rm-end', 'endgames', endgamesSeeds);
export const roadmapCombinationsQuestions = buildRoadmap('rm-combo', 'combinations', combinationsSeeds);
export const roadmapOpeningTheoryQuestions = buildRoadmap('rm-openthy', 'opening-theory', openingTheorySeeds);
export const roadmapMiddlegameQuestions = buildRoadmap('rm-middle', 'middlegame', middlegameSeeds);
export const roadmapPawnStructuresQuestions = buildRoadmap('rm-pawns', 'pawn-structures', pawnStructuresSeeds);
export const roadmapEndgameTechniqueQuestions = buildRoadmap('rm-endgtech', 'endgame-technique', endgameTechniqueSeeds);
export const roadmapChessHistoryQuestions = buildRoadmap('rm-chesshist', 'chess-history', chessHistorySeeds);

// The full roadmap bank across all 10 chess topics, in taxonomy order.
export const allRoadmapChessQuestions = [
  ...roadmapRulesQuestions,
  ...roadmapPiecesQuestions,
  ...roadmapSpecialMovesQuestions,
  ...roadmapCheckmateQuestions,
  ...roadmapNotationQuestions,
  ...roadmapOpeningsQuestions,
  ...roadmapTacticsQuestions,
  ...roadmapStrategyQuestions,
  ...roadmapEndgamesQuestions,
  ...roadmapCombinationsQuestions,
  ...roadmapOpeningTheoryQuestions,
  ...roadmapMiddlegameQuestions,
  ...roadmapPawnStructuresQuestions,
  ...roadmapEndgameTechniqueQuestions,
  ...roadmapChessHistoryQuestions,
];
