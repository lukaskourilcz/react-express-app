class GlobalLeaderboardEntry {
  final String displayName;
  final String? picture;
  final int totalCorrect;
  final int totalQuizzes;
  final int longestStreak;

  GlobalLeaderboardEntry({
    required this.displayName,
    required this.picture,
    required this.totalCorrect,
    required this.totalQuizzes,
    required this.longestStreak,
  });

  factory GlobalLeaderboardEntry.fromJson(Map<String, dynamic> j) => GlobalLeaderboardEntry(
        displayName: j['display_name'] as String? ?? 'Anonymous',
        picture: j['picture'] as String?,
        totalCorrect: (j['total_correct'] as num?)?.toInt() ?? 0,
        totalQuizzes: (j['total_quizzes'] as num?)?.toInt() ?? 0,
        longestStreak: (j['longest_streak'] as num?)?.toInt() ?? 0,
      );
}

class CategoryLeaderboardEntry {
  final String displayName;
  final String? picture;
  final int totalCorrect;
  final int totalQuestions;
  final int accuracyPct;

  CategoryLeaderboardEntry({
    required this.displayName,
    required this.picture,
    required this.totalCorrect,
    required this.totalQuestions,
    required this.accuracyPct,
  });

  factory CategoryLeaderboardEntry.fromJson(Map<String, dynamic> j) => CategoryLeaderboardEntry(
        displayName: j['display_name'] as String? ?? 'Anonymous',
        picture: j['picture'] as String?,
        totalCorrect: (j['total_correct'] as num?)?.toInt() ?? 0,
        totalQuestions: (j['total_questions'] as num?)?.toInt() ?? 0,
        accuracyPct: (j['accuracy_pct'] as num?)?.toInt() ?? 0,
      );
}

class DailyLeaderboardEntry {
  final String displayName;
  final String? picture;
  final int correct;
  final int total;
  final int durationMs;

  DailyLeaderboardEntry({
    required this.displayName,
    required this.picture,
    required this.correct,
    required this.total,
    required this.durationMs,
  });

  factory DailyLeaderboardEntry.fromJson(Map<String, dynamic> j) => DailyLeaderboardEntry(
        displayName: j['display_name'] as String? ?? 'Anonymous',
        picture: j['picture'] as String?,
        correct: (j['correct'] as num?)?.toInt() ?? 0,
        total: (j['total'] as num?)?.toInt() ?? 0,
        durationMs: (j['duration_ms'] as num?)?.toInt() ?? 0,
      );
}
