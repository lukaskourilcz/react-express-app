import 'package:flutter/material.dart';
import '../lib/bookmarks.dart';
import '../models/quiz.dart';
import '../responsive.dart';
import '../theme.dart';
import '../widgets/code_block.dart';

class BookmarksScreen extends StatefulWidget {
  const BookmarksScreen({super.key});
  @override
  State<BookmarksScreen> createState() => _BookmarksScreenState();
}

class _BookmarksScreenState extends State<BookmarksScreen> {
  @override
  void initState() {
    super.initState();
    BookmarkStore.instance.addListener(_onChange);
  }

  @override
  void dispose() {
    BookmarkStore.instance.removeListener(_onChange);
    super.dispose();
  }

  void _onChange() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final all = BookmarkStore.instance.all;
    return Scaffold(
      appBar: AppBar(title: Text('Bookmarks (${all.length})')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
            child: all.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.bookmark_outline, size: 48, color: Colors.grey),
                    const SizedBox(height: 12),
                    Text('No bookmarks yet',
                        style: TextStyle(color: Colors.grey[600], fontSize: 16)),
                    const SizedBox(height: 4),
                    Text('Tap the bookmark icon on any quiz answer to save it.',
                        style: TextStyle(color: Colors.grey[500]), textAlign: TextAlign.center),
                  ]),
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: all.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final b = all[i];
                  final color = Color(categoryColorsHex[b.category] ?? 0xFF666666);
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE5E5E5)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            categoryLabels[b.category] ?? b.category,
                            style: TextStyle(
                              color: ['javascript', 'react'].contains(b.category)
                                  ? const Color(0xFF1A1A1A)
                                  : Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => BookmarkStore.instance.remove(b.id),
                          tooltip: 'Remove',
                        ),
                      ]),
                      const SizedBox(height: 8),
                      QuestionText(b.question, style: const TextStyle(fontSize: 14, height: 1.4)),
                      const SizedBox(height: 8),
                      Text.rich(TextSpan(children: [
                        const TextSpan(
                          text: 'Answer: ',
                          style: TextStyle(color: BrandColors.green),
                        ),
                        TextSpan(
                          text: b.options.length > b.correctIndex
                              ? b.options[b.correctIndex]
                              : '—',
                          style: const TextStyle(
                            color: BrandColors.green,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ])),
                      if (b.explanation.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(b.explanation,
                              style: TextStyle(color: Colors.grey[700], fontSize: 13)),
                        ),
                    ]),
                  );
                },
              ),
          ),
        ),
      ),
    );
  }
}
