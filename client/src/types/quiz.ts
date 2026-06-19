export type CategoryType = 'react' | 'typescript' | 'git' | 'javascript' | 'nodejs' | 'html' | 'css' | 'dev-world' | 'custom' | 'code-snippets' | 'apt';

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

export type RoadmapTopic = 'javascript' | 'typescript' | 'react';

export interface RoadmapLevelMeta {
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
}

export interface RoadmapStructure {
  topics: RoadmapTopic[];
  structure: Record<RoadmapTopic, RoadmapLevelMeta[]>;
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

export interface RoadmapLevel {
  topic: RoadmapTopic;
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questions: RoadmapQuestion[];
}
