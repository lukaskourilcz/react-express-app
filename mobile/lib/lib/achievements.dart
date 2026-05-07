import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_stats.dart';

class Achievement {
  final String id;
  final String label;
  final String description;
  final String emoji;
  final bool earned;

  const Achievement({
    required this.id,
    required this.label,
    required this.description,
    required this.emoji,
    required this.earned,
  });
}

class AchievementContext {
  final UserStats? stats;
  final int bookmarkCount;
  final int perfectQuizzes;

  AchievementContext({
    required this.stats,
    required this.bookmarkCount,
    required this.perfectQuizzes,
  });
}

typedef _Rule = ({String id, String label, String description, String emoji, bool Function(AchievementContext) check});

final List<_Rule> _rules = [
  (
    id: 'first-quiz',
    label: 'First steps',
    description: 'Complete your first quiz',
    emoji: '🎯',
    check: (c) => (c.stats?.totalQuizzes ?? 0) >= 1,
  ),
  (
    id: 'ten-quizzes',
    label: 'Getting serious',
    description: 'Complete 10 quizzes',
    emoji: '🚀',
    check: (c) => (c.stats?.totalQuizzes ?? 0) >= 10,
  ),
  (
    id: 'fifty-quizzes',
    label: 'Veteran',
    description: 'Complete 50 quizzes',
    emoji: '🏆',
    check: (c) => (c.stats?.totalQuizzes ?? 0) >= 50,
  ),
  (
    id: 'streak-3',
    label: 'On a roll',
    description: 'Maintain a 3-day streak',
    emoji: '🔥',
    check: (c) => (c.stats?.longestStreak ?? 0) >= 3,
  ),
  (
    id: 'streak-7',
    label: 'Week warrior',
    description: 'Maintain a 7-day streak',
    emoji: '⚡',
    check: (c) => (c.stats?.longestStreak ?? 0) >= 7,
  ),
  (
    id: 'streak-30',
    label: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    emoji: '💎',
    check: (c) => (c.stats?.longestStreak ?? 0) >= 30,
  ),
  (
    id: 'avg-70',
    label: 'Sharp',
    description: '70% accuracy (20+ questions)',
    emoji: '🎓',
    check: (c) {
      final s = c.stats;
      if (s == null || s.totalQuestions < 20) return false;
      return s.totalCorrect / s.totalQuestions >= 0.7;
    },
  ),
  (
    id: 'avg-90',
    label: 'Encyclopedic',
    description: '90% accuracy (100+ questions)',
    emoji: '🧠',
    check: (c) {
      final s = c.stats;
      if (s == null || s.totalQuestions < 100) return false;
      return s.totalCorrect / s.totalQuestions >= 0.9;
    },
  ),
  (
    id: 'perfect',
    label: 'Flawless',
    description: 'Score 100% on a quiz',
    emoji: '💯',
    check: (c) => c.perfectQuizzes >= 1,
  ),
  (
    id: 'bookmarker',
    label: 'Curator',
    description: 'Bookmark 5 questions',
    emoji: '🔖',
    check: (c) => c.bookmarkCount >= 5,
  ),
];

List<Achievement> computeAchievements(AchievementContext ctx) {
  return _rules
      .map((r) => Achievement(
            id: r.id,
            label: r.label,
            description: r.description,
            emoji: r.emoji,
            earned: r.check(ctx),
          ))
      .toList();
}

const _perfectKey = 'devquiz:perfect-quiz-count';

Future<void> recordPerfectQuiz() async {
  final prefs = await SharedPreferences.getInstance();
  final n = (prefs.getInt(_perfectKey) ?? 0) + 1;
  await prefs.setInt(_perfectKey, n);
}

Future<int> readPerfectQuizCount() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getInt(_perfectKey) ?? 0;
}
