import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/quiz.dart';
import '../api/user.dart';
import '../auth/auth_service.dart';
import '../models/quiz.dart';
import '../responsive.dart';
import '../theme.dart';
import '../widgets/code_block.dart';
import 'result_screen.dart';

enum QuizMode { standard, daily }

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key, required this.session, this.mode = QuizMode.standard});

  final QuizSession session;
  final QuizMode mode;

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  final _quizApi = QuizApi(ApiClient());
  final _userApi = UserApi(ApiClient());

  int _index = 0;
  final Map<String, int> _answers = {};
  bool _submitting = false;
  String? _error;

  Question get _q => widget.session.questions[_index];
  bool get _isLast => _index == widget.session.questions.length - 1;
  bool get _allAnswered => widget.session.questions.every((q) => _answers.containsKey(q.id));

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await _quizApi.submit(
        sessionId: widget.session.sessionId,
        answers: _answers,
      );

      // Best-effort stat update for signed-in users.
      final auth = AuthService.instance;
      if (auth.sub != null) {
        try {
          await _userApi.upsertProfile(
            auth0Id: auth.sub!,
            email: auth.email,
            name: auth.name,
            picture: auth.picture,
          );
          await _userApi.recordQuizResult(
            auth0Id: auth.sub!,
            correct: result.correctAnswers,
            total: result.totalQuestions,
          );

          // Per-category breakdown.
          final byCat = <String, ({int correct, int total})>{};
          for (final q in widget.session.questions) {
            final r = result.results.firstWhere(
              (x) => x.questionId == q.id,
              orElse: () => QuestionResult(
                questionId: q.id,
                selectedIndex: -1,
                correctAnswer: -1,
                isCorrect: false,
                explanation: '',
              ),
            );
            final prev = byCat[q.category] ?? (correct: 0, total: 0);
            byCat[q.category] = (
              correct: prev.correct + (r.isCorrect ? 1 : 0),
              total: prev.total + 1,
            );
          }
          await _userApi.recordCategoryStats(auth0Id: auth.sub!, byCategory: byCat);
        } catch (e) {
          // ignore — the score still shows
        }
      }

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ResultScreen(
            session: widget.session,
            result: result,
          ),
        ),
      );
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_index + 1) / widget.session.questions.length;
    final answered = _answers.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.mode == QuizMode.daily ? 'Daily challenge' : 'Quiz'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Exit quiz',
          onPressed: () async {
            final ok = await showDialog<bool>(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Leave this quiz?'),
                content: const Text('Your progress will be lost.'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Stay')),
                  TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Leave')),
                ],
              ),
            );
            if (ok == true && context.mounted) Navigator.pop(context);
          },
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
            child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(children: [
                Text('${_index + 1}/${widget.session.questions.length}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(width: 12),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 6,
                      valueColor: const AlwaysStoppedAnimation(BrandColors.green),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text('$answered/${widget.session.questions.length}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
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
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Color(categoryColorsHex[_q.category] ?? 0xFF666666),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        categoryLabels[_q.category] ?? _q.category,
                        style: TextStyle(
                          color: ['javascript', 'react'].contains(_q.category)
                              ? const Color(0xFF1A1A1A)
                              : Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text('Difficulty ${_q.difficulty}',
                        style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                  ]),
                  const SizedBox(height: 12),
                  QuestionText(
                    _q.question,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, height: 1.5),
                  ),
                  if (_q.introduction != null && _q.introduction!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        title: const Text('Hint', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(_q.introduction!, style: const TextStyle(fontSize: 13)),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  ...List.generate(_q.options.length, (i) {
                    final selected = _answers[_q.id] == i;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => setState(() => _answers[_q.id] = i),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: selected ? BrandColors.green : const Color(0xFFE5E5E5),
                              width: selected ? 2 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                            color: selected ? BrandColors.greenSoft : null,
                          ),
                          child: Row(children: [
                            Container(
                              width: 18,
                              height: 18,
                              margin: const EdgeInsets.only(right: 12),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: selected ? BrandColors.green : Colors.grey,
                                  width: 2,
                                ),
                                color: selected ? BrandColors.green : Colors.transparent,
                              ),
                              child: selected
                                  ? const Icon(Icons.check, color: Colors.white, size: 12)
                                  : null,
                            ),
                            Expanded(
                              child: Text(
                                _q.options[i],
                                style: const TextStyle(fontSize: 14, height: 1.4),
                              ),
                            ),
                          ]),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  OutlinedButton(
                    onPressed: _index > 0 ? () => setState(() => _index--) : null,
                    child: const Text('Previous'),
                  ),
                  const Spacer(),
                  if (_isLast)
                    ElevatedButton(
                      onPressed: (!_allAnswered || _submitting) ? null : _submit,
                      child: Text(_submitting ? 'Submitting…' : 'Submit'),
                    )
                  else
                    ElevatedButton(
                      onPressed: () => setState(() => _index++),
                      child: const Text('Next'),
                    ),
                ],
              ),
            ),
          ],
        ),
          ),
        ),
      ),
    );
  }
}
