import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/user.dart';
import '../auth/auth_service.dart';
import '../lib/achievements.dart';
import '../lib/bookmarks.dart';
import '../lib/cards.dart';
import '../models/user_stats.dart';
import '../responsive.dart';
import '../theme.dart';
import '../widgets/achievements_grid.dart';
import 'bookmarks_screen.dart';
import 'cards_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _userApi = UserApi(ApiClient());
  UserStats? _stats;
  bool _loading = true;
  String? _error;
  int _perfectQuizzes = 0;

  @override
  void initState() {
    super.initState();
    AuthService.instance.addListener(_onAuth);
    BookmarkStore.instance.addListener(_onBookmarks);
    CardStore.instance.addListener(_onBookmarks);
    _load();
  }

  @override
  void dispose() {
    AuthService.instance.removeListener(_onAuth);
    BookmarkStore.instance.removeListener(_onBookmarks);
    CardStore.instance.removeListener(_onBookmarks);
    super.dispose();
  }

  void _onAuth() {
    if (!mounted) return;
    setState(() {});
    _load();
  }

  void _onBookmarks() {
    if (mounted) setState(() {});
  }

  Future<void> _load() async {
    final auth = AuthService.instance;
    setState(() => _loading = true);
    try {
      _perfectQuizzes = await readPerfectQuizCount();
      if (auth.sub != null) {
        var s = await _userApi.getStats(auth.sub!);
        s ??= await _userApi.upsertProfile(
          auth0Id: auth.sub!,
          email: auth.email,
          name: auth.name,
          picture: auth.picture,
        );
        if (mounted) setState(() => _stats = s);
      }
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService.instance;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
            child: !auth.isAuthenticated
                ? _SignInPanel(onSignedIn: _load)
                : _loading
                    ? const Center(child: CircularProgressIndicator(color: BrandColors.green))
                    : _error != null
                        ? Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(children: [
                              Text(_error!),
                              const SizedBox(height: 12),
                              OutlinedButton(onPressed: _load, child: const Text('Retry')),
                            ]),
                          )
                        : _Body(
                            stats: _stats,
                            perfectQuizzes: _perfectQuizzes,
                            onSignOut: () async {
                              await AuthService.instance.signOut();
                              if (mounted) Navigator.pop(context);
                            },
                          ),
          ),
        ),
      ),
    );
  }
}

class _SignInPanel extends StatefulWidget {
  const _SignInPanel({required this.onSignedIn});
  final VoidCallback onSignedIn;

  @override
  State<_SignInPanel> createState() => _SignInPanelState();
}

class _SignInPanelState extends State<_SignInPanel> {
  final _name = TextEditingController();
  bool _signingIn = false;

