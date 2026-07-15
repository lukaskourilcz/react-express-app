export type CategoryType = 'react' | 'typescript' | 'git' | 'javascript' | 'nodejs' | 'nextjs' | 'html' | 'css' | 'dsa' | 'algorithms' | 'abbreviations' | 'general' | 'internet' | 'ai' | 'rhf-zod' | 'cool-stuff' | 'databases' | 'system-design' | 'testing' | 'devops' | 'security' | 'dev-world' | 'code-snippets' | 'continents' | 'capitals' | 'flags' | 'landforms' | 'climate' | 'population' | 'political' | 'economic' | 'cartography' | 'earth' | 'arithmetic' | 'fractions' | 'prealgebra' | 'algebra' | 'geometry' | 'trigonometry' | 'statistics' | 'precalculus' | 'calculus' | 'linear-algebra' | 'prehistory' | 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'earlymodern' | 'industrial' | 'worldwars' | 'coldwar' | 'modern' | 'openings' | 'tactics' | 'strategy' | 'endgames' | 'combinations' | 'discrete-math' | 'number-theory' | 'multivariable-calculus' | 'differential-equations' | 'real-analysis' | 'geomorphology' | 'oceanography' | 'biogeography' | 'geopolitics' | 'gis' | 'historiography' | 'history-of-science' | 'economic-history' | 'intellectual-history' | 'military-history' | 'cell-biology' | 'skeletal-system' | 'muscular-system' | 'nervous-system' | 'endocrine-system' | 'cardiovascular-system' | 'respiratory-system' | 'digestive-system' | 'immune-system' | 'reproductive-system' | 'opening-theory' | 'middlegame' | 'pawn-structures' | 'endgame-technique' | 'chess-history' | 'positions' | 'starting-hands' | 'pot-odds' | 'betting-strategy' | 'postflop' | 'tournament-play' | 'psychology' | 'gto-advanced';

export interface Question {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  category: CategoryType;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export type DifficultyMode = 'basics' | 'easy' | 'zero-to-hero' | 'advanced' | 'mixed';

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  results: {
    questionId: string;
    selectedIndex: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export type QuizState = 'loading' | 'ready' | 'in-progress' | 'submitted' | 'error';

/* ──── Roadmap ("Learn") mode ──────────────────────────────────────────── */

export type RoadmapTopic =
  | 'javascript' | 'typescript' | 'react' | 'nextjs' | 'nodejs'
  | 'html' | 'css' | 'git' | 'dsa' | 'algorithms'
  | 'abbreviations' | 'general' | 'internet' | 'ai' | 'rhf-zod' | 'cool-stuff'
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
}

export interface RoadmapStructure {
  topics: RoadmapTopic[];
  structure: Record<RoadmapTopic, RoadmapTopicStructure>;
}

// A playable roadmap question. Unlike the competitive quiz, the learning path
// ships the correct answer + explanation so the client can grade instantly.
export interface RoadmapQuestion {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: CategoryType;
  difficulty: 1 | 2 | 3 | 4 | 5;
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
  questions: RoadmapQuestion[];
}
