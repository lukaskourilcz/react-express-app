import 'package:flutter/material.dart';
import '../api/client.dart';
import '../api/quiz.dart';
import '../auth/auth_service.dart';
import '../lib/achievements.dart';
import '../lib/bookmarks.dart';
import '../models/quiz.dart';
import '../theme.dart';
import '../widgets/code_block.dart';
import '../widgets/report_dialog.dart';

class ResultScreen extends StatefulWidget {
  const ResultScreen({super.key, required this.session, required this.result});

  final QuizSession session;
  final QuizResult result;

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final _quizApi = QuizApi(ApiClient());

  @override
  void initState() {
    super.initState();
    BookmarkStore.instance.addListener(_onBookmarks);
    if (widget.result.percentage == 100) {
      recordPerfectQuiz();
    }
  }

  @override
  void dispose() {
    BookmarkStore.instance.removeListener(_onBookmarks);
    super.dispose();
  }

  void _onBookmarks() {
    if (mounted) setState(() {});
  }

  Future<void> _toggleBookmark(Question q, QuestionResult r) async {
    final added = await BookmarkStore.instance.toggle(
      id: q.id,
      question: q.question,
      category: q.category,
      options: q.options,
      correctIndex: r.correctAnswer,
      explanation: r.explanation,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(added ? 'Bookmarked' : 'Removed bookmark'),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _report(Question q) async {
    final res = await showReportDialog(context);
    if (res == null) return;
    try {
      await _quizApi.reportQuestion(
        questionId: q.id,
        reason: res.reason,
        detail: res.detail,
        reporterSub: AuthService.instance.sub,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thanks — report sent')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not send report')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = widget.result;
    final session = widget.session;
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
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                    child: const Text('New quiz'),
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
              final isBookmarked = BookmarkStore.instance.isBookmarked(q.id);
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
                          style:
                              const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(width: 8),
                      Container(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: r.isCorrect
                              ? const Color(0xFF16A34A)
                              : const Color(0xFFDC2626),
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
                      IconButton(
                        icon: Icon(
                          isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                          color: isBookmarked ? BrandColors.green : Colors.grey,
                          size: 20,
                        ),
                        tooltip:
                            isBookmarked ? 'Remove bookmark' : 'Bookmark this question',
                        onPressed: () => _toggleBookmark(q, r),
                        visualDensity: VisualDensity.compact,
                      ),
                      IconButton(
                        icon: const Icon(Icons.flag_outlined,
                            size: 20, color: Colors.grey),
                        tooltip: 'Report',
                        onPressed: () => _report(q),
                        visualDensity: VisualDensity.compact,
                      ),
                      Container(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
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
                    QuestionText(q.question,
                        style: const TextStyle(fontSize: 14, height: 1.5)),
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
                        child:
                            Text(r.explanation, style: const TextStyle(fontSize: 13)),
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
