class UserStats {
  final String authId;
  final String? email;
  final String? name;
  final String? picture;
  final int totalQuizzes;
  final int totalCorrect;
  final int totalQuestions;
  final int currentStreak;
  final int longestStreak;
  final String? lastQuizDate;

  UserStats({
    required this.authId,
    required this.email,
    required this.name,
    required this.picture,
    required this.totalQuizzes,
    required this.totalCorrect,
    required this.totalQuestions,
    required this.currentStreak,
    required this.longestStreak,
    required this.lastQuizDate,
  });

  factory UserStats.fromJson(Map<String, dynamic> j) => UserStats(
        authId: j['auth0_id'] as String,
        email: j['email'] as String?,
        name: j['name'] as String?,
        picture: j['picture'] as String?,
        totalQuizzes: (j['total_quizzes'] as num?)?.toInt() ?? 0,
        totalCorrect: (j['total_correct'] as num?)?.toInt() ?? 0,
        totalQuestions: (j['total_questions'] as num?)?.toInt() ?? 0,
        currentStreak: (j['current_streak'] as num?)?.toInt() ?? 0,
        longestStreak: (j['longest_streak'] as num?)?.toInt() ?? 0,
        lastQuizDate: j['last_quiz_date'] as String?,
      );

  int get accuracyPct =>
      totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).round() : 0;
}
