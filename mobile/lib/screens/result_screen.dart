import 'package:flutter/material.dart';
import '../models/quiz.dart';
import '../theme.dart';
import '../widgets/code_block.dart';

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key, required this.session, required this.result});

  final QuizSession session;
  final QuizResult result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz complete'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
                child: Column(children: [
                  const Text('Quiz complete!',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 16),
                  Text(
                    '${result.percentage}%',
                    style: const TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.w700,
                      color: BrandColors.green,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${result.correctAnswers} out of ${result.totalQuestions} correct',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                        child: const Text('New quiz'),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                'Review your answers (${session.questions.length})',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 8),
            ...session.questions.asMap().entries.map((entry) {
              final i = entry.key;
              final q = entry.value;
              final r = result.results.firstWhere(
                (x) => x.questionId == q.id,
                orElse: () => QuestionResult(
                  questionId: q.id,
                  selectedIndex: 0,
                  correctAnswer: 0,
                  isCorrect: false,
                  explanation: '',
                ),
              );
              final color = Color(categoryColorsHex[q.category] ?? 0xFF666666);
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: r.isCorrect ? const Color(0x14169A4A) : const Color(0x14DC2626),
                  border: Border(
                    left: BorderSide(
                      color: r.isCorrect ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                      width: 3,
                    ),
                  ),
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(8),
                    bottomRight: Radius.circular(8),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text('Question ${i + 1}',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: r.isCorrect ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          r.isCorrect ? 'Correct' : 'Incorrect',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          categoryLabels[q.category] ?? q.category,
                          style: TextStyle(
                            color: ['javascript', 'react'].contains(q.category)
                                ? const Color(0xFF1A1A1A)
                                : Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ]),
                    const SizedBox(height: 8),
                    QuestionText(q.question, style: const TextStyle(fontSize: 14, height: 1.5)),
                    const SizedBox(height: 8),
                    Text.rich(TextSpan(children: [
                      const TextSpan(text: 'Your answer: '),
                      TextSpan(
                        text: q.options[r.selectedIndex],
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ])),
                    if (!r.isCorrect)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text.rich(TextSpan(children: [
                          const TextSpan(
                            text: 'Correct: ',
                            style: TextStyle(color: Color(0xFF16A34A)),
                          ),
                          TextSpan(
                            text: q.options[r.correctAnswer],
                            style: const TextStyle(
                              color: Color(0xFF16A34A),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ])),
                      ),
                    if (r.explanation.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(top: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.06),
                          border: Border(left: BorderSide(color: color, width: 3)),
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(6),
                            bottomRight: Radius.circular(6),
                          ),
                        ),
                        child: Text(r.explanation, style: const TextStyle(fontSize: 13)),
                      ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
