import 'dart:math';
import 'package:flutter/material.dart';
import '../lib/cards.dart';
import '../models/quiz.dart' show categoryColorsHex, categoryLabels;
import '../responsive.dart';
import '../theme.dart';
import '../widgets/code_block.dart';

const _drillSize = 10;

class DrillScreen extends StatefulWidget {
  const DrillScreen({super.key});

  @override
  State<DrillScreen> createState() => _DrillScreenState();
}

class _DrillScreenState extends State<DrillScreen> {
  late List<String> _sessionIds;
  int _index = 0;
  int? _picked;
  bool _submitted = false;
  int _correct = 0;

  @override
  void initState() {
    super.initState();
    _sessionIds = _pickSession();
    CardStore.instance.addListener(_onChange);
  }

  @override
  void dispose() {
    CardStore.instance.removeListener(_onChange);
    super.dispose();
  }

  List<String> _pickSession() {
    final due = CardStore.instance.dueCards();
    due.shuffle(Random());
    return due.take(_drillSize).map((c) => c.id).toList();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  FlashCard? _cardAt(int i) {
    if (i < 0 || i >= _sessionIds.length) return null;
    final id = _sessionIds[i];
    for (final c in CardStore.instance.all) {
      if (c.id == id) return c;
    }
    return null;
  }

  Future<void> _submit() async {
    final card = _cardAt(_index);
    if (card == null || _picked == null) return;
    final isRight = _picked == card.correctIndex;
    if (isRight) {
      await CardStore.instance.markCorrect(card.id);
      setState(() => _correct++);
    } else {
      await CardStore.instance.markWrong(card.id);
    }
    setState(() => _submitted = true);
  }

  void _next() {
    setState(() {
      _picked = null;
      _submitted = false;
      _index++;
    });
  }

  void _restart() {
    setState(() {
      _sessionIds = _pickSession();
      _index = 0;
      _picked = null;
      _submitted = false;
      _correct = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_sessionIds.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Drill mode')),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('✅', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 8),
                  const Text('Nothing due right now',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(
                    'All your cards are scheduled for later. Take a quiz to add new ones, or use Cards to self-review without grading.',
                    style: TextStyle(color: Colors.grey[700]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Back'),
                  ),
                ]),
              ),
            ),
          ),
        ),
      );
    }

    final finished = _index >= _sessionIds.length;

    if (finished) {
      final pct = ((_correct / _sessionIds.length) * 100).round();
      return Scaffold(
        appBar: AppBar(title: const Text('Drill complete')),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('$pct%',
                      style: const TextStyle(
                        fontSize: 56,
                        fontWeight: FontWeight.w700,
                        color: BrandColors.green,
                      )),
                  const SizedBox(height: 8),
                  Text('$_correct of ${_sessionIds.length} correct',
                      style: const TextStyle(fontSize: 16)),
                  const SizedBox(height: 12),
                  Text(
                    'Cards rescheduled based on your answers. Wrong cards reappear immediately; right ones come back in 1, 3, 7, 14, then 30 days.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    textAlign: TextAlign.center,
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
                        onPressed: CardStore.instance.dueCount == 0 ? null : _restart,
                        child: Text(
                          CardStore.instance.dueCount == 0
                              ? 'Nothing due'
                              : 'Drill again (${CardStore.instance.dueCount})',
                        ),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
          ),
        ),
      );
    }

    final card = _cardAt(_index);
    if (card == null) {
      // Card was removed (e.g. graduated) before we reached it. Skip ahead.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _next();
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final color = Color(categoryColorsHex[card.category] ?? 0xFF666666);
    final progress = _index / _sessionIds.length;

    return Scaffold(
      appBar: AppBar(title: const Text('Drill mode')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                Row(children: [
                  Text('${_index + 1} / ${_sessionIds.length}',
                      style: const TextStyle(
                          fontFeatures: [FontFeature.tabularFigures()],
                          fontWeight: FontWeight.w600)),
                  const Spacer(),
                  Text('${CardStore.instance.dueCount} due',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12)),
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
                            Text('streak ${card.rightStreak}/6',
                                style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                          ]),
                          const SizedBox(height: 12),
                          QuestionText(card.question,
                              style: const TextStyle(fontSize: 15, height: 1.5)),
                          const SizedBox(height: 12),
                          ...List.generate(card.options.length, (i) {
                            final isCorrect = i == card.correctIndex;
                            final isPicked = _picked == i;
                            final reveal = _submitted;
                            final showCorrect = reveal && isCorrect;
                            final showWrong = reveal && isPicked && !isCorrect;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: InkWell(
                                onTap: _submitted ? null : () => setState(() => _picked = i),
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: showCorrect
                                          ? const Color(0xFF16A34A)
                                          : showWrong
                                              ? const Color(0xFFDC2626)
                                              : isPicked
                                                  ? BrandColors.green
                                                  : const Color(0xFFE5E5E5),
                                      width: (showCorrect || showWrong || isPicked) ? 2 : 1,
                                    ),
                                    borderRadius: BorderRadius.circular(8),
                                    color: showCorrect
                                        ? const Color(0x1416A34A)
                                        : showWrong
                                            ? const Color(0x14DC2626)
                                            : null,
                                  ),
                                  child: Row(children: [
                                    Expanded(
                                      child: Text(card.options[i],
                                          style: TextStyle(
                                              fontWeight: showCorrect || isPicked
                                                  ? FontWeight.w600
                                                  : FontWeight.w500,
                                              fontSize: 14)),
                                    ),
                                    if (showCorrect)
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
                          if (_submitted && card.explanation.isNotEmpty)
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
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: !_submitted
                      ? ElevatedButton(
                          onPressed: _picked == null ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          child: const Text('Lock in answer'),
                        )
                      : ElevatedButton(
                          onPressed: _next,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          child: Text(
                            _index == _sessionIds.length - 1 ? 'See results' : 'Next →',
                          ),
                        ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
