import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/quiz.dart';
import '../auth/auth_service.dart';
import '../models/quiz.dart';
import '../theme.dart';
import '../widgets/category_chip.dart';
import 'leaderboard_screen.dart';
import 'profile_screen.dart';
import 'quiz_screen.dart';

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
    final auth = AuthService.instance;
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
            tooltip: auth.isAuthenticated ? 'Profile' : 'Sign in',
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const SizedBox(height: 8),
            Text('Web Development Quiz',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('500+ questions',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey[600])),
            const SizedBox(height: 16),

            // Today's challenge
            OutlinedButton.icon(
              icon: const Text('🗓️', style: TextStyle(fontSize: 16)),
              label: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text("Today's challenge"),
                    const SizedBox(width: 6),
                    Text('5 questions',
                        style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                  ],
                ),
              ),
              onPressed: _startingDaily ? null : _startDaily,
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
                child: _ErrorBanner(_error!),
              ),
          ],
        ),
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

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner(this.message);
  final String message;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(children: [
        Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(message)),
      ]),
    );
  }
}
