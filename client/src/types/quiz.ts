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
