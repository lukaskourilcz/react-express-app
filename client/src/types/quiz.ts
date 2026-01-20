export interface Question {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  category: 'react' | 'typescript' | 'git' | 'javascript';
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export type DifficultyMode = 'easy' | 'advanced' | 'zero-to-hero';

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
