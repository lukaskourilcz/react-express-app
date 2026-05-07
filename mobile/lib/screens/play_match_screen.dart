import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/client.dart';
import '../api/play.dart';
import '../auth/auth_service.dart';
import '../models/play.dart';
import '../models/quiz.dart' show categoryColorsHex, categoryLabels;
import '../realtime/realtime.dart';
import '../theme.dart';
import '../widgets/code_block.dart';

class PlayMatchScreen extends StatefulWidget {
  const PlayMatchScreen({super.key, required this.code});
  final String code;

  @override
  State<PlayMatchScreen> createState() => _PlayMatchScreenState();
}

class _PlayMatchScreenState extends State<PlayMatchScreen> {
  final _api = PlayApi(ApiClient());
  late final MatchChannel _channel;
  Timer? _pollTimer;
  Timer? _heartbeatTimer;
  Timer? _countdownTimer;

  MatchState? _state;
  int? _selected;
  bool _submitted = false;
  String? _error;
  String? _clientReceivedAt;
  DateTime? _now;

  bool get _isHost {
    final s = AuthService.instance.sub;
    return s != null && s == _state?.match.hostSub;
  }

  @override
  void initState() {
    super.initState();
    _channel = MatchChannel.join(widget.code);
    _channel.onBroadcast('match_updated', (_) => _refresh());
    _channel.onBroadcast('participant_joined', (_) => _refresh());

    _joinAndRefresh();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _refresh());
    _now = DateTime.now();
    _countdownTimer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  Future<void> _joinAndRefresh() async {
    final auth = AuthService.instance;
    if (auth.sub == null) return;
    try {
      await _api.join(
        code: widget.code,
        authSub: auth.sub!,
        displayName: auth.name ?? 'Player',
      );
      await _refresh();
      _channel.send('participant_joined', {'sub': auth.sub});
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    }
  }

  Future<void> _refresh() async {
    try {
      final s = await _api.state(widget.code, authSub: AuthService.instance.sub);
      if (!mounted) return;
      final prevIdx = _state?.match.currentIndex;
      final prevStatus = _state?.match.status;
      setState(() => _state = s);
      // Reset per-question UI when the question changes.
      if (prevIdx != s.match.currentIndex || prevStatus != s.match.status) {
        setState(() {
          _selected = null;
          _submitted = false;
          _clientReceivedAt = DateTime.now().toUtc().toIso8601String();
        });
      }
      // Set up host heartbeat once we know we're the host.
      if (_isHost && _heartbeatTimer == null) {
        _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
          if (AuthService.instance.sub != null) {
            _api
                .heartbeat(code: widget.code, hostSub: AuthService.instance.sub!)
                .catchError((_) {});
          }
        });
      }
    } catch (_) {
      // ignore — UI keeps last known state
    }
  }

  Future<void> _control(String action) async {
    final auth = AuthService.instance;
    if (auth.sub == null) return;
    try {
      await _api.control(code: widget.code, hostSub: auth.sub!, action: action);
      _channel.send('match_updated', {'at': DateTime.now().millisecondsSinceEpoch});
      await _refresh();
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    }
  }

  Future<void> _submitAnswer() async {
    final s = _state;
    final auth = AuthService.instance;
    if (s == null || auth.sub == null || _selected == null) return;
    final shownAt = _clientReceivedAt;
    try {
      await _api.answer(
        code: widget.code,
        authSub: auth.sub!,
        questionIdx: s.match.currentIndex,
        selectedIdx: _selected!,
        durationMs: shownAt != null
            ? DateTime.now().difference(DateTime.parse(shownAt)).inMilliseconds
            : 0,
        clientReceivedAt: shownAt,
      );
      setState(() => _submitted = true);
      _channel.send('match_updated', {'at': DateTime.now().millisecondsSinceEpoch});
      await _refresh();
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _heartbeatTimer?.cancel();
    _countdownTimer?.cancel();
    _channel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = _state;
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Text(s?.match.mode == 'classroom' ? 'Classroom' : 'Multiplayer'),
          const SizedBox(width: 8),
          InkWell(
            onTap: () {
              Clipboard.setData(ClipboardData(text: widget.code));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Code copied'), duration: Duration(seconds: 1)),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                widget.code,
                style: const TextStyle(
                  fontFamily: 'Menlo',
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2,
                  color: Colors.black87,
                ),
              ),
            ),
          ),
        ]),
      ),
      body: SafeArea(
        child: s == null
            ? const Center(child: CircularProgressIndicator(color: BrandColors.green))
            : Column(children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Container(
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
                  ),
                Expanded(
                  child: switch (s.match.status) {
                    MatchStatus.lobby => _Lobby(
                        state: s,
                        isHost: _isHost,
                        onStart: () => _control('start'),
                      ),
                    MatchStatus.running => _Running(
                        state: s,
                        isHost: _isHost,
                        selected: _selected,
                        submitted: _submitted,
                        now: _now ?? DateTime.now(),
                        onSelect: (i) => setState(() => _selected = i),
                        onSubmit: _submitAnswer,
                        onAdvance: () => _control('advance'),
                        onFinish: () => _control('finish'),
                        api: _api,
                        code: widget.code,
                        hostSub: AuthService.instance.sub,
                      ),
                    MatchStatus.finished => _Finished(state: s, onLeave: () => Navigator.pop(context)),
                  },
                ),
              ]),
      ),
    );
  }
}

