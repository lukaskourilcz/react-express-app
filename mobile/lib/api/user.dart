import '../models/user_stats.dart';
import 'client.dart';

class UserApi {
  UserApi(this._client);
  final ApiClient _client;

  Future<UserStats?> getStats(String auth0Id) async {
    final json = await _client.get('/api/user/stats', query: {'auth0_id': auth0Id});
    final data = json['data'];
    if (data == null) return null;
    return UserStats.fromJson(data as Map<String, dynamic>);
  }

  Future<UserStats?> upsertProfile({
    required String auth0Id,
    String? email,
    String? name,
    String? picture,
  }) async {
    final json = await _client.post('/api/user/stats', {
      'auth0_id': auth0Id,
      if (email != null) 'email': email,
      if (name != null) 'name': name,
      if (picture != null) 'picture': picture,
    });
    final data = json['data'];
    if (data == null) return null;
    return UserStats.fromJson(data as Map<String, dynamic>);
  }

  Future<UserStats?> recordQuizResult({
    required String auth0Id,
    required int correct,
    required int total,
  }) async {
    final json = await _client.post('/api/user/stats', {
      'auth0_id': auth0Id,
      'quiz_result': {'correct': correct, 'total': total},
    });
    final data = json['data'];
    if (data == null) return null;
    return UserStats.fromJson(data as Map<String, dynamic>);
  }

  Future<void> recordCategoryStats({
    required String auth0Id,
    required Map<String, ({int correct, int total})> byCategory,
  }) async {
    await _client.post('/api/user/category-stats', {
      'auth0_id': auth0Id,
      'by_category': byCategory.map(
        (k, v) => MapEntry(k, {'correct': v.correct, 'total': v.total}),
      ),
    });
  }
}
