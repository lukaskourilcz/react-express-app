// Shared domain types for the DevQuiz mobile app. These mirror the shapes the
// Vercel API returns, so the same backend powers web and mobile unchanged.

export type CategoryType =
  | 'react'
  | 'typescript'
  | 'git'
  | 'javascript'
  | 'nodejs'
  | 'nextjs'
  | 'html'
  | 'css'
  | 'dsa'
  | 'algorithms'
  | 'abbreviations'
  | 'general'
  | 'internet'
  | 'ai'
  | 'rhf-zod'
  | 'cool-stuff'
  | 'databases'
  | 'system-design'
  | 'testing'
  | 'devops'
  | 'security'
  | 'dev-world'
  | 'code-snippets';

export type DifficultyMode = 'basics' | 'easy' | 'zero-to-hero' | 'advanced' | 'mixed';

// A question as returned by GET /api/quiz/questions — note there is no
// correctAnswer field; the server keeps the answer key until you submit.
export interface Question {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  category: CategoryType;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface QuizResultItem {
  questionId: string;
  selectedIndex: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  results: QuizResultItem[];
}

export interface LeaderboardGlobalEntry {
  display_name: string;
  picture: string | null;
  total_correct: number;
  total_quizzes: number;
  longest_streak: number;
  current_streak: number;
}