class _Lobby extends StatelessWidget {
  const _Lobby({required this.state, required this.isHost, required this.onStart});
  final MatchState state;
  final bool isHost;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final m = state.match;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Lobby', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(
          'Share the code ${m.code} with players, then ${isHost ? 'press start when everyone has joined.' : 'wait for the host to start.'}',
          style: TextStyle(color: Colors.grey[600]),
        ),
        const SizedBox(height: 16),
        ...state.participants.map((p) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE5E5E5)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: BrandColors.greenSoft,
                  child: Text(
                    p.displayName.isNotEmpty ? p.displayName[0].toUpperCase() : '?',
                    style: const TextStyle(
                        color: BrandColors.green, fontWeight: FontWeight.w700, fontSize: 12),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(child: Text(p.displayName, style: const TextStyle(fontWeight: FontWeight.w600))),
                if (p.authSub == m.hostSub)
                  const Chip(label: Text('Host'), visualDensity: VisualDensity.compact),
              ]),
            )),
        const SizedBox(height: 16),
        if (isHost)
          ElevatedButton(
            onPressed: state.participants.isEmpty ? null : onStart,
            child: SizedBox(
              width: double.infinity,
              child: Text(
                'Start (${m.questions.length} questions)',
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}

class _Running extends StatelessWidget {
  const _Running({
    required this.state,
    required this.isHost,
    required this.selected,
    required this.submitted,
    required this.now,
    required this.onSelect,
    required this.onSubmit,
    required this.onAdvance,
    required this.onFinish,
    required this.api,
    required this.code,
    required this.hostSub,
  });
  final MatchState state;
  final bool isHost;
  final int? selected;
  final bool submitted;
  final DateTime now;
  final ValueChanged<int> onSelect;
  final VoidCallback onSubmit;
  final VoidCallback onAdvance;
  final VoidCallback onFinish;
  final PlayApi api;
  final String code;
  final String? hostSub;

  @override
  Widget build(BuildContext context) {
    final m = state.match;
    final q = m.questions[m.currentIndex];
    final last = m.currentIndex >= m.questions.length - 1;
    final start = m.questionStartedAt;
    final durMs = m.questionDurationS * 1000;
    final remainingMs = start == null ? durMs : (start.add(Duration(seconds: m.questionDurationS)).difference(now).inMilliseconds).clamp(0, durMs);
    final remainingS = (remainingMs / 1000).ceil();
    final pct = remainingMs / durMs;
    final color = Color(categoryColorsHex[q.category] ?? 0xFF666666);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(children: [
          Text(
            'Q${m.currentIndex + 1}/${m.questions.length} · ${categoryLabels[q.category] ?? q.category} · D${q.difficulty}',
            style: TextStyle(color: Colors.grey[600], fontSize: 12),
          ),
          const Spacer(),
          Text(
            '⏱ ${remainingS}s',
            style: TextStyle(
              fontFamily: 'Menlo',
              fontWeight: FontWeight.w700,
              color: remainingS <= 5 ? Colors.red : remainingS <= 10 ? Colors.orange : Colors.grey[700],
            ),
          ),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 4,
            valueColor: AlwaysStoppedAnimation(remainingS <= 5 ? Colors.red : BrandColors.green),
          ),
        ),
        const SizedBox(height: 16),
        QuestionText(q.question, style: const TextStyle(fontSize: 15, height: 1.5)),
        const SizedBox(height: 12),
        ...List.generate(q.options.length, (i) {
          final isSelected = selected == i;
          final hostHighlight = isHost && q.correctIndex == i;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: submitted || isHost ? null : () => onSelect(i),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: hostHighlight
                        ? BrandColors.green
                        : isSelected
                            ? BrandColors.green
                            : const Color(0xFFE5E5E5),
                    width: hostHighlight || isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  color: hostHighlight || isSelected ? BrandColors.greenSoft : null,
                ),
                child: Text(q.options[i], style: const TextStyle(fontSize: 14, height: 1.4)),
              ),
            ),
          );
        }),
        const SizedBox(height: 12),
        if (!isHost && !submitted)
          ElevatedButton(
            onPressed: selected == null ? null : onSubmit,
            child: const Text('Lock in answer'),
          ),
        if (!isHost && submitted)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: BrandColors.greenSoft,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: BrandColors.green),
            ),
            child: const Text('Answer locked. Waiting for host…'),
          ),
        if (isHost) ...[
          if (m.mode == 'classroom' && hostSub != null)
            _Distribution(api: api, code: code, q: m.currentIndex, hostSub: hostSub!, options: q.options, correctIndex: q.correctIndex, color: color),
          const SizedBox(height: 8),
          Row(children: [
            OutlinedButton(onPressed: onFinish, child: const Text('End match')),
            const Spacer(),
            ElevatedButton(
              onPressed: onAdvance,
              child: Text(last ? 'Show results' : 'Next question →'),
            ),
          ]),
        ],
        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 8),
        const Text('LIVE SCOREBOARD',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
        const SizedBox(height: 8),
        ...state.scoreboard.asMap().entries.map((entry) {
          final i = entry.key;
          final s = entry.value;
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: i == 0 ? BrandColors.greenSoft : null,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(children: [
              SizedBox(
                width: 24,
                child: Text('${i + 1}',
                    style: TextStyle(fontWeight: FontWeight.w700, color: i == 0 ? BrandColors.green : Colors.grey)),
              ),
              Expanded(
                child: Text(s.displayName,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              Text('${s.score}', style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(width: 6),
              Text('${s.correct}✓ · ${(s.totalMs / 1000).toStringAsFixed(1)}s',
                  style: TextStyle(color: Colors.grey[600], fontSize: 11)),
            ]),
          );
        }),
      ],
    );
  }
}

