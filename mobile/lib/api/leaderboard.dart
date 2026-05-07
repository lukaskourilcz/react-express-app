import '../models/leaderboard.dart';
import 'client.dart';

enum LeaderboardPeriod { global, daily, category }

class LeaderboardApi {
  LeaderboardApi(this._client);
  final ApiClient _client;

  Future<List<GlobalLeaderboardEntry>> global({int limit = 100}) async {
    final json = await _client.get('/api/leaderboard', query: {
      'period': 'global',
      'limit': '$limit',
    });
    final entries = (json['entries'] as List).cast<Map<String, dynamic>>();
    return entries.map(GlobalLeaderboardEntry.fromJson).toList();
  }

  Future<List<DailyLeaderboardEntry>> daily({String? date, int limit = 50}) async {
    final json = await _client.get('/api/leaderboard', query: {
      'period': 'daily',
      if (date != null) 'date': date,
      'limit': '$limit',
    });
    final entries = (json['entries'] as List).cast<Map<String, dynamic>>();
    return entries.map(DailyLeaderboardEntry.fromJson).toList();
  }

  Future<List<CategoryLeaderboardEntry>> category({
    required String category,
    int limit = 50,
    int minAttempts = 5,
  }) async {
    final json = await _client.get('/api/leaderboard', query: {
      'period': 'category',
      'category': category,
      'limit': '$limit',
      'min_attempts': '$minAttempts',
    });
    final entries = (json['entries'] as List).cast<Map<String, dynamic>>();
    return entries.map(CategoryLeaderboardEntry.fromJson).toList();
  }
}
