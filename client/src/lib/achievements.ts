import type { UserStats } from './supabase';

export interface Achievement {
  id: string;
  label: string;
  description: string;
  emoji: string;
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
  emoji: string;
  check: (ctx: AchievementContext) => boolean;
}> = [
  {
    id: 'first-quiz',
    label: 'First steps',
    description: 'Complete your first quiz',
    emoji: '🎯',
    check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 1,
  },
  {
    id: 'ten-quizzes',
    label: 'Getting serious',
    description: 'Complete 10 quizzes',
    emoji: '🚀',
    check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 10,
  },
  {
    id: 'fifty-quizzes',
    label: 'Veteran',
    description: 'Complete 50 quizzes',
    emoji: '🏆',
    check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 50,
  },
  {
    id: 'streak-3',
    label: 'On a roll',
    description: 'Maintain a 3-day streak',
    emoji: '🔥',
    check: ({ stats }) => (stats?.longest_streak ?? 0) >= 3,
  },
  {
    id: 'streak-7',
    label: 'Week warrior',
    description: 'Maintain a 7-day streak',
    emoji: '⚡',
    check: ({ stats }) => (stats?.longest_streak ?? 0) >= 7,
  },
  {
    id: 'streak-30',
    label: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    emoji: '💎',
    check: ({ stats }) => (stats?.longest_streak ?? 0) >= 30,
  },
  {
    id: 'avg-70',
    label: 'Sharp',
    description: 'Reach 70% lifetime accuracy',
    emoji: '🎓',
    check: ({ stats }) => {
      if (!stats || stats.total_questions < 20) return false;
      return stats.total_correct / stats.total_questions >= 0.7;
    },
  },
  {
    id: 'avg-90',
    label: 'Encyclopedic',
    description: 'Reach 90% lifetime accuracy (100+ questions)',
    emoji: '🧠',
    check: ({ stats }) => {
      if (!stats || stats.total_questions < 100) return false;
      return stats.total_correct / stats.total_questions >= 0.9;
    },
  },
  {
    id: 'perfect',
    label: 'Flawless',
    description: 'Score 100% on a quiz',
    emoji: '💯',
    check: ({ perfectQuizzes }) => perfectQuizzes >= 1,
  },
  {
    id: 'bookmarker',
    label: 'Curator',
    description: 'Bookmark 5 questions',
    emoji: '🔖',
    check: ({ bookmarkCount }) => bookmarkCount >= 5,
  },
];

export function computeAchievements(ctx: AchievementContext): Achievement[] {
  return rules.map(({ check, ...rest }) => ({ ...rest, earned: check(ctx) }));
}

const PERFECT_KEY = 'devquiz:perfect-quiz-count';

export function recordPerfectQuiz() {
  try {
    const n = parseInt(localStorage.getItem(PERFECT_KEY) || '0', 10) + 1;
    localStorage.setItem(PERFECT_KEY, String(n));
  } catch {
    // ignore
  }
}

export function readPerfectQuizCount(): number {
  try {
    return parseInt(localStorage.getItem(PERFECT_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}
