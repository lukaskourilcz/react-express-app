import 'dart:async';
import '../api/client.dart';
import 'cards.dart';

const _debounceMs = Duration(milliseconds: 1500);

Timer? _pushTimer;
String? _lastAuth0Id;
bool _initialised = false;
bool _listenerAttached = false;

FlashCard _fromServer(Map<String, dynamic> s) {
  return FlashCard(
    id: s['question_id'] as String,
    question: s['question'] as String,
    options: ((s['options'] as List?) ?? const []).cast<String>(),
    correctIndex: (s['correct_index'] as num).toInt(),
    explanation: (s['explanation'] as String?) ?? '',
    category: s['category'] as String,
    addedAt: DateTime.parse(s['added_at'] as String),
    rightStreak: (s['right_streak'] as num?)?.toInt() ?? 0,
    wrongCount: (s['wrong_count'] as num?)?.toInt() ?? 0,
    dueAt: DateTime.parse(s['due_at'] as String),
    lastReviewedAt: s['last_reviewed_at'] is String
        ? DateTime.tryParse(s['last_reviewed_at'] as String)
        : null,
    updatedAt: DateTime.parse(s['updated_at'] as String),
  );
}

Map<String, dynamic> _toServer(FlashCard c) => {
      'question_id': c.id,
      'question': c.question,
      'options': c.options,
      'correct_index': c.correctIndex,
      'explanation': c.explanation,
      'category': c.category,
      'added_at': c.addedAt.toIso8601String(),
      'right_streak': c.rightStreak,
      'wrong_count': c.wrongCount,
      'due_at': c.dueAt.toIso8601String(),
      'last_reviewed_at': c.lastReviewedAt?.toIso8601String(),
      'updated_at': c.updatedAt.toIso8601String(),
    };

Future<void> _pushNow(String authId) async {
  final cards = CardStore.instance.all.map(_toServer).toList();
  try {
    await ApiClient().post('/api/user/cards', {
      'auth0_id': authId,
      'cards': cards,
    });
  } catch (_) {
    /* offline / unauthenticated — local store still works */
  }
}

void _schedulePush(String authId) {
  _pushTimer?.cancel();
  _pushTimer = Timer(_debounceMs, () => _pushNow(authId));
}

/// Pull server cards, merge with local, push merged result, then debounce
/// pushes on every local mutation. Idempotent.
Future<void> initCardSync(String authId) async {
  if (_initialised && _lastAuth0Id == authId) return;
  _initialised = true;
  _lastAuth0Id = authId;

  try {
    final res = await ApiClient().get('/api/user/cards', query: {'auth0_id': authId});
    final list = ((res['data'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(_fromServer)
        .toList();
    await CardStore.instance.mergeFromServer(list);
    await _pushNow(authId);
  } catch (_) {
    // never fail the app on sync error — local-first
  }

  if (!_listenerAttached) {
    CardStore.instance.addSyncListener(() {
      final id = _lastAuth0Id;
      if (id != null) _schedulePush(id);
    });
    _listenerAttached = true;
  }
}

void resetCardSync() {
  _pushTimer?.cancel();
  _pushTimer = null;
  _initialised = false;
  _lastAuth0Id = null;
}
