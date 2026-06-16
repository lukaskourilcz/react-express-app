import type { UserStats } from './supabase';

// Human-readable label and description live in the i18n dictionaries under
// `achievement.<id>.label` / `.description`; only the id, emoji and the earn
// rule are defined here.
export interface Achievement {
  id: string;
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
  emoji: string;
  check: (ctx: AchievementContext) => boolean;
}> = [
  { id: 'first-quiz', emoji: '🎯', check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 1 },
  { id: 'ten-quizzes', emoji: '🚀', check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 10 },
  { id: 'fifty-quizzes', emoji: '🏆', check: ({ stats }) => (stats?.total_quizzes ?? 0) >= 50 },
  { id: 'streak-3', emoji: '🔥', check: ({ stats }) => (stats?.longest_streak ?? 0) >= 3 },
  { id: 'streak-7', emoji: '⚡', check: ({ stats }) => (stats?.longest_streak ?? 0) >= 7 },
  { id: 'streak-30', emoji: '💎', check: ({ stats }) => (stats?.longest_streak ?? 0) >= 30 },
  {
    id: 'avg-70',
    emoji: '🎓',
    check: ({ stats }) =>
      !!stats && stats.total_questions >= 20 && stats.total_correct / stats.total_questions >= 0.7,
  },
  {
    id: 'avg-90',
    emoji: '🧠',
    check: ({ stats }) =>
      !!stats && stats.total_questions >= 100 && stats.total_correct / stats.total_questions >= 0.9,
  },
  { id: 'perfect', emoji: '💯', check: ({ perfectQuizzes }) => perfectQuizzes >= 1 },
  { id: 'bookmarker', emoji: '🔖', check: ({ bookmarkCount }) => bookmarkCount >= 5 },
];

export function computeAchievements(ctx: AchievementContext): Achievement[] {
  return rules.map(({ id, emoji, check }) => ({ id, emoji, earned: check(ctx) }));
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
