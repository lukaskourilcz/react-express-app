class MatchQuestion {
  final String id;
  final String question;
  final List<String> options;
  final int? correctIndex; // host only / after finish
  final String? explanation;
  final String category;
  final int difficulty;

  MatchQuestion({
    required this.id,
    required this.question,
    required this.options,
    this.correctIndex,
    this.explanation,
    required this.category,
    required this.difficulty,
  });

  factory MatchQuestion.fromJson(Map<String, dynamic> j) => MatchQuestion(
        id: j['id'] as String,
        question: j['question'] as String,
        options: (j['options'] as List).cast<String>(),
        correctIndex: (j['correct_index'] as num?)?.toInt(),
        explanation: j['explanation'] as String?,
        category: j['category'] as String,
        difficulty: (j['difficulty'] as num).toInt(),
      );
}

enum MatchStatus { lobby, running, finished }

class Match {
  final String id;
  final String code;
  final String mode; // multiplayer | classroom
  final String hostSub;
  final String hostName;
  final MatchStatus status;
  final int currentIndex;
  final List<MatchQuestion> questions;
  final DateTime? questionStartedAt;
  final int questionDurationS;

  Match({
    required this.id,
    required this.code,
    required this.mode,
    required this.hostSub,
    required this.hostName,
    required this.status,
    required this.currentIndex,
    required this.questions,
    this.questionStartedAt,
    this.questionDurationS = 30,
  });

  factory Match.fromJson(Map<String, dynamic> j) => Match(
        id: j['id'] as String,
        code: j['code'] as String,
        mode: j['mode'] as String? ?? 'multiplayer',
        hostSub: j['host_sub'] as String? ?? '',
        hostName: j['host_name'] as String? ?? 'Host',
        status: _statusFrom(j['status'] as String?),
        currentIndex: (j['current_index'] as num?)?.toInt() ?? 0,
        questions: ((j['questions'] as List?) ?? const [])
            .map((q) => MatchQuestion.fromJson(q as Map<String, dynamic>))
            .toList(),
        questionStartedAt: j['question_started_at'] is String
            ? DateTime.tryParse(j['question_started_at'] as String)
            : null,
        questionDurationS: (j['question_duration_s'] as num?)?.toInt() ?? 30,
      );

  static MatchStatus _statusFrom(String? s) {
    switch (s) {
      case 'running':
        return MatchStatus.running;
      case 'finished':
        return MatchStatus.finished;
      default:
        return MatchStatus.lobby;
    }
  }
}

class Participant {
  final String authSub;
  final String displayName;
  final DateTime? joinedAt;

  Participant({required this.authSub, required this.displayName, this.joinedAt});

  factory Participant.fromJson(Map<String, dynamic> j) => Participant(
        authSub: j['auth0_sub'] as String,
        displayName: j['display_name'] as String? ?? 'Player',
        joinedAt: j['joined_at'] is String ? DateTime.tryParse(j['joined_at'] as String) : null,
      );
}

class ScoreboardEntry {
  final String authSub;
  final String displayName;
  final int correct;
  final int score;
  final int totalMs;

  ScoreboardEntry({
    required this.authSub,
    required this.displayName,
    required this.correct,
    required this.score,
    required this.totalMs,
  });

  factory ScoreboardEntry.fromJson(Map<String, dynamic> j) => ScoreboardEntry(
        authSub: j['auth0_sub'] as String,
        displayName: j['display_name'] as String? ?? 'Player',
        correct: (j['correct'] as num?)?.toInt() ?? 0,
        score: (j['score'] as num?)?.toInt() ?? (j['correct'] as num?)?.toInt() ?? 0,
        totalMs: (j['total_ms'] as num?)?.toInt() ?? 0,
      );
}

class DistributionBucket {
  final int selectedIdx;
  final int count;
  final bool correct;

  DistributionBucket({required this.selectedIdx, required this.count, required this.correct});

  factory DistributionBucket.fromJson(Map<String, dynamic> j) => DistributionBucket(
        selectedIdx: (j['selected_idx'] as num).toInt(),
        count: (j['count'] as num).toInt(),
        correct: j['correct'] as bool? ?? false,
      );
}

class MatchState {
  final Match match;
  final List<Participant> participants;
  final List<ScoreboardEntry> scoreboard;

  MatchState({required this.match, required this.participants, required this.scoreboard});
}
