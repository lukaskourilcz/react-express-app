import '../models/play.dart';
import 'client.dart';

class PlayApi {
  PlayApi(this._client);
  final ApiClient _client;

  Future<Match> create({
    required String hostSub,
    required String hostName,
    required String mode,
    required int count,
    List<String> categories = const [],
  }) async {
    final json = await _client.post('/api/play/create', {
      'host_sub': hostSub,
      'host_name': hostName,
      'mode': mode,
      'count': count,
      'categories': categories,
    });
    return Match.fromJson(json);
  }

  Future<Match> join({required String code, required String authSub, required String displayName}) async {
    final json = await _client.post('/api/play/join', {
      'code': code,
      'auth0_sub': authSub,
      'display_name': displayName,
    });
    return Match.fromJson(json);
  }

  Future<MatchState> state(String code, {String? authSub}) async {
    final json = await _client.get('/api/play/state', query: {
      'code': code,
      if (authSub != null) 'auth0_sub': authSub,
    });
    final match = Match.fromJson(json['match'] as Map<String, dynamic>);
    final participants = (json['participants'] as List)
        .map((p) => Participant.fromJson(p as Map<String, dynamic>))
        .toList();
    final scoreboard = (json['scoreboard'] as List)
        .map((s) => ScoreboardEntry.fromJson(s as Map<String, dynamic>))
        .toList();
    return MatchState(match: match, participants: participants, scoreboard: scoreboard);
  }

  Future<void> control({required String code, required String hostSub, required String action}) async {
    await _client.post('/api/play/control', {
      'code': code,
      'host_sub': hostSub,
      'action': action,
    });
  }

  Future<bool> answer({
    required String code,
    required String authSub,
    required int questionIdx,
    required int selectedIdx,
    required int durationMs,
    String? clientReceivedAt,
  }) async {
    final json = await _client.post('/api/play/answer', {
      'code': code,
      'auth0_sub': authSub,
      'question_idx': questionIdx,
      'selected_idx': selectedIdx,
      'duration_ms': durationMs,
      if (clientReceivedAt != null) 'client_received_at': clientReceivedAt,
    });
    return (json['is_correct'] as bool?) ?? false;
  }

  Future<List<DistributionBucket>> distribution({
    required String code,
    required int q,
    required String hostSub,
  }) async {
    final json = await _client.get('/api/play/distribution', query: {
      'code': code,
      'q': '$q',
      'auth0_sub': hostSub,
    });
    return (json['buckets'] as List)
        .map((b) => DistributionBucket.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  Future<void> heartbeat({required String code, required String hostSub}) async {
    await _client.post('/api/play/heartbeat', {
      'code': code,
      'host_sub': hostSub,
    });
  }
}
