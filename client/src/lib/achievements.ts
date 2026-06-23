import type { UserStats } from './supabase';
import { readJSON, writeJSON } from './storage';

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export interface AchievementContext {
  stats: UserStats | null;
  bookmarkCount: number;
  perfectQuizzes: number;
}

const rules: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}> = [
  {
    id: 'first-quiz',
    label: 'First steps',
    description: 'Complete your first quiz',
    check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 1,
  },
  {
    id: 'ten-quizzes',
    label: 'Getting serious',
    description: 'Complete 10 quizzes',
    check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 10,
  },
  {
    id: 'fifty-quizzes',
    label: 'Veteran',
    description: 'Complete 50 quizzes',
    check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 50,
  },
  {
    id: 'streak-3',
    label: 'On a roll',
    description: 'Maintain a 3-day streak',
    check: ({ stats }) => (stats?.longest_streak ?? 0) >= 3,
  },
  {
    id: 'streak-7',
    label: 'Week warrior',
    description: 'Maintain a 7-day streak',
    check: ({ stats }) => (stats?.longest_streak ?? 0) >= 7,
  },
  {
    id: 'streak-30',
    label: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    check: ({ stats }) => (stats?.longest_streak ?? 0) >= 30,
  },
  {
    id: 'avg-70',
    label: 'Sharp',
    description: 'Reach 70% lifetime accuracy',
    check: ({ stats }) => {
      if (!stats || stats.total_questions < 20) return false;
      return stats.total_correct / stats.total_questions >= 0.7;
    },
  },
  {
    id: 'avg-90',
    label: 'Encyclopedic',
    description: 'Reach 90% lifetime accuracy (100+ questions)',
    check: ({ stats }) => {
      if (!stats || stats.total_questions < 100) return false;
      return stats.total_correct / stats.total_questions >= 0.9;
    },
  },
  {
    id: 'perfect',
    label: 'Flawless',
    description: 'Score 100% on a quiz',
    check: ({ perfectQuizzes }) => perfectQuizzes >= 1,
  },
  {
    id: 'bookmarker',
    label: 'Curator',
    description: 'Bookmark 5 questions',
    check: ({ bookmarkCount }) => bookmarkCount >= 5,
  },
];

export function computeAchievements(ctx: AchievementContext): Achievement[] {
  return rules.map(({ check, ...rest }) => ({ ...rest, earned: check(ctx) }));
}

const PERFECT_KEY = 'devquiz:perfect-quiz-count';

export function recordPerfectQuiz() {
  writeJSON(PERFECT_KEY, readPerfectQuizCount() + 1);
}

export function readPerfectQuizCount(): number {
  const count = readJSON<number>(PERFECT_KEY, 0);
  return Number.isFinite(count) ? count : 0;
}
