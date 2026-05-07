import '../models/quiz.dart';
import 'client.dart';

class QuizApi {
  QuizApi(this._client);
  final ApiClient _client;

  Future<QuizSession> fetchQuestions({
    required int count,
    required String difficulty,
    required List<String> categories,
  }) async {
    final json = await _client.get('/api/quiz/questions', query: {
      'count': '$count',
      'difficulty': difficulty,
      'categories': categories.join(','),
    });
    return QuizSession.fromJson(json);
  }

  Future<QuizResult> submit({
    required String sessionId,
    required Map<String, int> answers,
  }) async {
    final json = await _client.post('/api/quiz/submit', {
      'sessionId': sessionId,
      'answers': answers,
    });
    return QuizResult.fromJson(json);
  }

  Future<QuizSession> dailyChallenge() async {
    final json = await _client.get('/api/quiz/daily');
    return QuizSession.fromJson(json);
  }

  Future<void> reportQuestion({
    required String questionId,
    required String reason,
    String? detail,
    String? reporterSub,
  }) async {
    await _client.post('/api/quiz/report', {
      'question_id': questionId,
      'reason': reason,
      if (detail != null) 'detail': detail,
      if (reporterSub != null) 'reporter_sub': reporterSub,
    });
  }
}
