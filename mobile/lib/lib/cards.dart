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
  final DateTime? lastReviewedAt;

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
    this.lastReviewedAt,
  });

  FlashCard copyWith({
    String? question,
    List<String>? options,
    int? correctIndex,
    String? explanation,
    String? category,
    int? rightStreak,
    int? wrongCount,
    DateTime? lastReviewedAt,
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
        lastReviewedAt: lastReviewedAt ?? this.lastReviewedAt,
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
        lastReviewedAt: j['lastReviewedAt'] is String
            ? DateTime.tryParse(j['lastReviewedAt'] as String)
            : null,
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
        if (lastReviewedAt != null) 'lastReviewedAt': lastReviewedAt!.toIso8601String(),
      };
}

class CardStore extends ChangeNotifier {
  CardStore._();
  static final instance = CardStore._();
  static const _key = 'devquiz:cards';
  static const _maxCards = 500;
  static const _graduateAt = 2;

  List<FlashCard> _all = [];
  List<FlashCard> get all => List.unmodifiable(_all);
  int get count => _all.length;

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

  /// Add a card on submit failure (or refresh & bump wrongCount if it exists).
  Future<void> addFailed({
    required String id,
    required String question,
    required List<String> options,
    required int correctIndex,
    required String explanation,
    required String category,
  }) async {
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
          addedAt: DateTime.now(),
          rightStreak: 0,
          wrongCount: 1,
        ),
        ..._all,
      ];
    }
    if (_all.length > _maxCards) _all = _all.take(_maxCards).toList();
    await _persist();
    notifyListeners();
  }

  /// Returns `(streak, graduated)`. When the streak reaches the threshold the
  /// card is removed from the deck.
  Future<({int streak, bool graduated})> markCorrect(String id) async {
    final idx = _all.indexWhere((c) => c.id == id);
    if (idx < 0) return (streak: 0, graduated: false);
    final next = _all[idx].copyWith(
      rightStreak: _all[idx].rightStreak + 1,
      lastReviewedAt: DateTime.now(),
    );
    if (next.rightStreak >= _graduateAt) {
      _all.removeAt(idx);
      await _persist();
      notifyListeners();
      return (streak: next.rightStreak, graduated: true);
    }
    _all[idx] = next;
    await _persist();
    notifyListeners();
    return (streak: next.rightStreak, graduated: false);
  }

  Future<void> markWrong(String id) async {
    final idx = _all.indexWhere((c) => c.id == id);
    if (idx < 0) return;
    _all[idx] = _all[idx].copyWith(
      rightStreak: 0,
      wrongCount: _all[idx].wrongCount + 1,
      lastReviewedAt: DateTime.now(),
    );
    await _persist();
    notifyListeners();
  }

  Future<void> remove(String id) async {
    _all.removeWhere((c) => c.id == id);
    await _persist();
    notifyListeners();
  }

  Future<void> clearAll() async {
    _all = [];
    await _persist();
    notifyListeners();
  }
}
