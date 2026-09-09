import type { PlayableCodingTask } from '../../../shared/coding-catalog';
import type { PublicItemReview } from '../../../shared/curation';
export type CategoryType = 'react' | 'typescript' | 'git' | 'javascript' | 'nodejs' | 'nextjs' | 'html' | 'css' | 'dsa' | 'algorithms' | 'abbreviations' | 'general' | 'ai' | 'cool-stuff' | 'databases' | 'system-design' | 'testing' | 'devops' | 'security' | 'dev-world' | 'code-snippets' | 'continents' | 'capitals' | 'flags' | 'landforms' | 'climate' | 'population' | 'political' | 'economic' | 'cartography' | 'earth' | 'arithmetic' | 'fractions' | 'prealgebra' | 'algebra' | 'geometry' | 'trigonometry' | 'statistics' | 'precalculus' | 'calculus' | 'linear-algebra' | 'prehistory' | 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'earlymodern' | 'industrial' | 'worldwars' | 'coldwar' | 'modern' | 'openings' | 'tactics' | 'strategy' | 'endgames' | 'combinations' | 'discrete-math' | 'number-theory' | 'multivariable-calculus' | 'differential-equations' | 'real-analysis' | 'geomorphology' | 'oceanography' | 'biogeography' | 'geopolitics' | 'gis' | 'historiography' | 'history-of-science' | 'economic-history' | 'intellectual-history' | 'military-history' | 'cell-biology' | 'skeletal-system' | 'muscular-system' | 'nervous-system' | 'endocrine-system' | 'cardiovascular-system' | 'respiratory-system' | 'digestive-system' | 'immune-system' | 'reproductive-system' | 'opening-theory' | 'middlegame' | 'pawn-structures' | 'endgame-technique' | 'chess-history' | 'positions' | 'starting-hands' | 'pot-odds' | 'betting-strategy' | 'postflop' | 'tournament-play' | 'psychology' | 'gto-advanced';

export interface Question {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  category: CategoryType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** The version of this exact wording, and whatever review is recorded for
   * it. Absent when the server could not resolve it, which is a reason to say
   * nothing about review rather than to assume the friendly answer. */
  review?: PublicItemReview;
}

export type DifficultyMode = 'basics' | 'easy' | 'zero-to-hero' | 'advanced' | 'mixed';

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  questXp: number;
  /** Questions retired between the session being issued and the answers
   * arriving. Graded as void — neither for nor against — and left out of the
   * total, so the result screen says why the count is short. */
  voided?: string[];
  resultReceipt?: string;
  results: {
    questionId: string;
    selectedIndex: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
    scoreProof?: string;
    answerProof?: string;
  }[];
}

export type QuizState = 'loading' | 'ready' | 'in-progress' | 'submitted' | 'error';

/* ──── Roadmap ("Learn") mode ──────────────────────────────────────────── */

export type RoadmapTopic =
  | 'javascript' | 'typescript' | 'react' | 'nextjs' | 'nodejs'
  | 'html' | 'css' | 'git' | 'dsa' | 'algorithms'
  | 'abbreviations' | 'general' | 'ai' | 'cool-stuff'
  | 'databases' | 'system-design' | 'testing' | 'devops' | 'security'
  // Geography
  | 'continents' | 'capitals' | 'flags' | 'landforms' | 'climate' | 'population' | 'political' | 'economic' | 'cartography' | 'earth'
  // Math
  | 'arithmetic' | 'fractions' | 'prealgebra' | 'algebra' | 'geometry' | 'trigonometry' | 'statistics' | 'precalculus' | 'calculus' | 'linear-algebra'
  // History
  | 'prehistory' | 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'earlymodern' | 'industrial' | 'worldwars' | 'coldwar' | 'modern'
  // Chess
  | 'openings' | 'tactics' | 'strategy' | 'endgames' | 'combinations' | 'discrete-math' | 'number-theory' | 'multivariable-calculus' | 'differential-equations' | 'real-analysis' | 'geomorphology' | 'oceanography' | 'biogeography' | 'geopolitics' | 'gis' | 'historiography' | 'history-of-science' | 'economic-history' | 'intellectual-history' | 'military-history' | 'cell-biology' | 'skeletal-system' | 'muscular-system' | 'nervous-system' | 'endocrine-system' | 'cardiovascular-system' | 'respiratory-system' | 'digestive-system' | 'immune-system' | 'reproductive-system' | 'opening-theory' | 'middlegame' | 'pawn-structures' | 'endgame-technique' | 'chess-history' | 'positions' | 'starting-hands' | 'pot-odds' | 'betting-strategy' | 'postflop' | 'tournament-play' | 'psychology' | 'gto-advanced';

export interface RoadmapLevelMeta {
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
  /** devShark code topics only: how many coding tasks close this level. */
  codingTasks?: number;
  /** Too few reviewed questions to open. Stays on the map with its number;
   * never a prerequisite, and the rules step over it. */
  unavailable?: true;
}

export interface RoadmapCheckpointMeta {
  checkpoint: number;
  title: string;
  /** The level this checkpoint sits after (5, 10, 15, 20, 25). */
  afterLevel: number;
  questionCount: number;
  passPct: number;
}

export interface RoadmapTopicStructure {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
  /** Part tests with no available level to examine. */
  unavailableParts?: number[];
}

export interface RoadmapStructure {
  topics: RoadmapTopic[];
  structure: Record<RoadmapTopic, RoadmapTopicStructure>;
}

// A playable roadmap question. Correct answers stay server-side until this
// specific question has been submitted.
export interface RoadmapQuestion {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  category: CategoryType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** The version of this exact wording, with whatever review is recorded for
   * it. Absent means say nothing about review, not assume the best case. */
  review?: PublicItemReview;
}

// A playable lesson (a level) or exam (a checkpoint). `ref` is the level or
// checkpoint number; `passPct` is the score needed to clear it.
export interface RoadmapPlayable {
  kind: 'level' | 'checkpoint';
  topic: RoadmapTopic;
  ref: number;
  title: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  passPct: number;
  sessionId: string;
  questions: RoadmapQuestion[];
  /** devShark code topics: the level's coding tasks, each with its own sealed session. */
  coding?: { task: PlayableCodingTask; session: string }[];
}

export interface RoadmapAnswerResult {
  selectedIndex: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

export interface RoadmapCompletionResult {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  applied: boolean;
  /** Coding task ids the level still needs before it passes. */
  codingPending?: string[];
  /** The attempt was closed without a verdict because a question in it was
   * retired while it was open. Nothing was recorded; the level can be opened
   * again with its current questions. */
  invalidated?: { reason: 'content_retired'; questionIds: string[] };
  progress?: Partial<Record<RoadmapTopic, {
    levels: Record<string, { passed: boolean; bestPct: number }>;
    checkpoints: Record<string, { passed: boolean; bestPct: number }>;
  }>>;
}
