import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/quiz.dart';
import '../auth/auth_service.dart';
import '../models/quiz.dart';
import '../responsive.dart';
import '../theme.dart';
import '../widgets/category_chip.dart';
import 'bookmarks_screen.dart';
import 'cards_screen.dart';
import 'leaderboard_screen.dart';
import 'play_landing_screen.dart';
import 'profile_screen.dart';
import 'quiz_screen.dart';
import 'sandbox_screen.dart';
import '../lib/cards.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _quizApi = QuizApi(ApiClient());
  final Set<String> _selected = {};
  int _count = 10;
  String _difficulty = 'zero-to-hero';
  bool _starting = false;
  bool _startingDaily = false;
  String? _error;
  bool _attempted = false;

  @override
  void initState() {
    super.initState();
    AuthService.instance.addListener(_onAuth);
    CardStore.instance.addListener(_onAuth);
  }

  @override
  void dispose() {
    AuthService.instance.removeListener(_onAuth);
    CardStore.instance.removeListener(_onAuth);
    super.dispose();
  }

  void _onAuth() {
    if (mounted) setState(() {});
  }

  Future<void> _start() async {
    setState(() => _attempted = true);
    if (_selected.isEmpty) {
      setState(() => _error = 'Select at least one category');
      return;
    }
    setState(() {
      _starting = true;
      _error = null;
    });
    try {
      final session = await _quizApi.fetchQuestions(
        count: _count,
        difficulty: _difficulty,
        categories: _selected.toList(),
      );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => QuizScreen(session: session, mode: QuizMode.standard)),
      );
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  Future<void> _startDaily() async {
    setState(() => _startingDaily = true);
    try {
      final session = await _quizApi.dailyChallenge();
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => QuizScreen(session: session, mode: QuizMode.daily)),
      );
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _startingDaily = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DevQuiz'),
        actions: [
          IconButton(
            tooltip: 'Leaderboard',
            icon: const Icon(Icons.leaderboard_outlined),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
            ),
          ),
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ),
          ),
        ],
      ),
      body: ResponsiveListView(
        children: [
            const SizedBox(height: 8),
            Text('Web Development Quiz',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('500+ questions',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey[600])),
            const SizedBox(height: 16),

            // Quick-action tiles. Grid adapts: 2 cols on phone, 4 on tablet/desktop.
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: gridColumns(context),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: isWide(context) ? 1.6 : 2.4,
              children: [
                _Tile(
                  emoji: '🗓️',
                  title: "Today's challenge",
                  subtitle: '5 questions',
                  loading: _startingDaily,
                  onTap: _startDaily,
                ),
                _Tile(
                  emoji: '⚡',
                  title: 'Play live',
                  subtitle: 'multiplayer · classroom',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PlayLandingScreen()),
                  ),
                ),
                _Tile(
                  emoji: '🧪',
                  title: 'Code playground',
                  subtitle: 'JS · TS · Python',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SandboxScreen()),
                  ),
                ),
                _Tile(
                  emoji: '🔖',
                  title: 'Bookmarks',
                  subtitle: 'Saved questions',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const BookmarksScreen()),
                  ),
                ),
                _Tile(
                  emoji: '🃏',
                  title: 'Memory cards',
                  subtitle: CardStore.instance.count == 0
                      ? 'No cards yet'
                      : '${CardStore.instance.count} to review',
                  badge: CardStore.instance.count,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CardsScreen()),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),
            _SectionTitle('Categories'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: allCategories
                  .map((c) => CategoryChip(
                        category: c,
                        selected: _selected.contains(c),
                        onTap: () => setState(() {
                          if (_selected.contains(c)) {
                            _selected.remove(c);
                          } else {
                            _selected.add(c);
                          }
                        }),
                      ))
                  .toList(),
            ),
            if (_attempted && _selected.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('Select at least one category',
                    style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
              ),

            const SizedBox(height: 24),
            _SectionTitle('Questions'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [10, 20, 30, 40, 50].map((n) {
                final selected = _count == n;
                return ChoiceChip(
                  label: Text('$n'),
                  selected: selected,
                  onSelected: (_) => setState(() => _count = n),
                  selectedColor: BrandColors.greenSoft,
                  side: BorderSide(color: selected ? BrandColors.green : const Color(0xFFE5E5E5)),
                  labelStyle: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: selected ? BrandColors.green : null,
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 24),
            _SectionTitle('Difficulty'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: difficultyModes.map((m) {
                final value = m['value']!;
                final selected = _difficulty == value;
                return ChoiceChip(
                  label: Text(m['label']!),
                  selected: selected,
                  onSelected: (_) => setState(() => _difficulty = value),
                  selectedColor: BrandColors.greenSoft,
                  side: BorderSide(color: selected ? BrandColors.green : const Color(0xFFE5E5E5)),
                  labelStyle: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: selected ? BrandColors.green : null,
                  ),
                );
              }).toList(),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                difficultyModes.firstWhere((m) => m['value'] == _difficulty)['tooltip']!,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ),

            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: _starting ? null : _start,
              child: SizedBox(
                width: double.infinity,
                child: Text(
                  _starting ? 'Loading…' : 'Start quiz',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!),
                ),
              ),
          ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.loading = false,
    this.badge = 0,
  });
  final String emoji;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool loading;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(
            color: badge > 0 ? BrandColors.green : const Color(0xFFE5E5E5),
            width: badge > 0 ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(8),
          color: badge > 0 ? BrandColors.greenSoft : null,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(emoji, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 6),
            Expanded(
              child: Text(title,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                  overflow: TextOverflow.ellipsis),
            ),
            if (loading)
              const SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else if (badge > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: BrandColors.green,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(
                      color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
          ]),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        ]),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
        color: Colors.grey[600],
      ),
    );
  }
}
