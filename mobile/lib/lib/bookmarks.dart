import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Bookmark {
  final String id;
  final String question;
  final String category;
  final List<String> options;
  final int correctIndex;
  final String explanation;
  final DateTime bookmarkedAt;

  Bookmark({
    required this.id,
    required this.question,
    required this.category,
    required this.options,
    required this.correctIndex,
    required this.explanation,
    required this.bookmarkedAt,
  });

  factory Bookmark.fromJson(Map<String, dynamic> j) => Bookmark(
        id: j['id'] as String,
        question: j['question'] as String,
        category: j['category'] as String,
        options: (j['options'] as List).cast<String>(),
        correctIndex: (j['correctIndex'] as num).toInt(),
        explanation: j['explanation'] as String? ?? '',
        bookmarkedAt: DateTime.parse(j['bookmarkedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'category': category,
        'options': options,
        'correctIndex': correctIndex,
        'explanation': explanation,
        'bookmarkedAt': bookmarkedAt.toIso8601String(),
      };
}

class BookmarkStore extends ChangeNotifier {
  BookmarkStore._();
  static final instance = BookmarkStore._();

  static const _key = 'devquiz:bookmarks';
  List<Bookmark> _all = [];

  List<Bookmark> get all => List.unmodifiable(_all);
  Set<String> get ids => _all.map((b) => b.id).toSet();
  bool isBookmarked(String id) => _all.any((b) => b.id == id);
  int get count => _all.length;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) {
      _all = [];
    } else {
      try {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        _all = list.map(Bookmark.fromJson).toList();
      } catch (_) {
        _all = [];
      }
    }
    notifyListeners();
  }

  Future<bool> toggle({
    required String id,
    required String question,
    required String category,
    required List<String> options,
    required int correctIndex,
    required String explanation,
  }) async {
    final existing = _all.indexWhere((b) => b.id == id);
    bool added;
    if (existing >= 0) {
      _all.removeAt(existing);
      added = false;
    } else {
      _all = [
        Bookmark(
          id: id,
          question: question,
          category: category,
          options: options,
          correctIndex: correctIndex,
          explanation: explanation,
          bookmarkedAt: DateTime.now(),
        ),
        ..._all,
      ].take(200).toList();
      added = true;
    }
    await _persist();
    notifyListeners();
    return added;
  }

  Future<void> remove(String id) async {
    _all.removeWhere((b) => b.id == id);
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(_all.map((b) => b.toJson()).toList()));
  }
}
