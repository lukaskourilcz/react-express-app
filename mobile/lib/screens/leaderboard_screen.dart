import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/leaderboard.dart';
import '../models/leaderboard.dart';
import '../models/quiz.dart';
import '../responsive.dart';
import '../theme.dart';

enum _Tab { global, daily, category }

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _api = LeaderboardApi(ApiClient());
  _Tab _tab = _Tab.global;
  String _category = 'javascript';
  bool _loading = false;
  String? _error;
  List<dynamic> _entries = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      List<dynamic> result;
      switch (_tab) {
        case _Tab.global:
          result = await _api.global();
          break;
        case _Tab.daily:
          result = await _api.daily();
          break;
        case _Tab.category:
          result = await _api.category(category: _category);
          break;
      }
      if (mounted) setState(() => _entries = result);
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leaderboard')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
            child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: SegmentedButton<_Tab>(
              segments: const [
                ButtonSegment(value: _Tab.global, label: Text('All-time')),
                ButtonSegment(value: _Tab.daily, label: Text('Today')),
                ButtonSegment(value: _Tab.category, label: Text('By category')),
              ],
              selected: {_tab},
              onSelectionChanged: (s) {
                setState(() => _tab = s.first);
                _load();
              },
            ),
          ),
          if (_tab == _Tab.category)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: allCategories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) {
                    final c = allCategories[i];
                    final selected = _category == c;
                    return ChoiceChip(
                      label: Text(categoryLabels[c]!),
                      selected: selected,
                      onSelected: (_) {
                        setState(() => _category = c);
                        _load();
                      },
                    );
                  },
                ),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: BrandColors.green))
                : _error != null
                    ? Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(child: Text(_error!)),
                      )
                    : _entries.isEmpty
                        ? Center(
                            child: Text('No entries yet — be the first.',
                                style: TextStyle(color: Colors.grey[600])),
                          )
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: BrandColors.green,
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              itemCount: _entries.length,
                              separatorBuilder: (_, __) =>
                                  const Divider(height: 1, indent: 16, endIndent: 16),
                              itemBuilder: (_, i) => _Row(rank: i + 1, entry: _entries[i], tab: _tab),
                            ),
                          ),
          ),
        ]),
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.rank, required this.entry, required this.tab});
  final int rank;
  final dynamic entry;
  final _Tab tab;

  @override
  Widget build(BuildContext context) {
    final medal = rank == 1 ? '🥇' : rank == 2 ? '🥈' : rank == 3 ? '🥉' : null;
    String displayName;
    String? picture;
    String primary;
    String primaryLabel;
    String secondary;

    if (entry is GlobalLeaderboardEntry) {
      displayName = entry.displayName;
      picture = entry.picture;
      primary = '${entry.totalCorrect}';
      primaryLabel = 'correct';
      secondary = '${entry.totalQuizzes} quizzes · 🔥 ${entry.longestStreak}d';
    } else if (entry is DailyLeaderboardEntry) {
      displayName = entry.displayName;
      picture = entry.picture;
      primary = '${entry.correct}/${entry.total}';
      primaryLabel = 'today';
      secondary = entry.durationMs > 0 ? '${(entry.durationMs / 1000).toStringAsFixed(1)}s' : '';
    } else {
      final e = entry as CategoryLeaderboardEntry;
      displayName = e.displayName;
      picture = e.picture;
      primary = '${e.totalCorrect}';
      primaryLabel = 'correct';
      secondary = '${e.totalQuestions} attempts · ${e.accuracyPct}% accuracy';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: rank <= 3 ? BrandColors.greenSoft : null,
      child: Row(children: [
        SizedBox(
          width: 32,
          child: Text(
            medal ?? '$rank',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: rank <= 3 ? BrandColors.green : Colors.grey,
            ),
          ),
        ),
        CircleAvatar(
          radius: 16,
          backgroundColor: BrandColors.greenSoft,
          backgroundImage: picture != null ? NetworkImage(picture) : null,
          child: picture == null
              ? Text(displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                  style: const TextStyle(color: BrandColors.green, fontWeight: FontWeight.w700))
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(displayName,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            Text(secondary,
                style: TextStyle(color: Colors.grey[600], fontSize: 12)),
          ]),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(primary, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          Text(primaryLabel, style: TextStyle(color: Colors.grey[600], fontSize: 11)),
        ]),
      ]),
    );
  }
}