class _Distribution extends StatefulWidget {
  const _Distribution({
    required this.api,
    required this.code,
    required this.q,
    required this.hostSub,
    required this.options,
    required this.correctIndex,
    required this.color,
  });
  final PlayApi api;
  final String code;
  final int q;
  final String hostSub;
  final List<String> options;
  final int? correctIndex;
  final Color color;

  @override
  State<_Distribution> createState() => _DistributionState();
}

class _DistributionState extends State<_Distribution> {
  Timer? _timer;
  List<DistributionBucket> _buckets = const [];

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(milliseconds: 1500), (_) => _refresh());
  }

  Future<void> _refresh() async {
    try {
      final r = await widget.api.distribution(code: widget.code, q: widget.q, hostSub: widget.hostSub);
      if (mounted) setState(() => _buckets = r);
    } catch (_) {/* ignore */}
  }

  @override
  void didUpdateWidget(covariant _Distribution old) {
    super.didUpdateWidget(old);
    if (old.q != widget.q) {
      setState(() => _buckets = const []);
      _refresh();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = _buckets.fold<int>(0, (a, b) => a + b.count);
    final denom = total == 0 ? 1 : total;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('CLASS ANSWERS (LIVE)',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
        const SizedBox(height: 8),
        ...List.generate(widget.options.length, (i) {
          final b = _buckets.where((x) => x.selectedIdx == i).cast<DistributionBucket?>().firstWhere(
                (_) => true,
                orElse: () => null,
              );
          final count = b?.count ?? 0;
          final pct = count / denom;
          final isCorrect = widget.correctIndex == i;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(children: [
              SizedBox(
                width: 18,
                child: Text(String.fromCharCode(65 + i),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: isCorrect ? BrandColors.green : Colors.grey,
                    )),
              ),
              Expanded(
                child: Stack(children: [
                  Container(
                    height: 22,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5E5E5),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  AnimatedFractionallySizedBox(
                    duration: const Duration(milliseconds: 400),
                    widthFactor: pct,
                    child: Container(
                      height: 22,
                      decoration: BoxDecoration(
                        color: isCorrect ? BrandColors.green : Colors.black26,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 8, top: 4),
                    child: Text(widget.options[i],
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                        style: const TextStyle(fontSize: 12)),
                  ),
                ]),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 30,
                child: Text('$count', textAlign: TextAlign.right, style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()])),
              ),
            ]),
          );
        }),
      ]),
    );
  }
}

class _Finished extends StatelessWidget {
  const _Finished({required this.state, required this.onLeave});
  final MatchState state;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              Text('Match complete', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              if (state.scoreboard.isNotEmpty)
                Text('🏆 ${state.scoreboard.first.displayName} — ${state.scoreboard.first.correct}/${state.match.questions.length}'),
              const SizedBox(height: 16),
              ...state.scoreboard.asMap().entries.map((entry) {
                final i = entry.key;
                final s = entry.value;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(children: [
                    SizedBox(
                      width: 24,
                      child: Text('${i + 1}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    Expanded(child: Text(s.displayName)),
                    Text('${s.score}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ]),
                );
              }),
              const SizedBox(height: 20),
              ElevatedButton(onPressed: onLeave, child: const Text('Back')),
            ]),
          ),
        ),
      ],
    );
  }
}
