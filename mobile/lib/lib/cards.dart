import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FlashCard {
  final String id;
  final String question;
  final List<String> options;
  final int correctIndex;
  final String explanation;
  final String category;
  final DateTime addedAt;
  final int rightStreak;
  final int wrongCount;
  final DateTime dueAt;
  final DateTime? lastReviewedAt;
  final DateTime updatedAt;

  FlashCard({
    required this.id,
    required this.question,
    required this.options,
    required this.correctIndex,
    required this.explanation,
    required this.category,
    required this.addedAt,
    required this.rightStreak,
    required this.wrongCount,
    required this.dueAt,
    this.lastReviewedAt,
    required this.updatedAt,
  });

  FlashCard copyWith({
    String? question,
    List<String>? options,
    int? correctIndex,
    String? explanation,
    String? category,
    int? rightStreak,
    int? wrongCount,
    DateTime? dueAt,
    DateTime? lastReviewedAt,
    DateTime? updatedAt,
  }) =>
      FlashCard(
        id: id,
        question: question ?? this.question,
        options: options ?? this.options,
        correctIndex: correctIndex ?? this.correctIndex,
        explanation: explanation ?? this.explanation,
        category: category ?? this.category,
        addedAt: addedAt,
        rightStreak: rightStreak ?? this.rightStreak,
        wrongCount: wrongCount ?? this.wrongCount,
        dueAt: dueAt ?? this.dueAt,
        lastReviewedAt: lastReviewedAt ?? this.lastReviewedAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  factory FlashCard.fromJson(Map<String, dynamic> j) => FlashCard(
        id: j['id'] as String,
        question: j['question'] as String,
        options: (j['options'] as List).cast<String>(),
        correctIndex: (j['correctIndex'] as num).toInt(),
        explanation: j['explanation'] as String? ?? '',
        category: j['category'] as String,
        addedAt: DateTime.parse(j['addedAt'] as String),
        rightStreak: (j['rightStreak'] as num?)?.toInt() ?? 0,
        wrongCount: (j['wrongCount'] as num?)?.toInt() ?? 0,
        dueAt: j['dueAt'] is String
            ? DateTime.parse(j['dueAt'] as String)
            : DateTime.now(),
        lastReviewedAt: j['lastReviewedAt'] is String
            ? DateTime.tryParse(j['lastReviewedAt'] as String)
            : null,
        updatedAt: j['updatedAt'] is String
            ? DateTime.parse(j['updatedAt'] as String)
            : DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'options': options,
        'correctIndex': correctIndex,
        'explanation': explanation,
        'category': category,
        'addedAt': addedAt.toIso8601String(),
        'rightStreak': rightStreak,
        'wrongCount': wrongCount,
        'dueAt': dueAt.toIso8601String(),
        if (lastReviewedAt != null) 'lastReviewedAt': lastReviewedAt!.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

/// Spaced-repetition intervals. Index = `rightStreak` (after the increment).
/// Reaching the end (6 in a row) graduates the card.
const _intervalsDays = <double>[
  10 / (60 * 24), // ~10 minutes (immediate retry inside the same session)
  1,
  3,
  7,
  14,
  30,
];
const _graduateAt = 6;

DateTime _nextDue(int streak) {
  final idx = streak.clamp(0, _intervalsDays.length - 1);
  final ms = (_intervalsDays[idx] * 24 * 60 * 60 * 1000).round();
  return DateTime.now().add(Duration(milliseconds: ms));
}

/// Listener for card mutations that should trigger a sync push (separate
/// channel from UI listeners so the sync layer can debounce).
typedef SyncListener = void Function();

class CardStore extends ChangeNotifier {
  CardStore._();
  static final instance = CardStore._();
  static const _key = 'devquiz:cards';
  static const _maxCards = 500;

  List<FlashCard> _all = [];
  final Set<SyncListener> _syncListeners = {};

  List<FlashCard> get all => List.unmodifiable(_all);
  int get count => _all.length;
  int get dueCount {
    final now = DateTime.now();
    return _all.where((c) => !c.dueAt.isAfter(now)).length;
  }

  List<FlashCard> dueCards() {
    final now = DateTime.now();
    final due = _all.where((c) => !c.dueAt.isAfter(now)).toList()
      ..sort((a, b) => a.dueAt.compareTo(b.dueAt));
    return due;
  }

  void addSyncListener(SyncListener fn) => _syncListeners.add(fn);
  void removeSyncListener(SyncListener fn) => _syncListeners.remove(fn);

  void _notify() {
    notifyListeners();
    for (final fn in List<SyncListener>.from(_syncListeners)) {
      fn();
    }
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) {
      _all = [];
    } else {
      try {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        _all = list.map(FlashCard.fromJson).toList();
      } catch (_) {
        _all = [];
      }
    }
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(_all.map((c) => c.toJson()).toList()));
  }

  Future<void> addFailed({
    required String id,
    required String question,
    required List<String> options,
    required int correctIndex,
    required String explanation,
    required String category,
  }) async {
    final now = DateTime.now();
    final idx = _all.indexWhere((c) => c.id == id);
    if (idx >= 0) {
      _all[idx] = _all[idx].copyWith(
        question: question,
        options: options,
        correctIndex: correctIndex,
        explanation: explanation,
        category: category,
        wrongCount: _all[idx].wrongCount + 1,
        rightStreak: 0,
        dueAt: now,
        updatedAt: now,
      );
    } else {
      _all = [
        FlashCard(
          id: id,
          question: question,
          options: options,
          correctIndex: correctIndex,
          explanation: explanation,
          category: category,
          addedAt: now,
          rightStreak: 0,
          wrongCount: 1,
          dueAt: now,
          updatedAt: now,
        ),
        ..._all,
      ];
    }
    if (_all.length > _maxCards) _all = _all.take(_maxCards).toList();
    await _persist();
    _notify();
  }

  Future<({int streak, bool graduated})> markCorrect(String id) async {
    final idx = _all.indexWhere((c) => c.id == id);
    if (idx < 0) return (streak: 0, graduated: false);
    final newStreak = _all[idx].rightStreak + 1;
    if (newStreak >= _graduateAt) {
      _all.removeAt(idx);
      await _persist();
      _notify();
      return (streak: newStreak, graduated: true);
    }
    final now = DateTime.now();
    _all[idx] = _all[idx].copyWith(
      rightStreak: newStreak,
      dueAt: _nextDue(newStreak),
      lastReviewedAt: now,
      updatedAt: now,
    );
    await _persist();
    _notify();
    return (streak: newStreak, graduated: false);
  }

  Future<void> markWrong(String id) async {
    final idx = _all.indexWhere((c) => c.id == id);
    if (idx < 0) return;
    final now = DateTime.now();
    _all[idx] = _all[idx].copyWith(
      rightStreak: 0,
      wrongCount: _all[idx].wrongCount + 1,
      dueAt: now,
      lastReviewedAt: now,
      updatedAt: now,
    );
    await _persist();
    _notify();
  }

  Future<void> remove(String id) async {
    _all.removeWhere((c) => c.id == id);
    await _persist();
    _notify();
  }

  Future<void> clearAll() async {
    _all = [];
    await _persist();
    _notify();
  }

  /// Replace local deck with merged result (last-write-wins on `updatedAt`).
  Future<void> mergeFromServer(List<FlashCard> serverCards) async {
    final merged = <String, FlashCard>{
      for (final c in serverCards) c.id: c,
    };
    for (final c in _all) {
      final theirs = merged[c.id];
      if (theirs == null || c.updatedAt.isAfter(theirs.updatedAt)) {
        merged[c.id] = c;
      }
    }
    _all = merged.values.toList();
    await _persist();
    _notify();
  }
}
