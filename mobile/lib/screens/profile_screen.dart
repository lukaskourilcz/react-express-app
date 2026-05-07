import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/user.dart';
import '../auth/auth_service.dart';
import '../models/user_stats.dart';
import '../theme.dart';

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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = AuthService.instance;
    if (auth.sub == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      var s = await _userApi.getStats(auth.sub!);
      s ??= await _userApi.upsertProfile(
        auth0Id: auth.sub!,
        email: auth.email,
        name: auth.name,
        picture: auth.picture,
      );
      if (mounted) setState(() => _stats = s);
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
        child: !auth.isAuthenticated
            ? _GuestPanel(onSignedIn: _load)
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
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _Header(name: auth.name, email: auth.email, picture: auth.picture),
                          const SizedBox(height: 16),
                          if ((_stats?.totalQuizzes ?? 0) == 0)
                            const _ZeroState()
                          else
                            _StatsBlock(stats: _stats!),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: () async {
                              await AuthService.instance.clear();
                              if (context.mounted) Navigator.pop(context);
                            },
                            icon: const Icon(Icons.logout),
                            label: const Text('Sign out'),
                          ),
                        ],
                      ),
      ),
    );
  }
}

class _GuestPanel extends StatelessWidget {
  const _GuestPanel({required this.onSignedIn});
  final VoidCallback onSignedIn;
  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController();
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('You are playing as a guest',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        const Text(
          'Sign in to save your streak, climb the leaderboard, and play multiplayer matches.',
          style: TextStyle(fontSize: 14),
        ),
        const SizedBox(height: 24),
        const Text(
          'Quick start (no Auth0 setup needed):',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          'Pick a display name. Your stats will sync to that identity on this device.',
          style: TextStyle(color: Colors.grey[600], fontSize: 13),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Display name',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: () async {
            final name = controller.text.trim();
            if (name.isEmpty) return;
            // Generate a stable client-side sub. Replace with Auth0 once you
            // wire it up; the server treats sub as opaque.
            final id = 'local|${DateTime.now().millisecondsSinceEpoch}';
            await AuthService.instance.setUser(sub: id, name: name);
            onSignedIn();
          },
          child: const Text('Continue'),
        ),
      ]),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({this.name, this.email, this.picture});
  final String? name;
  final String? email;
  final String? picture;
  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE5E5E5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: BrandColors.greenSoft,
            backgroundImage: picture != null ? NetworkImage(picture!) : null,
            child: picture == null
                ? Text(
                    (name?.isNotEmpty ?? false) ? name![0].toUpperCase() : '?',
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w700, color: BrandColors.green),
                  )
                : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name ?? 'Anonymous',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              if (email != null)
                Text(email!, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _ZeroState extends StatelessWidget {
  const _ZeroState();
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          const Text('No quizzes yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Take your first quiz to start a streak.',
              style: TextStyle(color: Colors.grey[600])),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Start a quiz'),
          ),
        ]),
      ),
    );
  }
}

class _StatsBlock extends StatelessWidget {
  const _StatsBlock({required this.stats});
  final UserStats stats;
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            const Text('STREAKS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _BigStat('${stats.currentStreak}', 'Current streak', const Color(0xFFD97706))),
              const SizedBox(width: 16, child: VerticalDivider()),
              Expanded(child: _BigStat('${stats.longestStreak}', 'Longest streak', BrandColors.green)),
            ]),
          ]),
        ),
      ),
      const SizedBox(height: 12),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('STATISTICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
            const SizedBox(height: 8),
            _StatRow('Quizzes completed', '${stats.totalQuizzes}'),
            _StatRow('Questions answered', '${stats.totalQuestions}'),
            _StatRow('Correct answers', '${stats.totalCorrect}'),
            _StatRow('Average score', '${stats.accuracyPct}%',
                highlight: stats.accuracyPct >= 70),
          ]),
        ),
      ),
    ]);
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
          style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: color, height: 1)),
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
