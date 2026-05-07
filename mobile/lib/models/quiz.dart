class Question {
  final String id;
  final String question;
  final List<String> options;
  final String category;
  final int difficulty;
  final List<String> tags;
  final String? introduction;

  Question({
    required this.id,
    required this.question,
    required this.options,
    required this.category,
    required this.difficulty,
    required this.tags,
    this.introduction,
  });

  factory Question.fromJson(Map<String, dynamic> j) => Question(
        id: j['id'] as String,
        question: j['question'] as String,
        options: (j['options'] as List).cast<String>(),
        category: j['category'] as String,
        difficulty: (j['difficulty'] as num).toInt(),
        tags: ((j['tags'] as List?) ?? const <dynamic>[]).cast<String>(),
        introduction: j['introduction'] as String?,
      );
}

class QuizSession {
  final String sessionId;
  final List<Question> questions;
  QuizSession({required this.sessionId, required this.questions});

  factory QuizSession.fromJson(Map<String, dynamic> j) => QuizSession(
        sessionId: j['sessionId'] as String,
        questions: (j['questions'] as List)
            .map((q) => Question.fromJson(q as Map<String, dynamic>))
            .toList(),
      );
}

class QuestionResult {
  final String questionId;
  final int selectedIndex;
  final int correctAnswer;
  final bool isCorrect;
  final String explanation;

  QuestionResult({
    required this.questionId,
    required this.selectedIndex,
    required this.correctAnswer,
    required this.isCorrect,
    required this.explanation,
  });

  factory QuestionResult.fromJson(Map<String, dynamic> j) => QuestionResult(
        questionId: j['questionId'] as String,
        selectedIndex: (j['selectedIndex'] as num).toInt(),
        correctAnswer: (j['correctAnswer'] as num).toInt(),
        isCorrect: j['isCorrect'] as bool,
        explanation: (j['explanation'] as String?) ?? '',
      );
}

class QuizResult {
  final int totalQuestions;
  final int correctAnswers;
  final int percentage;
  final List<QuestionResult> results;

  QuizResult({
    required this.totalQuestions,
    required this.correctAnswers,
    required this.percentage,
    required this.results,
  });

  factory QuizResult.fromJson(Map<String, dynamic> j) => QuizResult(
        totalQuestions: (j['totalQuestions'] as num).toInt(),
        correctAnswers: (j['correctAnswers'] as num).toInt(),
        percentage: (j['percentage'] as num).toInt(),
        results: (j['results'] as List)
            .map((r) => QuestionResult.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
}

const allCategories = <String>[
  'html',
  'css',
  'javascript',
  'typescript',
  'react',
  'nodejs',
  'git',
  'dev-world',
  'custom',
  'code-snippets',
];

const categoryLabels = <String, String>{
  'html': 'HTML',
  'css': 'CSS',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'react': 'React',
  'nodejs': 'Node.js',
  'git': 'Git',
  'dev-world': 'Dev World',
  'custom': 'Custom',
  'code-snippets': 'Code Snippets',
};

const categoryColorsHex = <String, int>{
  'html': 0xFFE34C26,
  'css': 0xFF264DE4,
  'javascript': 0xFFF7DF1E,
  'typescript': 0xFF3178C6,
  'react': 0xFF61DAFB,
  'nodejs': 0xFF339933,
  'git': 0xFFF05032,
  'dev-world': 0xFF8B5CF6,
  'custom': 0xFF06B6D4,
  'code-snippets': 0xFFEC4899,
};

const difficultyModes = <Map<String, String>>[
  {'value': 'basics', 'label': 'Basics', 'tooltip': 'Definitions and basic terms.'},
  {'value': 'easy', 'label': 'Easy', 'tooltip': 'Difficulty 1-2.'},
  {'value': 'zero-to-hero', 'label': 'Zero to Hero', 'tooltip': 'Progressive 1 → 5.'},
  {'value': 'advanced', 'label': 'Advanced', 'tooltip': 'Difficulty 3-5.'},
  {'value': 'mixed', 'label': 'Mixed', 'tooltip': 'Random mix.'},
];