  Future<void> _withAuth0() async {
    setState(() => _signingIn = true);
    final ok = await AuthService.instance.signInWithAuth0();
    if (mounted) setState(() => _signingIn = false);
    if (ok) widget.onSignedIn();
    else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign-in cancelled or Auth0 not configured.')),
      );
    }
  }

  Future<void> _asGuest() async {
    final n = _name.text.trim();
    if (n.isEmpty) return;
    await AuthService.instance.setGuest(displayName: n);
    widget.onSignedIn();
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth0Configured = AuthService.instance.isAuth0Configured;
    return Padding(
      padding: const EdgeInsets.all(20),
      child: ListView(children: [
        const Text('Sign in', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text(
          'Track your streak, climb the leaderboard, and host live matches.',
          style: TextStyle(color: Colors.grey[700]),
        ),
        const SizedBox(height: 24),
        if (auth0Configured) ...[
          ElevatedButton.icon(
            onPressed: _signingIn ? null : _withAuth0,
            icon: const Icon(Icons.login),
            label: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(_signingIn ? 'Opening Auth0…' : 'Continue with Auth0'),
            ),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 8),
        ],
        Text('Or continue as a guest',
            style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey[700])),
        const SizedBox(height: 4),
        Text(
          'Stats sync to a stable identity tied to this device.',
          style: TextStyle(color: Colors.grey[600], fontSize: 13),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _name,
          decoration: const InputDecoration(
            labelText: 'Display name',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (_) => _asGuest(),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _asGuest,
          child: const Text('Continue as guest'),
        ),
        if (!auth0Configured)
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: Text(
              "Auth0 isn't configured for this build. Pass --dart-define=AUTH0_DOMAIN=… and AUTH0_CLIENT_ID=… to enable real sign-in.",
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
          ),
      ]),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.stats, required this.perfectQuizzes, required this.onSignOut});
  final UserStats? stats;
  final int perfectQuizzes;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    final auth = AuthService.instance;
    final achievements = computeAchievements(AchievementContext(
      stats: stats,
      bookmarkCount: BookmarkStore.instance.count,
      perfectQuizzes: perfectQuizzes,
    ));
    final isFirst = (stats?.totalQuizzes ?? 0) == 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: BrandColors.greenSoft,
                backgroundImage: auth.picture != null ? NetworkImage(auth.picture!) : null,
                child: auth.picture == null
                    ? Text(
                        (auth.name?.isNotEmpty ?? false) ? auth.name![0].toUpperCase() : '?',
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: BrandColors.green),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(auth.name ?? 'Anonymous',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  if (auth.email != null)
                    Text(auth.email!, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                ]),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        if (isFirst)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                const Text('No quizzes yet',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text('Take your first quiz to start a streak.',
                    style: TextStyle(color: Colors.grey[600])),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Start a quiz'),
                ),
              ]),
            ),
          )
        else ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                const Text('STREAKS',
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                      child: _BigStat('${stats!.currentStreak}', 'Current streak',
                          const Color(0xFFD97706))),
                  const SizedBox(width: 16, child: VerticalDivider()),
                  Expanded(
                      child: _BigStat('${stats!.longestStreak}', 'Longest streak',
                          BrandColors.green)),
                ]),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('STATISTICS',
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 8),
                _StatRow('Quizzes completed', '${stats!.totalQuizzes}'),
                _StatRow('Questions answered', '${stats!.totalQuestions}'),
                _StatRow('Correct answers', '${stats!.totalCorrect}'),
                _StatRow('Average score', '${stats!.accuracyPct}%',
                    highlight: stats!.accuracyPct >= 70),
              ]),
            ),
          ),
        ],
        if (CardStore.instance.count > 0) ...[
          const SizedBox(height: 12),
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: BrandColors.green),
            ),
            color: BrandColors.greenSoft,
            child: ListTile(
              leading: const Text('🃏', style: TextStyle(fontSize: 28)),
              title: Text(
                '${CardStore.instance.count} memory card${CardStore.instance.count == 1 ? '' : 's'} ready',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: const Text('Drill the questions you missed.',
                  style: TextStyle(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right, color: BrandColors.green),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CardsScreen()),
              ),
            ),
          ),
        ],
        const SizedBox(height: 12),
        AchievementsGrid(achievements: achievements),
        if (BookmarkStore.instance.count > 0) ...[
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.bookmark, color: BrandColors.green),
              title: Text('Bookmarks (${BookmarkStore.instance.count})'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BookmarksScreen()),
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: onSignOut,
          icon: const Icon(Icons.logout),
          label: const Text('Sign out'),
        ),
      ],
    );
  }
}

class _BigStat extends StatelessWidget {
  const _BigStat(this.value, this.label, this.color);
  final String value;
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text(value,
          style: TextStyle(
              fontSize: 36, fontWeight: FontWeight.w700, color: color, height: 1)),
      const SizedBox(height: 4),
      Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
    ]);
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow(this.label, this.value, {this.highlight = false});
  final String label;
  final String value;
  final bool highlight;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: highlight ? BrandColors.greenSoft : const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(children: [
        Expanded(child: Text(label, style: TextStyle(color: Colors.grey[700]))),
        Text(value,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: highlight ? BrandColors.green : null,
            )),
      ]),
    );
  }
}
