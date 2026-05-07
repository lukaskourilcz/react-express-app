import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/play.dart';
import '../auth/auth_service.dart';
import '../theme.dart';
import 'play_match_screen.dart';

class PlayLandingScreen extends StatefulWidget {
  const PlayLandingScreen({super.key});

  @override
  State<PlayLandingScreen> createState() => _PlayLandingScreenState();
}

class _PlayLandingScreenState extends State<PlayLandingScreen> {
  final _api = PlayApi(ApiClient());
  String _mode = 'multiplayer';
  int _count = 10;
  final _codeCtrl = TextEditingController();
  String? _busy;
  String? _error;

  Future<void> _create() async {
    final auth = AuthService.instance;
    if (auth.sub == null) {
      setState(() => _error = 'Sign in (or pick a guest name) on the Profile screen first.');
      return;
    }
    setState(() {
      _busy = 'create';
      _error = null;
    });
    try {
      final m = await _api.create(
        hostSub: auth.sub!,
        hostName: auth.name ?? 'Host',
        mode: _mode,
        count: _count,
      );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PlayMatchScreen(code: m.code)),
      );
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _join() async {
    final auth = AuthService.instance;
    final code = _codeCtrl.text.trim().toUpperCase();
    if (auth.sub == null) {
      setState(() => _error = 'Sign in (or pick a guest name) on the Profile screen first.');
      return;
    }
    if (code.length < 4) {
      setState(() => _error = 'Enter a match code');
      return;
    }
    setState(() {
      _busy = 'join';
      _error = null;
    });
    try {
      await _api.join(code: code, authSub: auth.sub!, displayName: auth.name ?? 'Player');
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => PlayMatchScreen(code: code)),
      );
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService.instance;
    return Scaffold(
      appBar: AppBar(title: const Text('Play live')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              auth.isAuthenticated
                  ? 'Race friends in multiplayer, or host a classroom session.'
                  : 'Sign in or pick a guest name on the Profile screen first.',
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  Expanded(child: Text(_error!)),
                  IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () => setState(() => _error = null),
                  ),
                ]),
              ),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('HOST A GAME',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                  const SizedBox(height: 12),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'multiplayer', label: Text('Multiplayer')),
                      ButtonSegment(value: 'classroom', label: Text('Classroom')),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (s) => setState(() => _mode = s.first),
                  ),
                  const SizedBox(height: 12),
                  Row(children: [
                    for (final n in [5, 10, 15, 20])
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text('$n'),
                          selected: _count == n,
                          onSelected: (_) => setState(() => _count = n),
                          selectedColor: BrandColors.greenSoft,
                          labelStyle: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: _count == n ? BrandColors.green : null,
                          ),
                        ),
                      ),
                    Text('questions', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  ]),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _busy != null ? null : _create,
                    child: SizedBox(
                      width: double.infinity,
                      child: Text(
                        _busy == 'create' ? 'Creating…' : 'Create $_mode match',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _mode == 'multiplayer'
                          ? 'Anyone with the code can join. Score = correct + speed.'
                          : 'Students join with the code. You control when each question advances.',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                  ),
                ]),
              ),
            ),

            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('JOIN WITH A CODE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: _codeCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          hintText: 'ABC123',
                        ),
                        style: const TextStyle(fontFamily: 'Menlo', letterSpacing: 4),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _busy != null ? null : _join,
                      child: Text(_busy == 'join' ? '…' : 'Join'),
                    ),
                  ]),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }
}
