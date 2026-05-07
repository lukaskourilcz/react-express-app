import 'dart:math';
import 'package:flutter/material.dart';
import '../lib/cards.dart';
import '../models/quiz.dart' show categoryColorsHex, categoryLabels;
import '../responsive.dart';
import '../theme.dart';
import '../widgets/code_block.dart';

class CardsScreen extends StatefulWidget {
  const CardsScreen({super.key});

  @override
  State<CardsScreen> createState() => _CardsScreenState();
}

class _CardsScreenState extends State<CardsScreen> {
  List<String> _sessionIds = const [];
  int _index = 0;
  bool _revealed = false;
  int? _picked;

  @override
  void initState() {
    super.initState();
    CardStore.instance.addListener(_onChange);
    _restart(notify: false);
  }

  @override
  void dispose() {
    CardStore.instance.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() {
    if (!mounted) return;
    final live = CardStore.instance.all.map((c) => c.id).toSet();
    final filtered = _sessionIds.where(live.contains).toList();
    if (filtered.length != _sessionIds.length) {
      setState(() => _sessionIds = filtered);
    } else {
      setState(() {});
    }
  }

  void _restart({bool notify = true}) {
    final ids = CardStore.instance.all.map((c) => c.id).toList()..shuffle(Random());
    final fn = () {
      _sessionIds = ids;
      _index = 0;
      _revealed = false;
      _picked = null;
    };
    if (notify) {
      setState(fn);
    } else {
      fn();
    }
  }

  FlashCard? get _current {
    if (_index >= _sessionIds.length) return null;
    final id = _sessionIds[_index];
    final live = CardStore.instance.all;
    for (final c in live) {
      if (c.id == id) return c;
    }
    return null;
  }

  void _advance() {
    setState(() {
      _revealed = false;
      _picked = null;
      _index++;
    });
  }

  Future<void> _gotIt() async {
    final c = _current;
    if (c == null) return;
    final result = await CardStore.instance.markCorrect(c.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result.graduated ? 'Graduated! 🎓' : 'Marked correct'),
        duration: const Duration(seconds: 1),
      ),
    );
    _advance();
  }

  Future<void> _needMore() async {
    final c = _current;
    if (c == null) return;
    await CardStore.instance.markWrong(c.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Saved for next time'), duration: Duration(seconds: 1)),
    );
    _advance();
  }

  Future<void> _removeCurrent() async {
    final c = _current;
    if (c == null) return;
    await CardStore.instance.remove(c.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Removed from deck'), duration: Duration(seconds: 1)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final all = CardStore.instance.all;

    if (all.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Memory cards')),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('🎉', style: TextStyle(fontSize: 56)),
                    const SizedBox(height: 8),
                    const Text(
                      'Nothing to review',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Questions you answer incorrectly are added here automatically. Keep taking quizzes — each wrong answer becomes a card you can drill until you have it down.',
                      style: TextStyle(color: Colors.grey[700]),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Take a quiz'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    final card = _current;
    final finished = _index >= _sessionIds.length;

    if (finished) {
      return Scaffold(
        appBar: AppBar(title: const Text('Memory cards')),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('👏', style: TextStyle(fontSize: 56)),
                    const SizedBox(height: 8),
                    Text(
                      'You reviewed ${_sessionIds.length} card${_sessionIds.length == 1 ? '' : 's'}.',
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${all.length} still in your deck.',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Back'),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: all.isEmpty ? null : _restart,
                          child: const Text('Review again'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (card == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Memory cards')),
        body: const Center(child: CircularProgressIndicator(color: BrandColors.green)),
      );
    }

    final color = Color(categoryColorsHex[card.category] ?? 0xFF666666);
    final progress = _sessionIds.isEmpty ? 0.0 : _index / _sessionIds.length;

    return Scaffold(
      appBar: AppBar(title: const Text('Memory cards')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(children: [
                    Text(
                      '${_index + 1} / ${_sessionIds.length}',
                      style: const TextStyle(
                          fontFeatures: [FontFeature.tabularFigures()], fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    Text(
                      '${all.length} in deck',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 4,
                      valueColor: const AlwaysStoppedAnimation(BrandColors.green),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: color,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  categoryLabels[card.category] ?? card.category,
                                  style: TextStyle(
                                    color: ['javascript', 'react'].contains(card.category)
                                        ? const Color(0xFF1A1A1A)
                                        : Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '✓ ${card.rightStreak}/2 · ✗ ${card.wrongCount}',
                                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 20),
                                tooltip: 'Remove from deck',
                                onPressed: _removeCurrent,
                              ),
                            ]),
                            const SizedBox(height: 12),
                            QuestionText(card.question,
                                style: const TextStyle(fontSize: 15, height: 1.5)),
                            const SizedBox(height: 12),
                            if (!_revealed)
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: () => setState(() => _revealed = true),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 8),
                                    child: Text('Reveal answer'),
                                  ),
                                ),
                              )
                            else
                              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                                ...List.generate(card.options.length, (i) {
                                  final isCorrect = i == card.correctIndex;
                                  final isPicked = _picked == i;
                                  final showWrong = isPicked && !isCorrect;
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: InkWell(
                                      onTap: () => setState(() => _picked = i),
                                      borderRadius: BorderRadius.circular(8),
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                            color: isCorrect
                                                ? const Color(0xFF16A34A)
                                                : showWrong
                                                    ? const Color(0xFFDC2626)
                                                    : isPicked
                                                        ? BrandColors.green
                                                        : const Color(0xFFE5E5E5),
                                            width: (isCorrect || showWrong || isPicked) ? 2 : 1,
                                          ),
                                          borderRadius: BorderRadius.circular(8),
                                          color: isCorrect
                                              ? const Color(0x1416A34A)
                                              : showWrong
                                                  ? const Color(0x14DC2626)
                                                  : null,
                                        ),
                                        child: Row(children: [
                                          Expanded(
                                            child: Text(card.options[i],
                                                style: TextStyle(
                                                    fontWeight: isCorrect
                                                        ? FontWeight.w600
                                                        : FontWeight.w500,
                                                    fontSize: 14)),
                                          ),
                                          if (isCorrect)
                                            const Text('✓',
                                                style: TextStyle(
                                                    color: Color(0xFF16A34A),
                                                    fontWeight: FontWeight.w700)),
                                          if (showWrong)
                                            const Text('✗',
                                                style: TextStyle(
                                                    color: Color(0xFFDC2626),
                                                    fontWeight: FontWeight.w700)),
                                        ]),
                                      ),
                                    ),
                                  );
                                }),
                                if (card.explanation.isNotEmpty)
                                  Container(
                                    margin: const EdgeInsets.only(top: 8),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: color.withOpacity(0.06),
                                      border: Border(left: BorderSide(color: color, width: 3)),
                                      borderRadius: const BorderRadius.only(
                                        topRight: Radius.circular(6),
                                        bottomRight: Radius.circular(6),
                                      ),
                                    ),
                                    child: Text(card.explanation,
                                        style: const TextStyle(fontSize: 13)),
                                  ),
                              ]),
                          ]),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _revealed ? _needMore : null,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFB91C1C),
                          side: const BorderSide(color: Color(0xFFB91C1C)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Need more practice'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _revealed ? _gotIt : null,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Got it'),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 4),
                  Text('Two correct in a row graduates a card.',
                      style: TextStyle(color: Colors.grey[600], fontSize: 11)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
