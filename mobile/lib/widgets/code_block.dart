import 'package:flutter/material.dart';
import 'package:flutter_highlight/flutter_highlight.dart';
import 'package:flutter_highlight/themes/atom-one-dark.dart';

/// Renders a question that may contain ```fenced``` code blocks. Splits on
/// fences and renders prose with [Text], code blocks with [HighlightView].
class QuestionText extends StatelessWidget {
  const QuestionText(this.text, {super.key, this.style});

  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final segments = _splitFences(text);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: segments.map((seg) {
        if (seg.isCode) {
          return Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A1A),
              borderRadius: BorderRadius.circular(6),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: HighlightView(
                seg.body,
                language: seg.lang,
                theme: atomOneDarkTheme,
                textStyle: const TextStyle(
                  fontFamily: 'Menlo',
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ),
          );
        }
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Text(seg.body, style: style),
        );
      }).toList(),
    );
  }
}

class _Seg {
  final bool isCode;
  final String lang;
  final String body;
  _Seg({required this.isCode, required this.lang, required this.body});
}

List<_Seg> _splitFences(String text) {
  final regex = RegExp(r'```(\w*)\n?([\s\S]*?)```');
  final out = <_Seg>[];
  int cursor = 0;
  for (final match in regex.allMatches(text)) {
    if (match.start > cursor) {
      final prose = text.substring(cursor, match.start).trim();
      if (prose.isNotEmpty) out.add(_Seg(isCode: false, lang: '', body: prose));
    }
    final raw = match.group(1) ?? 'javascript';
    final lang = raw == 'js'
        ? 'javascript'
        : raw == 'ts'
            ? 'typescript'
            : raw.isEmpty
                ? 'javascript'
                : raw;
    final body = (match.group(2) ?? '').trim();
    out.add(_Seg(isCode: true, lang: lang, body: body));
    cursor = match.end;
  }
  if (cursor < text.length) {
    final tail = text.substring(cursor).trim();
    if (tail.isNotEmpty) out.add(_Seg(isCode: false, lang: '', body: tail));
  }
  return out;
}
